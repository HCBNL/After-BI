/**
 * Creating somebody else's sign-in, from inside the app: no server, no Cloud
 * Function, no terminal.
 *
 * `createUserWithEmailAndPassword` signs in as whoever it just created. On the
 * app's own Auth instance that would throw the administrator out of their
 * session. A *second* Firebase app, with its own Auth instance, has no such
 * effect: the account is made there, signed out there, and the app is deleted.
 * Then the profile document, which is what actually grants the role, is
 * written from the administrator's own session, where `firestore.rules`
 * checks they may create that role in that organisation.
 *
 * Nothing is emailed. The person creating the account hands over the details.
 */
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { app, db } from './firebase';
import { requireOrg } from './tenant';
import type { PriceTier, Role, UserProfile } from '@/types';

/** Readable over the phone: no l/1/I, no O/0. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function suggestPassword(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Staff need an employee code; a distributor's own login (a customer) and AfterBI staff do not. */
export function needsEmployeeCode(role: Role): boolean {
  return role !== 'distributor' && role !== 'agent' && role !== 'owner';
}

/** Upper case, no spaces: "hcb 0042" and "HCB0042" are the same code. */
export function normaliseEmployeeCode(code?: string): string {
  return (code ?? '').toUpperCase().replace(/\s+/g, '').slice(0, 24);
}

/** Refuses a code somebody else in the organisation already has. */
export async function assertCodeFree(orgId: string, code: string, exceptUid?: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('orgId', '==', orgId), where('employeeCode', '==', code), limit(2)),
  );
  const taken = snap.docs.find((d) => d.id !== exceptUid);
  if (taken) {
    const v = taken.data() as UserProfile;
    throw new Error(`Employee code ${code} already belongs to ${`${v.firstName} ${v.lastName}`.trim()}. Each code is one person.`);
  }
}

export interface NewAccount {
  email: string;
  password: string;
  role: Exclude<Role, 'owner'>;
  /** Omitted inside an organisation (it is the caller's own); passed by the platform owner. */
  orgId?: string;
  firstName: string;
  lastName: string;
  title?: string;
  phone?: string;
  /** Required for every member of staff (not a distributor login). Unique within the organisation. */
  employeeCode?: string;
  distributorId?: string;
  distributorCategory?: PriceTier;
  /** Sales reps: the distributor accounts they manage. */
  distributorIds?: string[];
  warehouseIds?: string[];
  /** AfterBI staff (`agent`) only: job title and base, for the ID card. */
  position?: string;
  location?: string;
}

function readableAuthError(error: unknown): Error {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return new Error('That email address already has an account.');
    case 'auth/invalid-email':
      return new Error('That email address does not look right.');
    case 'auth/weak-password':
      return new Error('That password is too short. Use at least six characters.');
    case 'auth/operation-not-allowed':
      return new Error(
        'Email and password sign-in is switched off. Turn it on in Firebase console → Authentication → Sign-in method.',
      );
    case 'auth/network-request-failed':
      return new Error('No connection. Check the network and try again.');
    default:
      return new Error(error instanceof Error ? error.message : 'Could not create that account.');
  }
}

export async function createAccount(input: NewAccount): Promise<{ uid: string; profile: UserProfile }> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  /* AfterBI's own staff belong to no organisation. */
  const orgId = input.role === 'agent' ? '' : input.orgId ?? requireOrg();

  const employeeCode = normaliseEmployeeCode(input.employeeCode);
  if (needsEmployeeCode(input.role) && !employeeCode) {
    throw new Error('An employee code is needed. It is what the audit log uses to know who did what.');
  }
  if (employeeCode && orgId) await assertCodeFree(orgId, employeeCode);

  let secondary: FirebaseApp | null = null;
  let uid: string;

  try {
    const tag = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    secondary = initializeApp(app.options, `account-maker-${tag}`);
    const secondaryAuth = getAuth(secondary);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, input.password);
    uid = credential.user.uid;
    await updateProfile(credential.user, { displayName: `${firstName} ${lastName}`.trim() }).catch(() => {});
    await signOut(secondaryAuth).catch(() => {});
  } catch (error) {
    throw readableAuthError(error);
  } finally {
    if (secondary) await deleteApp(secondary).catch(() => {});
  }

  /* No `undefined` values: Firestore refuses a write that contains one. */
  const profile: Omit<UserProfile, 'id'> = {
    email,
    firstName,
    lastName,
    role: input.role,
    ...(orgId ? { orgId } : {}),
    active: true,
    createdAt: new Date().toISOString(),
    ...(input.title?.trim() ? { title: input.title.trim() } : {}),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    ...(employeeCode ? { employeeCode } : {}),
    ...(input.distributorId ? { distributorId: input.distributorId } : {}),
    ...(input.distributorCategory ? { distributorCategory: input.distributorCategory } : {}),
    ...(input.distributorIds?.length ? { distributorIds: input.distributorIds } : {}),
    ...(input.warehouseIds?.length ? { warehouseIds: input.warehouseIds } : {}),
    ...(input.position?.trim() ? { position: input.position.trim() } : {}),
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
  };

  try {
    await setDoc(doc(db, 'users', uid), profile);
  } catch (error) {
    throw new Error(
      `The sign-in was created but its profile could not be saved, so it cannot be used yet. ` +
        `Delete ${email} in Firebase console → Authentication and try again. ` +
        `(${error instanceof Error ? error.message : 'unknown error'})`,
    );
  }

  return { uid, profile: { id: uid, ...profile } };
}
