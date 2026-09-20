/**
 * The AfterBI mark's four rising bars, as scenery — drawn huge and nearly
 * transparent behind the panels, the way a banking app lets its logo sit
 * behind the balance. Same geometry as `Mark.tsx`, the tallest bar faded.
 */
import type { CSSProperties } from 'react';

export function Bars({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} fill="currentColor" aria-hidden focusable="false">
      <rect x="2" y="18" width="5.5" height="12" rx="2" />
      <rect x="10" y="13" width="5.5" height="17" rx="2" />
      <rect x="18" y="8" width="5.5" height="22" rx="2" />
      <rect x="26" y="2" width="4" height="28" rx="2" opacity="0.5" />
    </svg>
  );
}
