/**
 * A stock count against what the system said: the variance.
 *
 * Everything is added up in pieces (lib/packs.ts), then shown as cartons and
 * pieces. A line is one product in the depot:
 *
 *   matched        counted exactly what the system held
 *   short          counted less (red)
 *   over           counted more (red)
 *   not counted    the system holds some, nobody counted it (red)
 *   not in system  counted, but the system holds none at this depot (red)
 *
 * A product the system holds none of and nobody counted is not a line at all.
 */

import type { CountEntry, StockCount, StockCountSummary } from '@/types';
import { unitsToPieces } from './packs';

export type LineState = 'matched' | 'short' | 'over' | 'notCounted' | 'notInSystem';

export const LINE_LABEL: Record<LineState, string> = {
  matched: 'Matched',
  short: 'Short',
  over: 'Over',
  notCounted: 'Not counted',
  notInSystem: 'Not in system',
};

export interface VarianceLine {
  productId: string;
  productName: string;
  unit: string;
  piecesPerUnit: number;
  /** What the system held when the count began, in pieces. */
  systemPieces: number;
  /** What was counted, in pieces. */
  countedPieces: number;
  /** Counted minus system, in pieces: negative is short. */
  variancePieces: number;
  /** Rows (places) it was counted in. */
  places: number;
  state: LineState;
}

/** Cartons and pieces of one entry, in pieces. */
export function entryPieces(e: Pick<CountEntry, 'lines' | 'perLine' | 'extra' | 'loose' | 'piecesPerUnit'>): number {
  const per = Math.max(1, Math.round(e.piecesPerUnit) || 1);
  const cartons = (Number(e.lines) || 0) * (Number(e.perLine) || 0) + (Number(e.extra) || 0);
  return cartons * per + (Number(e.loose) || 0);
}

/** Counted pieces per product, void entries left out. */
export function countedByProduct(entries: CountEntry[]): Map<string, { pieces: number; places: number; name: string; per: number }> {
  const out = new Map<string, { pieces: number; places: number; name: string; per: number }>();
  for (const e of entries) {
    if (e.void) continue;
    const row = out.get(e.productId) ?? { pieces: 0, places: 0, name: e.productName, per: e.piecesPerUnit || 1 };
    row.pieces += entryPieces(e);
    row.places += 1;
    out.set(e.productId, row);
  }
  return out;
}

export function varianceLines(
  count: Pick<StockCount, 'snapshot'>,
  entries: CountEntry[],
  /** Current products, for the unit and name of one counted but not in the snapshot. */
  products?: Map<string, { name: string; unit: string }>,
): VarianceLine[] {
  const counted = countedByProduct(entries);
  const ids = new Set([...Object.keys(count.snapshot ?? {}), ...counted.keys()]);
  const lines: VarianceLine[] = [];
  for (const id of ids) {
    const snap = count.snapshot?.[id];
    const got = counted.get(id);
    const per = Math.max(1, snap?.piecesPerUnit ?? got?.per ?? 1);
    const systemPieces = snap ? unitsToPieces(snap.quantity, per) : 0;
    const countedPieces = got?.pieces ?? 0;
    if (!got && systemPieces === 0) continue;
    const variancePieces = countedPieces - systemPieces;
    const state: LineState = !got
      ? 'notCounted'
      : !snap || systemPieces === 0
        ? variancePieces === 0
          ? 'matched'
          : 'notInSystem'
        : variancePieces === 0
          ? 'matched'
          : variancePieces < 0
            ? 'short'
            : 'over';
    lines.push({
      productId: id,
      productName: snap?.productName ?? got?.name ?? products?.get(id)?.name ?? 'Unknown product',
      unit: snap?.unit ?? products?.get(id)?.unit ?? 'Per carton',
      piecesPerUnit: per,
      systemPieces,
      countedPieces,
      variancePieces,
      places: got?.places ?? 0,
      state,
    });
  }
  /* Problems first, worst first; then the matched lines by name. */
  const rank: Record<LineState, number> = { notCounted: 0, short: 1, notInSystem: 2, over: 3, matched: 4 };
  return lines.sort(
    (a, b) =>
      rank[a.state] - rank[b.state] ||
      Math.abs(b.variancePieces / b.piecesPerUnit) - Math.abs(a.variancePieces / a.piecesPerUnit) ||
      a.productName.localeCompare(b.productName),
  );
}

export function summarise(lines: VarianceLine[]): StockCountSummary {
  return {
    lines: lines.length,
    matched: lines.filter((l) => l.state === 'matched').length,
    short: lines.filter((l) => l.state === 'short').length,
    over: lines.filter((l) => l.state === 'over').length,
    notCounted: lines.filter((l) => l.state === 'notCounted').length,
    notInSystem: lines.filter((l) => l.state === 'notInSystem').length,
  };
}

export const isIssue = (line: Pick<VarianceLine, 'state'>) => line.state !== 'matched';
