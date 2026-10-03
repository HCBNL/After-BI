/**
 * Who is signed in, which organisation they belong to, and, when something is
 * wrong with the account, exactly what, so the sign-in screen can say so.
 *
 * `setActiveOrg` is called from here and nowhere else. Every path in `db.ts` is
 * built from it, so this is what decides whose data the session can see.
 *
 * THE OWNER'S FIRST SIGN-IN
 *
 * The platform owner is created by hand: a user in Firebase Authentication,
 * then a `users/{uid}` document with `role: "owner"`. Signing in before that
 * document exists used to bounce silently back to the sign-in form. Now the
 * session stays open, the screen shows the UID to create, and the profile
 * listener lets the owner straight in the moment the document appears.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { normaliseRole } from '@/lib/roles';
import { hadSession, isPublicPath, rememberSession } from '@/lib/session';
import { setActiveOrg, TENANTS } from '@/lib/tenant';
import { PORTAL_ROOT } from '@/lib/tiles';
import { tierOf, type Role, type UserProfile } from '@/types';

export type AuthProblem =
  | { kind: 'no-profile'; uid: string; email: string }
  | { kind: 'no-org' }
  | { kind: 'org-missing'; orgId: string }
  | { kind: 'account-suspended' }
  | { kind: 'org-suspended' }
  | { kind: 'not-configured'; message: string };

interface AuthValue {
  user: UserProfile | null;
  loading: boolean;
  /** True when the account, or its whole organisation, has been switched off. */
  suspended: boolean;
  problem: AuthProblem | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}


/**
 * FIREBASE IS FETCHED WHEN IT IS NEEDED, NOT WHEN THIS FILE IS IMPORTED.
 *
 * This provider wraps the whole app, public pages included, so whatever it
 * imports statically is in the very first download. While the SDK was a static
 * import here, every visitor reading the front page downloaded and started the
 * Firebase app, the auth client and the Firestore client (about 185 KB
 * compressed) to answer a question that only matters to people with accounts.
 *
 * Now the three modules are fetched on first use. A visitor on the public site
 * gets them only once the page has painted and the browser is idle; somebody
 * on their way into the portal gets them at once. The same approach as
 * GetSchool.
 */
async function sdk() {
  const [authSdk, storeSdk, client] = await Promise.all([
    import('firebase/auth'),
    import('firebase/firestore'),
    import('@/lib/firebase'),
  ]);
  return { ...authSdk, ...storeSdk, auth: client.auth, db: client.db };
}

type Sdk = Awaited<ReturnType<typeof sdk>>;
let loaded: Promise<Sdk> | null = null;

