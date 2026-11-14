/**
 * "Something was saved." One signal, raised after every write in `lib/db`
 * lands, so anything that worked figures out from those records (the
 * reminders, the brief, the account balances behind them) can look again
 * instead of showing what was true before the change.
 *
 * The write functions below are Firestore's own, each followed by the signal;
 * `lib/db` imports them from here instead of from Firestore. Nothing is sent
 * anywhere: it is an event inside this tab.
 */
import * as fs from 'firebase/firestore';

const EVENT = 'afterbi:data-changed';

export function dataChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

export function onDataChanged(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

type AnyWrite = (...args: unknown[]) => Promise<unknown>;

function signalled<F>(write: F): F {
  return ((...args: unknown[]) =>
    (write as unknown as AnyWrite)(...args).then((result) => {
      dataChanged();
      return result;
    })) as F;
}

export const addDoc = signalled(fs.addDoc);
export const setDoc = signalled(fs.setDoc);
export const updateDoc = signalled(fs.updateDoc);
export const deleteDoc = signalled(fs.deleteDoc);
export const runTransaction = signalled(fs.runTransaction);
