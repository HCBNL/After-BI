/**
 * Prices: the discount on an order, who may give one, and the landed cost
 * sums behind the Costing screen.
 *
 * ADJUSTED PRICES, AND WHY THEY LEAVE A TRAIL
 *
 * Every order line carries two prices: `listPrice`, the tier price on the day,
 * and `unitPrice`, what is actually charged. When they differ the gap is a
 * discount, and it is never hidden: the approver sees it, the order shows it,
 * and the proforma and invoice print it as a line of its own ("Less: goodwill
 * discount"), so the customer sees what they were given. Only the roles chosen
 * in Settings may set a price; the super admin always may, a distributor never.
 */

import type { OrderLine, OrgSettings, PriceTier, Role } from '@/types';

/* discounts */

/** The list price of a line. Old lines have none, so their charged price is their list price. */
export function listPriceOf(line: Pick<OrderLine, 'listPrice' | 'unitPrice'>): number {
  return typeof line.listPrice === 'number' && line.listPrice > 0 ? line.listPrice : line.unitPrice;
}

/** Discount on one line, in naira. Never negative: a price above list is a price, not a discount. */
export function lineDiscount(line: Pick<OrderLine, 'listPrice' | 'unitPrice' | 'quantity'>): number {
  return Math.max(0, listPriceOf(line) - line.unitPrice) * line.quantity;
}

export interface PriceSummary {
  /** At list price. */
  gross: number;
  /** Given away. */
  discount: number;
  /** What is owed. */
  net: number;
}

export function summarise(lines: Pick<OrderLine, 'listPrice' | 'unitPrice' | 'quantity' | 'lineTotal'>[]): PriceSummary {
  const net = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discount = lines.reduce((sum, l) => sum + lineDiscount(l), 0);
  return { gross: net + discount, discount, net };
}

/** Roles an organisation can allow to adjust prices. The super admin always can. */
export const PRICE_EDIT_ROLES: Role[] = ['admin', 'finance_manager', 'operations_manager', 'staff', 'sales_rep'];

/** Settings never saved: administrators only. */
const DEFAULT_PRICE_EDITORS: Role[] = ['admin'];

export function mayAdjustPrice(role: Role | undefined, settings: Pick<OrgSettings, 'priceEditRoles'> | null | undefined): boolean {
  if (!role || role === 'distributor' || role === 'owner' || role === 'agent') return false;
  if (role === 'super_admin') return true;
  return (settings?.priceEditRoles ?? DEFAULT_PRICE_EDITORS).includes(role);
}

/** Two decimal places, the way money is stored. */
export function kobo(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/* landed cost */

export const CURRENCIES = ['NGN', 'USD', 'CNY', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SIGN: Record<Currency, string> = {
  NGN: '₦',
  USD: '$',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
};

export interface CostLine {
  id: string;
  /** Product cost, freight, clearance, delivery, or anything the user names. */
  label: string;
  amount: number;
  currency: Currency;
  /** `total`: for the whole shipment. `unit`: per unit, multiplied by the quantity. */
  per: 'total' | 'unit';
}

export interface MarginRow {
  id: string;
  percent: number;
  /** Which tier this price is meant for, so it can be written to the product. */
  tier?: PriceTier;
}

export interface CostSheet {
  id: string;
  name: string;
  productId?: string;
  productName?: string;
  unit?: string;
  /** How many units the costs below cover. */
  quantity: number;
  /** Naira for one unit of each foreign currency used. */
  rates: Partial<Record<Currency, number>>;
  costs: CostLine[];
  margins: MarginRow[];
  /** `markup`: percent added on cost. `margin`: percent of the selling price that is profit. */
  basis: 'markup' | 'margin';
  /** Round each selling price up to the nearest this many naira. 0: no rounding. */
  roundTo: number;
  note?: string;
  /** Stored on save so lists and the order screen need no sums: total and per unit, in naira. */
  landedTotal?: number;
  unitCost?: number;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

let seq = 0;
export const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export function blankSheet(product?: { id: string; name: string; unit: string }): Omit<CostSheet, 'id'> & { id?: string } {
  return {
    name: product ? product.name : '',
    productId: product?.id,
    productName: product?.name,
    unit: product?.unit,
    quantity: 0,
    rates: {},
    costs: [
      { id: newId(), label: 'Product cost (supplier invoice)', amount: 0, currency: 'NGN', per: 'total' },
      { id: newId(), label: 'Freight', amount: 0, currency: 'NGN', per: 'total' },
      { id: newId(), label: 'Clearance (duty and agent)', amount: 0, currency: 'NGN', per: 'total' },
      { id: newId(), label: 'Delivery to warehouse', amount: 0, currency: 'NGN', per: 'total' },
      { id: newId(), label: 'Other expenses', amount: 0, currency: 'NGN', per: 'total' },
    ],
    margins: [
      { id: newId(), percent: 20 },
      { id: newId(), percent: 50 },
    ],
    basis: 'markup',
    roundTo: 0,
  };
}

/** One cost line in naira, for the whole quantity. */
export function costInNaira(line: CostLine, sheet: Pick<CostSheet, 'rates' | 'quantity'>): number {
  const rate = line.currency === 'NGN' ? 1 : (sheet.rates[line.currency] ?? 0);
  const amount = (Number(line.amount) || 0) * rate;
  return line.per === 'unit' ? amount * (Number(sheet.quantity) || 0) : amount;
}

export function landedTotal(sheet: Pick<CostSheet, 'costs' | 'rates' | 'quantity'>): number {
  return sheet.costs.reduce((sum, line) => sum + costInNaira(line, sheet), 0);
}

/** Landed cost of one unit. Zero until there is a quantity. */
export function unitCost(sheet: Pick<CostSheet, 'costs' | 'rates' | 'quantity'>): number {
  const quantity = Number(sheet.quantity) || 0;
  return quantity > 0 ? landedTotal(sheet) / quantity : 0;
}

/** Foreign currencies the sheet uses, so the screen asks for exactly those rates. */
export function currenciesUsed(sheet: Pick<CostSheet, 'costs'>): Currency[] {
  return CURRENCIES.filter((c) => c !== 'NGN' && sheet.costs.some((line) => line.currency === c));
}

function roundUp(value: number, to: number): number {
  return to > 0 ? Math.ceil(value / to) * to : kobo(value);
}

/**
 * The selling price for one unit at a given percent.
 *
 * Markup 50% on ₦1,000 is ₦1,500. Margin 50% is ₦2,000: half the selling
 * price is profit. A margin of 100% or more has no price, so it returns 0.
 */
export function sellingPrice(cost: number, percent: number, basis: CostSheet['basis'], roundTo = 0): number {
  if (!(cost > 0)) return 0;
  const p = Number(percent) || 0;
  if (basis === 'margin') {
    if (p >= 100) return 0;
    return roundUp(cost / (1 - p / 100), roundTo);
  }
  return roundUp(cost * (1 + p / 100), roundTo);
}

/** What a price actually earns over cost, both ways, for the existing tier prices. */
export function earns(cost: number, price: number): { markup: number; margin: number; profit: number } {
  if (!(cost > 0) || !(price > 0)) return { markup: 0, margin: 0, profit: 0 };
  return {
    profit: price - cost,
    markup: ((price - cost) / cost) * 100,
    margin: ((price - cost) / price) * 100,
  };
}
