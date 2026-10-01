/**
 * Get your school running.
 *
 * A new school is a set of empty collections and a person who has never seen
 * this app before. Everything works and nothing is there, which is the hardest
 * state for software to be in: no error is shown, because nothing is wrong —
 * the screens are simply empty, and the order to fill them in is obvious only
 * to whoever wrote them.
 *
 * So the order is stated. Five steps, in the sequence the data actually
 * depends on: classes exist before staff can be assigned to them, staff exist
 * before pupils exist, and pupils exist before anyone has a mark.
 * Each step reads real state rather than a stored flag, so it ticks itself off
 * when the work is done and comes back if a school later empties something —
 * and it cannot lie, which a "you have completed onboarding" flag eventually
 * does.
 *
 * It disappears on its own when all five are done. Dismissing it is possible
 * before that, per person and per browser, because a bursar who only records
 * payments should not have to look at the head teacher's list for ever.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Term } from '@/types';

export interface SetupState {
  classes: number;
  subjects: number;
  teachers: number;
  students: number;
  currentTerm: Term | null;
}

interface Step {
  id: string;
  label: string;
  to: string;
  done: boolean;
}

const STORAGE_KEY = 'getschool.setup.dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Storage blocked. The list simply shows — which is the safe way round.
    return false;
  }
}

export function SetupChecklist({ state }: { state: SetupState }) {
  const [dismissed, setDismissed] = useState(readDismissed);

  const steps = useMemo<Step[]>(
    () => [
      {
        id: 'term',
        label: 'Confirm the term and its dates',
        to: '/portal/admin/settings',
        done: Boolean(state.currentTerm?.id),
      },
      {
        id: 'classes',
        label: 'Check your classes',
        to: '/portal/admin/classes',
        done: state.classes > 0,
      },
      {
        id: 'staff',
        label: 'Add your teachers',
        to: '/portal/admin/accounts',
        done: state.teachers > 0,
      },
      {
        id: 'students',
        label: 'Put the children on the roll',
        to: '/portal/admin/students',
        done: state.students > 0,
      },
      {
        id: 'subjects',
        label: 'Review the subject list',
        to: '/portal/admin/classes',
        done: state.subjects > 0,
      },
    ],
    [state],
  );

  const doneCount = steps.filter((s) => s.done).length;

  // Finished, or put away. Either way it stops taking up the home screen.
  if (doneCount === steps.length || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* not stored; it will be back next visit, which is acceptable */
    }
    setDismissed(true);
  };

  return (
    <section
      aria-labelledby="setup-heading"
      className="rounded-[var(--radius-card)] border border-hairline surface-card p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="setup-heading" className="text-[15px] font-bold text-primary">
            Get your school running
          </h3>
          <p className="mt-0.5 text-[13px] text-secondary">
            {doneCount} of {steps.length} done
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide the setup list"
          className="tap -mr-1.5 -mt-1 flex shrink-0 items-center justify-center rounded-lg px-1.5 text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
        >
          <X size={17} aria-hidden />
        </button>
      </div>

      {/* Progress, as a bar rather than a number nobody reads. */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full surface-sunken" aria-hidden>
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-500 dark:bg-brand-500"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-3 space-y-0.5">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.to}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                step.done ? 'opacity-60' : 'hover:bg-[var(--surface-sunken)]',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white',
                  step.done
                    ? 'border-status-good bg-status-good'
                    : 'border-[var(--border-strong)] bg-transparent',
                )}
                aria-hidden
              >
                {step.done && <Check size={12} strokeWidth={3.5} />}
              </span>

              <span
                className={cn(
                  'min-w-0 flex-1 text-[13.5px] font-semibold',
                  step.done ? 'text-secondary line-through' : 'text-primary',
                )}
              >
                {step.label}
              </span>

              {!step.done && (
                <ArrowRight size={15} className="shrink-0 text-muted" aria-hidden />
              )}
            </Link>
          </li>
        ))}
      </ol>

    </section>
  );
}
