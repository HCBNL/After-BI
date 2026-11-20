/**
 * The lock screen, and the watcher that decides when to show it.
 *
 * Mounted once for the signed in person (see LockGate). It does nothing at all
 * until that person has set a PIN in Profile. After that:
 *
 *   idle for the chosen minutes (5, 15, 30 or 60)       locks
 *   away from the app for a minute or more (screen      locks on return
 *   locked, laptop closed, another app in front)
 *   reload, or close and reopen, while locked           still locked
 *   five wrong PINs                                     signs out
 *
 * Every open tab follows: locking or unlocking in one does the same in all.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Spinner } from '@/components/ui';
import { imageUrl } from '@/lib/cloudinary';
import { useBootDone } from '@/lib/boot';
import {
  AWAY_MS,
  MAX_TRIES,
  PIN_LENGTH,
  checkPin,
  hasPin,
  onLockChange,
  readLocal,
  shouldLock,
  syncLock,
  writeLocal,
} from '@/lib/pinLock';
import { PinDots, PinPad } from './PinPad';
import { PetalBackdrop } from '@/components/brand/PetalBackdrop';

const ACTIVITY = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;
const WRITE_EVERY = 5_000;

export default function ScreenLock({ hidden }: { hidden?: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const uid = user?.id ?? '';

  const [locked, setLocked] = useState(() => shouldLock(readLocal(uid)));
  const [pin, setPinState] = useState('');
  /* Kept in a ref too, so the sixth digit submits exactly once (state updaters run twice in StrictMode). */
  const pinRef = useRef('');
  const setPin = useCallback((next: string) => {
    pinRef.current = next;
    setPinState(next);
  }, []);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const lastWrite = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  const lock = useCallback(() => {
    writeLocal(uid, { locked: true });
  }, [uid]);

  /* First sight of this person on this device, the device copy, and other tabs. */
  useEffect(() => {
    if (!uid) return;
    const first = readLocal(uid);
    if (!first.last) writeLocal(uid, { last: Date.now() }, false);
    const follow = () => {
      const now = readLocal(uid);
      setLocked(hasPin(now) && Boolean(now.locked));
    };
    const stop = onLockChange(follow);
    void syncLock(uid).then((next) => {
      if (shouldLock(next)) lock();
      else follow();
    });
    return stop;
  }, [uid, lock]);

  /* Watching for idleness, only while unlocked. */
  useEffect(() => {
    if (!uid || locked) return;

    const touched = () => {
      const now = Date.now();
      if (now - lastWrite.current < WRITE_EVERY) return;
      /* Check BEFORE refreshing: the first tap after an hour asleep must lock, not count as activity. */
      if (shouldLock(readLocal(uid), now)) {
        lock();
        return;
      }
      lastWrite.current = now;
      writeLocal(uid, { last: now }, false);
    };
    const tick = () => {
      if (shouldLock(readLocal(uid))) lock();
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        return;
      }
      const away = hiddenAt.current === null ? 0 : Date.now() - hiddenAt.current;
      hiddenAt.current = null;
      const local = readLocal(uid);
      if (hasPin(local) && (away >= AWAY_MS || shouldLock(local))) lock();
    };

    ACTIVITY.forEach((name) => window.addEventListener(name, touched, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(tick, 10_000);
    return () => {
      ACTIVITY.forEach((name) => window.removeEventListener(name, touched, { capture: true }));
      document.removeEventListener('visibilitychange', visibility);
      window.clearInterval(timer);
    };
  }, [uid, locked, lock]);

  /* Nothing behind the lock scrolls. */
  const showing = locked && !hidden;
  /* Opening the app while locked: the PIN screen IS the first page, so the loading ring goes at once. */
  useBootDone(showing);
  useEffect(() => {
    if (!showing) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setPin('');
    setError('');
    return () => {
      document.body.style.overflow = before;
    };
  }, [showing, setPin]);

  const logOut = useCallback(async () => {
    await signOut();
    navigate('/login', { replace: true });
  }, [signOut, navigate]);

  const submit = useCallback(
    async (entered: string) => {
      const local = readLocal(uid);
      if (!hasPin(local)) {
        writeLocal(uid, { locked: false });
        return;
      }
      setChecking(true);
      const ok = await checkPin(entered, local).catch(() => false);
      setChecking(false);
      if (ok) {
        lastWrite.current = Date.now();
        writeLocal(uid, { locked: false, tries: 0, last: Date.now() });
        return;
      }
      const tries = (local.tries ?? 0) + 1;
      if (tries >= MAX_TRIES) {
        await logOut();
        return;
      }
      writeLocal(uid, { tries }, false);
      setPin('');
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      const left = MAX_TRIES - tries;
      setError(left === 1 ? 'Wrong PIN. One try left before you are logged out.' : `Wrong PIN. ${left} tries left.`);
    },
    [uid, logOut, setPin],
  );

  const digit = useCallback(
    (d: string) => {
      if (checking || pinRef.current.length >= PIN_LENGTH) return;
      setError('');
      const next = pinRef.current + d;
      setPin(next);
      if (next.length === PIN_LENGTH) void submit(next);
    },
    [checking, submit, setPin],
  );
  const back = useCallback(() => setPin(pinRef.current.slice(0, -1)), [setPin]);

  if (!showing || !user) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AfterBI is locked"
      className="fixed inset-0 z-[400] flex h-[100dvh] flex-col overflow-hidden text-white"
      style={{ background: 'var(--hero)' }}
    >
      <PetalBackdrop className="text-white" />
      {/*
        Fits the screen exactly, phone or laptop, with no scrolling: every
        size here follows the screen's height (dvh) between a floor and a cap,
        and the keypad takes whatever room is left in the middle.
      */}
      <div className="relative mx-auto flex h-full w-full max-w-[420px] flex-col px-6 lg:max-w-[520px] pb-[max(env(safe-area-inset-bottom),clamp(0.75rem,3dvh,2rem))] pt-[max(env(safe-area-inset-top),clamp(1rem,5dvh,3.5rem))]">
        <div className="flex items-center gap-4">
          <Avatar
            name={`${user.firstName} ${user.lastName}`}
            src={user.photoURL ? imageUrl(user.photoURL, { width: 160 }) : undefined}
            size="lg"
            className="shrink-0 ring-4 ring-white/20"
          />
          <div className="min-w-0">
            <h1 className="truncate text-[clamp(1.45rem,3.8dvh,2.1rem)] font-extrabold leading-tight tracking-[-0.03em]">
              {user.firstName || 'Welcome back'},
            </h1>
            <p className="mt-1 text-label leading-snug text-white/85">
              Please confirm your PIN to access AfterBI. Not you?{' '}
              <button type="button" onClick={() => void logOut()} className="font-bold text-white underline underline-offset-4">
                Log out
              </button>
            </p>
          </div>
        </div>

        {/* Phone: centred in the room left. Laptop: drawn up under the name, so no band of empty blue sits above the dots. */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center lg:justify-start lg:pt-[clamp(1.5rem,6dvh,4.5rem)]">
          <PinDots count={pin.length} tone="hero" shake={shake} />
          <p className="mt-[clamp(0.25rem,1dvh,0.75rem)] flex min-h-[1.4rem] items-center justify-center gap-2 text-center text-label font-semibold text-white" aria-live="assertive">
            {checking ? <Spinner size={15} /> : error}
          </p>
          <div className="mt-[clamp(0.25rem,1.5dvh,1.25rem)]">
            <PinPad length={pin.length} onDigit={digit} onBack={back} tone="hero" disabled={checking} fit />
          </div>
        </div>

        <p className="text-center text-caption text-white/70">
          Forgot your PIN? Log out and sign in with your password.
        </p>
      </div>
    </div>
  );
}

