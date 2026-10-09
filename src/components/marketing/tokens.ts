/**
 * Class strings shared by every public page.
 *
 * In a file with no imports on purpose, so the header, the footer and the
 * pages can all read it without importing one another.
 *
 * The public site is light: white paper, navy type, green for the one thing a
 * screen wants pressed. Buttons are pill shaped and tall, the way a visitor's
 * thumb expects a marketing page to be.
 */

const base =
  'tap inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 ' +
  'text-[15px] font-bold transition-colors active:scale-[0.98]';

export const btn = {
  /** The one thing a screen wants pressed. */
  green: `${base} bg-brand-600 text-white hover:bg-brand-700`,
  /** Second choice on white. */
  outline: `${base} border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white`,
  /** Navy, solid. */
  navy: `${base} bg-navy-900 text-white hover:bg-navy-800`,
  /** White on a dark or green band. */
  white: `${base} bg-white text-navy-900 hover:bg-brand-50`,
  /** Outline on a dark or green band. */
  lineWhite: `${base} border-2 border-white/60 text-white hover:bg-white/10`,

  /* Kept for the few shared pieces that still ask for the old names. */
  light: `${base} bg-white text-navy-900 hover:bg-brand-50`,
  glass: `${base} border-2 border-navy-900/15 text-navy-900 hover:border-navy-900`,
  line: `${base} border-2 border-navy-900/15 text-navy-900 hover:border-navy-900`,
} as const;

/** The content column, the same width on every page. */
export const container = 'mx-auto w-full max-w-7xl px-5 sm:px-8';

/** Small green label above a section title. */
export const eyebrowBase = 'text-[13px] font-bold uppercase tracking-[0.14em]';
export const eyebrow = `${eyebrowBase} text-brand-700`;

/** Text link with an arrow feel. */
export const textLink =
  'inline-flex items-center gap-1.5 text-[15px] font-bold text-brand-700 underline-offset-4 hover:underline';
