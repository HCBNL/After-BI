/**
 * The spotlight.
 *
 * HOW THE HOLE IS CUT
 *
 * Four dark rectangles, not one dark layer with a hole in it. An SVG mask or a
 * giant `box-shadow` would be fewer elements, and both have the same problem:
 * the darkened area then swallows every tap, including the one on the thing
 * being pointed at. Four panels leave a genuine gap, the element underneath
 * is still there, still visible, still tappable, and the ring drawn over it
 * is `pointer-events: none`, so it decorates without intercepting.
 *
 * It also degrades honestly. A step whose element is not on this screen draws
 * no panels and centres its card, which reads as a plain message rather than
 * as an arrow pointing at nothing.
 *
 * THE BUG THAT MADE THE HOME SCREEN COME APART, AND WHY
 *
 * This used to call `element.scrollIntoView()`, which looks harmless and is
 * not. It scrolls EVERY scrollable ancestor, and `overflow: hidden` counts:
 * a clipped box cannot be scrolled with a finger but can be scrolled by
 * script, and that is what the browser does on the way up the tree.
 *
 * The home hero is `overflow-hidden`, and its decorative cubes hang below its
 * bottom edge, so it has real scrollable height. Pointing at the shortcuts , 
 * which live inside it, scrolled the hero's own contents up by about 35px.
 * The curve at the foot of the panel is positioned against the scrolled
 * content rather than the visible box, so it travelled up with it and was
 * drawn across the middle of the panel, with the panel's red carrying on
 * below it. Nothing ever put it back: the damage outlasted the tour.
 *
 * So the tour no longer calls `scrollIntoView` at all. `reveal` in
 * `src/lib/reveal.ts` scrolls the one container that is genuinely scrollable,
 * the window in almost every case, and `healClipped` beside it resets anything
 * that merely clips, which also repairs a screen an earlier build broke.
 *
 * WHERE THE CARD SITS
 *
 * Against one edge and nowhere else. It used to be placed under the
 * highlighted element, or above it when there was no room below, which meant
 * it moved on every step and could sit over the header. Now there are two
 * positions on any screen and the card only ever swaps between them when it
 * would otherwise cover the thing it is describing:
 *
 *   wide screens    a rail down the right, flipping to the left
 *   phones          a dock at the bottom, flipping to the top
 *
 * WHAT IT COSTS
 *
 * One measurement per step, and one more on resize or scroll. No timers, no
 * animation loop, and nothing at all when the tour is closed, the whole
 * component returns null.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { healClipped, reveal } from '@/lib/reveal';
import type { TourStep } from '@/lib/tour';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Breathing room around the highlighted element. */
const PAD = 6;
const CARD_WIDTH = 320;
/** Space between the card and the edge of the screen. */
const EDGE = 16;
/** Space between the card and the spotlight, when the two must sit together. */
const GAP = 12;
/** Below this width there is no room for a card beside the page. */
const RAIL_MIN_WIDTH = 760;

/**
 * The first copy of an anchor that is actually drawn.
 *
 * Several anchors exist twice, the laptop's shortcut grid and the phone's, the
 * header photograph and the panel's, with one of each pair hidden at any
 * width. `querySelector` returns the first in the document whether it is on
 * screen or not, which pointed the tour at a hidden element and skipped the
 * step on a phone.
 */
