/**
 * The four squares from the GetSchool mark, as scenery.
 *
 * Drawn huge and nearly transparent behind the home panel and the banners, the
 * way a banking app lets its own logo shape sit behind the balance. It is the
 * one decoration on the home screen, and it is ours rather than a stock blob:
 * the same geometry as `Mark.tsx`, with the fourth square faded the same way.
 */

import type { CSSProperties } from 'react';

export function Squares({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} fill="currentColor" aria-hidden focusable="false">
      <rect x="0" y="0" width="27" height="27" rx="6.5" />
      <rect x="37" y="0" width="27" height="27" rx="6.5" />
      <rect x="0" y="37" width="27" height="27" rx="6.5" />
      <rect x="37" y="37" width="27" height="27" rx="6.5" opacity="0.5" />
    </svg>
  );
}
