/**
 * Six dots and a round keypad, the same on the lock screen and when setting
 * the PIN. `tone="hero"` is white on the brand colour; `tone="card"` sits on an
 * ordinary card. The physical keyboard works too: digits, Backspace.
 */

import { useEffect } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PIN_LENGTH } from '@/lib/pinLocal';

export function PinDots({ count, tone, shake }: { count: number; tone: 'hero' | 'card'; shake?: boolean }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-3.5 rounded-2xl px-6 py-4',
        tone === 'hero' ? 'bg-white/12 ring-1 ring-white/15' : 'surface-sunken ring-1 ring-[var(--border-hairline)]',
        shake && 'pin-shake',
      )}
      aria-label={`${count} of ${PIN_LENGTH} digits entered`}
      role="status"
    >
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-3.5 w-3.5 rounded-full transition-all duration-150',
            i < count
              ? tone === 'hero'
                ? 'scale-110 bg-white'
                : 'scale-110 bg-brand-600 dark:bg-brand-400'
              : tone === 'hero'
                ? 'bg-white/30'
                : 'bg-[var(--text-muted)]/30',
          )}
        />
      ))}
    </div>
  );
}

export function PinPad({
  length,
  onDigit,
  onBack,
  tone,
  disabled,
  listen = true,
  fit = false,
}: {
  length: number;
  onDigit: (d: string) => void;
  onBack: () => void;
  tone: 'hero' | 'card';
  disabled?: boolean;
  /** Take digits from the physical keyboard. Off when two pads share a screen. */
  listen?: boolean;
  /** Size the keys to the screen's height, so the lock screen never scrolls. */
  fit?: boolean;
}) {
  useEffect(() => {
    if (!listen) return;
    const key = (e: KeyboardEvent) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        onDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [listen, disabled, onDigit, onBack]);

  const size = fit
    ? 'h-[clamp(48px,8.4dvh,74px)] w-[clamp(48px,8.4dvh,74px)] text-[clamp(1.25rem,3.1dvh,1.65rem)]'
    : 'h-[68px] w-[68px] text-[1.65rem] sm:h-[74px] sm:w-[74px]';
  const keyClass = cn(
    'flex select-none items-center justify-center rounded-full font-semibold transition-[transform,background-color] duration-100 active:scale-95 disabled:opacity-50',
    size,
    'focus:outline-none focus-visible:ring-2',
    tone === 'hero'
      ? 'bg-white/14 text-white hover:bg-white/22 active:bg-white/30 focus-visible:ring-white'
      : 'surface-sunken text-primary hover:bg-[var(--border-hairline)] focus-visible:ring-brand-500',
  );

  const digit = (d: string) => (
    <button key={d} type="button" className={keyClass} disabled={disabled || length >= PIN_LENGTH} onClick={() => onDigit(d)}>
      {d}
    </button>
  );

  return (
    <div
      className={cn(
        'grid grid-cols-3 justify-items-center',
        fit ? 'gap-x-[clamp(1.25rem,3.2dvh,1.75rem)] gap-y-[clamp(0.5rem,1.8dvh,1rem)]' : 'gap-x-6 gap-y-4 sm:gap-x-7',
      )}
    >
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit)}
      <span aria-hidden />
      {digit('0')}
      <button
        type="button"
        aria-label="Delete last digit"
        disabled={disabled || length === 0}
        onClick={onBack}
        className={cn(
          'flex items-center justify-center rounded-full transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2',
          fit ? 'h-[clamp(48px,8.4dvh,74px)] w-[clamp(48px,8.4dvh,74px)]' : 'h-[68px] w-[68px] sm:h-[74px] sm:w-[74px]',
          tone === 'hero' ? 'text-white hover:bg-white/10 focus-visible:ring-white' : 'text-primary hover:bg-[var(--surface-sunken)] focus-visible:ring-brand-500',
        )}
      >
        <Delete size={26} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}
