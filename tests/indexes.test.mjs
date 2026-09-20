/**
 * Does `firestore.indexes.json` still describe the queries this app makes?
 *
 * WHY THIS FILE EXISTS
 *
 * A missing composite index is the worst kind of production bug in a Firestore
 * app. It does not degrade — the query throws `FAILED_PRECONDITION`, the screen
 * shows its error boundary, and it does it only in production, because the
 * local emulator and the mock preview both create indexes on demand and never
 * complain. So the first person to find it is a finance manager trying to print
 * a statement, and the fix is a deploy.
 *
 * It got worse when this app became multi-tenanted. The index file was written
 * against the old shape, where everything lived in root collections carrying an
 * `orgId` field and half the queries began `where('orgId', '==', …)`. Those
 * filters are gone — the tenant is now in the *path*, `orgs/{orgId}/orders` —
 * so an index whose leading field is `orgId` describes a query nothing makes
 * any more, and the index that is actually needed may never have existed.
 *
 * WHAT DOES AND DOES NOT CHANGE WHEN YOU MOVE TO A SUBTREE
 *
 * This is the part that is easy to get wrong in the anxious direction. A
 * Firestore composite index is keyed on the collection's *ID* and its query
 * scope — not on its full path. `queryScope: "COLLECTION"` means "any
 * collection with this ID, anywhere in the database, queried directly". So
 * `orgs/bella/orders` and `orgs/harmony/orders` are served by one `orders`
 * index definition, and onboarding the four hundredth tenant needs no new
 * index and no deploy. You do NOT need one index per tenant, and you do NOT
 * need `COLLECTION_GROUP` scope — that is for querying across every `orders`
 * collection at once, which this app deliberately never does.
 *
 * What the move DID invalidate is narrower and entirely about fields:
 *   - an index whose fields include `orgId`, on a collection that now lives in
 *     the tenant subtree, is dead weight — no query filters on it;
 *   - `users` is the one exception and must keep its `orgId` index, because it
 *     is deliberately a ROOT collection (sign-in yields a uid and nothing else,
 *     so there has to be one place to look up which tenant a uid belongs to);
 *   - an index on a collection that no longer exists — `claims`, `auditLog` —
 *     is billed storage for nothing.
 *
 * HOW THIS CHECKS
 *
 * `SHAPES` below is the list of every query the data layer can build, written
 * out rather than inferred, because the interesting ones assemble their
 * constraints conditionally and no regex reads those honestly. Three checks run
 * against it, and they close the loop in both directions:
 *
 *   1. every shape that needs a composite index has one;
 *   2. every index in the file is needed by some shape (this is the one that
 *      catches the leftovers from the old structure);
 *   3. every field named in the file is a field the data layer actually
 *      queries on (this catches a renamed field, and it is what would have
 *      caught `orgId`).
 *
 * And because `SHAPES` is a hand-written list, a fourth check guards the list
 * itself: every `where`/`orderBy` field appearing in `db.ts` must appear
 * somewhere in `SHAPES`. Adding a query with a new field fails this file until
 * the shape is written down — which is the moment to notice an index is needed.
 *
 * Run with `npm run test:indexes`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let passed = 0;
const failures = [];
const note = (what, ok, detail = '') => {
  if (ok) passed += 1;
  else failures.push(`${what}${detail ? `\n      ${detail}` : ''}`);
};

const config = JSON.parse(read('firestore.indexes.json'));
const db = read('src/lib/db.ts');
const tenant = read('src/lib/tenant.ts');

/* ------------------------------------------------------------- the queries */

/**
 * Every query the app can build, as (collection, equality filters, sort).
 *
 * `eq` is the fields compared with `==`. `range` is a field compared with
 * `>=`/`<=`, which Firestore requires to be the field you sort by. `by` is the
 * sort, and its direction matters: an index is built in one direction and
 * Firestore will happily use it backwards for a whole-index reversal, but not
 * for a mixed one, so it is written down as declared.
 */
