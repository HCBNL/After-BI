/**
 * Reminders: the app reading its own records and saying what needs somebody.
 *
 * No server, no scheduler, no messages sent to anyone. Every line below is
 * worked out in the browser from lists the app already reads, against windows
 * an administrator sets in Settings. That keeps it honest (it can only tell
 * you what the data says) and cheap (nothing runs while nobody is looking).
 *
 * Each reminder carries a stable id, so a person can snooze one until
 * tomorrow without it coming back the moment the screen refreshes.
 */
import { isAdmin } from './roles';
import { count, naira } from './format';
import type { Distributor, Invoice, Order, ReturnRecord, Role, Sale, StockPosition } from '@/types';

export type ReminderKey =
  | 'approval-waiting'
  | 'order-unfulfilled'
  | 'order-uninvoiced'
  | 'invoice-overdue'
  | 'credit-tight'
  | 'stock-out'
  | 'stock-low'
  | 'return-waiting'
  | 'draft-idle'
  | 'account-dormant'
  | 'sellout-quiet';

/** `later` is worth knowing; the other two are worth doing something about. */
export type Severity = 'critical' | 'warning' | 'later';

export interface Reminder {
  id: string;
  key: ReminderKey;
  severity: Severity;
  title: string;
  detail: string;
  to: string;
  since?: string;
  days: number;
}

export interface ReminderThresholds {
  approvalHours: number;
  fulfilDays: number;
  invoiceDays: number;
  draftDays: number;
  dormantDays: number;
  sellOutDays: number;
  creditPercent: number;
}

export const REMINDER_DEFAULTS: ReminderThresholds = {
  approvalHours: 8,
  fulfilDays: 2,
  invoiceDays: 2,
  draftDays: 3,
  dormantDays: 30,
  sellOutDays: 5,
  creditPercent: 80,
};

/** The windows, as an administrator sees them in Settings. */
export const REMINDER_FIELDS: { key: keyof ReminderThresholds; label: string; hint: string }[] = [
  { key: 'approvalHours', label: 'Signature chase (hours)', hint: 'How long an order may sit unsigned before it is chased.' },
  { key: 'fulfilDays', label: 'Fulfilment (days)', hint: 'How long an approved order may wait before the depot is chased.' },
  { key: 'invoiceDays', label: 'Invoicing (days)', hint: 'How long a delivered order may go uninvoiced.' },
  { key: 'draftDays', label: 'Idle drafts (days)', hint: 'How long a draft order may sit untouched.' },
  { key: 'dormantDays', label: 'Dormant account (days)', hint: 'How long an active distributor may go without ordering.' },
  { key: 'sellOutDays', label: 'Quiet sell-out (days)', hint: 'How long a rep may go without keying sell-out.' },
  { key: 'creditPercent', label: 'Credit warning (%)', hint: 'How much of a credit limit may be used before it is flagged.' },
];

export function thresholdsFrom(stored?: Partial<ReminderThresholds> | null): ReminderThresholds {
  const merged = { ...REMINDER_DEFAULTS, ...(stored ?? {}) };
  for (const key of Object.keys(REMINDER_DEFAULTS) as (keyof ReminderThresholds)[]) {
    const value = Number(merged[key]);
    merged[key] = Number.isFinite(value) && value > 0 ? value : REMINDER_DEFAULTS[key];
  }
  return merged;
}

const DAY = 86_400_000;
const hoursSince = (iso?: string) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000) : 0);
const daysSince = (iso?: string) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function ageLabel(iso?: string): string {
  const hours = hoursSince(iso);
  if (hours < 1) return 'in the last hour';
  if (hours < 24) return plural(hours, 'hour') + ' ago';
  return plural(Math.floor(hours / 24), 'day') + ' ago';
}

const RANK: Record<Severity, number> = { critical: 0, warning: 1, later: 2 };

export interface ReminderInput {
  role: Role;
  uid: string;
  root: string;
  thresholds: ReminderThresholds;
  orders: Order[];
  invoices: Invoice[];
  stock: StockPosition[];
  returns: ReturnRecord[];
  sales: Sale[];
  distributors: Distributor[];
}

