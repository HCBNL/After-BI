/**
 * Cartons and pieces.
 *
 * Stock in AfterBI is kept in a product's unit (a carton, a crate). A count
 * on the floor finds full cartons AND loose pieces, so everything a count
 * adds up is done in PIECES, the one unit that never needs rounding, and only
 * turned back into "153 ctn · 3 pcs" to be shown. Loose pieces that make a
 * full carton or more roll into cartons.
 */

import { count } from './format';
import type { Product } from '@/types';

/**
 * Pieces in one unit: the number set on the product, else read from its pack
 * size ("144 pcs per CTN", "12 x 1L per crate", "24pcs/ctn"), else 1.
 */
export function piecesOf(product: Pick<Product, 'piecesPerUnit' | 'packSize'> | null | undefined): number {
  if (!product) return 1;
  const set = Number(product.piecesPerUnit);
  if (Number.isFinite(set) && set >= 1) return Math.round(set);
  return piecesFromPack(product.packSize) ?? 1;
}

/** The number of pieces a pack size describes, or null when it says none. */
export function piecesFromPack(pack?: string | null): number | null {
  const text = (pack ?? '').toLowerCase();
  if (!text) return null;
  const patterns = [
    /(\d{1,5})\s*(?:pcs|pc|pieces|piece|pkts|pkt|packs|pack|units|unit|bottles|btls|sachets|tins|cans|rolls|bags|nos|no\.)\b/,
    /(\d{1,5})\s*[x×]\s*\d/,
    /(\d{1,5})\s*(?:per|\/)\s*(?:ctn|carton|crate|box|case|bale)/,
    /(?:carton|ctn|crate|box|case|bale)\s+of\s+(\d{1,5})/,
  ];
  for (const re of patterns) {
    const hit = text.match(re);
    if (hit) {
      const n = Number(hit[1]);
      if (n >= 1) return n;
    }
  }
  return null;
}

/** "Per carton" → "cartons"; "Per unit" → "units". The word a count is written in. */
export function unitWord(unit?: string | null, plural = true): string {
  const word = (unit ?? '').toLowerCase().replace(/^per\s+/, '').trim() || 'carton';
  const base = /^(carton|ctn|cartons)$/.test(word) ? 'carton' : word.replace(/s$/, '');
  return plural ? `${base}s` : base;
}

/** "3 units", "1 unit": single items, AfterBI's one word for them. */
export function unitsWord(n: number): string {
  return `${count(n)} ${Math.abs(n) === 1 ? 'unit' : 'units'}`;
}

/**
 * AfterBI speaks of two things only: a UNIT (one single item, one packet) and
 * a CARTON (the box units come in). Whatever a product's unit was typed as
 * before ("carton of 12", "pcs", "Per piece", "crate"), this is what it means.
 */
export function normaliseUnit(raw?: string | null): 'Per unit' | 'Per carton' {
  const word = (raw ?? '').toLowerCase().replace(/^per\s+/, '').trim();
  return PIECE_UNIT.test(word) ? 'Per unit' : 'Per carton';
}

/** Whole units and the pieces left over, from a count of pieces (sign kept on both). */
export function split(pieces: number, perUnit: number): { units: number; pieces: number } {
  const per = Math.max(1, Math.round(perUnit) || 1);
  const total = Math.round(pieces);
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  return { units: sign * Math.floor(abs / per), pieces: sign * (abs % per) };
}

/**
 * "153 ctn · 3 pcs". A product with no pieces per carton shows units alone.
 * `signed` puts a + on a surplus (a shortage always carries its minus).
 */
export function packLabel(pieces: number, perUnit: number, unit?: string, signed = false): string {
  const per = Math.max(1, Math.round(perUnit) || 1);
  const total = Math.round(pieces);
  const sign = total < 0 ? '−' : signed && total > 0 ? '+' : '';
  const { units, pieces: loose } = split(Math.abs(total), per);
  const big = `${count(units)} ${unitWord(unit, units !== 1)}`;
  /* Zero parts are left out: "80 ctn", "7 pcs", "153 ctn · 3 pcs". */
  if (per === 1 || loose === 0) return `${sign}${big}`;
  if (units === 0) return `${sign}${unitsWord(loose)}`;
  return `${sign}${big} · ${unitsWord(loose)}`;
}

