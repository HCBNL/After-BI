import type { ReactNode } from 'react';
import { PORTAL_ROOT } from '@/lib/tiles';
import { setActiveOrg } from '@/lib/tenant';
import type { Role, UserProfile } from '@/types';

/*
 * The real AuthContext calls this as the profile lands. Nothing else does, and
 * without it `OrgContext` short-circuits on `!getActiveOrg()` — so products,
 * distributors and depots stay empty and every screen renders its empty state.
 */
setActiveOrg('bella');

const ROLE = (new URLSearchParams(location.search).get('role') ?? 'admin') as Role;

const USER: UserProfile = {
  id: 'u1',
  email: 'oluwaseun@bellagroup.ng',
  firstName: 'Oluwaseun',
  lastName: 'Adeyemi',
  title: 'Mr',
  role: ROLE,
  orgId: 'bella',
  distributorId: ROLE === 'distributor' || ROLE === 'sales_rep' ? 'd1' : undefined,
  distributorCategory: ROLE === 'distributor' || ROLE === 'sales_rep' ? 'MT' : undefined,
  active: true,
  createdAt: '2025-03-04T00:00:00.000Z',
};

export const HOME_FOR_ROLE: Record<Role, string> = PORTAL_ROOT;
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function useAuth() {
  return {
    user: USER,
    loading: false,
    suspended: false,
    signIn: async () => {},
    signOut: async () => {},
    resetPassword: async () => {},
  };
}
