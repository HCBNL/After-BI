/**
 * Who is signed in, which organisation they belong to, and — when something is
 * wrong with the account — exactly what, so the sign-in screen can say so.
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
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { normaliseRole } from '@/lib/roles';
import { setActiveOrg, TENANTS } from '@/lib/tenant';
import { PORTAL_ROOT } from '@/lib/tiles';
import type { Role, UserProfile } from '@/types';

export type AuthProblem =
  | { kind: 'no-profile'; uid: string; email: string }
  | { kind: 'no-org' }
  | { kind: 'org-missing'; orgId: string }
  | { kind: 'account-suspended' }
  | { kind: 'org-suspended' };

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
    const refuse = (next: AuthProblem | null, endSession = false) => {
      setActiveOrg(null);
      setUser(null);
      setProblem(next);
      setLoading(false);
      if (endSession) void fbSignOut(auth);
    };

    const stop = onAuthStateChanged(auth, (account) => {
      profileSub.current?.();
      profileSub.current = null;
      check.current += 1;

      if (!account) {
        setActiveOrg(null);
        setUser(null);
        setLoading(false);
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
            distributorCategory: data.distributorCategory,
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

    return () => {
      stop();
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
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signOut() {
        profileSub.current?.();
        profileSub.current = null;
        check.current += 1;
        setActiveOrg(null);
        setUser(null);
        setProblem(null);
        await fbSignOut(auth);
      },
      async resetPassword(email) {
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
