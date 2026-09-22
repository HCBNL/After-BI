/**
 * Everything the public pages say.
 *
 * WHY IT IS ALL IN ONE FILE, AND WHY NONE OF IT IS IN FIRESTORE
 *
 * The marketing site belongs to AfterBI, not to a tenant, so there is nobody
 * inside the product who should be editing it. Static buys three things: the
 * front page paints on the first frame with no read and no spinner, which
 * matters most to the visitor on the worst connection; it costs nothing to
 * serve; and a copy change is a pull request somebody reviews rather than a
 * text box somebody pastes into. Only the pictures are owner-published, in
 * `siteDoc.ts`.
 *
 * KEEP IT SHORT
 *
 * A line here is read by somebody deciding in four seconds whether this is for
 * them. A blurb is one line. A step is one sentence. An answer is two. If a
 * paragraph is needed to explain a module, the module is either badly named or
 * it belongs on a walkthrough, and both of those are better problems to fix
 * than to write around.
 *
 * NOTHING HERE IS CLAIMED THAT CANNOT BE STOOD BEHIND
 *
 * No customer count, no logo wall, no percentage uplift with an asterisk, no
 * testimonial with an invented name under it.
 */

import { SUPPORT_EMAIL } from './siteMeta';
import type { SiteBanner } from './siteDoc';

export { BRAND, SALES_PHONE, SITE_URL, SUPPORT_EMAIL } from './siteMeta';

/**
 * The promise, in one sentence, and the line the whole site is built on.
 *
 * Every BI tool a manufacturer buys reports what left the factory. That figure
 * is already on the invoice: the cheapest number in the business and the least
 * useful, because a carton sitting in a depot in Aba has been counted as a sale
 * and sold to nobody. The number that decides next month is the one after it.
 * Hence the name.
 */
export const PROMISE = 'Sell-in is a number you already have. Sell-out decides next month.';

export const META_DESCRIPTION =
  'Distribution management for FMCG: orders, stock, invoices, credit and sell-out across every depot and ' +
  'every distributor, on a phone that works in a warehouse with two bars.';

/* ----------------------------------------------------------- the built-in cover */

/**
 * What the cover shows before anybody has uploaded one.
 *
 * Not a placeholder: a finished slide — the headline on the drifting green
 * light — so a deployment that never uploads a photograph still has a front
 * page that looks deliberate. That matters, because it is the state every
 * evaluation starts in. `dim: 0` because there is no picture to push back; the
 * light IS the slide.
 */
export const DEFAULT_BANNER: SiteBanner[] = [
  {
    id: 'default',
    kind: 'image',
    src: '',
    mobileSrc: '',
    title: 'Everyone sees what you sold. See what happened after',
    subtitle: 'Orders, stock, invoices and sell-out, across every depot and every distributor.',
    dim: 0,
    buttons: true,
  },
];

/* -------------------------------------------------------------------- the nav */

/**
 * Four destinations, named the way a visitor says them.
 *
 * The footer and the structured data use these same four labels. The text
 * under a search result's sitelink is drawn from a site's own anchor text, and
 * one page with three different names is a page with none.
 */
export const NAV: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'Product', href: '/product' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

export type SocialKey = 'linkedin' | 'x' | 'whatsapp';

export const SOCIAL: { key: SocialKey; label: string; href: string }[] = [
  { key: 'linkedin', label: 'AfterBI on LinkedIn', href: 'https://www.linkedin.com/company/afterbi' },
  { key: 'x', label: 'AfterBI on X', href: 'https://x.com/afterbi' },
  { key: 'whatsapp', label: 'AfterBI on WhatsApp', href: 'https://wa.me/2348150000000' },
];

/* ---------------------------------------------------------------- the modules */

export type ModuleArt = 'orders' | 'sellout' | 'stock' | 'invoices' | 'credit' | 'deliveries' | 'targets' | 'partner';

export interface Module {
  slug: string;
  /** The short name. The shelf, the footer and the sitemap all use this one. */
  name: string;
  /** One line on the card. Under about twelve words. */
  blurb: string;
  /** Four things it does. One line each, verbs not nouns. */
  points: string[];
  art: ModuleArt;
}

