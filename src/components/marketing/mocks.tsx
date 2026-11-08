/**
 * The one drawn-in-code figure the public site still uses.
 *
 * WHAT THIS FILE USED TO BE
 *
 * A set of product pictures drawn in code, a browser frame, a phone, a
 * dashboard, a partner portal and a screen for each module, which stood in
 * for photographs until real files were dropped into /public/site/. Every one
 * of them reached the page through `SiteImage`'s `fallback` prop.
 *
 * That prop stopped being drawn some time ago, and the components were never
 * removed with it: eight hundred lines of markup that every visitor
 * downloaded as part of the public bundle and nobody ever saw. An empty
 * picture slot is simply empty now, which is the behaviour the site has
 * actually had all along, and the owner fills it by uploading a picture.
 *
 * `Sparkline` is the exception and the only survivor: the front page's hero
 * card draws it directly, not as a fallback, so it is a real part of the
 * page rather than a stand-in for one.
 */

import { cn } from '@/lib/cn';

/** The little two-line trend chart on the front page's "Sell through" card. */
export function Sparkline({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 200 80" preserveAspectRatio="none" className={cn('w-full', className)} aria-hidden>
      {[20, 40, 60].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} stroke={light ? 'rgba(255,255,255,0.12)' : 'rgba(15,31,54,0.08)'} strokeWidth="1" />
      ))}
      <path d="M0 62 C 25 55, 40 66, 60 58 S 95 40, 115 46 S 150 30, 170 24 S 190 14, 200 10" fill="none" stroke="var(--color-navy-700)" strokeWidth="3" strokeLinecap="round" />
      <path d="M0 66 C 30 64, 50 60, 75 56 S 120 50, 140 44 S 180 36, 200 30" fill="none" stroke={light ? 'rgba(255,255,255,0.45)' : '#9bb4d4'} strokeWidth="2" strokeDasharray="5 5" />
    </svg>
  );
}
