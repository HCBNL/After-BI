/**
 * Leads: businesses being followed up before they become customers.
 *
 * A lead is a name and a trail. The rep logs what happened (a visit, a call,
 * a message), anyone on the team can comment on an entry, and when the lead
 * is ready to buy the rep asks for it to be confirmed. A manager confirms it,
 * which opens a customer account it can order on, or declines with a reason.
 * A lead that has not become a customer within a year is due to be removed.
 *
 * No values and no pipeline stages: a lead carries no figures until it is a
 * customer, and from then on its figures live on the customer account.
 *
 * The trail is a subcollection, `leads/{id}/logs`, append only: entries are
 * never edited, so it stays a record of what was said and when.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { orgPath } from './tenant';
import { saveDistributor, setRepDistributors } from './db';
import type { Lead, LeadLog, LeadLogKind, LeadStatus, PriceTier } from '@/types';

/** The kinds a rep picks from when logging. */
export const LOG_KINDS: { kind: LeadLogKind; label: string }[] = [
  { kind: 'visit', label: 'Visit' },
  { kind: 'call', label: 'Call' },
  { kind: 'message', label: 'Message' },
  { kind: 'meeting', label: 'Meeting' },
  { kind: 'note', label: 'Note' },
];

export const LOG_LABEL: Record<LeadLogKind, string> = {
  visit: 'Visit',
  call: 'Call',
  message: 'Message',
  meeting: 'Meeting',
  note: 'Note',
  comment: 'Comment',
  request: 'Asked to confirm',
  confirmed: 'Confirmed as customer',
  declined: 'Not confirmed',
};

/** A lead not confirmed within this many days is due to be removed. */
export const LEAD_LIFETIME_DAYS = 365;
/** No trail entry for this long and a lead has gone quiet. */
export const QUIET_DAYS = 30;

const DAY = 86_400_000;

function iso(value: unknown): string | undefined {
  if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  return typeof value === 'string' ? value : undefined;
}

/**
 * A stored lead in today's shape. Leads saved before the three statuses had a
 * pipeline `stage`: a won one reads as confirmed, every other as a lead.
 */
function asLead(id: string, d: DocumentData): Lead {
  const status: LeadStatus =
    d.status === 'pending' || d.status === 'confirmed' || d.status === 'open'
      ? d.status
      : d.stage === 'won'
        ? 'confirmed'
        : 'open';
  return {
    id,
    company: String(d.company ?? ''),
    contactName: String(d.contactName ?? ''),
    email: d.email || undefined,
    phone: d.phone || undefined,
    location: d.location || undefined,
    status,
    ownerId: String(d.ownerId ?? ''),
    ownerName: String(d.ownerName ?? ''),
    note: d.note || undefined,
    createdAt: iso(d.createdAt) ?? '',
    updatedAt: iso(d.updatedAt),
    lastLogAt: iso(d.lastLogAt),
    logCount: typeof d.logCount === 'number' ? d.logCount : 0,
    requestedAt: iso(d.requestedAt),
    requestedByName: d.requestedByName || undefined,
    requestNote: d.requestNote || undefined,
    confirmedAt: iso(d.confirmedAt),
    confirmedByName: d.confirmedByName || undefined,
    customerId: d.customerId || undefined,
  };
}

const leadsCol = () => collection(db, orgPath('leads'));
const leadRef = (id: string) => doc(db, orgPath('leads'), id);
const logsCol = (leadId: string) => collection(db, `${orgPath('leads')}/${leadId}/logs`);

/* --------------------------------------------------------------- reading */

/** Everyone's leads, or one rep's. Most recent activity first. */
export async function listLeads(ownerId?: string | null): Promise<Lead[]> {
  const snap = await getDocs(ownerId ? query(leadsCol(), where('ownerId', '==', ownerId)) : query(leadsCol()));
  return snap.docs.map((d) => asLead(d.id, d.data())).sort((a, b) => lastTouch(b).localeCompare(lastTouch(a)));
}

/** A lead's trail, oldest first (comments sit under the entry they answer). */
export async function listLogs(leadId: string): Promise<LeadLog[]> {
  const snap = await getDocs(query(logsCol(leadId), orderBy('at', 'asc')));
  return snap.docs.map((d) => {
    const v = d.data({ serverTimestamps: 'estimate' });
    return {
      id: d.id,
      kind: v.kind as LeadLogKind,
      text: String(v.text ?? ''),
      by: String(v.by ?? ''),
      byName: String(v.byName ?? ''),
      at: iso(v.at) ?? '',
      replyTo: v.replyTo || undefined,
    };
  });
}

/* ------------------------------------------------------------ the figures */

/** When anything last happened on a lead. */
export function lastTouch(lead: Lead): string {
  return lead.lastLogAt ?? lead.updatedAt ?? lead.createdAt ?? '';
}

export function daysSince(when: string | undefined, now = Date.now()): number {
  if (!when) return 0;
  return Math.max(0, Math.floor((now - new Date(when).getTime()) / DAY));
}

/** Not a customer after a year: to be taken off. */
export function dueForRemoval(lead: Lead, now = Date.now()): boolean {
  return lead.status !== 'confirmed' && daysSince(lead.createdAt, now) >= LEAD_LIFETIME_DAYS;
}

/** Still a lead, and nothing logged for a month. */
export function goneQuiet(lead: Lead, now = Date.now()): boolean {
  return lead.status === 'open' && daysSince(lastTouch(lead), now) >= QUIET_DAYS;
}

