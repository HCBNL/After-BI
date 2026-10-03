/**
 * The daily brief: the app reading its own records and saying, in plain words,
 * what to do first.
 *
 * NO AI, ON PURPOSE
 *
 * Nothing here is sent anywhere and nothing is guessed. Every sentence is
 * built from rules over records the app has already read for the reminders:
 * orders, invoices, stock, returns and the person's own tasks. The same data
 * always produces the same brief, which is the property a business wants from
 * software that tells its staff what to do. Where a rule cannot say something
 * true, it says nothing.
 *
 * WHAT IT WORKS OUT
 *
 *   focus      the five things most worth doing now, ranked by how urgent,
 *              how old and how much money is held up
 *   pipeline   where orders are in their journey, from draft to paid, and
 *              which stage is holding them up
 *   insights   a few observations a manager would otherwise work out in a
 *              spreadsheet: how long signatures take, who owes the most
 *   suggestions reminders worth keeping as a task with a date on it
 */

import { isAdmin, isFinance, isOperations } from './roles';
import { count, naira, nairaShort, todayISO } from './format';
import type { Reminder, ReminderThresholds, Severity } from './reminders';
import type { Task } from './tasks';
import type { Invoice, Order, Role } from '@/types';

export interface FocusItem {
  id: string;
  title: string;
  detail: string;
  to: string;
  severity: Severity;
  /** Why it is ranked where it is, in a few words. */
  reason: string;
  /** The reminder behind it, when there is one: it can become a task. */
  reminder?: Reminder;
  score: number;
}

export interface Stage {
  key: 'draft' | 'signature' | 'fulfil' | 'invoice' | 'collect' | 'paid';
  label: string;
  count: number;
  value: number;
  /** How many have been here longer than the organisation's window. */
  stuck: number;
  oldestDays: number;
  to: string;
}

export interface Insight {
  id: string;
  tone: 'good' | 'warning' | 'neutral';
  text: string;
  to?: string;
}

export interface Brief {
  greeting: string;
  summary: string;
  focus: FocusItem[];
  pipeline: Stage[];
  /** The stage holding the most up, when one is. */
  bottleneck: Stage | null;
  insights: Insight[];
  suggestions: Reminder[];
}

export interface BriefInput {
  role: Role;
  firstName: string;
  root: string;
  reminders: Reminder[];
  orders: Order[];
  invoices: Invoice[];
  tasks: Task[];
  thresholds: ReminderThresholds;
  now?: Date;
}

const DAY = 86_400_000;
const daysSince = (iso: string | undefined, now: number) =>
  iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY)) : 0;
