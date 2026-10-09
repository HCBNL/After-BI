/**
 * "This child's family is already at the school."
 *
 * THE PROBLEM THIS SOLVES
 *
 * A second child from the same household must land on the household's existing
 * sign-in rather than starting a new one. That already worked:
 * `ensureFamilyAccount` matches the guardian's email and joins the child to the
 * account the first child made, rather than failing with "that address is
 * already in use".
 *
 * It worked only if the office typed the same address again. Nothing helped
 * them find it. So admitting Chidi Okafor meant remembering which of two
 * plausible addresses Ngozi Okafor was under, and a near-miss — `ngozi.o@` for
 * `ngoziokafor@` — silently produced a second household, a second password to
 * hand out, and a mother who sees one of her two children when she signs in.
 *
 * WHY IT SEARCHES IN THE BROWSER
 *
 * Firestore cannot do "contains" on a string, so a server-side search would
 * need either a prefix index per field or a search service, for a list that is
 * one modest fetch. The families are loaded once when the form opens and
 * filtered here on every keystroke, which is instant and costs one read of a
 * list the school already has.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not link anything. Choosing a family fills the guardian fields and
 * locks them; the linking is still `ensureFamilyAccount` on submit, working off
 * the email exactly as it does for a family typed by hand. One path, so a
 * sibling admitted through the picker and one admitted by memory end up in
 * precisely the same state.
 */

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui';
import { useFamilySearch } from './useFamilySearch';
import { childrenOf } from '@/lib/roles';
import { cn } from '@/lib/cn';
import type { UserProfile } from '@/types';

/** How many matches are offered at once. More is a list nobody reads. */
const SHOWN = 6;

export interface ChosenFamily {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  children: number;
}

export function familyOf(parent: UserProfile): ChosenFamily {
  const title = parent.title?.trim();
  return {
    id: parent.id,
    name: [title, parent.firstName, parent.lastName].filter(Boolean).join(' ').trim(),
    email: parent.email ?? '',
    phone: parent.phone ?? '',
    address: parent.address ?? '',
    children: childrenOf(parent).length,
  };
}

export function FamilyPicker({
  chosen,
  onChoose,
}: {
  chosen: ChosenFamily | null;
  onChoose: (family: ChosenFamily | null) => void;
}) {
  const [term, setTerm] = useState('');
  /*
   * A server-side search per keystroke, a handful of documents each time —
   * this used to read every family account in the school when the admission
   * form opened, which at 20,000 pupils is fifteen thousand reads to admit one
   * child. See `useFamilySearch`.
   */
  const { results: found, loading } = useFamilySearch(term, SHOWN);

  if (chosen) {
    return (
      <div className="rounded-xl border border-brand-600/35 bg-brand-50/60 p-3 dark:border-brand-500/30 dark:bg-brand-500/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-bold text-primary">{chosen.name}</p>
            <p className="truncate text-[12.5px] text-secondary">
              {chosen.email}
              {chosen.phone ? ` · ${chosen.phone}` : ''}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              {chosen.children === 0
                ? 'No children on this account yet.'
                : `Already has ${chosen.children} ${chosen.children === 1 ? 'child' : 'children'} here. This one joins them.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChoose(null);
              setTerm('');
            }}
            className="tap -mr-1 -mt-1 flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[12.5px] font-semibold text-secondary transition-colors hover:text-primary"
          >
            <X size={14} aria-hidden />
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search by parent name, phone or email"
        leading={<Search size={16} aria-hidden />}
        /*
         * Not `name`, so it is never submitted. This box exists to find a
         * family; the fields below are what the form actually sends.
         */
        aria-label="Find a family already at the school"
      />

      {term.trim().length >= 2 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-hairline">
          {loading ? (
            <p className="px-3 py-2.5 text-[12.5px] text-muted">Fetching the families…</p>
          ) : found.length === 0 ? (
            <p className="px-3 py-2.5 text-[12.5px] text-muted">
              No family matches that. Fill the details below and a new sign-in is made.
            </p>
          ) : (
            found.map((parent, index) => {
              const family = familyOf(parent);
              return (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => {
                    onChoose(family);
                    setTerm('');
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-sunken)]',
                    index > 0 && 'border-t border-hairline',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-primary">{family.name}</span>
                    <span className="block truncate text-[12.5px] text-secondary">
                      {family.email}
                      {family.phone ? ` · ${family.phone}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-muted">
                    {family.children === 1 ? '1 child' : `${family.children} children`}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
