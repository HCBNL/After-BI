/**
 * A row of cards: one in view, the next one peeking.
 *
 * The peek is the whole trick. A carousel whose next card is hidden reads as a
 * single card; one whose next card shows a sliver at the edge reads as a row
 * that can be swiped, with no instruction needed. It is how every banking app
 * in the country presents its banners, so the gesture is already learned.
 *
 * Built on CSS scroll-snap, like `HomeKpis` and `Carousel`: the browser does
 * the movement on the compositor, and the only script is a scroll listener,
 * throttled to a frame, that lights the right dot.
 *
 * MOVING BY ITSELF, AND WHEN IT STOPS
 *
 * `autoplay` is for the banners at the foot of the screen, and it is polite.
 * It moves only while most of the row is on screen and the tab is visible; it
 * holds still while a pointer is over it or focus is inside it; and the first
 * swipe or dot tap hands control to the person for the rest of the visit —
 * once somebody has touched it, it never moves under their thumb again.
 * Anybody who has asked their phone for less motion gets none. The summary
 * cards at the top of the Cards screen never autoplay: those are numbers
 * somebody is reading.
 */

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Slider({
  label,
  children,
  autoplay,
  tone = 'page',
  className,
  trackClassName,
  dataTour,
  slideClassName,
}: {
  label: string;
  children: ReactNode;
  /** Milliseconds between moves. Omit for a row that moves only by hand. */
  autoplay?: number;
  /** `hero` draws the dots for the red panel. */
  tone?: 'page' | 'hero';
  className?: string;
  /** Padding and bleed for the track, so the peek reaches the screen edge. */
  trackClassName?: string;
  dataTour?: string;
  /** Extra classes for each card's slot — three to a view on a laptop, say. */
  slideClassName?: string;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const current = useRef(0);
  const held = useRef(false);
  const taken = useRef(false);

  /* Where each card starts, measured from where the first one does. */
  const stops = useCallback((): number[] => {
    const el = track.current;
    if (!el) return [];
    const items = Array.from(el.children) as HTMLElement[];
    const first = items[0]?.offsetLeft ?? 0;
    return items.map((item) => item.offsetLeft - first);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const at = stops();
        if (!at.length) return;
        const end = el.scrollWidth - el.clientWidth;
        let next = 0;
        if (el.scrollLeft >= end - 2) {
          next = at.length - 1;
        } else {
          let best = Number.POSITIVE_INFINITY;
          at.forEach((stop, i) => {
            const distance = Math.abs(stop - el.scrollLeft);
            if (distance < best) {
              best = distance;
              next = i;
            }
          });
        }
        current.current = next;
        setIndex(next);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [stops, count]);

  const go = useCallback(
    (to: number) => {
      const el = track.current;
      if (!el) return;
      const at = stops();
      if (!at.length) return;
      const next = Math.max(0, Math.min(at.length - 1, to));
      el.scrollTo({ left: at[next], behavior: 'smooth' });
      current.current = next;
      setIndex(next);
    },
    [stops],
  );

  useEffect(() => {
    const el = track.current;
    if (!el || !autoplay || count < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let onScreen = false;
    const seen = new IntersectionObserver(
      ([entry]) => {
        onScreen = Boolean(entry && entry.intersectionRatio >= 0.6);
      },
      { threshold: [0, 0.6, 1] },
    );
    seen.observe(el);

    const timer = window.setInterval(() => {
      if (!onScreen || held.current || taken.current || document.hidden) return;
      go((current.current + 1) % count);
    }, autoplay);

    return () => {
      window.clearInterval(timer);
      seen.disconnect();
    };
  }, [autoplay, count, go]);

  if (!count) return null;
  const onHero = tone === 'hero';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      data-tour={dataTour}
      className={cn('min-w-0', className)}
      onMouseEnter={() => {
        held.current = true;
      }}
      onMouseLeave={() => {
        held.current = false;
      }}
      onFocus={() => {
        held.current = true;
      }}
      onBlur={() => {
        held.current = false;
      }}
    >
      <div
        ref={track}
        onPointerDown={() => {
          taken.current = true;
        }}
        onWheel={() => {
          taken.current = true;
        }}
        className={cn(
          // `overscroll-x-contain` stops a swipe past the last card becoming
          // the browser's back gesture, which on iOS leaves the app.
          'relative flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scrollbar-none',
          trackClassName,
        )}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className={cn('flex shrink-0 snap-start', count > 1 ? 'basis-[86%]' : 'basis-full', slideClassName)}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-2 flex items-center justify-center">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                taken.current = true;
                go(i);
              }}
              aria-label={`Show ${i + 1} of ${count}`}
              aria-current={i === index}
              // The dot is 6px; the button round it is a finger's height.
              className="flex h-6 items-center px-[3px]"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-5' : 'w-1.5',
                  i === index
                    ? onHero
                      ? 'bg-white'
                      : 'bg-brand-700 dark:bg-brand-400'
                    : onHero
                      ? 'bg-white/35'
                      : 'bg-[var(--border-strong)]',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
