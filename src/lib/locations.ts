/**
 * Where stock sits in a depot: Section 1, Row C.
 *
 * A depot floor is divided into numbered sections, and each section into
 * lettered rows (racks, pallet lanes), the way a professional warehouse is
 * marked out. A counter picks the section, then the row, from two lists; a
 * person sent to find stock walks to the section, then the row.
 *
 * The layout is set per depot on the Depots screen. Until it is, a depot has
 * five sections of rows A to Z.
 */

import type { Warehouse } from '@/types';

export const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const DEFAULT_SECTIONS = 5;
export const MAX_SECTIONS = 99;

/** The depot's sections, each as its last row letter. */
export function sectionsOf(warehouse: Pick<Warehouse, 'sections'> | null | undefined): string[] {
  const set = (warehouse?.sections ?? []).filter((l) => ROW_LETTERS.includes(l));
  return set.length ? set.slice(0, MAX_SECTIONS) : Array.from({ length: DEFAULT_SECTIONS }, () => 'Z');
}

/** Rows A to `last`. */
export function rowsTo(last: string): string[] {
  const end = ROW_LETTERS.indexOf(last);
  return ROW_LETTERS.slice(0, end < 0 ? ROW_LETTERS.length : end + 1);
}

/** "Section 2, Row C": how it is stored on a count and printed. */
export function locationLabel(section: number, row: string): string {
  return `Section ${section}, Row ${row}`;
}

/** Back from "Section 2, Row C"; null for anything else (older free text). */
export function parseLocation(label: string | null | undefined): { section: number; row: string } | null {
  const hit = /^Section (\d{1,2}), Row ([A-Z])$/.exec((label ?? '').trim());
  return hit ? { section: Number(hit[1]), row: hit[2] } : null;
}
