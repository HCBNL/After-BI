import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { readQuery, writeQuery } from '@/lib/queryCache';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  reload: () => void;
  /**
   * True when a result is in hand but it belongs to a previous `key`.
   *
   * Only meaningful when `key` was passed. `data` is `undefined` in this
   * state, so most screens can ignore this and treat `!data` as loading.
   */
  stale: boolean;
}

export interface AsyncOptions {
  /**
   * Handle the failure yourself instead of letting the screen fail.
   *
   * Pass this only when the component actually reads `error` and renders
   * something a person can act on. Everywhere else the default is right.
   */
  handleError?: boolean;

  /**
   * WHAT THIS DATA IS ABOUT: the fix for the worst bug class in this app.
   *
   * `loading` deliberately stays false on a refetch (see below) so a screen
   * does not blank between filter changes. The cost of that, which went
   * unnoticed for a long time, is that during the round trip `data` is the
   * PREVIOUS selection's result while every other value on the screen, the
   * class name in the heading, the child in the switcher, the subject in the
   * picker, has already moved on. So the screen shows one child's marks under
   * another child's name, and any button on it acts on the wrong record.
   *
   * That is not a display glitch. It emailed one child's report card to
   * another child's guardian, wrote one subject's score sheet under another
   * subject's heading, and saved one child's home address onto their sibling.
   * Six screens had it independently, which is the signature of a problem that
   * belongs in the hook rather than in the screens.
   *
   * Pass `key` as whatever identifies the selection: a class id, a child id,
   * `${childId}|${termId}`. The hook stamps each result with the key that was
   * live when the request went out and returns `data: undefined` until the
   * stamp matches the key it is being asked for now. Stale data is not
   * merely flagged, it is unreachable: a screen cannot render it by
   * forgetting to check, because there is nothing there to render.
   *
   * `stale` is exposed for the rare screen that would rather dim the old rows
   * than show a skeleton. Most should just treat `!data` as "loading".
 */
  key?: string;

  /**
   * A shared, in-memory cache key: the thing that makes navigation instant.
   *
   * With it, the result is kept in the module-scope cache in `queryCache.ts`
   * and, crucially, read back SYNCHRONOUSLY on the next mount: leaving a screen
   * and returning shows what you last saw with no skeleton and no wait, while a
   * fresh copy loads behind it. It also implies `key`, a cached query is
   * identity-gated for free, so a screen never has to pass both.
   *
   * Opt-in per call site, and deliberately so. The score-entry grid does not
   * pass it: a mark that has changed since must never be shown even for a
   * moment. Everywhere the data is a list or a summary that a second of age
   * cannot corrupt, this is the single biggest thing that makes the app feel
   * like software rather than a website.
   *
   * Build the key with `qk` in `queryCache.ts` so the screen and anything that
   * prefetches it cannot drift apart.
 */
  cache?: string;
}

