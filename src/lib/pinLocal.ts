/**
 * The device side of the personal PIN lock: hashing, the localStorage copy and
 * the rule for when to lock. No Firestore here, so the boot path can read it
 * synchronously and cover the screen before anything else paints.
 * See lib/pinLock.ts for the whole story.
 */

export const PIN_LENGTH = 6;
export const MAX_TRIES = 5;
export const LOCK_CHOICES = [5, 15, 30, 60] as const;
export const DEFAULT_MINUTES = 15;
/** Away from the app (screen locked, another app) at least this long locks it on return. */
export const AWAY_MS = 60_000;

const ITERATIONS = 120_000;
const EVENT = 'ab-lock-change';
const PREFIX = 'ab.lock.';

export interface LockSettings {
  pinHash: string;
  salt: string;
  minutes: number;
}

export interface LocalLock extends Partial<LockSettings> {
  /** Last time this person touched the app, ms. */
  last?: number;
  locked?: boolean;
  tries?: number;
}

/* ---------------------------------------------------------------- hashing */

const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

export function newSalt(): string {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: ITERATIONS },
    key,
    256,
  );
  return hex(bits);
}

export async function checkPin(pin: string, settings: Pick<LockSettings, 'pinHash' | 'salt'>): Promise<boolean> {
  const got = await hashPin(pin, settings.salt);
  /* Constant time, out of habit: the comparison is local, but it costs nothing. */
  let diff = got.length ^ settings.pinHash.length;
  for (let i = 0; i < got.length; i += 1) diff |= got.charCodeAt(i) ^ settings.pinHash.charCodeAt(i % settings.pinHash.length);
  return diff === 0;
}

export function validPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/* ---------------------------------------------------------- device copy */

export function readLocal(uid: string): LocalLock {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + uid) ?? '{}') as LocalLock;
  } catch {
    return {};
  }
}

export function writeLocal(uid: string, patch: LocalLock, announce = true): LocalLock {
  const next = { ...readLocal(uid), ...patch };
  try {
    localStorage.setItem(PREFIX + uid, JSON.stringify(next));
  } catch {
    /* private mode with storage off: the lock still works for this tab */
  }
  if (announce) window.dispatchEvent(new CustomEvent(EVENT, { detail: uid }));
  return next;
}

/** Every person's lock state on this device. Called on sign out. */
export function clearLocalLocks(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    /* nothing to clear */
  }
}

export function onLockChange(fn: () => void): () => void {
  const local = () => fn();
  const other = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(PREFIX)) fn();
  };
  window.addEventListener(EVENT, local);
  window.addEventListener('storage', other);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener('storage', other);
  };
}

export function hasPin(local: LocalLock): local is LocalLock & LockSettings {
  return Boolean(local.pinHash && local.salt);
}

/** Should this person's app be locked right now? */
export function shouldLock(local: LocalLock, now = Date.now()): boolean {
  if (!hasPin(local)) return false;
  if (local.locked) return true;
  if (!local.last) return false;
  return now - local.last >= (local.minutes || DEFAULT_MINUTES) * 60_000;
}

/* ------------------------------------------------- opening vs signing in */

/*
 * The PIN is asked every time the app opens. The one exception is the moment
 * right after typing the password on this page load: that already proved who
 * this is. A module flag (not storage), so a reload counts as opening again.
 */
let freshSignIn = false;
export function markFreshSignIn(): void {
  freshSignIn = true;
}
export function isFreshSignIn(): boolean {
  return freshSignIn;
}
