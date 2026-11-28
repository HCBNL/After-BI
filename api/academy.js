/**
 * /api/academy: the GetSchool Academy server, running on Vercel with the site.
 *
 * The browser only signs in (Firebase Auth). Everything else goes through
 * here with the Firebase Admin key, so no Firestore rules or Cloud Functions
 * need deploying:
 *
 *   profile      read (and create on first visit) the learner's profile
 *   start        check the level is open to this learner, hand out the seed
 *   submit       replay every move from that seed and score the game here
 *   certs        the learner's certificates
 *   leaderboard  best scores for a level (public)
 *   cert         one certificate by code (public, for /verify)
 *   farm         the learner's farm (stage, season, wallet, seed, restaurants)
 *   farmStart    start a farm season: checks the stage is open, hands out the seed
 *   farmSubmit   replay a farm season, check it took its real time, score it
 *   purge        nightly: delete game records older than 7 days (Vercel cron)
 *
 * NEEDS, IN VERCEL: FIREBASE_SERVICE_ACCOUNT (same as the old GetSchool),
 * from the same Firebase project as the VITE_FIREBASE_* variables.
 * Optional: CRON_SECRET (Vercel sends it with the nightly purge).
 */
import { cert as credential, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { replayWorld, finalScore } from '../src/world/sim.js';
import { WORLD_LEVELS as LEVELS, WORLD_CHALLENGES as CHALLENGES } from '../src/world/levels.js';
import { replaySeason, finalScore as farmScore, nextProfile } from '../src/farm/sim.js';
import { START_WALLET, RESCUE_WALLET, DAY_PACE, stageFor } from '../src/farm/data.js';

const USERS = 'academy_users';
const SCORES = 'academy_scores';
const CERTS = 'academy_certificates';
const RUNS = 'academy_runs';
const MAX_ACTIONS = 8000;
const ACTION_TYPES = new Set(['start', 'move', 'keke', 'offer', 'buy', 'pusher', 'price', 'boy', 'sample', 'borrow', 'repay']);

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

let projectId = null;
function admin() {
  if (getApps()[0]) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new ApiError(500, 'setup', 'FIREBASE_SERVICE_ACCOUNT is not set in Vercel.');
  let parsed;
  try {
    const json = raw.trim().startsWith('{') ? raw.trim() : Buffer.from(raw.trim(), 'base64').toString('utf8');
    parsed = JSON.parse(json);
  } catch {
    throw new ApiError(500, 'setup', 'FIREBASE_SERVICE_ACCOUNT in Vercel is not valid JSON.');
  }
  projectId = parsed.project_id;
  return initializeApp({
    credential: credential({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: String(parsed.private_key || '').replace(/\\n/g, '\n'),
    }),
  });
}

async function userFrom(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) throw new ApiError(401, 'unauthenticated', 'Sign in first.');
  try {
    return await getAuth(admin()).verifyIdToken(token);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const m = String(e?.message || '');
    if (m.includes('aud') || m.includes('audience') || m.includes('project')) {
      throw new ApiError(500, 'setup', `The Firebase project in FIREBASE_SERVICE_ACCOUNT (${projectId}) is not the one in VITE_FIREBASE_PROJECT_ID. Both must be the same project.`);
    }
    throw new ApiError(401, 'unauthenticated', 'Your sign in has expired. Sign in again.');
  }
}

function parseKey(key) {
  key = String(key || '');
  if (/^[1-4]$/.test(key)) {
    const lv = LEVELS[Number(key) - 1];
    return { key, levelId: lv.id, challenge: null, premium: lv.premium, certifiable: true };
  }
  const ch = CHALLENGES.find((c) => c.id === key);
  if (!ch) return null;
  return { key, levelId: ch.base, challenge: ch.id, premium: true, certifiable: false };
}

function cleanLog(log) {
  const bad = () => new ApiError(400, 'invalid', 'Invalid game record.');
  if (!Array.isArray(log) || log.length > MAX_ACTIONS) throw bad();
  return log.map((x) => {
    if (!x || !ACTION_TYPES.has(x.t) || !Array.isArray(x.a) || x.a.length > 6) throw bad();
    x.a.forEach((v) => {
      const ok = typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length < 40);
      if (!ok) throw bad();
    });
    if (!Number.isInteger(x.d) || !Number.isInteger(x.k) || x.d < 1 || x.d > 30 || x.k < 0 || x.k > 720) throw bad();
    return { d: x.d, k: x.k, t: x.t, a: x.a };
  });
}

