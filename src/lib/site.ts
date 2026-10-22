/**
 * Everything the public pages say.
 *
 * The marketing site belongs to AfterBI, not to a tenant, so it ships in the
 * bundle: the front page paints on the first frame with no database read, it
 * costs nothing to serve, and a copy change is a reviewed commit. Only the
 * pictures are owner-published (see `siteDoc.ts` and SITE_IMAGES below).
 *
 * VOICE
 *
 * A software company talking to commercial leaders: capabilities, outcomes and
 * control. Short, confident lines. No claims that cannot be shown in a
 * walkthrough: no invented customer counts, logos or testimonials.
 */

import { SUPPORT_EMAIL, WHATSAPP_URL } from './siteMeta';
import type { SiteBanner } from './siteDoc';

export { SUPPORT_EMAIL, WHATSAPP_URL } from './siteMeta';

/* ------------------------------------------------------------- the company */

/** The company behind AfterBI, written the way it signs: one word. */
export const COMPANY = 'Contoric';
export const COMPANY_URL = 'https://www.contoric.com';

/** The one-line positioning used in meta tags and share previews. */
export const PROMISE = 'The sales and distribution platform for consumer goods companies.';

export const META_DESCRIPTION =
  'AfterBI is the sales and distribution platform for consumer goods companies: pipeline, orders, inventory, ' +
  'billing, credit and channel intelligence on one secure cloud platform, with automated workflows for every team and partner.';

/* ---------------------------------------------------- the built-in cover */

/** Kept for the cover editor in Platform, Website. The new front page does not use it. */
export const DEFAULT_BANNER: SiteBanner[] = [
  {
    id: 'default',
    kind: 'image',
    src: '',
    mobileSrc: '',
    title: 'One platform for sales, distribution and revenue',
    subtitle: 'Pipeline, orders, inventory, billing and channel intelligence, connected.',
    dim: 0,
    buttons: true,
  },
];

/* ------------------------------------------------------------------ the nav */

/**
 * The top bar. Platform, Solutions and Support open a menu panel; the rest are
 * plain links. The footer is built from the same lists so the two never drift.
 */
