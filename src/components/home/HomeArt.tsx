/**
 * The brand signature, as scenery.
 *
 * Four rising bars — a bar chart and a signal-strength meter at once, which is
 * this whole product in a shape: what you sold, and how well it is going.
 * Drawn enormous and at a twentieth of the surface's contrast behind the
 * panels, the sign-in screen and the sheets, the way a bank lets its own shape
 * sit behind the balance.
 *
 * WHY THIS IS SCENERY AND NOT THE LOGO
 *
 * The logo is the wordmark, "AfterBI.", and only the wordmark — see
 * `brand/Wordmark.tsx`. This is the signature underneath it: an abstract shape
 * the brand owns, which is a different job. The distinction matters in
 * practice, because an abstract shape crops beautifully (half a bar at the
 * edge of a panel still reads as a bar) and a word does not — half a word
 * reads as text that has gone wrong. That is exactly why the wordmark was
 * tried here and taken out again.
 *
 * It paints in `currentColor` and carries none of the mark's old four colours:
 * a signature is one shape in one tint, and a full-colour logo tiled across a
 * background is a logo somebody has misused.
 */

import type { CSSProperties } from 'react';

export function BrandBars({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} fill="currentColor" aria-hidden focusable="false">
      <rect x="2" y="18" width="5.5" height="12" rx="2" />
      <rect x="10" y="13" width="5.5" height="17" rx="2" />
      <rect x="18" y="8" width="5.5" height="22" rx="2" />
      {/* The tallest one half out, as it is in the wordmark's own lock-up: it is
          the bar that has not happened yet, which is the product's argument. */}
      <rect x="26" y="2" width="4" height="28" rx="2" opacity="0.5" />
    </svg>
  );
}