const pad = (n) => String(n).padStart(3, '0');
function certCode(levelId) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `GS-ENT-${levelId}-${s}`;
}
const publicProfile = (uid, d) => ({ uid, name: d.name, email: d.email, premium: !!d.premium, progress: d.progress || {} });

// ---------- actions ----------
async function profile(db, me, body) {
  const ref = db.doc(`${USERS}/${me.uid}`);
  const snap = await ref.get();
  if (snap.exists) {
    const d = snap.data();
    const name = String(body.name || '').trim().slice(0, 80);
    if (name && name !== d.name && !d.nameSet) { await ref.update({ name, nameSet: true }); d.name = name; }
    return publicProfile(me.uid, d);
  }
  const d = {
    name: String(body.name || me.name || (me.email || 'Learner').split('@')[0]).trim().slice(0, 80),
    email: me.email || '', premium: false, progress: {}, nameSet: !!body.name, createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(d);
  return publicProfile(me.uid, d);
}

async function start(db, me, body) {
  const k = parseKey(body.key);
  if (!k) throw new ApiError(400, 'invalid', 'Unknown level.');
  const snap = await db.doc(`${USERS}/${me.uid}`).get();
  const u = snap.exists ? snap.data() : await profile(db, me, {});
  const prog = u.progress || {};
  if (!k.challenge && k.levelId > 1 && !prog[String(k.levelId - 1)]?.passed) throw new ApiError(403, 'locked', 'Pass the level before first.');
  if (k.premium && !u.premium) throw new ApiError(403, 'premium', 'This needs Premium.');
  const seed = Math.floor(Math.random() * 1e9);
  const ref = await db.collection(RUNS).add({ uid: me.uid, key: k.key, seed, status: 'open', createdAt: FieldValue.serverTimestamp() });
  return { runId: ref.id, seed };
}

async function submit(db, me, body) {
  const runId = String(body.runId || '');
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(runId)) throw new ApiError(400, 'invalid', 'Missing game.');
  const log = cleanLog(body.log);
  const runRef = db.doc(`${RUNS}/${runId}`);
  const userRef = db.doc(`${USERS}/${me.uid}`);

  return db.runTransaction(async (tx) => {
    const runSnap = await tx.get(runRef);
    if (!runSnap.exists) throw new ApiError(404, 'notfound', 'Game not found.');
    const run = runSnap.data();
    if (run.uid !== me.uid) throw new ApiError(403, 'denied', 'Not your game.');
    if (run.status !== 'open') throw new ApiError(409, 'already', 'This game was already scored.');

    const k = parseKey(run.key);
    const state = replayWorld(k.levelId, k.challenge, run.seed, log);
    if (state.status === 'playing') throw new ApiError(400, 'unfinished', 'The game is not finished.');
    const score = finalScore(state);

    const userSnap = await tx.get(userRef);
    const u = userSnap.data() || {};
    const scoreRef = db.doc(`${SCORES}/${me.uid}_${k.key}`);
    const scoreSnap = await tx.get(scoreRef);

    const prev = (u.progress || {})[k.key] || {};
    const entry = {
      best: Math.max(prev.best || 0, score.total), stars: Math.max(prev.stars || 0, score.stars),
      passed: !!(prev.passed || score.passed), plays: (prev.plays || 0) + 1, last: score.total,
    };

    let code = null;
    if (score.passed && k.certifiable && !prev.passed) {
      code = certCode(k.levelId);
      tx.set(db.doc(`${CERTS}/${code}`), {
        code, uid: me.uid, name: u.name || 'Learner', journey: 'entrepreneur', level: k.levelId,
        score: score.total, stars: score.stars, parts: score.parts, issuedAt: Date.now(),
      });
    }
    tx.update(userRef, { [`progress.${k.key}`]: entry });
    if (!scoreSnap.exists || scoreSnap.data().score < score.total) {
      tx.set(scoreRef, {
        uid: me.uid, name: u.name || 'Learner', key: k.key, score: score.total, profit: score.profit,
        rank: `${k.key}#${pad(score.total)}`, at: Date.now(),
      });
    }
    tx.update(runRef, { status: 'closed', score: score.total, closedAt: FieldValue.serverTimestamp() });
    return { score, progress: { ...(u.progress || {}), [k.key]: entry }, certCode: code };
  });
}

