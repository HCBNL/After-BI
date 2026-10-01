import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { deadline, retry } from '@/lib/deadline';
import { COLLECTIONS } from '@/lib/collections';
import { setActiveSchool, TENANTS } from '@/lib/tenant';
import { normaliseRole } from '@/lib/roles';
import { clearQueryCache } from '@/lib/queryCache';
import { hadSession, rememberSession } from '@/lib/session';
import { clearArchive } from '@/lib/sealed';
import type { Role, UserProfile } from '@/types';

/**
 * FIREBASE IS FETCHED WHEN IT IS NEEDED, NOT WHEN THIS FILE IS IMPORTED.
 *
 * This provider wraps the entire application, public pages included, so it is
 * imported by `main.tsx` and therefore lands in the very first bundle the
 * browser downloads. While the four imports below were static, every visitor
 * to the marketing site downloaded, parsed and started the Firebase app, the
 * auth client and the Firestore client before React rendered its first frame,
 * to answer a question — "is somebody signed in?" — that only matters to the
 * people who have accounts.
 *
 * The three helpers below fetch what they need on the first call. The chunk is
 * downloaded once and kept by the browser for the rest of the visit, so a
 * teacher pays for it once and a visitor reading the front page never does.
 * `when` decides the moment that first call happens; see the boot effect.
 */
async function client() {
  return import('@/lib/firebase');
}

/** The auth SDK, plus the configured client. Throws if this build has no keys. */
async function authApi() {
  const [sdk, { requireAuth }] = await Promise.all([import('firebase/auth'), client()]);
  return { ...sdk, instance: requireAuth() };
}

/** The Firestore SDK, plus the configured database. */
async function store() {
  const [sdk, { requireDb }] = await Promise.all([import('firebase/firestore'), client()]);
  return { ...sdk, database: requireDb() };
}

/**
 * The addresses that have nothing to do with an account.
 *
 * Everything else — the portal, the sign-in screen, the password reset — is
 * somewhere a person only goes because they have one, so the SDK is fetched
 * for those immediately. Kept deliberately loose: a path that is not matched
 * here only means the SDK is fetched a moment earlier, never that a page is
 * refused or a check is skipped.
 */
const PUBLIC = /^\/(?:$|about|features|pricing|blog|create|demo|start|signup)/;

/**
 * Is this profile's school still entitled to be used?
 *
 * Suspending a school was a badge and nothing else: the status sat on the
 * tenant record, the platform list showed it, and every screen in that school
 * carried on working. `firestore.rules` now refuses a suspended school at the
 * gate — but a refusal reads as "permission denied" on whichever screen
 * happened to load first, which tells a head teacher nothing. So it is asked
 * here as well, once, where there is somewhere to put the answer.
 *
 * Only an explicit `suspended` closes the door. A missing tenant document
 * opens it, matching `schoolOpen()` in the rules: a school half way through
 * being created must not be locked by a document that is not there yet.
 */
async function schoolSuspended(schoolId: string | undefined): Promise<boolean> {
  if (!schoolId) return false;
  try {
    /*
     * Six seconds, and unreadable counts as open.
     *
     * This runs between reading the profile and publishing the user, so an
     * unguarded read here holds the whole app on its boot skeleton exactly as
     * the profile read did. It is also the least important read in the
     * sequence: it only decides whether to show a nicer message than the one
     * the security rules would produce anyway. A short clock and a shrug is
     * the right trade — the rules are the enforcement, this is the
     * explanation.
     */
    const { getDoc, doc, database } = await store();
    const snap = await deadline(
      getDoc(doc(database, TENANTS, schoolId)),
      6_000,
      'The subscription check',
    );
    return snap.exists() && (snap.data() as { status?: string }).status === 'suspended';
  } catch {
    // Unreadable for some other reason — do not turn a network blip into a
    // lockout. The rules are the enforcement; this is only the explanation.
    return false;
  }
}

