// Data layer. Uses Firebase when configured, otherwise Local mode (this browser only).
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, sendPasswordResetEmail, updateProfile,
} from 'firebase/auth';
import { firebaseConfig } from '../config/firebaseConfig.js';
import { replayWorld, finalScore } from '../world/sim.js';
import { WORLD_CHALLENGES as CHALLENGES } from '../world/levels.js';
import { START_WALLET, RESCUE_WALLET, DAY_PACE, stageFor as farmStage } from '../farm/data.js';
import { replaySeason, finalScore as farmScore, nextProfile } from '../farm/sim.js';

// Vercel environment variables (same names as the old GetSchool) win over the file.
const env = import.meta.env;
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

export const LOCAL = !(cfg.apiKey && cfg.projectId && cfg.appId);
let auth = null;
if (!LOCAL) auth = getAuth(initializeApp(cfg));

// Everything except sign in goes through the site's own server (/api/academy).
async function api(action, body = {}, method = 'POST') {
  const headers = { 'Content-Type': 'application/json' };
  const user = auth?.currentUser;
  if (user) headers.Authorization = 'Bearer ' + (await user.getIdToken());
  let r;
  try {
    r = method === 'GET'
      ? await fetch('/api/academy?' + new URLSearchParams({ action, ...body }), { headers })
      : await fetch('/api/academy', { method: 'POST', headers, body: JSON.stringify({ action, ...body }) });
  } catch {
    const e = new Error('No connection to the server.'); e.code = 'network'; throw e;
  }
  let data = null;
  try { data = await r.json(); } catch { /* not JSON */ }
  if (!data) { const e = new Error(`The server route /api/academy did not answer (status ${r.status}).`); e.code = 'setup'; throw e; }
  if (!data.ok) { const e = new Error(data.message || 'Server error.'); e.code = data.code || 'server'; throw e; }
  return data.data;
}
export function errorText(t, e) {
  const c = e?.code;
  if (c === 'premium') return t('start.err.premium');
  if (c === 'locked') return t('start.err.locked');
  if (c === 'already') return t('res.already');
  if (c === 'network') return t('err.network');
  if (c === 'tooFast') return t('err.tooFast');
  return t('err.server') + ' ' + (e?.message || '');
}

// ---------- local mode helpers ----------
const L = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
};
const listeners = new Set();
function localCurrent() {
  const uid = L.get('gs_session', null);
  if (!uid) return null;
  const users = L.get('gs_users', {});
  return users[uid] ? { uid, email: users[uid].email } : null;
}
function emitLocal() { const u = localCurrent(); listeners.forEach((cb) => cb(u)); }

// ---------- auth ----------
export function onAuth(cb) {
  if (LOCAL) { listeners.add(cb); cb(localCurrent()); return () => listeners.delete(cb); }
  return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));
}

