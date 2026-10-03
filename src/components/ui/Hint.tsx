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
 */

import { useId, useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

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

  return (
    <span className={cn('inline-flex', className)}>
      <button
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
         * Absolutely positioned, so opening it does not push the rest of the
         * card down and shunt the button out from under the finger that just
         * pressed it. `max-w` rather than a fixed width: on a phone it fills the
         * column, on a desktop it stays a readable measure.
         */
        <span className="relative">
          <span
            id={id}
            role="note"
            className={cn(
              'absolute top-6 z-20 block w-max max-w-[min(19rem,72vw)] rounded-xl border border-hairline',
              'surface-card p-3 pr-7 text-[12px] leading-relaxed text-secondary shadow-card',
              align === 'right' ? 'right-0' : 'left-0',
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
        </span>
      )}
    </span>
  );
}

/**
 * The same thing, sized for the foot of a card rather than beside a label.
 *
 * Where a card previously ended in a boxed paragraph, this puts a single quiet
 * line there instead: so every card ends at the same height whether or not it
 * has something to explain.
 */
export function HintFooter({ children, label = 'More about this' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="mt-3 border-t border-hairline pt-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted transition-colors hover:text-brand-700 dark:hover:text-brand-300"
      >
        <Info size={13} />
        {label}
      </button>
      {open && (
        <p id={id} className="mt-2 text-[12px] leading-relaxed text-secondary">
          {children}
        </p>
      )}
    </div>
  );
}