const SUSPENDED_MESSAGE =
  'This school’s GetSchool subscription is suspended, so the portal is closed. Your school’s administrator needs to contact GetSchool to reopen it.';

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  /**
   * Edit your own details — name, phone, address, photograph.
   *
   * Deliberately not gated by anything. A parent should be able to correct
   * their phone number at eleven at night without asking the school office,
   * and no lock on an academic record touches this. The change is audited.
   */
  patchProfile: (patch: Partial<UserProfile>) => Promise<void>;
  is: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * Is this profile attached to something it can read?
 *
 * Every role but one belongs to a school, and without a `schoolId` there is no
 * path for `db.ts` to resolve — the account is inert. The owner is the
 * exception by definition: it is the account that creates schools, so requiring
 * one of it would mean no school could ever be created.
 */
function hasTenant(profile: UserProfile): boolean {
  return profile.role === 'owner' || Boolean(profile.schoolId);
}

/**
 * The one door a `users` document comes through.
 *
 * Both places that read a profile — the auth listener and `signIn` — go
 * through here, and the reason is `normaliseRole`. A family account created
 * before parent and student were merged still says `role: 'parent'` in the
 * database; every table in the app is now keyed by `pg`. Translating here, at
 * the single point of entry, means nothing downstream has to know that the
 * spelling ever changed — no route, no guard, no capability lookup, no label.
 *
 * It is deliberately not done inside `db.ts`. The profile is read before the
 * tenant is known, and `db.ts` cannot resolve a path without one.
 */
function hydrate(snap: { id: string; data: () => unknown }): UserProfile {
  const raw = snap.data() as Record<string, unknown>;
  return { ...raw, id: snap.id, role: normaliseRole(raw.role) } as UserProfile;
}

/**
 * THE READ THAT WAS HANGING THE WHOLE APP.
 *
 * `onAuthStateChanged` fires on every load with a restored session, and the
 * next thing it did was `await getDoc(users/{uid})` with nothing guarding it.
 * Firestore's server reads do not settle on a stalled connection — no error,
 * no rejection — so the `finally` that flips `loading` to false never ran, and
 * `RequireRole` sat on `ShellSkeleton` for as long as the tab was open. That
 * is the "I refresh and it is constantly loading" report, and it is worse on
 * exactly the connections this app is for: with `persistentLocalCache` on, the
 * SDK is content to wait on a half-open stream behind a mobile proxy.
 *
 * Three answers in order of preference:
 *
 *   1. The server, given eight seconds and a second attempt. A handover
 *      between masts should cost a retry, not a sign-out.
 *   2. The copy already on the device. Firestore has persisted this profile
 *      since the last visit, and it is the same document — a role or a school
 *      that changed since is re-checked by the security rules on the very next
 *      read, so trusting it here grants nothing. This is what makes the app
 *      open at all in a lift or on school Wi-Fi that is filtering.
 *   3. Rethrow, and the caller bounces to the login screen as before.
 *
 * Note what is NOT retried: a `permission-denied`. `retry` refuses to repeat
 * a refusal, because asking twice cannot turn one into an approval and doing
 * so just doubles how long a genuinely broken account waits.
 */
async function readProfile(uid: string) {
  const { getDoc, getDocFromCache, doc, database } = await store();
  const path = doc(database, COLLECTIONS.users, uid);
  try {
    return await retry(() => getDoc(path), { ms: 8_000, attempts: 2, what: 'Your account' });
  } catch (error) {
    try {
      const cached = await getDocFromCache(path);
      if (cached.exists()) return cached;
    } catch {
      /* Nothing on the device either — private mode, or a first visit. */
    }
    throw error;
  }
}

