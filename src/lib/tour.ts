/**
 * The first-time tour, as a short list of sentences per role.
 *
 * Five or six steps, it never leaves the home screen, and every step points at
 * something that is on the screen while it is being described. A step whose
 * anchor is not drawn for this role or at this width is skipped rather than
 * shown pointing at nothing. The long explanations live on the Help screen,
 * where they can be read at leisure; a tour that tries to teach the whole app
 * is abandoned on step four.
 *
 * `anchor` matches a `data-tour="…"` attribute: summary, shortcuts, brief,
 * todo, nav, profile.
 */

import type { Role } from '@/types';

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** The `data-tour` value of the thing being pointed at. */
  anchor?: string;
}

/** Bump this and everybody sees the tour once more. */
const TOUR_VERSION = 1;

const BRIEF: TourStep = {
  id: 'brief',
  anchor: 'brief',
  title: 'Your brief, every morning',
  body: 'AfterBI reads your orders, invoices and stock and tells you, in plain words, what to do first. Tap the list icon on any line to keep it as a task with a date.',
};

const NAV: TourStep = {
  id: 'nav',
  anchor: 'nav',
  title: 'Everything else is here',
  body: 'Home brings you back from anywhere. Menu opens every screen you are allowed, and its search finds any of them by name.',
};

const PROFILE: TourStep = {
  id: 'profile',
  anchor: 'profile',
  title: 'Your account',
  body: 'Change your photograph, phone number or password. Help, with step by step guides for every screen, is in the menu.',
};

const SUPER_ADMIN: TourStep[] = [
  {
    id: 'setup',
    anchor: 'shortcuts',
    title: 'Start with Setup',
    body: 'Do it in order: depots, then products and their OT, MT and SA prices, then distributors, then people. Each needs the one before it, and the checklist ticks itself off.',
  },
  {
    id: 'summary',
    anchor: 'summary',
    title: 'The business, in three numbers',
    body: 'Open orders, what is waiting for your signature, and the money outstanding. Each card has its own button.',
  },
  BRIEF,
  NAV,
  PROFILE,
];

const ADMIN: TourStep[] = [
  {
    id: 'summary',
    anchor: 'summary',
    title: 'The business, in three numbers',
    body: 'Open orders, what is waiting for your signature, and the money outstanding.',
  },
  {
    id: 'shortcuts',
    anchor: 'shortcuts',
    title: 'Your shortcuts',
    body: 'Orders, approvals, stock, invoices and people. Tap any one to go straight there.',
  },
  BRIEF,
  NAV,
  PROFILE,
];

const SALES: TourStep[] = [
  {
    id: 'summary',
    anchor: 'summary',
    title: 'Your month, in three numbers',
    body: 'Your open orders, the sell-out you have keyed, and what your accounts owe.',
  },
  {
    id: 'shortcuts',
    anchor: 'shortcuts',
    title: 'Two things every day',
    body: 'Raise orders for your distributors, and key sell-out: what actually left the shelves. Your target is measured on the second.',
  },
  BRIEF,
  NAV,
  PROFILE,
];

const PARTNER: TourStep[] = [
  {
    id: 'summary',
    anchor: 'summary',
    title: 'Your account, in three numbers',
    body: 'Your open orders, what you owe and when it is due, and your sell-out this month.',
  },
  {
    id: 'shortcuts',
    anchor: 'shortcuts',
    title: 'Order, confirm, settle',
    body: 'Order from your own price list, confirm what arrived against what was sent, and read your statement any time.',
  },
  BRIEF,
  NAV,
  PROFILE,
];

const OPERATIONS: TourStep[] = [
  {
    id: 'summary',
    anchor: 'summary',
    title: 'The depot, in three numbers',
    body: 'Lines below their threshold, orders waiting to go out, and what is waiting for your signature.',
  },
  {
    id: 'shortcuts',
    anchor: 'shortcuts',
    title: 'Stock in, stock out',
    body: 'Record every movement as it happens. Fulfilling an approved order takes the stock out for you.',
  },
  BRIEF,
  NAV,
  PROFILE,
];

const FINANCE: TourStep[] = [
  {
    id: 'summary',
    anchor: 'summary',
    title: 'The money, in three numbers',
    body: 'What is overdue, what is waiting for your signature, and the open orders that will become invoices.',
  },
  {
    id: 'shortcuts',
    anchor: 'shortcuts',
    title: 'Invoice, record, chase',
    body: 'Raise an invoice for every delivery, record payments as they land, and watch who is against their credit limit.',
  },
  BRIEF,
  NAV,
  PROFILE,
];

const OWNER: TourStep[] = [
  {
    id: 'shortcuts',
    anchor: 'shortcuts',
    title: 'Two jobs, two sections',
    body: 'Platform is the business: organisations, pricing. Content is what the public sees: the website, the founder page, the videos and the blog.',
  },
  NAV,
  PROFILE,
];

export function tourFor(role: Role): TourStep[] {
  switch (role) {
    case 'owner':
      return OWNER;
    case 'super_admin':
      return SUPER_ADMIN;
    case 'admin':
    case 'staff':
      return ADMIN;
    case 'sales_rep':
      return SALES;
    case 'distributor':
      return PARTNER;
    case 'warehouse_manager':
    case 'operations_manager':
      return OPERATIONS;
    case 'finance_manager':
      return FINANCE;
    default:
      return ADMIN;
  }
}

const key = (role: Role) => `afterbi.tour.${role}`;

/** Has this person already been shown the current tour on this device? */
export function tourSeen(role: Role): boolean {
  try {
    return Number(localStorage.getItem(key(role))) >= TOUR_VERSION;
  } catch {
    /* Cannot remember, so do not nag. */
    return true;
  }
}

export function markTourSeen(role: Role): void {
  try {
    localStorage.setItem(key(role), String(TOUR_VERSION));
  } catch {
    /* nothing to do */
  }
}
