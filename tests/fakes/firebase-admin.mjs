/**
 * The smallest Firestore that will run the migration.
 *
 * Only what `migrate-to-tenants.mjs` touches: `collection().get()`, `doc().set()`
 * and a batch. Reads see prior writes, because the counter seeding reads the
 * collections the copy has just written and a stub that cannot do that would
 * make the most important step untestable.
 */
/* A Firestore stand-in: enough surface for the migration, and it records
   every write so the smoke test can assert on what actually landed. */
/* Shared through globalThis: the loader hook resolves each `firebase-admin/*`
   specifier to a distinct URL, so module-scope state would not be shared. */
globalThis.__WRITES ??= new Map();
globalThis.__SEED ??= new Map();
export const WRITES = globalThis.__WRITES;
export const SEED = globalThis.__SEED;

function docSnap(id, data) {
  return { id, data: () => data, ref: { path: id } };
}
function makeCollection(path) {
  return {
    async get() {
      /* Reads see prior writes, as a real database does — which is what makes
         the counter seeding (it reads the NEW collections) testable at all. */
      const written = [...WRITES]
        .filter(([p]) => p.startsWith(`${path}/`) && !p.slice(path.length + 1).includes('/'))
        .map(([p, { data }]) => [p.slice(path.length + 1), data]);
      const rows = SEED.get(path) ?? (written.length ? [] : null);
      if (!rows && !written.length) { const e = new Error('not found'); e.code = 5; throw e; }
      const all = [...(rows ?? []), ...written];
      return { empty: all.length === 0, docs: all.map(([id, d]) => docSnap(id, d)) };
    },
    doc: (id) => ({ path: `${path}/${id}` }),
  };
}
/* `{ merge: true }` MERGES, as Firestore does — it does not replace.
   The first version of this stub replaced, so a script that legitimately
   writes a document twice (settings, then the default depot onto settings)
   appeared to lose the first write, and four assertions failed against
   correct code. A stub that is wrong in the safe-looking direction is worse
   than no stub. */
function record(path, data, opts) {
  var prev = opts && opts.merge ? (WRITES.get(path) || {}).data : null;
  WRITES.set(path, { data: Object.assign({}, prev, data), opts: opts });
}

export function initializeApp() {}
export function cert(x) { return x; }
export const FieldValue = { serverTimestamp: () => '<<ts>>' };
/* The slice of Admin Auth the bootstrap uses. `AUTH` is seeded by the test to
   simulate an account that already exists, which is the idempotence case. */
globalThis.__AUTH ??= new Map();
export const AUTH = globalThis.__AUTH;
export function getAuth() {
  return {
    async getUserByEmail(email) {
      var found = AUTH.get(email);
      if (!found) { const e = new Error('no user'); e.code = 'auth/user-not-found'; throw e; }
      return found;
    },
    async createUser(props) {
      var uid = 'uid_' + AUTH.size;
      var user = Object.assign({ uid }, props);
      AUTH.set(props.email, user);
      return user;
    },
  };
}

export function getFirestore() {
  return {
    collection: makeCollection,
    doc: (p) => ({
      path: p,
      async set(data, opts) { record(p, data, opts); },
    }),
    batch() {
      const ops = [];
      return {
        set(ref, data, opts) { ops.push([ref.path, data, opts]); },
        async commit() { for (const [p, d, o] of ops) record(p, d, o); ops.length = 0; },
      };
    },
  };
}