function findAnchor(anchor: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`);
  for (const el of Array.from(all)) {
    const rect = el.getBoundingClientRect();
    if (rect.width >= 4 && rect.height >= 4) return el;
  }
  return null;
}

function measure(anchor: string | undefined): Box | null {
  if (!anchor) return null;
  const el = findAnchor(anchor);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // A zero-size box is an element that is present but not drawn at this width
  //, the desktop rail on a phone, say. Treat it as absent.
  if (rect.width < 4 || rect.height < 4) return null;
  return {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
}

/* ------------------------------------------------------ where the card goes */

export type Side = 'right' | 'left' | 'bottom' | 'top' | 'center';

export interface Spot {
  side: Side;
  style: { left: number; top?: number; bottom?: number };
}

/**
 * An edge, chosen so the card never covers the spotlight.
 *
 * On a wide screen the card lives in a rail down the right. It moves to the
 * left rail only when the highlighted element reaches into the right one , 
 * the shortcuts grid on a laptop spans the full width, so that case is real.
 * When an element reaches into both, no rail fits and the card docks at the
 * foot of the screen.
 *
 * A docked card normally sits `EDGE` off the bottom, in the same place for
 * every step. When the spotlight itself comes down into the dock, the step
 * pointing at the bottom bar on a phone, the dock rises just far enough to
 * clear it rather than jumping to the opposite end of the screen. Only when
 * even that leaves no room does the card go to the top, which is the one
 * position it is never asked to take otherwise.
 *
 * `cardH` is measured, not assumed. Guessing it is what let the card's foot
 * settle a few pixels over the thing it was describing.
 */
function place(
  box: Box | null,
  viewportW: number,
  viewportH: number,
  cardW: number,
  cardH: number,
): Spot {
  const centred = Math.round((viewportW - cardW) / 2);
  const middle = Math.max(EDGE, Math.round((viewportH - cardH) / 2));

  if (!box) return { side: 'center', style: { left: centred, top: middle } };

  if (viewportW >= RAIL_MIN_WIDTH) {
    const railW = cardW + EDGE * 2;
    if (box.left + box.width <= viewportW - railW) {
      return { side: 'right', style: { left: viewportW - cardW - EDGE, top: middle } };
    }
    if (box.left >= railW) {
      return { side: 'left', style: { left: EDGE, top: middle } };
    }
  }

  // Docked at the foot, raised over the spotlight only if it reaches down here.
  const restingTop = viewportH - EDGE - cardH;
  if (box.top + box.height <= restingTop) {
    return { side: 'bottom', style: { left: centred, bottom: EDGE } };
  }

  const raised = Math.round(viewportH - box.top + GAP);
  if (viewportH - raised - cardH >= EDGE) {
    return { side: 'bottom', style: { left: centred, bottom: raised } };
  }

  return { side: 'top', style: { left: centred, top: EDGE } };
}

export function Tour({
  steps,
  onClose,
}: {
  steps: TourStep[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  /*
   * The card's real height, measured after it draws.
   *
   * The bodies differ by a hundred pixels between the shortest step and the
   * longest, so a constant here is a guess that is wrong on most steps, and
   * being wrong low is what let the card's foot rest over the spotlight. The
   * opening value is only what the first frame uses before the measurement
   * lands.
   */
  const [cardH, setCardH] = useState(236);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = steps[index];
  const last = index === steps.length - 1;

  /*
   * Bring the target into view first, then measure it.
   *
   * `useLayoutEffect` so the first paint of a step already has its panels in
   * the right place; measuring in a plain effect makes the dimming visibly
   * jump into position on a slow phone.
   */
  const sync = useCallback(() => setBox(measure(step?.anchor)), [step?.anchor]);

  useLayoutEffect(() => {
    if (!step) return;
    const el = step.anchor ? findAnchor(step.anchor) : null;
    if (el) reveal(el);
    sync();
    // One more pass after the smooth scroll has settled. Cheap, and it is the
    // difference between the ring landing on the element and landing where the
    // element was.
    const settle = window.setTimeout(sync, 320);
    return () => window.clearTimeout(settle);
  }, [step, sync]);

  /*
   * Put every anchor's ancestors back as the tour closes.
   *
   * Belt and braces: `bringIntoView` no longer scrolls a clipped box, but a
   * screen that an older build already pulled apart stays that way until
   * something resets it, and the tour is the one thing on the page that knows
   * which elements are involved.
   */
  useEffect(() => {
    return () => {
      for (const s of steps) {
        if (s.anchor) healClipped(findAnchor(s.anchor));
      }
    };
  }, [steps]);

  useEffect(() => {
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [sync]);

  /* Held, not depended on. See the note in `ui/overlay.tsx`. */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(steps.length - 1, i + 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [steps.length]);

  /*
   * The card takes focus when the step changes, so a screen reader reads the
   * new step, and never merely because the screen behind re-rendered.
   *
   * `preventScroll` because the alternative is the browser scrolling the card
   * into view, and the card is fixed: there is nothing to scroll to, but the
   * attempt is another walk up the tree setting scroll offsets on the way.
   */
  useEffect(() => {
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) card.focus({ preventScroll: true });
  }, [index]);

  /*
   * Measure the card once it has drawn, so the next frame can place it.
   *
   * Deliberately without a dependency list: the height changes with the step's
   * text, with the width of the screen, and with whatever font has finished
   * loading, and every one of those arrives as an ordinary render. The
   * one-pixel guard is what stops it looping, it settles on the second frame
   * and then does nothing at all.
   */
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const height = card.offsetHeight;
    if (height > 0 && Math.abs(height - cardH) > 1) setCardH(height);
  });

  if (!step) return null;

  const viewportW = typeof window === 'undefined' ? 360 : window.innerWidth;
  const viewportH = typeof window === 'undefined' ? 640 : window.innerHeight;
  const width = Math.min(CARD_WIDTH, viewportW - EDGE * 2);
  const { style: cardStyle } = place(box, viewportW, viewportH, width, cardH);

  const dim = 'fixed bg-brand-950/70 backdrop-blur-[1px]';

  return createPortal(
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Tour">
      {box ? (
        <>
          {/* the four panels that leave the target uncovered */}
          <div className={cn(dim, 'left-0 right-0 top-0')} style={{ height: Math.max(0, box.top) }} onClick={onClose} />
          <div className={cn(dim, 'left-0 right-0 bottom-0')} style={{ top: box.top + box.height }} onClick={onClose} />
          <div className={cn(dim, 'left-0')} style={{ top: box.top, height: box.height, width: Math.max(0, box.left) }} onClick={onClose} />
          <div className={cn(dim, 'right-0')} style={{ top: box.top, height: box.height, left: box.left + box.width }} onClick={onClose} />

          <div
            aria-hidden
            className="pointer-events-none fixed rounded-2xl ring-2 ring-white/90 transition-all duration-200"
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
          />
        </>
      ) : (
        <div className={cn(dim, 'inset-0')} onClick={onClose} />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        /*
         * `transition-none` on the position itself is deliberate. The card
         * holds one place for the whole tour and only ever swaps rails, and a
         * sliding card is the thing that read as the screen moving about.
         */
        className="fixed z-10 rounded-2xl border border-hairline surface-card p-4 shadow-pop outline-none animate-scale-in"
        style={{ ...cardStyle, width }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {index + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the tour"
            className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-primary"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <h2 className="mt-1.5 text-[16px] font-bold leading-tight text-primary">{step.title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-secondary">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-5 bg-brand-600 dark:bg-brand-500' : 'w-1.5 bg-[var(--border-strong)]',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="tap rounded-lg px-3 text-[13.5px] font-semibold text-secondary transition-colors hover:text-primary"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? onClose() : setIndex(index + 1))}
              className="tap inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-800"
            >
              {last ? 'Done' : 'Next'}
              {!last && <ArrowRight size={14} aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
