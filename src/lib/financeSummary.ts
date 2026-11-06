/**
 * The finance dashboard's arithmetic: pure, so the screen only draws.
 *
 * WHAT EACH FIGURE MEANS
 *
 *   Invoiced        invoices issued in the period (not draft, not void)
 *   Collected       money actually received in the period (transfer, cash,
 *                   cheque, card); credit notes and return credits are NOT cash
 *   Credit notes    price adjustments given in the period (CN numbers)
 *   Returns         credit for goods sent back, applied in the period
 *   Net sales       invoiced less credit notes and returns: what was really sold
 *   Owed to you     every open invoice's balance, whenever it was issued
 *   Overdue         the part of that past its due date
 *
 * A period is compared with the same stretch of the one before it ("this
 * month to the 6th" against "last month to the 6th"), so a change is never
 * just a month that has not finished yet.
 */

import { daysOverdue, todayISO } from './format';
import type { Invoice, Payment } from '@/types';

export type FinancePeriod = 'month' | 'quarter' | 'year';

export const PERIOD_LABEL: Record<FinancePeriod, string> = { month: 'This month', quarter: 'This quarter', year: 'This year' };
const PREVIOUS_LABEL: Record<FinancePeriod, string> = { month: 'last month', quarter: 'last quarter', year: 'last year' };

const iso = (d: Date) => todayISO(d);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

export interface PeriodRange {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  previousLabel: string;
}

export function periodRange(period: FinancePeriod, today = new Date()): PeriodRange {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start: Date;
  let prevStart: Date;
  if (period === 'month') {
    start = new Date(t.getFullYear(), t.getMonth(), 1);
    prevStart = new Date(t.getFullYear(), t.getMonth() - 1, 1);
  } else if (period === 'quarter') {
    const q = Math.floor(t.getMonth() / 3) * 3;
    start = new Date(t.getFullYear(), q, 1);
    prevStart = new Date(t.getFullYear(), q - 3, 1);
  } else {
    start = new Date(t.getFullYear(), 0, 1);
    prevStart = new Date(t.getFullYear() - 1, 0, 1);
  }
  const elapsed = daysBetween(start, t);
  /* The same number of days into the previous period, never past its end. */
  const prevEnd = addDays(start, -1);
  const prevTo = addDays(prevStart, elapsed) > prevEnd ? prevEnd : addDays(prevStart, elapsed);
  return { from: iso(start), to: iso(t), prevFrom: iso(prevStart), prevTo: iso(prevTo), previousLabel: PREVIOUS_LABEL[period] };
}

/** The earliest date the dashboard needs: the previous period, or six months for the trend. */
export function loadFrom(period: FinancePeriod, today = new Date()): string {
  const range = periodRange(period, today);
  const sixMonths = iso(new Date(today.getFullYear(), today.getMonth() - 5, 1));
  return range.prevFrom < sixMonths ? range.prevFrom : sixMonths;
}

const live = (i: Invoice) => i.status !== 'void' && i.status !== 'draft';
const isCash = (p: Payment) => p.method !== 'credit';
const isCreditNote = (p: Payment) => p.method === 'credit' && /^CN/.test(p.reference ?? '');
const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
const owedOn = (i: Invoice) => Math.max(0, (i.total ?? 0) - (i.amountPaid ?? 0));

export interface AgeBucket {
  key: string;
  label: string;
  amount: number;
  count: number;
}

export interface Debtor {
  distributorId: string;
  name: string;
  owed: number;
  overdue: number;
  invoices: number;
  oldestDays: number;
}

export interface Activity {
  id: string;
  date: string;
  kind: 'payment' | 'credit_note' | 'return' | 'invoice';
  title: string;
  detail: string;
  amount: number;
}

export interface TrendMonth {
  key: string;
  label: string;
  invoiced: number;
  collected: number;
}

export interface FinanceSummary {
  range: PeriodRange;
  invoiced: number;
  invoicedPrev: number;
  collected: number;
  collectedPrev: number;
  creditNotes: number;
  returns: number;
  netSales: number;
  invoiceCount: number;
  owed: number;
  overdue: number;
  openCount: number;
  overdueCount: number;
  /** Cash collected as a share of what was invoiced in the period, 0 to 100. */
  collectionRate: number;
  ageing: AgeBucket[];
  debtors: Debtor[];
  activity: Activity[];
  trend: TrendMonth[];
}

/** Change in percent, or null when there is nothing to compare with. */
export function change(now: number, before: number): number | null {
  if (!(before > 0)) return null;
  return Math.round(((now - before) / before) * 100);
}

