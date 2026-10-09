/**
 * Plans, the seal each one shows, and the features the platform owner can
 * lock per organisation.
 *
 * HOW IT FITS TOGETHER
 *
 *   The tenant record (`orgs/{id}`, written only by the platform owner) carries
 *   `planId` and `locked`. `planId` decides the seal every member sees beside
 *   the organisation's name. `locked` is the list of features that organisation
 *   cannot open: they disappear from the rail, the menu, the tiles and All
 *   actions, and typing the address shows a "not on your plan" screen instead.
 *
 *   Choosing a plan in Platform (Organisations) fills `locked` with that plan's
 *   defaults; the owner can then tick or untick any feature for that one
 *   organisation. What is saved is the final list, so changing the defaults
 *   here never silently changes what an existing customer can see.
 *
 * HR is also refused by the security rules when locked (see `featureOn` in
 * firestore.rules). The other features are hidden and blocked in the app.
 */

import { useSyncExternalStore } from 'react';

/* plans */

export const PLAN_IDS = ['starter', 'growth', 'premium', 'enterprise'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanInfo {
  id: PlanId;
  label: string;
  /** The seal's fill. */
  fill: string;
  /** A hairline round the seal so it holds on a ground of its own colour. */
  ring: string;
  /** Features locked when this plan is chosen. The owner can change them per organisation. */
  defaultLocked: FeatureKey[];
}

export const PLANS: Record<PlanId, PlanInfo> = {
  starter: { id: 'starter', label: 'Starter', fill: '#3f4854', ring: 'rgba(255,255,255,0.22)', defaultLocked: ['credit', 'analytics', 'scorecards'] },
  growth: { id: 'growth', label: 'Growth', fill: '#ee6a00', ring: 'rgba(255,255,255,0.28)', defaultLocked: [] },
  premium: { id: 'premium', label: 'Premium', fill: '#1d7ef0', ring: 'rgba(255,255,255,0.32)', defaultLocked: [] },
  enterprise: { id: 'enterprise', label: 'Enterprise', fill: '#b8860b', ring: 'rgba(255,255,255,0.35)', defaultLocked: [] },
};

export function planOf(value: unknown): PlanId | undefined {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value) ? (value as PlanId) : undefined;
}

/* lockable features */

export interface Feature {
  key: string;
  label: string;
  description: string;
  /** The action ids in `tiles.ts` this feature covers. */
  actions: string[];
}

export const FEATURES = [
  { key: 'hr', label: 'HR and payroll', description: 'Salaries, clock in, holidays, bonuses and running costs.', actions: ['hr', 'hr-manage'] },
  { key: 'cards', label: 'ID and business cards', description: 'Staff ID cards and digital business cards.', actions: ['org-id-card', 'org-card'] },
  { key: 'leads', label: 'Leads', description: 'The sales pipeline.', actions: ['leads'] },
  { key: 'targets', label: 'Targets', description: 'Monthly targets for reps, accounts and products.', actions: ['targets'] },
  { key: 'scorecards', label: 'Scorecards', description: 'Everyone against target, ranked.', actions: ['scorecards'] },
  { key: 'analytics', label: 'Analytics', description: 'Sell out by month and the territory map.', actions: ['analytics'] },
  { key: 'sellout', label: 'Sell out', description: 'What left the shelves, by outlet and day.', actions: ['sell-out'] },
  { key: 'deliveries', label: 'Deliveries', description: 'Confirming what arrived.', actions: ['deliveries'] },
  { key: 'stock', label: 'Stock and depots', description: 'Stock levels, movements and depots.', actions: ['stock', 'movements', 'warehouses'] },
  { key: 'returns', label: 'Returns', description: 'Goods coming back and the credit they raise.', actions: ['returns'] },
  { key: 'invoices', label: 'Invoices and statements', description: 'Billing and account statements.', actions: ['invoices', 'statement'] },
  { key: 'credit', label: 'Credit limits', description: 'Credit management per distributor.', actions: ['credit'] },
  { key: 'reports', label: 'Reports', description: 'Spreadsheet exports.', actions: ['reports'] },
  { key: 'tasks', label: 'My tasks', description: 'Personal to do lists.', actions: ['tasks'] },
  { key: 'reminders', label: 'Reminders', description: 'Overdue and waiting items.', actions: ['reminders'] },
] as const satisfies readonly Feature[];

export type FeatureKey = (typeof FEATURES)[number]['key'];

const FEATURE_KEYS = new Set<string>(FEATURES.map((f) => f.key));

export function cleanLocked(value: unknown): FeatureKey[] {
  return Array.isArray(value) ? (value.filter((v) => typeof v === 'string' && FEATURE_KEYS.has(v)) as FeatureKey[]) : [];
}

/* the signed-in organisation's entitlements */

interface Entitlements {
  plan: PlanId | undefined;
  locked: ReadonlySet<FeatureKey>;
  lockedActions: ReadonlySet<string>;
}

const EMPTY: Entitlements = { plan: undefined, locked: new Set(), lockedActions: new Set() };

let current: Entitlements = EMPTY;
const listeners = new Set<() => void>();

/** Set from the tenant record when an organisation loads; cleared (null) otherwise. */
export function setEntitlements(tenant: { planId?: unknown; locked?: unknown } | null): void {
  if (!tenant) {
    current = EMPTY;
  } else {
    const locked = new Set(cleanLocked(tenant.locked));
    const lockedActions = new Set<string>();
    for (const f of FEATURES) if (locked.has(f.key)) for (const a of f.actions) lockedActions.add(a);
    current = { plan: planOf(tenant.planId), locked, lockedActions };
  }
  for (const l of listeners) l();
}

export function getEntitlements(): Entitlements {
  return current;
}

export function isActionLocked(actionId: string): boolean {
  return current.lockedActions.has(actionId);
}

export function isFeatureLocked(key: FeatureKey): boolean {
  return current.locked.has(key);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders when the organisation's plan or locks change. */
export function useEntitlements(): Entitlements {
  return useSyncExternalStore(subscribe, getEntitlements, getEntitlements);
}
