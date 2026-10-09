/**
 * HR for every organisation: salaries, resumption dates, holidays, clock in and
 * clock out, reissue requests, bonuses and deductions, and running costs.
 * (The concept is GetSchool's HR, made per organisation.)
 *
 * WHERE IT LIVES, AND WHY NOT UNDER orgs/{orgId}
 *
 *   `hr/{orgId}/…`. Everything under `orgs/{orgId}` is readable by every
 *   insider (staff, warehouse, operations), and a colleague's salary is not
 *   company data for everyone to read. So HR sits in its own subtree with its
 *   own rules: HR managers (super admin, admin, finance manager) see it all;
 *   everyone else sees only their own salary, days and bonuses.
 *
 * Clock times are SERVER timestamps and the rules check that a clock in is for
 * today (Lagos time), so nobody can clock in for yesterday or from a phone with
 * the wrong date. Only HR can mark a day by hand.
 *
 * Bounded reads: one pay period of attendance at a time, lists capped.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireOrg } from './tenant';
import { DEFAULT_CYCLE_START, DEFAULT_PAY_DAY, dayNumber, dayString, type PayRules } from './payroll';
import type { Role, UserProfile } from '@/types';

/** Who runs HR inside an organisation. */
export const HR_MANAGERS: Role[] = ['super_admin', 'admin', 'finance_manager'];

/** Who is on the payroll: everyone in the organisation except distributors (they are customers). */
export const HR_PEOPLE: Role[] = ['super_admin', 'admin', 'staff', 'sales_rep', 'warehouse_manager', 'finance_manager', 'operations_manager'];

export function onPayroll(person: Pick<UserProfile, 'role'>): boolean {
  return HR_PEOPLE.includes(person.role);
}

const C = {
  staff: 'hrStaff',
  holidays: 'hrHolidays',
  attendance: 'hrAttendance',
  settings: 'hrSettings',
  reissues: 'hrReissues',
  adjustments: 'hrAdjustments',
  costs: 'hrCosts',
} as const;

/** `hr/{activeOrg}/{collection}`. */
const path = (key: keyof typeof C) => `hr/${requireOrg()}/${C[key]}`;

/* shapes */

export type HrSettings = Omit<PayRules, 'holidays'>;

export const DEFAULT_SETTINGS: HrSettings = {
  payDay: DEFAULT_PAY_DAY,
  cycleStart: DEFAULT_CYCLE_START,
  overrides: {},
  autoUntil: '',
  saturday: false,
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export interface HrStaff {
  /** = the user's uid. */
  id: string;
  name: string;
  /** Monthly, in naira. */
  salary: number;
  /** yyyy-mm-dd */
  resumption: string;
  active: boolean;
  /** No clock in needed: every working day from resumption counts as present. */
  autoPresent?: boolean;
  /** Job title, for the payslip. */
  position?: string;
  updatedAt: string;
}

export interface Holiday {
  /** = the date, yyyy-mm-dd. */
  id: string;
  name: string;
}

export interface Attendance {
  id: string;
  uid: string;
  name: string;
  day: number;
  date: string;
  inAt?: Date;
  outAt?: Date;
  manual: boolean;
  edited: boolean;
  reissue: boolean;
  absent: boolean;
}

export interface Reissue {
  id: string;
  uid: string;
  name: string;
  day: number;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  decidedAt?: string;
}

/** A bonus, commission or deduction for one person in one pay month. */
export interface Adjustment {
  id: string;
  uid: string;
  name: string;
  /** The pay period key, 'yyyy-mm'. */
  month: string;
  kind: 'bonus' | 'deduction';
  amount: number;
  note: string;
  createdAt: string;
}

export const COST_CATEGORIES = ['Rent', 'Fuel and diesel', 'Electricity', 'Internet and phone', 'Vehicles and logistics', 'Repairs', 'Office supplies', 'Marketing', 'Bank charges', 'Tax and levies', 'Other'] as const;

/** A running cost: every month, or once in a given month. */
export interface Cost {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: 'monthly' | 'once';
  /** For a one off cost: the pay period key it falls in. For a monthly cost: the first month it applies. */
  month: string;
  /** Monthly costs only: the last month it applies ('' = still running). */
  until?: string;
  createdAt: string;
}

const toDate = (t: unknown) => (t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : undefined);

function asAttendance(id: string, data: Record<string, unknown>): Attendance {
  const day = Number(data.day);
  return {
    id,
    uid: String(data.uid ?? ''),
    name: String(data.name ?? ''),
    day,
    date: dayString(day),
    inAt: toDate(data.inAt),
    outAt: toDate(data.outAt),
    manual: Boolean(data.manual),
    edited: Boolean(data.edited),
    reissue: Boolean(data.reissue),
    absent: Boolean(data.absent),
  };
}

export const attendanceId = (uid: string, date: string) => `${uid}_${dayNumber(date)}`;

/* settings */

export async function getHrSettings(): Promise<HrSettings> {
  const snap = await getDoc(doc(db, path('settings'), 'pay'));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  const data = snap.data();
  const payDay = Number(data.payDay);
  const cycleStart = Number(data.cycleStart);
  const overrides: Record<string, string> = {};
  for (const [k, v] of Object.entries((data.overrides ?? {}) as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}$/.test(k) && typeof v === 'string' && ISO.test(v)) overrides[k] = v;
  }
  return {
    payDay: payDay >= 1 && payDay <= 31 ? payDay : DEFAULT_PAY_DAY,
    cycleStart: cycleStart >= 1 && cycleStart <= 28 ? cycleStart : DEFAULT_CYCLE_START,
    overrides,
    autoUntil: typeof data.autoUntil === 'string' && (data.autoUntil === '' || ISO.test(data.autoUntil)) ? data.autoUntil : '',
    saturday: data.saturday === true,
  };
}

