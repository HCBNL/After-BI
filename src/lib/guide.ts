/**
 * Help, built into the app: what every role is for, and how to do things.
 *
 * NO AI, AND NO SERVER
 *
 * GetSchool answers "how do I…" with its AI. AfterBI answers it from this
 * file: a set of written guides, each with exact steps and the screen to open,
 * and a search that matches the words somebody types against each guide's
 * title, keywords and steps. It costs nothing to run, it works offline once
 * the app has loaded, and it never invents a button that does not exist.
 *
 * KEEP IT TRUE
 *
 * Every step names a real button or field as it is labelled on screen. When a
 * screen changes, its guide here changes in the same commit; a help page that
 * describes last month's app is worse than none.
 *
 * `to` on a step is a leaf path resolved against the reader's own portal
 * (`orders` becomes `/portal/sales/orders` for a rep), and is only drawn as a
 * link when that screen is in the reader's menu.
 */

import type { Role } from '@/types';

/* ============================================================== the roles */

export interface RoleGuide {
  role: Role;
  /** As the role is named on screen. */
  name: string;
  /** One sentence: why this person has an account at all. */
  purpose: string;
  /** What they are answerable for. */
  responsibilities: string[];
  /** A normal day, in the order it happens. */
  day: string[];
  /** What they cannot do, so nobody wastes an afternoon looking for it. */
  cannot: string[];
}

export const ROLE_GUIDES: RoleGuide[] = [
  {
    role: 'super_admin',
    name: 'Super admin',
    purpose: 'Owns the organisation inside AfterBI: sets it up, decides who signs what, and sees everything.',
    responsibilities: [
      'Set the company up in order: depots, products and their price tiers, distributors, then people.',
      'Decide the approval threshold and which roles sign orders above it. With no role chosen, orders come to you.',
      'Create every account and choose its role. Suspend an account the day somebody leaves.',
      'Read the whole business: every order, every account, every naira owed.',
    ],
    day: [
      'Read your brief on Home: what needs you first, and where orders are held up.',
      'Clear Approvals: sign or reject what is waiting.',
      'Check the pipeline for orders approved but not delivered, and deliveries not invoiced.',
      'Once a month, read Scorecards and Analytics with your managers.',
    ],
    cannot: ['Change what another organisation sees. Each organisation on AfterBI is sealed from the others.'],
  },
  {
    role: 'admin',
    name: 'Administrator',
    purpose: 'Runs the office day to day with the same reach as the super admin, short of owning the organisation.',
    responsibilities: [
      'Keep the catalogue, depots, distributors and credit limits up to date.',
      'Create accounts for new staff, reps and distributors.',
      'Sign orders when chosen as an approver.',
      'Keep settings such as the invoice footer and bank details correct.',
    ],
    day: [
      'Read your brief and clear anything waiting for your signature.',
      'Add or correct products and distributors as the business changes.',
      'Follow up the reminders: unfulfilled orders, uninvoiced deliveries, quiet accounts.',
    ],
    cannot: ['Be the organisation of last resort: when no approver is chosen, orders go to the super admin.'],
  },
  {
    role: 'staff',
    name: 'Staff',
    purpose: 'Head office support: keys orders, follows them through, and keeps records moving.',
    responsibilities: [
      'Raise orders for distributors and follow them to delivery.',
      'Record sell-out and stock movements when asked.',
      'Chase what the reminders say is stuck.',
    ],
    day: [
      'Read your brief for orders that are stuck.',
      'Key new orders as they arrive by phone or WhatsApp.',
      'Check Stock before promising a delivery date.',
    ],
    cannot: ['Change products, prices, credit limits, people or settings. Those are for administrators.'],
  },
  {
    role: 'sales_rep',
    name: 'Sales representative',
    purpose: 'Works a set of distributor accounts: raises their orders and keys what actually sold.',
    responsibilities: [
      'Raise orders for your accounts at their own price tier.',
      'Key sell-out every day: what left the shelves, by outlet.',
      'Work your leads towards becoming accounts.',
      'Carry your monthly target.',
    ],
    day: [
      'Read your brief: drafts left unsent, invoices due on your accounts.',
      'Visit, then raise orders on the spot.',
      'Before you finish, key the day’s sell-out.',
    ],
    cannot: [
      'See accounts that are not assigned to you.',
      'Change a price. It comes from the distributor’s tier.',
      'Sign your own orders.',
    ],
  },
  {
    role: 'distributor',
    name: 'Distributor',
    purpose: 'A trading partner: orders from its own price list, confirms deliveries, and settles invoices.',
    responsibilities: [
      'Order from your catalogue, at your tier’s prices.',
      'Confirm each delivery against what was sent, and raise a return for anything short or damaged.',
      'Pay invoices by their due date and keep your statement clear.',
      'Key your sell-out so your targets are real.',
    ],
    day: [
      'Read your brief: what is due this week and what has arrived.',
      'Place orders from the catalogue.',
      'Check deliveries and raise returns the same day.',
    ],
    cannot: ['See any other distributor’s orders, prices or balances.'],
  },
  {
    role: 'warehouse_manager',
    name: 'Warehouse manager',
    purpose: 'Keeps a depot’s stock true: what came in, what went out, and what is running low.',
    responsibilities: [
      'Record every stock movement as it happens, in and out.',
      'Fulfil approved orders from your depot.',
      'Set low stock thresholds so shortages show before orders stall.',
      'Receive returns back into stock.',
    ],
    day: [
      'Read your brief: approved orders waiting on the depot, lines below threshold.',
      'Fulfil approved orders. Fulfilling deducts the stock for you.',
      'Record deliveries in from the factory as they land.',
    ],
    cannot: ['Change prices, credit or the debtors report. Those belong to finance and the office.'],
  },
  {
    role: 'operations_manager',
    name: 'Operations manager',
    purpose: 'Runs the flow from approved order to delivered carton across every depot.',
    responsibilities: [
      'Keep orders moving from approved to fulfilled to delivered.',
      'Manage depots and the stock in them.',
      'Sign orders when chosen as an approver.',
      'Read scorecards for reps and distributors.',
    ],
    day: [
      'Read your brief: the pipeline shows which stage is holding orders up.',
      'Clear anything waiting for your signature.',
      'Chase depots on approved orders past their window.',
    ],
    cannot: ['Change products, prices, people or settings. Those are for administrators.'],
  },
  {
    role: 'finance_manager',
    name: 'Finance manager',
    purpose: 'Turns deliveries into invoices and invoices into money, and watches who owes too much.',
    responsibilities: [
      'Raise an invoice for every delivery.',
      'Record payments as they land, including part payments.',
      'Set and watch credit limits.',
      'Sign orders when chosen as an approver.',
    ],
    day: [
      'Read your brief: deliveries not yet invoiced, invoices past due, accounts at their limit.',
      'Raise invoices for yesterday’s deliveries.',
      'Record today’s payments, then call the oldest overdue account.',
    ],
    cannot: ['Fulfil orders or move stock. Those belong to the depot.'],
  },
];