export function buildReminders(input: ReminderInput): Reminder[] {
  const { role, uid, root, thresholds: t } = input;
  const office = isAdmin(role) || role === 'staff';
  const ops = office || role === 'operations_manager' || role === 'warehouse_manager';
  const money = isAdmin(role) || role === 'finance_manager';
  const partner = role === 'distributor' || role === 'sales_rep';
  const out: Reminder[] = [];
  const today = new Date().toISOString().slice(0, 10);

  /* Waiting for a signature, yours. */
  for (const order of input.orders) {
    if (order.status !== 'pending_approval') continue;
    if (!(order.approvers ?? []).includes(uid) && role !== 'super_admin') continue;
    const hours = hoursSince(order.createdAt);
    if (hours < t.approvalHours) continue;
    out.push({
      id: `approval:${order.id}`,
      key: 'approval-waiting',
      severity: hours >= t.approvalHours * 3 ? 'critical' : 'warning',
      title: `${order.orderNumber} is waiting for your signature`,
      detail: `${order.distributorName}, ${naira(order.total)}, raised ${ageLabel(order.createdAt)}.`,
      to: `${root}/approvals`,
      since: order.createdAt,
      days: Math.floor(hours / 24),
    });
  }

  /* Approved and still sitting in the depot. */
  if (ops) {
    for (const order of input.orders) {
      if (order.status !== 'approved') continue;
      const days = daysSince(order.approvedAt ?? order.createdAt);
      if (days < t.fulfilDays) continue;
      out.push({
        id: `fulfil:${order.id}`,
        key: 'order-unfulfilled',
        severity: days >= t.fulfilDays * 3 ? 'critical' : 'warning',
        title: `${order.orderNumber} is approved but not fulfilled`,
        detail: `${order.distributorName}, ${naira(order.total)}, approved ${ageLabel(order.approvedAt ?? order.createdAt)}.`,
        to: `${root}/orders`,
        since: order.approvedAt ?? order.createdAt,
        days,
      });
    }
  }

  /* Delivered and never billed: the quietest way to lose money. */
  if (money) {
    const invoiced = new Set(input.invoices.map((invoice) => invoice.orderId).filter(Boolean));
    for (const order of input.orders) {
      if (order.status !== 'fulfilled' || invoiced.has(order.id)) continue;
      const days = daysSince(order.fulfilledAt ?? order.updatedAt ?? order.createdAt);
      if (days < t.invoiceDays) continue;
      out.push({
        id: `invoice:${order.id}`,
        key: 'order-uninvoiced',
        severity: days >= t.invoiceDays * 4 ? 'critical' : 'warning',
        title: `${order.orderNumber} was delivered but never invoiced`,
        detail: `${order.distributorName}, ${naira(order.total)}, fulfilled ${ageLabel(order.fulfilledAt)}.`,
        to: `${root}/invoices`,
        since: order.fulfilledAt,
        days,
      });
    }
  }

  /* Past its due date. */
  if (money || partner) {
    for (const invoice of input.invoices) {
      if (!['issued', 'part_paid', 'overdue'].includes(invoice.status)) continue;
      if (!invoice.dueOn || invoice.dueOn >= today) continue;
      const days = daysSince(invoice.dueOn);
      const owed = invoice.total - (invoice.amountPaid ?? 0);
      if (owed <= 0) continue;
      out.push({
        id: `overdue:${invoice.id}`,
        key: 'invoice-overdue',
        severity: days >= 14 ? 'critical' : 'warning',
        title: partner
          ? `${invoice.invoiceNumber} is ${plural(days, 'day')} overdue`
          : `${invoice.distributorName} is ${plural(days, 'day')} late on ${invoice.invoiceNumber}`,
        detail: `${naira(owed)} outstanding of ${naira(invoice.total)}.`,
        to: `${root}/invoices`,
        since: invoice.dueOn,
        days,
      });
    }
  }

  /* Against the ceiling you set for them. */
  if (money) {
    const owed = new Map<string, number>();
    for (const invoice of input.invoices) {
      if (!['issued', 'part_paid', 'overdue'].includes(invoice.status)) continue;
      const left = invoice.total - (invoice.amountPaid ?? 0);
      if (left > 0) owed.set(invoice.distributorId, (owed.get(invoice.distributorId) ?? 0) + left);
    }
    for (const distributor of input.distributors) {
      const limit = distributor.creditLimit ?? 0;
      if (!limit) continue;
      const outstanding = owed.get(distributor.id) ?? 0;
      const used = (outstanding / limit) * 100;
      if (used < t.creditPercent) continue;
      out.push({
        id: `credit:${distributor.id}`,
        key: 'credit-tight',
        severity: used >= 100 ? 'critical' : 'warning',
        title: `${distributor.company} is at ${Math.round(used)}% of its credit limit`,
        detail: `${naira(outstanding)} outstanding against ${naira(limit)}.`,
        to: `${root}/invoices`,
        days: 0,
      });
    }
  }

  /* Running out, or out. */
  if (ops) {
    for (const position of input.stock) {
      const empty = position.quantity <= 0;
      out.push({
        id: `stock:${position.id}`,
        key: empty ? 'stock-out' : 'stock-low',
        severity: empty ? 'critical' : 'warning',
        title: empty ? `${position.productName} is out of stock` : `${position.productName} is below its threshold`,
        detail: `${count(position.quantity)} ${position.unit} on hand, threshold ${count(position.threshold)}.`,
        to: `${root}/stock`,
        days: 0,
      });
    }

    for (const claim of input.returns) {
      if (claim.status !== 'requested') continue;
      const days = daysSince(claim.createdAt);
      if (days < 1) continue;
      out.push({
        id: `return:${claim.id}`,
        key: 'return-waiting',
        severity: days >= 5 ? 'critical' : 'warning',
        title: `A claim from ${claim.distributorName} is waiting on a decision`,
        detail: `${count(claim.quantity)} of ${claim.productName}, raised ${ageLabel(claim.createdAt)}.`,
        to: `${root}/returns`,
        since: claim.createdAt,
        days,
      });
    }
  }

  /* Started and forgotten. */
  for (const order of input.orders) {
    if (order.status !== 'draft') continue;
    if (order.createdBy !== uid && !office) continue;
    const days = daysSince(order.createdAt);
    if (days < t.draftDays) continue;
    out.push({
      id: `draft:${order.id}`,
      key: 'draft-idle',
      severity: 'later',
      title: `${order.orderNumber} is still a draft`,
      detail: `${order.distributorName}, ${naira(order.total)}, started ${ageLabel(order.createdAt)}.`,
      to: `${root}/orders`,
      since: order.createdAt,
      days,
    });
  }

  /* Accounts that have gone quiet. */
  if (office) {
    const lastOrder = new Map<string, string>();
    for (const order of input.orders) {
      const held = lastOrder.get(order.distributorId);
      if (!held || order.createdAt > held) lastOrder.set(order.distributorId, order.createdAt);
    }
    for (const distributor of input.distributors) {
      if (distributor.status !== 'active') continue;
      const last = lastOrder.get(distributor.id);
      const days = last ? daysSince(last) : t.dormantDays + 1;
      if (days < t.dormantDays) continue;
      out.push({
        id: `dormant:${distributor.id}`,
        key: 'account-dormant',
        severity: 'later',
        title: `${distributor.company} has not ordered in a while`,
        detail: last ? `Last order ${ageLabel(last)}.` : 'No order on record yet.',
        to: `${root}/distributors`,
        since: last,
        days,
      });
    }
  }

  /* A rep with nothing keyed. */
  if (role === 'sales_rep') {
    const newest = input.sales.reduce((latest, sale) => (sale.saleDate > latest ? sale.saleDate : latest), '');
    const days = newest ? daysSince(newest) : t.sellOutDays + 1;
    if (days >= t.sellOutDays) {
      out.push({
        id: 'sellout:quiet',
        key: 'sellout-quiet',
        severity: 'later',
        title: 'No sell-out keyed lately',
        detail: newest ? `The last one was ${plural(days, 'day')} ago.` : 'Nothing has been keyed yet.',
        to: `${root}/sell-out`,
        days,
      });
    }
  }

  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.days - a.days);
}

export function tally(reminders: Reminder[]) {
  const critical = reminders.filter((r) => r.severity === 'critical').length;
  const warning = reminders.filter((r) => r.severity === 'warning').length;
  return { critical, warning, later: reminders.length - critical - warning, action: critical + warning };
}
