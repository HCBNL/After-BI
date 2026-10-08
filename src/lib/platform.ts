/**
 * The platform owner's writes: creating an organisation, and reading who is in
 * one. Owner-only in `firestore.rules`; nobody inside a tenant can reach them.
 */
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { TENANTS, type SubscriptionStatus } from './tenant';
import type { UserProfile } from '@/types';

/** "Bella Group Nigeria" → "bella-group-nigeria". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** The organisation ID becomes a path segment (`orgs/bella/orders`), so it is kept plain and permanent. */
export const ORG_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export async function createTenant(input: {
  id: string;
  name: string;
  status: SubscriptionStatus;
  subscriptionFee?: number;
  demo?: boolean;
}): Promise<void> {
  const id = input.id.trim();
  const name = input.name.trim();
  if (!name) throw new Error('Give the organisation a name.');
  if (!ORG_ID_PATTERN.test(id)) {
    throw new Error('The ID must be lower case letters, numbers and hyphens, and start and end with a letter or number.');
  }

  const ref = doc(db, TENANTS, id);
  if ((await getDoc(ref)).exists()) throw new Error(`"${id}" is already taken. Choose another ID.`);

  const batch = writeBatch(db);
  batch.set(ref, {
    name,
    slug: id,
    status: input.status,
    createdAt: new Date().toISOString(),
    subscriptionFee: input.subscriptionFee ?? 0,
    seats: 0,
  });
  batch.set(doc(db, TENANTS, id, 'settings', 'org'), {
    name,
    currency: 'NGN',
    approvalThreshold: 0,
    setupComplete: false,
    /* A demonstration organisation fills itself the first time its administrator signs in. */
    demo: input.demo === true,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function listOrgMembers(orgId: string): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('orgId', '==', orgId), limit(500)));
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<UserProfile, 'id'>), id: d.id }))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
}
