/**
 * A row of figure cards you swipe, never one that moves by itself.
 *
 * The next card always peeks in: on a phone or tablet two cards and a sliver
 * of the third, on a laptop three and a sliver of the fourth. When every
 * card fits (three or fewer on a laptop, two or fewer on a phone) they simply
 * share the row and there is nothing to swipe. Dots under the row say how many
 * there are and which is in front; tapping one scrolls to it.
 *
 * Each card's ground comes from its place in the row (`.ab-strip-slot` in
 * index.css): the theme colour, night with a green glow, burnt orange,
 * violet, deep teal, then round again. So any page's cards look like one set.
 */
import { Children, createContext, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const GAP = '0.75rem';

/** Which place a card holds in its strip: picks its ground and its artwork. */
export const StripIndex = createContext(0);

/** How many cards are in view: whole cards plus a sliver of the next, or all of them when they fit. */
function view(count: number, fits: number, peek: number) {
  return count > fits ? { show: fits + peek, gaps: fits } : { show: Math.max(count, 1), gaps: Math.max(count - 1, 0) };
}

export function CardStrip({ label = 'Summary', children, className }: { label?: string; children: ReactNode; className?: string }) {
  const slides = Children.toArray(children).filter(Boolean);
  const count = slides.length;
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [scrolls, setScrolls] = useState(false);

  const stops = useCallback((): number[] => {
    const el = track.current;
    if (!el) return [];
    const items = Array.from(el.children) as HTMLElement[];
    const first = items[0]?.offsetLeft ?? 0;
    return items.map((item) => item.offsetLeft - first);
  }, []);

  /* Is there anything to swipe at this width? */
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const check = () => setScrolls(el.scrollWidth > el.clientWidth + 2);
    check();
    const watch = new ResizeObserver(check);
    watch.observe(el);
    return () => watch.disconnect();
  }, [count]);

  /* Which card is in front, for the dots. */
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
        if (el.scrollLeft >= end - 2) next = at.length - 1;
        else {
          let best = Number.POSITIVE_INFINITY;
          at.forEach((stop, i) => {
            const d = Math.abs(stop - el.scrollLeft);
            if (d < best) {
              best = d;
              next = i;
            }
          });
        }
        setIndex(next);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [stops, count]);

  const go = (to: number) => {
    const el = track.current;
    const at = stops();
    if (!el || !at.length) return;
    const next = Math.max(0, Math.min(at.length - 1, to));
    el.scrollTo({ left: at[next], behavior: 'smooth' });
    setIndex(next);
  };

  if (!count) return null;

  const phone = view(count, 2, 0.15);
  const wide = view(count, 3, 0.15);
  const vars = {
    '--strip-gap': GAP,
    '--strip-w': `calc((100% - ${phone.gaps} * ${GAP}) / ${phone.show})`,
    '--strip-w-wide': `calc((100% - ${wide.gaps} * ${GAP}) / ${wide.show})`,
  } as CSSProperties;

  return (
    <section aria-roledescription="carousel" aria-label={label} className={cn('min-w-0', className)}>
      <div
        ref={track}
        style={vars}
        className={cn(
          'ab-strip relative flex snap-x snap-mandatory gap-[var(--strip-gap)] overflow-x-auto overscroll-x-contain scrollbar-none',
          /* On a phone the row runs to the screen's edge, so the next card peeks from the side. */
          '-mx-3 px-3 scroll-px-3 sm:-mx-5 sm:px-5 sm:scroll-px-5 lg:mx-0 lg:px-0 lg:scroll-px-0',
          /* Room for the cards' shadow, which a scrolling box would otherwise cut. */
          '-my-1 py-1',
        )}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className="ab-strip-slot flex shrink-0 grow-0 basis-[var(--strip-w)] snap-start lg:basis-[var(--strip-w-wide)]"
          >
            <StripIndex.Provider value={i}>{slide}</StripIndex.Provider>
          </div>
        ))}
      </div>

      {scrolls && (
        <div className="mt-2 flex items-center justify-center">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show ${i + 1} of ${count}`}
              aria-current={i === index}
              className="flex h-6 items-center px-[3px]"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-5 bg-brand-700 dark:bg-brand-400' : 'w-1.5 bg-[var(--border-strong)]',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
