/**
 * The import calculator: one unit, from the supplier's price to a naira
 * selling price, while you are still at the supplier's table.
 *
 *   supplier price (¥ or $) × exchange rate      = product in naira
 *   then each cost step, in order, on the running total:
 *     × a multiple   (freight and clearance ×2.5)
 *     + a percentage (delivery 10%)
 *     + a naira amount per unit (other expenses ₦100)
 *   = cost per unit landed in Nigeria
 *   + your profit (on cost, or as a margin of the price) = selling price
 *
 * Every step is linear in the supplier price, so the sum also runs backwards:
 * "to sell at ₦12,000, pay at most ¥X". That is the bargaining number.
 *
 * WHERE IT IS KEPT
 *
 *   Your rates, steps and profit are remembered on this device first (so it
 *   opens instantly and works on a weak connection abroad) and copied to
 *   `costing/{orgId}/quick/{uid}`, private to you and readable only by admins
 *   like the saved costings, so the same settings follow you to another phone.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { requireOrg } from './tenant';

export type StepKind = 'times' | 'percent' | 'amount';
export type QuickCurrency = 'CNY' | 'USD';

export interface QuickStep {
  id: string;
  label: string;
  kind: StepKind;
  value: number;
}

export interface SavedQuote {
  id: string;
  name: string;
  currency: QuickCurrency;
  price: number;
  rate: number;
  quantity: number;
  cost: number;
  sell: number;
  at: string;
}

export interface QuickSettings {
  currency: QuickCurrency;
  rates: Record<QuickCurrency, number>;
  steps: QuickStep[];
  profit: number;
  basis: 'markup' | 'margin';
  roundTo: number;
  /* the last thing being priced, so a reload loses nothing */
  name: string;
  price: number;
  quantity: number;
  target: number;
  quotes: SavedQuote[];
}

export const QUICK_SIGN: Record<QuickCurrency, string> = { CNY: '¥', USD: '$' };
export const QUICK_NAME: Record<QuickCurrency, string> = { CNY: 'RMB', USD: 'USD' };

export const stepId = () => Math.random().toString(36).slice(2, 10);

export function defaultQuick(): QuickSettings {
  return {
    currency: 'CNY',
    rates: { CNY: 220, USD: 1500 },
    steps: [
      { id: stepId(), label: 'Freight and clearance', kind: 'times', value: 2.5 },
      { id: stepId(), label: 'Delivery', kind: 'percent', value: 10 },
      { id: stepId(), label: 'Other expenses', kind: 'amount', value: 100 },
    ],
    profit: 50,
    basis: 'markup',
    roundTo: 10,
    name: '',
    price: 0,
    quantity: 0,
    target: 0,
    quotes: [],
  };
}

/* the sum */

export interface QuickRow {
  step: QuickStep;
  added: number;
  running: number;
}

export interface QuickResult {
  productNaira: number;
  rows: QuickRow[];
  cost: number;
  sell: number;
  profit: number;
  markup: number;
  margin: number;
  /** cost = price × factor + fixed: what makes the backwards sum possible. */
  factor: number;
  fixed: number;
}

const ceilTo = (value: number, step: number) => (step > 0 ? Math.ceil(value / step - 1e-9) * step : Math.round(value * 100) / 100);

export function sellFromCost(cost: number, profit: number, basis: QuickSettings['basis'], roundTo: number): number {
  if (!(cost > 0)) return 0;
  const p = Number(profit) || 0;
  if (basis === 'margin') return p >= 100 ? 0 : ceilTo(cost / (1 - p / 100), roundTo);
  return ceilTo(cost * (1 + p / 100), roundTo);
}

export function runQuick(s: Pick<QuickSettings, 'price' | 'rates' | 'currency' | 'steps' | 'profit' | 'basis' | 'roundTo'>): QuickResult {
  const rate = Number(s.rates[s.currency]) || 0;
  const productNaira = (Number(s.price) || 0) * rate;
  let running = productNaira;
  let factor = rate;
  let fixed = 0;
  const rows: QuickRow[] = [];
  for (const step of s.steps) {
    const v = Number(step.value) || 0;
    let added = 0;
    if (step.kind === 'times') {
      const m = v > 0 ? v : 1;
      added = running * (m - 1);
      factor *= m;
      fixed *= m;
    } else if (step.kind === 'percent') {
      added = (running * v) / 100;
      factor *= 1 + v / 100;
      fixed *= 1 + v / 100;
    } else {
      added = v;
      fixed += v;
    }
    running += added;
    rows.push({ step, added, running });
  }
  const cost = running;
  const sell = sellFromCost(cost, s.profit, s.basis, s.roundTo);
  const profit = sell - cost;
  return {
    productNaira,
    rows,
    cost,
    sell,
    profit,
    markup: cost > 0 ? (profit / cost) * 100 : 0,
    margin: sell > 0 ? (profit / sell) * 100 : 0,
    factor,
    fixed,
  };
}

/** The most you can pay the supplier per unit and still sell at `target` with your profit. */
export function maxSupplierPrice(result: QuickResult, target: number, s: Pick<QuickSettings, 'profit' | 'basis'>): number {
  if (!(target > 0) || !(result.factor > 0)) return 0;
  const p = Number(s.profit) || 0;
  const costAllowed = s.basis === 'margin' ? target * (1 - p / 100) : target / (1 + p / 100);
  return Math.max(0, (costAllowed - result.fixed) / result.factor);
}

/* keeping it */

const localKey = (uid: string) => `afterbi.quickcost.${uid}`;
const remote = (uid: string) => doc(db, `costing/${requireOrg()}/quick/${uid}`);

function merge(raw: unknown): QuickSettings {
  const base = defaultQuick();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<QuickSettings>;
  return {
    ...base,
    ...r,
    rates: { ...base.rates, ...(r.rates ?? {}) },
    steps: Array.isArray(r.steps) ? r.steps : base.steps,
    quotes: Array.isArray(r.quotes) ? r.quotes.slice(0, 60) : [],
  };
}

export function loadLocalQuick(uid: string): QuickSettings | null {
  try {
    const raw = localStorage.getItem(localKey(uid));
    return raw ? merge(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function loadRemoteQuick(uid: string): Promise<{ settings: QuickSettings; savedAt: string } | null> {
  try {
    const snap = await getDoc(remote(uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { settings: merge(data.settings), savedAt: String(data.savedAt ?? '') };
  } catch {
    return null;
  }
}

export function saveLocalQuick(uid: string, settings: QuickSettings): string {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(localKey(uid), JSON.stringify(settings));
    localStorage.setItem(`${localKey(uid)}.at`, savedAt);
  } catch {
    /* storage blocked: the copy online still keeps it */
  }
  return savedAt;
}

export function localSavedAt(uid: string): string {
  try {
    return localStorage.getItem(`${localKey(uid)}.at`) ?? '';
  } catch {
    return '';
  }
}

export async function saveRemoteQuick(uid: string, settings: QuickSettings, savedAt: string): Promise<void> {
  await setDoc(remote(uid), {
    settings: JSON.parse(JSON.stringify(settings)),
    savedAt,
    updatedAt: serverTimestamp(),
  });
}
