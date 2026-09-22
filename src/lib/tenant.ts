/**
 * Which organisation this session is looking at.
 *
 * AfterBI is one deployment serving many distribution businesses, and the whole
 * safety of that rests on one decision made here: **every organisation's data
 * lives in its own subtree**, at `orgs/{orgId}/…`, rather than in shared root
 * collections with an `orgId` field on each document.
 *
 * The version of AfterBI this replaces did the second thing: `orders`,
 * `products`, `inventory`, `invoices` and eighteen more sat at the root of one
 * database with no tenant field at all, because there was only ever one
 * customer. Adding a second customer to that shape means adding
 * `where('orgId','==',…)` to every one of the ~140 queries in the app and never
 * once forgetting. Three reasons that is the wrong trade, in order of what it
 * would cost:
 *
 *   1. **A forgotten `where` is a data breach.** One query written without the
 *      filter returns every order, price and credit limit belonging to every
 *      customer on the platform: including, in this product, what each of
 *      their competitors pays per carton. "We always remember" is not a
 *      security model. Under a subtree, a path without an org id is not a valid
 *      path: the mistake cannot compile into a leak.
 *   2. **The rules become one rule.** `match /orgs/{id}/{doc=**}` with a single
 *      membership check covers every collection, present and future. The
 *      shared-collection version needs the tenant check repeated in every rule,
 *      and a collection added later without it is silently world-readable to
 *      every other tenant. AfterBI's old `firestore.rules` is 27kB of exactly
 *      that repetition.
 *   3. **Indexes stay sane.** Every composite index would need `orgId` as its
 *      first field: and this app already has a 6.5kB index file. Firestore's
 *      200-index limit is real and a per-tenant prefix on all of them reaches
 *      it.
 *
 * The one exception is `users/{uid}`, which stays a root collection. It has to:
 * signing in gives us a uid and nothing else, and the profile at that uid is
 * what *tells* us the org. A per-org user collection would need the org id to
 * find the document that contains the org id.
 */

const NOT_SET =
  'No organisation is selected. The signed-in account has no organisation on its profile, which an administrator needs to fix.';

let activeOrgId: string | null = null;

type OrgListener = (orgId: string | null) => void;
const listeners = new Set<OrgListener>();

/**
 * Be told when the session changes organisation.
 *
 * `BrandProvider` sits above `AuthProvider`, it has to, because the sign-in
 * screen needs an organisation's name and logo before anybody has signed in,
 * so it cannot read the tenant from a React context that does not exist yet.
 * Without this subscription it would fire one `getOrgSettings()` at boot, when
 * `requireOrg()` still throws, catch the error, and never try again: every
 * customer would see the bundled default name and mark for the whole visit.
 *
 * Returns an unsubscribe function, so an effect can hand it straight back.
 */
export function onActiveOrgChange(listener: OrgListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Set from the signed-in user's profile, or from the org named in a public
 * link. Cleared on sign-out.
 */
export function setActiveOrg(orgId: string | null): void {
  const next = orgId && orgId.trim() ? orgId.trim() : null;
  if (next === activeOrgId) return;
  activeOrgId = next;
  for (const listener of listeners) listener(next);
}

export function getActiveOrg(): string | null {
  return activeOrgId;
}

/**
 * The org id, or a readable error.
 *
 * Throwing is deliberate and it is the point of this function. A read that
 * silently fell back to a default organisation, or to the root, is exactly the
 * bug this whole file exists to make impossible: better a screen that says
 * something is wrong than a screen showing another company's margins.
 */
export function requireOrg(): string {
  if (!activeOrgId) throw new Error(NOT_SET);
  return activeOrgId;
}

/**
 * `orgs/{id}` itself: the tenant record.
 *
 * Deliberately thin. What an organisation *is*, its name, logo, invoice
 * footer, approval threshold, lives in `orgs/{id}/settings/org` with
 * everything else it owns; this document carries only what the platform needs
 * to know about the tenant before anybody signs in: whether it exists, and
 * whether it is still paying.
 */
export const TENANTS = 'orgs';

export type SubscriptionStatus = 'trial' | 'active' | 'past-due' | 'suspended';

export interface OrgTenant {
  id: string;
  /** For the sign-in screen, before any org data has loaded. */
  name: string;
  /** Lowercase, url-safe. `afterbi.app/o/{slug}`. */
  slug: string;
  status: SubscriptionStatus;
  createdAt: string;
  /** ISO date the current period ends. Read server-side, never enforced here. */
  renewsAt?: string;

  /**
   * What this organisation pays, per period, in naira.
   *
   * Typed by the platform owner rather than derived from a price list, because
   * a distribution contract is negotiated: a three-depot regional distributor
   * and a national FMCG principal on the same platform do not pay the same, and
   * neither pays a published rate. Summed across active tenants it is the only
   * honest revenue figure the platform dashboard can show: every naira in it
   * was entered by the person it is owed to.
 */
  subscriptionFee?: number;

  /** Seats in use at last count: what the subscription is priced on. */
  seats?: number;
  /** Which plan, from `platform/pricing`. `feeFor()` resolves plan vs. fee. */
  planId?: string;

  /** Free text the platform keeps about this customer. Never shown inside it. */
  note?: string;
}

/* paths */

/**
 * Every collection an organisation owns, as one list.
 *
 * Nothing in the app types a collection name as a bare string. A screen asks
 * for `orgPath('orders')` and gets `orgs/{id}/orders`, which means the org id
 * cannot be left off by a caller that forgot, and a typo is a compile error
 * rather than a silent read of an empty collection: which is what a
 * misspelled root collection name looks like in Firestore. It returns nothing,
 * with no error at all.
 */
export const COLLECTIONS = {
  products: 'products',
  distributors: 'distributors',
  orders: 'orders',
  warehouses: 'warehouses',
  stock: 'stock',
  movements: 'stockMovements',
  sales: 'sales',
  leads: 'leads',
  invoices: 'invoices',
  payments: 'payments',
  returns: 'returns',
  targets: 'targets',
  counters: 'counters',
  settings: 'settings',
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

/** `orgs/{activeOrg}/orders`: the only way a path is built in this app. */
export function orgPath(key: CollectionKey): string {
  return `${TENANTS}/${requireOrg()}/${COLLECTIONS[key]}`;
}

/** `orgs/{activeOrg}/orders/{id}`. */
export function orgDocPath(key: CollectionKey, id: string): string {
  return `${orgPath(key)}/${id}`;
}
