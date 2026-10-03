import type { OrgSettings, Role, UserProfile } from '@/types';

/** Roles an organisation can name as signatories. A super admin can always sign. */
export const APPROVER_ROLES: Role[] = ['admin', 'finance_manager', 'operations_manager', 'staff'];

/** Everyone who can sign an order: and all of the team a distributor or rep may look up. */
export const APPROVER_POOL: Role[] = ['super_admin', ...APPROVER_ROLES];

/**
 * Who signs an order over the threshold: anyone holding a role chosen in
 * Settings; if none is chosen, or nobody holds one, the super admin. One
 * signature is enough. Nobody signs their own order, and a super admin's own
 * orders go straight through.
 */
export function pickApprovers(
  members: UserProfile[] | null | undefined,
  settings: Pick<OrgSettings, 'approverRoles'> | null | undefined,
  author: Pick<UserProfile, 'id' | 'role'>,
): { uid: string; name: string }[] {
  if (author.role === 'super_admin') return [];
  const live = (members ?? []).filter((m) => m.active !== false && m.id !== author.id);
  const roles = settings?.approverRoles ?? [];
  const named = roles.length ? live.filter((m) => roles.includes(m.role)) : [];
  const chosen = named.length ? named : live.filter((m) => m.role === 'super_admin');
  return chosen.slice(0, 25).map((m) => ({ uid: m.id, name: `${m.firstName} ${m.lastName}`.trim() }));
}
