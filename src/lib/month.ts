/**
 * Where we are in the sales month, in Lagos time — the distribution
 * equivalent of "week 6 of the term". Month-end is when targets close and
 * distributors restock, so it is the calendar this business actually runs on.
 */
export interface MonthPosition {
  year: number;
  month: number;
  day: number;
  days: number;
  name: string;
  left: number;
  /** Weekday of the 1st, Monday = 0. */
  firstWeekday: number;
}

export function monthPosition(now: Date = new Date()): MonthPosition {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const name = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 15)),
  );
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  return { year, month, day, days, name, left: days - day, firstWeekday };
}
