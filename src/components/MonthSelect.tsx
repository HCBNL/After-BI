/**
 * A month, picked the way a calendar picks one: year first, then month.
 *
 * Tap the button and a panel opens: the year at the top with arrows either
 * side, and the twelve months of that year as a grid. The years run on by
 * themselves (no list to maintain): it starts from this year and the arrows
 * reach back `back` months and forward `ahead` months, so next year appears
 * the moment it is allowed, and the year after that a year later. The value
 * is still `YYYY-MM`.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { monthKey } from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

const keyOf = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

export function MonthSelect({
  value,
  onChange,
  back = 120,
  ahead = 0,
  className,
  label = 'Month',
}: {
  value: string;
  onChange: (next: string) => void;
  /** How many months into the past can be chosen. */
  back?: number;
  /** How many months into the future can be chosen. */
  ahead?: number;
  className?: string;
  label?: string;
}) {
  const now = useMemo(() => new Date(), []);
  const thisKey = monthKey(now);
  const min = monthKey(new Date(now.getFullYear(), now.getMonth() - back, 1));
  const max = monthKey(new Date(now.getFullYear(), now.getMonth() + ahead, 1));
  const valueYear = Number(value.slice(0, 4)) || now.getFullYear();

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(valueYear);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const minYear = Number(min.slice(0, 4));
  const maxYear = Number(max.slice(0, 4));

  /* Opening always starts on the chosen year. */
  useEffect(() => {
    if (open) setYear(valueYear);
  }, [open, valueYear]);

  /* Placed under the button, kept inside the screen, above any dialog. */
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      const width = Math.max(272, Math.min(320, r.width));
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      const below = r.bottom + 6;
      const top = below + 300 > window.innerHeight && r.top > 320 ? r.top - 306 : below;
      setPos({ top, left, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  /* Closes on a tap outside or Escape. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (key: string) => {
    onChange(key);
    setOpen(false);
    button.current?.focus();
  };

  const arrow =
    'flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary disabled:pointer-events-none disabled:opacity-30';

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={`${label}: ${monthLabel(value)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-card)] pl-3 pr-2.5 text-label font-semibold text-primary transition-colors hover:border-[var(--border-strong)] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25',
          className,
        )}
      >
        <CalendarDays size={15} aria-hidden className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-left">{monthLabel(value)}</span>
        {value === thisKey && (
          <span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 text-micro font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            Now
          </span>
        )}
        <ChevronDown size={15} aria-hidden className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={`Choose a ${label.toLowerCase()}`}
            className="surface-card fixed z-[80] rounded-2xl border border-hairline p-3 shadow-pop animate-fade-in"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {/* the year */}
            <div className="flex items-center justify-between gap-2">
              <button type="button" aria-label="Previous year" className={arrow} disabled={year <= minYear} onClick={() => setYear((y) => y - 1)}>
                <ChevronLeft size={17} />
              </button>
              <p className="tabular text-lead font-semibold text-primary">{year}</p>
              <button type="button" aria-label="Next year" className={arrow} disabled={year >= maxYear} onClick={() => setYear((y) => y + 1)}>
                <ChevronRight size={17} />
              </button>
            </div>

            {/* the years either side, so a jump is one tap */}
            <div className="mt-2 flex justify-center gap-1">
              {[year - 1, year, year + 1].filter((y) => y >= minYear && y <= maxYear).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={cn(
                    'tabular rounded-full px-2.5 py-0.5 text-caption font-medium transition-colors',
                    y === year ? 'bg-[var(--surface-sunken)] text-primary' : 'text-muted hover:text-primary',
                  )}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* the twelve months */}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {MONTHS.map((name, index) => {
                const key = keyOf(year, index + 1);
                const disabled = key < min || key > max;
                const selected = key === value;
                const current = key === thisKey;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(key)}
                    aria-pressed={selected}
                    className={cn(
                      'h-10 rounded-xl text-label font-medium transition-colors disabled:pointer-events-none disabled:opacity-30',
                      selected
                        ? 'bg-brand-600 font-semibold text-white shadow-sm dark:bg-brand-500'
                        : current
                          ? 'text-brand-700 ring-1 ring-inset ring-brand-500/50 hover:bg-[var(--surface-sunken)] dark:text-brand-300'
                          : 'text-primary hover:bg-[var(--surface-sunken)]',
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {value !== thisKey && thisKey >= min && thisKey <= max && (
              <button
                type="button"
                onClick={() => pick(thisKey)}
                className="mt-2 w-full rounded-xl py-2 text-label font-semibold text-brand-700 transition-colors hover:bg-[var(--surface-sunken)] dark:text-brand-300"
              >
                This month
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
