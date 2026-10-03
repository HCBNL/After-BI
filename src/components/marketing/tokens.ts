/**
 * Class strings shared by every public page.
 *
 * In a file with no imports on purpose, so the header, the footer and the
 * pages can all read it without importing one another and without the circular
 * graph that always follows from putting shared classes "somewhere sensible".
 *
 * WHY THESE AND NOT `<Button>`
 *
 * The product's own button is sized for dense interface: a row in a table of
 * order lines, beside forty others. A public page has two buttons on a screen
 * and they are the screen's furniture, so they are taller and heavier. Reusing
 * the product's button here made the front page look like a settings panel.
 */

const base =
  'tap inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-6 ' +
  'text-[15px] font-bold transition-colors active:scale-[0.98]';

export const btn = {
  /** The one thing a screen wants pressed. */
  green: `${base} bg-brand-600 text-white hover:bg-brand-500`,
  /** Second choice, over a photograph or the dark page. */
  glass: `${base} bg-white/14 text-white ring-1 ring-inset ring-white/20 backdrop-blur hover:bg-white/24`,
  /** White on the dark page. */
  light: `${base} bg-white text-night hover:bg-white/88`,
  /** White on the green band. */
  white: `${base} bg-white text-brand-800 hover:bg-brand-50`,
  /** Outline on the green band. */
  lineWhite: `${base} border border-white/45 text-white hover:bg-white/10`,
  /** Outline on the dark page. */
  line: `${base} border border-white/20 text-white hover:bg-white/10`,
} as const;

/** The content column, the same width on every page. */
export const container = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
