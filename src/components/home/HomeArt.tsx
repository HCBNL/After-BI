/**
 * The texture behind the panels.
 *
 * WHY IT IS A RULED GRID AND NOT THE LOGO
 *
 * It used to be the four-bar mark, and when that was retired the obvious
 * replacement was the wordmark drawn huge. It was the wrong shape. An abstract
 * mark crops beautifully — half a square at the edge of a panel still reads as
 * a square — but half a word reads as text that has gone wrong, and every
 * placement in this app hangs its scenery off a corner. Two rotated,
 * overflowing copies of "AfterBI." looked like a rendering bug.
 *
 * So the scenery is the ruled grid instead: the ledger every one of these
 * businesses already keeps, which is the same material `.ink-rule` paints on
 * the public pages. It tiles, so it cannot crop wrongly at any size or in any
 * corner, and it is AfterBI's own rather than a stock blob.
 *
 * The logo is now exactly one thing, at one aspect ratio, and it appears only
 * where a logo belongs. See `brand/Wordmark.tsx`.
 */

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export function PanelTexture({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none', className)}
      style={{
        /*
          `currentColor` rather than a fixed rgba, so every existing caller's
          `text-white/[0.045]` still tints it exactly as it tinted the glyph it
          replaces. That is what let nine placements survive the change without
          being re-tuned by hand.
        */
        backgroundImage:
          'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
        backgroundSize: '3.5rem 3.5rem',
        ...style,
      }}
    />
  );
}