/**
 * Runs an async loader on mount and whenever `deps` change.
 *
 * Guards against the classic race where a slow first request resolves after a
 * fast second one and overwrites newer data.
 *
 * WHY A FAILED LOAD IS THROWN
 *
 * It used to be captured into `error` and returned, and twenty of the
 * twenty-two screens that call this never looked at it. So a read that failed
 *, a lost connection, an expired sign-in, a rule refusing a document, ended
 * with `loading` false and `data` undefined, which every one of those screens
 * renders as "no students", "no results", an empty table or a skeleton that
 * never resolves. The app looked broken in a way that gave nobody anything to
 * do about it, and there was no message, so it read as "we have gone offline".
 *
 * Throwing during render hands it to the boundary in `ErrorBoundary.tsx`,
 * which says what happened and offers a way back. A screen that wants to do
 * better than that passes `{ handleError: true }` and renders `error` itself.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
  options?: AsyncOptions,
): AsyncState<T> {
  /*
   * The result and the key it was fetched for, stored together.
   *
   * Two `useState`s would be two renders and a window where they disagree,
   * which is the exact fault this exists to close.
   */
  const cache = options?.cache;
  /* A cache key IS an identity key; a caller never needs to pass both. */
  const key = cache ?? options?.key;

  /*
   * Seeded from the cache on the very first render, not in an effect.
   *
   * This is the whole point: if a value for this key is already in the cache,
   * the first paint has it, no skeleton, no flash, and the effect below just
   * refreshes it. `loading` starts false in that case for the same reason.
 */
  const [entry, setEntry] = useState<{ key: string; value: T } | undefined>(() => {
    if (!cache) return undefined;
    const hit = readQuery<T>(cache);
    return hit ? { key: cache, value: hit.value } : undefined;
  });
  const [loading, setLoading] = useState(() => !(cache && readQuery(cache)));
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const handleError = options?.handleError ?? false;

  const requestId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  /* The key live at the moment the request goes out, not when it returns. */
  const keyRef = useRef(key);
  keyRef.current = key;

  /* Whether anything has ever arrived. A refetch must not blank the screen. */
  const settled = useRef(false);

  useEffect(() => {
    const id = ++requestId.current;
    const sent = keyRef.current ?? '';
    let cancelled = false;

    /*
     * `loading` goes back to true only when there is nothing to show.
     *
     * It used to be set unconditionally, so any refetch, a filter change, a
     * save, a dependency that changed identity, replaced a screen full of
     * data with a loader for as long as the network took. That is most of what
     * "the preloader is constantly loading" was: not slow data, but a screen
     * throwing away data it already had. The old rows stay up and are replaced
     * when the new ones land.
 */
    if (!settled.current) setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (cancelled || id !== requestId.current) return;
        settled.current = true;
        setEntry({ key: sent, value: result });
        /* Keep the shared cache current so the NEXT visit is instant too. */
        if (cache) writeQuery(cache, result);
      })
      .catch((err: unknown) => {
        if (cancelled || id !== requestId.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (cancelled || id !== requestId.current) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    /*
     * `key` is in here as well as in `deps`, deliberately.
     *
     * Without it a caller whose key is derived from something they forgot to
     * list in `deps` would change the key, never refetch, and therefore never
     * match again: the screen would show a skeleton for ever. Including it
     * means the key and the request cannot drift apart: any change to what the
     * data is *about* refetches it by construction. Callers still pass the
     * same values in `deps`; this is the belt to that pair of braces.
 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  /*
   * What to actually show, in order of preference:
   *
   *   1. The result we just fetched, if it is for the key we are looking at.
   *   2. Otherwise, whatever the shared cache holds for this key: which is how
   *      switching to an already-seen child, or coming back to a screen, is
   *      instant even though `entry` still holds the previous key's value.
   *   3. Otherwise nothing, and the screen shows its skeleton.
   *
   * Reading the cache here, in render, is a plain synchronous Map lookup; there
   * is no SSR in this app, so there is nothing for it to disagree with.
 */
  const matched = entry !== undefined && (key === undefined || entry.key === (key ?? ''));
  const cached = !matched && cache ? readQuery<T>(cache) : undefined;
  const data = matched ? entry?.value : cached?.value;

  /*
   * Throw only when there is a failure AND nothing to show.
   *
   * A background refresh that fails must not tear down a screen that already
   * has good data on it: cached or previous. It keeps what it has and hands
   * the error back for a screen that wants to mention it. Only a cold failure,
   * with no data at all, goes to the boundary the way it always did.
 */
  if (error && !handleError && data === undefined) throw error;

  return {
    data,
    loading,
    error,
    reload,
    stale: entry !== undefined && !matched && cached === undefined,
  };
}

export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useMediaQuery(queryString: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(queryString).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(queryString);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [queryString]);

  return matches;
}

/** Locks body scroll while `active` is true: used by the mobile nav. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
