/**
 * The hide-balances switch, in two forms: the eye in the coloured panel's
 * toolbar, and any figure on a card, which flips the same switch when tapped.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { toggleMoneyHidden, useMoneyHidden } from '@/lib/privacy';

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
