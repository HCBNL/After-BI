import { useEffect, useState } from 'react';
import { hasPin, onLockChange, readLocal, syncLock, type LocalLock } from '@/lib/pinLock';

/** This person's PIN settings, kept current across tabs and with Firestore. */
export function useLock(uid: string | undefined): { local: LocalLock; set: boolean } {
  const [local, setLocal] = useState<LocalLock>(() => (uid ? readLocal(uid) : {}));
  useEffect(() => {
    if (!uid) return;
    setLocal(readLocal(uid));
    const stop = onLockChange(() => setLocal(readLocal(uid)));
    void syncLock(uid).then(setLocal);
    return stop;
  }, [uid]);
  return { local, set: hasPin(local) };
}
