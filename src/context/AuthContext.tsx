/**
 * Who is signed in, which organisation they belong to, and nothing else.
 *
 * THE ONE PLACE A ROLE IS CLEANED
 *
 * A role string out of Firestore is untrusted until it has been through
 * `normaliseRole` — see `lib/roles.ts` for the three legacy spellings still
 * sitting in live documents. That happens here, once, as the profile is read,
 * and everything downstream gets the clean value. No other file in the app may
 * read `.role` off a raw snapshot.
 *
 * THE ONE PLACE THE TENANT IS SET
 *
 * `setActiveOrg` is called from here and from the public org loader, and from
 * nowhere else. Every path in `db.ts` is built from it, so this line is what
 * decides whose data the whole session can see — which is why sign-out clears
 * it before anything else, and why a suspended account never gets it set at
 * all.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { normaliseRole } from '@/lib/roles';
import { setActiveOrg } from '@/lib/tenant';
import { PORTAL_ROOT } from '@/lib/tiles';
import type { Role, UserProfile } from '@/types';

interface AuthValue {
  user: UserProfile | null;
  loading: boolean;
  /** Set when the account exists but has been switched off. */
  suspended: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Where each role lands after signing in. Read by the router and by LoginPage. */
export const HOME_FOR_ROLE: Record<Role, string> = PORTAL_ROOT;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);

  /*
   * A ref, not state.
   *
   * The cleanup closure must see the CURRENT unsubscribe function. With state
   * it captures whatever was there when the effect ran — `null` — and the old
   * profile listener is never torn down. Sign in as A, sign out, sign in as B,
   * and A's listener is still open and still writing A's profile into this
   * state. That is not a theoretical leak; it is a session that shows the
   * previous user.
   */
  const profileSub = useRef<null | (() => void)>(null);

  useEffect(() => {
    const stop = onAuthStateChanged(auth, (account) => {
      profileSub.current?.();
      profileSub.current = null;

      if (!account) {
        setActiveOrg(null);
        setUser(null);
        setSuspended(false);
        setLoading(false);
        return;
      }

      /*
       * A live subscription rather than a one-off read.
       *
       * A role change, a suspension or a change of organisation has to reach an
       * open session immediately — an administrator who suspends a departing
       * rep at 4pm expects them out of the app at 4pm, not whenever they next
       * reload. The listener costs one connection and is the difference.
       */
      profileSub.current = onSnapshot(
        doc(db, 'users', account.uid),
        (snap) => {
          if (!snap.exists()) {
            /* Authenticated, but no profile. An account half-created in the
               Firebase console. Not an error state to crash on — a state to
               show a readable message for. */
            setActiveOrg(null);
            setUser(null);
            setSuspended(false);
            setLoading(false);
            return;
          }

          const data = snap.data();

          if (data.active === false) {
            setActiveOrg(null);
            setUser(null);
            setSuspended(true);
            setLoading(false);
            /* End the session rather than waiting for the token to expire. */
            void fbSignOut(auth);
            return;
          }

          const role = normaliseRole(data.role);
          /* An owner belongs to the platform, not to a tenant. Setting an org
             for them would scope the platform console into one customer. */
          setActiveOrg(role === 'owner' ? null : (data.orgId as string) ?? null);

          setUser({
            id: account.uid,
            email: account.email ?? (data.email as string) ?? '',
            firstName: (data.firstName as string) ?? '',
            lastName: (data.lastName as string) ?? '',
            title: data.title as string | undefined,
            role,
            phone: data.phone as string | undefined,
            photoURL: (data.photoURL as string) ?? undefined,
            orgId: data.orgId as string | undefined,
            distributorId: data.distributorId as string | undefined,
            distributorCategory: data.distributorCategory,
            territories: data.territories as string[] | undefined,
            warehouseIds: data.warehouseIds as string[] | undefined,
            active: data.active !== false,
            createdAt: data.createdAt as string | undefined,
          });
          setSuspended(false);
          setLoading(false);
        },
        () => {
          /* A rules failure here means the profile is unreadable, which is the
             same practical state as having none. Do not retry in a loop. */
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
      suspended,
      async signIn(email, password) {
        setSuspended(false);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signOut() {
        profileSub.current?.();
        profileSub.current = null;
        setActiveOrg(null);
        setUser(null);
        await fbSignOut(auth);
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email.trim());
      },
    }),
    [user, loading, suspended],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
