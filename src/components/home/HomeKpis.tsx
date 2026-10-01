/**
 * Three numbers, one at a time, swiped by hand.
 *
 * WHY A CAROUSEL AND NOT A ROW OF TILES
 *
 * A row of four stat tiles is the default dashboard move and it is wrong on a
 * phone: at 360px each tile is a thumbnail, the label wraps to three lines, and
 * the whole row is read as decoration and scrolled past. One card at a time is
 * legible, and the swipe is a thing people already know how to do.
 *
 * It does not move on its own. An automatic carousel takes the thing somebody
 * is reading away from them, and on the one screen a head teacher opens every
 * morning that is unforgivable. It advances when a finger or a button says so.
 *
 * WHY IT IS CHEAP
 *
 * The movement is CSS scroll-snap, so there is no animation loop, no timer and
 * no layout thrash — the browser does it on the compositor. The only JavaScript
 * is one scroll listener, throttled to a frame, that works out which card is in
 * view so the dots can follow.
 *
 * WHAT THE NUMBERS COST
 *
 * Nothing that is not already on the screen, plus at most one counting query.
 * `getCountFromServer` returns a number, not documents: Firestore bills it as a
 * single read however many rows it counted. See `countDocs` in `db.ts`.
 *
 * THE PICTURES BEHIND THE CARDS
 *
 * Each card can be given a background. That is only workable if the card's
 * shape is roughly known, and as a full-width carousel it was not: stretched
 * across the 1400px content column the card was about 7:1, while on a 320px
 * phone it is nearer 1.5:1, and no single photograph crops to both.
 *
 * THE ANSWER IS TO STOP BEING A CAROUSEL ON A DESKTOP
 *
 * The first attempt capped the track at 720px, which held the shape but looked
 * wrong: a 720px card left-aligned under a full-width header with a shortcuts
 * grid twice its width underneath, and dots for swiping on a screen with no
 * finger anywhere near it. A carousel is a phone idiom. On a desktop there is
 * room for all three cards at once, so all three are shown at once and the
 * swiping furniture goes.
 *
 * That also settles the picture. Measured: 296 × 196 on a 320px phone, 406 ×
 * 196 on a large one, and 443 × 192 in each column of the desktop grid —
 * 1.51:1 to 2.3:1, a range one image covers comfortably. The midpoint is
 * **2:1**, which is what the owner dashboard asks for: 1400 × 700, centre
 * crop, nothing worse than a sixth trimmed at either end.
 *
 * THREE PICTURES, ONE PLATFORM
 *
 * Each card carries its own background and all three are set once for every
 * school — see `SiteHome` in `site.ts` for why that is not per-school. The
 * numbers on top are always the school's own.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export interface Kpi {
  key: string;
  /** The small line above the number. */
  label: string;
  /** The number itself, already formatted. */
  value: string;
  /** One short line under it, saying what the number is. */
  caption: string;
  /** The primary action. */
  action?: { label: string; to: string };
  /** A second, quieter action. */
  secondary?: { label: string; to: string };
  icon?: ReactNode;
  /** Fills the bar underneath. Omit for a card with no proportion to show. */
  progress?: number;
  tone?: 'brand' | 'good' | 'warning';
}

const TONE = {
  brand: 'bg-brand-600 dark:bg-brand-500',
  good: 'bg-status-good',
  warning: 'bg-gold-400',
} as const;

/**
 * The card with nothing in it yet.
 *
 * Exactly the shape of the real one — same width, same minimum height, same
 * corner, same three blocks in the same places. That is the entire job: this
 * screen used to draw the shortcuts first and then push them down when the
 * numbers landed a second later, because a card that is not there takes no
 * room. It takes the room now, from the first frame, and the numbers appear
 * inside it without anything moving.
 */
function KpiSkeleton() {
  return (
    <article className="w-full shrink-0 snap-center rounded-[var(--radius-card)] border border-hairline surface-card p-4 shadow-card sm:p-5 min-h-[142px] sm:min-h-[156px]">
      <div className="flex items-start justify-between gap-3">
        <div className="skeleton h-2.5 w-24 rounded-full" />
        <div className="skeleton h-4 w-4 rounded-md" />
      </div>
      <div className="skeleton mt-3 h-8 w-20 rounded-lg sm:h-9" />
      <div className="skeleton mt-3 h-3 w-full max-w-[15rem] rounded-full" />
      <div className="skeleton mt-1.5 h-3 w-3/5 max-w-[11rem] rounded-full" />
      <div className="skeleton mt-5 h-3 w-28 rounded-full" />
    </article>
  );
}