export interface LeadFigures {
  total: number;
  open: number;
  pending: number;
  confirmed: number;
  quiet: number;
  due: number;
  /** Confirmed as a share of every lead, 0 to 1. */
  conversion: number;
  /** Leads with something logged in the last seven days. */
  activeThisWeek: number;
  /** Average days from added to confirmed, over the confirmed ones. */
  daysToConfirm: number | null;
}

export function leadFigures(leads: Lead[], now = Date.now()): LeadFigures {
  const confirmed = leads.filter((l) => l.status === 'confirmed');
  const timed = confirmed.filter((l) => l.confirmedAt && l.createdAt);
  return {
    total: leads.length,
    open: leads.filter((l) => l.status === 'open').length,
    pending: leads.filter((l) => l.status === 'pending').length,
    confirmed: confirmed.length,
    quiet: leads.filter((l) => goneQuiet(l, now)).length,
    due: leads.filter((l) => dueForRemoval(l, now)).length,
    conversion: leads.length ? confirmed.length / leads.length : 0,
    activeThisWeek: leads.filter((l) => l.lastLogAt && daysSince(l.lastLogAt, now) < 7).length,
    daysToConfirm: timed.length
      ? Math.round(timed.reduce((sum, l) => sum + daysSince(l.createdAt, new Date(l.confirmedAt!).getTime()), 0) / timed.length)
      : null,
  };
}

/* --------------------------------------------------------------- writing */

export interface Person {
  id: string;
  name: string;
}

type LeadDetails = Pick<Lead, 'company' | 'contactName' | 'email' | 'phone' | 'location' | 'note'>;

export async function createLead(details: LeadDetails, owner: Person): Promise<string> {
  const ref = await addDoc(leadsCol(), {
    ...clean(details),
    status: 'open',
    ownerId: owner.id,
    ownerName: owner.name,
    logCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLead(id: string, details: LeadDetails): Promise<void> {
  await updateDoc(leadRef(id), { ...clean(details), updatedAt: serverTimestamp() });
}

/** Blank optional fields are stored as absent, not as empty strings. */
function clean(details: LeadDetails): DocumentData {
  const out: DocumentData = { company: details.company.trim(), contactName: details.contactName.trim() };
  for (const key of ['email', 'phone', 'location', 'note'] as const) out[key] = details[key]?.trim() || null;
  return out;
}

/**
 * Adds an entry to the trail. The lead's "last activity" moves with it when
 * the writer may update the lead (its rep or a manager); a comment from anyone
 * else still lands on the trail.
 */
export async function addLog(
  lead: Lead,
  entry: { kind: LeadLogKind; text: string; replyTo?: string },
  by: Person,
): Promise<void> {
  await addDoc(logsCol(lead.id), {
    kind: entry.kind,
    text: entry.text.trim().slice(0, 2000),
    by: by.id,
    byName: by.name,
    at: serverTimestamp(),
    ...(entry.replyTo ? { replyTo: entry.replyTo } : {}),
  });
  await updateDoc(leadRef(lead.id), { lastLogAt: serverTimestamp(), logCount: increment(1) }).catch(() => {});
}

/** The rep asks for the lead to be confirmed as a customer. */
export async function requestConfirmation(lead: Lead, note: string, by: Person): Promise<void> {
  await updateDoc(leadRef(lead.id), {
    status: 'pending',
    requestedAt: serverTimestamp(),
    requestedByName: by.name,
    requestNote: note.trim().slice(0, 1000),
    updatedAt: serverTimestamp(),
  });
  await addLog(lead, { kind: 'request', text: note }, by);
}

/** The rep takes the request back. */
export async function withdrawRequest(lead: Lead, by: Person): Promise<void> {
  await updateDoc(leadRef(lead.id), { status: 'open', updatedAt: serverTimestamp() });
  await addLog(lead, { kind: 'note', text: 'Withdrew the request to confirm.' }, by);
}

/** A manager says not yet, with the reason; it goes back to being a lead. */
export async function declineLead(lead: Lead, reason: string, by: Person): Promise<void> {
  await updateDoc(leadRef(lead.id), { status: 'open', updatedAt: serverTimestamp() });
  await addLog(lead, { kind: 'declined', text: reason }, by);
}

/**
 * A manager confirms the lead: a customer account is opened with its details
 * (active, on the chosen price tier), the lead's rep is given that account if
 * they are a sales rep so they can take its orders, and the lead is marked
 * confirmed with a link to it. Returns the customer's id.
 */
export async function confirmLead(lead: Lead, tier: PriceTier, by: Person): Promise<string> {
  const customerId = await saveDistributor({
    company: lead.company,
    contactName: lead.contactName || lead.company,
    email: lead.email ?? '',
    ...(lead.phone ? { phone: lead.phone } : {}),
    ...(lead.location ? { location: lead.location } : {}),
    category: tier,
    status: 'active',
  });

  const owner = await getDoc(doc(db, 'users', lead.ownerId)).catch(() => null);
  const data = owner?.exists() ? owner.data() : null;
  if (data?.role === 'sales_rep') {
    const current: string[] = Array.isArray(data.distributorIds) ? data.distributorIds : [];
    await setRepDistributors(lead.ownerId, [...current, customerId]).catch(() => {});
  }

  await updateDoc(leadRef(lead.id), {
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
    confirmedByName: by.name,
    customerId,
    updatedAt: serverTimestamp(),
  });
  await addLog(lead, { kind: 'confirmed', text: `Customer account opened for ${lead.company}.` }, by);
  return customerId;
}

/** Takes a lead off, trail and all. Managers only. */
export async function removeLead(lead: Lead): Promise<void> {
  const logs = await getDocs(logsCol(lead.id));
  for (let i = 0; i < logs.docs.length; i += 450) {
    const batch = writeBatch(db);
    logs.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(leadRef(lead.id));
}
