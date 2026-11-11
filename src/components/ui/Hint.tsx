/**
 * Explanations, folded away until somebody wants them.
 *
 * THE PROBLEM THIS SOLVES
 *
 * This app explains itself well, which turned into its own fault. Nearly every
 * card carried a paragraph under the heading and a note under the last field,
 * and a screen that is three-quarters prose is a screen a bursar scrolls past.
 * Worse, the paragraphs are different lengths, so two cards side by side never
 * line up and the page looks unfinished.
 *
 * The explanations are good and worth keeping: they answer real questions
 * ("does changing this affect my other child?"). They just should not be shouted
 * at somebody who already knows. So: a small (i) beside the thing it describes,
 * and the text appears when asked for.
 *
 * WHY A DISCLOSURE AND NOT A TOOLTIP
 *
 * Tooltips need hover, and half of this app's users are on a phone where hover
 * does not exist. A tooltip is also invisible to a screen reader unless it is
 * built with some care, and it vanishes the moment the pointer drifts: which is
 * unusable for anything longer than three words.
 *
 * This is a button that opens a panel. It works on a touchscreen, it can be read
 * at leisure, it can be copied, and `aria-expanded` plus `aria-controls` make it
 * a first-class control rather than decoration.
 *
 * WHY THE TEXT IS NOT RENDERED WHEN CLOSED
 *
 * Keeping it mounted and hidden with CSS would preserve the card's height, which
 * is exactly what we do not want: the whole point is that a closed card is the
 * same compact size as every other closed card. It unmounts.
 *
 * WHY THE PANEL IS FIXED TO THE VIEWPORT RATHER THAN THE BUTTON
 *
 * It used to be `absolute` beside the (i), which is fine in the middle of a
 * form and wrong everywhere else. A Hint at the end of a page header sits
 * within a couple of hundred pixels of the right edge, so a panel opening
 * rightward from it ran off the screen and all anybody saw was a sliver of
 * text with no way to scroll to the rest. The `align="right"` prop was the
 * patch for that, which only works if whoever adds the next Hint remembers to
 * think about it, and it cannot help at all when an ancestor clips overflow,
 * as the page header's banner does.
 *
 * Measuring and fixing to the viewport removes the judgement call: the panel
 * opens under the button, is pulled back inside whichever edge it would have
 * crossed, and flips above the button when there is more room up there. It
 * cannot be clipped by an ancestor because it is not inside one. `align` is
 * still accepted so no call site breaks, but it is only a starting preference
 * now, not a promise.
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Clearance from the window edge, so the panel never looks wedged in. */
const MARGIN = 10;

export function Hint({
  children,
  label = 'Why this matters',
  className,
  align = 'left',
}: {
  children: ReactNode;
  /** What the button announces to a screen reader. Name the subject. */
  label?: string;
  className?: string;
  /** `right` when the (i) sits at the end of a row rather than after a label. */
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);

  /**
   * Put the panel where it actually fits.
   *
   * Below the button by default, flipped above when the space below is too
   * tight and there is more of it above, and pulled back inside whichever
   * side edge it would have crossed. Measured from the rendered panel rather
   * than a guess at its width, because the text decides how wide it is.
   */
  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect();
    const p = panel.current?.getBoundingClientRect();
    if (!b || !p) return;

    const below = window.innerHeight - b.bottom - MARGIN;
    const flip = p.height > below && b.top - MARGIN > below;

    const preferred = align === 'right' ? b.right - p.width : b.left;
    const left = Math.min(Math.max(MARGIN, preferred), window.innerWidth - p.width - MARGIN);
    const top = flip ? b.top - p.height - 6 : b.bottom + 6;
    setAt({ top, left });
  }, [align]);

  /* Measure once the panel exists, before the browser paints it. */
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  /* Scrolling or resizing moves the button, so the panel follows or closes. */
  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  return (
    <span className={cn('inline-flex', className)}>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
          'text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-brand-700',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
          open && 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
        )}
      >
        <Info size={13} />
      </button>

      {open && (
        /*
         * Fixed, so opening it neither pushes the card's contents down nor
         * lets an ancestor with hidden overflow cut it off. `max-w` rather
         * than a fixed width: on a phone it fills the column, on a desktop it
         * stays a readable measure.
         *
         * Hidden until placed. The first paint happens at 0,0 so the panel
         * can be measured, and showing that frame would read as the tooltip
         * jumping in from the corner of the screen.
         */
        <span
          ref={panel}
          id={id}
          role="note"
          style={{ top: at?.top ?? 0, left: at?.left ?? 0, visibility: at ? 'visible' : 'hidden' }}
          className={cn(
            'fixed z-50 block w-max max-w-[min(19rem,calc(100vw-1.25rem))] rounded-xl border border-hairline',
            /* `text-left` explicitly: a Hint inside a centred block (an empty
               state) would otherwise inherit `text-center` and set its
               paragraph ragged on both edges, which is hard to read. */
            'surface-card p-3 pr-7 text-left text-caption leading-relaxed text-secondary shadow-card',
          )}
        >
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted transition-colors hover:bg-[var(--surface-sunken)]"
          >
            <X size={12} />
          </button>
        </span>
      )}
    </span>
  );
}

