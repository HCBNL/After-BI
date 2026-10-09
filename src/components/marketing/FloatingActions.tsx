/**
 * The two controls that follow the page down: help, and back to the top.
 *
 * WHY THEY ARE ONE COMPONENT AND NOT TWO
 *
 * Because they share a corner, and two components sharing a corner is how you
 * end up with one sitting on top of the other on a phone in landscape. One
 * stack, one set of insets, one z-index.
 *
 * "Help" is a word, because it opens a menu that needs explaining; back to
 * the top is the arrow everybody already reads that way.
 *
 * WHAT HELP DOES
 *
 * It opens a small menu rather than firing an email client straight away. A
 * person who reaches for help wants one of three things: to ask a question,
 * to see it working, or to get on with it. The menu offers exactly those.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SUPPORT_EMAIL } from '@/lib/constants';

export function FloatingActions({
  onCreate,
  onBook,
}: {
  onCreate: () => void;
  onBook: () => void;
  /** Kept for callers; the button always opens GetSchool's own line. */
  whatsapp?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [awake, setAwake] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  /* The top button earns its place only once the top is out of sight. Help
     waits for the first screen to scroll away: that screen always carries its
     own buttons, and on a phone a floating one would sit on top of them. */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 1.5);
      setAwake(window.scrollY > 360);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* A tap anywhere else, or Escape, closes the menu. */
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  const item =
    'tap flex w-full items-center rounded-lg px-3.5 text-left text-[14.5px] font-semibold text-primary transition-colors hover:bg-[var(--surface-sunken)]';

  return (
    <div
      ref={wrap}
      className="fixed bottom-0 right-0 z-40 flex flex-col items-end gap-2 p-4 sm:p-5"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      {open && (
        <div
          role="menu"
          aria-label="Get help"
          className="surface-card w-[14.5rem] origin-bottom-right animate-scale-in rounded-xl border border-hairline p-1.5 shadow-pop"
        >
          <a href={`mailto:${SUPPORT_EMAIL}`} className={item} role="menuitem">
            Email us
          </a>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onBook();
            }}
          >
            Book a walkthrough
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
          >
            Create your school
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={toTop}
        tabIndex={scrolled ? 0 : -1}
        aria-hidden={!scrolled}
        aria-label="Back to the top"
        className={cn(
          'tap inline-flex h-11 w-11 items-center justify-center rounded-full bg-night-3 text-white shadow-pop ring-1 ring-inset ring-white/25 transition-all duration-300 hover:bg-[#26324f]',
          scrolled ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        <ArrowUp size={18} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        tabIndex={awake || open ? 0 : -1}
        aria-hidden={!(awake || open)}
        className={cn(
          'tap inline-flex items-center justify-center rounded-full bg-brand-600 px-5 text-[14px] font-bold text-white shadow-pop transition-all duration-300 hover:bg-brand-700 active:scale-95',
          awake || open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        {open ? 'Close' : 'Help'}
      </button>

    </div>
  );
}
