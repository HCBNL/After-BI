/**
 * Mounts the PIN lock for whoever is signed in, without putting Firestore on
 * the public site's boot path.
 *
 * The lock screen itself is loaded on demand. Until it arrives, if this device
 * already knows the app should be locked (reloaded while locked, or idle past
 * the limit), a plain cover in the brand colour hides the page, so nothing
 * private shows for even a frame.
 */

import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isPublicPath } from '@/lib/session';
import { readLocal, shouldLock } from '@/lib/pinLocal';

const ScreenLock = lazy(() => import('./ScreenLock'));

export function LockGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return null;

  /* The public site stays readable; the lock waits for the next portal screen. */
  const hidden = isPublicPath(pathname) || pathname === '/login';
  const cover = !hidden && shouldLock(readLocal(user.id));

  return (
    <Suspense
      fallback={cover ? <div className="fixed inset-0 z-[400]" style={{ background: 'var(--hero)' }} aria-hidden /> : null}
    >
      <ScreenLock key={user.id} hidden={hidden} />
    </Suspense>
  );
}