export async function saveHrSettings(s: HrSettings): Promise<void> {
  await setDoc(doc(db, path('settings'), 'pay'), {
    payDay: Math.round(s.payDay),
    cycleStart: Math.round(s.cycleStart),
    overrides: s.overrides,
    autoUntil: s.autoUntil,
    saturday: s.saturday,
  });
}

/* staff */

export async function listHrStaff(): Promise<HrStaff[]> {
  const snap = await getDocs(query(collection(db, path('staff')), limit(500)));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<HrStaff, 'id'>), id: d.id }));
}

export async function getMyHr(uid: string): Promise<HrStaff | null> {
  const snap = await getDoc(doc(db, path('staff'), uid));
  return snap.exists() ? { ...(snap.data() as Omit<HrStaff, 'id'>), id: snap.id } : null;
}

export async function saveHrStaff(s: Omit<HrStaff, 'updatedAt'>): Promise<void> {
  await setDoc(doc(db, path('staff'), s.id), {
    name: s.name.slice(0, 100),
    salary: Math.max(0, Math.round(s.salary)),
    resumption: s.resumption,
    active: s.active,
    autoPresent: Boolean(s.autoPresent),
    position: (s.position ?? '').slice(0, 60),
    updatedAt: new Date().toISOString(),
  });
}

/* holidays */

export async function listHolidays(): Promise<Holiday[]> {
  const snap = await getDocs(query(collection(db, path('holidays')), limit(300)));
  return snap.docs.map((d) => ({ id: d.id, name: String(d.data().name ?? '') })).sort((a, b) => b.id.localeCompare(a.id));
}

export async function addHoliday(date: string, name: string): Promise<void> {
  await setDoc(doc(db, path('holidays'), date), { date, name: name.trim().slice(0, 60) || 'Holiday' });
}

export async function removeHoliday(date: string): Promise<void> {
  await deleteDoc(doc(db, path('holidays'), date));
}

/* attendance */

/** One person's (or, for HR, everyone's) days in a date range. */
export async function listAttendance(uid: string | null, from: string, to: string): Promise<Attendance[]> {
  const parts = [
    ...(uid ? [where('uid', '==', uid)] : []),
    where('day', '>=', dayNumber(from)),
    where('day', '<=', dayNumber(to)),
    limit(uid ? 40 : 5000),
  ];
  const snap = await getDocs(query(collection(db, path('attendance')), ...parts));
  return snap.docs.map((d) => asAttendance(d.id, d.data()));
}

export async function getAttendance(uid: string, date: string): Promise<Attendance | null> {
  const snap = await getDoc(doc(db, path('attendance'), attendanceId(uid, date)));
  return snap.exists() ? asAttendance(snap.id, snap.data()) : null;
}