export function HomeKpis({
  items,
  /**
   * How many cards this role is going to get.
   *
   * Zero for a parent, who has no summary at all — and for them the section
   * must draw nothing rather than a skeleton for numbers that are never
   * coming. It is the role that decides, not the data, because the data is
   * exactly what has not arrived yet.
   */
  placeholders = 0,
  onRetry,
  failed = false,
  className,
}: {
  items: Kpi[];
  placeholders?: number;
  onRetry?: () => void;
  /** The home screen passes `hidden lg:block` — see the note where it is used. */
  className?: string;
  failed?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  /* Which card is under the viewport, worked out from the scroll offset. */
  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    setIndex(Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / width))));
  }, [items.length]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      // One read per frame. A scroll fires dozens of events a second and
      // measuring on each of them is how a list starts to stutter.
      requestAnimationFrame(() => {
        queued = false;
        sync();
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [sync]);

  const go = (to: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(items.length - 1, to));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
  };

  /*
   * Nothing has arrived, and something is expected.
   *
   * Note the order of these two guards. A role with no summary (`placeholders`
   * 0) falls straight through to `return null` and the screen closes up, which
   * is right. A role that has one gets the shape held for it whether the read
   * is still going or has failed — because the failure is the case where a
   * jumping layout is least forgivable: the person is already on a bad
   * connection.
   */
  if (!items.length && placeholders > 0) {
    if (failed) {
      return (
        <section aria-label="Summary" className={cn('min-w-0', className)} data-tour="summary">
          <div className="flex min-h-[142px] w-full flex-col justify-center rounded-[var(--radius-card)] border border-hairline surface-card p-4 shadow-card sm:min-h-[156px] sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Summary</p>
            <p className="mt-2 text-[14.5px] font-semibold text-primary">
              Your numbers did not load
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 self-start text-[13.5px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Try again
              </button>
            )}
          </div>
        </section>
      );
    }

    return (
      <section aria-label="Summary" className={cn('min-w-0', className)} data-tour="summary" aria-busy>
        <div className="flex gap-3 overflow-hidden">
          <KpiSkeleton />
        </div>
        {placeholders > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
            {Array.from({ length: placeholders }, (_, i) => (
              <span
                key={i}
                className={cn('h-1.5 rounded-full bg-[var(--border-strong)]', i === 0 ? 'w-6' : 'w-1.5')}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section aria-label="Summary" className={cn('min-w-0', className)} data-tour="summary">
      <div
        ref={track}
        // `overscroll-x-contain` stops a swipe past the last card turning into
        // the browser's own back gesture, which on iOS leaves the app.
        /*
          A swipeable track on a phone, a plain three-column grid from 1024px.
          `lg:overflow-visible` matters: an `overflow-x-auto` grid still clips,
          and the card's shadow would be sliced off at the column edge.
        */
        className={cn(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scrollbar-none',
          'lg:grid lg:snap-none lg:overflow-visible lg:gap-4',
          items.length >= 3 ? 'lg:grid-cols-3' : items.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
        )}
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => (
          <article
            key={item.key}
            className={cn(
              'relative isolate w-full shrink-0 snap-center overflow-hidden rounded-[var(--radius-card)] border p-4 shadow-card sm:p-5',
              'lg:shrink',
              'min-h-[142px] sm:min-h-[156px]',
              'border-hairline surface-card',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className={cn(
                  'text-[11px] font-bold uppercase tracking-[0.12em]',
                  'text-muted',
                )}
              >
                {item.label}
              </p>
              {item.icon && (
                <span className="shrink-0 text-muted">{item.icon}</span>
              )}
            </div>

            <p
              className={cn(
                'tabular mt-1.5 text-[28px] font-bold leading-none sm:text-[32px]',
                'text-primary',
              )}
            >
              {item.value}
            </p>
            {/*
              Two lines, then clipped. Not for tidiness: a caption that wraps to
              three lines on a 320px phone and two on a 390px one gives the card
              two different shapes, and the banner behind it has to be croppable
              to both. Clamping holds the card's proportions still.
            */}
            <p
              className={cn(
                'mt-1 line-clamp-2 text-[12.5px] leading-snug',
                'text-secondary',
              )}
            >
              {item.caption}
            </p>

            {typeof item.progress === 'number' && (
              <div
                className={cn(
                  'mt-3 h-1.5 w-full overflow-hidden rounded-full',
                  'bg-[var(--surface-sunken)]',
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    TONE[item.tone ?? 'brand'],
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}
                />
              </div>
            )}

            {(item.action || item.secondary) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {item.action && (
                  <Link
                    to={item.action.to}
                    className={cn(
                      'text-[13.5px] font-semibold hover:underline',
                      'text-brand-700 dark:text-brand-400',
                    )}
                  >
                    {item.action.label}
                  </Link>
                )}
                {item.secondary && (
                  <Link
                    to={item.secondary.to}
                    className={cn(
                      'text-[13.5px] font-semibold hover:underline',
                      'text-secondary',
                    )}
                  >
                    {item.secondary.label} →
                  </Link>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* ------------------------------------------------------ the dots */}
      {/*
        Gone from 1024px up, where the track is a grid and every card is
        already on screen. Dots that cannot advance anything are furniture.
      */}
      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous"
            className="tap hidden h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary disabled:opacity-30 sm:flex"
          >
            <ChevronLeft size={17} aria-hidden />
          </button>

          <div className="flex items-center gap-1.5">
            {items.map((item, i) => (
              <button
                key={item.key}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show ${item.label}`}
                aria-current={i === index}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-6 bg-brand-600 dark:bg-brand-500' : 'w-1.5 bg-[var(--border-strong)]',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === items.length - 1}
            aria-label="Next"
            className="tap hidden h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary disabled:opacity-30 sm:flex"
          >
            <ChevronRight size={17} aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
