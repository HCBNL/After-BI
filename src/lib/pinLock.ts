/**
 * The personal PIN: a second, short lock on top of the password.
 *
 * Signing in proves who you are once. The PIN proves it is still you after the
 * app has sat idle, or the phone or computer was locked and picked up again.
 * It is six digits, chosen by each person, and it is never the password.
 *
 * WHAT IS STORED, AND WHERE
 *
 *   Firestore  users/{uid}/private/lock   { pinHash, salt, minutes, updatedAt }
 *   Device     localStorage ab.lock.{uid} { the same three, plus last activity,
 *                                           whether it is locked, wrong tries }
 *
 * Only a salted PBKDF2 hash ever leaves the keypad, never the digits. The
 * device copy lets the lock work offline and survive a reload: closing the tab
 * on a locked screen and opening it again must not be a way round it.
 *
 * Forgetting the PIN is not a dead end: "Log out" on the lock screen signs out,
 * and signing in again with the password unlocks everything as normal.
 */

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  DEFAULT_MINUTES,
  hasPin,
  hashPin,
  newSalt,
  readLocal,
  validPin,
  writeLocal,
  PIN_LENGTH,
  type LocalLock,
  type LockSettings,
} from './pinLocal';

export * from './pinLocal';

const lockDoc = (uid: string) => doc(db, 'users', uid, 'private', 'lock');


/* ------------------------------------------------------------- Firestore */

/** Refresh the device copy from Firestore. Offline, the device copy stands. */
export async function syncLock(uid: string): Promise<LocalLock> {
  return (await syncLockState(uid)).local;
}

/** As syncLock, and whether the server answered (so "no PIN" is known, not a guess made offline). */
export async function syncLockState(uid: string): Promise<{ local: LocalLock; known: boolean }> {
  try {
    return { local: await pull(uid), known: true };
  } catch {
    return { local: readLocal(uid), known: false };
  }
}

async function pull(uid: string): Promise<LocalLock> {
  {
    const snap = await getDoc(lockDoc(uid));
    if (!snap.exists()) {
      const local = readLocal(uid);
      if (hasPin(local)) return writeLocal(uid, { pinHash: undefined, salt: undefined, locked: false, tries: 0 });
      return local;
    }
    const data = snap.data() as Partial<LockSettings>;
    const local = readLocal(uid);
    if (data.pinHash === local.pinHash && data.salt === local.salt && data.minutes === local.minutes) return local;
    return writeLocal(uid, {
      pinHash: data.pinHash,
      salt: data.salt,
      minutes: data.minutes ?? DEFAULT_MINUTES,
    });
  }
}

export async function savePin(uid: string, pin: string, minutes: number): Promise<void> {
  if (!validPin(pin)) throw new Error(`The PIN must be ${PIN_LENGTH} digits.`);
  const salt = newSalt();
  const pinHash = await hashPin(pin, salt);
  await setDoc(lockDoc(uid), { pinHash, salt, minutes, updatedAt: serverTimestamp() });
  writeLocal(uid, { pinHash, salt, minutes, last: Date.now(), locked: false, tries: 0 });
}

export async function setLockMinutes(uid: string, minutes: number): Promise<void> {
  await updateDoc(lockDoc(uid), { minutes, updatedAt: serverTimestamp() });
  writeLocal(uid, { minutes, last: Date.now() });
}

export async function removePin(uid: string): Promise<void> {
  await deleteDoc(lockDoc(uid));
  writeLocal(uid, { pinHash: undefined, salt: undefined, locked: false, tries: 0 });
}