/* ============================================================ how to … */

export interface GuideStep {
  text: string;
  /** A leaf path in the reader's own portal, e.g. `orders?new=1`. */
  to?: string;
}

export interface HowTo {
  id: string;
  title: string;
  /** Who can do this. The page shows only the reader's own. */
  roles: Role[];
  /** Other words people use for this, for the search. */
  keywords: string[];
  steps: GuideStep[];
  tips?: string[];
}

const ADMINS: Role[] = ['super_admin', 'admin'];
const SIGNERS: Role[] = ['super_admin', 'admin', 'staff', 'finance_manager', 'operations_manager', 'warehouse_manager'];
const DEPOT: Role[] = ['super_admin', 'admin', 'warehouse_manager', 'operations_manager'];
const MONEY: Role[] = ['super_admin', 'admin', 'finance_manager'];
const EVERYONE: Role[] = [
  'super_admin', 'admin', 'staff', 'sales_rep', 'distributor', 'warehouse_manager', 'finance_manager', 'operations_manager',
];

const HOW_TO: HowTo[] = [
  {
    id: 'setup',
    title: 'Set up the organisation for the first time',
    roles: ADMINS,
    keywords: ['start', 'begin', 'onboard', 'configure', 'first', 'new company'],
    steps: [
      { text: 'Open Setup from the menu. It lists every step in the order it must be done.', to: 'setup' },
      { text: 'Name your company in Settings, and add the address, phone and bank account that print on invoices.', to: 'settings' },
      { text: 'Add your depots: open Depots, press New depot, give it a name and location, and save.', to: 'warehouses' },
      { text: 'Load your products: open Products, press New product, fill in the name, unit, minimum order and the OT, MT and SA prices, and save.', to: 'products' },
      { text: 'Add stock to each depot: open Stock, press Add stock, pick the depot and product, enter the quantity, and press Record.', to: 'stock' },
      { text: 'Add your distributors: open Distributors, press New distributor, choose their price tier and credit limit, and save.', to: 'distributors' },
      { text: 'Add your team: open Add person and create an account for each person.', to: 'invite' },
      { text: 'Set the Approval threshold in Settings, and choose which roles sign orders above it.', to: 'settings' },
    ],
    tips: ['Each step needs the one before it: a distributor needs a price tier, which needs products.'],
  },
  {
    id: 'add-person',
    title: 'Create an account for someone',
    roles: ADMINS,
    keywords: ['invite', 'user', 'staff', 'rep', 'login', 'sign in', 'password', 'employee', 'team', 'account'],
    steps: [
      { text: 'Open Add person from the menu.', to: 'invite' },
      { text: 'Fill in First name, Last name, Email address and Phone.' },
      { text: 'Choose the Role. A sales representative or distributor also needs the Distributor account they work on.' },
      { text: 'Type a Password for them, then press Create account.' },
      { text: 'Give them the email and password yourself, by hand or WhatsApp. Nothing is emailed.' },
    ],
    tips: ['They can change their password after signing in, from Profile.', 'To stop someone signing in, open People and switch Active off.'],
  },
  {
    id: 'raise-order',
    title: 'Raise an order',
    roles: ['super_admin', 'admin', 'staff', 'sales_rep', 'distributor'],
    keywords: ['new order', 'purchase order', 'po', 'place', 'buy', 'key', 'create order', 'sell'],
    steps: [
      { text: 'Open Orders and press New order.', to: 'orders?new=1' },
      { text: 'Choose the Distributor. The prices come from their tier; you never type a price.' },
      { text: 'Add each line: pick the product and type the quantity. The minimum order is checked for you.' },
      { text: 'Add a Note if the depot needs to know something.' },
      { text: 'Press Save and send for approval, or Save and raise when no signature is needed. Save as draft keeps it to finish later.' },
    ],
    tips: ['A draft left for days shows up in your brief and reminders, so it is not forgotten.'],
  },
  {
    id: 'approve-order',
    title: 'Approve or reject an order',
    roles: SIGNERS,
    keywords: ['sign', 'signature', 'approval', 'authorise', 'authorize', 'reject', 'decline', 'pending'],
    steps: [
      { text: 'Open Approvals. Everything waiting on your signature is listed, oldest first.', to: 'approvals' },
      { text: 'Tap an order to open it and check the lines, prices and total.' },
      { text: 'To approve, add a note if you like and press Approve.' },
      { text: 'To reject, type the reason in the note first (a rejection needs one), then press Reject.' },
    ],
    tips: ['The approval threshold and the signers are set in Settings by an administrator.'],
  },
  {
    id: 'fulfil-order',
    title: 'Fulfil an approved order from a depot',
    roles: DEPOT,
    keywords: ['dispatch', 'ship', 'deliver', 'send', 'pick', 'fulfill', 'release', 'goods out'],
    steps: [
      { text: 'Open Orders and tap the approved order.', to: 'orders' },
      { text: 'Under Fulfil from a depot, choose the Depot the stock leaves from.' },
      { text: 'Press Fulfil and confirm. Every line is deducted from that depot and written to the ledger.' },
    ],
    tips: ['If any line is short, nothing is deducted at all. Add stock first, then fulfil.'],
  },
  {
    id: 'confirm-delivery',
    title: 'Confirm a delivery that arrived',
    roles: ['super_admin', 'admin', 'distributor', 'warehouse_manager', 'operations_manager'],
    keywords: ['received', 'arrived', 'goods in', 'shortage', 'delivery', 'check'],
    steps: [
      { text: 'Open Deliveries. Orders that have left the depot are listed.', to: 'deliveries' },
      { text: 'Tap the order and compare each line with what actually arrived.' },
      { text: 'If something is short or damaged, raise a return for it straight away.', to: 'returns' },
    ],
  },
  {
    id: 'raise-return',
    title: 'Raise a return for damaged, short or expired goods',
    roles: ['super_admin', 'admin', 'staff', 'distributor', 'warehouse_manager', 'operations_manager'],
    keywords: ['claim', 'damage', 'damaged', 'expired', 'short', 'credit note', 'refund', 'broken'],
    steps: [
      { text: 'Open Returns and press Raise a return.', to: 'returns' },
      { text: 'Choose the Account, the Product and the Quantity.' },
      { text: 'Choose Why (damaged, short, expired) and add the Detail.' },
      { text: 'Submit it. The office approves it, and the credit follows.' },
      { text: 'When the goods come back, the depot presses Receive it back into stock.' },
    ],
  },
  {
    id: 'record-sellout',
    title: 'Record sell-out (what actually sold)',
    roles: ['super_admin', 'admin', 'staff', 'sales_rep', 'distributor'],
    keywords: ['sale', 'sales', 'sold', 'outlet', 'shop', 'secondary sales', 'offtake', 'sellout', 'sell out'],
    steps: [
      { text: 'Open Sell-out and press Record a sale.', to: 'sell-out' },
      { text: 'Choose the Distributor and the Product, and type the Quantity.' },
      { text: 'Type the Outlet that bought it, and the Date of sale if it was not today.' },
      { text: 'Press Record.' },
    ],
    tips: ['Targets and scorecards are measured on sell-out, so key it every day.', 'A wrong entry can be corrected from the list.'],
  },
  {
    id: 'stock-in',
    title: 'Record stock coming in or going out',
    roles: [...DEPOT, 'staff'],
    keywords: ['stock in', 'receive', 'goods received', 'adjust', 'count', 'inventory', 'warehouse', 'movement'],
    steps: [
      { text: 'Open Stock and press Add stock.', to: 'stock' },
      { text: 'Choose the Depot and the Product.' },
      { text: 'Choose the Direction: In for stock received, Out for anything that left other than an order.' },
      { text: 'Type the Quantity, choose the Reason and add a Note.' },
      { text: 'Press Record. The balance updates and the movement is kept with your name.' },
    ],
    tips: ['Set a Low-stock threshold on each line so shortages turn amber before orders stall.'],
  },
  {
    id: 'raise-invoice',
    title: 'Raise an invoice',
    roles: MONEY,
    keywords: ['bill', 'billing', 'invoice', 'charge', 'proforma'],
    steps: [
      { text: 'Open Invoices and press Raise an invoice.', to: 'invoices' },
      { text: 'Choose the Distributor, then the Order (only fulfilled orders not yet invoiced are offered). Its lines and prices come across.' },
      { text: 'Check the Issue date, then press Raise invoice.' },
      { text: 'Open the invoice to print it or save it as a PDF.' },
    ],
    tips: ['Deliveries not yet invoiced appear in your brief, so none is missed.'],
  },
  {
    id: 'record-payment',
    title: 'Record a payment',
    roles: MONEY,
    keywords: ['paid', 'payment', 'receipt', 'transfer', 'cash', 'collect', 'collection', 'part payment'],
    steps: [
      { text: 'Open Invoices and tap the invoice that was paid.', to: 'invoices' },
      { text: 'Start a payment, type the Amount and choose the Method (Bank transfer, Cash, Cheque or Card).' },
      { text: 'Set the Date received, add the bank Reference, and press Record payment.' },
    ],
    tips: ['Part payments are fine. The invoice and the statement update together.'],
  },
  {
    id: 'credit-limit',
    title: 'Set or change a distributor’s credit limit',
    roles: ADMINS,
    keywords: ['credit', 'limit', 'ceiling', 'exposure', 'terms', 'payment terms'],
    steps: [
      { text: 'Open Distributors and tap the distributor.', to: 'distributors' },
      { text: 'Change the Credit limit and the Payment terms.' },
      { text: 'Save. Credit limits shows everybody against their ceiling.', to: 'credit' },
    ],
  },
  {
    id: 'statement',
    title: 'Print an account statement',
    roles: EVERYONE,
    keywords: ['statement', 'balance', 'ledger', 'account', 'owe', 'debt', 'print'],
    steps: [
      { text: 'Open Statement.', to: 'statement' },
      { text: 'Choose the Distributor (a distributor sees its own).' },
      { text: 'Print it, or save it as a PDF from the print window.' },
    ],
  },
  {
    id: 'target',
    title: 'Set a monthly target',
    roles: ADMINS,
    keywords: ['target', 'quota', 'goal', 'budget', 'kpi'],
    steps: [
      { text: 'Open Targets and press Set a target.', to: 'targets' },
      { text: 'Choose Who carries it, the Period and the Target amount, and press Save.' },
    ],
  },
  {
    id: 'sales-report',
    title: 'Prepare the monthly sales report',
    roles: ADMINS,
    keywords: ['analytics', 'report', 'territory', 'map', 'region', 'state', 'salesperson', 'channel', 'customer', 'revenue', 'growth'],
    steps: [
      { text: 'Open Analytics.', to: 'analytics' },
      { text: 'Choose Sell-in (orders) or Sell-out, and the period, for example Last month.' },
      { text: 'Read the four numbers at the top: revenue against the previous period, customers buying, revenue per customer and customers to win back.' },
      { text: 'On a laptop, click a state on the map to see its revenue, top customers, salespeople and accounts not buying. Click it again to clear.' },
      { text: 'In Revenue by, pick Salesperson, Customer, Channel, Region, State, Category or Product, and press Export to Excel (CSV) for each table you need.' },
    ],
    tips: ['Clicking a salesperson, channel or state in a table filters the whole screen to it.'],
  },
  {
    id: 'export',
    title: 'Export a report to Excel',
    roles: ['super_admin', 'admin', 'staff', 'finance_manager', 'operations_manager'],
    keywords: ['excel', 'spreadsheet', 'export', 'download', 'csv', 'report'],
    steps: [
      { text: 'Open Reports.', to: 'reports' },
      { text: 'Choose What to export, and the From and To dates.' },
      { text: 'Download the file and open it in Excel.' },
    ],
  },
  {
    id: 'approval-threshold',
    title: 'Decide who signs big orders',
    roles: ADMINS,
    keywords: ['threshold', 'approver', 'approvers', 'authorisation', 'limit', 'sign off'],
    steps: [
      { text: 'Open Settings.', to: 'settings' },
      { text: 'Set the Approval threshold: orders at or above it need a signature.' },
      { text: 'Choose which roles sign. Choose none and orders come to the super admin.' },
      { text: 'Save.' },
    ],
    tips: ['Reminder windows (how long an order may wait for a signature, and the rest) are in Settings too.'],
  },
  {
    id: 'tasks',
    title: 'Keep a to do list and turn reminders into tasks',
    roles: EVERYONE,
    keywords: ['todo', 'to do', 'task', 'tasks', 'remind', 'reminder', 'follow up', 'pending', 'list'],
    steps: [
      { text: 'Open My tasks.', to: 'tasks' },
      { text: 'Type what you need to do, choose Today, Tomorrow, In a week or a date, and press Add.' },
      { text: 'Under Suggested from your records, press Keep on anything you want to own with a date.' },
      { text: 'Tick the circle when it is done. Finished tasks clear themselves after 30 days.' },
    ],
    tips: ['On Home and on Reminders, the list icon beside any line keeps it as a task in one tap.', 'Your tasks are yours alone: nobody else can see them.'],
  },
  {
    id: 'reminders',
    title: 'See what is overdue, stuck or running out',
    roles: EVERYONE,
    keywords: ['overdue', 'stuck', 'late', 'alert', 'notification', 'brief', 'pipeline', 'bottleneck'],
    steps: [
      { text: 'Read Your brief on Home: it names the first thing to do and where orders are held up.' },
      { text: 'Open Reminders for the full list, ranked by urgency.', to: 'reminders' },
      { text: 'Switch on Tell me on this device to get a notification when something new appears.' },
      { text: 'Snooze anything you have dealt with elsewhere; it returns tomorrow if it is still true.' },
    ],
  },
  {
    id: 'password',
    title: 'Change your password, phone or photograph',
    roles: [...EVERYONE, 'owner'],
    keywords: ['password', 'profile', 'photo', 'picture', 'phone', 'account', 'forgot'],
    steps: [
      { text: 'Open Profile from your picture at the top of Home.', to: 'profile' },
      { text: 'Change the details and save.' },
      { text: 'Forgot your password? On the sign in screen, press Forgot password? to get a reset link by email.' },
    ],
  },
  {
    id: 'website',
    title: 'Change the website: founder photo, videos, banners',
    roles: ['owner'],
    keywords: ['website', 'founder', 'photo', 'video', 'banner', 'cover', 'seo', 'about', 'social'],
    steps: [
      { text: 'Open Website.', to: 'website' },
      { text: 'Under The founder, upload the photograph and paste profile links, one per line.' },
      { text: 'Under Walkthrough videos, press Add a video, then upload a file or paste a YouTube link, and give it a title.' },
      { text: 'Press Publish. Nothing changes on the public site until you do.' },
    ],
  },
  {
    id: 'proposal',
    title: 'Send a prospect a tailored proposal',
    roles: ['owner'],
    keywords: ['proposal', 'quote', 'quotation', 'pricing', 'prospect', 'offer', 'pitch'],
    steps: [
      { text: 'Open Proposals and press New proposal.', to: 'proposals' },
      { text: 'Fill in the business name, contact, kind of business, and their depots, distributors and staff.' },
      { text: 'Tick what hurts today. Each one adds a paragraph on why AfterBI fits, using their numbers.' },
      { text: 'Untick any features that do not matter to them, then set the plan, discount, setup fee and support level.' },
      { text: 'Check the preview on the right, press Save, then Print or save as PDF and choose Save as PDF to email it.' },
      { text: 'When they reply, open the proposal and set the Status to Won or Lost.' },
    ],
  },
  {
    id: 'blog',
    title: 'Write and publish a blog article',
    roles: ['owner'],
    keywords: ['blog', 'article', 'post', 'news', 'write', 'publish'],
    steps: [
      { text: 'Open Blog and press New article.', to: 'blog' },
      { text: 'Type the Title, the line under it, the Category, and upload a Cover picture.' },
      { text: 'Write the article in Write, and check it in Preview.' },
      { text: 'Press Publish. Save as a draft keeps it hidden from everybody but you.' },
    ],
  },
];

