/**
 * AfterBI staff: the people who sell AfterBI (role `agent`).
 *
 * They belong to no organisation. The platform owner creates them from
 * Platform, AfterBI staff. Each has a staff number derived from their account
 * id, and a small public record at `staffCards/{staffNo}` (name, position,
 * status) that the QR code on their ID card checks. Nothing else about them
 * is public.
 */

import type { UserProfile } from '@/types';
import { restGet } from './firestoreRest';

async function store() {
  const [firestore, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')]);
  return { ...firestore, db };
}

/** A short staff number from the account id: AB-XXXXXX. */
export function staffNumber(uid: string): string {
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `AB-${(h % 1_000_000).toString().padStart(6, '0')}`;
}

export interface StaffCardRecord {
  uid: string;
  name: string;
  position: string;
  location: string;
  status: 'active' | 'suspended';
  updatedAt: string;
}

/** Every AfterBI staff account, newest first. Owner only. */
export async function listStaff(): Promise<UserProfile[]> {
  const { collection, getDocs, query, where, limit, db } = await store();
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'agent'), limit(200)));
  return snap.docs
    .map((row) => ({ ...(row.data() as Omit<UserProfile, 'id'>), id: row.id }))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** Writes (or refreshes) the public record the ID card's QR code checks. */
export async function publishStaffCard(person: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'position' | 'location' | 'active'>): Promise<void> {
  const { doc, setDoc, db } = await store();
  const record: StaffCardRecord = {
    uid: person.id,
    name: `${person.firstName} ${person.lastName}`.trim(),
    position: person.position ?? '',
    location: person.location ?? '',
    status: person.active === false ? 'suspended' : 'active',
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'staffCards', staffNumber(person.id)), record);
}

/** Suspend or reactivate. Owner only. */
export async function setStaffActive(person: UserProfile, active: boolean): Promise<void> {
  const { doc, updateDoc, db } = await store();
  await updateDoc(doc(db, 'users', person.id), { active, updatedAt: new Date().toISOString() });
  await publishStaffCard({ ...person, active }).catch(() => undefined);
}

/** A staff member saving their own position, location and phone. */
export async function saveMyStaffDetails(
  user: UserProfile,
  details: { position: string; location: string; phone: string },
): Promise<void> {
  const { doc, updateDoc, db } = await store();
  const patch = {
    position: details.position.trim(),
    location: details.location.trim(),
    phone: details.phone.trim(),
    updatedAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, 'users', user.id), patch);
  await updateDoc(doc(db, 'staffCards', staffNumber(user.id)), {
    position: patch.position,
    location: patch.location,
    updatedAt: patch.updatedAt,
  }).catch(() => undefined);
}

/** The public check behind the QR code. Never throws; null means not found. */
export async function readStaffCard(staffNo: string): Promise<StaffCardRecord | null> {
  try {
    const data = await restGet(`staffCards/${encodeURIComponent(staffNo.toUpperCase())}`);
    return data ? (data as unknown as StaffCardRecord) : null;
  } catch {
    return null;
  }
}

/** Where the ID card's QR code points. */
export function staffVerifyUrl(staffNo: string): string {
  return `${window.location.origin}/verify/staff/${encodeURIComponent(staffNo)}`;
}

/** A public file as a data URL, for drawing into a PDF. */
export async function publicDataUrl(path: string): Promise<string> {
  const blob = await (await fetch(path)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${path}`));
    reader.readAsDataURL(blob);
  });
}
