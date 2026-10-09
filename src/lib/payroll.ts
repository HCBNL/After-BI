/**
 * Payroll arithmetic. No Firebase, no React: dates in, numbers out.
 * (Ported from GetSchool's HR; each organisation sets its own rules.)
 *
 * THE RULES (each organisation sets them in HR, Salary day)
 *
 *   Salary day is a day of the month (the 25th unless changed). If it lands on
 *   a day off or a holiday, pay moves back to the working day before it. A
 *   month can have a one off salary day instead.
 *
 *   A pay cycle runs from `cycleStart` of last month to the day before it this
 *   month (24 means 24 Sep to 23 Oct), so no day is ever in two cycles. A cycle
 *   start of 1 means the calendar month (1 Oct to 31 Oct).
 *
 *   Working days are Monday to Friday, or Monday to Saturday when the
 *   organisation works Saturdays, minus holidays. Monthly salary divided by
 *   those days is the daily rate.
 *
 *   Pay = daily rate × days actually worked: a working day, on or after the
 *   resumption date, clocked in (or marked present by HR). Full attendance
 *   therefore earns exactly the monthly salary. Bonuses and deductions for the
 *   month are added on top (see `hr.ts`).
 *
 * All dates are 'yyyy-mm-dd' strings in local (Lagos) time.
 */

export const DEFAULT_PAY_DAY = 25;
export const DEFAULT_CYCLE_START = 24;

const pad = (n: number) => String(n).padStart(2, '0');

export function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Noon, so no timezone shift can move it to another day. */
export function fromIso(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(value: string, n: number): string {
  const d = fromIso(value);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** A day nobody works: Sunday always, Saturday unless the organisation works Saturdays. */
export function isOffDay(value: string, saturday = false): boolean {
  const day = fromIso(value).getDay();
  return day === 0 || (day === 6 && !saturday);
}

/** 20261008 ↔ '2026-10-08': the attendance key. */
export const dayNumber = (value: string) => Number(value.replace(/-/g, ''));
export const dayString = (n: number) => {
  const s = String(n);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};

export interface PayRules {
  payDay: number;
  cycleStart: number;
  /** One off salary days: { '2026-10': '2026-10-24' } */
  overrides: Record<string, string>;
  /** Every working day up to this date counts as present (before clocking in started). Empty: off. */
  autoUntil: string;
  /** Saturdays are working days. */
  saturday: boolean;
  holidays: Set<string>;
}

/** Salary day for a month (0 based), moved back off days off and holidays, unless overridden. */
export function payDayFor(year: number, month0: number, rules: Pick<PayRules, 'payDay' | 'overrides' | 'holidays' | 'saturday'>): string {
  const key = `${year}-${pad(month0 + 1)}`;
  const fixed = rules.overrides[key];
  if (fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) return fixed;
  const last = new Date(year, month0 + 1, 0).getDate();
  let d = iso(new Date(year, month0, Math.min(Math.max(1, rules.payDay), last), 12));
  while (isOffDay(d, rules.saturday) || rules.holidays.has(d)) d = addDays(d, -1);
  return d;
}

export interface PayPeriod {
  /** The month the salary is for, e.g. "October 2026". */
  label: string;
  /** 'yyyy-mm': the key bonuses, deductions and one off costs are filed under. */
  key: string;
  year: number;
  month0: number;
  start: string;
  end: string;
  /** When it is paid. */
  payDay: string;
}

function dayIn(year: number, month0: number, day: number): string {
  const last = new Date(year, month0 + 1, 0).getDate();
  return iso(new Date(year, month0, Math.min(Math.max(1, day), last), 12));
}

export function periodFor(year: number, month0: number, rules: PayRules): PayPeriod {
  let start: string;
  let end: string;
  if (rules.cycleStart <= 1) {
    start = iso(new Date(year, month0, 1, 12));
    end = iso(new Date(year, month0 + 1, 0, 12));
  } else {
    const prev = new Date(year, month0 - 1, 1);
    start = dayIn(prev.getFullYear(), prev.getMonth(), rules.cycleStart);
    end = addDays(dayIn(year, month0, rules.cycleStart), -1);
  }
  const label = new Date(year, month0, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return { label, key: `${year}-${pad(month0 + 1)}`, year, month0, start, end, payDay: payDayFor(year, month0, rules) };
}

/** The cycle whose salary day is today or the next one to come. */
export function currentPeriod(today: string, rules: PayRules): PayPeriod {
  const t = fromIso(today);
  for (let k = -1; k <= 2; k++) {
    const d = new Date(t.getFullYear(), t.getMonth() + k, 1);
    const p = periodFor(d.getFullYear(), d.getMonth(), rules);
    if (today <= p.payDay) return p;
  }
  return periodFor(t.getFullYear(), t.getMonth() + 1, rules);
}

export function shiftPeriod(p: PayPeriod, by: number, rules: PayRules): PayPeriod {
  const d = new Date(p.year, p.month0 + by, 1);
  return periodFor(d.getFullYear(), d.getMonth(), rules);
}

/** Every date from start to end inclusive. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function workingDays(start: string, end: string, holidays: Set<string>, saturday = false): string[] {
  return daysBetween(start, end).filter((d) => !isOffDay(d, saturday) && !holidays.has(d));
}

export interface PayResult {
  workingDays: number;
  daily: number;
  /** Working days on or after resumption. */
  eligible: number;
  worked: number;
  pay: number;
  /** Working days already past that had no attendance. */
  missed: number;
}

export function computePay(args: {
  salary: number;
  resumption?: string;
  period: Pick<PayPeriod, 'start' | 'end'>;
  holidays: Set<string>;
  saturday?: boolean;
  attended: Set<string>;
  today: string;
  autoUntil?: string;
  /** This person never needs to clock in: every working day to date counts. */
  autoAll?: boolean;
  /** Days HR marked absent. They beat everything else. */
  absent?: Set<string>;
}): PayResult {
  const days = workingDays(args.period.start, args.period.end, args.holidays, args.saturday);
  const present = (d: string) =>
    !args.absent?.has(d) &&
    (args.attended.has(d) || (Boolean(args.autoUntil) && d <= args.autoUntil!) || (Boolean(args.autoAll) && d <= args.today));
  const daily = days.length ? args.salary / days.length : 0;
  const from = args.resumption && args.resumption > args.period.start ? args.resumption : args.period.start;
  const eligibleDays = days.filter((d) => d >= from);
  const worked = eligibleDays.filter(present).length;
  const missed = eligibleDays.filter((d) => d < args.today && !present(d)).length;
  return {
    workingDays: days.length,
    daily: Math.round(daily * 100) / 100,
    eligible: eligibleDays.length,
    worked,
    pay: Math.round(daily * worked),
    missed,
  };
}

export function prettyIso(value: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return fromIso(value).toLocaleDateString('en-GB', opts);
}

/** 1st, 2nd, 3rd, 4th … 23rd, 24th. */
export function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
}

/** "the 24th of last month to the 23rd of this month", or "the calendar month". */
export function cycleWords(cycleStart: number): string {
  return cycleStart <= 1
    ? 'the calendar month (the 1st to the last day)'
    : `the ${ordinal(cycleStart)} of last month to the ${ordinal(cycleStart - 1)} of this month`;
}
