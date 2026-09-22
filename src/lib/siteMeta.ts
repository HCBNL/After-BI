/**
 * The handful of constants that both fronts of this app need.
 *
 * WHY THIS IS NOT JUST THE TOP OF `site.ts`
 *
 * It was, for about an hour, and it cost every user of the product thirty-six
 * kilobytes.
 *
 * `Seo` needs the brand name and the canonical origin. The sign-in screen
 * needs `Seo`, and the sign-in screen is deliberately eager — it is the screen
 * everybody arrives on, and making the front door wait for a second request
 * would undo the point of the whole lazy route table. So importing those two
 * constants from `site.ts` put `site.ts` in the eager bundle, and `site.ts` is
 * thirty-one kilobytes of marketing prose: every plan, every FAQ answer, the
 * about story and eight module essays, downloaded by a sales rep opening the
 * app in a depot to key one order.
 *
 * Nothing in here is longer than a line. Anything with paragraphs in it
 * belongs in `site.ts`, which only the public pages import and which the
 * bundler is then free to keep in the public site's own chunk.
 */

export const BRAND = 'AfterBI';

/** Canonical origin. Set VITE_SITE_URL wherever this is hosted. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://afterbi.com').replace(/\/$/, '');

export const SUPPORT_EMAIL = 'hello@afterbi.com';

/**
 * The WhatsApp number, in the one format `wa.me` accepts.
 *
 * International, no plus, no spaces, no leading zero: 0704… is how it is dialled
 * inside Nigeria, and 234704… is how it is addressed from anywhere. Held here
 * once so the footer, the closing band, the float and the booking sheet cannot
 * drift into four slightly different links.
 */
export const WHATSAPP_NUMBER = '2347040927073';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const SALES_PHONE = '+234 704 092 7073';