/**
 * The eight modules, in the order a carton moves through them.
 *
 * Not in the order they were built and not by how impressive they are: a
 * reader is following a carton from the order that was keyed to the money that
 * came back, and a list that jumps about is one they have to re-sort.
 */
export const MODULES: Module[] = [
  {
    slug: 'orders',
    name: 'Orders',
    blurb: 'Keyed once, priced automatically, approved on the phone.',
    points: [
      'Keyed against the live price list, so nobody re-prices by hand.',
      'Credit and stock cover checked as the lines go in.',
      'Approval is a tap, with the reason kept against the order.',
      'The invoice comes off the order rather than being retyped.',
    ],
    art: 'orders',
  },
  {
    slug: 'sell-out',
    name: 'Sell-out',
    blurb: 'What the distributor actually moved, not what you invoiced.',
    points: [
      'Distributors report it in the same app they order in.',
      'Sell-in and sell-out on one line, by SKU, by week.',
      'The gap shows up as a gap, not as a surprise in March.',
      'Coverage and drop size per territory.',
    ],
    art: 'sellout',
  },
  {
    slug: 'stock',
    name: 'Stock and depots',
    blurb: 'Every depot, every SKU, counted the same way.',
    points: [
      'Opening, receipts, issues, returns, closing — per depot.',
      'Every movement carries who posted it and when.',
      'Short-dated and damaged stock held apart from good stock.',
      'Counted on a phone in the aisle, not on a clipboard.',
    ],
    art: 'stock',
  },
  {
    slug: 'invoices',
    name: 'Invoices and statements',
    blurb: 'Raised from the order, not retyped from it.',
    points: [
      'Priced at the terms that were actually approved.',
      'A statement your distributor opens themselves, at any hour.',
      'Credit notes go back against the line they came off.',
      'Prints to A4 without a line breaking across a page.',
    ],
    art: 'invoices',
  },
  {
    slug: 'credit',
    name: 'Credit control',
    blurb: 'The limit is enforced when the order is keyed.',
    points: [
      'Per-distributor limits and terms, applied at the moment of order.',
      'Ageing a finance manager can act on: 30, 60, 90.',
      'An override is a decision with a name and a reason on it.',
      'Exposure across every depot, added up for you.',
    ],
    art: 'credit',
  },
  {
    slug: 'deliveries',
    name: 'Deliveries',
    blurb: 'From the loading bay to the signature.',
    points: [
      'Loads built from approved orders only.',
      'Proof of delivery on the driver’s phone.',
      'A short delivery becomes a return automatically.',
      'The waybill stays attached to the order it came from.',
    ],
    art: 'deliveries',
  },
  {
    slug: 'targets',
    name: 'Targets and scorecards',
    blurb: 'One scorecard the whole trade meeting reads.',
    points: [
      'Volume and value targets per rep, distributor and territory.',
      'Scored against live orders, not a spreadsheet.',
      'Bands a manager reads in four seconds.',
      'Still readable when the monthly pack is photocopied.',
    ],
    art: 'targets',
  },
  {
    slug: 'distributor-portal',
    name: 'Distributor portal',
    blurb: 'Your partners key their own orders, and stop calling.',
    points: [
      'They order against their own price list and credit position.',
      'They see their statement without phoning your office.',
      'Their sell-out comes in through the same door.',
      'They cannot see another distributor’s anything.',
    ],
    art: 'partner',
  },
];

export function moduleBySlug(slug: string | undefined): Module | undefined {
  return MODULES.find((item) => item.slug === slug);
}

/* ------------------------------------------------------------- the four steps */

/** A month, as the business runs it. A real sequence, hence numbered. */
export const MONTH_STEPS: { title: string; body: string }[] = [
  { title: 'Set the month', body: 'Targets, price list and credit limits, once.' },
  { title: 'Take the orders', body: 'Reps and distributors key their own. Priced and credit-checked as they type.' },
  { title: 'Move the stock', body: 'Approve, load, deliver, sign. Returns go back against the line.' },
  { title: 'Close the books', body: 'Statements, ageing, and the sell-out figure.' },
];

