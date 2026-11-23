/**
 * Numbers, money and dates, formatted once.
 *
 * Every one of these exists because the same formatting was being done inline
 * in twenty places and disagreeing with itself in three of them: a total on a
 * card reading `₦1,240,000` beside the same total in a table reading
 * `NGN 1240000.00` is the kind of thing that makes a finance manager stop
 * trusting the screen.
 */
import { dateLocale, screenLang, twentyFourHour } from './locale';
import { markMoney } from './privacy';

/*
 * A French screen groups thousands with a space and puts the comma before the
 * kobo: "302 000 ₦". Left in the Nigerian style, "₦302,000" reads to a French
 * eye as three hundred and two naira. Chinese reads the Nigerian style as it is.
 * Printed documents have their own formatter (lib/print.ts) and stay English.
 */
const MONEY_LOCALE = screenLang === 'fr' ? 'fr-FR' : 'en-NG';
const MONEY_SYMBOL = screenLang === 'fr' ? { currencyDisplay: 'narrowSymbol' as const } : {};

const NAIRA = new Intl.NumberFormat(MONEY_LOCALE, {
  style: 'currency',
  currency: 'NGN',
  ...MONEY_SYMBOL,
  maximumFractionDigits: 0,
});

const NAIRA_PRECISE = new Intl.NumberFormat(MONEY_LOCALE, {
  style: 'currency',
  currency: 'NGN',
  ...MONEY_SYMBOL,
  minimumFractionDigits: 2,
});

/**
 * Naira, whole by default.
 *
 * Kobo is off by default and on by request, which is the right way round for
 * this product: an order total is quoted in whole naira and an invoice line is
 * quoted to the kobo, and showing `₦1,240,000.00` on a dashboard card wastes
 * three characters of a 360px phone to say nothing.
 */
export function naira(amount: number, precise = false): string {
  if (!Number.isFinite(amount)) return 'None';
  return markMoney((precise ? NAIRA_PRECISE : NAIRA).format(amount));
}

/**
 * The same figure, never masked (no marks, so the page leaves it alone). For a message that is only useful with the
 * number in it ("only ₦4,000 is owed, record that amount"): somebody who has
 * hidden balances and typed an amount still has to be told what the limit is.
 */
export function nairaPlain(amount: number, precise = false): string {
  if (!Number.isFinite(amount)) return 'None';
  return (precise ? NAIRA_PRECISE : NAIRA).format(amount);
}

/**
 * Money at a glance: `₦1.2m`, `₦840k`.
 *
 * For a KPI card and a chart axis only: never for a figure somebody has to
 * reconcile. A rounded total in a place where an exact one is expected is worse
 * than a long one, so `naira()` is the default everywhere else.
 *
 * Worded the way each language rounds money: a Chinese reader counts in 万 and
 * 亿 rather than thousands and millions, and French writes `3,5 M ₦`.
 */
export function nairaShort(amount: number): string {
  if (!Number.isFinite(amount)) return 'None';
  return markMoney(shortNaira(amount));
}

function shortNaira(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const n = Math.abs(amount);
  if (screenLang === 'zh') {
    if (n >= 100_000_000) return `${sign}₦${trimmed(n / 100_000_000, 2)}亿`;
    if (n >= 10_000) return `${sign}₦${trimmed(n / 10_000, n >= 1_000_000 ? 0 : 1)}万`;
    return `${sign}₦${Math.round(n)}`;
  }
  if (screenLang === 'fr') {
    const comma = (value: number) => trimmed(value, 1).replace('.', ',');
    if (n >= 1_000_000_000) return `${sign}${comma(n / 1_000_000_000)}\u202fMd\u00a0₦`;
    if (n >= 1_000_000) return `${sign}${comma(n / 1_000_000)}\u202fM\u00a0₦`;
    if (n >= 1_000) return `${sign}${Math.round(n / 1_000)}\u202fk\u00a0₦`;
    return `${sign}${Math.round(n)}\u00a0₦`;
  }
  if (n >= 1_000_000_000) return `${sign}₦${trimmed(n / 1_000_000_000, 1)}b`;
  if (n >= 1_000_000) return `${sign}₦${trimmed(n / 1_000_000, 1)}m`;
  if (n >= 1_000) return `${sign}₦${Math.round(n / 1_000)}k`;
  return `${sign}₦${Math.round(n)}`;
}

/** A rounded figure without trailing zeros: 3.50 reads 3.5, 350 stays 350. */
function trimmed(value: number, digits: number): string {
  const text = value.toFixed(digits);
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

const NUM = new Intl.NumberFormat(screenLang === 'fr' ? 'fr-FR' : 'en-NG');

/** Cartons, units, seats: anything counted rather than paid. */
export function count(value: number): string {
  return Number.isFinite(value) ? NUM.format(value) : 'None';
}

export function percent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return 'None';
  return `${value.toFixed(digits)}%`;
}

export function initials(...parts: (string | undefined)[]): string {
  return parts
    .filter(Boolean)
    .map((p) => p!.trim()[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

/* dates */

/* In the chosen language: see lib/locale.ts. English is exactly as it was. */
const DATE_FMT = new Intl.DateTimeFormat(dateLocale('en-NG'), { day: 'numeric', month: 'short', year: 'numeric' });
const TIME_FMT = new Intl.DateTimeFormat(dateLocale('en-NG'), { hour: 'numeric', minute: '2-digit', hour12: !twentyFourHour });
/* Outside English, date and time come from one formatter, so each language
   joins them its own way ("2026年11月3日 17:56", "3 nov. 2026, 17:56"). */
const DATE_TIME_FMT = twentyFourHour
  ? new Intl.DateTimeFormat(dateLocale('en-NG'), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  : null;

function toDate(input: string | number | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

/**
 * Today, as `YYYY-MM-DD`, in the reader's own timezone.
 *
 * NOT `new Date().toISOString().slice(0, 10)`, which is the obvious version and
 * is wrong here. That returns the UTC date, and Nigeria is UTC+1: so a rep
 * keying a sale at half past midnight would file it against yesterday, and the
 * daily sell-out figure for the whole territory would be short by a night's
 * work. `Sale.saleDate` is what every date-range query filters on, so getting
 * the day wrong is not cosmetic.
 */
export function todayISO(when: Date = new Date()): string {
  const month = String(when.getMonth() + 1).padStart(2, '0');
  const day = String(when.getDate()).padStart(2, '0');
  return `${when.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM`: the key a monthly target is stored under. */
export function monthKey(when: Date = new Date()): string {
  return `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDate(input?: string | number | Date | null): string {
  if (!input) return 'Not set';
  const date = toDate(input);
  return Number.isNaN(date.getTime()) ? 'Not set' : DATE_FMT.format(date);
}

export function formatDateTime(input?: string | number | Date | null): string {
  if (!input) return 'Not set';
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return DATE_TIME_FMT ? DATE_TIME_FMT.format(date) : `${DATE_FMT.format(date)}, ${TIME_FMT.format(date)}`;
}

/** How many days past due, or 0 if not yet due. Positive means late. */
export function daysOverdue(dueOn?: string | null): number {
  if (!dueOn) return 0;
  const due = new Date(dueOn);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000));
}
