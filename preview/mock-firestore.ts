/* Just enough of firebase/firestore for the screens that import it directly. */
const NOTICES = [
  { id: 'n1', title: 'Scheduled maintenance on Saturday', body: 'AfterBI will be briefly unavailable between 2am and 4am on Saturday while we upgrade the database.', until: new Date(Date.now() + 6e8).toISOString().slice(0, 10), tone: 'warning', createdAt: new Date().toISOString() },
  { id: 'n2', title: 'Sell-out capture is now offline-capable', body: 'Reps can key sales without signal; they sync the moment the phone reconnects.', until: new Date(Date.now() + 12e8).toISOString().slice(0, 10), tone: 'info', createdAt: new Date().toISOString() },
];
const ENQUIRIES = [
  { id: 'e1', company: 'Harmony Distribution', name: 'Ngozi Umeh', email: 'ngozi@harmony.ng', phone: '08044445555', message: 'We run four depots in the south-east and want to see the stock module.', source: 'website', createdAt: new Date().toISOString() },
];

export const collection = (_db: unknown, path: string) => ({ path });
export const doc = (..._a: unknown[]) => ({ id: 'x' });
export const query = (ref: { path: string }) => ref;
export const orderBy = () => ({});
export const where = () => ({});
export const limit = () => ({});
export const serverTimestamp = () => new Date().toISOString();
export const addDoc = async () => ({ id: 'new' });
export const updateDoc = async () => {};
export const deleteDoc = async () => {};
export const setDoc = async () => {};
export const getDocs = async (ref: { path: string }) => {
  const rows = ref.path.includes('notices') ? NOTICES : ref.path.includes('enquiries') ? ENQUIRIES : [];
  return { docs: rows.map((r) => ({ id: r.id, data: () => r })), empty: rows.length === 0 };
};
export const getDoc = async () => ({ exists: () => false, data: () => ({}), id: 'x' });

/* Reached only because `src/lib/brand.ts` imports './db' relatively, which
   pulls the real data layer into the graph even though every screen uses the
   alias. These keep the module linkable; nothing calls them in preview. */
export const increment = (n: number) => n;
export const runTransaction = async (_db: unknown, fn: (tx: unknown) => unknown) =>
  fn({ get: async () => ({ exists: () => false, data: () => ({}) }), set: () => {}, update: () => {} });
export const initializeFirestore = () => ({});
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const onSnapshot = () => () => {};
export type DocumentData = Record<string, unknown>;
export type QueryConstraint = unknown;
