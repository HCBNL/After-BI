/**
 * The texture behind a tip card.
 *
 * WHAT THESE ARE FOR
 *
 * The cards used to be a title, a paragraph and a button on a flat colour.
 * Three lines of explanation is what made them read as a form rather than as a
 * banner: the eye has to start reading before it knows whether it cares. The
 * paragraph is gone, so each card is now a headline, a mark and one action —
 * and a card that empty needs something behind it or it reads as unfinished.
 *
 * WHY ABSTRACT AND NOT ILLUSTRATION
 *
 * The obvious answer is a small drawing of the thing each card is about — a
 * register, a report card. It is the wrong answer twice over. At 120 pixels
 * tall behind a headline, a drawing is unreadable and merely busy; and ten of
 * them, drawn to a consistent standard, is a commission rather than a
 * component. What a premium banner actually uses is texture — contour lines,
 * concentric rings, a field of marks — which reads at any size, never competes
 * with the words, and carries the eye across the card rather than stopping it.
 *
 * The icon in the corner is what says which function this is. These say the
 * card is worth looking at.
 *
 * HOW THEY ARE DRAWN
 *
 * One SVG each, no images, no requests, `currentColor` throughout, so a card
 * sets its own opacity and the art follows. `preserveAspectRatio="none"` is
 * deliberately NOT used: these are cropped by the card rather than stretched,
 * which is what keeps a circle a circle on a wide laptop card and a narrow
 * phone one.
 */

import { cn } from '@/lib/cn';

export type TipMotif = 'contour' | 'rings' | 'arcs' | 'grid';

/**
 * Topographic lines, sweeping across the card.
 *
 * The most useful of the four: it has direction, so it moves the eye from the
 * headline toward the button rather than sitting behind it.
 */
function Contour() {
  return (
    <svg viewBox="0 0 400 160" fill="none" aria-hidden className="h-full w-full">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path
          key={i}
          d={`M-20 ${150 - i * 17} C 60 ${112 - i * 17}, 120 ${168 - i * 15}, 210 ${126 - i * 16} S 350 ${72 - i * 14}, 430 ${96 - i * 15}`}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** Concentric rings, set off the right edge, like a signal going out. */
function Rings() {
  return (
    <svg viewBox="0 0 400 160" fill="none" aria-hidden className="h-full w-full">
      {[26, 54, 82, 110, 138, 166].map((r) => (
        <circle key={r} cx="330" cy="86" r={r} stroke="currentColor" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/** Broad arcs, like pages turning, anchored bottom left. */
function Arcs() {
  return (
    <svg viewBox="0 0 400 160" fill="none" aria-hidden className="h-full w-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M-30 ${190 + i * 6} A ${150 + i * 34} ${120 + i * 26} 0 0 1 ${250 + i * 40} -40`}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/**
 * A field of small marks, densest in the middle and gone at both edges.
 *
 * The fade ran left to right on the first pass, which put the densest part of
 * the pattern directly under the icon plate in the top right — the one corner
 * of the card that already has something in it. The card read as dirty rather
 * than textured. Peaking in the middle and falling away at both edges leaves
 * the headline and the plate on clean ground.
 */
function Grid() {
  return (
    <svg viewBox="0 0 400 160" fill="none" aria-hidden className="h-full w-full">
      <defs>
        <pattern id="tip-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <rect x="9.5" y="9.5" width="6" height="6" rx="1.8" fill="currentColor" />
        </pattern>
        <linearGradient id="tip-grid-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.72" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="tip-grid-mask">
          <rect width="400" height="160" fill="url(#tip-grid-fade)" />
        </mask>
      </defs>
      <rect width="400" height="160" fill="url(#tip-grid)" mask="url(#tip-grid-mask)" />
    </svg>
  );
}

const MOTIF = { contour: Contour, rings: Rings, arcs: Arcs, grid: Grid } as const;

export function TipTexture({ motif, className }: { motif: TipMotif; className?: string }) {
  const Art = MOTIF[motif];
  return (
    <span aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10', className)}>
      <Art />
    </span>
  );
}

/**
 * The GetSchool mark, large and nearly invisible, at the foot of the card.
 *
 * A maker's stamp rather than decoration: every one of these cards is the
 * product talking about itself, and this is what says so without a line of
 * copy spent on it.
 *
 * It sits nearly whole rather than cropped hard, which was the first attempt
 * and was wrong: the mark's recognisable parts are the cut at its top right
 * and the square on its side, and hanging it off the right edge hid both and
 * left a plain circle. At this opacity a whole mark is still a watermark
 * rather than a sticker, and it is now the logo rather than an arc of one.
 *
 * The same path as `components/brand/Mark.tsx`. Copied rather than imported
 * because that component draws a coloured mark at an icon's scale with its own
 * plate, and this needs one outline at four times the size with everything
 * else stripped out.
 */
export function TipStamp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={cn('pointer-events-none absolute -z-10', className)}
    >
      <g transform="translate(32 32) scale(1.22) translate(-31.4 -31.6)">
        <path
          d="M45.3 20.7 A17.2 17.2 0 1 0 40.1 45.1 L40.1 48.4 L48.6 48.4 L48.6 37.3 L39.4 37.3 A10.1 10.1 0 1 1 39.1 25.2 Z"
          fill="currentColor"
        />
        {/* The square the mark carries, kept so the stamp is the real logo and
            not an approximation of it. */}
        <rect x="40.1" y="27.1" width="8.5" height="8.1" rx="1.1" fill="currentColor" />
      </g>
    </svg>
  );
}
