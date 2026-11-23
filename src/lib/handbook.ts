/**
 * The AfterBI Handbook: what we hand a company before it comes on board.
 *
 * It replaced the old tailored proposal. Nothing in it is written per
 * prospect: the product, the prices, the support and the way we start are the
 * same for everybody, so the handbook is the same for everybody. The only
 * thing that changes is the edition (the year it is downloaded in, so it
 * becomes the 2027 handbook on its own) and, if wanted, the name of the
 * company it is handed to on the cover.
 *
 * No signatures and no names of ours: it is our brand card. A company reads
 * it, fills in the commitment page at the back, and the final price and the
 * agreement are settled and signed with them afterwards.
 *
 * The prices are the published plans in lib/site.ts and the support levels
 * below, so the handbook, the Pricing page and the app never disagree.
 */

import { CONTACT_PHONE, FAQ, MODULES, PLANS, PRODUCT_GROUPS, naira, yearly } from './site';
import { SITE_URL, SUPPORT_EMAIL } from './siteMeta';

export { CONTACT_PHONE, FAQ, MODULES, PLANS, PRODUCT_GROUPS, naira, yearly, SITE_URL, SUPPORT_EMAIL };

/** The edition: the year it is downloaded in. */
export function handbookYear(now = new Date()): number {
  return now.getFullYear();
}

export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/* ------------------------------------------------------------- support */

export type SupportLevel = 'standard' | 'priority' | 'dedicated';

/** Fixed, like the plans. Standard is in every plan. */
export const SUPPORT_LEVELS: { id: SupportLevel; name: string; price: number; lines: string[] }[] = [
  {
    id: 'standard',
    name: 'Standard',
    price: 0,
    lines: [
      'WhatsApp and email support, Monday to Saturday, 8am to 6pm',
      'Reply within 4 working hours',
      'Step by step help built into every screen',
      'Every update and new feature at no extra cost',
    ],
  },
  {
    id: 'priority',
    name: 'Priority',
    price: 75_000,
    lines: [
      'Everything in Standard',
      'Reply within 1 working hour, 7 days a week',
      'A monthly review call on your numbers',
      'Changes to approval rules and reminders done for you',
    ],
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    price: 200_000,
    lines: [
      'Everything in Priority',
      'A named account manager who knows your business',
      'On site visits for training and stock count days',
      'A quarterly business review with your management',
    ],
  },
];

/* ------------------------------------------------------------- the story */

/** What hurts before AfterBI: the same pains the sign up calls hear. */
export const PAINS: { title: string; body: string }[] = [
  { title: 'Orders arrive by WhatsApp', body: 'Voice notes and screenshots, retyped by someone at the end of the day, priced from memory.' },
  { title: 'Stock never agrees with the count', body: 'The book says one thing, the depot another, and nobody can say which movement went missing.' },
  { title: 'Chasing payments', body: 'Who owes what, since when, and against which invoice lives in three notebooks and a spreadsheet.' },
  { title: 'Blind after the sale', body: 'Goods leave for the distributor and the trail stops. What actually sold to the shelf is a guess.' },
  { title: 'Reports take days', body: 'Every month end is a week of collecting, pasting and arguing about whose numbers are right.' },
  { title: 'Approvals by phone call', body: 'Discounts and credit are agreed in passing, with no record of who said yes.' },
];

/** The cycle AfterBI runs, in order. */
export const FLOW: { step: string; body: string }[] = [
  { step: 'Order', body: 'A rep or a distributor raises it on any phone, priced from the right list.' },
  { step: 'Approve', body: 'Credit and stock are checked; the right person signs in one tap.' },
  { step: 'Deliver', body: 'Picked, dispatched and confirmed, with the depot stock moving by itself.' },
  { step: 'Invoice', body: 'Raised from the approved order, numbered, and sent as a clean PDF.' },
  { step: 'Get paid', body: 'Payments matched to invoices; what is overdue is chased on time.' },
  { step: 'Sell out', body: 'Partners report what reached the shelf, so the next order is planned, not guessed.' },
];

/** Who works in it, each in their own workspace. */
export const WORKSPACES: { who: string; does: string; free?: boolean }[] = [
  { who: 'Owners and management', does: 'Live sales, stock, cash and credit on one home screen. Approvals in one tap.' },
  { who: 'Sales reps', does: 'Leads, visits, orders and targets from the phone in their pocket.' },
  { who: 'Operations and depots', does: 'Stock by location, deliveries, returns and monthly counts.' },
  { who: 'Finance', does: 'Invoices, payments, statements, credit limits and ageing.' },
  { who: 'Distributors and retailers', does: 'Their own portal to order, see statements and report sales.', free: true },
];

/** Promises we can stand behind, each true of the product today. */
export const TRUST: { title: string; body: string }[] = [
  { title: 'Your data is yours alone', body: 'Every company sits in its own space, sealed by database security rules. No other company can read a single record.' },
  { title: 'Everyone sees only their part', body: 'Roles decide what each person can see and do. A rep sees their customers; a distributor sees their own account.' },
  { title: 'Every change is on record', body: 'Who raised, approved, edited or deleted what, and when, is kept in an audit trail nobody can edit.' },
  { title: 'A lock on every screen', body: 'A personal PIN locks the app when it sits idle, on top of the password.' },
  { title: 'Works on any device', body: 'Phone, tablet or computer, in the browser, installed like an app. Nothing to set up on site.' },
  { title: 'Always current', body: 'Updates arrive for everyone at once, with no upgrade fees and no downtime to plan for.' },
];

/** How a company starts, week by week. */
export const START: { when: string; title: string; body: string }[] = [
  { when: 'Week 1', title: 'Configure', body: 'Your products, price lists, depots, credit policies and teams are set up with you.' },
  { when: 'Week 2', title: 'Connect', body: 'Reps, operations, finance and distributors are invited and trained in their own workspaces.' },
  { when: 'Week 3', title: 'Run', body: 'Orders, deliveries and invoices flow through AfterBI, with us on hand for every question.' },
  { when: 'Week 4', title: 'Review', body: 'We read your first month of numbers with you and tune approvals, targets and reports.' },
];

/** The chapters, for the contents page. Page numbers are the printed ones. */
export const CHAPTERS: { title: string; page: number; color: string }[] = [
  { title: 'Why AfterBI exists', page: 3, color: '#ffbe45' },
  { title: 'One platform, the whole cycle', page: 4, color: '#0866f5' },
  { title: 'What is inside', page: 5, color: '#7c9cff' },
  { title: 'A day in AfterBI', page: 8, color: '#1238e6' },
  { title: 'Who works in it', page: 9, color: '#ff78a8' },
  { title: 'Trust and security', page: 10, color: '#0b9f55' },
  { title: 'Plans and pricing', page: 11, color: '#f0581a' },
  { title: 'Support and AfterBI Custom', page: 12, color: '#7a36f0' },
  { title: 'Getting started', page: 13, color: '#f5a30a' },
  { title: 'Questions', page: 14, color: '#1593ee' },
  { title: 'Your commitment', page: 15, color: '#e23d78' },
];

export function modulesOf(slugs: string[]) {
  return slugs.map((slug) => MODULES.find((m) => m.slug === slug)).filter((m): m is (typeof MODULES)[number] => Boolean(m));
}

export function fileName(company: string, year: number): string {
  const who = company.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `AfterBI-Handbook-${year}${who ? `-${who}` : ''}.pdf`;
}
