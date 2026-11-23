/**
 * Auth failures, as sentences somebody can act on.
 *
 * Pulled out of `LoginPage` because the reset screen needs the same
 * translations and a second copy would drift within a month. Nothing here
 * touches Firebase or React: it is a lookup table with opinions.
 *
 * THE OPINION, SINCE THERE IS ONE
 *
 * Every string ends in something the reader can do. "auth/too-many-requests"
 * becomes "wait a few minutes, or reset your password", not "too many
 * requests". A person who cannot get into software at eight in the evening has
 * nobody to ask, and an error that only names the condition leaves them exactly
 * where they were.
 */

import type { AuthProblem } from '@/context/AuthContext';

/** A Firebase auth code, as a sentence. */
export function readable(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password do not match an account. Check both, or reset your password.';
    case 'auth/invalid-email':
      return 'That does not look like an email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, or reset your password.';
    case 'auth/network-request-failed':
      return 'We could not reach the server. Check your internet connection.';
    case 'auth/user-disabled':
      return 'This account has been switched off. Ask your administrator.';
    default:
      return 'We could not sign you in. Try again in a moment.';
  }
}

/**
 * The password was right and the account still cannot be used.
 *
 * These four are the ones that look like a broken app and are not: the sign-in
 * worked, and what is missing is a profile, an organisation, or a subscription.
 * Saying which one it is turns a support call into a sentence somebody can
 * forward to their administrator.
 */
export function problemText(problem: AuthProblem): { title: string; body: string } {
  /*
   * Never anything technical here. This screen is public: whoever typed the
   * password sees it, so it names no database, collection, document id,
   * organisation id or hosting setting. It says what is wrong in plain words
   * and who can fix it. The details are in Firebase for the platform owner.
   */
  switch (problem.kind) {
    case 'no-profile':
    case 'no-org':
    case 'org-missing':
      return {
        title: 'This account is not ready yet',
        body: 'Your account has not been fully set up. Ask your administrator to finish setting it up, then sign in again.',
      };
    case 'account-suspended':
      return {
        title: 'This account has been suspended',
        body: 'An administrator in your organisation can switch it back on.',
      };
    case 'org-suspended':
      return {
        title: 'This organisation is suspended',
        body: 'Its AfterBI subscription is on hold, so the portal is closed. Your administrator needs to contact the AfterBI team.',
      };
    case 'not-configured':
      return {
        title: 'AfterBI could not connect',
        body: 'The sign-in service did not load. Check your connection and refresh the page. If it keeps happening, contact info@afterbi.com.',
      };
  }
}
