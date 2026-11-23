/**
 * Saved costings: landed cost sheets, one per shipment or product.
 *
 * WHERE THEY LIVE, AND WHY NOT UNDER orgs/{orgId}
 *
 *   `costing/{orgId}/sheets`. Everything under `orgs/{orgId}` is readable by
 *   every insider, and products are readable by distributors too. What a
 *   carton cost you to land is not for a customer or a depot clerk to read, so
 *   costings sit in their own subtree that only the super admin and admins can
 *   open (see firestore.rules).
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireOrg } from './tenant';
import { kobo, landedTotal, unitCost, type CostSheet } from './pricing';
import type { UserProfile } from '@/types';

const path = () => `costing/${requireOrg()}/sheets`;

function shape(id: string, data: DocumentData): CostSheet {
  const out: DocumentData = { id };
  for (const [key, value] of Object.entries(data)) {
    out[key] =
      value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function'
        ? (value as { toDate(): Date }).toDate().toISOString()
        : value;
  }
  return out as CostSheet;
}

/** Newest first. Bounded: a costing per shipment is dozens a year, not thousands. */
export async function listCostSheets(): Promise<CostSheet[]> {
  const snap = await getDocs(query(collection(db, path()), limit(500)));
  return snap.docs
    .map((d) => shape(d.id, d.data()))
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
}

/** Firestore refuses `undefined`; drop it rather than write nulls everywhere. */
function clean<T extends object>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function saveCostSheet(
  sheet: Omit<CostSheet, 'id'> & { id?: string },
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName'>,
): Promise<string> {
  const { id, createdAt: _c, updatedAt: _u, ...rest } = sheet;
  const data = clean({
    ...rest,
    name: rest.name.trim() || rest.productName || 'Untitled costing',
    quantity: Number(rest.quantity) || 0,
    landedTotal: kobo(landedTotal(rest)),
    unitCost: kobo(unitCost(rest)),
  });
  if (id) {
    await updateDoc(doc(db, path(), id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, path()), {
    ...data,
    createdBy: actor.id,
    createdByName: `${actor.firstName} ${actor.lastName}`.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteCostSheet(id: string): Promise<void> {
  await deleteDoc(doc(db, path(), id));
}

/**
 * The latest landed cost per unit for each product, from the newest saved
 * costing that names it. The order screen uses this to warn when a price is
 * adjusted below cost.
 */
export function latestUnitCosts(sheets: CostSheet[] | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const sheet of sheets ?? []) {
    if (sheet.productId && !out.has(sheet.productId) && (sheet.unitCost ?? 0) > 0) {
      out.set(sheet.productId, sheet.unitCost!);
    }
  }
  return out;
}
