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



export function readQuery<T>(key: string): { value: T; at: number } | undefined {
  const hit = store.get(scoped(key));
  return hit ? { value: hit.value as T, at: hit.at } : undefined;
}

export function writeQuery(key: string, value: unknown): void {
  store.set(scoped(key), { value, at: Date.now() });
}