/* ------------------------------------------------------------------ the proof */

/**
 * Four properties of the build you can sign into today.
 *
 * A phrase each, because they are scanned rather than read. Each one is
 * something a sceptical operations director can try to catch us on during a
 * walkthrough, which is the only kind of claim worth printing.
 */
export const PROOF: { value: string; icon: ProofIcon }[] = [
  { value: 'Built for two bars of signal', icon: 'signal' },
  { value: 'Naira, cartons and cases', icon: 'naira' },
  { value: 'Separated in the database', icon: 'lock' },
  { value: 'Prints properly to A4', icon: 'print' },
];

export type ProofIcon = 'signal' | 'naira' | 'lock' | 'print';

/* ------------------------------------------------------------------ the rooms */

/** Six portals. Everybody who touches a carton gets a different app. */
export const ROOMS: { name: string; who: string }[] = [
  { name: 'Head office', who: 'Everything: orders, stock, money, partners, settings.' },
  { name: 'Sales', who: 'Their accounts, their orders, their target.' },
  { name: 'Operations', who: 'Approvals, loads, deliveries, movements, returns.' },
  { name: 'Finance', who: 'Invoices, statements, credit, ageing, reports.' },
  { name: 'Distributor', who: 'Their account, and nothing belonging to anybody else.' },
  { name: 'Platform', who: 'Organisations and subscriptions. No tenant’s orders, ever.' },
];

/* ---------------------------------------------------------------- the pricing */

export interface Plan {
  name: string;
  /** Monthly, in naira, per organisation. `null` means "talk to us". */
  price: number | null;
  cadence: string;
  forWho: string;
  includes: string[];
  featured?: boolean;
  cta: string;
}

/**
 * Three plans, priced per organisation rather than per seat.
 *
 * Per-seat is the wrong shape for this trade: it bills a manufacturer for
 * onboarding the distributors whose data is the entire point of the product,
 * so the rational response is to share one login around a depot — which
 * destroys the audit trail the software exists to keep. Hence unlimited
 * distributor logins on every plan.
 */
export const PLANS: Plan[] = [
  {
    name: 'Depot',
    price: 180_000,
    cadence: 'per month',
    forWho: 'One distributor, or a one-depot business getting off paper.',
    includes: [
      'One organisation, one depot',
      'Up to 10 staff logins',
      'Unlimited distributor logins',
      'Orders, stock, invoices, statements',
      'Sell-out capture',
    ],
    cta: 'Book a walkthrough',
  },
  {
    name: 'Distribution',
    price: 450_000,
    cadence: 'per month',
    forWho: 'A manufacturer running several depots and a distributor network.',
    includes: [
      'Unlimited depots and territories',
      'Up to 50 staff logins',
      'Everything in Depot, plus:',
      'Credit control and ageing',
      'Targets, scorecards and analytics',
      'Deliveries and proof of delivery',
    ],
    featured: true,
    cta: 'Book a walkthrough',
  },
  {
    name: 'Group',
    price: null,
    cadence: 'talk to us',
    forWho: 'Several operating companies, or your own tenancy rules.',
    includes: [
      'Everything in Distribution',
      'Multiple organisations under one group',
      'Custom roles and approval chains',
      'Migration from your current system',
      'A named implementation lead',
    ],
    cta: 'Talk to us',
  },
];

/** "180000" as "₦180,000". */
export function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export const PRICING_NOTES = [
  'Billed monthly in naira. No setup fee on Depot or Distribution.',
  'Distributor logins are never charged for.',
  'Two months free on an annual commitment.',
];

