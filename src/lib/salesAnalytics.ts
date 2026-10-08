/**
 * Sales analytics: revenue by salesperson, customer, channel, location and
 * product category, for a period and the period before it.
 *
 * LIGHT ON PURPOSE
 *
 * One read per source (the orders or the sell-out records since the start of
 * the previous period), then everything here is sums in the browser. No unit
 * counts, no per-day series, no extra collections and no indexes to build.
 * Every breakdown is the same shape, a list of rows with revenue, share and
 * growth, so one table component draws all of them and one function exports
 * any of them to a spreadsheet.
 *
 * WHAT COUNTS AS REVENUE
 *
 *   Sell-in   orders that have been approved or fulfilled, by the day they
 *             were raised. Drafts, pending, rejected and cancelled orders are
 *             not revenue.
 *   Sell-out  what distributors and reps keyed as sold to the shops.
 *
 * WHO THE SALESPERSON IS
 *
 * The rep who raised the order. An order the office raised for an account
 * goes to the rep who manages that account, and to "House accounts" when no
 * rep does. Sell-out goes to whoever keyed it.
 */

import { ZONE_OF } from '@/data/states';
import { NIGERIAN_STATES } from '@/data/states';
import { TIER_LABEL, type Distributor, type Order, type Product, type Sale, type UserProfile } from '@/types';

export type Source = 'sell-in' | 'sell-out';

export type PeriodKey = 'today' | 'this-month' | 'last-month' | 'this-quarter' | 'last-90' | 'this-year';

export const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'last-90', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
];

export interface Period {
  /** Inclusive, YYYY-MM-DD. */
  from: string;
  to: string;
  /** The same length of time immediately before, for growth. */
  prevFrom: string;
  prevTo: string;
  label: string;
}

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function periodFor(key: PeriodKey, now = new Date()): Period {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from: Date;
  let to: Date = today;
  let prevFrom: Date;
  let prevTo: Date;

  switch (key) {
    case 'today':
      /* The close of business view: today against the same day last week,
         which is a fairer comparison than yesterday for a weekly trade. */
      from = today;
      prevFrom = addDays(today, -7);
      prevTo = prevFrom;
      break;
    case 'this-month':
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      prevFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      /* Month to date against the same days of last month, not all of it. */
      prevTo = addDays(prevFrom, today.getDate() - 1);
      break;
    case 'last-month':
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
      prevFrom = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      prevTo = new Date(today.getFullYear(), today.getMonth() - 1, 0);
      break;
    case 'this-quarter': {
      const q = Math.floor(today.getMonth() / 3) * 3;
      from = new Date(today.getFullYear(), q, 1);
      prevFrom = new Date(today.getFullYear(), q - 3, 1);
      prevTo = addDays(prevFrom, Math.round((today.getTime() - from.getTime()) / 86_400_000));
      break;
    }
    case 'last-90':
      from = addDays(today, -89);
      prevTo = addDays(from, -1);
      prevFrom = addDays(prevTo, -89);
      break;
    case 'this-year':
      from = new Date(today.getFullYear(), 0, 1);
      prevFrom = new Date(today.getFullYear() - 1, 0, 1);
      prevTo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      break;
  }

  return {
    from: iso(from),
    to: iso(to),
    prevFrom: iso(prevFrom),
    prevTo: iso(prevTo),
    label: PERIODS.find((p) => p.value === key)?.label ?? '',
  };
}

/* ------------------------------------------------------------ the records */

/** One sale, flattened to the fields every breakdown needs. */
export interface Fact {
  date: string;
  value: number;
  customerId: string;
  customer: string;
  channel: string;
  state: string;
  zone: string;
  rep: string;
  category: string;
  product: string;
}

const STATE_ALIASES: Record<string, string> = {
  abuja: 'FCT',
  'federal capital territory': 'FCT',
  nassarawa: 'Nasarawa',
  'akwa-ibom': 'Akwa Ibom',
  'cross-river': 'Cross River',
};

/** A free-text location ("Lagos", "lagos state", "Abuja") as one of the 37 states, or ''. */
export function stateOf(location: string | undefined): string {
  const raw = (location ?? '').trim().toLowerCase().replace(/\s+state$/, '');
  if (!raw) return '';
  if (STATE_ALIASES[raw]) return STATE_ALIASES[raw];
  const hit = NIGERIAN_STATES.find((s) => s.toLowerCase() === raw);
  if (hit) return hit;
  /* "Ikeja, Lagos" or "Lagos Island": the first state named anywhere in it. */
  return NIGERIAN_STATES.find((s) => raw.includes(s.toLowerCase())) ?? '';
}

const UNPLACED = 'Not set';

export interface Context {
  distributors: Distributor[];
  products: Product[];
  members: UserProfile[];
}

/** The rep who manages each account, the first one listed if there are several. */
function repByAccount(members: UserProfile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of members) {
    if (m.role !== 'sales_rep' || m.active === false) continue;
    for (const id of m.distributorIds ?? []) {
      if (!map.has(id)) map.set(id, `${m.firstName} ${m.lastName}`.trim());
    }
  }
  return map;
}

const REVENUE: Order['status'][] = ['approved', 'fulfilled'];

