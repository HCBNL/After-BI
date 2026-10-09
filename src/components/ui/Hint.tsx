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
 * The explanations are good and worth keeping — they answer real questions
 * ("does changing this affect my other child?"). They just should not be shouted
 * at somebody who already knows. So: a small (i) beside the thing it describes,
 * and the text appears when asked for.
 *
 * WHY A DISCLOSURE AND NOT A TOOLTIP
 *
 * Tooltips need hover, and half of this app's users are on a phone where hover
 * does not exist. A tooltip is also invisible to a screen reader unless it is
 * built with some care, and it vanishes the moment the pointer drifts — which is
 * unusable for anything longer than three words.
 *
 * This is a button that opens a panel. It works on a touchscreen, it can be read
 * at leisure, it can be copied, and `aria-expanded` plus `aria-controls` make it
 * a first-class control rather than decoration.
 *
 * WHY THE TEXT IS NOT RENDERED WHEN CLOSED
 *
 * Keeping it mounted and hidden with CSS would preserve the card's height, which
 * is exactly what we do not want — the whole point is that a closed card is the
 * same compact size as every other closed card. It unmounts.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The note floats above the page (portalled to <body>, fixed to the button),
 * so a card, a table cell or the coloured page panel with `overflow: hidden`
 * can never clip it. It closes on a tap outside, on Escape, and when the page
 * scrolls, since a fixed note would otherwise drift away from its (i).
 */
export function Hint({
  children,
  label = 'Why this matters',
  className,
  align = 'left',
  onDark = false,
}: {
  children: ReactNode;
  /** What the button announces to a screen reader. Name the subject. */
  label?: string;
  className?: string;
  /** `right` when the (i) sits at the end of a row rather than after a label. */
  align?: 'left' | 'right';
  /** On a coloured panel: a white (i) instead of a grey one. */
  onDark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState<{ top: number; left: number } | null>(null);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const note = useRef<HTMLSpanElement>(null);

  const place = () => {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    /* The note is at most 19rem (304px) wide and never wider than the screen
       less an 8px margin each side. Start it under the (i) (or end it there,
       for align="right"), then slide it back inside the screen. */
    const width = Math.min(304, window.innerWidth - 16);
    const wanted = align === 'right' ? rect.right + 4 - width : rect.left - 4;
    const left = Math.min(Math.max(8, wanted), window.innerWidth - 8 - width);
    setSpot({ top: rect.bottom + 6, left });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (note.current?.contains(target) || button.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className={cn('inline-flex', className)}>
      <button
        ref={button}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
          onDark
            ? 'text-white/70 transition-colors hover:bg-white/15 hover:text-white'
            : 'text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-brand-700',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
          open && !onDark && 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
          open && onDark && 'bg-white/20 text-white',
        )}
      >
        <Info size={13} />
      </button>

      {open &&
        spot &&
        createPortal(
          <span
            ref={note}
            id={id}
            role="note"
            style={{ top: spot.top, left: spot.left, width: Math.min(304, window.innerWidth - 16) }}
            className={cn(
              'fixed z-[80] block rounded-xl border border-hairline',
              'surface-card p-3 pr-7 text-left text-[12px] font-normal normal-case leading-relaxed tracking-normal text-secondary shadow-pop animate-scale-in',
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
          </span>,
          document.body,
        )}
    </span>
  );
}

/**
 * The same thing, sized for the foot of a card rather than beside a label.
 *
 * Where a card previously ended in a boxed paragraph, this puts a single quiet
 * line there instead — so every card ends at the same height whether or not it
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
