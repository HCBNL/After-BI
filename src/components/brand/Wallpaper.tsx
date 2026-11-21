/**
 * The moving wallpaper: AfterBI blue drifting through purple, a hint of pink
 * and teal, and night blue, with the owner's petals turning on top. Used for
 * the opening screen, the PIN screen, PIN setup and the organisation gate, so
 * opening the app is one continuous scene rather than a loader then a page.
 * No logo here, on purpose. Styles: `.ab-wall` in index.css (and inline in
 * index.html for the first paint).
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { PetalBackdrop } from './PetalBackdrop';

export function WallLayers({ petals = true }: { petals?: boolean }) {
  return (
    <>
      <i aria-hidden className="ab-wall-l ab-wall-a" />
      <i aria-hidden className="ab-wall-l ab-wall-b" />
      <i aria-hidden className="ab-wall-l ab-wall-c" />
      <i aria-hidden className="ab-wall-l ab-wall-d" />
      {petals && <PetalBackdrop className="text-white" />}
    </>
  );
}

export function Wallpaper({
  className,
  children,
  label,
  petals = true,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: ReactNode;
  /** When the wallpaper itself is the waiting screen, what it is waiting for (read aloud only). */
  label?: string;
  petals?: boolean;
}) {
  return (
    <div className={cn('ab-wall', className)} role={label ? 'status' : undefined} aria-label={label} {...rest}>
      <WallLayers petals={petals} />
      {children}
    </div>
  );
}

/** Four petals turning, colour drifting: the waiting sign inside the app. */
export function Bloom({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn('ab-bloom h-12 w-12', className)}>
      {[0, 90, 180, 270].map((r) => (
        <path key={r} d="M50 50 Q22 18 50 4 Q78 18 50 50 Z" transform={`rotate(${r} 50 50)`} opacity="0.9" />
      ))}
    </svg>
  );
}