async function leaderboard(db, q) {
  const key = String(q.key || '');
  if (!parseKey(key) && !/^farm[1-6]$/.test(key)) throw new ApiError(400, 'invalid', 'Unknown level.');
  // one field holds level and score, so no extra index is needed
  const snap = await db.collection(SCORES)
    .where('rank', '>=', `${key}#`).where('rank', '<=', `${key}#~`)
    .orderBy('rank', 'desc').limit(20).get();
  return snap.docs.map((d) => { const x = d.data(); return { uid: x.uid, name: x.name, score: x.score, profit: x.profit }; });
}

async function certs(db, me) {
  const snap = await db.collection(CERTS).where('uid', '==', me.uid).get();
  return snap.docs.map((d) => d.data()).sort((a, b) => b.issuedAt - a.issuedAt);
}

async function oneCert(db, q) {
  const code = String(q.code || '');
  if (!/^[A-Z0-9-]{6,40}$/.test(code)) return null;
  const snap = await db.doc(`${CERTS}/${code}`).get();
  return snap.exists ? snap.data() : null;
}

// ---------- farmer journey ----------
const FARM_ACTIONS = new Set(['plots', 'auto', 'plant', 'water', 'manure', 'book', 'harvest', 'reserve', 'sellMarket', 'sellRestaurant', 'finish']);
const FARM0 = { stage: 1, seasonNo: 1, wallet: START_WALLET, seedKg: 0, restaurants: 0, history: [] };

async function farm(db, me) {
  const snap = await db.doc(`${USERS}/${me.uid}`).get();
  return (snap.exists && snap.data().farm) || FARM0;
}

async function farmStart(db, me, body) {
  const pace = String(body.pace || 'normal');
  if (!DAY_PACE[pace]) throw new ApiError(400, 'invalid', 'Unknown pace.');
  const userRef = db.doc(`${USERS}/${me.uid}`);
  const snap = await userRef.get();
  const u = snap.exists ? snap.data() : await profile(db, me, {});
  let f = u.farm || FARM0;
  if (stageFor(f.stage).premium && !u.premium) throw new ApiError(403, 'premium', 'This needs Premium.');
  if (f.wallet < RESCUE_WALLET) { f = { ...f, wallet: RESCUE_WALLET, rescued: (f.rescued || 0) + 1 }; await userRef.set({ farm: f }, { merge: true }); }
  const seed = Math.floor(Math.random() * 1e9);
  const ref = await db.collection(RUNS).add({ uid: me.uid, kind: 'farm', seed, pace, profile: f, status: 'open', startedMs: Date.now(), createdAt: FieldValue.serverTimestamp() });
  return { runId: ref.id, seed, profile: f };
}

