/**
 * Create account requests from the website.
 *
 * A visitor leaves four things (their name, the business, a phone number and
 * an email) and is told we will reach them within 48 hours. Nothing opens
 * WhatsApp or a mail app: the request lands in `signupRequests`, and the
 * owner sees it in Platform, Sign up requests, and on the platform home.
 *
 * The visitor's side is one HTTPS call (lib/firestoreRest), so the website
 * never downloads the database client for it. The owner's side uses the SDK.
 */
import { restCreate } from './firestoreRest';

export interface SignupForm {
  name: string;
  company: string;
  phone: string;
  email: string;
}

export interface SignupRequest extends SignupForm {
  id: string;
  createdAt: string;
  status: 'new' | 'contacted';
  page?: string;
}

const COLLECTION = 'signupRequests';

export async function sendSignupRequest(form: SignupForm): Promise<void> {
  await restCreate(COLLECTION, {
    name: form.name.trim().slice(0, 120),
    company: form.company.trim().slice(0, 160),
    phone: form.phone.trim().slice(0, 40),
    email: form.email.trim().toLowerCase().slice(0, 160),
    status: 'new',
    page: typeof window === 'undefined' ? '' : window.location.pathname.slice(0, 120),
  });
}

/* ------------------------------------------------------------ the owner */

async function store() {
  const [firestore, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')]);
  return { ...firestore, db };
}

function iso(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value) return (value as { toDate(): Date }).toDate().toISOString();
  return typeof value === 'string' ? value : '';
}

export async function listSignupRequests(): Promise<SignupRequest[]> {
  const { db, collection, getDocs, orderBy, query, limit } = await store();
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(300)));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      name: String(x.name ?? ''),
      company: String(x.company ?? ''),
      phone: String(x.phone ?? ''),
      email: String(x.email ?? ''),
      status: x.status === 'contacted' ? 'contacted' : 'new',
      page: typeof x.page === 'string' ? x.page : undefined,
      createdAt: iso(x.createdAt),
    };
  });
}

/** How many are still waiting for a call. Zero when it cannot be read. */
export async function countNewSignupRequests(): Promise<number> {
  try {
    const { db, collection, getCountFromServer, query, where } = await store();
    const snap = await getCountFromServer(query(collection(db, COLLECTION), where('status', '==', 'new')));
    return snap.data().count;
  } catch {
    return 0;
  }
}

export async function setSignupStatus(id: string, status: SignupRequest['status']): Promise<void> {
  const { db, doc, updateDoc } = await store();
  await updateDoc(doc(db, COLLECTION, id), { status });
}

export async function deleteSignupRequest(id: string): Promise<void> {
  const { db, doc, deleteDoc } = await store();
  await deleteDoc(doc(db, COLLECTION, id));
}
