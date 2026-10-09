/**
 * Picking a term, at a school that has been running for six years.
 *
 * THE PROBLEM THIS EXISTS TO STOP RECURRING
 *
 * Every screen that chose a term did it with a row of buttons — a segmented
 * control, or a grid of tiles. That is a perfectly good control for three
 * items and an unusable one for eighteen, and eighteen is simply what three
 * terms a year looks like after six years. The failure arrives quietly: it
 * works in year one, it is cramped in year two, and by year four the school is
 * swiping sideways through a strip of near-identical labels to find "Second
 * Term 2027/2028" between two others that differ by one word.
 *
 * The rule this encodes is the one worth keeping: ANY LIST THAT GROWS WITH
 * TIME IS A DROPDOWN, NOT A SLIDER. A class list grows with the school and is
 * bounded at about fourteen. A term list grows forever.
 *
 * TWO STEPS, BECAUSE THAT IS HOW A SCHOOL SAYS IT
 *
 * Nobody says "second term two thousand and twenty-seven slash twenty-eight".
 * They say the year, then the term. So the session is one dropdown and the
 * term is a second, and the second never holds more than three options no
 * matter how old the school is. One line on a phone, for ever.
 *
 * NATIVE `<select>`, for the reason given in `ClassSubjectBar.tsx`: on a phone
 * it opens the operating system's own picker, which is bigger, faster to
 * thumb, and already familiar — and it is keyboard- and screen-reader-correct
 * without anybody having to remember to make it so.
 */

import { useMemo } from 'react';
import { Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Term } from '@/types';

export interface TermPickerProps {
  /** The terms this person may choose between. Any order; sorted here. */
  terms: Term[];
  value: string;
  onChange: (termId: string) => void;
  /** Printed above the pair. Pass `null` to drop the labels. */
  label?: string | null;
  className?: string;
  /** Marks closed terms in the list, for screens where that matters. */
  markClosed?: boolean;
}

interface Session {
  id: string;
  name: string;
  /** Earliest start date in the session — what it sorts on. */
  start: string;
  terms: Term[];
}

/** Terms grouped into sessions, newest session first, terms in school order. */
export function groupBySession(terms: Term[]): Session[] {
  const map = new Map<string, Session>();

  for (const term of terms) {
    const id = term.sessionId || term.sessionName || 'unknown';
    const entry =
      map.get(id) ??
      ({ id, name: term.sessionName || 'Session', start: term.startDate || '', terms: [] } as Session);
    entry.terms.push(term);
    if (term.startDate && (!entry.start || term.startDate < entry.start)) entry.start = term.startDate;
    map.set(id, entry);
  }

  const sessions = [...map.values()];
  for (const session of sessions) {
    session.terms.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }
  /* Newest first: the term somebody wants is almost always a recent one, and
     a picker that opens on 2019/2020 makes them scroll every single time. */
  return sessions.sort((a, b) => (b.start || '').localeCompare(a.start || ''));
}

const FIELD_LABEL = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted';

export function TermPicker({
  terms,
  value,
  onChange,
  label = 'Term',
  className,
  markClosed = false,
}: TermPickerProps) {
  const sessions = useMemo(() => groupBySession(terms), [terms]);

  const selected = useMemo(() => terms.find((t) => t.id === value) ?? null, [terms, value]);

  /*
   * Which session's terms to offer.
   *
   * Driven by the chosen term rather than held in its own state, so the two
   * dropdowns cannot disagree — a screen that restores a saved term id renders
   * correctly with no effect to sync them, and there is no frame where the
   * year says one thing and the term says another.
   */
  const sessionId = selected?.sessionId || sessions[0]?.id || '';
  const session = sessions.find((s) => s.id === sessionId) ?? sessions[0] ?? null;

  /* One session and one term is not a choice; drawing it is pure furniture. */
  if (terms.length <= 1) {
    if (!selected) return null;
    return (
      <div className={cn('min-w-0', className)}>
        {label && <span className={FIELD_LABEL}>{label}</span>}
        <p className="text-[14px] font-bold text-primary">
          {selected.name} · {selected.sessionName}
        </p>
      </div>
    );
  }

  const termName = (term: Term) =>
    `${term.name}${markClosed && term.closed ? ' · closed' : ''}`;

  /* A single session still needs the term dropdown, but not the year one. */
  const showSessions = sessions.length > 1;

  return (
    <div className={cn('grid gap-2.5', showSessions ? 'grid-cols-2' : 'grid-cols-1', className)}>
      {showSessions && (
        <label className="min-w-0">
          {label && <span className={FIELD_LABEL}>Session</span>}
          <Select
            value={sessionId}
            aria-label="Session"
            onChange={(e) => {
              const next = sessions.find((s) => s.id === e.target.value);
              if (!next?.terms.length) return;
              /*
               * Land on the LAST term of the chosen year, not the first.
               *
               * Somebody moving back a year is nearly always after how it
               * finished — the third term — and somebody moving forward wants
               * the most recent thing there is. Opening on First Term means an
               * extra tap in both directions.
               */
              onChange(next.terms.at(-1)!.id);
            }}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
      )}

      <label className="min-w-0">
        {label && <span className={FIELD_LABEL}>{showSessions ? 'Term' : label}</span>}
        <Select value={value} aria-label="Term" onChange={(e) => onChange(e.target.value)}>
          {(session?.terms ?? []).map((term) => (
            <option key={term.id} value={term.id}>
              {termName(term)}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