async function farmSubmit(db, me, body) {
  const runId = String(body.runId || '');
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(runId)) throw new ApiError(400, 'invalid', 'Missing game.');
  const raw = body.log;
  if (!Array.isArray(raw) || raw.length > 3000) throw new ApiError(400, 'invalid', 'Invalid game record.');
  const log = raw.map((x) => {
    if (!x || !FARM_ACTIONS.has(x.t) || !Array.isArray(x.a) || x.a.length > 4 || !Number.isInteger(x.d) || x.d < 0 || x.d > 400) throw new ApiError(400, 'invalid', 'Invalid game record.');
    x.a.forEach((v) => { if (!(typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)))) throw new ApiError(400, 'invalid', 'Invalid game record.'); });
    return { d: x.d, t: x.t, a: x.a };
  });
  const runRef = db.doc(`${RUNS}/${runId}`);
  const userRef = db.doc(`${USERS}/${me.uid}`);
  return db.runTransaction(async (tx) => {
    const runSnap = await tx.get(runRef);
    if (!runSnap.exists) throw new ApiError(404, 'notfound', 'Game not found.');
    const run = runSnap.data();
    if (run.uid !== me.uid || run.kind !== 'farm') throw new ApiError(403, 'denied', 'Not your game.');
    if (run.status !== 'open') throw new ApiError(409, 'already', 'This season was already scored.');
    const s = replaySeason(run.profile, run.seed, log);
    if (s.status !== 'done') throw new ApiError(400, 'unfinished', 'The season is not finished.');
    // farm days run on real time: a season cannot end sooner than its days allow
    const lastDay = s.harvestDay || s.day;
    const needMs = lastDay * DAY_PACE[run.pace] * 0.9 - 120000;
    if (Date.now() - run.startedMs < needMs) throw new ApiError(400, 'tooFast', 'Played faster than real time.');

    const score = farmScore(s);
    const userSnap = await tx.get(userRef);
    const u = userSnap.data() || {};
    const key = 'farm' + s.stage;
    const scoreRef = db.doc(`${SCORES}/${me.uid}_${key}`);
    const scoreSnap = await tx.get(scoreRef);
    const prev = (u.progress || {})[key] || {};
    const entry = {
      best: Math.max(prev.best || 0, score.total), stars: Math.max(prev.stars || 0, score.stars),
      passed: !!(prev.passed || score.passed), plays: (prev.plays || 0) + 1, last: score.total,
    };
    const history = [{ seasonNo: s.seasonNo, stage: s.stage, season: s.season, total: score.total, profit: score.profit, passed: score.passed }, ...((run.profile.history) || [])].slice(0, 12);
    const next = { ...nextProfile(s, score), history, rescued: run.profile.rescued || 0 };

    let code = null;
    if (score.passed && !prev.passed) {
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      code = 'GS-FRM-' + s.stage + '-' + Array.from({ length: 6 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
      tx.set(db.doc(`${CERTS}/${code}`), { code, uid: me.uid, name: u.name || 'Learner', journey: 'farmer', level: s.stage, score: score.total, stars: score.stars, parts: score.parts, issuedAt: Date.now() });
    }
    tx.set(userRef, { farm: next, progress: { [key]: entry } }, { merge: true });
    if (!scoreSnap.exists || scoreSnap.data().score < score.total) {
      tx.set(scoreRef, { uid: me.uid, name: u.name || 'Learner', key, score: score.total, profit: score.profit, rank: `${key}#${pad(score.total)}`, at: Date.now() });
    }
    tx.update(runRef, { status: 'closed', score: score.total, closedAt: FieldValue.serverTimestamp() });
    return { score, profile: next, progress: { ...(u.progress || {}), [key]: entry }, certCode: code };
  });
}

async function purge(db, req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) throw new ApiError(401, 'denied', 'Not allowed.');
  const cutoff = Timestamp.fromMillis(Date.now() - 7 * 24 * 3600 * 1000);
  let removed = 0;
  for (let i = 0; i < 25; i++) {
    const snap = await db.collection(RUNS).where('createdAt', '<', cutoff).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += snap.size;
  }
  return { removed };
}

// ---------- handler ----------
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const q = req.query || {};
    const action = String(body.action || q.action || '');
    const db = getFirestore(admin());

    let out;
    if (action === 'leaderboard') out = await leaderboard(db, q.key ? q : body);
    else if (action === 'cert') out = await oneCert(db, q.code ? q : body);
    else if (action === 'purge') out = await purge(db, req);
    else {
      if (req.method !== 'POST') throw new ApiError(405, 'method', 'Use POST.');
      const me = await userFrom(req);
      if (action === 'profile') out = await profile(db, me, body);
      else if (action === 'start') out = await start(db, me, body);
      else if (action === 'submit') out = await submit(db, me, body);
      else if (action === 'certs') out = await certs(db, me);
      else if (action === 'farm') out = await farm(db, me);
      else if (action === 'farmStart') out = await farmStart(db, me, body);
      else if (action === 'farmSubmit') out = await farmSubmit(db, me, body);
      else throw new ApiError(400, 'invalid', 'Unknown action.');
    }
    res.status(200).json({ ok: true, data: out });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    const code = e instanceof ApiError ? e.code : 'server';
    if (!(e instanceof ApiError)) console.error(e);
    const message = e instanceof ApiError ? e.message : `Server error: ${String(e?.message || e).slice(0, 200)}`;
    res.status(status).json({ ok: false, code, message });
  }
}
