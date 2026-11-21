/**
 * Whether this person has had the tour, kept on their account rather than on
 * one device: `users/{uid}/private/tour`, which only they can read or write
 * (firestore.rules). So the tour plays once, ever, on whichever phone or
 * laptop they first sign in on, and never again unless they start it from Help.
 * Loaded on demand, so the public site never pulls in Firestore for it.
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const tourDoc = (uid: string) => doc(db, 'users', uid, 'private', 'tour');

/** True when the account has already been shown the tour. Any failure reads as seen: never nag. */
export async function tourSeenRemote(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(tourDoc(uid));
    return snap.exists();
  } catch {
    return true;
  }
}

export async function markTourSeenRemote(uid: string): Promise<void> {
  try {
    await setDoc(tourDoc(uid), { seenAt: serverTimestamp() }, { merge: true });
  } catch {
    /* the device copy still stands */
  }
}
