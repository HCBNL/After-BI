/**
 * A small in-memory cache that makes moving between screens instant.
 *
 * THE PROBLEM IT SOLVES
 *
 * `OrgContext` already holds the product, distributor and depot lists, so
 * anything resolved from those is instant. But the heavy per-screen reads, the
 * order list, a statement, a month of sell-out, a debtors position, go
 * server-first: every time you open one of those screens the app waits for a
 * round trip to Firestore's data centre before it can paint, and from a
 * Nigerian mobile network that is most of a second, every single navigation.
 * Worse, leaving a screen and coming straight back fetched the whole thing
 * again, because nothing held on to the answer it had four seconds ago.
 *
 * This is that missing memory. It is not a replacement for Firestore's own
 * cache: that lives in IndexedDB and answers whole queries offline. This is
 * one layer up and in RAM: it holds the *result a screen computed*, keyed by
 * what the screen was looking at, so returning to a screen shows what you last
 * saw at once and refreshes it behind you.
 *
 * WHAT IT DELIBERATELY IS NOT
 *
 *   • Durable. It is per-tab and dies on reload. Firestore's persistence is the
 *     durable layer; this is the fast one. Two jobs, two layers.
 *   • Shared between people. It is cleared on sign-out (see `clearQueryCache`),
 *     because a depot office is a shared phone and one rep's order list must not
 *     flash up for the next person who signs in.
 *   • For live balances. A screen opts in by passing a `cache` key to
 *     `useAsync`, and the stock screen deliberately does not: showing a stale
 *     quantity for even a second is worse than a moment's wait, because
 *     somebody is standing in front of the pallet it describes.
 *
 * HOW STALE IS STALE
 *
 * Every cached screen still revalidates on mount: you see the last answer at
 * once and the fresh one lands a moment later. So the copy on screen is at most
 * one navigation old and is corrected within the same second. The only thing
 * this changes is *when* you wait: behind the paint instead of in front of it.
 */

import { getActiveOrg } from './tenant';

interface Entry {
  value: unknown;
  /** When it was stored, for prefetch de-duplication. */
  at: number;
}

/** Module scope: one cache per tab, shared by every `useAsync` that opts in. */
const store = new Map<string, Entry>();

/**
 * Every stored key is silently prefixed with the organisation it belongs to.
 *
 * This is the structural half of the privacy guarantee, and it matters more
 * than the sign-out clear. A depot office is a shared tab: clerk A signs out,
 * clerk B signs in, and if B belongs to a *different* organisation, a key like
 * `orders||pending||0` would otherwise hand B whatever A's order list left
 * under it: which in this product means another company's prices. Clearing on
 * sign-out closes the common path, but any path that swaps the user without a
 * clean sign-out, a dropped token, a profile-read blip, would reopen it.
 * Namespacing by the active tenant makes the leak impossible rather than merely
 * unlikely: B's reads look under B's organisation and find nothing there,
 * whatever A left behind. `getActiveOrg()` is set before the user is (see
 * `AuthContext`), so it is always the right tenant by the time a screen reads.
 *
 * The uid is deliberately not folded in as well: within one organisation the
 * data is that organisation's, the per-person summaries already carry the uid
 * in their own key, and the sign-out clear handles the
 * same-organisation-different-person case.
 */
function scoped(key: string): string {
  return `${getActiveOrg() ?? '_'}::${key}`;
}

/** In-flight loads, so ten taps on one tile fire one request, not ten. */
const inflight = new Map<string, Promise<unknown>>();

/** The freshest a prefetch trusts before it bothers to reload. */
const DEFAULT_FRESH_MS = 30_000;

export function readQuery<T>(key: string): { value: T; at: number } | undefined {
  const hit = store.get(scoped(key));
  return hit ? { value: hit.value as T, at: hit.at } : undefined;
}

export function writeQuery(key: string, value: unknown): void {
  store.set(scoped(key), { value, at: Date.now() });
}

/**
 * Forget a cached answer, or a whole family of them.
 *
 * Called after a write that changes what a list would return, raising an
 * order, recording a payment, so that navigating to that list shows the change
 * at once rather than the copy from before it. A trailing separator in the key
 * makes prefix invalidation safe: `invalidateQuery('orders|')` clears every
 * cached page and filter of the order list without touching anything else.
 */
export function invalidateQuery(keyOrPrefix: string): void {
  /* Matched against the scoped key, so `orders|` clears this organisation's
   * order pages and not another tenant's that happen to share the bare prefix. */
  const scopedPrefix = scoped(keyOrPrefix);
  for (const key of store.keys()) {
    if (key === scopedPrefix || key.startsWith(scopedPrefix)) store.delete(key);
  }
}

/**
 * Empty the whole cache. Called on sign-out and when the auth state goes null,
 * because everything in here belongs to the person who just left.
 */
export function clearQueryCache(): void {
  store.clear();
  inflight.clear();
}

/**
 * Warm a query before the screen that needs it is opened.
 *
 * The point of prefetch is to move the wait to a moment when nobody is looking
 *: while a finger is still on its way to a tile, or just after the home screen
 * has settled. If the answer is already fresh it does nothing; if a load for
 * the same key is already running it waits on that one rather than starting a
 * second; and it never throws, because a prefetch that failed is simply a
 * screen that will load the ordinary way when it is actually opened.
 */
export async function prefetchQuery<T>(
  key: string,
  loader: () => Promise<T>,
  options?: { maxAgeMs?: number },
): Promise<void> {
  /* Scoped, so a warm and its in-flight guard live in the same tenant space
   * as the read that will consume them. */
  const sk = scoped(key);
  const fresh = store.get(sk);
  if (fresh && Date.now() - fresh.at < (options?.maxAgeMs ?? DEFAULT_FRESH_MS)) return;

  const running = inflight.get(sk);
  if (running) {
    await running.catch(() => {});
    return;
  }

  const load = loader()
    .then((value) => {
      writeQuery(key, value);
      return value as unknown;
    })
    .catch(() => {
      /* A failed prefetch is a no-op. The screen loads normally when opened. */
    })
    .finally(() => inflight.delete(sk));

  inflight.set(sk, load);
  await load;
}

/**
 * The cache keys, in one place, so a screen and its prefetcher cannot drift.
 *
 * Every key ends its variable parts with `|` separators and begins with a
 * stable prefix, which is what makes `invalidateQuery('orders|')` mean "every
 * order query" and nothing else. Add a builder here rather than writing a
 * template string at the call site: the day a key needs another dimension,
 * there is one line to change and both the reader and the prefetcher move
 * together.
 */
export const qk = {
  homeSummary: (role: string, uid: string, scope: string) => `home|${role}|${uid}|${scope}`,
  orders: (status: string, scope: string, page: number) => `orders|${status}|${scope}|${page}`,
  orderDetail: (orderId: string) => `order|${orderId}`,
  stock: (warehouseId: string) => `stock|${warehouseId}`,
  movements: (warehouseId: string) => `movements|${warehouseId}`,
  sales: (scope: string, from: string, to: string) => `sales|${scope}|${from}|${to}`,
  invoices: (scope: string, status: string) => `invoices|${scope}|${status}`,
  statement: (distributorId: string) => `statement|${distributorId}`,
  credit: (distributorId: string) => `credit|${distributorId}`,
  returns: (scope: string) => `returns|${scope}`,
  leads: (ownerId: string) => `leads|${ownerId}`,
  targets: (period: string) => `targets|${period}`,
  members: () => 'members|',
  tenants: () => 'tenants|',
};
