/**
 * How much of an allowance is gone, as a bar.
 *
 * This replaced a row of number tiles. A tile reading "14" answers a question
 * nobody asked; what a teacher wants to know at a glance is whether there is
 * room to draft another note, and that is a proportion, not a count. A bar
 * says it without being read.
 *
 * The colour carries the same message a second time, for anyone who is not
 * going to measure the bar against its track: brand red while there is plenty,
 * amber under a quarter left, and the strong red when it is finished.
 */

import { cn } from '@/lib/cn';

export function CreditBar({
  used,
  total,
  label,
  note,
  className,
}: {
  used: number;
  total: number;
  /** What the allowance is for. "Notes written today". */
  label: string;
  /** One short line under the bar. When it refills, what it costs. */
  note?: string;
  className?: string;
}) {
  const safeTotal = Math.max(1, total);
  const spent = Math.max(0, Math.min(used, safeTotal));
  const left = safeTotal - spent;
  const pct = (spent / safeTotal) * 100;

  const tone = left === 0 ? 'empty' : left / safeTotal <= 0.25 ? 'low' : 'fine';

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] font-semibold text-primary">{label}</span>
        <span className="tabular shrink-0 text-[12.5px] font-semibold text-muted">
          {spent} of {safeTotal}
        </span>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
        role="progressbar"
        aria-valuenow={spent}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label={label}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            tone === 'empty' && 'bg-[#b3261e]',
            tone === 'low' && 'bg-gold-400',
            tone === 'fine' && 'bg-brand-600 dark:bg-brand-500',
          )}
          style={{ width: `${Math.max(pct, spent > 0 ? 4 : 0)}%` }}
        />
      </div>

      <p className="mt-1.5 text-[12px] leading-snug text-muted">
        {left === 0 ? 'None left.' : `${left} left.`}
        {note ? ` ${note}` : ''}
      </p>
    </div>
  );
}
