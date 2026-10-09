/**
 * Class strings shared by every public page.
 *
 * Kept in a file with no imports so the header, the footer and the pages can
 * all read it without importing one another.
 */

const base =
  'tap inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-6 text-[15px] font-bold transition-colors active:scale-[0.98]';

export const btn = {
  /** The one thing a screen wants pressed. */
  red: `${base} bg-brand-600 text-white hover:bg-brand-700`,
  /** Second choice, over a photograph or the dark page. */
  glass: `${base} bg-white/14 text-white ring-1 ring-inset ring-white/20 backdrop-blur hover:bg-white/24`,
  /** White on the dark page. */
  light: `${base} bg-white text-night hover:bg-white/88`,
  /** White on the red band. */
  white: `${base} bg-white text-brand-700 hover:bg-brand-50`,
  /** Outline on the light pages. */
  line: `${base} border border-[var(--border-strong)] text-primary hover:bg-[var(--surface-sunken)]`,
  /** Outline on the red band. */
  lineWhite: `${base} border border-white/45 text-white hover:bg-white/10`,
} as const;

/** The content column, the same width on every page. */
export const container = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