const hoursBetween = (from?: string, to?: string) =>
  from && to ? (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000 : NaN;
const plural = (n: number, word: string, many = `${word}s`) => `${count(n)} ${n === 1 ? word : many}`;

const WEIGHT: Record<Severity, number> = { critical: 100, warning: 60, later: 20 };

/** "Good morning", by the clock on the device. */
function greetingFor(firstName: string, now = new Date()): string {
  const hour = now.getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${part}, ${firstName}` : part;
}

/* ------------------------------------------------------------------ focus */

/**
 * How much a reminder deserves to be first.
 *
 * Severity sets the band, age moves it within the band, money breaks ties.
 * Money is on a log scale so a ₦40m order does not bury everything else:
 * ten times the money is worth a few days of waiting, not a whole band.
 */
function score(reminder: Reminder): number {
  const age = Math.min(reminder.days, 30) * 2;
  const money = reminder.amount && reminder.amount > 0 ? Math.min(Math.log10(reminder.amount) * 4, 30) : 0;
  const mine = reminder.key === 'task-due' ? 8 : 0;
  return WEIGHT[reminder.severity] + age + money + mine;
}

function reasonFor(reminder: Reminder): string {
  const parts: string[] = [];
  if (reminder.severity === 'critical') parts.push('well past its window');
  else if (reminder.severity === 'warning') parts.push('past its window');
  if (reminder.days > 0) parts.push(`${plural(reminder.days, 'day')} old`);
  if (reminder.amount && reminder.amount >= 1) parts.push(`${nairaShort(reminder.amount)} held up`);
  if (reminder.key === 'task-due') parts.push('your own task');
  return parts.join(', ') || 'worth a look';
}

function focusFrom(reminders: Reminder[]): FocusItem[] {
  return reminders
    .map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      detail: reminder.detail,
      to: reminder.to,
      severity: reminder.severity,
      reason: reasonFor(reminder),
      reminder,
      score: score(reminder),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/* --------------------------------------------------------------- pipeline */

/**
 * Where every order is, from the moment it is started to the money arriving.
 *
 * Only for the people who see orders across accounts or their own: a stage
 * with nothing in it still draws, so the shape of the flow is always the
 * same and an empty stage reads as "clear", not as missing.
 */
function pipelineFrom(input: BriefInput, now: number): Stage[] {
  const { orders, invoices, thresholds: t, root } = input;
  const today = todayISO(new Date(now));
  const invoiced = new Set(invoices.map((invoice) => invoice.orderId).filter(Boolean));

  const stage = (
    key: Stage['key'],
    label: string,
    rows: { value: number; since?: string }[],
    windowDays: number,
    to: string,
  ): Stage => {
    let stuck = 0;
    let oldest = 0;
    let value = 0;
    for (const row of rows) {
      const age = daysSince(row.since, now);
      value += row.value;
      oldest = Math.max(oldest, age);
      if (windowDays >= 0 && age >= windowDays) stuck += 1;
    }
    return { key, label, count: rows.length, value, stuck, oldestDays: oldest, to };
  };

  const byStatus = (status: Order['status']) => orders.filter((order) => order.status === status);
  const open = invoices.filter((invoice) => ['issued', 'part_paid', 'overdue'].includes(invoice.status));
  const monthAgo = new Date(now - 30 * DAY).toISOString();

  return [
    stage(
      'draft',
      'Draft',
      byStatus('draft').map((o) => ({ value: o.total, since: o.updatedAt ?? o.createdAt })),
      t.draftDays,
      `${root}/orders`,
    ),
    stage(
      'signature',
      'Awaiting signature',
      byStatus('pending_approval').map((o) => ({ value: o.total, since: o.createdAt })),
      Math.max(1, Math.ceil(t.approvalHours / 24)),
      /* Reps and distributors have no Approvals screen; their orders list shows the same. */
      input.role === 'sales_rep' || input.role === 'distributor' ? `${root}/orders` : `${root}/approvals`,
    ),
    stage(
      'fulfil',
      'Approved, not delivered',
      byStatus('approved').map((o) => ({ value: o.total, since: o.approvedAt ?? o.createdAt })),
      t.fulfilDays,
      `${root}/orders`,
    ),
    stage(
      'invoice',
      'Delivered, not invoiced',
      byStatus('fulfilled')
        .filter((o) => !invoiced.has(o.id))
        .map((o) => ({ value: o.total, since: o.fulfilledAt ?? o.updatedAt ?? o.createdAt })),
      t.invoiceDays,
      `${root}/invoices`,
    ),
    {
      ...stage(
        'collect',
        'Invoiced, not paid',
        open.map((i) => ({ value: i.total - (i.amountPaid ?? 0), since: i.issuedOn })),
        -1,
        `${root}/invoices`,
      ),
      /* Stuck here means past its due date, not merely old. */
      stuck: open.filter((i) => i.dueOn && i.dueOn < today).length,
    },
    stage(
      'paid',
      'Paid in the last 30 days',
      invoices.filter((i) => i.status === 'paid' && (i.updatedAt ?? i.createdAt) >= monthAgo).map((i) => ({ value: i.total })),
      -1,
      `${root}/invoices`,
    ),
  ];
}

/** The stage with the most stuck in it, weighted by what it is holding. */
function bottleneckOf(pipeline: Stage[]): Stage | null {
  const candidates = pipeline.filter((s) => s.key !== 'paid' && s.stuck > 0);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.stuck - a.stuck || b.value - a.value)[0];
}

/* --------------------------------------------------------------- insights */

function average(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v) && v >= 0);
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : NaN;
}

function duration(hours: number): string {
  if (hours < 1) return 'under an hour';
  if (hours < 36) return plural(Math.round(hours), 'hour');
  return plural(Math.round(hours / 24), 'day');
}

/**
 * Observations, each one only when the records can support it.
 *
 * Three orders is the floor for an average: two is an anecdote. A line that
 * cannot be said truthfully is left out rather than softened.
 */
function insightsFrom(input: BriefInput, now: number): Insight[] {
  const { role, orders, invoices, root } = input;
  const out: Insight[] = [];
  const monthAgo = new Date(now - 30 * DAY).toISOString();
  const today = todayISO(new Date(now));
  const recent = orders.filter((o) => o.createdAt >= monthAgo);

  /* How long a signature takes. */
  if (isAdmin(role) || isFinance(role) || isOperations(role) || role === 'staff') {
    const signed = recent.filter((o) => o.approvedAt && o.approvers?.length);
    const hours = average(signed.map((o) => hoursBetween(o.createdAt, o.approvedAt)));
    if (signed.length >= 3 && Number.isFinite(hours)) {
      const slow = hours > input.thresholds.approvalHours;
      out.push({
        id: 'sign-speed',
        tone: slow ? 'warning' : 'good',
        text: `Orders that needed a signature waited ${duration(hours)} on average this month${
          slow ? `, longer than the ${plural(input.thresholds.approvalHours, 'hour')} your organisation allows` : ''
        }.`,
        to: `${root}/approvals`,
      });
    }

    /* How long the depot takes once an order is approved. */
    const delivered = recent.filter((o) => o.approvedAt && o.fulfilledAt);
    const fulfil = average(delivered.map((o) => hoursBetween(o.approvedAt, o.fulfilledAt)));
    if (delivered.length >= 3 && Number.isFinite(fulfil)) {
      out.push({
        id: 'fulfil-speed',
        tone: fulfil / 24 > input.thresholds.fulfilDays ? 'warning' : 'good',
        text: `From approved to delivered took ${duration(fulfil)} on average across ${plural(delivered.length, 'order')}.`,
        to: `${root}/orders`,
      });
    }
  }

  /* Who owes the most, and how much of the book that is. */
  if (isAdmin(role) || isFinance(role)) {
    const owed = new Map<string, { name: string; amount: number }>();
    let total = 0;
    for (const invoice of invoices) {
      if (!['issued', 'part_paid', 'overdue'].includes(invoice.status)) continue;
      const left = invoice.total - (invoice.amountPaid ?? 0);
      if (left <= 0) continue;
      total += left;
      const held = owed.get(invoice.distributorId) ?? { name: invoice.distributorName, amount: 0 };
      held.amount += left;
      owed.set(invoice.distributorId, held);
    }
    const top = [...owed.values()].sort((a, b) => b.amount - a.amount)[0];
    if (top && owed.size >= 2 && total > 0) {
      const share = Math.round((top.amount / total) * 100);
      out.push({
        id: 'top-debtor',
        tone: share >= 40 ? 'warning' : 'neutral',
        text: `${top.name} owes ${naira(top.amount)}, ${share}% of everything outstanding.`,
        to: `${root}/statement`,
      });
    }
  }

  /* A few accounts carrying the month. */
  if (isAdmin(role) || role === 'staff' || role === 'sales_rep') {
    const live = recent.filter((o) => !['draft', 'cancelled', 'rejected'].includes(o.status));
    const byAccount = new Map<string, { name: string; value: number }>();
    let sum = 0;
    for (const order of live) {
      sum += order.total;
      const held = byAccount.get(order.distributorId) ?? { name: order.distributorName, value: 0 };
      held.value += order.total;
      byAccount.set(order.distributorId, held);
    }
    const ranked = [...byAccount.values()].sort((a, b) => b.value - a.value);
    if (ranked.length >= 5 && sum > 0) {
      const topThree = ranked.slice(0, 3).reduce((a, b) => a + b.value, 0);
      const share = Math.round((topThree / sum) * 100);
      if (share >= 50) {
        out.push({
          id: 'concentration',
          tone: 'neutral',
          text: `Three accounts carried ${share}% of order value in the last 30 days, led by ${ranked[0].name}.`,
          to: `${root}/orders`,
        });
      }
    }
  }

  /* Started and never sent. */
  const abandoned = recent.filter((o) => o.status === 'draft' && daysSince(o.createdAt, now) >= input.thresholds.draftDays);
  if (abandoned.length >= 2) {
    out.push({
      id: 'abandoned',
      tone: 'warning',
      text: `${plural(abandoned.length, 'order')} worth ${nairaShort(abandoned.reduce((a, o) => a + o.total, 0))} were started this month and never submitted.`,
      to: `${root}/orders`,
    });
  }

  /* For a distributor or a rep: what falls due this week. */
  if (role === 'distributor' || role === 'sales_rep') {
    const week = todayISO(new Date(now + 7 * DAY));
    const due = invoices.filter(
      (i) => ['issued', 'part_paid'].includes(i.status) && i.dueOn >= today && i.dueOn <= week,
    );
    if (due.length) {
      const amount = due.reduce((a, i) => a + (i.total - (i.amountPaid ?? 0)), 0);
      out.push({
        id: 'due-week',
        tone: 'neutral',
        text: `${plural(due.length, 'invoice')} worth ${naira(amount)} fall due in the next 7 days.`,
        to: `${root}/invoices`,
      });
    }
  }

  return out.slice(0, 4);
}

/* ---------------------------------------------------------------- summary */

/**
 * From four in the afternoon, a line on the day's business: what was booked
 * today, so the close of business figure is on the home screen without
 * opening a report.
 */
function todayLine(orders: Order[], now: number): string {
  const when = new Date(now);
  if (when.getHours() < 16) return '';
  const today = todayISO(when);
  const booked = orders.filter(
    (o) => (o.status === 'approved' || o.status === 'fulfilled') && (o.createdAt ?? '').slice(0, 10) === today,
  );
  if (!booked.length) return 'No orders were booked today.';
  return `Today: ${plural(booked.length, 'order')} booked, worth ${nairaShort(booked.reduce((a, o) => a + o.total, 0))}.`;
}

function summaryFrom(focus: FocusItem[], reminders: Reminder[], bottleneck: Stage | null, tasksToday: number): string {
  const action = reminders.filter((r) => r.severity !== 'later');
  if (action.length === 0) {
    const quiet = reminders.length
      ? ` ${plural(reminders.length, 'thing')} worth knowing when you have a moment.`
      : ' Your records are inside every window your organisation set.';
    return `Nothing needs you right now.${quiet}`;
  }

  const held = action.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const parts = [
    `${plural(action.length, 'thing')} ${action.length === 1 ? 'needs' : 'need'} you today${
      held >= 1 ? `, with ${nairaShort(held)} held up across them` : ''
    }.`,
  ];
  if (focus[0]) parts.push(`Start with this: ${focus[0].title}.`);
  if (bottleneck && bottleneck.stuck >= 2) {
    parts.push(
      `Most orders are held at "${bottleneck.label.toLowerCase()}" (${count(bottleneck.stuck)}, the oldest ${plural(bottleneck.oldestDays, 'day')}).`,
    );
  }
  if (tasksToday > 0) parts.push(`${plural(tasksToday, 'task')} on your own list ${tasksToday === 1 ? 'is' : 'are'} due.`);
  return parts.join(' ');
}

/* -------------------------------------------------------------- the brief */

export function buildBrief(input: BriefInput): Brief {
  const now = (input.now ?? new Date()).getTime();
  const today = todayISO(new Date(now));
  const focus = focusFrom(input.reminders);

  const seesOrders = input.role !== 'owner';
  const pipeline = seesOrders ? pipelineFrom(input, now) : [];
  const bottleneck = bottleneckOf(pipeline);

  const tasksToday = input.tasks.filter((t) => !t.done && t.due && t.due <= today).length;
  const kept = new Set(input.tasks.filter((t) => !t.done && t.source).map((t) => t.source));
  const suggestions = input.reminders
    .filter((r) => r.key !== 'task-due' && !kept.has(r.id))
    .slice(0, 6);

  return {
    greeting: greetingFor(input.firstName, new Date(now)),
    summary: [todayLine(input.orders, now), summaryFrom(focus, input.reminders, bottleneck, tasksToday)].filter(Boolean).join(' '),
    focus,
    pipeline,
    bottleneck,
    insights: insightsFrom(input, now),
    suggestions,
  };
}
