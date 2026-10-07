/**
 * Two commercial offers beyond the three plans, as the public site and the
 * proposals describe them:
 *
 *   AfterBI Custom     a system built for one business, priced per project
 *   Partner Programme  a cash reward for every business a partner introduces
 *
 * Both start from the defaults below and are edited in Platform, Website,
 * stored on `site/home`, so the Pricing page, the Partners page and the
 * proposals never disagree. Free of Firebase, so public pages import it
 * cheaply.
 *
 * NOTHING IS INVENTED
 *
 * Testimonies start empty: they are real people's words, so they are only
 * ever what the owner types in, and a section with nothing in it is not drawn.
 */

import { naira } from './format';

/* ================================================================ Custom */

export interface CustomBuild {
  /** Off hides the card on the Pricing page and the option in proposals. */
  enabled: boolean;
  name: string;
  tagline: string;
  /** Short lines, shown as ticks. */
  points: string[];
  /** Where a price would be, e.g. "Priced per project". */
  priceLine: string;
}

export const DEFAULT_CUSTOM: CustomBuild = {
  enabled: true,
  name: 'AfterBI Custom',
  tagline: 'For manufacturers and groups that want their own system, built around how they distribute.',
  points: [
    'Your own software, under your own name and web address',
    'Built around your route to market, approval chain and reports',
    'We design, build, migrate your data and train your teams',
    'Ongoing support and changes as the business grows',
  ],
  priceLine: 'Priced per project',
};

export function resolveCustom(raw: Partial<CustomBuild> | undefined): CustomBuild {
  const points = (raw?.points ?? DEFAULT_CUSTOM.points).map((p) => p.trim()).filter(Boolean);
  return {
    enabled: raw?.enabled ?? DEFAULT_CUSTOM.enabled,
    name: raw?.name?.trim() || DEFAULT_CUSTOM.name,
    tagline: raw?.tagline?.trim() || DEFAULT_CUSTOM.tagline,
    points: points.length ? points : DEFAULT_CUSTOM.points,
    priceLine: raw?.priceLine?.trim() || DEFAULT_CUSTOM.priceLine,
  };
}

/* ================================================================ Partners */

export const PARTNER_DEFAULTS = {
  /** Naira, per business that subscribes and pays. */
  reward: 250_000,
  /** Working days from the business's first payment to the partner's. */
  payDays: 14,
} as const;

export interface PartnerPackage {
  id: string;
  name: string;
  /** Who it is for, one line. */
  audience: string;
  /** Two or three sentences. */
  blurb: string;
  /** What the partner gets, one line each. `{reward}` and `{payDays}` are filled in. */
  perks: string[];
  /** 16:9 picture. Empty draws a designed panel. */
  image?: string;
  featured?: boolean;
}

export interface PartnerTestimony {
  quote: string;
  name: string;
  role: string;
  photo?: string;
}

export interface PartnerSettings {
  reward?: number;
  payDays?: number;
  packages?: PartnerPackage[];
  testimonies?: PartnerTestimony[];
}

export const DEFAULT_PACKAGES: PartnerPackage[] = [
  {
    id: 'consultant',
    name: 'Sales and Distribution Consultant',
    audience: 'Consultants and trainers who advise FMCG companies',
    blurb:
      'You already help manufacturers fix their route to market. Introduce AfterBI to the businesses you advise and the improvement shows up in their numbers.',
    perks: ['{reward} for every business that subscribes', 'We run every demo ourselves', 'No cap on the number of businesses'],
    featured: true,
  },
  {
    id: 'association',
    name: 'Trade Association Leader',
    audience: 'Leaders of distributor and trade associations',
    blurb:
      'Bring a modern sales and distribution platform to your members, one introduction at a time or a whole chapter at once.',
    perks: ['{reward} for every business that subscribes', 'Demos arranged for your members', 'Paid within {payDays} working days'],
  },
  {
    id: 'finance',
    name: 'Accountant and Auditor',
    audience: 'Firms that keep or audit distributors’ books',
    blurb:
      'You see the ledgers that never reconcile. Recommend AfterBI and the stock, invoices and statements start agreeing with each other.',
    perks: ['{reward} for every business that subscribes', 'Setup, data loading and training handled by us', 'Paid by bank transfer in your name'],
  },
  {
    id: 'supplier',
    name: 'Logistics and Supplier',
    audience: 'Haulage, packaging and IT suppliers to the trade',
    blurb:
      'You are in the depots every week. Add AfterBI to the conversation and earn on every business that comes on board.',
    perks: ['{reward} for every business that subscribes', 'Nothing to install, sell or support', 'Paid within {payDays} working days'],
  },
];

export interface ResolvedPartners {
  reward: number;
  payDays: number;
  rewardText: string;
  packages: PartnerPackage[];
  testimonies: PartnerTestimony[];
}

export function resolvePartners(raw: PartnerSettings | undefined): ResolvedPartners {
  const reward = Number(raw?.reward) > 0 ? Math.round(Number(raw?.reward)) : PARTNER_DEFAULTS.reward;
  const payDays = Number(raw?.payDays) > 0 ? Math.round(Number(raw?.payDays)) : PARTNER_DEFAULTS.payDays;
  return {
    reward,
    payDays,
    rewardText: naira(reward),
    /* Never edited: the starting four. Saved empty on purpose: none. */
    packages: (raw?.packages ? raw.packages.filter((p) => p.name?.trim()) : DEFAULT_PACKAGES).slice(0, 6),
    testimonies: (raw?.testimonies ?? []).filter((t) => t.quote?.trim() && t.name?.trim()),
  };
}

export function fillPerk(text: string, p: { rewardText: string; payDays: number }): string {
  return text.replace(/\{reward\}/g, p.rewardText).replace(/\{payDays\}/g, String(p.payDays));
}