/** "22,035 pcs": the same figure in pieces alone. */
export function piecesLabel(pieces: number, signed = false): string {
  const total = Math.round(pieces);
  const sign = total < 0 ? '−' : signed && total > 0 ? '+' : '';
  return `${sign}${unitsWord(Math.abs(total))}`;
}

/** A stock balance (units, maybe with a fraction) in pieces. */
export function unitsToPieces(units: number, perUnit: number): number {
  return Math.round((Number(units) || 0) * Math.max(1, Math.round(perUnit) || 1));
}

/** Pieces back to units, kept to six places so a fraction never drifts. */
export function piecesToUnits(pieces: number, perUnit: number): number {
  const per = Math.max(1, Math.round(perUnit) || 1);
  return Math.round((pieces / per) * 1e6) / 1e6;
}

/** A balance as the Stock screen shows it: "150" or "150 · 12 pcs" when there are loose pieces. */
export function balanceLabel(units: number, perUnit: number): string {
  const per = Math.max(1, Math.round(perUnit) || 1);
  const pieces = unitsToPieces(units, per);
  const { units: whole, pieces: loose } = split(pieces, per);
  if (per === 1 || loose === 0) return count(Number.isInteger(units) ? units : whole);
  return `${count(whole)} ${whole === 1 ? 'carton' : 'cartons'} · ${unitsWord(Math.abs(loose))}`;
}

/** "Per carton" → "Cartons": a field label. */
export function unitTitle(unit?: string | null): string {
  const word = (unit ?? '').replace(/^per\s+/i, '').trim().toLowerCase() || 'carton';
  const plural = word.endsWith('s') ? word : `${word}s`;
  return plural[0].toUpperCase() + plural.slice(1);
}

/** "Per carton" → "carton": the singular, for "144 make one carton". */
export function unitSingular(unit?: string | null): string {
  return (unit ?? '').replace(/^per\s+/i, '').trim().toLowerCase() || 'carton';
}

/*
 * WHAT THE STOCK IS KEPT IN
 *
 * Two different questions, and the count must not mix them up:
 *
 *   how many pieces in a carton   `piecesOf()`: 144 for the mini fan
 *   what one unit of STOCK is     the product's Unit. "Per carton" means the
 *                                 balance (and every order) is in cartons;
 *                                 "Per unit" or "Per piece" means it is in
 *                                 pieces, and a carton is only how it arrives.
 *
 * A count is always taken in cartons and loose pieces, and compared in
 * pieces. So the system balance becomes pieces by `stockFactor()`: 144 for a
 * product kept in cartons of 144, but 1 for one kept in pieces.
 */
const PIECE_UNIT = /^(piece|pieces|pcs|pc|unit|units|each|ea|item|items|nos|no|single|singles|packet|packets|pack|packs|pkt|pkts|sachet|sachets|bottle|bottles|tin|tins|can|cans)$/;

/** True when the product's stock (and its orders) are counted in pieces, not cartons. */
export function stockInPieces(product: Pick<Product, 'unit'> | null | undefined): boolean {
  return PIECE_UNIT.test(unitSingular(product?.unit));
}

/** Pieces in one unit of STOCK: 1 when stock is kept in pieces, else pieces per carton. */
export function stockFactor(product: Pick<Product, 'unit' | 'piecesPerUnit' | 'packSize'> | null | undefined): number {
  return stockInPieces(product) ? 1 : piecesOf(product);
}

/**
 * The big unit a count is written in: a carton whenever the product has
 * pieces per carton and its own unit is a piece ("Per unit"); otherwise the
 * product's own unit ("Per crate", "Per bale").
 */
export function countUnit(product: Pick<Product, 'unit' | 'piecesPerUnit' | 'packSize'> | null | undefined): string {
  if (!product) return 'Per carton';
  if (piecesOf(product) > 1 && stockInPieces(product)) return 'Per carton';
  return product.unit || 'Per carton';
}