export function summarise(
  period: FinancePeriod,
  invoices: Invoice[],
  openInvoices: Invoice[],
  payments: Payment[],
  today = new Date(),
): FinanceSummary {
  const range = periodRange(period, today);
  const todayKey = iso(today);
  const issued = invoices.filter(live);

  const sumInvoices = (from: string, to: string) =>
    issued.filter((i) => inRange(i.issuedOn, from, to)).reduce((s, i) => s + (i.total ?? 0), 0);
  const sumPayments = (from: string, to: string, pick: (p: Payment) => boolean) =>
    payments.filter((p) => pick(p) && inRange(p.paidOn, from, to)).reduce((s, p) => s + (p.amount ?? 0), 0);

  const invoiced = sumInvoices(range.from, range.to);
  const creditNotes = sumPayments(range.from, range.to, isCreditNote);
  const returns = sumPayments(range.from, range.to, (p) => p.method === 'credit' && !isCreditNote(p));
  const collected = sumPayments(range.from, range.to, isCash);
  const netSales = Math.max(0, invoiced - creditNotes - returns);

  /* Owed: every open invoice, of any age. */
  const open = openInvoices.filter((i) => live(i) && owedOn(i) > 0);
  const late = open.filter((i) => i.dueOn && i.dueOn < todayKey);

  const buckets: AgeBucket[] = [
    { key: 'current', label: 'Not yet due', amount: 0, count: 0 },
    { key: 'd30', label: '1 to 30 days late', amount: 0, count: 0 },
    { key: 'd60', label: '31 to 60 days late', amount: 0, count: 0 },
    { key: 'd90', label: '61 to 90 days late', amount: 0, count: 0 },
    { key: 'd90p', label: 'Over 90 days late', amount: 0, count: 0 },
  ];
  const debtors = new Map<string, Debtor>();
  for (const i of open) {
    const days = i.dueOn && i.dueOn < todayKey ? daysOverdue(i.dueOn) : 0;
    const b = days === 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
    buckets[b].amount += owedOn(i);
    buckets[b].count += 1;
    const d = debtors.get(i.distributorId) ?? {
      distributorId: i.distributorId,
      name: i.distributorName,
      owed: 0,
      overdue: 0,
      invoices: 0,
      oldestDays: 0,
    };
    d.owed += owedOn(i);
    if (days > 0) d.overdue += owedOn(i);
    d.invoices += 1;
    d.oldestDays = Math.max(d.oldestDays, days);
    debtors.set(i.distributorId, d);
  }

  /* Six months, oldest first. */
  const trend: TrendMonth[] = [];
  for (let k = 5; k >= 0; k--) {
    const first = new Date(today.getFullYear(), today.getMonth() - k, 1);
    const last = new Date(today.getFullYear(), today.getMonth() - k + 1, 0);
    trend.push({
      key: iso(first).slice(0, 7),
      label: first.toLocaleDateString('en-GB', { month: 'short' }),
      invoiced: sumInvoices(iso(first), iso(last)),
      collected: sumPayments(iso(first), iso(last), isCash),
    });
  }

  const activity: Activity[] = [
    ...payments.slice(0, 12).map<Activity>((p) => ({
      id: `p-${p.id}`,
      date: p.paidOn,
      kind: isCash(p) ? 'payment' : isCreditNote(p) ? 'credit_note' : 'return',
      title: isCash(p) ? 'Payment received' : isCreditNote(p) ? `Credit note ${p.reference}` : 'Return credit',
      detail: p.invoiceNumber,
      amount: p.amount,
    })),
    ...issued.slice(0, 12).map<Activity>((i) => ({
      id: `i-${i.id}`,
      date: i.issuedOn,
      kind: 'invoice',
      title: i.distributorName,
      detail: `Invoice ${i.invoiceNumber}`,
      amount: i.total,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, 6);

  return {
    range,
    invoiced,
    invoicedPrev: sumInvoices(range.prevFrom, range.prevTo),
    collected,
    collectedPrev: sumPayments(range.prevFrom, range.prevTo, isCash),
    creditNotes,
    returns,
    netSales,
    invoiceCount: issued.filter((i) => inRange(i.issuedOn, range.from, range.to)).length,
    owed: open.reduce((s, i) => s + owedOn(i), 0),
    overdue: late.reduce((s, i) => s + owedOn(i), 0),
    openCount: open.length,
    overdueCount: late.length,
    collectionRate: invoiced > 0 ? Math.min(100, Math.round((collected / invoiced) * 100)) : 0,
    ageing: buckets,
    debtors: [...debtors.values()].sort((a, b) => b.owed - a.owed).slice(0, 5),
    activity,
    trend,
  };
}
