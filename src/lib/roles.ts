/**
 * One place that knows a role used to be spelled differently, and one place
 * that answers "may this person do that".
 *
 * WHY THE TRANSLATION TABLE EXISTS
 *
 * `superadmin` became `super_admin`, and three of the eight roles were being
 * written into `users/{uid}` under short names, `finance`, `ops`, `rep`, by
 * an account-creation screen that offered them under one label and saved them
 * under another. TypeScript is happy about that, because TypeScript only sees
 * the code. Firestore is not TypeScript: those documents exist and will until
 * somebody runs the conversion.
 *
 * If nothing translated, the moment this deploys every one of those people
 * signs in to a role the router has no route for, the action catalogue has no
 * rows for, and `ROLE_LABEL[role]` renders as `undefined`. Which is to say: the
 * app would appear to have deleted its own finance team.
 *
 * So the rule is: **a role string coming out of the database is untrusted until
 * it has been through `normaliseRole`.** There is exactly one place that
 * happens, `AuthContext`, as the profile is read, and everything downstream
 * gets the clean value.
 *
 * DELETING THE TRANSLATION HALF
 *
 * When the last tenant has run the conversion, `normaliseRole` can be reduced
 * to a cast and `LEGACY_ROLES` deleted. The compiler will then walk you through
 * every remaining caller. Nothing else in the app hard-codes the old strings,
 * which is the whole reason they are gathered in `types/index.ts`.
 */

import { LEGACY_ROLES, ROLES, type Role, type UserProfile } from '@/types';

const KNOWN = new Set<string>(ROLES);

/**
 * A role string from anywhere, a Firestore document, a URL, an old invite,
 * turned into one this build understands.
 *
 * Unknown strings become `distributor`, not `null`. A profile with a mangled
 * role is a bug, and the safe failure is the account that can see the least: a
 * distributor sees their own orders and nothing else, and the security rules
 * will refuse them anything more regardless of what the client believes.
 * Failing to `admin` because a field was mistyped is how a data error becomes a
 * breach: and in this product an admin sees every competitor's pricing.
 */
export function normaliseRole(raw: unknown): Role {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (KNOWN.has(value)) return value as Role;
  const legacy = LEGACY_ROLES[value];
  if (legacy) return legacy;
  return 'distributor';
}

/** True for a stored role string that the conversion still has to rewrite. */
export function isLegacyRole(raw: unknown): boolean {
  return typeof raw === 'string' && raw.trim().toLowerCase() in LEGACY_ROLES;
}

/* role families */

/**
 * The groupings the app actually reasons in.
 *
 * These are not a second permission system: the security rules are the
 * permission system. They are the shorthand a screen uses to decide whether to
 * draw a button, so that a person is not shown a control that will fail. Every
 * one of them is mirrored by a rule, and the rule is the one that counts.
 */

/** Runs the platform. Belongs to no tenant; sees tenants, not orders. */
export function isOwner(role: Role): boolean {
  return role === 'owner';
}

/** Can change the shape of the organisation: users, products, settings. */
export function isAdmin(role: Role): boolean {
  return role === 'super_admin' || role === 'admin';
}

/** Works inside the organisation, as opposed to being a trading partner. */
export function isInternal(role: Role): boolean {
  return (
    role === 'super_admin' ||
    role === 'admin' ||
    role === 'staff' ||
    role === 'warehouse_manager' ||
    role === 'finance_manager' ||
    role === 'operations_manager'
  );
}

/** Sells: keys orders, works leads, carries a target. */
export function isSelling(role: Role): boolean {
  return role === 'sales_rep' || role === 'staff' || isAdmin(role);
}

/** Moves stock. */
export function isOperations(role: Role): boolean {
  return role === 'warehouse_manager' || role === 'operations_manager' || isAdmin(role);
}

/** Touches money: invoices, credit limits, payments. */
export function isFinance(role: Role): boolean {
  return role === 'finance_manager' || isAdmin(role);
}

/** A trading partner rather than an employee. Sees only their own account. */
export function isPartner(role: Role): boolean {
  return role === 'distributor';
}

/* scoping */

const SCOPES = new Map<string, string[]>();

/**
 * The distributor accounts a partner works on. `null` means every account
 * (office roles). A distributor login has its own account; a sales rep has
 * every account assigned to them: so one account can have several reps
 * (branches, split books) and one rep can cover several accounts.
 * The same list always comes back as the same array, so it is safe to use
 * in a hook's dependencies.
 */
export function partnerScope(
  user: (Pick<UserProfile, 'role'> & Partial<Pick<UserProfile, 'distributorId' | 'distributorIds'>>) | null,
): string[] | null {
  if (!user) return null;
  const role = normaliseRole(user.role);
  if (role !== 'distributor' && role !== 'sales_rep') return null;
  const own = user.distributorId ? [user.distributorId] : [];
  const ids = role === 'distributor' ? own : [...(user.distributorIds ?? []), ...own];
  const unique = [...new Set(ids.filter(Boolean))].sort();
  const key = unique.join('|');
  let hit = SCOPES.get(key);
  if (!hit) {
    hit = unique;
    SCOPES.set(key, hit);
  }
  return hit;
}

/**
 * The warehouses this account may move stock in, or `null` for all.
 *
 * Same contract as `partnerScope`. A warehouse manager with an empty array has
 * been created but not yet assigned a depot, and that is not the same as being
 * allowed everywhere: so an empty array stays an empty array, and the screen
 * says "the office has not put you on a depot yet" rather than showing them
 * every depot in the company.
 */
export function warehouseScope(
  user: Pick<UserProfile, 'role' | 'warehouseIds'> | null,
): string[] | null {
  if (!user) return null;
  const role = normaliseRole(user.role);
  if (role === 'warehouse_manager') return user.warehouseIds ?? [];
  return null;
}

/** Display name, with the title a Nigerian business letter would carry. */
export function fullName(
  user: Pick<UserProfile, 'firstName' | 'lastName' | 'title'> | null | undefined,
): string {
  if (!user) return '';
  return `${user.title ? `${user.title} ` : ''}${user.firstName} ${user.lastName}`.trim();
}