export const NAV: { label: string; href: string; menu?: 'products' | 'solutions' | 'support' }[] = [
  { label: 'Platform', href: '/features', menu: 'products' },
  { label: 'Solutions', href: '/solutions', menu: 'solutions' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Support', href: '/help/sign-in', menu: 'support' },
];

export type SocialKey = 'linkedin' | 'x' | 'whatsapp';

export const SOCIAL: { key: SocialKey; label: string; href: string }[] = [
  { key: 'linkedin', label: 'AfterBI on LinkedIn', href: 'https://www.linkedin.com/company/afterbi' },
  { key: 'x', label: 'AfterBI on X', href: 'https://x.com/afterbi' },
  { key: 'whatsapp', label: 'AfterBI on WhatsApp', href: WHATSAPP_URL },
];

/* -------------------------------------------------------------- the modules */

export interface Module {
  /** The address, /features/<slug>. Stable: picture files and saved proposals key on it. */
  slug: string;
  /** The product name, as it appears in menus and proposals. */
  name: string;
  /** One line under the name. */
  blurb: string;
  /** The headline on the module's own page. */
  headline: string;
  /** Four capabilities, one line each. */
  points: string[];
}

/**
 * Twelve capabilities in three groups, the way the menu shows them. The slugs
 * are the old ones on purpose, so existing links, pictures and proposals keep
 * working.
 */
export const MODULES: Module[] = [
  /* Sales Cloud */
  {
    slug: 'leads',
    name: 'Pipeline Management',
    blurb: 'Track every prospect from first contact to signed account.',
    headline: 'A pipeline your whole sales team can see',
    points: [
      'Visual pipeline stages from new lead to won account',
      'Deal value and next steps on every opportunity',
      'Ownership by rep, with managers seeing the full board',
      'Won accounts convert straight into trading customers',
    ],
  },
  {
    slug: 'orders',
    name: 'Order Management',
    blurb: 'Capture, price and approve orders from any device, with policy checks built in.',
    headline: 'Every order priced right and approved in seconds',
    points: [
      'Channel price lists applied automatically on every line',
      'Live credit and inventory checks before submission',
      'One tap mobile approvals with a full audit trail',
      'Invoices generated directly from approved orders',
    ],
  },
  {
    slug: 'targets',
    name: 'Sales Performance',
    blurb: 'Targets, scorecards and rankings for every rep, partner and region.',
    headline: 'Set the target. Watch performance in real time',
    points: [
      'Volume and value targets by rep, partner and territory',
      'Scorecards calculated from live transactions',
      'Performance bands managers read at a glance',
      'Board ready reports for every sales review',
    ],
  },
  {
    slug: 'distributor-portal',
    name: 'Partner Portal',
    blurb: 'A self service workspace for your distributors and resellers.',
    headline: 'Give every partner their own self service workspace',
    points: [
      'Partners order against their own price list and credit',
      'Statements and balances available on demand',
      'Sell through reporting from the same workspace',
      'Strict isolation: no partner ever sees another’s data',
    ],
  },

  /* Operations and Finance */
  {
    slug: 'stock',
    name: 'Inventory Management',
    blurb: 'Real time stock visibility across every warehouse and location.',
    headline: 'One live view of inventory, everywhere you hold it',
    points: [
      'Multi warehouse stock positions, updated in real time',
      'Every movement timestamped and attributed to a user',
      'Damaged and short dated stock held separately',
      'Mobile stock counts with automatic reconciliation',
    ],
  },
  {
    slug: 'deliveries',
    name: 'Fulfilment and Logistics',
    blurb: 'Dispatch, track and confirm every delivery with digital proof.',
    headline: 'From dispatch to doorstep, fully tracked',
    points: [
      'Loads built only from approved orders',
      'Digital proof of delivery captured on mobile',
      'Short deliveries converted to returns automatically',
      'Shipping documents linked to the originating order',
    ],
  },
  {
    slug: 'invoices',
    name: 'Billing and Invoicing',
    blurb: 'Invoices generated from approved orders, with self service statements.',
    headline: 'Billing that runs itself',
    points: [
      'Invoices raised automatically at the approved terms',
      'Self service account statements for every customer',
      'Credit notes applied against the original line',
      'Clean, print ready documents in a professional format',
    ],
  },
  {
    slug: 'credit',
    name: 'Credit Management',
    blurb: 'Automated credit limits, ageing and exposure control at the point of sale.',
    headline: 'Protect cash flow at the moment of sale',
    points: [
      'Customer credit limits and terms enforced on every order',
      'Receivables ageing at 30, 60 and 90 days',
      'Policy overrides recorded with approver and reason',
      'Consolidated exposure across all locations',
    ],
  },

  /* Intelligence Platform */
  {
    slug: 'sell-out',
    name: 'Channel Intelligence',
    blurb: 'See true sell through across your partner network, not just what you shipped.',
    headline: 'Know what actually sold through your channel',
    points: [
      'Sell in and sell through side by side, by product and week',
      'Channel inventory surfaced before it becomes a problem',
      'Coverage and distribution depth by territory',
      'Demand signals you can plan production around',
    ],
  },
  {
    slug: 'analytics',
    name: 'Analytics and BI',
    blurb: 'Live dashboards and territory insight, with no spreadsheets required.',
    headline: 'Decisions on live numbers, not last month’s spreadsheet',
    points: [
      'Executive dashboards across sales, inventory and receivables',
      'Territory maps showing performance by region',
      'Drill down from total revenue to a single transaction',
      'Exports ready for finance and the board',
    ],
  },
  {
    slug: 'automation',
    name: 'Workflow Automation',
    blurb: 'Approvals, reminders and tasks that keep every transaction moving.',
    headline: 'Automation that keeps revenue moving',
    points: [
      'Rule based approval routing for orders and overrides',
      'Smart reminders for pending approvals and unfinished orders',
      'Role based tasks and to dos for every team',
      'Guided onboarding for every new user',
    ],
  },
  {
    slug: 'access',
    name: 'Security and Access',
    blurb: 'Role based workspaces with data isolation enforced at the database.',
    headline: 'Enterprise grade control over who sees what',
    points: [
      'Dedicated workspaces for leadership, sales, operations, finance and partners',
      'Tenant isolation enforced by database security rules',
      'Granular permissions by role and account ownership',
      'Complete audit trail on every record',
    ],
  },
];

export function moduleBySlug(slug: string | undefined): Module | undefined {
  return MODULES.find((item) => item.slug === slug);
}

/** The product menu, in three groups. */
export const PRODUCT_GROUPS: { title: string; slugs: string[] }[] = [
  { title: 'Sales Cloud', slugs: ['leads', 'orders', 'targets', 'distributor-portal'] },
  { title: 'Operations and Finance', slugs: ['stock', 'deliveries', 'invoices', 'credit'] },
  { title: 'Intelligence Platform', slugs: ['sell-out', 'analytics', 'automation', 'access'] },
];

/* ---------------------------------------------------------- how it works */

export const MONTH_STEPS: { title: string; body: string }[] = [
  { title: 'Configure', body: 'Set up price lists, credit policies, territories and teams once.' },
  { title: 'Connect', body: 'Invite reps, operations, finance and partners to their own workspaces.' },
  { title: 'Automate', body: 'Orders flow through approval, fulfilment and billing on their own.' },
  { title: 'Grow', body: 'Live dashboards from pipeline to sell through guide every decision.' },
];

/* ------------------------------------------------------------- the proof */

export type ProofIcon = 'lock' | 'device' | 'roles' | 'audit';

/** Four properties of the platform, under the hero. Each can be shown in a demo. */
export const PROOF: { value: string; icon: ProofIcon }[] = [
  { value: 'Enterprise grade security', icon: 'lock' },
  { value: 'Works on any device', icon: 'device' },
  { value: 'Role based workspaces', icon: 'roles' },
  { value: 'Full audit trail', icon: 'audit' },
];

/* -------------------------------------------------------------- the pricing */

export interface Plan {
  name: string;
  /** Monthly, in naira, per organisation: `perUser` × `users`. */
  price: number | null;
  /** Price per user per month, in naira. */
  perUser: number;
  /** Users included. */
  users: number;
  cadence: string;
  forWho: string;
  includes: string[];
  featured?: boolean;
  cta: string;
}

/** Priced per user, sold in packs; partner users are always free. */
export const PLANS: Plan[] = [
  {
    name: 'Starter',
    perUser: 7_500,
    users: 10,
    price: 75_000,
    cadence: 'per month',
    forWho: 'For growing teams getting started.',
    includes: ['10 users', 'Unlimited partner users', 'One location', 'Orders, inventory and billing', 'Pipeline management'],
    cta: 'Get started',
  },
  {
    name: 'Growth',
    perUser: 6_900,
    users: 25,
    price: 172_500,
    cadence: 'per month',
    forWho: 'For brands with several locations and partners.',
    includes: [
      '25 users',
      'Everything in Starter, plus:',
      'Unlimited locations',
      'Credit management',
      'Channel intelligence and analytics',
      'Workflow automation',
    ],
    featured: true,
    cta: 'Get started',
  },
  {
    name: 'Premium',
    perUser: 5_000,
    users: 50,
    price: 250_000,
    cadence: 'per month',
    forWho: 'For groups that need full control and support.',
    includes: [
      '50 users',
      'Everything in Growth, plus:',
      'Multiple entities under one group',
      'Custom roles and approval workflows',
      'Priority onboarding and support',
    ],
    cta: 'Get started',
  },
];

/** A yearly plan is ten months' price: two months free. */
export function yearly(monthly: number): number {
  return monthly * 10;
}

/** Older plan names, so saved proposals still find their plan. */
const PLAN_ALIASES: Record<string, string> = { Depot: 'Starter', Distribution: 'Growth', Group: 'Premium', Enterprise: 'Premium' };

export function planByName(name: string | undefined): Plan | undefined {
  if (!name) return undefined;
  const wanted = PLAN_ALIASES[name] ?? name;
  return PLANS.find((plan) => plan.name === wanted);
}

/** "180000" as "₦180,000". */
export function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export const PRICING_NOTES = ['No setup fee', 'Partner users always free', 'Two months free yearly'];

/* ------------------------------------------------------------------ the FAQ */

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is AfterBI?',
    a: 'A cloud platform for consumer goods companies that sell through distributors and retailers. Pipeline, orders, inventory, billing, credit and analytics in one place, with a workspace for every team and partner.',
  },
  {
    q: 'How is it different from a CRM or an ERP?',
    a: 'A CRM stops at the deal and an ERP starts at the warehouse. AfterBI runs the whole commercial cycle in between, including what your partners actually sell.',
  },
  {
    q: 'Do our distributors pay for access?',
    a: 'No. Partner users are free on every plan. Each partner gets their own portal to order, view statements and report sales.',
  },
  {
    q: 'Is our data secure?',
    a: 'Yes. Every organisation is isolated by database security rules, and every record keeps a full audit trail.',
  },
  {
    q: 'How fast can we go live?',
    a: 'A single site can be live within a week. Larger networks usually take about a month.',
  },
];

