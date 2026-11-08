/**
 * Which 60/30/10 palette the public site is wearing.
 *
 * THE RULE THE PALETTES IMPLEMENT
 *
 *   60  GROUND     the paper: the page, the cards, the space between things.
 *   30  STRUCTURE  the information: headlines, body, labels, ticks, icon
 *                  tiles, the dark bands, the footer.
 *   10  ACCENT     the press-targets, and nothing else: the primary button,
 *                  the "most popular" badge and its ring, the focus ring, the
 *                  full stop in the wordmark.
 *
 * Both variations are drawn out of the AfterBI mark, which carries a blue, a
 * green, a gold and an orange-red. Taking the accent from the logo rather
 * than choosing one beside it is why either variation still looks like us.
 *
 * WHERE THE COLOURS ACTUALLY LIVE
 *
 * In `src/index.css`, under "the public site, light". STRUCTURE is the
 * `navy-*` scale and ACCENT is the `brand-*` scale, both overridden inside
 * `.site`, so the app's own green is untouched and every utility already
 * written on a public page follows a palette change without being edited.
 * This file only decides which block wins; `PublicShell` stamps it on
 * <html> as `data-palette`.
 *
 * TO SWITCH THE WHOLE PUBLIC SITE: change the one word below.
 */

export const SITE_PALETTES = {
  /**
   * Cream ground, navy structure, signal orange accent.
   *
   * Navy and cream is the classic pairing and on its own it is merely
   * correct. The orange is what stops it being polite: the mark's own
   * orange-red pulled one step toward a traffic signal. Closest to the site
   * as it stands today, so nothing a customer already recognises is lost.
   */
  harbour: {
    id: 'harbour',
    label: 'Harbour',
    ground: '#fbf8f4',
    structure: '#0f1f36',
    accent: '#ff5a1f',
    note: 'Cream, navy, signal orange. Corporate and warm.',
  },
  /**
   * Mist ground, deep forest-teal structure, electric blue accent.
   *
   * The calm pairing, and the one that reads as a data product rather than a
   * corporate one. Green and blue are both lifted straight off the mark, so
   * the page and the logo finally agree with each other.
   */
  meridian: {
    id: 'meridian',
    label: 'Meridian',
    ground: '#f6f9f8',
    structure: '#0b3429',
    accent: '#0c7afd',
    note: 'Mist, forest teal, electric blue. Calm and analytical.',
  },
} as const;

export type SitePaletteId = keyof typeof SITE_PALETTES;

/**
 * The palette in force.
 *
 * One word, read by `PublicShell` on mount. `?palette=meridian` on any public
 * address overrides it for that visit, which is how a variation is shown to
 * somebody without a deploy; it is never persisted.
 */
export const SITE_PALETTE: SitePaletteId = 'harbour';

/** The palette for this visit: the query override, else the chosen one. */
export function activePalette(search?: string): SitePaletteId {
  const raw = new URLSearchParams(search ?? (typeof window === 'undefined' ? '' : window.location.search)).get('palette');
  return raw && raw in SITE_PALETTES ? (raw as SitePaletteId) : SITE_PALETTE;
}
