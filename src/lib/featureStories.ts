/*
 * The words and figures for every feature page (/features/<slug>) and every
 * solution page (/solutions/<slug>), each laid out as a story:
 *
 *   1. a centred question with one line under it;
 *   2. a full width mosaic of tiles: the owner's illustrations, one person, a
 *      blue text tile, a figure, a cloud of words, two petal artworks;
 *   3. a "trust" grid: heading, line and button, then a product panel with
 *      real looking figures, an illustration card, a person and a text card;
 *   4. the capabilities as a grid of cards, each icon in a petal.
 *
 * `scenes` lists the illustrations that fit the page, the most fitting first;
 * the mosaic, the cards and the capabilities heading take them in order.
 * Scenes come from the owner's Secondary artworks (Business and Technology).
 * Figures in the blue tile are facts about the product, never invented counts.
 * The panel's numbers are illustrative, like a screenshot.
 *
 * Pictures come from two optional site image slots per page
 * (`feature-<key>-1` in the mosaic, `feature-<key>-2` in the grid); an empty
 * slot shows an illustration instead, never an empty box.
 */

import {
  Activity,
  BadgeCheck,
  Bell,
  BookOpen,
  Boxes,
  Calculator,
  ClipboardCheck,
  Eye,
  Factory,
  FileMinus,
  FileText,
  FileWarning,
  Filter,
  Fingerprint,
  Gauge,
  Globe,
  Hourglass,
  KeyRound,
  Landmark,
  LineChart,
  ListTodo,
  Lock,
  Map,
  MapPin,
  MessageSquare,
  NotebookPen,
  Package,
  PackageCheck,
  PackageX,
  Percent,
  Printer,
  Receipt,
  Route,
  ScanLine,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Target,
  Timer,
  Trophy,
  Truck,
  Undo2,
  UserCheck,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { SceneName } from '@/components/marketing/scenes';

export interface FeatureStory {
  /** Picture slots are `feature-<key>-1` and `feature-<key>-2`. */
  key: string;
  eyebrow: string;
  question: string;
  line: string;
  /** Illustrations for this page, most fitting first (at least six). */
  scenes: SceneName[];
  /** The wide blue tile in the mosaic. */
  tile: { label: string; title: string };
  /** The figure tile in the mosaic: a fact about the product. */
  figure: { value: string; label: string };
  /** The cloud of words in the second row. */
  words: string[];
  trust: { title: string; line: string };
  /** The product panel in the tall card: two figures, a chart, the roles that see it, one record. */
  panel: {
    figures: { label: string; value: string; unit?: string }[];
    roles: string[];
    columns: [string, string];
    record: { name: string; sub: string; when: string };
  };
  bullets: { icon: LucideIcon; text: string }[];
  cardArt: { title: string; text: string };
  /** `**bold**` marks the words to set in navy. */
  cardText: { title: string; text: string };
  capTitle: string;
  capabilities: { title: string; text: string; icon: LucideIcon }[];
}

/* ------------------------------------------------------------- Sales Cloud */

const leads: FeatureStory = {
  key: 'leads',
  eyebrow: 'Pipeline Management',
  question: 'Do you know who your reps spoke to this week?',
  line: 'Every prospect is a simple record with a trail of visits and calls. When they are ready to buy, a manager confirms them as a customer.',
  scenes: ['location-distribution', 'agreement', 'team-onboarding', 'target-goals', 'retail-store', 'office-complex-2'],
  tile: { label: 'One trail', title: 'Every call and visit logged' },
  figure: { value: '1 year', label: 'Before an unconfirmed lead is cleared away' },
  words: ['visits', 'calls', 'notes', 'comments', 'follow ups', 'approval', 'customers', 'reps'],
  trust: {
    title: 'A lead is a record, not a guess',
    line: 'No stages to fake and no made up deal values. Reps log what happened, managers comment, and a lead becomes a customer only when it is approved.',
  },
  panel: {
    figures: [
      { label: 'Open leads', value: '38' },
      { label: 'Confirmed this month', value: '6' },
    ],
    roles: ['Sales rep', 'Manager', 'Admin'],
    columns: ['Lead', 'Last log'],
    record: { name: 'Greenfield Stores', sub: 'Visit, price list shared', when: 'Logged today' },
  },
  bullets: [
    { icon: NotebookPen, text: 'A dated log for every visit and call' },
    { icon: MessageSquare, text: 'Managers comment right on the log' },
    { icon: UserCheck, text: 'Confirmed as a customer after approval' },
  ],
  cardArt: {
    title: 'Ready to buy? Ask, then trade',
    text: 'When a prospect wants to order, the rep asks for approval. Once confirmed, the lead becomes a trading customer with its history intact.',
  },
  cardText: {
    title: 'A clean list that stays clean',
    text: 'Leads that go **quiet** are flagged, and anything not confirmed in **about a year** is cleared away.',
  },
  capTitle: 'Everything your prospect list needs',
  capabilities: [
    { icon: NotebookPen, title: 'Logs, not stages', text: 'Each lead holds a dated trail of what the rep actually did and heard.' },
    { icon: MessageSquare, title: 'Comments on every log', text: 'Managers coach in place, on the record itself.' },
    { icon: UserCheck, title: 'Approval to confirm', text: 'A lead becomes a customer only when someone with authority confirms it.' },
    { icon: Eye, title: 'Reps see their own', text: 'Each rep works their own leads; managers see the whole list.' },
    { icon: Timer, title: 'Quiet leads flagged', text: 'No log for a while and the lead is marked for a follow up.' },
    { icon: Hourglass, title: 'Old leads cleared', text: 'Not confirmed in about a year, a lead is taken off the list.' },
  ],
};

const orders: FeatureStory = {
  key: 'orders',
  eyebrow: 'Order Management',
  question: 'Is every order priced right before it leaves?',
  line: 'Reps raise orders from a phone at the right price tier. Credit and stock are checked, a manager signs in one tap, and the paperwork follows on its own.',
  scenes: ['shopping-bags', 'agreement', 'price-tag', 'inventory-boxes', 'delivery-truck', 'mobile-applications'],
  tile: { label: 'One tap', title: 'Orders signed from any phone' },
  figure: { value: '3', label: 'Price tiers: open trade, modern trade and service' },
  words: ['price tiers', 'discounts', 'approvals', 'proformas', 'credit check', 'stock check', 'logistics', 'units'],
  trust: {
    title: 'Every order checked before it is signed',
    line: 'The right price list loads by itself, any discount is shown at approval, and an order that breaks credit or stock policy cannot slip through.',
  },
  panel: {
    figures: [
      { label: 'Orders this month', value: '214' },
      { label: 'Order value', value: '18,640,000', unit: '₦' },
    ],
    roles: ['Sales rep', 'Approver', 'Finance'],
    columns: ['Order', 'Status'],
    record: { name: 'PI202611042', sub: 'Bayo Ventures, 46 cartons', when: 'Awaiting approval' },
  },
  bullets: [
    { icon: Tags, text: 'Price tier applied on every line' },
    { icon: Percent, text: 'Discounts shown at approval and on the invoice' },
    { icon: BadgeCheck, text: 'One tap approval with the signer recorded' },
  ],
  cardArt: {
    title: 'Discounts in plain sight',
    text: 'A rep can adjust a unit price, but the approver sees the normal price beside it, and the invoice prints the discount plainly.',
  },
  cardText: {
    title: 'Numbered the way you file',
    text: 'Proformas number by **year, month and count**, like **PI202611001**, and the PDF is saved under the same number.',
  },
  capTitle: 'Everything an order needs',
  capabilities: [
    { icon: Tags, title: 'Price tiers', text: 'Open trade, modern trade and service prices applied automatically.' },
    { icon: ShieldCheck, title: 'Credit and stock checks', text: 'Limits and stock are checked before the order goes for approval.' },
    { icon: BadgeCheck, title: 'Mobile approvals', text: 'Managers sign in one tap; every decision lands in the audit log.' },
    { icon: Percent, title: 'Visible discounts', text: 'Adjusted prices show the normal price beside them, all the way to the invoice.' },
    { icon: Truck, title: 'Logistics lines', text: 'Add delivery as a service line priced per order, never counted as stock.' },
    { icon: FileText, title: 'Paperwork that follows', text: 'Proforma, delivery note and invoice flow from the approved order.' },
  ],
};

const targets: FeatureStory = {
  key: 'targets',
  eyebrow: 'Sales Performance',
  question: 'Who is ahead of target today, not last month?',
  line: 'Set targets for reps, distributors and products, and watch them fill from live invoices. Every invoiced sale counts, paid or not.',
  scenes: ['target-goals', 'revenue-growth', 'financial-performance', 'rewards-bonuses', 'pie-chart', 'location-distribution'],
  tile: { label: 'Live', title: 'Targets that fill as you invoice' },
  figure: { value: '3', label: 'Kinds of target: rep, distributor and product' },
  words: ['targets', 'scorecards', 'rankings', 'reps', 'distributors', 'products', 'months', 'quarters'],
  trust: {
    title: 'Performance measured on what was sold',
    line: 'Achievement comes straight from invoices, so nobody keeps a side spreadsheet and every review starts from the same numbers.',
  },
  panel: {
    figures: [
      { label: 'Target this month', value: '25,000,000', unit: '₦' },
      { label: 'Achieved', value: '72%' },
    ],
    roles: ['Manager', 'Sales rep', 'Distributor'],
    columns: ['Rep', 'Achieved'],
    record: { name: 'Chidi O.', sub: 'West zone accounts', when: '91% of target' },
  },
  bullets: [
    { icon: Target, text: 'Targets by rep, distributor and product' },
    { icon: Receipt, text: 'Measured on invoiced sales, paid or not' },
    { icon: Trophy, text: 'Rankings and scorecards for every review' },
  ],
  cardArt: {
    title: 'One number everyone trusts',
    text: 'Targets are counted on invoiced sales, so achievement matches what finance sees, the same day the invoice is raised.',
  },
  cardText: {
    title: 'Reviews without the slide deck',
    text: 'Open the **scorecard**, pick the **period**, and every rep and partner is ranked on live figures.',
  },
  capTitle: 'Everything a sales review needs',
  capabilities: [
    { icon: Target, title: 'Three kinds of target', text: 'Set them per rep, per distributor or per product, by month or quarter.' },
    { icon: Receipt, title: 'Counted on invoices', text: 'Every invoiced sale counts toward the target, paid or not.' },
    { icon: Trophy, title: 'Rankings', text: 'See who leads and who needs help, on one screen.' },
    { icon: Gauge, title: 'Scorecards', text: 'Performance bands managers read at a glance.' },
    { icon: Users, title: 'Fair by account', text: 'Reps are measured on the accounts they actually own.' },
    { icon: LineChart, title: 'Trend over time', text: 'Watch the line climb through the month, not just the total.' },
  ],
};

const portal: FeatureStory = {
  key: 'distributor-portal',
  eyebrow: 'Partner Portal',
  question: 'Can your distributors serve themselves?',
  line: 'Each distributor gets their own login to order at their own prices, check their balance and print statements, without calling your office.',
  scenes: ['retail-store', 'mobile-applications', 'warehouse-2', 'payment-cards', 'delivery-truck', 'agreement'],
  tile: { label: 'Self service', title: 'A workspace for every partner' },
  figure: { value: '0', label: 'Records a partner can see that are not their own' },
  words: ['orders', 'statements', 'balances', 'price lists', 'credit', 'invoices', 'returns', 'reps'],
  trust: {
    title: 'Your partners, in their own lane',
    line: 'A distributor sees only their accounts, their prices and their balance. Your reps see theirs. Nobody sees anyone else.',
  },
  panel: {
    figures: [
      { label: 'Balance', value: '3,420,000', unit: '₦' },
      { label: 'Open orders', value: '4' },
    ],
    roles: ['Distributor', 'Sales rep', 'Finance'],
    columns: ['Statement', 'Status'],
    record: { name: 'November statement', sub: 'Eastgate Distributors', when: 'Ready to print' },
  },
  bullets: [
    { icon: ShoppingCart, text: 'Orders against their own price list' },
    { icon: ScrollText, text: 'Statements and balances on demand' },
    { icon: Lock, text: 'Isolated from every other partner' },
  ],
  cardArt: {
    title: 'Fewer calls to your office',
    text: 'Balances, statements and order status are on the partner’s own phone, so your team spends the day selling, not reading out figures.',
  },
  cardText: {
    title: 'Registered and accountable',
    text: 'Each distributor carries its **registered business name** and **registration number**, and can be moved to another rep in one step.',
  },
  capTitle: 'Everything a partner needs',
  capabilities: [
    { icon: ShoppingCart, title: 'Self service orders', text: 'Partners order at their own prices and within their own credit.' },
    { icon: ScrollText, title: 'Statements', text: 'Account statements and balances whenever they ask.' },
    { icon: Lock, title: 'Strict isolation', text: 'Database rules keep every partner’s records apart.' },
    { icon: Users, title: 'Several reps', text: 'A distributor can work with several reps and be reassigned.' },
    { icon: Store, title: 'Sell through', text: 'Partners report what they sold on, from the same login.' },
    { icon: BadgeCheck, title: 'Business details', text: 'Registered name and registration number on every distributor record.' },
  ],
};

/* -------------------------------------------------- Operations and Finance */

const stock: FeatureStory = {
  key: 'stock',
  eyebrow: 'Inventory Management',
  question: 'Is your stock where your books say it is?',
  line: 'See every carton in every warehouse, section and row, live. Count it from a phone, and change it only with two sign offs.',
  scenes: ['inventory-boxes', 'warehouse', 'warehouse-2', 'product-activation', 'delivery-truck', 'cost-checklist'],
  tile: { label: 'Real time', title: 'Stock in every warehouse' },
  figure: { value: '2', label: 'Sign offs before any stock adjustment' },
  words: ['warehouses', 'sections', 'rows', 'cartons', 'units', 'damaged', 'short dated', 'returns'],
  trust: {
    title: 'Stock you can trust, counted the right way',
    line: 'Every movement is timed and tied to a person. A count is a report that never touches stock; only an approved adjustment does.',
  },
  panel: {
    figures: [
      { label: 'Cartons on hand', value: '12,480' },
      { label: 'Stock value', value: '48,200,000', unit: '₦' },
    ],
    roles: ['Warehouse', 'Finance', 'Operations'],
    columns: ['Location', 'Last counted'],
    record: { name: 'Section 2, Row C', sub: 'Main depot', when: 'Counted 3 days ago' },
  },
  bullets: [
    { icon: Warehouse, text: 'Positions by warehouse, section and row' },
    { icon: ScanLine, text: 'Carton barcodes read only inside AfterBI' },
    { icon: FileWarning, text: 'Variance report with every issue in red' },
  ],
  cardArt: {
    title: 'Counted, never guessed',
    text: 'A stock count is a report. Differences go to an adjustment that finance and operations both approve before anything moves.',
  },
  cardText: {
    title: 'Units and cartons, nothing else',
    text: 'Count full rows as **lines × cartons**, add **loose units**, and the units roll into cartons on their own.',
  },
  capTitle: 'Everything inventory management needs',
  capabilities: [
    { icon: Warehouse, title: 'Every location', text: 'Depots split into numbered sections and lettered rows, A to Z, so every carton has an address.' },
    { icon: Activity, title: 'Live positions', text: 'Stock moves the moment an order is fulfilled or a return comes back in.' },
    { icon: ScanLine, title: 'Carton barcodes', text: 'Discreet line barcodes made by AfterBI and read only inside it.' },
    { icon: ClipboardCheck, title: 'Counts from a phone', text: 'Count row by row, then read the variance report with issues in red.' },
    { icon: ShieldCheck, title: 'Two key adjustments', text: 'No stock changes until finance and operations have both approved.' },
    { icon: PackageX, title: 'Damaged and short dated', text: 'Held apart from sellable stock, so no order promises what cannot ship.' },
  ],
};

const deliveries: FeatureStory = {
  key: 'deliveries',
  eyebrow: 'Fulfilment and Logistics',
  question: 'Did every carton reach the customer?',
  line: 'Loads are built only from approved orders, each drop gets a delivery note and proof, and a short delivery turns into a return on its own.',
  scenes: ['delivery-truck', 'location-distribution', 'inventory-boxes', 'warehouse-2', 'retail-store', 'global-trade'],
  tile: { label: 'Dispatch to doorstep', title: 'Every drop confirmed' },
  figure: { value: '1', label: 'Way to reverse a delivery: a return on the account' },
  words: ['dispatch', 'loads', 'delivery notes', 'proof', 'drivers', 'returns', 'routes', 'drops'],
  trust: {
    title: 'Delivered means delivered',
    line: 'Once a delivery note is issued the order is locked for everyone, the owner included. Anything that comes back is a return, on the record.',
  },
  panel: {
    figures: [
      { label: 'Out for delivery', value: '17' },
      { label: 'Delivered this week', value: '96' },
    ],
    roles: ['Operations', 'Warehouse', 'Sales rep'],
    columns: ['Delivery note', 'Status'],
    record: { name: 'DN202611018', sub: 'Route 4, 3 drops', when: 'Delivered 11:40' },
  },
  bullets: [
    { icon: PackageCheck, text: 'Loads built only from approved orders' },
    { icon: FileText, text: 'A numbered delivery note for every drop' },
    { icon: Undo2, text: 'Short deliveries become returns' },
  ],
  cardArt: {
    title: 'Locked once it leaves',
    text: 'A fulfilled order can never be edited or reversed, by anyone. The only way back is a return raised on the customer’s account.',
  },
  cardText: {
    title: 'Paper that matches the order',
    text: 'Delivery notes number like **DN202611001** and link back to the **original order**, so every document tells one story.',
  },
  capTitle: 'Everything a delivery needs',
  capabilities: [
    { icon: PackageCheck, title: 'Approved loads only', text: 'Nothing leaves the warehouse without a signed order behind it.' },
    { icon: FileText, title: 'Delivery notes', text: 'Numbered by year, month and count, saved under the same number.' },
    { icon: ScanLine, title: 'Proof of delivery', text: 'Captured on a phone at the customer’s door.' },
    { icon: Undo2, title: 'Returns', text: 'Short or rejected cartons come back as a return on the account.' },
    { icon: Lock, title: 'Locked when fulfilled', text: 'No edits after the delivery note, for anyone.' },
    { icon: Route, title: 'Logistics charges', text: 'Delivery priced per order as a service line, with the route noted.' },
  ],
};

const invoices: FeatureStory = {
  key: 'invoices',
  eyebrow: 'Billing and Invoicing',
  question: 'How long does it take you to send an invoice?',
  line: 'Invoices come straight from approved orders, in your own brand colour, with your bank accounts printed at the bottom and the payment status on top.',
  scenes: ['billing-calendar', 'payment-cards', 'secure-payment', 'recurring-revenue', 'coin-stacks', 'office-complex'],
  tile: { label: 'Automatic', title: 'Invoices from every order' },
  figure: { value: '3', label: 'Documents from one order: proforma, delivery note, invoice' },
  words: ['invoices', 'credit notes', 'statements', 'bank accounts', 'discounts', 'payments', 'PDFs', 'brand colour'],
  trust: {
    title: 'Billing that runs itself',
    line: 'Raise the order and the invoice is ready at the agreed terms. Price changes after delivery go through a credit note, never an edit.',
  },
  panel: {
    figures: [
      { label: 'Invoiced this month', value: '31,750,000', unit: '₦' },
      { label: 'Paid', value: '64%' },
    ],
    roles: ['Finance', 'Sales rep', 'Customer'],
    columns: ['Invoice', 'Payment'],
    record: { name: 'Invoice for PI202611042', sub: 'Bayo Ventures', when: 'Payment pending' },
  },
  bullets: [
    { icon: Receipt, text: 'Raised from the approved order' },
    { icon: FileMinus, text: 'Credit notes for price changes after delivery' },
    { icon: Printer, text: 'Print ready in your own brand colour' },
  ],
  cardArt: {
    title: 'Your brand, not ours',
    text: 'Every document carries your logo, full registered name and bank accounts, with your own logo as a faint watermark.',
  },
  cardText: {
    title: 'Corrections with a paper trail',
    text: 'Adjust a delivered, unpaid invoice with a **credit note** like **CN202611001**, and the change flows through to analytics.',
  },
  capTitle: 'Everything billing needs',
  capabilities: [
    { icon: Receipt, title: 'From the order', text: 'No retyping: the invoice is built from the approved order.' },
    { icon: FileMinus, title: 'Credit notes', text: 'Price changes after delivery, numbered and linked to the original line.' },
    { icon: ScrollText, title: 'Statements', text: 'Account statements for every customer, on demand.' },
    { icon: Landmark, title: 'Bank details printed', text: 'Your accounts sit at the foot of every proforma and invoice.' },
    { icon: Printer, title: 'Print ready', text: 'Clean documents in your brand colour, saved under their own number.' },
    { icon: Wallet, title: 'Payment status', text: 'Paid, part paid or pending, shown right on the document.' },
  ],
};

const credit: FeatureStory = {
  key: 'credit',
  eyebrow: 'Credit Management',
  question: 'Who owes you, and for how long?',
  line: 'Set a credit limit and terms for every customer. Orders that break them stop for approval, and ageing shows what is overdue at a glance.',
  scenes: ['secure-payment', 'coin-stacks', 'budget-calculator', 'financial-performance', 'office-complex-2', 'pie-chart'],
  tile: { label: 'At the point of sale', title: 'Credit checked on every order' },
  figure: { value: '30 · 60 · 90', label: 'Days of ageing on every account' },
  words: ['limits', 'terms', 'ageing', 'overdue', 'overrides', 'exposure', 'payments', 'reminders'],
  trust: {
    title: 'Protect cash at the moment of sale',
    line: 'A customer over their limit cannot be sold to quietly. Any override is recorded with who approved it and why.',
  },
  panel: {
    figures: [
      { label: 'Owed to you', value: '12,860,000', unit: '₦' },
      { label: 'Over 60 days', value: '1,940,000', unit: '₦' },
    ],
    roles: ['Finance', 'Manager', 'Sales rep'],
    columns: ['Customer', 'Oldest invoice'],
    record: { name: 'Northline Traders', sub: 'Limit ₦5,000,000', when: '64 days' },
  },
  bullets: [
    { icon: ShieldCheck, text: 'Limits and terms enforced on every order' },
    { icon: Hourglass, text: 'Ageing at 30, 60 and 90 days' },
    { icon: KeyRound, text: 'Overrides recorded with approver and reason' },
  ],
  cardArt: {
    title: 'Exposure, all in one place',
    text: 'See what every customer owes across all your locations, and which invoices are the oldest, before you approve the next order.',
  },
  cardText: {
    title: 'Owed, in red',
    text: 'The amount owed shows on a **black chip in red** beside sales, so the gap between **sold and collected** is never hidden.',
  },
  capTitle: 'Everything credit control needs',
  capabilities: [
    { icon: ShieldCheck, title: 'Limits and terms', text: 'Every customer has a limit and payment terms that orders respect.' },
    { icon: Hourglass, title: 'Ageing', text: 'Receivables grouped at 30, 60 and 90 days.' },
    { icon: KeyRound, title: 'Recorded overrides', text: 'Exceptions carry the approver’s name and the reason.' },
    { icon: Globe, title: 'One exposure', text: 'What each customer owes across all locations, in one figure.' },
    { icon: Bell, title: 'Overdue reminders', text: 'Overdue accounts surface in reminders until they are settled.' },
    { icon: Wallet, title: 'Payments matched', text: 'Payments land against invoices, so balances are always current.' },
  ],
};

/* ---------------------------------------------------- Intelligence Platform */

const sellOut: FeatureStory = {
  key: 'sell-out',
  eyebrow: 'Channel Intelligence',
  question: 'What actually sold, not just what you shipped?',
  line: 'Put sell in and sell out side by side, by product and week, and spot stock piling up with a partner before it becomes a problem.',
  scenes: ['price-comparison', 'shopping-bags', 'retail-store', 'data-analytics', 'location-distribution', 'global-trade'],
  tile: { label: 'Sell through', title: 'What your partners sold on' },
  figure: { value: '2', label: 'Sides of every sale: sell in and sell out' },
  words: ['sell in', 'sell out', 'channels', 'partners', 'products', 'weeks', 'territories', 'coverage'],
  trust: {
    title: 'Plan on real demand',
    line: 'Shipping to a partner is not the same as selling. Sell out shows what moved off their shelves, so you plan production on demand, not on hope.',
  },
  panel: {
    figures: [
      { label: 'Sell in', value: '9,840', unit: 'ctn' },
      { label: 'Sell out', value: '8,120', unit: 'ctn' },
    ],
    roles: ['Manager', 'Distributor', 'Sales rep'],
    columns: ['Partner', 'Weeks of stock'],
    record: { name: 'Eastgate Distributors', sub: 'Holding 1,720 cartons', when: '5 weeks' },
  },
  bullets: [
    { icon: LineChart, text: 'Sell in and sell out, side by side' },
    { icon: Boxes, text: 'Channel stock surfaced early' },
    { icon: Map, text: 'Coverage by territory' },
  ],
  cardArt: {
    title: 'The gap tells the story',
    text: 'When sell out lags sell in, stock is building with a partner. You see it in weeks, not at the end of the quarter.',
  },
  cardText: {
    title: 'Same filters, either side',
    text: 'Switch between **sell in** and **sell out** from one dropdown, and every figure on the page follows.',
  },
  capTitle: 'Everything channel insight needs',
  capabilities: [
    { icon: LineChart, title: 'Side by side', text: 'Sell in and sell out by product, partner and week.' },
    { icon: Boxes, title: 'Channel stock', text: 'Spot cartons piling up with a partner before they go stale.' },
    { icon: Map, title: 'Coverage', text: 'Distribution depth by territory, on the map.' },
    { icon: Store, title: 'Partner reporting', text: 'Partners report their own sales from their portal.' },
    { icon: Filter, title: 'One set of filters', text: 'Rep, channel, state and period apply to both sides.' },
    { icon: Factory, title: 'Demand signals', text: 'Plan production on what sold through, not what shipped.' },
  ],
};

const analytics: FeatureStory = {
  key: 'analytics',
  eyebrow: 'Analytics and BI',
  question: 'Are you deciding on last month’s spreadsheet?',
  line: 'Live dashboards for sales, stock and receivables, a territory map you can click, and filters that narrow every figure in one go.',
  scenes: ['data-analytics', 'pie-chart', 'financial-performance', 'global-trade', 'system-monitoring', 'onboarding-dashboard'],
  tile: { label: 'Live', title: 'Dashboards with no spreadsheets' },
  figure: { value: '5', label: 'Filters together: rep, channel, state, source and period' },
  words: ['revenue', 'customers', 'territories', 'channels', 'reps', 'periods', 'products', 'exports'],
  trust: {
    title: 'Decisions on live numbers',
    line: 'Every figure comes from the orders, invoices and payments already in AfterBI, so the dashboard and the books always agree.',
  },
  panel: {
    figures: [
      { label: 'Revenue this month', value: '86,600,000', unit: '₦' },
      { label: 'Customers buying', value: '142' },
    ],
    roles: ['Owner', 'Manager', 'Finance'],
    columns: ['Territory', 'Revenue'],
    record: { name: 'Northern region', sub: '38 customers buying', when: '₦21,400,000' },
  },
  bullets: [
    { icon: LineChart, text: 'Sold and collected on one line chart' },
    { icon: Map, text: 'Click a territory to focus the report' },
    { icon: Filter, text: 'Five filters, all from simple dropdowns' },
  ],
  cardArt: {
    title: 'From total to transaction',
    text: 'Start at revenue for the month, then drill down to a territory, a rep and a single invoice, without leaving the page.',
  },
  cardText: {
    title: 'Hide the figures in a meeting',
    text: 'One tap **masks every balance** with asterisks; tap a figure to **reveal just that one**.',
  },
  capTitle: 'Everything a dashboard needs',
  capabilities: [
    { icon: Gauge, title: 'Executive view', text: 'Sales, stock and receivables on one page.' },
    { icon: Map, title: 'Territory map', text: 'Performance by region; click to focus the whole report.' },
    { icon: LineChart, title: 'Sold vs collected', text: 'A line chart with the owed gap shaded between them.' },
    { icon: Filter, title: 'Dropdown filters', text: 'Rep, channel, state, sell in or out, and period.' },
    { icon: Eye, title: 'Hide balances', text: 'Mask figures in place when someone is looking over your shoulder.' },
    { icon: FileText, title: 'Exports', text: 'Figures ready for finance and the board.' },
  ],
};

const automation: FeatureStory = {
  key: 'automation',
  eyebrow: 'Workflow Automation',
  question: 'What is waiting on you right now?',
  line: 'Approvals, reminders and tasks that update themselves the moment a record changes, so nothing sits unsigned and nobody chases by phone.',
  scenes: ['workflow-automation', 'api-integration', 'system-monitoring', 'onboarding-dashboard', 'product-activation', 'cloud-computing'],
  tile: { label: 'Always current', title: 'Reminders that update themselves' },
  figure: { value: '24h', label: 'Before a seen but unfinished reminder counts again' },
  words: ['approvals', 'reminders', 'tasks', 'to dos', 'unfinished orders', 'overdue', 'tours', 'badges'],
  trust: {
    title: 'Work that moves itself along',
    line: 'Rules route each order to the right approver, reminders count only what still needs you, and every team gets its own tasks.',
  },
  panel: {
    figures: [
      { label: 'Waiting on you', value: '7' },
      { label: 'Done today', value: '23' },
    ],
    roles: ['Approver', 'Operations', 'Finance'],
    columns: ['Reminder', 'Due'],
    record: { name: 'Approve PI202611042', sub: 'Bayo Ventures, 46 cartons', when: 'Today' },
  },
  bullets: [
    { icon: BadgeCheck, text: 'Approval routing by rule' },
    { icon: Bell, text: 'Reminders that never show stale figures' },
    { icon: ListTodo, text: 'Tasks and to dos for every team' },
  ],
  cardArt: {
    title: 'Seen is not done',
    text: 'Opening a reminder stops it counting on the badge. If it is still pending a day later, it comes back.',
  },
  cardText: {
    title: 'A tour on day one',
    text: 'Every new user gets a **guided first tour**, so your team is working in AfterBI from the **first login**.',
  },
  capTitle: 'Everything that keeps work moving',
  capabilities: [
    { icon: BadgeCheck, title: 'Approval routing', text: 'Orders and overrides go to the right person by rule.' },
    { icon: Bell, title: 'Live reminders', text: 'Pending approvals and unfinished orders, always current.' },
    { icon: ListTodo, title: 'Tasks', text: 'To dos with due dates for every role.' },
    { icon: Timer, title: 'Back after a day', text: 'Seen but unfinished items return after 24 hours.' },
    { icon: ClipboardCheck, title: 'Clear the old', text: 'Delete reminders you no longer need, not just snooze them.' },
    { icon: BookOpen, title: 'Guided tour', text: 'New users learn the app on their first login.' },
  ],
};

const access: FeatureStory = {
  key: 'access',
  eyebrow: 'Security and Access',
  question: 'Who can see what in your business?',
  line: 'Every person gets a workspace for their role, every action carries their employee code, and a personal PIN locks the app when they step away.',
  scenes: ['cybersecurity', 'server-infrastructure', 'team-onboarding', 'office-complex-2', 'cloud-computing', 'data-backup'],
  tile: { label: 'By role', title: 'A workspace for every job' },
  figure: { value: '6', label: 'Digit personal PIN on top of the password' },
  words: ['roles', 'workspaces', 'employee codes', 'audit log', 'PIN lock', 'isolation', 'permissions', 'approvals'],
  trust: {
    title: 'Control over who sees what',
    line: 'Each company’s records are walled off by database rules, each role sees only its work, and the audit log cannot be edited or deleted.',
  },
  panel: {
    figures: [
      { label: 'Active users', value: '48' },
      { label: 'Audit entries this month', value: '3,912' },
    ],
    roles: ['Super admin', 'Finance', 'Warehouse'],
    columns: ['Action', 'By'],
    record: { name: 'Order approved', sub: 'PI202611042', when: 'HCB002FN' },
  },
  bullets: [
    { icon: Users, text: 'Workspaces for every role' },
    { icon: Fingerprint, text: 'Employee codes on every action' },
    { icon: Lock, text: 'A personal PIN when the screen locks' },
  ],
  cardArt: {
    title: 'Every action has a name',
    text: 'Codes like HCB001SA are assigned at onboarding: company letters, staff number, role. The audit log records them beside every decision.',
  },
  cardText: {
    title: 'Locked when you step away',
    text: 'Each person sets a **six digit PIN**; after the idle time they choose, or when the screen locks, the app asks for it **again**.',
  },
  capTitle: 'Everything security needs',
  capabilities: [
    { icon: Users, title: 'Role workspaces', text: 'Leadership, sales, operations, finance, warehouse, HR and partners.' },
    { icon: ShieldCheck, title: 'Company isolation', text: 'Database rules keep every company’s records apart.' },
    { icon: Fingerprint, title: 'Employee codes', text: 'Assigned at onboarding and locked; only an administrator edits them.' },
    { icon: ScrollText, title: 'Audit log', text: 'Who did what and when; nothing in it can be changed.' },
    { icon: Lock, title: 'Personal PIN', text: 'A second lock after inactivity or when the screen locks.' },
    { icon: KeyRound, title: 'Account ownership', text: 'Reps and distributors see only the accounts they own.' },
  ],
};

export const FEATURE_STORIES: Record<string, FeatureStory> = {
  leads,
  orders,
  targets,
  'distributor-portal': portal,
  stock,
  deliveries,
  invoices,
  credit,
  'sell-out': sellOut,
  analytics,
  automation,
  access,
};

/* --------------------------------------------------------------- Solutions */

export const SOLUTION_STORIES: Record<string, FeatureStory> = {
  manufacturers: {
    key: 'solution-manufacturers',
    eyebrow: 'Manufacturers',
    question: 'Do you see your whole network from the factory?',
    line: 'Every location, every distributor and every rep on one platform, with sell in and sell out side by side and targets for every review.',
    scenes: ['manufacturing-plant', 'manufacturing-plant-2', 'warehouse', 'delivery-truck', 'global-trade', 'revenue-growth'],
    tile: { label: 'One command centre', title: 'Every location and partner' },
    figure: { value: '2', label: 'Views of demand: what you shipped and what sold' },
    words: ['plants', 'depots', 'distributors', 'reps', 'targets', 'sell out', 'territories', 'scorecards'],
    trust: {
      title: 'From the plant to the last shelf',
      line: 'Orders, stock and sell through from every partner arrive in one place, so production plans on real demand.',
    },
    panel: {
      figures: [
        { label: 'Shipped this month', value: '42,300', unit: 'ctn' },
        { label: 'Sold through', value: '38,900', unit: 'ctn' },
      ],
      roles: ['Owner', 'Operations', 'Sales manager'],
      columns: ['Distributor', 'Sell through'],
      record: { name: 'Eastgate Distributors', sub: 'Eastern territory', when: '92%' },
    },
    bullets: [
      { icon: Globe, text: 'Every location on one dashboard' },
      { icon: LineChart, text: 'Sell in and sell out compared' },
      { icon: Trophy, text: 'Targets and scorecards for every review' },
    ],
    cardArt: {
      title: 'Plan production on what sold',
      text: 'Sell out from your partners shows real demand by product and week, so you make what the market is taking.',
    },
    cardText: {
      title: 'One network, many hands',
      text: 'Give **distributors their own portal** and **reps their own accounts**, and keep the whole picture for yourself.',
    },
    capTitle: 'Everything a manufacturer needs',
    capabilities: [
      { icon: Globe, title: 'Multi location', text: 'Plants, depots and partners on one platform.' },
      { icon: Store, title: 'Partner portal', text: 'Distributors order and report from their own login.' },
      { icon: LineChart, title: 'Channel insight', text: 'Sell in against sell out, by product and week.' },
      { icon: Target, title: 'Targets', text: 'By rep, distributor and product, counted on invoices.' },
      { icon: Warehouse, title: 'Stock by location', text: 'Every warehouse, section and row, live.' },
      { icon: Map, title: 'Territory map', text: 'Coverage and performance by region.' },
    ],
  },
  importers: {
    key: 'solution-importers',
    eyebrow: 'Brand Owners and Importers',
    question: 'Do you know your true landed cost?',
    line: 'Work out unit cost from product, freight, clearance and delivery, set your margins, and control stock, pricing and credit in every channel.',
    scenes: ['global-trade', 'budget-calculator', 'price-tag', 'inventory-boxes', 'warehouse-2', 'cost-checklist'],
    tile: { label: 'Landed cost', title: 'From container to price list' },
    figure: { value: '5', label: 'Costs rolled into unit cost: product, expenses, freight, clearance, delivery' },
    words: ['containers', 'freight', 'clearance', 'margins', 'price lists', 'short dated', 'credit', 'channels'],
    trust: {
      title: 'Control from the port to the shelf',
      line: 'Cost every shipment properly, price each channel on purpose, and keep short dated stock and slow payers in view.',
    },
    panel: {
      figures: [
        { label: 'Unit cost', value: '4,860', unit: '₦' },
        { label: 'Selling price', value: '6,300', unit: '₦' },
      ],
      roles: ['Operations', 'Finance', 'Owner'],
      columns: ['Shipment', 'Margin'],
      record: { name: 'Container 14', sub: '1,200 cartons landed', when: '30% on cost' },
    },
    bullets: [
      { icon: Calculator, text: 'Unit cost from every landed cost' },
      { icon: Tags, text: 'Price lists for each channel' },
      { icon: PackageX, text: 'Short dated stock held apart' },
    ],
    cardArt: {
      title: 'Margins you set, not guess',
      text: 'Add product cost, expenses, freight, clearance and delivery, divide by quantity, then apply the margin you want for the selling price.',
    },
    cardText: {
      title: 'Credit at the point of order',
      text: 'Every customer has a **limit and terms**, and an order that breaks them **stops for approval**.',
    },
    capTitle: 'Everything an importer needs',
    capabilities: [
      { icon: Calculator, title: 'Costing', text: 'Landed cost per unit, then margin to selling price.' },
      { icon: Tags, title: 'Channel prices', text: 'Open trade, modern trade and service price lists.' },
      { icon: Warehouse, title: 'Stock by location', text: 'Every warehouse, live, with counts from a phone.' },
      { icon: PackageX, title: 'Short dated stock', text: 'Held apart so it never ships by mistake.' },
      { icon: ShieldCheck, title: 'Credit policy', text: 'Limits and terms enforced on every order.' },
      { icon: Receipt, title: 'Billing', text: 'Invoices and credit notes straight from orders.' },
    ],
  },
  distributors: {
    key: 'solution-distributors',
    eyebrow: 'Distributors and Wholesalers',
    question: 'Is your sales operation still on WhatsApp?',
    line: 'Orders, stock, deliveries and statements in one platform, with every rep working only their own accounts.',
    scenes: ['warehouse-2', 'delivery-truck', 'mobile-applications', 'inventory-boxes', 'location-distribution', 'coin-stacks'],
    tile: { label: 'Digital', title: 'Your whole operation, one app' },
    figure: { value: '1 week', label: 'To go live on a single site' },
    words: ['orders', 'stock', 'deliveries', 'statements', 'reps', 'customers', 'payments', 'returns'],
    trust: {
      title: 'See your business in real time',
      line: 'Every order, delivery and payment is in one place, so you know where you stand each morning without calling anyone.',
    },
    panel: {
      figures: [
        { label: 'Orders today', value: '28' },
        { label: 'Collected today', value: '6,450,000', unit: '₦' },
      ],
      roles: ['Owner', 'Sales rep', 'Warehouse'],
      columns: ['Rep', 'Orders today'],
      record: { name: 'Amaka N.', sub: '24 accounts', when: '7 orders' },
    },
    bullets: [
      { icon: ShoppingCart, text: 'Orders from every rep’s phone' },
      { icon: Truck, text: 'Deliveries with notes and proof' },
      { icon: Eye, text: 'Reps see only their own accounts' },
    ],
    cardArt: {
      title: 'Out of the chat, into the system',
      text: 'Orders stop living in message threads. Each one is priced, approved, delivered and invoiced on the record.',
    },
    cardText: {
      title: 'Live in a week',
      text: 'Load your **products and price lists**, invite your **team**, and start trading on a single site within a week.',
    },
    capTitle: 'Everything a distributor needs',
    capabilities: [
      { icon: ShoppingCart, title: 'Orders', text: 'Raised on a phone, priced right, approved in one tap.' },
      { icon: Warehouse, title: 'Stock', text: 'Live positions and counts by section and row.' },
      { icon: Truck, title: 'Deliveries', text: 'Delivery notes, proof and returns.' },
      { icon: ScrollText, title: 'Statements', text: 'Balances and statements for every customer.' },
      { icon: Eye, title: 'Account ownership', text: 'Each rep works only the accounts they own.' },
      { icon: Wallet, title: 'Collections', text: 'Payments matched to invoices, owed shown in red.' },
    ],
  },
  'modern-trade': {
    key: 'solution-modern-trade',
    eyebrow: 'Modern Trade Suppliers',
    question: 'Are your supermarket claims clean?',
    line: 'Serve retail chains with the right modern trade prices, proof on every drop, and returns matched to the original line.',
    scenes: ['retail-store', 'shopping-bags', 'discount-coupon', 'promotion', 'delivery-truck', 'agreement'],
    tile: { label: 'Retail chains', title: 'Prices, proof and claims' },
    figure: { value: 'MT', label: 'Modern trade price list applied on every line' },
    words: ['chains', 'outlets', 'MT prices', 'proof', 'returns', 'credit notes', 'claims', 'drops'],
    trust: {
      title: 'Every drop accounted for',
      line: 'Chains pay on paperwork. AfterBI keeps the price, the delivery note and every return tied to the same original line.',
    },
    panel: {
      figures: [
        { label: 'Outlets served', value: '64' },
        { label: 'Open claims', value: '3' },
      ],
      roles: ['Key accounts', 'Operations', 'Finance'],
      columns: ['Outlet', 'Proof'],
      record: { name: 'Outlet 12', sub: 'DN202611024', when: 'Signed 09:15' },
    },
    bullets: [
      { icon: Tags, text: 'Modern trade prices applied automatically' },
      { icon: PackageCheck, text: 'Proof of delivery on every drop' },
      { icon: FileMinus, text: 'Returns and credit notes matched to the line' },
    ],
    cardArt: {
      title: 'Claims without the back and forth',
      text: 'A return or price change is a credit note on the original line, so the chain’s figures and yours always match.',
    },
    cardText: {
      title: 'One customer, many outlets',
      text: 'Serve every **outlet** of a chain on one account, with **proof** for each drop.',
    },
    capTitle: 'Everything modern trade needs',
    capabilities: [
      { icon: Tags, title: 'MT price list', text: 'The modern trade tier applied on every line.' },
      { icon: PackageCheck, title: 'Proof of delivery', text: 'Captured on a phone for every drop.' },
      { icon: FileMinus, title: 'Credit notes', text: 'Returns and price changes matched to the original line.' },
      { icon: Package, title: 'Returns', text: 'Raised on the account, never by editing a delivery.' },
      { icon: Receipt, title: 'Clean invoices', text: 'Your brand, bank details and the discount shown plainly.' },
      { icon: MapPin, title: 'Outlets', text: 'Every branch of a chain tracked on one account.' },
    ],
  },
};

export function featureStory(slug?: string): FeatureStory | undefined {
  return slug ? FEATURE_STORIES[slug] : undefined;
}

export function solutionStory(slug?: string): FeatureStory | undefined {
  return slug ? SOLUTION_STORIES[slug] : undefined;
}
