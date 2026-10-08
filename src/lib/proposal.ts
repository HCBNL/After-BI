/**
 * The proposal engine: a tailored commercial proposal for one prospect.
 *
 * The platform owner fills in who the prospect is, how big their operation
 * is and what hurts; this file turns that into a printable A4 proposal with
 * features, pricing, support and a section on why AfterBI fits that business.
 *
 * TAILORED BY RULES, NOT BY AI
 *
 * Every "why it fits" paragraph is written here in advance, one per pain
 * point and one per kind of business, and picked by what the owner ticked.
 * The numbers in it (depots, distributors, people) are the prospect's own.
 * Nothing is invented, so nothing in the proposal is a claim the sales call
 * cannot stand behind.
 *
 * Saved at `proposals/{id}`, a root collection only the platform owner can
 * read or write, so a proposal can be reopened, revised and printed again.
 */

import { collection, deleteDoc, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { MODULES, PLANS, naira, planByName } from './site';
import { BRAND, SITE_URL, SUPPORT_EMAIL, SALES_PHONE } from './siteMeta';
import { COMPANY, brandAsset } from './company';
import { resolveCustom, type CustomBuild } from './programme';

/* ------------------------------------------------------------------ input */

export const BUSINESS_TYPES = [
  'Manufacturer with a distributor network',
  'Importer or brand owner',
  'Distributor or wholesaler',
  'Modern trade supplier',
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** The same pains the booking form asks about, so a booked call carries straight over. */
export const PAINS = [
  'Orders arrive by WhatsApp',
  'Stock never agrees with the count',
  'Chasing payments',
  'No idea what distributors actually sold',
  'Reconciling returns and claims',
  'Reporting takes days',
] as const;

export type Pain = (typeof PAINS)[number];

export type SupportLevel = 'standard' | 'priority' | 'dedicated';

export const SUPPORT_LEVELS: Record<SupportLevel, { name: string; price: number; lines: string[] }> = {
  standard: {
    name: 'Standard support',
    price: 0,
    lines: [
      'WhatsApp and email support, Monday to Saturday, 8am to 6pm',
      'Reply within 4 working hours',
      'Step by step help and a guided tour built into the app',
      'Every update and new feature at no extra cost',
    ],
  },
  priority: {
    name: 'Priority support',
    price: 75_000,
    lines: [
      'Everything in Standard',
      'Reply within 1 working hour, 7 days a week',
      'A monthly review call on your numbers',
      'Changes to approval rules and reminders done for you',
    ],
  },
  dedicated: {
    name: 'Dedicated account manager',
    price: 200_000,
    lines: [
      'Everything in Priority',
      'A named account manager who knows your business',
      'On site visits for training and stock count days',
      'Quarterly business review with your management team',
    ],
  },
};

export interface ProposalInput {
  /** Who made it: set for proposals made by AfterBI staff. */
  createdBy?: string;
  id: string;
  /** The prospect. */
  company: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  businessType: BusinessType;
  depots: number;
  distributors: number;
  staff: number;
  pains: Pain[];
  /** Module slugs from `site.ts`. */
  modules: string[];
  /** Plan name from `PLANS`. */
  plan: string;
  /** Monthly price actually offered. Defaults to the plan's list price. */
  monthly: number;
  /** One-off setup and migration fee. Zero is allowed and printed as "Included". */
  setupFee: number;
  /** Percent off the monthly fee. */
  discount: number;
  annual: boolean;
  support: SupportLevel;
  /** A personal paragraph from the founder, at the top. Optional. */
  note: string;
  date: string;
  validDays: number;
  status: 'draft' | 'sent' | 'won' | 'lost';
  /**
   * How it reads. `price` leads with the numbers (the first year in full);
   * `value` leads with what changes for them and keeps the price to one
   * short table at the end, with no first year total. Missing reads as price.
   */
  edition?: ProposalEdition;
  /** Adds AfterBI Custom as a second option, priced per project. */
  includeCustom?: boolean;
  updatedAt?: string;
}

export type ProposalEdition = 'price' | 'value';

export function blankProposal(): ProposalInput {
  const featured = PLANS.find((plan) => plan.featured) ?? PLANS[0];
  return {
    id: '',
    company: '',
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    businessType: BUSINESS_TYPES[0],
    depots: 3,
    distributors: 20,
    staff: 15,
    pains: [],
    modules: MODULES.map((m) => m.slug),
    plan: featured.name,
    monthly: featured.price ?? 0,
    setupFee: 0,
    discount: 0,
    annual: false,
    support: 'standard',
    note: '',
    date: new Date().toISOString().slice(0, 10),
    validDays: 30,
    status: 'draft',
    edition: 'price',
    includeCustom: false,
  };
}

/** The plan that fits the size, as a starting point the owner can change. */
export function suggestPlan(depots: number, staff: number): string {
  if (depots <= 1 && staff <= 10) return 'Depot';
  if (staff <= 50) return 'Distribution';
  return 'Group';
}

/* ---------------------------------------------------------------- figures */

export interface Figures {
  monthlyList: number;
  monthlyAfterDiscount: number;
  support: number;
  monthlyTotal: number;
  /** Months billed in the first year: 10 on an annual commitment, else 12. */
  billedMonths: number;
  firstYear: number;
  setupFee: number;
}

export function figures(input: ProposalInput): Figures {
  const discount = Math.min(Math.max(input.discount, 0), 100);
  const monthlyAfterDiscount = Math.round(input.monthly * (1 - discount / 100));
  const support = SUPPORT_LEVELS[input.support].price;
  const monthlyTotal = monthlyAfterDiscount + support;
  const billedMonths = input.annual ? 10 : 12;
  return {
    monthlyList: input.monthly,
    monthlyAfterDiscount,
    support,
    monthlyTotal,
    billedMonths,
    firstYear: monthlyTotal * billedMonths + input.setupFee,
    setupFee: input.setupFee,
  };
}

/* --------------------------------------------------------- the tailoring */

/** Why it fits, one paragraph per pain the prospect named. */
const PAIN_FIT: Record<Pain, { heading: string; body: (i: ProposalInput) => string }> = {
  'Orders arrive by WhatsApp': {
    heading: 'Orders keyed once, at the right price',
    body: (i) =>
      `Today orders reach ${i.company} by WhatsApp and phone and are retyped. In AfterBI each of your ${count(i.distributors, 'distributor')} keys its own order from its own price tier, or a rep keys it on the spot. Prices come from the tier, never from a box somebody types in, and orders above your threshold wait for a signature before stock moves.`,
  },
  'Stock never agrees with the count': {
    heading: 'One stock figure per depot, with the workings',
    body: (i) =>
      `Every carton in or out of your ${count(i.depots, 'depot')} is recorded as a movement with who made it and the balance after it. Fulfilling an order deducts the stock itself, and a line that is short refuses the whole fulfilment rather than going negative. When the count disagrees, the ledger shows where.`,
  },
  'Chasing payments': {
    heading: 'Invoices off the order, and credit enforced',
    body: (i) =>
      `Invoices are raised from the delivered order, not retyped. Payments, including part payments, update the statement at once, and each distributor's credit limit is checked when the order is keyed, not after the goods have gone. Your finance team sees, every morning, who is overdue and who is against their limit, across all ${count(i.distributors, 'account')}.`,
  },
  'No idea what distributors actually sold': {
    heading: 'Sell-out, not just sell-in',
    body: (i) =>
      `Reps and distributors key what actually left the shelves, by outlet and by day. Targets and scorecards are measured on that figure, so ${i.company} sees which of its ${count(i.distributors, 'distributor')} are moving stock and which are holding it on credit, before the next order is placed.`,
  },
  'Reconciling returns and claims': {
    heading: 'Returns with a trail',
    body: () =>
      'Damage, shortage and expiry are raised against the delivery, approved by the office, and received back into stock by the depot. Each one carries its credit, so the claim, the stock and the statement agree without a spreadsheet in between.',
  },
  'Reporting takes days': {
    heading: 'The numbers are already there',
    body: (i) =>
      `Because orders, stock, invoices and sell-out are in one place, the monthly pack is a download, not a week of reconciling. Each of your ${count(i.staff, 'person', 'people')} also gets a daily brief: what needs them first, and which stage orders are stuck at.`,
  },
};

const TYPE_FIT: Record<BusinessType, string> = {
  'Manufacturer with a distributor network':
    'AfterBI is built for exactly this shape: a manufacturer selling through a network of distributors, with depots in between. Each distributor sees only its own orders, prices and balances; your head office sees all of them.',
  'Importer or brand owner':
    'For a brand owner, the question is not what was shipped but what sold through. AfterBI follows the carton past your warehouse to the distributor and the outlet, so you plan the next container on sell-out, not on hope.',
  'Distributor or wholesaler':
    'For a distributor, AfterBI runs the whole back office: orders from your own customers, stock across your stores, invoices, credit and collections, on the phones your team already carries.',
  'Modern trade supplier':
    'Modern trade buys on terms and returns what it cannot sell. AfterBI keeps each chain on its own price tier and credit limit, tracks deliveries against what was ordered, and keeps returns and credit notes in step with the statement.',
};

function count(n: number, word: string, many = `${word}s`): string {
  return `${n.toLocaleString('en-NG')} ${n === 1 ? word : many}`;
}

export interface FitSection {
  heading: string;
  body: string;
}

function tailoredFit(input: ProposalInput): FitSection[] {
  const sections: FitSection[] = [{ heading: `Built for a business like ${input.company || 'yours'}`, body: TYPE_FIT[input.businessType] }];
  for (const pain of input.pains) sections.push({ heading: PAIN_FIT[pain].heading, body: PAIN_FIT[pain].body(input) });
  if (input.pains.length === 0) {
    sections.push({
      heading: 'One system, from order to cash',
      body: `Orders, approvals, stock, invoices, credit and sell-out for your ${count(input.depots, 'depot')} and ${count(input.distributors, 'distributor')} in one place, with each person seeing only what their role needs.`,
    });
  }
  return sections;
}

/** Onboarding, in weeks, sized to the operation. */
function timeline(input: ProposalInput): { when: string; what: string }[] {
  const big = input.depots > 5 || input.distributors > 50;
  return [
    { when: 'Week 1', what: 'Set up the organisation: company details, depots, approval rules and reminder windows.' },
    { when: big ? 'Weeks 2 to 3' : 'Week 2', what: 'Load your products and price tiers, your distributors and credit limits, and the opening stock count.' },
    { when: big ? 'Week 4' : 'Week 3', what: 'Train each role on its own screens: office, depots, finance, reps and distributors.' },
    { when: big ? 'Weeks 5 to 6' : 'Week 4', what: 'Go live, with us on WhatsApp beside your team for the first month end.' },
  ];
}

/* ------------------------------------------------------------- the store */

const PROPOSALS = 'proposals';

/** The owner sees every proposal; an AfterBI staff member (pass their uid) only their own. */
export async function listProposals(mineOnly?: string): Promise<ProposalInput[]> {
  const base = collection(db, PROPOSALS);
  const snap = await getDocs(mineOnly ? query(base, where('createdBy', '==', mineOnly), limit(200)) : query(base, limit(200)));
  return snap.docs
    .map((row) => ({ ...blankProposal(), ...(row.data() as Partial<ProposalInput>), id: row.id }))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export async function saveProposal(input: ProposalInput, createdBy?: string): Promise<ProposalInput> {
  const id = input.id || `p${Date.now().toString(36)}`;
  const row = { ...input, id, updatedAt: new Date().toISOString(), ...(input.createdBy || createdBy ? { createdBy: input.createdBy || createdBy } : {}) };
  await setDoc(doc(db, PROPOSALS, id), row);
  return row;
}

export async function deleteProposal(id: string): Promise<void> {
  await deleteDoc(doc(db, PROPOSALS, id));
}

/* ------------------------------------------------------------- the paper */

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function longDate(iso: string): string {
  const when = new Date(`${iso}T00:00:00`);
  return Number.isNaN(when.getTime())
    ? iso
    : when.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(iso: string, days: number): string {
  const when = new Date(`${iso}T00:00:00`);
  when.setDate(when.getDate() + days);
  return when.toISOString().slice(0, 10);
}

/** The number at the top of the document: AB-P-2026-1001 style, from the id. */
export function proposalNumber(input: ProposalInput): string {
  const tail = (input.id || 'draft').replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase();
  return `AB-P-${input.date.slice(0, 4)}-${tail}`;
}

export const PROPOSAL_CSS = `
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  @media screen { body { padding: 28px 32px; } }
  body { margin: 0; font: 10.5pt/1.55 Inter, -apple-system, 'Segoe UI', Arial, sans-serif; color: #14171c; }
  h1, h2, h3 { margin: 0; letter-spacing: -0.02em; }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 20pt; letter-spacing: -0.04em; }
  .brand img { width: 32px; height: 32px; object-fit: contain; }
  .signed { position: relative; }
  .sigimg { position: absolute; left: 0; bottom: 100%; height: 46px; width: auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #047857; padding-bottom: 10px; }
  .meta { text-align: right; font-size: 9pt; color: #5b6472; }
  .cover { margin: 26px 0 18px; }
  .eyebrow { font-size: 8.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #047857; }
  .cover h1 { font-size: 24pt; line-height: 1.1; margin-top: 6px; }
  .cover p { color: #414856; margin: 8px 0 0; }
  .facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
  .fact { background: #f4f6f8; border-radius: 8px; padding: 8px 10px; }
  .fact b { display: block; font-size: 13pt; }
  .fact small { color: #5b6472; font-size: 8.5pt; }
  section { margin-top: 20px; break-inside: avoid; }
  section h2 { font-size: 13.5pt; border-left: 4px solid #10b981; padding-left: 8px; margin-bottom: 8px; }
  .fit h3 { font-size: 11pt; margin: 10px 0 2px; }
  .fit p { margin: 0; color: #2b3240; }
  .mods { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .mod { border: 1px solid #dfe3e8; border-radius: 8px; padding: 8px 10px; break-inside: avoid; }
  .mod b { display: block; }
  .mod span { color: #5b6472; font-size: 9pt; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 7px 8px; border-bottom: 1px solid #e3e6ea; text-align: left; vertical-align: top; }
  th { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .08em; color: #5b6472; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  tr.total td { font-weight: 800; border-bottom: 2px solid #14171c; font-size: 11.5pt; }
  ul { margin: 4px 0 0; padding-left: 16px; }
  li { margin: 2px 0; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 12px; }
  .steps td:first-child { width: 90px; font-weight: 700; color: #047857; }
  .note { font-style: italic; color: #2b3240; border-left: 3px solid #dfe3e8; padding-left: 10px; margin-top: 10px; }
  .sign { margin-top: 64px; display: flex; justify-content: space-between; gap: 20px; }
  .sign div { flex: 1; border-top: 1px solid #14171c; padding-top: 6px; font-size: 9pt; color: #414856; }
  .foot { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e3e6ea; font-size: 8.5pt; color: #5b6472; display: flex; justify-content: space-between; }
`;

/** The finished proposal, as a complete HTML document ready for the print dialog. */
export function proposalHtml(input: ProposalInput, customRaw?: Partial<CustomBuild>): { title: string; html: string } {
  const f = figures(input);
  const value = input.edition === 'value';
  const custom = resolveCustom(customRaw);
  const withCustom = Boolean(input.includeCustom) && custom.enabled;
  const plan = planByName(input.plan);
  const chosen = MODULES.filter((m) => input.modules.includes(m.slug));
  const support = SUPPORT_LEVELS[input.support];
  const number = proposalNumber(input);
  const company = input.company || 'Your business';
  const title = `${BRAND} proposal for ${company}`;

  const priceRows = [
    `<tr><td>${esc(plan?.name ?? input.plan)} plan<br><small>${esc(plan?.forWho ?? '')}</small></td><td class="n">${naira(f.monthlyList)} / month</td></tr>`,
    input.discount > 0
      ? `<tr><td>Discount for ${esc(company)} (${input.discount}%)</td><td class="n">minus ${naira(f.monthlyList - f.monthlyAfterDiscount)} / month</td></tr>`
      : '',
    `<tr><td>${esc(support.name)}</td><td class="n">${f.support ? `${naira(f.support)} / month` : 'Included'}</td></tr>`,
    `<tr class="total"><td>Monthly fee</td><td class="n">${naira(f.monthlyTotal)}</td></tr>`,
    `<tr><td>Setup, data migration and training (once)</td><td class="n">${f.setupFee ? naira(f.setupFee) : 'Included'}</td></tr>`,
    value
      ? ''
      : `<tr><td>First year${input.annual ? ', paid annually (two months free)' : ''}</td><td class="n"><b>${naira(f.firstYear)}</b></td></tr>`,
  ].join('');

  const fit = `
    <section class="fit">
      <h2>${value ? `What changes for ${esc(company)}` : `Why AfterBI fits ${esc(company)}`}</h2>
      ${tailoredFit(input).map((s) => `<h3>${esc(s.heading)}</h3><p>${esc(s.body)}</p>`).join('')}
    </section>`;

  const investment = `
    <section>
      <h2>${withCustom ? 'Option 1: ' : ''}${value ? 'Your subscription' : 'Investment'}</h2>
      <table><tr><th>Item</th><th class="n">Amount</th></tr>${priceRows}</table>
      <p style="font-size:9pt;color:#5b6472;margin-top:6px">Prices in naira, billed monthly${input.annual ? ' or annually' : ''}. Distributor logins are never charged for. VAT applies where required.</p>
    </section>
    ${
      withCustom
        ? `<section>
      <h2>Option 2: ${esc(custom.name)}</h2>
      <div class="box"><p style="margin:0 0 4px">${esc(custom.tagline)}</p><ul>${custom.points.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <p style="margin:8px 0 0"><b>${esc(custom.priceLine)}.</b> We scope it with you, then quote a fixed price for the build and a monthly fee for hosting and support.</p></div>
    </section>`
        : ''
    }`;

  const body = `
    <div class="top">
      <div><div class="brand"><img src="${brandAsset('mark')}" alt="">AfterBI</div><div style="font-size:9pt;color:#5b6472">${esc(COMPANY.tagline)}</div></div>
      <div class="meta">Proposal ${esc(number)}<br>${esc(longDate(input.date))}<br>Valid until ${esc(longDate(addDays(input.date, input.validDays)))}</div>
    </div>

    <div class="cover">
      <div class="eyebrow">Prepared for ${esc(company)}</div>
      <h1>${value ? `Every carton, invoice and naira at ${esc(company)}, accounted for` : `Orders, stock, invoices, credit and sell-out for ${esc(company)}, in one place`}</h1>
      <p>For ${esc(input.contactName || 'your team')}${input.contactTitle ? `, ${esc(input.contactTitle)}` : ''}. ${value ? 'This proposal sets out what changes for your business with AfterBI, how we will support you, and how we get you live.' : 'This proposal sets out what AfterBI will do for your business, what it costs, and how we will support you.'}</p>
      ${input.note.trim() ? `<p class="note">${esc(input.note.trim())}</p>` : ''}
    </div>

    <div class="facts">
      <div class="fact"><b>${input.depots}</b><small>depots</small></div>
      <div class="fact"><b>${input.distributors}</b><small>distributors</small></div>
      <div class="fact"><b>${input.staff}</b><small>staff users</small></div>
      ${value ? `<div class="fact"><b>${chosen.length}</b><small>modules for you</small></div>` : `<div class="fact"><b>${naira(f.monthlyTotal)}</b><small>per month</small></div>`}
    </div>

    ${fit}

    <section>
      <h2>What you get</h2>
      <div class="mods">
        ${chosen.map((m) => `<div class="mod"><b>${esc(m.name)}</b><span>${esc(m.blurb)}</span></div>`).join('')}
        <div class="mod"><b>Daily brief and reminders</b><span>Every person sees what needs them first, worked out from your own records.</span></div>
        <div class="mod"><b>A portal for every role</b><span>Office, depots, finance, reps and distributors each see only what their job needs.</span></div>
      </div>
      ${plan ? `<p style="margin-top:8px;color:#414856">The ${esc(plan.name)} plan includes: ${plan.includes.filter((line) => !line.trim().endsWith(':')).map(esc).join('; ')}.</p>` : ''}
    </section>

    ${value ? '' : investment}

    <section>
      <h2>Support: how we look after you</h2>
      <div class="two">
        <div class="box"><b>${esc(support.name)}</b><ul>${support.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
        <div><b>Always included</b><ul>
          <li>Your data is yours: export it at any time</li>
          <li>Each organisation sealed from every other, enforced in the database</li>
          <li>Works on the phones your team already carries, on a weak connection</li>
          <li>Help for every screen, step by step, inside the app</li>
        </ul></div>
      </div>
    </section>

    <section>
      <h2>Getting you live</h2>
      <table class="steps">${timeline(input).map((s) => `<tr><td>${esc(s.when)}</td><td>${esc(s.what)}</td></tr>`).join('')}</table>
    </section>

    ${value ? investment : ''}

    <section>
      <h2>Next step</h2>
      <p>Sign below and return this proposal, or reply to ${esc(SUPPORT_EMAIL)}. We start setup within five working days of acceptance.</p>
      <div class="sign">
        <div class="signed"><img class="sigimg" src="${brandAsset('signature')}" alt="">For ${esc(COMPANY.name)} (AfterBI)<br><b>${esc(COMPANY.ceo)}</b>, ${esc(COMPANY.ceoTitle)}</div>
        <div>For ${esc(company)}<br>Name, title and date</div>
      </div>
    </section>

    <div class="foot"><span>${esc(COMPANY.footer)}${COMPANY.rc ? ` · ${esc(COMPANY.rc)}` : ''}</span><span>${esc(SUPPORT_EMAIL)} · ${esc(SALES_PHONE)} · ${esc(SITE_URL.replace(/^https?:\/\//, ''))}</span></div>
  `;

  return {
    title,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PROPOSAL_CSS}</style></head><body>${body}</body></html>`,
  };
}
