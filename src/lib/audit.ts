/**
 * The audit log: who made each major decision, when, and what it was.
 *
 * MAJOR DECISIONS ONLY
 *
 * Not every click. A line is written when money or standing changes by
 * somebody's decision: a payment corrected or reversed, an invoice edited or
 * voided, a credit note issued, an order approved, rejected or cancelled, a
 * return decided, a credit limit or role changed, a product added, repriced or
 * retired, the approval settings changed, leave decided, a lead confirmed as a
 * customer. Each names the person and their role, so an approval made by
 * whoever the settings allow (not only a super admin) shows who it was.
 *
 * LIGHT BY DESIGN
 *
 * One small document per decision, written after the decision has landed and
 * never in its way: if writing the line fails, the decision still stands and
 * nobody is shown an error. Read fifty at a time, newest first.
 *
 * WHERE IT LIVES, AND WHY THERE
 *
 * `audit/{org}/log`, outside the organisation's own tree on purpose: every
 * member of staff can read inside that tree (one broad rule), and the log is
 * for super admins and admins only. Append only: no line is ever edited or
 * deleted, by anyone.
 */
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { getActiveOrg } from './tenant';
import type { Role, UserProfile } from '@/types';

export type AuditArea = 'finance' | 'sales' | 'catalogue' | 'stock' | 'people' | 'settings';

export const AUDIT_AREA_LABEL: Record<AuditArea, string> = {
  finance: 'Finance',
  sales: 'Sales and approvals',
  catalogue: 'Products',
  stock: 'Stock counts and adjustments',
  people: 'People',
  settings: 'Settings',
};

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  byName: string;
  /** The person's employee code: what identifies them, whatever their name says. */
  byCode?: string;
  role: Role | '';
  area: AuditArea;
  /** A stable name for what happened: `payment.corrected`, `order.approved`. */
  action: string;
  /** One sentence a person can read: what, to what, for whom. */
  summary: string;
  /** The document it was about, as people know it: an invoice or order number. */
  ref?: string;
  /** The money involved, when there was any. */
  amount?: number;
  /** Why, when the person gave a reason. */
  reason?: string;
}

/* Who is signed in, set by AuthContext, so no caller has to pass it. */
let actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role' | 'employeeCode'> | null = null;
export function setAuditActor(user: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role' | 'employeeCode'> | null): void {
  actor = user;
}

const logCol = (org: string) => collection(db, 'audit', org, 'log');

/** Writes one line. Never throws and never waits on the caller: the decision has already been made. */
export function logAudit(entry: {
  area: AuditArea;
  action: string;
  summary: string;
  ref?: string;
  amount?: number;
  reason?: string;
}): void {
  const org = getActiveOrg();
  if (!org || !actor) return;
  void addDoc(logCol(org), {
    at: serverTimestamp(),
    by: actor.id,
    byName: `${actor.firstName} ${actor.lastName}`.trim().slice(0, 120),
    byCode: actor.employeeCode ?? null,
    role: actor.role ?? '',
    area: entry.area,
    action: entry.action.slice(0, 60),
    summary: entry.summary.slice(0, 400),
    ref: entry.ref?.slice(0, 80) ?? null,
    amount: typeof entry.amount === 'number' && Number.isFinite(entry.amount) ? entry.amount : null,
    reason: entry.reason?.trim().slice(0, 500) || null,
  }).catch(() => {
    /* The log must never stand in the way of the work. */
  });
}

export interface AuditPage {
  entries: AuditEntry[];
  /** Pass back to get the next fifty; null when there are no more. */
  next: QueryDocumentSnapshot | null;
}

export const AUDIT_PAGE = 50;

/** Newest first, fifty at a time, optionally one area. */
export async function listAudit(area?: AuditArea, after?: QueryDocumentSnapshot | null): Promise<AuditPage> {
  const org = getActiveOrg();
  if (!org) return { entries: [], next: null };
  const snap = await getDocs(
    query(
      logCol(org),
      ...(area ? [where('area', '==', area)] : []),
      orderBy('at', 'desc'),
      ...(after ? [startAfter(after)] : []),
      limit(AUDIT_PAGE),
    ),
  );
  const entries = snap.docs.map((d) => {
    const v = d.data({ serverTimestamps: 'estimate' });
    return {
      id: d.id,
      at: v.at?.toDate?.().toISOString() ?? '',
      by: String(v.by ?? ''),
      byName: String(v.byName ?? ''),
      byCode: v.byCode ? String(v.byCode) : undefined,
      role: (v.role ?? '') as Role | '',
      area: v.area as AuditArea,
      action: String(v.action ?? ''),
      summary: String(v.summary ?? ''),
      ref: v.ref || undefined,
      amount: typeof v.amount === 'number' ? v.amount : undefined,
      reason: v.reason || undefined,
    };
  });
  return { entries, next: snap.docs.length === AUDIT_PAGE ? snap.docs[snap.docs.length - 1] : null };
}
