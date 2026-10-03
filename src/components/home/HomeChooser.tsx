/**
 * "Choose your home screen": the sheet behind the layout button.
 *
 * Two small drawings of the two screens, side by side, and one button. The
 * drawings are built from the same colours as the real screens (the panel is
 * `--hero`, the page is `--surface-page`), so they are right in dark mode too
 * and cannot drift into advertising a screen that no longer looks like that.
 *
 * Picking a drawing does not change anything until "Save and close", which is
 * the reference app's shape and the right one: somebody comparing the two is
 * not asking for the screen behind the sheet to jump each time they look.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  HOME_LAYOUTS,
  markChooserSeen,
  useHomeLayout,
  type HomeLayout,
} from '@/hooks/useHomeLayout';

function Line({ className }: { className?: string }) {
  return <span className={cn('block h-[5px] rounded-full', className)} />;
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <span className="relative block aspect-[9/16] w-full overflow-hidden bg-[var(--surface-page)]">
      {children}
      <span className="absolute inset-x-0 bottom-0 flex h-[9%] items-center justify-around border-t border-hairline surface-card px-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn('block h-1.5 w-1.5 rounded-full', i === 0 ? 'bg-brand-600' : 'bg-[var(--border-strong)]')}
          />
        ))}
      </span>
    </span>
  );
}

/* The curve, in miniature: the page rising over the panel. */
function Lip() {
  return <span className="absolute inset-x-0 bottom-0 block h-[10px] rounded-t-[10px] bg-[var(--surface-page)]" />;
}

function TilesPreview() {
  return (
    <Phone>
      <span className="ab-hero relative block px-[9%] pb-[16%] pt-[9%]">
        <span className="flex items-start justify-between">
          <span className="block w-1/2 space-y-1">
            <Line className="w-2/3 bg-white/50" />
            <Line className="w-full bg-white/90" />
          </span>
          <span className="block h-[20px] w-[20px] rounded-full border border-white/50 bg-white/25" />
        </span>
        <span className="mt-[10%] grid grid-cols-4 gap-[5px]">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="block aspect-square rounded-[5px] bg-white/[0.16]" />
          ))}
        </span>
        <Lip />
      </span>
      <span className="block space-y-[6px] px-[9%] pt-[3%]">
        <span className="block space-y-[6px] rounded-[8px] border border-hairline p-[7px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex items-center gap-[5px]">
              <span className={cn('block h-[9px] w-[9px] rounded-[3px]', i === 2 ? 'bg-status-good/60' : 'bg-gold-400/80')} />
              <Line className="flex-1 bg-[var(--border-strong)]" />
            </span>
          ))}
        </span>
        <span
          className="block h-[30px] rounded-[8px]"
          style={{ backgroundImage: 'linear-gradient(140deg, var(--ground-a), var(--ground-c))' }}
        />
      </span>
    </Phone>
  );
}

function CardsPreview() {
  return (
    <Phone>
      <span className="ab-hero relative block px-[9%] pb-[15%] pt-[8%]">
        <span className="flex items-center justify-between">
          <span className="flex gap-[4px]">
            <span className="block h-[7px] w-[9px] rounded-[2px] bg-white/70" />
            <span className="block h-[7px] w-[7px] rounded-full bg-white/70" />
          </span>
          <span className="block h-[16px] w-[16px] rounded-full border border-white/50 bg-white/25" />
        </span>
        <span className="mt-[8%] block w-1/2 space-y-1">
          <Line className="w-2/3 bg-white/50" />
          <Line className="w-full bg-white/90" />
        </span>
        <span className="mt-[8%] block rounded-[9px] border border-white/20 bg-white/[0.12] p-[7px]">
          <Line className="w-1/3 bg-white/60" />
          <span className="mt-[6px] block h-[12px] w-1/2 rounded-[4px] bg-white/90" />
          <Line className="mt-[6px] w-3/4 bg-white/40" />
        </span>
        <span className="mt-[6px] flex justify-center gap-[3px]">
          <span className="block h-[3px] w-[10px] rounded-full bg-white" />
          <span className="block h-[3px] w-[3px] rounded-full bg-white/40" />
          <span className="block h-[3px] w-[3px] rounded-full bg-white/40" />
        </span>
        <Lip />
      </span>
      <span className="block px-[9%] pt-[3%]">
        <span className="grid grid-cols-2 overflow-hidden rounded-[8px] border border-hairline">
          {Array.from({ length: 4 }, (_, i) => (
            <span
              key={i}
              className={cn(
                'flex items-center gap-[4px] p-[6px]',
                i < 2 && 'border-b border-hairline',
                i % 2 === 0 && 'border-r border-hairline',
              )}
            >
              <span className="block h-[8px] w-[8px] shrink-0 rounded-[3px] bg-brand-200 dark:bg-brand-500/40" />
              <Line className="flex-1 bg-[var(--border-strong)]" />
            </span>
          ))}
        </span>
        <span className="mt-[6px] block space-y-[5px] rounded-[8px] border border-hairline p-[7px]">
          <Line className="w-3/4 bg-[var(--border-strong)]" />
          <Line className="w-1/2 bg-[var(--border-strong)]" />
        </span>
      </span>
    </Phone>
  );
}

/* laptop drawings */

/** True from 1024px, where the home screen is the laptop one. */
function useWide(): boolean {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setWide(list.matches);
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, []);
  return wide;
}

const MINI_GROUNDS = [
  'linear-gradient(140deg, var(--ground-a), var(--ground-c))',
  'linear-gradient(140deg, #2b313b, #0b0d10)',
  'linear-gradient(140deg, #b45309, #5c2406)',
];