export function guidesFor(role: Role): HowTo[] {
  return HOW_TO.filter((guide) => guide.roles.includes(role));
}

/* ============================================================== the search */

/** Words that carry no meaning in a question about the app. */
const STOP = new Set(
  'how do i to a an the can my in on of for is it be what where when which with and or me you please want need'.split(' '),
);

/** Different words people use for the same thing. */
const SYNONYMS: Record<string, string[]> = {
  bill: ['invoice'],
  invoice: ['bill'],
  pay: ['payment', 'paid'],
  paid: ['payment'],
  sign: ['approve', 'approval'],
  approve: ['sign', 'approval'],
  user: ['person', 'account'],
  staff: ['person', 'account'],
  add: ['create', 'new'],
  create: ['add', 'new'],
  stock: ['inventory'],
  inventory: ['stock'],
  sales: ['sell', 'sale'],
  dispatch: ['fulfil'],
  deliver: ['fulfil', 'delivery'],
  return: ['claim'],
  claim: ['return'],
  todo: ['task'],
};

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** A crude stem, so "orders", "ordering" and "order" meet. */
function stem(word: string): string {
  return word.replace(/(ing|ed|es|s)$/, '');
}

/**
 * The guides that best answer a question, best first.
 *
 * Scored on words in common: a match in the title counts most, then a
 * keyword, then a step. Synonyms widen the question before matching. A guide
 * that shares no meaningful word with the question is not returned at all,
 * rather than offered as a guess.
 */
export function searchGuides(question: string, role: Role): HowTo[] {
  const asked = words(question);
  if (!asked.length) return [];
  const wanted = new Set<string>();
  for (const word of asked) {
    wanted.add(stem(word));
    for (const other of SYNONYMS[word] ?? []) wanted.add(stem(other));
  }
  const phrase = question.toLowerCase().trim();

  return guidesFor(role)
    .map((guide) => {
      const title = new Set(words(guide.title).map(stem));
      const keys = new Set(guide.keywords.flatMap(words).map(stem));
      const steps = new Set(guide.steps.flatMap((s) => words(s.text)).map(stem));
      let score = 0;
      for (const word of wanted) {
        if (title.has(word)) score += 5;
        if (keys.has(word)) score += 3;
        if (steps.has(word)) score += 1;
      }
      if (guide.keywords.some((k) => phrase.includes(k))) score += 4;
      return { guide, score };
    })
    .filter((row) => row.score >= 3)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.guide)
    .slice(0, 5);
}