/* ------------------------------------------------------------- the founder */

/** The founder, for the structured data on the front page. */
export const FOUNDER = {
  name: 'Collins C. Nwobodo',
  alternateName: ['Collins Nwobodo'],
  role: 'Founder and CEO',
  bio:
    'Collins C. Nwobodo is the founder and CEO of AfterBI, the sales and distribution platform for consumer goods ' +
    'companies, built by Contoric. He works across operations and business intelligence.',
  knowsAbout: [
    'Sales and distribution operations',
    'Business intelligence',
    'Supply chain and procurement',
    'Channel management',
    'B2B software',
  ],
};

/* ------------------------------------------------------------- the booking */

export type StepKind = 'text' | 'email' | 'tel' | 'choice' | 'multi-choice' | 'longtext';

export interface WizardStep {
  id: string;
  /** Two or three words, for the review list at the end. */
  label: string;
  /** The one question on the screen. */
  question: string;
  hint?: string;
  kind: StepKind;
  placeholder?: string;
  options?: readonly string[];
  optional?: boolean;
  autoComplete?: string;
  maxLength?: number;
}

/**
 * Nine questions, one at a time. Contact details first, so a form abandoned
 * part way still leaves somebody we can call back.
 */
export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    id: 'name',
    label: 'Your name',
    question: 'First, what is your name?',
    hint: 'So we know who we are speaking with.',
    kind: 'text',
    placeholder: 'Full name',
    autoComplete: 'name',
    maxLength: 120,
  },
  {
    id: 'company',
    label: 'Company',
    question: 'Which company are you with?',
    kind: 'text',
    placeholder: 'Company name',
    autoComplete: 'organization',
    maxLength: 160,
  },
  {
    id: 'role',
    label: 'Your role',
    question: 'What is your role?',
    kind: 'choice',
    options: ['Founder or managing director', 'Sales leadership', 'Operations or supply chain', 'Finance', 'IT', 'Distribution partner'],
  },
  {
    id: 'email',
    label: 'Work email',
    question: 'What is your work email?',
    hint: 'Your confirmation goes here.',
    kind: 'email',
    placeholder: 'you@company.com',
    autoComplete: 'email',
    maxLength: 160,
  },
  {
    id: 'phone',
    label: 'Phone',
    question: 'And the best number to reach you?',
    hint: 'WhatsApp works best. We will never add you to a mailing list.',
    kind: 'tel',
    placeholder: 'Phone number',
    autoComplete: 'tel',
    maxLength: 40,
  },
  {
    id: 'depots',
    label: 'Locations',
    question: 'How many warehouses or locations do you operate?',
    hint: 'This helps us prepare the right demo environment.',
    kind: 'choice',
    options: ['One', '2 to 5', '6 to 20', 'More than 20', 'None, we are a partner'],
  },
  {
    id: 'partners',
    label: 'Partners',
    question: 'How many distributors or resellers do you sell through?',
    hint: 'An estimate is fine.',
    kind: 'choice',
    options: ['Under 10', '10 to 50', '50 to 200', 'More than 200', 'Not sure'],
  },
  {
    id: 'pain',
    label: 'Priorities',
    question: 'What would you like to improve first?',
    hint: 'Select all that apply.',
    kind: 'multi-choice',
    options: [
      'Order capture and approvals',
      'Inventory accuracy',
      'Collections and credit control',
      'Visibility of sell through',
      'Returns and claims',
      'Reporting and analytics',
    ],
  },
  {
    id: 'timing',
    label: 'Timeline',
    question: 'When are you looking to get started?',
    kind: 'choice',
    options: ['This month', 'This quarter', 'Later this year', 'Just exploring'],
  },
];

