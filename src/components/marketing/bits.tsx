/**
 * The parts every public page is assembled from.
 *
 * THE BRAND, IN ONE LINE
 *
 * "AfterBI." — and the full stop is green. That is the whole device. It ends
 * the name, it ends a headline, and it appears nowhere else, which is what
 * keeps it meaning something. There is no second mark, no underline, no
 * handwriting: one punctuation mark, used sparingly.
 *
 * WHAT LIVES HERE
 *
 *   Reveal     a section arriving as it is reached
 *   Stop       the green full stop
 *   Headline   a section heading, ending in one
 *   Row        a shelf that scrolls sideways, with its own arrows
 *   Questions  answers that open one at a time, all closed at first
 *
 * Everything is drawn for the dark pages, because every public page is dark.
 * See `.ink` in index.css: it is a material, not a theme state.
 */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { container } from './tokens';

/* -------------------------------------------------------------- the reveal */

/**
 * Arrive when reached.
 *
 * An observer rather than a scroll handler, and it disconnects the moment it
 * has fired: a section enters once, so a listener that keeps running for the
 * rest of the visit is paying rent on nothing. The element is fully laid out
 * either way, so a browser that never runs this — or a visitor who asked for
 * less motion — gets the finished page and loses only the entrance.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  /** Milliseconds. Staggers a row; never more than about 240ms. */
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'header' | 'article';
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || shown) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      /* Fires a little before the section reaches the fold, so the animation is
         finishing as the reader arrives rather than starting. */
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', shown && 'reveal-in', className)}
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ----------------------------------------------------------------- the dot */

/** The full stop, in the brand's green. The entire mark. */
export function Stop() {
  return <span className="text-brand-500">.</span>;
}

/**
 * A section heading, set in the display face and ending in the dot.
 *
 * No accent word, no coloured phrase, no underline. A headline with a coloured
 * clause reads as a link somebody forgot to finish; the dot at the end says
 * "this is ours" and costs one character.
 */
export function Headline({
  children,
  size = 'md',
  align = 'left',
  className,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
  className?: string;
  as?: 'h1' | 'h2';
}) {
  return (
    <Tag
      className={cn(
        'font-display font-extrabold tracking-[-0.04em] text-white',
        size === 'sm' && 'text-[1.3rem] leading-[1.15] sm:text-[1.6rem]',
        size === 'md' && 'text-[1.9rem] leading-[1.08] sm:text-[2.5rem]',
        size === 'lg' && 'text-[2.2rem] leading-[1.03] tracking-[-0.045em] sm:text-[3.4rem]',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
      <Stop />
    </Tag>
  );
}

/* --------------------------------------------------------------- the shelf */

/**
 * A row that scrolls sideways, with arrows that know where its ends are.
 *
 * Swiped on a phone, arrowed on a laptop. The row runs to the right-hand edge
 * of the screen while its first card lines up with the page's text column, so
 * the card cut off at the edge says "there is more" without a word. It is the
 * one idea this page borrows wholesale from a streaming service, and it is
 * borrowed because it is right: nobody reads a distribution product top to
 * bottom, they scan a shelf for the one thing they came about.
 */
export function Row({
  title,
  action,
  id,
  children,
}: {
  title: string;
  action?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    const start = node.scrollLeft <= 4;
    const end = node.scrollLeft + node.clientWidth >= node.scrollWidth - 4;
    setEdge((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(node);
    if (track.current) observer?.observe(track.current);
    return () => {
      node.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [measure]);

  const move = (direction: 1 | -1) => {
    const node = scroller.current;
    if (!node) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };

  const scrollable = !(edge.start && edge.end);

  return (
    <section id={id} className="scroll-mt-24 py-6 sm:py-8">
      <div className={cn(container, 'flex items-center justify-between gap-4')}>
        <div className="flex min-w-0 items-baseline gap-4">
          <h2 className="font-display text-[1.3rem] font-bold tracking-[-0.025em] text-white sm:text-[1.6rem]">
            {title}
          </h2>
          {action}
        </div>
        {scrollable && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <ArrowButton direction="back" disabled={edge.start} onClick={() => move(-1)} />
            <ArrowButton direction="next" disabled={edge.end} onClick={() => move(1)} />
          </div>
        )}
      </div>

      <div ref={scroller} className="row-scroll row-gutter mt-4 pb-3">
        <div ref={track} className="flex w-max shrink-0 gap-3 sm:gap-4">
          {children}
        </div>
      </div>
    </section>
  );
}

/** Drawn with two borders rather than an icon: it never arrives late. */
function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'back' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'back' ? 'Scroll back' : 'Scroll forward'}
      className="tap inline-flex items-center justify-center rounded-full bg-white/[0.06] text-white ring-1 ring-inset ring-white/12 transition-colors hover:ring-white/30 disabled:cursor-default disabled:opacity-30"
    >
      <span
        aria-hidden
        className={cn(
          'block h-2.5 w-2.5 rotate-45 border-current',
          direction === 'back' ? 'ml-1 border-b-2 border-l-2' : 'mr-1 border-r-2 border-t-2',
        )}
      />
    </button>
  );
}

/* ----------------------------------------------------------- the questions */

/**
 * Questions and answers, every one closed until it is pressed.
 *
 * The answers stay in the page while closed — squeezed to no height, and inert
 * so the keyboard and a screen reader skip them — which is what lets the page
 * mark them up as an FAQ honestly: the text a search engine is told about is
 * text that is genuinely on the page.
 */
export function Questions({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, index) => {
        const expanded = open === index;
        const panel = `${base}-${index}`;
        return (
          <li key={item.q} className="bg-night-2">
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : index)}
              aria-expanded={expanded}
              aria-controls={panel}
              className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition-colors hover:bg-night-3 sm:px-7 sm:py-6"
            >
              <span className="text-[17px] font-semibold leading-snug text-white sm:text-[21px]">{item.q}</span>
              <span
                aria-hidden
                className={cn('relative block h-6 w-6 shrink-0 transition-transform duration-300', expanded && 'rotate-45')}
              >
                <span className="absolute left-0 top-1/2 h-[2.5px] w-full -translate-y-1/2 rounded-full bg-white" />
                <span className="absolute left-1/2 top-0 h-full w-[2.5px] -translate-x-1/2 rounded-full bg-white" />
              </span>
            </button>
            <div
              id={panel}
              inert={!expanded}
              className="grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="border-t border-night px-5 py-5 text-[15.5px] leading-[1.7] text-white/78 sm:px-7 sm:py-6 sm:text-[17.5px]">
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
