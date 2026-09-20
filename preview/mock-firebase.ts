/* Stand-in for src/lib/firebase.ts. The few screens that reach Firestore
   directly (platform notices, enquiries, depots) get inert objects; their
   loaders are stubbed below via the firebase/firestore alias. */
export const app = {} as never;
export const auth = {} as never;
export const db = {} as never;
