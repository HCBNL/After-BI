/**
 * Finding a family, the same way on every screen that needs to.
 *
 * Once the school's family search is prepared (see `familySearchReady` in
 * `db.ts`), every keystroke is a small server-side query — a dozen documents
 * at most, whatever the size of the school. Until then it falls back to the
 * old behaviour, one read of every family account filtered in the browser, so
 * a school that has not pressed "Prepare" yet loses nothing.
 */

import { useMemo } from 'react';
import { useAsync, useDebounced } from '@/hooks/useAsync';
import { familySearchReady, listFamilyAccounts, searchFamilies } from '@/lib/db';
import type { UserProfile } from '@/types';

/** The old in-browser match, for the fallback only. */
export function matchesFamily(parent: UserProfile, needle: string): boolean {
  const hay = [parent.firstName, parent.lastName, parent.email, parent.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (hay.includes(needle)) return true;
  // Digits only, and only when there are enough of them to be part of a number.
  const digits = needle.replace(/\D/g, '');
  return digits.length >= 3 && hay.replace(/\D/g, '').includes(digits);
}

export const FAMILY_READY_KEY = 'family-search-ready|';

export function useFamilySearch(term: string, max = 12) {
  const ready = useAsync(familySearchReady, [], { cache: FAMILY_READY_KEY, handleError: true });
  const needle = useDebounced(term.trim(), 250);
  const prepared = ready.data === true;
  const fallback = ready.data === false;

  const server = useAsync(
    async () => (prepared && needle.length >= 2 ? searchFamilies(needle, max) : null),
    [prepared, needle, max],
    { key: `${prepared}|${needle}`, handleError: true, label: 'The family search' },
  );

  const everyone = useAsync(async () => (fallback ? listFamilyAccounts() : null), [fallback], {
    key: String(fallback),
    handleError: true,
    label: 'The families',
  });

  const results = useMemo(() => {
    if (needle.length < 2) return [];
    if (prepared) return server.data ?? [];
    const q = needle.toLowerCase();
    return (everyone.data ?? []).filter((p) => matchesFamily(p, q)).slice(0, max);
  }, [needle, prepared, server.data, everyone.data, max]);

  const loading = ready.data === undefined || (prepared ? needle.length >= 2 && !server.data : fallback && !everyone.data);

  return {
    /** undefined while asking; then whether the server search is in use. */
    prepared: ready.data,
    reloadReady: ready.reload,
    results,
    loading,
    error: server.error ?? everyone.error ?? null,
    /** Only filled in the fallback: every family, for a screen that lists them all. */
    everyone: everyone.data ?? null,
  };
}
