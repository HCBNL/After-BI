/**
 * A month, picked from a dropdown: "October 2026".
 *
 * Replaces the row of `2026-10 2026-09 …` chips, which only ever showed four
 * months and grew no better with time. The list runs from `ahead` months in the
 * future back `back` months, and always includes the current value, so a
 * target set for an older month still opens on it. Value stays `YYYY-MM`.
 */
import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { monthKey } from '@/lib/format';

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function MonthSelect({
  value,
  onChange,
  back = 24,
  ahead = 0,
  className,
  label = 'Month',
}: {
  value: string;
  onChange: (next: string) => void;
  back?: number;
  ahead?: number;
  className?: string;
  label?: string;
}) {
  const months = useMemo(() => {
    const now = new Date();
    const out: string[] = [];
    for (let i = -ahead; i <= back; i += 1) out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    if (value && !out.includes(value)) out.push(value);
    return out.sort().reverse();
  }, [back, ahead, value]);

  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <CalendarDays size={15} aria-hidden className="pointer-events-none absolute left-3 text-muted" />
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-card)] pl-9 pr-9 text-[13.5px] font-semibold text-[var(--text-primary)] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
            {m === monthKey() ? ' (this month)' : ''}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-3 h-4 w-4 text-muted" fill="currentColor">
        <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
