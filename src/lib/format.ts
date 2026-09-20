/**
 * Numbers, money and dates, formatted once.
 *
 * Every one of these exists because the same formatting was being done inline
 * in twenty places and disagreeing with itself in three of them — a total on a
 * card reading `₦1,240,000` beside the same total in a table reading
 * `NGN 1240000.00` is the kind of thing that makes a finance manager stop
 * trusting the screen.
 */

const NAIRA = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const NAIRA_PRECISE = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
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
  if (!Number.isFinite(amount)) return '—';
  return (precise ? NAIRA_PRECISE : NAIRA).format(amount);
}

/**
 * Money at a glance: `₦1.2m`, `₦840k`.
 *
 * For a KPI card and a chart axis only — never for a figure somebody has to
 * reconcile. A rounded total in a place where an exact one is expected is worse
 * than a long one, so `naira()` is the default everywhere else.
 */
export function nairaShort(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  const sign = amount < 0 ? '-' : '';
  const n = Math.abs(amount);
  if (n >= 1_000_000_000) return `${sign}₦${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}b`;
  if (n >= 1_000_000) return `${sign}₦${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${sign}₦${Math.round(n / 1_000)}k`;
  return `${sign}₦${Math.round(n)}`;
}

const NUM = new Intl.NumberFormat('en-NG');

/** Cartons, units, seats — anything counted rather than paid. */
export function count(value: number): string {
  return Number.isFinite(value) ? NUM.format(value) : '—';
}

export function percent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function initials(...parts: (string | undefined)[]): string {
  return parts
    .filter(Boolean)
    .map((p) => p!.trim()[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

/* ------------------------------------------------------------------ dates */

const DATE_FMT = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_LONG = new Intl.DateTimeFormat('en-NG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const TIME_FMT = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });

function toDate(input: string | number | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

/**
 * Today, as `YYYY-MM-DD`, in the reader's own timezone.
 *
 * NOT `new Date().toISOString().slice(0, 10)`, which is the obvious version and
 * is wrong here. That returns the UTC date, and Nigeria is UTC+1 — so a rep
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

/** `YYYY-MM` — the key a monthly target is stored under. */
export function monthKey(when: Date = new Date()): string {
  return `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDate(input?: string | number | Date | null): string {
  if (!input) return '—';
  const date = toDate(input);
  return Number.isNaN(date.getTime()) ? '—' : DATE_FMT.format(date);
}

export function formatLongDate(input?: string | number | Date | null): string {
  if (!input) return '—';
  const date = toDate(input);
  return Number.isNaN(date.getTime()) ? '—' : DATE_LONG.format(date);
}

export function formatDateTime(input?: string | number | Date | null): string {
  if (!input) return '—';
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return '—';
  return `${DATE_FMT.format(date)}, ${TIME_FMT.format(date)}`;
}

/**
 * "3 days ago", "in 2 weeks".
 *
 * Used for one thing and one thing only: how late an invoice is. A relative
 * date is easier to act on than an absolute one ("14 days overdue" starts a
 * phone call; "due 31 Aug" starts a calculation) and harder to read wrong.
 */
export function relativeDays(input?: string | number | Date | null): string {
  if (!input) return '—';
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return '—';
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
}

/** How many days past due, or 0 if not yet due. Positive means late. */
export function daysOverdue(dueOn?: string | null): number {
  if (!dueOn) return 0;
  const due = new Date(dueOn);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000));
}