export type WizardAnswers = Record<string, string>;

/** A tidy summary of everything that was answered, for the office's mail. */
function composeNote(answers: WizardAnswers): string {
  return WIZARD_STEPS.map((step) => `${step.label}: ${(answers[step.id] ?? '').trim() || 'Not given'}`).join('\n');
}

/**
 * Hands the booking to the office as a mail the visitor's own client sends,
 * which cannot fail silently. A real endpoint goes in here when there is one.
 */
export function bookingMailto(answers: WizardAnswers): string {
  const who = (answers.company || answers.name || '').trim();
  const subject = `Demo request${who ? `: ${who}` : ''}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composeNote(answers))}`;
}

/** The same answers, as a WhatsApp message. */
export function bookingWhatsApp(answers: WizardAnswers): string {
  const text = `Hello AfterBI, I would like to book a demo.\n\n${composeNote(answers)}`;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

/* ================================================================== */
/*  THE FRONT PAGE                                                     */
/* ================================================================== */

/** The thin strip above the header. */
export const PROMO = {
  text: 'Partner users are free on every plan.',
  link: { label: 'Compare plans', href: '/pricing' },
};

export const HERO = {
  title: 'Your entire distribution, on autopilot',
  body: 'Orders, inventory, billing and partner sales on one platform, with automation that keeps every team in sync.',
  trust: ['Free partner users', 'Secure cloud', 'Any device'],
};

export type TabKey = 'sales' | 'operations' | 'finance' | 'intelligence';

/** The tabbed "lead to revenue" section on the front page. One picture per tab. */
export const TABS: { key: TabKey; label: string; title: string; points: string[]; link: string; image: SiteImageKey; art: string }[] = [
  {
    key: 'sales',
    label: 'Sales',
    title: 'Sales Automation',
    points: [
      'Manage your pipeline from first lead to won account',
      'Capture orders on any device with automatic pricing',
      'Give partners a self service ordering portal',
      'Approve orders in one tap, with a full audit trail',
      'Track targets and scorecards for every rep',
    ],
    link: '/features/orders',
    image: 'tab-sales',
    art: 'orders',
  },
  {
    key: 'operations',
    label: 'Operations',
    title: 'Inventory and Fulfilment',
    points: [
      'Real time inventory across every warehouse',
      'Loads built from approved orders only',
      'Digital proof of delivery on mobile',
      'Returns matched to the original order',
    ],
    link: '/features/stock',
    image: 'tab-operations',
    art: 'stock',
  },
  {
    key: 'finance',
    label: 'Finance',
    title: 'Billing and Credit Control',
    points: [
      'Invoices generated from approved orders',
      'Credit limits enforced at the point of sale',
      'Receivables ageing at 30, 60 and 90 days',
      'Self service statements for every customer',
    ],
    link: '/features/credit',
    image: 'tab-finance',
    art: 'credit',
  },
  {
    key: 'intelligence',
    label: 'Intelligence',
    title: 'Channel Intelligence',
    points: [
      'Sell in and sell through, side by side',
      'Live executive dashboards',
      'Territory performance maps',
      'Smart reminders and automated workflows',
    ],
    link: '/features/sell-out',
    image: 'tab-intelligence',
    art: 'analytics',
  },
];

/** From lead to revenue: the three stages the front page walks through. */
export const LIFECYCLE: { title: string; body: string; slugs: string[] }[] = [
  {
    title: 'Win',
    body: 'Manage pipeline, capture orders and let partners buy on their own, with pricing and policy applied automatically.',
    slugs: ['leads', 'orders', 'distributor-portal'],
  },
  {
    title: 'Fulfil',
    body: 'Turn approved orders into tracked deliveries, with live inventory across every location.',
    slugs: ['stock', 'deliveries'],
  },
  {
    title: 'Collect and grow',
    body: 'Bill automatically, control credit exposure and see what actually sold through your channel.',
    slugs: ['invoices', 'credit', 'sell-out'],
  },
];

/** "From out of the box to tailored." */
export const PLATFORM: { title: string; body: string }[] = [
  { title: 'Channel pricing', body: 'Dedicated price lists for open trade, modern trade and service accounts, applied automatically.' },
  { title: 'Approval workflows', body: 'Define who approves what. Without a designated approver, the super admin signs off.' },
  { title: 'Data ownership', body: 'Export reports, print documents, and take your complete record whenever you need it.' },
];

/** The numbers band. Facts about the product, not claims about customers. */
export const STATS: { value: string; label: string }[] = [
  { value: '12', label: 'integrated capabilities' },
  { value: '6', label: 'role based workspaces' },
  { value: '₦0', label: 'per partner user, always' },
  { value: '1', label: 'single source of truth' },
];

export type IndustryIcon = 'food' | 'drinks' | 'care' | 'home' | 'baby' | 'agro' | 'pharma' | 'build' | 'electronics' | 'spirits' | 'stationery' | 'fashion';

export const INDUSTRIES: { name: string; icon: IndustryIcon }[] = [
  { name: 'Food and Snacks', icon: 'food' },
  { name: 'Beverages', icon: 'drinks' },
  { name: 'Personal Care and Beauty', icon: 'care' },
  { name: 'Home Care', icon: 'home' },
  { name: 'Baby and Nutrition', icon: 'baby' },
  { name: 'Agribusiness', icon: 'agro' },
  { name: 'Health and Wellness', icon: 'pharma' },
  { name: 'Building Materials', icon: 'build' },
  { name: 'Consumer Electronics', icon: 'electronics' },
  { name: 'Wines and Spirits', icon: 'spirits' },
  { name: 'Stationery and Office', icon: 'stationery' },
  { name: 'Fashion and Textiles', icon: 'fashion' },
];

export interface Solution {
  slug: string;
  name: string;
  blurb: string;
  points: string[];
  modules: string[];
  image: SiteImageKey;
}

export const SOLUTIONS: Solution[] = [
  {
    slug: 'manufacturers',
    name: 'Manufacturers',
    blurb: 'Run multi location sales and a partner network from one command centre.',
    points: [
      'Every location and partner on a single dashboard',
      'Sell in and sell through compared side by side',
      'Targets and scorecards for every sales review',
    ],
    modules: ['orders', 'sell-out', 'targets'],
    image: 'solution-manufacturers',
  },
  {
    slug: 'importers',
    name: 'Brand Owners and Importers',
    blurb: 'Control inventory, pricing and credit across every channel you sell through.',
    points: [
      'Inventory by location, with short dated stock held separately',
      'Channel specific price lists',
      'Credit policy enforced at the point of order',
    ],
    modules: ['stock', 'credit', 'invoices'],
    image: 'solution-importers',
  },
  {
    slug: 'distributors',
    name: 'Distributors and Wholesalers',
    blurb: 'Digitise your sales operation and see your business in real time.',
    points: [
      'Orders, inventory and statements in one platform',
      'Reps see only the accounts they own',
      'Live on a single site within a week',
    ],
    modules: ['orders', 'stock', 'deliveries'],
    image: 'solution-distributors',
  },
  {
    slug: 'modern-trade',
    name: 'Modern Trade Suppliers',
    blurb: 'Serve retail chains with accurate pricing, proof of delivery and clean claims.',
    points: [
      'Modern trade price list applied automatically',
      'Digital proof of delivery on every drop',
      'Returns and credit notes matched to the original line',
    ],
    modules: ['deliveries', 'invoices', 'credit'],
    image: 'solution-modern-trade',
  },
];

export function solutionBySlug(slug: string | undefined): Solution | undefined {
  return SOLUTIONS.find((item) => item.slug === slug);
}

/**
 * Customer stories for the front page. EMPTY ON PURPOSE: the section does not
 * draw until there is a real one, added with the customer's permission.
 */
export const STORIES: { quote: string; name: string; role: string; company: string; stat?: string; statLabel?: string; photo?: string }[] = [];

/** Customer logos for the "trusted by" strip. EMPTY ON PURPOSE. Files go in /public/site/logos/. */
export const LOGOS: { name: string; src: string }[] = [];

/* ------------------------------------------------------------ the pictures */

/**
 * Every picture slot on the public site, grouped the way Platform, Website
 * lists them.
 *
 * Each one is uploaded from Platform, Website (stored on `site/home` as
 * `images[key]`). A file named `<key>.webp`, `.png` or `.jpg` in `public/site/`
 * still works as a second source. Until either exists, the slot draws its own
 * stand in, so the site is never broken while pictures are being added.
 */
export const SLOT_GROUPS = [
  'Front page',
  'Industries',
  'Platform page',
  'Modules',
  'Solutions',
  'Pricing',
  'Book a demo and support',
  'Menus and closing band',
] as const;
export type SlotGroup = (typeof SLOT_GROUPS)[number];

export interface SiteSlot {
  group: SlotGroup;
  /** What the owner sees above the upload box. */
  label: string;
  /** Pixel size to export at. */
  size: string;
  /** The shape the slot draws at, as a CSS aspect ratio (`4/5`). */
  ratio: string;
  /** What to put in it. Shown behind the (i). */
  what: string;
}

const INDUSTRY_PHOTO: Record<IndustryIcon, string> = {
  food: 'Packaged foods and snacks on a shelf or in a warehouse.',
  drinks: 'Soft drinks, water or juice: crates, bottles or a cold room.',
  care: 'Personal care and beauty products: soaps, creams, cosmetics.',
  home: 'Home care products: detergents, cleaners, tissue.',
  baby: 'Baby food, formula or diapers on a store shelf.',
  agro: 'Agribusiness: grain bags, farm produce, a farm or an agro store.',
  pharma: 'Health and wellness: pharmacy shelves or supplements.',
  build: 'Building materials: cement bags, paint, tiles or a hardware store.',
  electronics: 'Consumer electronics: phones, TVs or appliances in a store.',
  spirits: 'Wines and spirits: bottles on a shelf or in a cellar.',
  stationery: 'Stationery and office supplies: books, paper, pens.',
  fashion: 'Fashion and textiles: fabric rolls, clothing racks or shoes.',
};

const MODULE_PHOTO: Record<string, string> = {
  leads: 'Screenshot: the Leads pipeline board.',
  orders: 'Screenshot: the Orders screen.',
  targets: 'Screenshot: Targets or Scorecards.',
  'distributor-portal': 'Screenshot: the distributor (partner) portal on a phone.',
  stock: 'Screenshot: the Stock screen.',
  deliveries: 'Screenshot: the Deliveries screen.',
  invoices: 'Screenshot: an invoice or a customer statement.',
  credit: 'Screenshot: the Credit screen with ageing.',
  'sell-out': 'Screenshot: the Sell out screen.',
  analytics: 'Screenshot: the Analytics screen or territory map.',
  automation: 'Screenshot: Reminders, Tasks or Approvals.',
  access: 'Screenshot: the Users screen showing roles.',
};

const SOLUTION_PHOTO: Record<string, string> = {
  manufacturers: 'A modern factory or production line.',
  importers: 'A modern warehouse with racking and pallets.',
  distributors: 'A distribution centre with a delivery van loading.',
  'modern-trade': 'A supermarket aisle with stocked shelves.',
};

const STEP_PHOTO = [
  'Someone setting things up at a desk: price lists, a laptop, a planning board.',
  'A team being onboarded: people with phones and laptops, a short meeting.',
  'Goods moving on their own: a loaded van leaving, a forklift, a busy depot.',
  'Growth: a manager reading a dashboard, a full store shelf, a handshake.',
];

const DEMO_PHOTO = [
  'Tailored: someone preparing a product list or price list on a laptop.',
  '30 minutes: a short video call or a screen being shown to a client.',
  'Your team: sales, operations and finance people around one screen.',
  'No pressure: a relaxed conversation, a proposal on a table, a handshake.',
];

function buildSlots(): Record<string, SiteSlot> {
  const slots: Record<string, SiteSlot> = {
    hero: { group: 'Front page', label: 'Hero photo', size: '1200 × 1500', ratio: '4/5', what: 'The big picture at the top of the front page. A person using AfterBI on a phone or tablet, in a warehouse, depot or shop. Real, natural photo. The floating cards are added by the site.' },
    'tab-sales': { group: 'Front page', label: 'Lifecycle tab: Sales', size: '1400 × 1000', ratio: '7/5', what: 'Shown when the Sales tab is picked. AfterBI order and pipeline screens on a light background (laptop plus phone).' },
    'tab-operations': { group: 'Front page', label: 'Lifecycle tab: Operations', size: '1400 × 1000', ratio: '7/5', what: 'Shown when the Operations tab is picked. AfterBI stock and deliveries screens on a light background.' },
    'tab-finance': { group: 'Front page', label: 'Lifecycle tab: Finance', size: '1400 × 1000', ratio: '7/5', what: 'Shown when the Finance tab is picked. AfterBI invoice, statement and credit screens on a light background.' },
    'tab-intelligence': { group: 'Front page', label: 'Lifecycle tab: Intelligence', size: '1400 × 1000', ratio: '7/5', what: 'Shown when the Intelligence tab is picked. AfterBI analytics and sell out dashboards on a light background.' },
    showcase: { group: 'Front page', label: 'In your pocket', size: '1200 × 1000', ratio: '6/5', what: 'The "Your whole business, in your pocket" section. A sales rep or store owner holding a phone or tablet with AfterBI on screen, in a store.' },
    'home-faq': { group: 'Front page', label: 'Questions section', size: '1000 × 1250', ratio: '4/5', what: 'Beside the frequently asked questions. A friendly support person, or someone working at a laptop.' },
    'features-hero': { group: 'Platform page', label: 'Platform page banner', size: '2100 × 900', ratio: '21/9', what: 'A wide banner under the title of the Platform page (/features). The whole product: laptop and phone with AfterBI, or a team at work.' },
    'solutions-hero': { group: 'Solutions', label: 'Solutions page banner', size: '2100 × 900', ratio: '21/9', what: 'A wide banner under the title of the Solutions page. The value chain: factory, warehouse, truck and store in one picture.' },
    'plan-starter': { group: 'Pricing', label: 'Starter plan card', size: '1200 × 675', ratio: '16/9', what: 'Top of the Starter plan card. A small team or a single shop getting started.' },
    'plan-growth': { group: 'Pricing', label: 'Growth plan card', size: '1200 × 675', ratio: '16/9', what: 'Top of the Growth plan card. A busy distributor with several reps and a depot.' },
    'plan-premium': { group: 'Pricing', label: 'Premium plan card', size: '1200 × 675', ratio: '16/9', what: 'Top of the Premium plan card. A large operation: big warehouse, fleet, many people.' },
    'help-contact': { group: 'Book a demo and support', label: 'Sign in help: contact box', size: '1000 × 750', ratio: '4/3', what: 'Beside "None of those?" on the sign in help page. A friendly support person on a phone or headset.' },
    'menu-platform': { group: 'Menus and closing band', label: 'Platform menu card', size: '800 × 450', ratio: '16/9', what: 'The dark card in the Platform drop down menu ("Explore the platform"). AfterBI on a laptop.' },
    'menu-support': { group: 'Menus and closing band', label: 'Support menu card', size: '800 × 450', ratio: '16/9', what: 'The dark card in the Support drop down menu ("Already a customer?"). Someone signing in on a phone or laptop.' },
    'cta-team': { group: 'Menus and closing band', label: 'Closing band', size: '1200 × 900', ratio: '4/3', what: 'The green "Ready to see AfterBI in action?" band at the bottom of every page. A professional on a video call or a team at work, smiling.' },
  };
  for (const item of INDUSTRIES) {
    slots[`industry-${item.icon}`] = { group: 'Industries', label: item.name, size: '800 × 600', ratio: '4/3', what: `The ${item.name} card in "Built for every consumer goods category" (front page and Solutions page). ${INDUSTRY_PHOTO[item.icon]}` };
  }
  MONTH_STEPS.forEach((step, index) => {
    slots[`step-${index + 1}`] = { group: 'Platform page', label: `Step ${index + 1}: ${step.title}`, size: '800 × 500', ratio: '16/10', what: `Box ${index + 1} of "Live in four steps" on the Platform page. ${STEP_PHOTO[index]}` };
  });
  for (const m of MODULES) {
    slots[`module-${m.slug}`] = { group: 'Modules', label: m.name, size: '1600 × 1000', ratio: '16/10', what: `The ${m.name} picture: its card on the Platform page, the top of its own page, and the related capability cards. ${MODULE_PHOTO[m.slug] ?? 'A screenshot of this part of AfterBI.'}` };
  }
  for (const s of SOLUTIONS) {
    slots[s.image] = { group: 'Solutions', label: s.name, size: '1200 × 800', ratio: '3/2', what: `The ${s.name} section of the Solutions page, its tile at the top, and the "Who it is built for" cards. ${SOLUTION_PHOTO[s.slug] ?? ''}`.trim() };
  }
  DEMO_PHOTO.forEach((what, index) => {
    slots[`demo-${index + 1}`] = { group: 'Book a demo and support', label: `Demo page box ${index + 1}`, size: '800 × 500', ratio: '16/10', what: `Box ${index + 1} on the Book a demo page. ${what}` };
  });
  return slots;
}

export const SITE_IMAGES: Record<string, SiteSlot> = buildSlots();

export type SiteImageKey = string;
