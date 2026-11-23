/**
 * Dates on screen, in the language the person chose.
 *
 * WHY THIS IS NOT LEFT TO THE DICTIONARY
 *
 * Every date in the app was formatted as `en-NG` or `en-GB` whatever the
 * language, so a Chinese screen read "2026年11月" in one place and "3 Nov 2026"
 * in the next, and every month name, weekday and "pm" stayed English. The
 * dictionary cannot fix that: there are 366 days, 12 months and endless
 * combinations, and the browser already knows how each language writes a date.
 * Chinese puts the year first with 年月日, French writes "3 nov. 2026" with a
 * 24 hour clock. So the formatter is simply given the right locale.
 *
 * In English nothing changes: each call site keeps the `en-NG` or `en-GB` it
 * was written with, because those differ (Nigerian English uses a 12 hour clock
 * in some places, British the day-first long form in others) and the existing
 * screens were laid out for exactly those strings.
 *
 * WHAT STAYS ENGLISH
 *
 * Printed documents (proformas, invoices, proposals) leave the company for a
 * customer, so `print.ts` and `proposal.ts` keep their own English formatting.
 * Anything that reads numbers back out of a formatter (`monthPosition`'s
 * `formatToParts`) keeps its fixed locale, because that is arithmetic, not
 * display.
 *
 * The language is read once: changing it reloads the page.
 */
import { getLang } from './i18n';

const LANG = getLang();

/** The locale for this language, or '' in English (each caller keeps its own). */
const SCREEN = LANG === 'zh' ? 'zh-CN' : LANG === 'fr' ? 'fr-FR' : '';

/** The locale to format a date for the screen with. `english` is what the call site used before. */
export function dateLocale(english: 'en-NG' | 'en-GB'): string {
  return SCREEN || english;
}

/** The screen language, for the few formatters that word numbers differently. */
export const screenLang = LANG;

/** Chinese and French screens read times on a 24 hour clock. */
export const twentyFourHour = SCREEN !== '';
