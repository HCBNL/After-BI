/**
 * Annual leave.
 *
 *   TEN WORKING DAYS A CALENDAR YEAR. Weekends and the organisation's
 *   holidays do not count against it, so a Monday-to-Friday week off costs
 *   five days, not seven, and a week with a public holiday in it costs four.
 *
 *   ONLY AFTER A FULL YEAR. Nobody can take annual leave before the first
 *   anniversary of their resumption date. A person whose resumption date HR
 *   has not set yet cannot apply: there is no anniversary to measure from.
 *
 * WHERE THOSE TWO RULES ARE ENFORCED
 *
 * The year rule is in firestore.rules as well as here: a request whose first
 * day falls before the anniversary is refused by the database, whatever the
 * screen allowed. The ten days are checked per request in the rules, and per
 * year here and on HR's approval screen, because a security rule cannot add
 * up a collection. HR is the backstop: the approval shows how many days that
 * person has already used.
 *
 * WHAT APPROVAL DOES
 *
 * It writes an attendance record for every working day of the leave, marked
 * `leave: true`. That is the whole integration with pay: payroll counts
 * attended days, a leave day is an attended day, so leave is paid without
 * payroll knowing leave exists. Same mechanism as a reissue.
 */

import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { attendanceId, hrPath } from './hr';
import { dayNumber, dayString, workingDays } from './payroll';

/** Working days of annual leave per calendar year. */
export const ANNUAL_DAYS = 10;

export interface Leave {
  id: string;
  uid: string;
  name: string;
  /** yyyy-mm-dd */
  from: string;
  to: string;
  /** Working days the leave costs, holidays and weekends excluded. */
  days: number;
  /** The calendar year it counts against: the year of its first day. */
  year: number;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  /** Recorded by HR on the person's behalf rather than requested. */
  byHr: boolean;
}

function asLeave(id: string, d: Record<string, unknown>): Leave {
  return {
    id,
    uid: String(d.uid ?? ''),
    name: String(d.name ?? ''),
    from: dayString(Number(d.from)),
    to: dayString(Number(d.to)),
    days: Number(d.days) || 0,
    year: Number(d.year) || 0,
    reason: String(d.reason ?? ''),
    status: d.status === 'approved' || d.status === 'declined' ? d.status : 'pending',
    createdAt: String(d.createdAt ?? ''),
    decidedAt: d.decidedAt ? String(d.decidedAt) : undefined,
    decidedBy: d.decidedBy ? String(d.decidedBy) : undefined,
    byHr: d.byHr === true,
  };
}

/**
 * The first day this person may take annual leave: their first anniversary.
 * Null when HR has not set a resumption date, which means "cannot apply yet".
 */
export function eligibleFrom(resumption: string | undefined): string | null {
  if (!resumption || !/^\d{4}-\d{2}-\d{2}$/.test(resumption)) return null;
  const [y, m, d] = resumption.split('-').map(Number);
  /* 29 February resumes on 1 March in a year that has none. */
  const next = new Date(y + 1, m - 1, d);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

/** The working days a leave from..to actually costs. */
export function leaveDays(from: string, to: string, holidays: Set<string>, saturday: boolean): string[] {
  if (!from || !to || to < from) return [];
  return workingDays(from, to, holidays, saturday);
}

/** Days already approved against a year, optionally ignoring one request. */
export function usedIn(list: Leave[], year: number, except?: string): number {
  return list.filter((l) => l.year === year && l.status === 'approved' && l.id !== except).reduce((s, l) => s + l.days, 0);
}

/** Days asked for but not yet decided, against a year. */
export function pendingIn(list: Leave[], year: number): number {
  return list.filter((l) => l.year === year && l.status === 'pending').reduce((s, l) => s + l.days, 0);
}

/**
 * Why a request cannot go in, in words, or null if it can.
 *
 * Checked before sending so the person reads a sentence rather than a
 * permission error, and so HR recording leave sees the same rules.
 */
export function leaveProblem(args: {
  from: string;
  to: string;
  days: number;
  today: string;
  resumption?: string;
  used: number;
  pending: number;
  /** HR recording on someone's behalf may record a day already begun. */
  byHr?: boolean;
}): string | null {
  const { from, to, days, today, resumption, used, pending, byHr } = args;
  if (!from || !to) return 'Choose the first and last day.';
  if (to < from) return 'The last day is before the first.';
  if (!byHr && from <= today) return 'Leave has to start from tomorrow onwards.';
  if (from.slice(0, 4) !== to.slice(0, 4)) return 'Split leave that runs into the new year into two requests, one for each year.';
  if (days < 1) return 'Those dates are all weekends or holidays, so there is nothing to take.';
  const anniversary = eligibleFrom(resumption);
  if (!anniversary) return 'HR has not set your resumption date yet, so your leave cannot be worked out. Ask HR to add it.';
  if (from < anniversary) return `Annual leave starts after a full year in the company. You can take it from ${anniversary}.`;
  const left = ANNUAL_DAYS - used - pending;
  if (days > left) {
    return left <= 0
      ? `All ${ANNUAL_DAYS} days for ${from.slice(0, 4)} are used or already requested.`
      : `That is ${days} working days, and you have ${left} left for ${from.slice(0, 4)}.`;
  }
  return null;
}

const col = () => collection(db, hrPath('leave'));

/** One person's leave, every year: a request made in December for January has to count too. */
export async function listMyLeave(uid: string): Promise<Leave[]> {
  const snap = await getDocs(query(col(), where('uid', '==', uid), limit(200)));
  return snap.docs.map((d) => asLeave(d.id, d.data())).sort((a, b) => b.from.localeCompare(a.from));
}

/**
 * HR: everything for a year and the one after it (leave is asked for ahead,
 * so January's requests arrive in December), pending first, then most recent.
 */
export async function listLeaveYear(year: number): Promise<Leave[]> {
  const [now, next] = await Promise.all(
    [year, year + 1].map((y) => getDocs(query(col(), where('year', '==', y), limit(1000)))),
  );
  return [...now.docs, ...next.docs]
    .map((d) => asLeave(d.id, d.data()))
    .sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || b.from.localeCompare(a.from));
}