/* ------------------------------------------------------------------- the FAQ */

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Does it work when the depot has no internet?',
    a: 'It is built for a bad connection rather than no connection: small, cached, and screens draw the shape of what is coming instead of spinning. A depot with no signal at all queues behind the network — that is the honest answer, and full offline capture is the next thing being built rather than something already claimed here.',
  },
  {
    q: 'Our distributors will not use new software.',
    a: 'That is the normal starting position. Their portal does three things — place an order, read a statement, report what they sold — and the statement is what brings them in. The alternative is phoning your finance office.',
  },
  {
    q: 'Can one distributor see another’s prices?',
    a: 'No, and not because their menu is shorter. Tenancy is enforced in the database rules, which sit between the app and the data and refuse the read whatever the client asks for.',
  },
  {
    q: 'What is sell-in versus sell-out?',
    a: 'Sell-in is what you invoiced your distributor. Sell-out is what they sold on. The gap is stock sitting in the channel, and a month where sell-in is up and sell-out is flat is a month borrowed from the next one.',
  },
  {
    q: 'How long does it take to start?',
    a: 'A single depot can be taking orders the same week. A manufacturer with a distributor network should plan a month, most of it agreeing the price list and the opening stock count rather than anything to do with the software.',
  },
  {
    q: 'Can we get our data out?',
    a: 'Yes. Reports export, documents print, and on Group we hand over a full export of your collections. A product that holds your data hostage has stopped competing on merit.',
  },
];

/* ------------------------------------------------------------------ the story */

export const ABOUT = {
  heading: 'We built the reports nobody could act on. Then we built this',
  body: [
    'AfterBI started in a room in Lagos looking at a dashboard that said the quarter was up eleven per cent. It was. The factory had shipped eleven per cent more cartons, and every one was on a real invoice.',
    'Three weeks later the same distributors stopped ordering. The stock had never moved — it was sitting in depots in Onitsha and Kano, bought on credit, and the eleven per cent had been borrowed from a quarter that had not happened yet.',
    'The question that mattered was in a WhatsApp group and a paper ledger. So we built the software that asks it.',
  ],
  values: [
    { title: 'The figure or nothing', body: 'No screen shows a number it cannot show the workings for.' },
    { title: 'The worst phone in the room', body: 'Not the demo laptop. The storekeeper’s Android, on two bars.' },
    { title: 'Refuse in the database', body: 'A control that only exists in the interface is decoration.' },
    { title: 'Say the honest thing', body: 'Including here. Where it does not do something yet, we say so.' },
  ],
};

/* ---------------------------------------------------------------- the booking */

/** The slots the office keeps free for walkthroughs. */
export const DEMO_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'] as const;

export const DEMO_TIMEZONE = 'Africa/Lagos';

/** "14:00" as "2:00 pm". */
export function clockLabel(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** A date as an ISO day, with no timezone drift from `toISOString`. */
export function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * The next working days a walkthrough can be booked on.
 *
 * Weekends are left out rather than offered and then declined by email, and
 * tomorrow is the earliest: a walkthrough booked for three hours' time is one
 * nobody from the office has read yet.
 */
export function bookableDays(count = 10): string[] {
  const days: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export interface BookingPayload {
  name: string;
  company: string;
  email: string;
  phone: string;
  depots: string;
  date: string;
  time: string;
  note: string;
}

export const DEPOT_BANDS = ['Just one', '2 to 5', '6 to 20', 'More than 20', 'I am a distributor'];

/**
 * Hands the booking to the office.
 *
 * There is no endpoint in this build, and rather than pretend there is, the
 * request is composed into a mail the visitor's own client sends. It is the
 * least impressive integration available and the only one that cannot fail
 * silently: a form that posts into a void loses the lead, and the visitor has
 * no way of knowing it did. When a real endpoint exists it goes in here and
 * nothing that calls this has to change.
 */
export function bookingMailto(payload: BookingPayload): string {
  const lines = [
    `Name: ${payload.name}`,
    `Company: ${payload.company}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    `Depots: ${payload.depots}`,
    '',
    `Requested: ${longDate(payload.date)} at ${clockLabel(payload.time)} (${DEMO_TIMEZONE})`,
    '',
    payload.note ? `Note: ${payload.note}` : '',
  ].filter(Boolean);

  const subject = `Walkthrough request — ${payload.company || payload.name}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}