export function factsFrom(source: Source, orders: Order[], sales: Sale[], ctx: Context): Fact[] {
  const accounts = new Map(ctx.distributors.map((d) => [d.id, d]));
  const categories = new Map(ctx.products.map((p) => [p.id, p.category || 'Uncategorised']));
  const reps = repByAccount(ctx.members);

  const place = (customerId: string, fallbackName: string) => {
    const account = accounts.get(customerId);
    const state = stateOf(account?.location) || UNPLACED;
    return {
      customer: account?.company ?? fallbackName,
      channel: account ? TIER_LABEL[account.category] ?? account.category : UNPLACED,
      state,
      zone: ZONE_OF[state] ?? UNPLACED,
    };
  };

  if (source === 'sell-out') {
    return sales.map((sale) => ({
      date: sale.saleDate,
      value: sale.total,
      customerId: sale.distributorId,
      ...place(sale.distributorId, sale.distributorName),
      rep: sale.capturedByName || reps.get(sale.distributorId) || 'House accounts',
      category: categories.get(sale.productId) ?? 'Uncategorised',
      product: sale.productName,
    }));
  }

  const out: Fact[] = [];
  for (const order of orders) {
    if (!REVENUE.includes(order.status)) continue;
    const where = place(order.distributorId, order.distributorName);
    const rep =
      order.createdByRole === 'sales_rep' ? order.createdByName : reps.get(order.distributorId) ?? 'House accounts';
    const date = (order.createdAt ?? '').slice(0, 10);
    /* One fact per line, so category and product are exact; every other
       breakdown adds the lines back up to the order. */
    for (const line of order.lines ?? []) {
      out.push({
        date,
        value: line.lineTotal,
        customerId: order.distributorId,
        ...where,
        rep,
        category: line.category || categories.get(line.productId) || 'Uncategorised',
        product: line.productName,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------ the breakdowns */

export type Dimension = 'rep' | 'customer' | 'channel' | 'state' | 'zone' | 'category' | 'product';

export const DIMENSION_LABEL: Record<Dimension, string> = {
  rep: 'Salesperson',
  customer: 'Customer',
  channel: 'Channel',
  state: 'State',
  zone: 'Region',
  category: 'Category',
  product: 'Product',
};

export interface Row {
  key: string;
  revenue: number;
  previous: number;
  /** Percent of the period's revenue. */
  share: number;
  /** Percent change against the previous period; null when there was nothing before. */
  growth: number | null;
  /** Distinct customers behind this row (for reps, channels and places). */
  customers: number;
}

export interface Filters {
  rep?: string;
  channel?: string;
  state?: string;
}

export function inPeriod(fact: Fact, from: string, to: string): boolean {
  return fact.date >= from && fact.date <= to;
}

export function applyFilters(facts: Fact[], f: Filters): Fact[] {
  return facts.filter(
    (fact) => (!f.rep || fact.rep === f.rep) && (!f.channel || fact.channel === f.channel) && (!f.state || fact.state === f.state),
  );
}

export function breakdown(current: Fact[], previous: Fact[], by: Dimension): Row[] {
  const total = current.reduce((sum, f) => sum + f.value, 0);
  const rows = new Map<string, { revenue: number; previous: number; customers: Set<string> }>();
  const key = (fact: Fact) => (by === 'customer' ? fact.customer : fact[by]);

  for (const fact of current) {
    const k = key(fact);
    const row = rows.get(k) ?? { revenue: 0, previous: 0, customers: new Set<string>() };
    row.revenue += fact.value;
    row.customers.add(fact.customerId);
    rows.set(k, row);
  }
  for (const fact of previous) {
    const k = key(fact);
    const row = rows.get(k) ?? { revenue: 0, previous: 0, customers: new Set<string>() };
    row.previous += fact.value;
    rows.set(k, row);
  }

  return [...rows.entries()]
    .map(([k, row]) => ({
      key: k,
      revenue: row.revenue,
      previous: row.previous,
      share: total ? (row.revenue / total) * 100 : 0,
      growth: row.previous > 0 ? ((row.revenue - row.previous) / row.previous) * 100 : null,
      customers: row.customers.size,
    }))
    .filter((row) => row.revenue > 0 || row.previous > 0)
    .sort((a, b) => b.revenue - a.revenue || b.previous - a.previous);
}

export interface Summary {
  revenue: number;
  previous: number;
  growth: number | null;
  /** Customers who bought in the period. */
  buying: number;
  /** Active accounts in scope (the filters applied). */
  accounts: number;
  perCustomer: number;
}

export function summarise(current: Fact[], previous: Fact[], accounts: number): Summary {
  const revenue = current.reduce((s, f) => s + f.value, 0);
  const before = previous.reduce((s, f) => s + f.value, 0);
  const buying = new Set(current.map((f) => f.customerId)).size;
  return {
    revenue,
    previous: before,
    growth: before > 0 ? ((revenue - before) / before) * 100 : null,
    buying,
    accounts,
    perCustomer: buying ? revenue / buying : 0,
  };
}

/** Accounts that bought last period and not this one: who to call first. */
export function lapsed(current: Fact[], previous: Fact[]): { customer: string; previous: number }[] {
  const now = new Set(current.map((f) => f.customerId));
  const before = new Map<string, { customer: string; previous: number }>();
  for (const f of previous) {
    if (now.has(f.customerId)) continue;
    const held = before.get(f.customerId) ?? { customer: f.customer, previous: 0 };
    held.previous += f.value;
    before.set(f.customerId, held);
  }
  return [...before.values()].sort((a, b) => b.previous - a.previous);
}

/* ------------------------------------------------------------ the export */

/** A breakdown as a CSV file the browser downloads, for the monthly pack. */
export function downloadCsv(name: string, label: string, rows: Row[]): void {
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [
    [label, 'Revenue (NGN)', 'Previous period (NGN)', 'Share %', 'Growth %', 'Customers'].join(','),
    ...rows.map((r) =>
      [
        cell(r.key),
        Math.round(r.revenue),
        Math.round(r.previous),
        r.share.toFixed(1),
        r.growth === null ? '' : r.growth.toFixed(1),
        r.customers,
      ].join(','),
    ),
  ];
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
