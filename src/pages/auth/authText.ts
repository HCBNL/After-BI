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
      return 'This account has been switched off in Firebase Authentication.';
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
  switch (problem.kind) {
    case 'no-profile':
      return {
        title: 'This sign-in has no profile yet',
        body: 'The password is right, but Firestore has no users document for this account. In Firebase console → Firestore → users, add a document with the ID below. This screen moves on by itself once it exists.',
      };
    case 'no-org':
      return {
        title: 'Not attached to an organisation',
        body: 'This account has no orgId on its profile. The organisation’s administrator, or the platform owner, needs to fix it.',
      };
    case 'org-missing':
      return {
        title: 'The organisation does not exist',
        body: `The profile points at “${problem.orgId}”, but there is no orgs/${problem.orgId} document. Create the organisation from the platform console first.`,
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
  }
}
