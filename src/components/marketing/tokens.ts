/**
 * Class strings shared by every public page.
 *
 * In a file with no imports on purpose, so the header, the footer and the
 * pages can all read it without importing one another.
 *
 * WHERE THE ACCENT IS ALLOWED, WHICH IS THE POINT OF THIS FILE
 *
 * The public site runs on 60/30/10 (see "the public site, light" in
 * `src/index.css`): ground, structure, accent. This file is where most of the
 * ten per cent is spent, so the rule is written here rather than remembered:
 *
 *   accent  →  `btn.accent` and nothing else in this file.
 *   structure → every other button, every label, every link.
 *
 * `btn.accent` is one button per screen. Two accent buttons side by side is
 * two primary actions, which is none: the second one goes to `btn.outline`,
 * which is the structure colour and reads as the quieter choice without
 * looking disabled.
 *
 * Buttons are pill shaped and tall, the way a visitor's thumb expects a
 * marketing page to be.
 */

const base =
  'tap inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 ' +
  'text-[15px] font-bold transition-colors active:scale-[0.98]';

export const btn = {
  /**
   * THE ACCENT. The one thing a screen wants pressed.
   *
   * The whole ten per cent of the palette is here and in the "most popular"
   * seal on the pricing card. If this class is on two things in one viewport,
   * one of them is wrong.
   *
   * Navy on lemon, not white on lemon: the accent is a *light* colour, so the
   * label has to be the dark one. See the ramp note in `index.css`.
   *
   * The hairline is not decoration. The fill reads 1.2:1 against cream, so
   * without an edge the button has no silhouette on a light page and only
   * its text defines it; the ring gives it a boundary on paper and is
   * invisible where it sits on the navy hero.
   */
  accent: `${base} bg-brand-500 text-navy-900 ring-1 ring-navy-900/20 hover:bg-brand-600`,
  /** Second choice on paper: structure, outlined. */
  outline: `${base} border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white`,
  /** Structure, solid. The quiet primary where the accent is already spent. */
  navy: `${base} bg-navy-900 text-white hover:bg-navy-800`,
  /** White on a dark band: the accent would compete with the band itself. */
  white: `${base} bg-white text-navy-900 hover:bg-navy-100`,
  /** Outline on a dark band. */
  lineWhite: `${base} border-2 border-white/60 text-white hover:bg-white/10`,

  /* Kept for the few shared pieces that still ask for the old names. */
  light: `${base} bg-white text-navy-900 hover:bg-navy-100`,
  glass: `${base} border-2 border-navy-900/15 text-navy-900 hover:border-navy-900`,
  line: `${base} border-2 border-navy-900/15 text-navy-900 hover:border-navy-900`,
} as const;

/** The content column, the same width on every page. */
export const container = 'mx-auto w-full max-w-7xl px-5 sm:px-8';

/**
 * The small caps label above a section title: structure, not accent.
 *
 * There is one of these on nearly every section of every page, so painting
 * them in the accent put the loud colour forty times on a single scroll and
 * left the button it was supposed to be pointing at indistinguishable from a
 * caption. Set in the structure colour at a lighter step, it still reads as a
 * label and costs nothing from the ten.
 */
export const eyebrowBase = 'text-[13px] font-bold uppercase tracking-[0.14em]';
export const eyebrow = `${eyebrowBase} text-navy-500`;