const SHAPES = [
  // products
  { collection: 'products', eq: [], by: ['name', 'asc'], from: 'listProducts()' },
  { collection: 'products', eq: ['status'], by: ['name', 'asc'], from: 'listProducts(activeOnly)' },

  // distributors
  { collection: 'distributors', eq: [], by: ['company', 'asc'], from: 'listDistributors' },

  // orders — the four combinations `listOrders` can assemble
  { collection: 'orders', eq: [], by: ['createdAt', 'desc'], from: 'listOrders()' },
  { collection: 'orders', eq: ['status'], by: ['createdAt', 'desc'], from: 'listOrders({status})' },
  { collection: 'orders', eq: ['distributorId'], by: ['createdAt', 'desc'], from: 'listOrders({distributorId})' },
  { collection: 'orders', eq: ['status', 'distributorId'], by: ['createdAt', 'desc'], from: 'listOrders({status,distributorId})' },

  // stock and its ledger
  { collection: 'warehouses', eq: [], by: ['name', 'asc'], from: 'listWarehouses' },
  { collection: 'stock', eq: [], by: ['productName', 'asc'], from: 'listStock()' },
  { collection: 'stock', eq: ['warehouseId'], by: ['productName', 'asc'], from: 'listStock(warehouseId)' },
  { collection: 'stockMovements', eq: [], by: ['createdAt', 'desc'], from: 'listMovements()' },
  { collection: 'stockMovements', eq: ['warehouseId'], by: ['createdAt', 'desc'], from: 'listMovements(warehouseId)' },

  // sell-out. The date range sorts by the field it filters, so it adds nothing.
  { collection: 'sales', eq: [], range: 'saleDate', by: ['saleDate', 'desc'], from: 'listSales({from,to})' },
  { collection: 'sales', eq: ['distributorId'], range: 'saleDate', by: ['saleDate', 'desc'], from: 'listSales({distributorId,from,to})' },

  // pipeline
  { collection: 'leads', eq: [], by: ['updatedAt', 'desc'], from: 'listLeads()' },
  { collection: 'leads', eq: ['ownerId'], by: ['updatedAt', 'desc'], from: 'listLeads(ownerId)' },

  // money
  { collection: 'invoices', eq: [], by: ['issuedOn', 'desc'], from: 'listInvoices()' },
  { collection: 'invoices', eq: ['distributorId'], by: ['issuedOn', 'desc'], from: 'listInvoices({distributorId})' },
  { collection: 'invoices', eq: ['status'], by: ['issuedOn', 'desc'], from: 'listInvoices({status})' },
  { collection: 'invoices', eq: ['distributorId', 'status'], by: ['issuedOn', 'desc'], from: 'listInvoices({distributorId,status})' },
  { collection: 'payments', eq: ['invoiceId'], by: ['paidOn', 'desc'], from: 'listPayments' },
  { collection: 'payments', eq: ['distributorId'], by: ['paidOn', 'desc'], from: 'listAccountPayments' },

  // returns and targets
  { collection: 'returns', eq: [], by: ['createdAt', 'desc'], from: 'listReturns()' },
  { collection: 'returns', eq: ['distributorId'], by: ['createdAt', 'desc'], from: 'listReturns(distributorId)' },
  { collection: 'targets', eq: ['period'], by: ['ownerName', 'asc'], from: 'listTargets' },

  /*
   * The two ROOT collections, and the only place `orgId` legitimately appears
   * in an index. `users` cannot live in the tenant subtree: signing in yields a
   * uid and nothing else, so there has to be one collection, readable before a
   * tenant is known, that says which tenant the uid belongs to.
   */
  { collection: 'users', eq: ['orgId'], by: ['firstName', 'asc'], root: true, from: 'listMembers' },
  { collection: 'orgs', eq: [], by: ['name', 'asc'], root: true, from: 'listTenants' },

  // platform, both root, both a bare sort
  { collection: 'notices', eq: [], by: ['createdAt', 'desc'], root: true, from: 'NoticePage' },
  { collection: 'enquiries', eq: [], by: ['createdAt', 'desc'], root: true, from: 'EnquiriesPage' },
];

/**
 * Does this query need a composite index, or will Firestore's automatic
 * single-field indexes serve it?
 *
 * Two cases are free: sorting with no equality filter at all, and filtering a
 * range on the very field you sort by. Everything else — one equality filter
 * plus a sort on a *different* field included, which is the case people assume
 * is free and is not — needs a composite.
 */
function needsComposite(shape) {
  if (shape.eq.length === 0) return false;
  if (shape.eq.length === 1 && shape.eq[0] === shape.by[0]) return false;
  return true;
}

const key = (collectionGroup, eq, by) =>
  `${collectionGroup}|${[...eq].sort().join(',')}|${by[0]}:${by[1]}`;

const declared = new Map();
for (const index of config.indexes) {
  const fields = index.fields;
  const last = fields[fields.length - 1];
  const eq = fields.slice(0, -1).map((f) => f.fieldPath);
  const by = [last.fieldPath, last.order === 'DESCENDING' ? 'desc' : 'asc'];
  declared.set(key(index.collectionGroup, eq, by), index);
}

/* ------------------------------------------------- 1. every query is served */