/** Throws a message meant to be shown to the person, not logged. */
function friendlyAuthError(error: unknown): Error {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new Error('That email and password do not match any account.');
    case 'auth/too-many-requests':
      return new Error('Too many attempts. Please wait a few minutes and try again.');
    case 'auth/user-disabled':
      return new Error('This account has been suspended. Please contact the school office.');
    case 'auth/network-request-failed':
      return new Error('No internet connection. Check your network and try again.');
    case 'auth/invalid-email':
      return new Error('That email address does not look right.');
    default:
      return new Error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * Leave a note for the next load about how this settled.
   *
   * One place rather than at each of the half dozen exits below, so a branch
   * added later cannot forget to write it. It is only a hint about whether the
   * front page should wait for Firebase before it draws; see
   * `src/lib/session.ts` for what it is and what it deliberately is not.
   */
  useEffect(() => {
    if (loading) return;
    rememberSession(Boolean(user));
  }, [user, loading]);

  /* -------------------------------------------------------------- boot -- */

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const listen = async () => {
      const [{ onAuthStateChanged }, firebase] = await Promise.all([
        import('firebase/auth'),
        client(),
      ]);
      if (cancelled) return;

      if (!firebase.auth || !firebase.db) {
        // No Firebase keys in this build. Nothing can be signed in to, and the
        // login page says so rather than failing on submit.
        setLoading(false);
        return;
      }

      unsubscribe = onAuthStateChanged(firebase.auth, handler);
    };

    /*
     * WHEN THE SDK IS FETCHED, WHICH IS THE WHOLE POINT OF THIS.
     *
     * Downloading it is no longer free of charge to the first paint, but it is
     * not free of charge to the connection either: a megabyte-class request
     * started in the same breath as the page's own code competes with it for
     * what little bandwidth a phone on mobile data has. So the request is
     * placed rather than merely deferred.
     *
     *   somebody has signed in on this device, or the address is not a public
     *   one  ->  fetch it now. This is a person on their way into the portal
     *            and the sooner it arrives the sooner they are in.
     *
     *   anybody else  ->  wait for the browser to finish painting the page and
     *                     go idle, then fetch it. A visitor reading the front
     *                     page gets the whole of the connection to themselves
     *                     for the part they can see.
     *
     * The wait is capped at two seconds, because `loading` must resolve on
     * every device however busy: a portal route renders its skeleton until it
     * does, and a browser that never goes idle must not strand somebody there.
     * Safari has no `requestIdleCallback`, so it takes the timer.
     */
    const needed = hadSession() || !PUBLIC.test(window.location.pathname);
    let idle: number | undefined;
    let timer: number | undefined;

    if (needed) {
      void listen();
    } else if (typeof window.requestIdleCallback === 'function') {
      idle = window.requestIdleCallback(() => void listen(), { timeout: 2000 });
    } else {
      timer = window.setTimeout(() => void listen(), 1200);
    }

    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
      unsubscribe?.();
    };

    async function handler(fbUser: { uid: string } | null) {
      if (!fbUser) {
        setUser(null);
        /* Covers a session that ended without going through `signOut` — an
         * expired token, a sign-out in another tab. The cache is one person's. */
        clearQueryCache();
        clearArchive();
        setLoading(false);
        return;
      }

      try {
        const snap = await readProfile(fbUser.uid);
        const restored = snap.exists() ? hydrate(snap) : null;
        // The same three tests `signIn` makes. A restored session used to skip
        // the suspended-account one, so an account suspended after its owner
        // last signed in stayed in the portal on every screen the rules allowed.
        if (restored && hasTenant(restored) && restored.status !== 'suspended') {
          const profile = restored;

          // A school suspended since this session started is signed out here,
          // rather than left on a screen where every query fails.
          if (await schoolSuspended(profile.schoolId)) {
            const { signOut, instance } = await authApi();
            setActiveSchool(null);
            setUser(null);
            await signOut(instance);
            setLoading(false);
            return;
          }

          /*
           * The tenant is set before the user is, and that ordering matters.
           *
           * Every read in `db.ts` resolves its path through `requireSchool()`.
           * Publishing the user first would let the screens underneath mount
           * and fire their queries in the same tick, against no school — which
           * throws rather than leaking, but throws on a screen a parent is
           * looking at. See `src/lib/tenant.ts`.
           */
          setActiveSchool(profile.schoolId ?? null);
          setUser(profile);
        } else {
          /*
           * Authenticated, but the profile is missing or carries no `schoolId`.
           * Either way the account is incomplete, and we sign it out rather
           * than silently granting a role or a tenant.
           *
           * The `schoolId` half of that test matters as much as the existence
           * half, and it used to be absent here. `signIn` has always refused a
           * profile without one (see below), so a project whose accounts
           * predate the multi-tenant rebuild would refuse a fresh sign-in
           * while a restored session sailed past this line — and then threw
           * `requireSchool()` on whichever screen loaded first. One rule in
           * two places has to be the same rule, or "it works until you sign
           * out" is the bug report you get.
           *
           * `scripts/doctor.mjs` names which of the two it is.
           */
          const { signOut, instance } = await authApi();
          setActiveSchool(null);
          setUser(null);
          await signOut(instance);
        }
      } catch {
        /*
         * A profile read that failed — a token-refresh blip, a momentary
         * network drop. The user is nulled to bounce back to the login screen,
         * and the cache is cleared with them: this is the one path that drops a
         * person WITHOUT a clean sign-out, so it is the one place the cache
         * would otherwise survive into whoever signs in next on a shared tab.
         * (Namespacing by school already makes a cross-tenant read impossible;
         * this closes same-school-different-person too.)
         */
        setActiveSchool(null);
        setUser(null);
        clearQueryCache();
        clearArchive();
      } finally {
        setLoading(false);
      }
    }
  }, []);

  /* ------------------------------------------------------------ actions -- */

  const signIn = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    const normalised = email.trim().toLowerCase();

    try {
      /* The one place the SDK is certainly needed: somebody has pressed Sign
         in. On the login screen it was fetched when the page opened, so this
         resolves from the browser's cache rather than the network. */
      const { signInWithEmailAndPassword, signOut, instance } = await authApi();

      const credential = await signInWithEmailAndPassword(instance, normalised, password);
      const snap = await readProfile(credential.user.uid);
      if (!snap.exists()) {
        await signOut(instance);
        throw new Error('Your account has no profile yet. Please contact the school office.');
      }
      const profile = hydrate(snap);

      if (!hasTenant(profile)) {
        await signOut(instance);
        throw new Error(
          'This account is not attached to a school yet. Please contact the school office.',
        );
      }

      if (profile.status === 'suspended') {
        await signOut(instance);
        throw new Error('This account has been suspended. Please contact the school office.');
      }

      if (await schoolSuspended(profile.schoolId)) {
        await signOut(instance);
        throw new Error(SUSPENDED_MESSAGE);
      }

      /*
       * Not awaited, and that is the point.
       *
       * A write does not settle on a stalled connection any more than a read
       * does, and this one is a courtesy: it stamps the last sign-in for the
       * Accounts screen. Awaiting it meant a head teacher who had typed the
       * right password sat on a spinning Sign in button — already
       * authenticated, already permitted — waiting on a field nobody was
       * looking at. Firestore applies it to the local cache at once and
       * flushes it when the connection allows.
       */
      void store()
        .then(({ setDoc, doc, database }) =>
          setDoc(
            doc(database, COLLECTIONS.users, credential.user.uid),
            { lastLoginAt: new Date().toISOString() },
            { merge: true },
          ),
        )
        .catch(() => {});

      setActiveSchool(profile.schoolId ?? null);
      setUser(profile);
      return profile;
    } catch (error) {
      throw friendlyAuthError(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    /*
     * Loaded rather than imported, like everything else here. Somebody
     * pressing Sign out has been signed in, so this is already in the
     * browser's cache and resolves without a request.
     */
    const [{ signOut: fbSignOut }, { auth }] = await Promise.all([
      import('firebase/auth'),
      client(),
    ]);
    if (auth) await fbSignOut(auth);
    /*
     * Clear the tenant, not just the user.
     *
     * A shared office laptop is normal in a Nigerian school. Leaving the school
     * id set after sign-out would mean the next person's first query resolves
     * against the previous person's school until their own profile lands — and
     * that is the exact shape of bug this whole design exists to prevent.
     */
    setActiveSchool(null);
    setUser(null);
    /*
     * Empty the in-memory query cache too, for the same shared-laptop reason.
     * It holds one person's rosters, results and children; the next person to
     * sign in on this tab must not see any of it flash up before their own
     * data lands. Firestore's own cache is per-origin and its rules re-gate
     * every read, but this RAM layer answers before a rule is ever consulted,
     * so it is cleared by hand here.
     */
    clearQueryCache();
    /*
     * The saved report cards go with it, for the same shared-laptop reason.
     * They are scoped to the uid in their key, so the next person could not
     * read them by accident — this makes it impossible on purpose too.
     */
    clearArchive();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    /*
     * FIREBASE SENDS THIS, AND THAT IS THE RIGHT CALL.
     *
     * This briefly called a Cloud Function that generated the link with the
     * Admin SDK and sent it through Resend, so the email could carry the
     * GetSchool letterhead. It worked, but every Cloud Function requires the
     * Blaze plan, and a password reset is not worth putting a billing account
     * behind — least of all one that then fails closed if billing lapses.
     *
     * Worse, while the function was written and undeployed, this call failed
     * outright: the browser asked for a function that did not exist, got no
     * CORS headers back, and the reset screen showed "internal". Nobody could
     * reset a password at all. A branded email that does not send is worth
     * less than a plain one that does.
     *
     * So Firebase sends it. The letterhead is handled where it costs nothing:
     * Authentication → Templates → SMTP settings points Firebase at Resend, so
     * the email leaves from `accounts@getschool.app` rather than from
     * `noreply@<project>.firebaseapp.com`, which is the part a cautious
     * proprietor actually looks at.
     */
    try {
      const { sendPasswordResetEmail, instance } = await authApi();
      await sendPasswordResetEmail(instance, email.trim().toLowerCase());
    } catch (error) {
      throw friendlyAuthError(error);
    }
  }, []);

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!user) return;
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.join(' ') || user.lastName;

      const { setDoc, doc, database } = await store();
      await setDoc(doc(database, COLLECTIONS.users, user.id), { firstName, lastName }, { merge: true });

      const [{ updateProfile }, { auth }] = await Promise.all([import('firebase/auth'), client()]);
      if (auth?.currentUser) await updateProfile(auth.currentUser, { displayName: name });
      setUser({ ...user, firstName, lastName });
    },
    [user],
  );

  const patchProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) return;
      const { updateUser } = await import('@/lib/db');
      const updated = await updateUser(user.id, patch, user);

      // Keep the Firebase Auth display name in step when the name changed.
      if (patch.firstName || patch.lastName) {
        const [{ updateProfile }, { auth }] = await Promise.all([
          import('firebase/auth'),
          client(),
        ]);
        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: `${updated.firstName} ${updated.lastName}`,
          });
        }
      }

      setUser(updated);
    },
    [user],
  );

  const is = useCallback((...roles: Role[]) => (user ? roles.includes(user.role) : false), [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      resetPassword,
      updateDisplayName,
      patchProfile,
      is,
    }),
    [user, loading, signIn, signOut, resetPassword, updateDisplayName, patchProfile, is],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Where each role lands after signing in.
 *
 * `pg` goes to `/portal/family`, which is one portal where there were two.
 * `/portal/parent` and `/portal/student` still resolve — see the redirects in
 * `App.tsx` — because they are printed in every results email ever sent.
 */
export const HOME_FOR_ROLE: Record<Role, string> = {
  owner: '/portal/owner',
  superadmin: '/portal/admin',
  admin: '/portal/admin',
  teacher: '/portal/teacher',
  pg: '/portal/family',
};
