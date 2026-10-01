/**
 * The panel the booking wizard lives in.
 *
 * WHY NOT THE APP'S `Modal`
 *
 * The app's dialog is built for a form an administrator opens inside a screen
 * they are already looking at: a title bar, a scrolling body, a row of
 * buttons. This is different. It takes over: on a phone it is the whole
 * screen, on a laptop it is a card with a progress rail across the top and no
 * visible chrome competing with the one question being asked. Bending the
 * app's dialog into that shape would have changed it for every screen in the
 * portal that uses it, which is exactly the kind of edit a redesign should not
 * make.
 *
 * It does the unglamorous parts properly: escape closes it, the page behind
 * cannot scroll while it is open, focus starts inside it and is returned to
 * whatever opened it, and a tap on the backdrop closes it.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Sheet({
  open,
  onClose,
  label,
  children,
  progress,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  /** Read out to a screen reader. The visible heading is inside `children`. */
  label: string;
  children: ReactNode;
  /** 0 to 1. Draws the rail across the top; omit for no rail. */
  progress?: number;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  /*
   * The close handler is held in a ref instead of being a dependency.
   *
   * `onClose` here is an inline arrow from the page, so it is a different
   * function on every render, and the sheet's own state changes on every
   * keystroke. Depending on it meant this effect ran again after each
   * character typed and its last act was to move focus to the panel: one
   * letter went in, the caret disappeared, and the rest of the word went
   * nowhere. The same fault is documented at length in `ui/overlay.tsx`.
   */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };

    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      /* Put the caret back where the visitor left it, so closing the sheet
         does not dump keyboard focus at the top of the document. */
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open]);

  /* Once, on opening, and never over a field that already has the caret. */
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-night/80 backdrop-blur-md" onClick={onClose} aria-hidden />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'ink relative isolate z-10 flex h-full w-full animate-scale-in flex-col overflow-hidden border-white/10 outline-none',
          'sm:h-auto sm:max-h-[92vh] sm:rounded-[1.75rem] sm:border sm:shadow-pop',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        {/* The green light over the top of the sheet, as on the front page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(16,185,129,0.20),rgba(16,185,129,0)_70%)]"
        />

        {progress !== undefined && (
          <div className="h-1 w-full shrink-0 bg-[var(--surface-sunken)]" aria-hidden>
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: `${Math.max(4, Math.min(100, progress * 100))}%` }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap absolute right-3 top-3 z-20 inline-flex items-center justify-center rounded-full text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
          style={{ marginTop: progress !== undefined ? '0.25rem' : 0 }}
        >
          <X size={19} />
        </button>

        {children}
      </div>
    </div>,
    document.body,
  );
}