/** Today, stamped by the server. The rules refuse any other day. */
export async function clockIn(uid: string, name: string, today: string): Promise<void> {
  await setDoc(doc(db, path('attendance'), attendanceId(uid, today)), {
    uid,
    name: name.slice(0, 100),
    day: dayNumber(today),
    inAt: serverTimestamp(),
    manual: false,
  });
}

export async function clockOut(uid: string, today: string): Promise<void> {
  await updateDoc(doc(db, path('attendance'), attendanceId(uid, today)), { outAt: serverTimestamp() });
}

/** HR only: mark a day present, or absent (a record of its own that beats a clock in). */
export async function setPresent(uid: string, name: string, date: string, present: boolean): Promise<void> {
  await setDoc(
    doc(db, path('attendance'), attendanceId(uid, date)),
    present
      ? { uid, name: name.slice(0, 100), day: dayNumber(date), manual: true }
      : { uid, name: name.slice(0, 100), day: dayNumber(date), manual: true, absent: true },
  );
}

export function splitAttendance(list: Attendance[]): { attended: Set<string>; absent: Set<string>; reissued: Set<string> } {
  return {
    attended: new Set(list.filter((a) => !a.absent).map((a) => a.date)),
    absent: new Set(list.filter((a) => a.absent).map((a) => a.date)),
    reissued: new Set(list.filter((a) => a.reissue && !a.absent).map((a) => a.date)),
  };
}

/** HR only: set or correct a day's clock in and clock out times ('08:30'). */
export async function setTimes(uid: string, name: string, date: string, inTime: string, outTime: string): Promise<void> {
  const at = (t: string) => {
    if (!/^\d{2}:\d{2}$/.test(t)) return undefined;
    const [h, m] = t.split(':').map(Number);
    const [y, mo, d] = date.split('-').map(Number);
    return new Date(y, mo - 1, d, h, m, 0);
  };
  const inAt = at(inTime);
  const outAt = at(outTime);
  if (!inAt) throw new Error('Type the clock in time.');
  if (outAt && outAt <= inAt) throw new Error('Clock out must be after clock in.');
  await setDoc(doc(db, path('attendance'), attendanceId(uid, date)), {
    uid,
    name: name.slice(0, 100),
    day: dayNumber(date),
    inAt,
    ...(outAt ? { outAt } : {}),
    manual: false,
    edited: true,
  });
}

/** HR only: mark several people present on one day (skips anyone already in). */
export async function markAllPresent(people: { uid: string; name: string }[], date: string, already: Set<string>): Promise<number> {
  const todo = people.filter((p) => !already.has(p.uid));
  await Promise.all(todo.map((p) => setPresent(p.uid, p.name, date, true)));
  return todo.length;
}

/* reissues */

function asReissue(id: string, data: Record<string, unknown>): Reissue {
  const day = Number(data.day);
  return {
    id,
    uid: String(data.uid ?? ''),
    name: String(data.name ?? ''),
    day,
    date: dayString(day),
    reason: String(data.reason ?? ''),
    status: (data.status as Reissue['status']) ?? 'pending',
    createdAt: String(data.createdAt ?? ''),
    decidedAt: data.decidedAt ? String(data.decidedAt) : undefined,
  };
}

/** Staff: ask for a missed day to be counted. Asking again after a decline replaces the old request. */
export async function requestReissue(uid: string, name: string, date: string, reason: string): Promise<void> {
  await setDoc(doc(db, path('reissues'), attendanceId(uid, date)), {
    uid,
    name: name.slice(0, 100),
    day: dayNumber(date),
    reason: reason.trim().slice(0, 300),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

export async function listMyReissues(uid: string, from: string, to: string): Promise<Reissue[]> {
  const snap = await getDocs(
    query(collection(db, path('reissues')), where('uid', '==', uid), where('day', '>=', dayNumber(from)), where('day', '<=', dayNumber(to)), limit(60)),
  );
  return snap.docs.map((d) => asReissue(d.id, d.data()));
}

export async function listPendingReissues(): Promise<Reissue[]> {
  const snap = await getDocs(query(collection(db, path('reissues')), where('status', '==', 'pending'), limit(300)));
  return snap.docs.map((d) => asReissue(d.id, d.data())).sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));
}

export async function decideReissue(r: Reissue, approve: boolean): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, path('reissues'), r.id), { status: approve ? 'approved' : 'declined', decidedAt: new Date().toISOString() });
  if (approve) {
    batch.set(doc(db, path('attendance'), attendanceId(r.uid, r.date)), { uid: r.uid, name: r.name, day: r.day, manual: true, reissue: true });
  }
  await batch.commit();
}

