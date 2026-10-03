/**
 * Has anybody signed in on this device before?
 *
 * Firebase answers "is somebody signed in" only after its SDK has downloaded
 * and started. This one flag answers it at once, so the public pages can skip
 * the SDK for a first time visitor while somebody who uses the portal does not
 * wait for it. It grants nothing: every read is still decided by
 * firestore.rules against a real token. The worst a tampered flag can do is
 * make this device fetch the SDK a moment earlier or later.
 */

const KEY = 'ab.session';

export function hadSession(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberSession(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* the next visit simply waits for Firebase */
  }
}

/** The addresses that have nothing to do with an account. */
const PUBLIC = /^\/(?:$|about|features|product|pricing|partners|blog|videos|roles|demo|help)/;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC.test(pathname);
}
