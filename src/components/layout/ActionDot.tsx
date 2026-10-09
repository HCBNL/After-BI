/**
 * The red, pulsing dot on a button that has something waiting behind it.
 *
 * Draws nothing unless `src/lib/pending.ts` says so. The button it sits on
 * must be `relative`; the dot is placed with `className`.
 *
 * Red on every surface, with a white ring so it stays a separate mark on a
 * coloured panel as well as on white. The pulse is Tailwind's `animate-ping`,
 * which the global reduced-motion rule in index.css stills.
 */

import { cn } from '@/lib/cn';
import { usePending } from '@/lib/pending';

export function PendingDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('pointer-events-none absolute flex h-2.5 w-2.5', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ef4444] opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#e11d2e] ring-2 ring-white" />
    </span>
  );
}

export function ActionDot({ id, className }: { id: string; className?: string }) {
  const count = usePending(id);
  if (!count) return null;
  return <PendingDot className={className} />;
}
