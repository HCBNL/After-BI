/**
 * Public ID card checks for staff of organisations on AfterBI.
 *
 * `idCards/{uid}`: one small public record per person who has made their ID
 * card: name, position, company, contact, and whether they are active. The QR
 * on the card opens `/verify/id/{uid}`, which reads it over plain HTTPS (no
 * database client) and says whether the holder is a current member of staff.
 * Suspending someone in People marks their card inactive at once.
 */
import { publicOrigin } from './hosts';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { restGet } from './firestoreRest';

export interface IdCardRecord {
  uid: string;
  orgId: string;
  name: string;
  position: string;
  company: string;
  logo?: string;
  /** The holder's profile picture (https), shown when the card is scanned and saved with the contact. */
  photo?: string;
  /** The company's colour, #rrggbb, so the scanned card wears it. */
  color?: string;
  phone?: string;
  email?: string;
  website?: string;
  location?: string;
  staffNo: string;
  active: boolean;
  updatedAt?: string;
}

export function idVerifyUrl(uid: string): string {
  return `${publicOrigin()}/verify/id/${encodeURIComponent(uid)}`;
}

/** The business card's short link: the same public record, shown as a contact card. */
export function businessCardUrl(uid: string): string {
  return `${publicOrigin()}/card/${encodeURIComponent(uid)}`;
}

/** Written by the card holder whenever they make or save their card. */
export async function publishIdCard(record: Omit<IdCardRecord, 'active' | 'updatedAt'>): Promise<void> {
  await setDoc(doc(db, 'idCards', record.uid), {
    ...record,
    logo: record.logo ?? '',
    photo: /^https:\/\//.test(record.photo ?? '') ? record.photo : '',
    color: /^#[0-9a-f]{6}$/i.test(record.color ?? '') ? record.color : '',
    phone: record.phone ?? '',
    email: record.email ?? '',
    website: record.website ?? '',
    location: record.location ?? '',
    active: true,
    updatedAt: serverTimestamp(),
  });
}

/** An administrator suspending or restoring someone. A missing card is fine. */
export async function setIdCardActive(uid: string, active: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'idCards', uid), { active, updatedAt: serverTimestamp() });
  } catch {
    /* no card made yet: nothing to mark */
  }
}

export async function readIdCard(uid: string): Promise<IdCardRecord | null> {
  try {
    const data = await restGet(`idCards/${encodeURIComponent(uid)}`);
    if (!data) return null;
    const card = data as unknown as IdCardRecord;
    /* Only https pictures and a plain hex colour are ever drawn. */
    if (card.photo && !/^https:\/\//.test(card.photo)) card.photo = '';
    if (card.logo && !/^https:\/\//.test(card.logo)) card.logo = '';
    if (card.color && !/^#[0-9a-f]{6}$/i.test(card.color)) card.color = '';
    return card;
  } catch {
    return null;
  }
}