export async function signUp(name, email, password) {
  email = email.trim().toLowerCase();
  if (LOCAL) {
    const users = L.get('gs_users', {});
    if (Object.values(users).some((u) => u.email === email)) throw new Error('auth/email-already-in-use');
    const uid = 'local_' + Math.random().toString(36).slice(2, 10);
    users[uid] = { email, password, name, premium: true, progress: {}, createdAt: Date.now() }; // Local mode: Premium on so every level can be tried
    L.set('gs_users', users); L.set('gs_session', uid); emitLocal();
    return;
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await api('profile', { name });
}

export async function signIn(email, password) {
  email = email.trim().toLowerCase();
  if (LOCAL) {
    const users = L.get('gs_users', {});
    const hit = Object.entries(users).find(([, u]) => u.email === email && u.password === password);
    if (!hit) throw new Error('auth/invalid-credential');
    L.set('gs_session', hit[0]); emitLocal();
    return;
  }
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  if (LOCAL) { L.set('gs_session', null); emitLocal(); return; }
  await fbSignOut(auth);
}

export async function resetPassword(email) {
  if (LOCAL) return;
  await sendPasswordResetEmail(auth, email.trim());
}

// ---------- profile ----------
export async function getProfile(uid) {
  if (LOCAL) {
    const u = L.get('gs_users', {})[uid];
    return u ? { uid, name: u.name, email: u.email, premium: !!u.premium, progress: u.progress || {} } : null;
  }
  return api('profile', { name: auth.currentUser?.displayName || '' });
}

// ---------- games ----------
// Start a game. Online, the server checks access and gives the seed.
export async function startRun(key) {
  if (LOCAL) return { runId: 'local_' + Date.now(), seed: Math.floor(Math.random() * 1e9) };
  return api('start', { key: String(key) });
}

// Finish a game. Online, the server replays the moves and scores the game.
export async function submitRun(profile, key, runId, log) {
  if (!LOCAL) {
    return api('submit', { runId, log });
  }
  key = String(key);
  const ch = CHALLENGES.find((c) => c.id === key);
  const levelId = ch ? ch.base : Number(key);
  const run = L.get('gs_seeds', {})[runId];
  const state = replayWorld(levelId, ch ? ch.id : null, run, log);
  const score = finalScore(state);
  return localSave(profile, key, score, { levelId, certifiable: !ch });
}
export function rememberLocalSeed(runId, seed) {
  if (!LOCAL) return;
  const m = L.get('gs_seeds', {}); m[runId] = seed;
  const keys = Object.keys(m); if (keys.length > 30) delete m[keys[0]];
  L.set('gs_seeds', m);
}

function localSave(profile, key, score, meta) {
  const users = L.get('gs_users', {});
  const prevAll = users[profile.uid]?.progress || {};
  const prev = prevAll[key] || {};
  const entry = {
    best: Math.max(prev.best || 0, score.total), stars: Math.max(prev.stars || 0, score.stars),
    passed: !!(prev.passed || score.passed), plays: (prev.plays || 0) + 1, last: score.total,
  };
  const progress = { ...prevAll, [key]: entry };
  users[profile.uid].progress = progress;
  L.set('gs_users', users);
  const scores = L.get('gs_scores', {});
  const id = profile.uid + '_' + key;
  if (!scores[id] || scores[id].score < score.total) scores[id] = { uid: profile.uid, name: profile.name, key, score: score.total, profit: score.profit, at: Date.now() };
  L.set('gs_scores', scores);
  let certCode = null;
  if (score.passed && meta.certifiable && !prev.passed) {
    certCode = 'GS-ENT-' + meta.levelId + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const c = L.get('gs_certs', {});
    c[certCode] = { code: certCode, uid: profile.uid, name: profile.name, journey: 'entrepreneur', level: meta.levelId, score: score.total, stars: score.stars, parts: score.parts, issuedAt: Date.now() };
    L.set('gs_certs', c);
  }
  return { score, progress, certCode };
}

export async function getLeaderboard(key) {
  if (LOCAL) {
    return Object.values(L.get('gs_scores', {})).filter((x) => x.key === String(key)).sort((a, b) => b.score - a.score).slice(0, 20);
  }
  return api('leaderboard', { key: String(key) }, 'GET');
}

export async function getCertificates(uid) {
  if (LOCAL) return Object.values(L.get('gs_certs', {})).filter((c) => c.uid === uid).sort((a, b) => b.issuedAt - a.issuedAt);
  return api('certs');
}

export async function getCertificate(code) {
  if (LOCAL) return L.get('gs_certs', {})[code] || null;
  return api('cert', { code }, 'GET');
}

// ---------- farmer journey ----------
const FARM0 = { stage: 1, seasonNo: 1, wallet: START_WALLET, seedKg: 0, restaurants: 0, history: [] };

export async function getFarm(profile) {
  if (LOCAL) return L.get('gs_farm_' + profile.uid, FARM0);
  return api('farm');
}

export async function farmStart(profile, pace) {
  if (!LOCAL) return api('farmStart', { pace });
  let farm = L.get('gs_farm_' + profile.uid, FARM0);
  if (farm.wallet < RESCUE_WALLET) { farm = { ...farm, wallet: RESCUE_WALLET, rescued: (farm.rescued || 0) + 1 }; L.set('gs_farm_' + profile.uid, farm); }
  const seed = Math.floor(Math.random() * 1e9);
  const runId = 'local_' + Date.now();
  const runs = L.get('gs_farm_runs', {}); runs[runId] = { seed, pace, profile: farm, createdAt: Date.now() }; L.set('gs_farm_runs', runs);
  return { runId, seed, profile: farm };
}

export async function farmSubmit(profile, runId, log) {
  if (!LOCAL) return api('farmSubmit', { runId, log });
  const run = L.get('gs_farm_runs', {})[runId];
  if (!run) { const e = new Error('Game not found.'); e.code = 'notfound'; throw e; }
  const s = replaySeason(run.profile, run.seed, log);
  if (s.status !== 'done') { const e = new Error('The season is not finished.'); e.code = 'unfinished'; throw e; }
  const score = farmScore(s);
  const next = { ...nextProfile(s, score), history: [{ seasonNo: s.seasonNo, stage: s.stage, season: s.season, total: score.total, profit: score.profit, passed: score.passed }, ...(run.profile.history || [])].slice(0, 12) };
  L.set('gs_farm_' + profile.uid, next);
  const key = 'farm' + s.stage;
  const users = L.get('gs_users', {});
  const prev = users[profile.uid]?.progress?.[key] || {};
  const entry = { best: Math.max(prev.best || 0, score.total), stars: Math.max(prev.stars || 0, score.stars), passed: !!(prev.passed || score.passed), plays: (prev.plays || 0) + 1, last: score.total };
  if (users[profile.uid]) { users[profile.uid].progress = { ...(users[profile.uid].progress || {}), [key]: entry }; L.set('gs_users', users); }
  const scores = L.get('gs_scores', {});
  const sid = profile.uid + '_' + key;
  if (!scores[sid] || scores[sid].score < score.total) scores[sid] = { uid: profile.uid, name: profile.name, key, score: score.total, profit: score.profit, at: Date.now() };
  L.set('gs_scores', scores);
  let certCode = null;
  if (score.passed && !prev.passed) {
    certCode = 'GS-FRM-' + s.stage + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const c = L.get('gs_certs', {});
    c[certCode] = { code: certCode, uid: profile.uid, name: profile.name, journey: 'farmer', level: s.stage, score: score.total, stars: score.stars, parts: score.parts, issuedAt: Date.now() };
    L.set('gs_certs', c);
  }
  return { score, profile: next, progress: users[profile.uid]?.progress || {}, certCode };
}
export { DAY_PACE, farmStage };

// ---------- game in progress (kept on this device) ----------
export function saveRun(uid, key, state) { L.set(`gs_run_${uid}_${key}`, state); }
export function loadRun(uid, key) { return L.get(`gs_run_${uid}_${key}`, null); }
export function clearRun(uid, key) { try { localStorage.removeItem(`gs_run_${uid}_${key}`); } catch { /* ignore */ } }
