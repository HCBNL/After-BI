/**
 * What is waiting for this person, worked out from the school's own records.
 *
 * This is what fills the space under the panel that used to be empty. It is
 * the banking app's "Finish setting up — 5 of 6 done" card, pointed at the
 * work of a school: the registers still to come in, the lesson notes sent back,
 * the report cards built but not released.
 *
 * THE SAME RULE AS THE SETUP LIST: IT CANNOT LIE
 *
 * Every row is read from real state, never from a stored "done" flag, so it
 * ticks itself off when the work is done. A row whose number could not be
 * read is left out rather than shown as zero — a register count that failed to
 * load must not tell a head teacher that no class has been marked.
 *
 * Three kinds of row. `todo` needs this person; `done` is finished and stays
 * as a quiet tick so the list does not empty itself into nothing; `info` is
 * worth knowing and asks nothing. Only the first two count towards the bar.
 */

import { Link } from 'react-router-dom';
import { Check, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TodoItem {
  id: string;
  title: string;
  detail?: string;
  to: string;
  icon: LucideIcon;
  state: 'todo' | 'done' | 'info';
  /** Shown as a badge on a `todo` row: how many are waiting. */
  count?: number;
}

const PLATE = {
  todo: 'bg-gold-100 text-gold-800 dark:bg-gold-400/15 dark:text-gold-300',
  done: 'bg-[#0f8a4c]/10 text-status-good dark:bg-[#0f8a4c]/20 dark:text-[#4ec54e]',
  info: 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200',
} as const;

const ORDER = { todo: 0, info: 1, done: 2 } as const;

export function TodoCard({
  items,
  loading = false,
  failed = false,
  onRetry,
  className,
}: {
  items: TodoItem[];
  loading?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  /* Still loading draws nothing: the home screen shows the brand loader instead. */
  if (loading || (!failed && !items.length)) return null;

  const tracked = items.filter((item) => item.state !== 'info');
  const done = tracked.filter((item) => item.state === 'done').length;
  const rows = [...items].sort((a, b) => ORDER[a.state] - ORDER[b.state]);
  const broken = failed && !items.length;

  const summary = loading
    ? 'Checking your records…'
    : broken
      ? 'This could not be checked just now.'
      : !tracked.length
        ? 'Nothing is waiting on you.'
        : done === tracked.length
          ? 'All done. Nothing is waiting on you.'
          : `${done} of ${tracked.length} done`;

  return (
    <section
      aria-labelledby="todo-heading"
      data-tour="todo"
      className={cn('rounded-[22px] border border-hairline surface-card p-4 shadow-card sm:p-5', className)}
    >
      <h2 id="todo-heading" className="text-[16px] font-bold text-primary">
        To do
      </h2>
      <p className="mt-0.5 text-[13px] text-secondary">{summary}</p>

      {!loading && tracked.length > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full surface-sunken" aria-hidden>
          <div
            className="h-full rounded-full bg-status-good transition-[width] duration-700"
            style={{ width: `${(done / tracked.length) * 100}%` }}
          />
        </div>
      )}

      {broken ? (
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-[13.5px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            Try again
          </button>
        )
      ) : (
        <ul className="-mx-1.5 mt-3 space-y-0.5">
          {rows.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 rounded-2xl px-1.5 py-2 transition-colors hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)]"
                >
                  <span
                    className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]', PLATE[item.state])}
                    aria-hidden
                  >
                    {item.state === 'done' ? <Check size={18} strokeWidth={2.6} /> : <Icon size={18} strokeWidth={2} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-[14px] font-semibold',
                        item.state === 'done' ? 'text-secondary' : 'text-primary',
                      )}
                    >
                      {item.title}
                    </span>
                    {item.detail && (
                      <span className="line-clamp-2 block text-[12.5px] leading-snug text-muted">{item.detail}</span>
                    )}
                  </span>
                  {item.state === 'todo' && item.count ? (
                    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11.5px] font-bold text-white dark:bg-brand-500">
                      {item.count}
                    </span>
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
