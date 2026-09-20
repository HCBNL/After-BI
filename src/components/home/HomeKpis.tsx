import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

/**
 * The three numbers, one card at a time, swiped by hand.
 *
 * WHY A CAROUSEL AND NOT A GRID OF FOUR
 *
 * A 2×2 grid of stat cards is the standard dashboard opening and on a 360px
 * phone it is four cards each too small to carry a caption, stacked into a
 * screen and a half of scrolling before the tiles — which are the only part
 * anybody taps. One card at full width can hold the number, the sentence that
 * makes it mean something, and the button that acts on it. The other two are a
 * swipe away and the dots say they are there.
 *
 * On a laptop they sit side by side, because there the room exists.
 *
 * WHY EVERY CARD HAS AN ACTION
 *
 * A number nobody can do anything about belongs on a report, not a home screen.
 * "₦2.4m overdue" with no way through to the list of who owes it is a fact that
 * makes a finance manager open a different screen and find it again by hand.
 * Every card here either links somewhere or is not on the card.
 */

export interface Kpi {
  key: string;
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
  /** 0–100. Draws a bar under the caption when set. */
  progress?: number;
  tone?: 'brand' | 'good' | 'warning' | 'critical';
  /** The thing to do about this number. */
  action?: { label: string; to: string };
  /** A quieter second way in. */
  secondary?: { label: string; to: string };
}

const TONE_BAR: Record<NonNullable<Kpi['tone']>, string> = {
  brand: 'bg-brand-600 dark:bg-brand-400',
  good: 'bg-status-good',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
};

const TONE_PLATE: Record<NonNullable<Kpi['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  good: 'bg-[#0ca30c]/10 text-[#0a7a0a] dark:text-[#4ec54e]',
  warning: 'bg-[#fab219]/12 text-[#8a6100] dark:text-[#fab219]',
  critical: 'bg-[#d03b3b]/10 text-[#a52929] dark:text-[#f08080]',
};

function Card({ kpi }: { kpi: Kpi }) {
  const tone = kpi.tone ?? 'brand';

  return (
    <article className="flex min-h-[168px] w-full shrink-0 snap-center flex-col rounded-[var(--radius-card)] border border-hairline surface-card p-4 shadow-card sm:min-h-[186px] sm:p-5 lg:w-auto lg:flex-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">{kpi.label}</p>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            TONE_PLATE[tone],
          )}
        >
          {kpi.icon}
        </span>
      </div>

      {/*
        `tabular` matters here and nowhere more.

        Three cards side by side, each with a naira figure, in a proportional
        font: the digits are different widths, so the numbers do not line up
        with each other and the row reads as slightly broken. Tabular figures
        are the whole reason Inter is the interface face — see index.css.
      */}
      <p className="tabular mt-2 text-[28px] font-extrabold leading-none text-primary sm:text-[32px]">
        {kpi.value}
      </p>

      <p className="mt-2 flex-1 text-[12.5px] leading-snug text-muted">{kpi.caption}</p>

      {kpi.progress !== undefined && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
          role="progressbar"
          aria-valuenow={Math.round(kpi.progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={kpi.label}
        >
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', TONE_BAR[tone])}
            style={{ width: `${Math.max(0, Math.min(100, kpi.progress))}%` }}
          />
        </div>
      )}

      {(kpi.action || kpi.secondary) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {kpi.action && (
            <Link
              to={kpi.action.to}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 dark:bg-brand-500 dark:text-brand-950 dark:hover:bg-brand-400"
            >
              {kpi.action.label}
            </Link>
          )}
          {kpi.secondary && (
            <Link
              to={kpi.secondary.to}
              className="inline-flex h-9 items-center justify-center rounded-xl px-2.5 text-[13px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
            >
              {kpi.secondary.label}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

export function HomeKpis({
  items,
  placeholders = 3,
  failed,
  onRetry,
}: {
  items: Kpi[];
  placeholders?: number;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  /*
   * A FAILED SUMMARY MUST NOT TAKE THE HOME SCREEN DOWN WITH IT.
   *
   * The shortcuts underneath need no data at all and are the reason anybody
   * opened this page. Losing them because a counting query timed out on a bad
   * connection would be the worst trade in the app — so the failure is confined
   * to this one card, which says so itself and offers to try again.
   */
  if (failed) {
    return (
      <div className="rounded-[var(--radius-card)] border border-hairline surface-card p-5 shadow-card lg:max-w-[720px]">
        <p className="text-[14px] font-bold text-primary">We could not add up your numbers</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Everything else on this screen still works. Check your connection and try again.
        </p>
        {onRetry && (
          <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (!items.length) {
    if (!placeholders) return null;
    return (
      <div className="flex gap-3 lg:gap-4" aria-hidden>
        {Array.from({ length: placeholders }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'min-h-[168px] w-full shrink-0 rounded-[var(--radius-card)] border border-hairline surface-card p-4 shadow-card sm:min-h-[186px] sm:p-5 lg:flex-1',
              i > 0 && 'hidden lg:block',
            )}
          >
            <div className="skeleton h-2.5 w-24 rounded-full" />
            <div className="skeleton mt-3 h-8 w-28 rounded-lg" />
            <div className="skeleton mt-3 h-3 w-full max-w-[15rem] rounded-full" />
            <div className="skeleton mt-1.5 h-3 w-3/5 max-w-[11rem] rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Summary">
      <div
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget;
          setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className={cn(
          'scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto',
          /* On a laptop they stop being a carousel and become a row. */
          'lg:snap-none lg:overflow-visible lg:gap-4',
        )}
      >
        {items.map((kpi) => (
          <Card key={kpi.key} kpi={kpi} />
        ))}
      </div>

      {/*
        The dots, phone only.

        Without them a person sees one card and has no reason to believe there
        are two more — the swipe is invisible affordance, and invisible
        affordances are how features go unused. They are not buttons: tapping a
        dot to move a carousel is a 12px target, and the card beside it is
        already a 300px one.
      */}
      {items.length > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 lg:hidden">
          {items.map((kpi, i) => (
            <span
              key={kpi.key}
              aria-hidden
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === active ? 'w-4 bg-brand-600 dark:bg-brand-400' : 'w-1.5 bg-[var(--border-strong)]',
              )}
            />
          ))}
          <span className="sr-only">
            Card {active + 1} of {items.length}
          </span>
        </div>
      )}
    </section>
  );
}