function Laptop({ children }: { children: ReactNode }) {
  return (
    <span className="relative flex aspect-[16/10] w-full overflow-hidden bg-[var(--surface-page)]">
      <span className="flex w-[15%] shrink-0 flex-col gap-[5px] border-r border-hairline surface-card px-[5px] py-[7px]">
        <span className="block h-[6px] w-4/5 rounded-full bg-brand-600/70" />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="block h-[4px] w-full rounded-full bg-[var(--border-strong)]" />
        ))}
      </span>
      <span className="relative block min-w-0 flex-1">{children}</span>
    </span>
  );
}

function LaptopHead() {
  return (
    <span className="flex items-center gap-[6px]">
      <span className="block h-[18px] w-[18px] shrink-0 rounded-full border border-white/50 bg-white/25" />
      <span className="block w-1/3 space-y-[3px]">
        <Line className="w-1/2 bg-white/50" />
        <Line className="w-full bg-white/90" />
      </span>
    </span>
  );
}

function LaptopFoot() {
  return (
    <span className="mt-[4px] grid grid-cols-3 gap-[4px]">
      <span className="col-span-2 block space-y-[4px] rounded-[4px] border border-hairline p-[4px]">
        <Line className="w-2/3 bg-[var(--border-strong)]" />
        <Line className="w-1/2 bg-[var(--border-strong)]" />
      </span>
      <span className="block rounded-[4px] border border-hairline" />
    </span>
  );
}

function LaptopTilesPreview() {
  return (
    <Laptop>
      <span className="ab-hero relative block px-[6%] pb-[8%] pt-[5%]">
        <LaptopHead />
        <span className="mt-[5%] grid grid-cols-8 gap-[3px]">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="block aspect-square rounded-[3px] bg-white/[0.16]" />
          ))}
        </span>
        <Lip />
      </span>
      <span className="block px-[6%] pt-[2%]">
        <span className="grid grid-cols-3 gap-[4px]">
          {MINI_GROUNDS.map((ground) => (
            <span key={ground} className="block h-[14px] rounded-[4px]" style={{ backgroundImage: ground }} />
          ))}
        </span>
        <LaptopFoot />
      </span>
    </Laptop>
  );
}

function LaptopCardsPreview() {
  return (
    <Laptop>
      <span className="ab-hero relative block px-[6%] pb-[8%] pt-[5%]">
        <LaptopHead />
        <span className="mt-[6%] grid grid-cols-3 gap-[4px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block rounded-[5px] border border-white/20 bg-white/[0.12] p-[4px]">
              <Line className="w-1/2 bg-white/60" />
              <span className="mt-[4px] block h-[8px] w-2/3 rounded-[3px] bg-white/90" />
            </span>
          ))}
        </span>
        <Lip />
      </span>
      <span className="block px-[6%] pt-[2%]">
        <span className="grid grid-cols-8 gap-[3px] rounded-[4px] border border-hairline p-[4px]">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="block aspect-square rounded-[3px] bg-brand-200 dark:bg-brand-500/40" />
          ))}
        </span>
        <LaptopFoot />
      </span>
    </Laptop>
  );
}

export function HomeChooser({ open, onClose, uid }: { open: boolean; onClose: () => void; uid: string }) {
  const [layout, setLayout] = useHomeLayout(uid);
  const wide = useWide();
  const [picked, setPicked] = useState<HomeLayout>(layout);
  const panel = useRef<HTMLDivElement>(null);

  /* Held, not depended on. See the note in `ui/overlay.tsx`. */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    setPicked(layout);
    markChooserSeen();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
    // Only on opening: the current layout is read once, as the starting pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/55 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-chooser-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-t-[28px] surface-card px-5 pb-safe-6 pt-3 shadow-pop outline-none animate-slide-up sm:rounded-[28px] sm:pb-6 lg:max-w-2xl lg:px-8 lg:pb-8 lg:pt-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap absolute right-2 top-2 flex items-center justify-center rounded-full text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
        >
          <X size={19} aria-hidden />
        </button>

        <h2 id="home-chooser-title" className="px-8 text-center font-display text-[20px] font-bold text-primary">
          Choose your home screen
        </h2>
        <p className="mx-auto mt-1.5 max-w-[19rem] text-center text-[13px] leading-snug text-muted">
          Both have everything. They differ in what you see first.
        </p>

        <div role="radiogroup" aria-label="Home screen" className="mt-5 grid grid-cols-2 gap-3.5 lg:gap-6">
          {HOME_LAYOUTS.map((option) => {
            const active = picked === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPicked(option.id)}
                className="rounded-[22px] text-center"
              >
                <span
                  className={cn(
                    'relative block overflow-hidden rounded-[20px] border-2 transition-colors',
                    active ? 'border-brand-600 dark:border-brand-500' : 'border-hairline',
                  )}
                >
                  {option.id === 'tiles' ? (
                    wide ? <LaptopTilesPreview /> : <TilesPreview />
                  ) : wide ? (
                    <LaptopCardsPreview />
                  ) : (
                    <CardsPreview />
                  )}
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/35 dark:bg-black/35">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-900 text-white shadow-pop ring-4 ring-white/70 dark:bg-brand-500 dark:ring-black/40">
                        <Check size={28} strokeWidth={2.6} aria-hidden />
                      </span>
                    </span>
                  )}
                </span>
                <span className="mt-2.5 block text-[14.5px] font-bold text-primary">{option.name}</span>
                <span className="block text-[12px] text-muted">{option.description}</span>
              </button>
            );
          })}
        </div>

        <Button
          full
          size="lg"
          className="mt-6"
          onClick={() => {
            setLayout(picked);
            onClose();
          }}
        >
          Save and close
        </Button>
      </div>
    </div>,
    document.body,
  );
}
