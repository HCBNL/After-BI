/**
 * The hide-balances switch, in two forms: the eye in the coloured panel's
 * toolbar, and any figure on a card, which flips the same switch when tapped.
 */
import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { toggleMoneyHidden, useMoneyHidden } from '@/lib/privacy';

/** The eye in the panel toolbar. Lit (white disc) while figures are hidden. */
export function HeroMoneyButton() {
  const hidden = useMoneyHidden();
  const label = hidden ? 'Show balances' : 'Hide balances';
  return (
    <button
      type="button"
      onClick={toggleMoneyHidden}
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
        hidden
          ? 'bg-white text-[color:var(--hero)] hover:bg-white/90'
          : 'bg-white/[0.12] text-white hover:bg-white/20 active:bg-white/25',
      )}
    >
      {hidden ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
    </button>
  );
}

/** A figure that hides and shows every balance when tapped. */
export function MoneyFigure({ children, className }: { children: ReactNode; className?: string }) {
  const hidden = useMoneyHidden();
  return (
    <button
      type="button"
      onClick={toggleMoneyHidden}
      title={hidden ? 'Tap to show balances' : 'Tap to hide balances'}
      aria-label={hidden ? 'Balances hidden. Tap to show.' : 'Tap to hide balances'}
      className={cn('block max-w-full cursor-pointer text-left outline-offset-4 transition-opacity hover:opacity-85', className)}
    >
      {children}
    </button>
  );
}