for (const shape of SHAPES) {
  if (!needsComposite(shape)) continue;
  const k = key(shape.collection, shape.eq, shape.by);
  note(
    `index exists for ${shape.from}`,
    declared.has(k),
    `add { collectionGroup: "${shape.collection}", fields: [${shape.eq
      .map((f) => `${f} ASC`)
      .join(', ')}, ${shape.by[0]} ${shape.by[1].toUpperCase()}] }`,
  );
}

/* ------------------------------------------- 2. no index serves nothing */

const wanted = new Set(
  SHAPES.filter(needsComposite).map((s) => key(s.collection, s.eq, s.by)),
);
const orphans = [...declared.keys()].filter((k) => !wanted.has(k));
note(
  'no index describes a query this app no longer makes',
  orphans.length === 0,
  orphans.join('\n      '),
);

/* --------------------------------- 3. every indexed collection still exists */

const live = new Set([
  ...[...tenant.matchAll(/^\s+\w+:\s*'(\w+)',$/gm)].map(([, name]) => name),
  'users',
  'orgs',
  'notices',
  'enquiries',
]);
const ghosts = [...new Set(config.indexes.map((i) => i.collectionGroup))].filter((c) => !live.has(c));
note('every indexed collection still exists', ghosts.length === 0, ghosts.join(', '));

const overrideGhosts = [...new Set((config.fieldOverrides ?? []).map((f) => f.collectionGroup))].filter(
  (c) => !live.has(c),
);
note('every exempted collection still exists', overrideGhosts.length === 0, overrideGhosts.join(', '));

/* ------------------------------ 4. every index scope is one this app queries */

const wrongScope = config.indexes.filter((i) => i.queryScope !== 'COLLECTION');
note(
  'no index is COLLECTION_GROUP scoped',
  wrongScope.length === 0,
  /*
   * A collection-group query reads every tenant's copy of that collection at
   * once. The rules cannot stop it with the tenant catch-all — a collection
   * group needs its own `match /{path=**}/orders/{id}` block — so an index at
   * that scope is the first half of a cross-tenant data leak. If the platform
   * console ever genuinely needs one, add the rules block in the same commit.
   */
  wrongScope.map((i) => i.collectionGroup).join(', '),
);

/* ------------------------------------------- 5. the SHAPES list is honest */

/*
 * Guards the hand-written list against the data layer growing past it. Every
 * field `db.ts` filters or sorts on has to appear in some shape — so a new
 * query with a new field fails here until somebody writes the shape down, and
 * writing the shape down is what surfaces the missing index.
 */
const queried = new Set([
  ...[...db.matchAll(/where\(\s*'([\w.]+)'/g)].map(([, f]) => f),
  ...[...db.matchAll(/orderBy\(\s*'([\w.]+)'/g)].map(([, f]) => f),
]);
const known = new Set(SHAPES.flatMap((s) => [...s.eq, s.by[0], s.range].filter(Boolean)));
const unlisted = [...queried].filter((f) => !known.has(f));
note(
  'every field the data layer queries on is written down in SHAPES',
  unlisted.length === 0,
  unlisted.length ? `not in SHAPES: ${unlisted.join(', ')}` : '',
);

/* ------------------------- 6. the snapshot payloads are exempt from indexing */

/*
 * Firestore indexes every field of every document automatically, in both
 * directions — and for an array of maps it indexes each element's subfields.
 * An order with forty lines therefore writes hundreds of index entries nobody
 * will ever query, on every write, billed per tenant.
 *
 * `lines`, `approvals` and `approverNames` are snapshots: they are read with
 * the document and never filtered or sorted on. Exempting them is the single
 * cheapest thing in this file. It is also one-way — re-enabling an exemption
 * means a backfill — which is why it is limited to fields that are structurally
 * unqueryable rather than merely unqueried today.
 */
const exempt = new Set((config.fieldOverrides ?? []).map((f) => `${f.collectionGroup}.${f.fieldPath}`));
for (const field of ['orders.lines', 'orders.approvals', 'orders.approverNames', 'invoices.lines']) {
  note(`${field} is exempt from automatic indexing`, exempt.has(field));
}
for (const override of config.fieldOverrides ?? []) {
  note(
    `${override.collectionGroup}.${override.fieldPath} is not also a queried field`,
    !queried.has(override.fieldPath),
    'exempting a field the app filters or sorts on breaks that query at runtime',
  );
}

/* ------------------------------------------------------------------ report */

console.log(`\n${passed} index checks passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFAILURES:\n' + failures.map((f) => '  x ' + f).join('\n'));
  process.exit(1);
}