function record(l: Omit<Leave, 'id' | 'createdAt'>) {
  return {
    uid: l.uid,
    name: l.name.slice(0, 100),
    from: dayNumber(l.from),
    to: dayNumber(l.to),
    days: Math.round(l.days),
    year: l.year,
    reason: l.reason.trim().slice(0, 300),
    status: l.status,
    createdAt: new Date().toISOString(),
    ...(l.byHr ? { byHr: true } : {}),
    ...(l.decidedBy ? { decidedBy: l.decidedBy.slice(0, 100), decidedAt: new Date().toISOString() } : {}),
  };
}

/** Somebody asking for their own leave. */
export async function applyLeave(uid: string, name: string, from: string, to: string, days: number, reason: string): Promise<void> {
  await setDoc(doc(col()), record({ uid, name, from, to, days, year: Number(from.slice(0, 4)), reason, status: 'pending', byHr: false }));
}

/** Withdraw your own while it is still waiting. */
export async function withdrawLeave(id: string): Promise<void> {
  await deleteDoc(doc(col(), id));
}

/** The paid attendance days approved leave writes. */
function markDays(batch: ReturnType<typeof writeBatch>, uid: string, name: string, dates: string[]) {
  for (const date of dates) {
    /* Merged, so a day the person really clocked in on keeps its times. */
    batch.set(
      doc(db, hrPath('attendance'), attendanceId(uid, date)),
      { uid, name: name.slice(0, 100), day: dayNumber(date), manual: true, leave: true },
      { merge: true },
    );
  }
}

/**
 * HR deciding a request. Approval marks every working day of it as paid, and
 * rewrites the day count from the calendar HR sees, so the figure that counts
 * against the year is the one actually paid, not the one the request claimed.
 */
export async function decideLeave(l: Leave, approve: boolean, decidedBy: string, dates: string[]): Promise<void> {
  if (approve && (dates.length < 1 || dates.length > ANNUAL_DAYS)) {
    throw new Error(
      dates.length < 1
        ? 'Those dates are all weekends or holidays now, so there is nothing to approve. Decline it instead.'
        : `That is ${dates.length} working days, more than the ${ANNUAL_DAYS} a year allows.`,
    );
  }
  const batch = writeBatch(db);
  batch.update(doc(col(), l.id), {
    status: approve ? 'approved' : 'declined',
    ...(approve ? { days: dates.length } : {}),
    decidedAt: new Date().toISOString(),
    decidedBy: decidedBy.slice(0, 100),
  });
  if (approve) markDays(batch, l.uid, l.name, dates);
  await batch.commit();
}

/** HR recording leave on someone's behalf: approved as it is written. */
export async function recordLeave(
  person: { uid: string; name: string },
  from: string,
  to: string,
  dates: string[],
  reason: string,
  decidedBy: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(
    doc(col()),
    record({
      uid: person.uid,
      name: person.name,
      from,
      to,
      days: dates.length,
      year: Number(from.slice(0, 4)),
      reason,
      status: 'approved',
      byHr: true,
      decidedBy,
    }),
  );
  markDays(batch, person.uid, person.name, dates);
  await batch.commit();
}

/**
 * HR cancelling leave that was approved: the request goes, and so do the paid
 * days it wrote. A day the person actually clocked in on keeps its record and
 * only loses the leave mark.
 */
export async function cancelLeave(l: Leave, dates: string[]): Promise<void> {
  const refs = dates.map((date) => doc(db, hrPath('attendance'), attendanceId(l.uid, date)));
  const snaps = await Promise.all(refs.map((ref) => getDoc(ref)));
  const batch = writeBatch(db);
  snaps.forEach((snap, i) => {
    if (!snap.exists() || snap.data().leave !== true) return;
    if (snap.data().inAt) batch.update(refs[i], { leave: deleteField() });
    else batch.delete(refs[i]);
  });
  batch.delete(doc(col(), l.id));
  await batch.commit();
}
