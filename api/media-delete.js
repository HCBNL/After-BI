/**
 * POST /api/media-delete   { urls: string[] }   Authorization: Bearer <Firebase ID token>
 *
 * Deletes pictures from Cloudinary for good, once the app has saved
 * something that no longer uses them (a replaced logo, a removed product
 * photo, a deleted article's cover).
 *
 * WHY THIS RUNS ON THE SERVER
 *
 * Deleting needs the Cloudinary API secret, and a secret in the website's
 * code is a secret everybody has. So the browser asks, and this function,
 * which holds the secret in Vercel's environment, decides and deletes.
 *
 * WHO MAY DELETE WHAT
 *
 *   1. The caller must be signed in: the ID token is checked with Firebase.
 *   2. Their profile is read with their own token, so the database's own
 *      rules vouch for their role and organisation.
 *   3. Only files in this Cloudinary account are touched.
 *   4. The platform owner may delete any of them. Anyone else only a file
 *      tagged with their own organisation or their own account (every upload
 *      is tagged, see src/lib/cloudinary.ts). An untagged older file is left
 *      for the owner.
 *
 * Needs, in Vercel, Settings, Environment Variables:
 *   CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET   (Cloudinary, Settings, API Keys)
 * and reads the ones the app already has:
 *   VITE_CLOUDINARY_CLOUD_NAME, VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID
 */

import { createHash } from 'node:crypto';

const CLOUD = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID;
const MAX = 20;

/** "https://res.cloudinary.com/<cloud>/image/upload/w_400,f_auto/v123/afterbi/logo/abc.png" to "afterbi/logo/abc" (or "abc" where folders are not part of the id). */
function publicIdOf(url) {
  const prefix = `https://res.cloudinary.com/${CLOUD}/image/upload/`;
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null;
  const parts = url.slice(prefix.length).split('?')[0].split('/');
  /* Drop transformation segments and the version, keep the path. */
  while (parts.length && (parts[0].includes(',') || /^[a-z]{1,3}_/.test(parts[0]) || /^v\d+$/.test(parts[0]))) {
    const isVersion = /^v\d+$/.test(parts[0]);
    parts.shift();
    if (isVersion) break;
  }
  const path = decodeURIComponent(parts.join('/')).replace(/\.[a-z0-9]+$/i, '');
  return path && !path.includes('..') ? path : null;
}

async function whoIs(token) {
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FB_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
  if (!lookup.ok) return null;
  const uid = (await lookup.json())?.users?.[0]?.localId;
  if (!uid) return null;
  const doc = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!doc.ok) return null;
  const fields = (await doc.json())?.fields ?? {};
  return {
    uid,
    role: fields.role?.stringValue ?? '',
    orgId: fields.orgId?.stringValue ?? '',
    active: fields.active?.booleanValue !== false,
  };
}

const basic = () => `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`;

async function tagsOf(publicId) {
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/upload/${publicId.split('/').map(encodeURIComponent).join('/')}`,
    { headers: { Authorization: basic() } },
  );
  if (res.status === 404) return null; /* already gone */
  if (!res.ok) throw new Error(`lookup ${res.status}`);
  return (await res.json())?.tags ?? [];
}

async function destroy(publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha1').update(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${SECRET}`).digest('hex');
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: KEY, invalidate: 'true', signature });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/destroy`, { method: 'POST', body });
  return res.ok ? ((await res.json())?.result ?? 'error') : 'error';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  if (!CLOUD || !KEY || !SECRET || !FB_KEY || !PROJECT) return res.status(503).json({ error: 'Deleting is not set up' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in first' });

  let who;
  try {
    who = await whoIs(token);
  } catch {
    who = null;
  }
  if (!who || !who.active) return res.status(401).json({ error: 'Sign in first' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const urls = Array.isArray(body?.urls) ? body.urls.slice(0, MAX) : [];
  const results = {};

  for (const url of urls) {
    const id = publicIdOf(url);
    if (!id) {
      results[url] = 'skipped';
      continue;
    }
    try {
      if (who.role !== 'owner') {
        const tags = await tagsOf(id);
        if (tags === null) {
          results[url] = 'not found';
          continue;
        }
        const mine = tags.includes(`user_${who.uid}`) || (who.orgId && tags.includes(`org_${who.orgId}`));
        if (!mine) {
          results[url] = 'not yours';
          continue;
        }
      }
      results[url] = await destroy(id);
    } catch {
      results[url] = 'error';
    }
  }

  return res.status(200).json({ results });
}