/* bonuses and deductions */

function asAdjustment(id: string, data: Record<string, unknown>): Adjustment {
  return {
    id,
    uid: String(data.uid ?? ''),
    name: String(data.name ?? ''),
    month: String(data.month ?? ''),
    kind: data.kind === 'deduction' ? 'deduction' : 'bonus',
    amount: Number(data.amount) || 0,
    note: String(data.note ?? ''),
    createdAt: String(data.createdAt ?? ''),
  };
}

/** HR: everybody's for one month. Staff: their own (pass uid). */
export async function listAdjustments(month: string, uid?: string): Promise<Adjustment[]> {
  const parts = [...(uid ? [where('uid', '==', uid)] : []), where('month', '==', month), limit(uid ? 50 : 1000)];
  const snap = await getDocs(query(collection(db, path('adjustments')), ...parts));
  return snap.docs.map((d) => asAdjustment(d.id, d.data())).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addAdjustment(a: Omit<Adjustment, 'id' | 'createdAt'>): Promise<void> {
  const ref = doc(collection(db, path('adjustments')));
  await setDoc(ref, {
    uid: a.uid,
    name: a.name.slice(0, 100),
    month: a.month,
    kind: a.kind,
    amount: Math.max(0, Math.round(a.amount)),
    note: a.note.trim().slice(0, 140),
    createdAt: new Date().toISOString(),
  });
}

export async function removeAdjustment(id: string): Promise<void> {
  await deleteDoc(doc(db, path('adjustments'), id));
}

/** Bonuses minus deductions, per person. */
export function adjustmentTotals(list: Adjustment[]): Map<string, { bonus: number; deduction: number }> {
  const out = new Map<string, { bonus: number; deduction: number }>();
  for (const a of list) {
    const t = out.get(a.uid) ?? { bonus: 0, deduction: 0 };
    t[a.kind] += a.amount;
    out.set(a.uid, t);
  }
  return out;
}

/* running costs */

function asCost(id: string, data: Record<string, unknown>): Cost {
  return {
    id,
    name: String(data.name ?? ''),
    category: String(data.category ?? 'Other'),
    amount: Number(data.amount) || 0,
    frequency: data.frequency === 'once' ? 'once' : 'monthly',
    month: String(data.month ?? ''),
    until: data.until ? String(data.until) : '',
    createdAt: String(data.createdAt ?? ''),
  };
}

export async function listCosts(): Promise<Cost[]> {
  const snap = await getDocs(query(collection(db, path('costs')), limit(500)));
  return snap.docs.map((d) => asCost(d.id, d.data())).sort((a, b) => b.amount - a.amount);
}

export async function saveCost(c: Omit<Cost, 'id' | 'createdAt'> & { id?: string }): Promise<void> {
  const ref = c.id ? doc(db, path('costs'), c.id) : doc(collection(db, path('costs')));
  await setDoc(ref, {
    name: c.name.trim().slice(0, 80),
    category: c.category.slice(0, 40),
    amount: Math.max(0, Math.round(c.amount)),
    frequency: c.frequency,
    month: c.month,
    until: c.until ?? '',
    createdAt: new Date().toISOString(),
  });
}

export async function removeCost(id: string): Promise<void> {
  await deleteDoc(doc(db, path('costs'), id));
}

/** The costs that fall in one pay month. */
export function costsFor(month: string, list: Cost[]): Cost[] {
  return list.filter((c) =>
    c.frequency === 'once' ? c.month === month : (!c.month || c.month <= month) && (!c.until || month <= c.until),
  );
}

/* formatting */

export const hhmm = (d?: Date) => (d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '');

export const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

export const nairaPrecise = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function timeOf(d?: Date): string {
  return d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Not yet';
}

export function hoursBetween(a?: Date, b?: Date): string {
  if (!a || !b) return '';
  const mins = Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}
