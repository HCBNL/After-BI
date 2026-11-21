/**
 * Two front doors, one code base.
 *
 *   afterbi.com       the website: home, features, solutions, pricing, and
 *                     later the blog, help centre and the rest.
 *   app.afterbi.com   the app: sign in, the PIN, every portal screen.
 *
 * Both are the same Vercel project and the same build. vercel.json sends a
 * visitor to the right one before the page even loads; `crossHost` does the
 * same for links followed inside the page. The split only happens on those
 * two real addresses: on localhost or a Vercel preview everything stays on
 * one address, exactly as before.
 *
 * A few public pages live on both, because printed cards and QR codes point
 * at them: the digital business card, the staff checks and sign in help.
 */
import { SITE_URL } from './siteMeta';

export const APP_URL = (import.meta.env.VITE_APP_URL || 'https://app.afterbi.com').replace(/\/$/, '');

const host = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};
const SITE_HOST = host(SITE_URL);
const APP_HOST = host(APP_URL);

function here(): string {
  return typeof window === 'undefined' ? '' : window.location.hostname;
}

export function onAppHost(): boolean {
  return here() === APP_HOST;
}
export function onSiteHost(): boolean {
  const h = here();
  return h === SITE_HOST || h === `www.${SITE_HOST}`;
}
/** True only on the two real addresses, where the split applies. */
export function split(): boolean {
  return onAppHost() || onSiteHost();
}

/** Website pages. */
const SITE = /^\/(?:$|features|product|solutions|pricing|partners|blog|roles|about|demo|terms|privacy)(?:\/|$)/;
/** Public pages that answer on both addresses. */
const BOTH = /^\/(?:card|verify|help)(?:\/|$)/;

/** Where this path belongs, when the visitor is on the other address; null when they are already in the right place. */
export function crossHost(pathname: string): string | null {
  if (!split() || BOTH.test(pathname)) return null;
  const site = SITE.test(pathname);
  if (onAppHost() && site && pathname !== '/') return SITE_URL + pathname;
  if (onSiteHost() && !site) return APP_URL + pathname;
  return null;
}

/** An address in the app, absolute when the split applies (for links that leave the website, and messages). */
export function appUrl(path = '/login'): string {
  return split() || typeof window === 'undefined' ? APP_URL + path : window.location.origin + path;
}

/** The address public links (QR codes, shared cards) are built on: always the website when the split applies. */
export function publicOrigin(): string {
  if (typeof window === 'undefined') return SITE_URL;
  return split() ? SITE_URL : window.location.origin;
}

/** A website address, absolute when the split applies (for links from the app back to the website). */
export function siteUrl(path = '/'): string {
  return split() ? SITE_URL + (path === '/' ? '' : path) : path;
}
