/**
 * Bank profiles: the banks the platform owner keeps (name, logo, colour) in
 * Platform, Bank profiles. An organisation adding its accounts picks the bank
 * from this list and types only the account number, so every logo and spelling
 * is the same across the platform. Root collection `bankProfiles`: readable by
 * anybody signed in, written only by the owner.
 */

import { collection, deleteDoc, doc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface BankProfile {
  id: string;
  name: string;
  logoUrl?: string;
  /** Hex, for the account card's accent. */
  color?: string;
  active: boolean;
  updatedAt?: string;
}

const COL = 'bankProfiles';

export async function listBankProfiles(): Promise<BankProfile[]> {
  const snap = await getDocs(query(collection(db, COL), limit(200)));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        name: String(x.name ?? ''),
        logoUrl: x.logoUrl ? String(x.logoUrl) : '',
        color: x.color ? String(x.color) : '',
        active: x.active !== false,
        updatedAt: x.updatedAt ? String(x.updatedAt) : '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function bankIdFor(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'bank';
}

export async function saveBankProfile(p: Omit<BankProfile, 'id' | 'updatedAt'> & { id?: string }): Promise<void> {
  const id = p.id || bankIdFor(p.name);
  await setDoc(doc(db, COL, id), {
    name: p.name.trim().slice(0, 60),
    logoUrl: p.logoUrl ?? '',
    color: p.color && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '',
    active: p.active,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeBankProfile(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Commercial banks in Nigeria, for a one tap start. Logos are added by the owner. */
export const COMMON_BANKS = [
  'Access Bank',
  'Citibank',
  'Ecobank',
  'Fidelity Bank',
  'First Bank',
  'FCMB',
  'Globus Bank',
  'GTBank',
  'Keystone Bank',
  'Kuda Bank',
  'Moniepoint',
  'Opay',
  'Optimus Bank',
  'Palmpay',
  'Parallex Bank',
  'Polaris Bank',
  'Premium Trust Bank',
  'Providus Bank',
  'Signature Bank',
  'Stanbic IBTC',
  'Standard Chartered',
  'Sterling Bank',
  'SunTrust Bank',
  'Titan Trust Bank',
  'Union Bank',
  'UBA',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
];