/** One download, shared by every caller. */
function firebase(): Promise<Sdk> {
  if (!loaded) {
    loaded = sdk();
    /* A failed chunk must be retryable, not cached as a failure for the visit. */
    loaded.catch(() => {
      loaded = null;
    });
  }
  return loaded;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Where each role lands after signing in. */
export const HOME_FOR_ROLE: Record<Role, string> = PORTAL_ROOT;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<AuthProblem | null>(null);

  /* Refs, so a cleanup always sees the CURRENT listener and a slow tenant read
     that lands after a newer one is ignored. */
  const profileSub = useRef<null | (() => void)>(null);
  const check = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;

    const listen = async () => {
      let fb: Sdk;
      try {
        fb = await firebase();
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Firebase could not start.';
        // eslint-disable-next-line no-console
        console.error('AfterBI could not start Firebase:', error);
        setProblem({ kind: 'not-configured', message });
        setLoading(false);
        return;
      }
      if (cancelled) return;
      const { auth, db, doc, getDoc, onSnapshot, onAuthStateChanged, signOut: fbSignOut } = fb;

    const refuse = (next: AuthProblem | null, endSession = false) => {
      setActiveOrg(null);
      setUser(null);
      setProblem(next);
      setLoading(false);
      rememberSession(false);
      if (endSession) void fbSignOut(auth);
    };

    stop = onAuthStateChanged(auth, (account) => {
      profileSub.current?.();
      profileSub.current = null;
      check.current += 1;

      if (!account) {
        setActiveOrg(null);
        setUser(null);
        setLoading(false);
        rememberSession(false);
        return;
      }

      setLoading(true);

      profileSub.current = onSnapshot(
        doc(db, 'users', account.uid),
        (snap) => {
          const token = ++check.current;

          if (!snap.exists()) {
            refuse({ kind: 'no-profile', uid: account.uid, email: account.email ?? '' });
            return;
          }

          const data = snap.data();
          if (data.active === false) {
            refuse({ kind: 'account-suspended' }, true);
            return;
          }

          const role = normaliseRole(data.role);
          const orgId = typeof data.orgId === 'string' && data.orgId.trim() ? data.orgId.trim() : null;

          const named = typeof data.name === 'string' ? data.name.trim().split(/\s+/) : [];
          const profile: UserProfile = {
            id: account.uid,
            email: account.email ?? (data.email as string) ?? '',
            firstName: (data.firstName as string) ?? named[0] ?? '',
            lastName: (data.lastName as string) ?? named.slice(1).join(' '),
            title: data.title as string | undefined,
            role,
            phone: data.phone as string | undefined,
            photoURL: (data.photoURL as string) ?? undefined,
            orgId: orgId ?? undefined,
            distributorId: data.distributorId as string | undefined,
            distributorIds: Array.isArray(data.distributorIds) ? (data.distributorIds as string[]) : undefined,
            distributorCategory: data.distributorCategory ? tierOf(data.distributorCategory) : undefined,
            territories: data.territories as string[] | undefined,
            warehouseIds: data.warehouseIds as string[] | undefined,
            active: data.active !== false,
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
          };

          const admit = (activeOrg: string | null) => {
            setActiveOrg(activeOrg);
            setUser(profile);
            setProblem(null);
            setLoading(false);
            rememberSession(true);
          };

          /* An owner belongs to the platform, not to a tenant. */
          if (role === 'owner') {
            admit(null);
            return;
          }

          if (!orgId) {
            refuse({ kind: 'no-org' });
            return;
          }

          /* Is the organisation there, and is it switched on? One read. */
          getDoc(doc(db, TENANTS, orgId))
            .then((tenant) => {
              if (token !== check.current) return;
              if (!tenant.exists()) {
                refuse({ kind: 'org-missing', orgId });
                return;
              }
              if ((tenant.data() as { status?: string }).status === 'suspended') {
                refuse({ kind: 'org-suspended' }, true);
                return;
              }
              admit(orgId);
            })
            .catch(() => {
              /* Offline, most likely. Let them in; the rules are the enforcement. */
              if (token === check.current) admit(orgId);
            });
        },
        () => {
          setUser(null);
          setLoading(false);
        },
      );
    });

    };

    /*
     * WHEN THE SDK IS FETCHED.
     *
     *   signed in on this device before, or not on a public page
     *       now: this is somebody on their way into the portal.
     *   anybody else
     *       once the page has painted and the browser is idle, capped at two
     *       seconds, so a visitor reading the front page has the connection
     *       to themselves for the part they can see.
     */
    const needed = hadSession() || !isPublicPath(window.location.pathname);
    let idle: number | undefined;
    let timer: number | undefined;
    if (needed) void listen();
    else if (typeof window.requestIdleCallback === 'function') {
      idle = window.requestIdleCallback(() => void listen(), { timeout: 2000 });
    } else {
      timer = window.setTimeout(() => void listen(), 1200);
    }

    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
      stop?.();
      profileSub.current?.();
      profileSub.current = null;
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      suspended: problem?.kind === 'account-suspended' || problem?.kind === 'org-suspended',
      problem,
      async signIn(email, password) {
        setProblem(null);
        const { auth, signInWithEmailAndPassword } = await firebase();
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signOut() {
        profileSub.current?.();
        profileSub.current = null;
        check.current += 1;
        setActiveOrg(null);
        setUser(null);
        setProblem(null);
        rememberSession(false);
        const { auth, signOut: fbSignOut } = await firebase();
        await fbSignOut(auth);
      },
      async resetPassword(email) {
        const { auth, sendPasswordResetEmail } = await firebase();
        await sendPasswordResetEmail(auth, email.trim());
      },
    }),
    [user, loading, problem],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
