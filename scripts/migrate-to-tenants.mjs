#!/usr/bin/env node
/**
 * Move a flat AfterBI database into the tenant subtree.
 *
 * WHAT IT DOES
 *
 *   orders/{id}        →  orgs/{orgId}/orders/{id}
 *   products/{id}      →  orgs/{orgId}/products/{id}
 *   inventory/{id}     →  orgs/{orgId}/stock/{warehouseId}_{productId}
 *   …and so on for every collection in MAP below.
 *
 *   users/{uid}        stays put, and gains `orgId`.
 *
 * It also does three things that are not copies, and each one is a thing the
 * move to a tenant subtree created:
 *
 *   - It STRIPS the old scoping fields. A document inside `orgs/{orgId}/…`
 *     already says which tenant it belongs to — its path does. A leftover
 *     `orgId` field on the document is dead weight, it is automatically
 *     indexed on every tenant, and if the data is ever copied to another
 *     tenant it actively contradicts the path it is sitting in.
 *
 *   - It SEEDS THE DOCUMENT COUNTERS. Numbering moved from "count the
 *     collection" to a per-tenant counter document, and a counter that does not
 *     exist starts at 1 — so the first order raised after a migration would be
 *     PO-2026-0001 again, colliding with an order somebody has already quoted
 *     in an email. The counters are set to the highest number already in use.
 *
 *   - It EXPLODES the payments that used to be an array on the invoice into
 *     `orgs/{orgId}/payments`. They are their own collection now, because a
 *     statement asks for an account's payments and an array inside forty
 *     invoice documents cannot answer that.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not delete anything. The old root collections are left exactly as
 * they were, so a migration that goes wrong costs a re-run rather than a
 * restore — and you can compare the two side by side before you point the app
 * at the new shape. Delete them by hand, later, once you are sure.
 *
 * It is also idempotent: every write is a `set` at a deterministic path, so
 * running it twice produces the same database. That matters because a run over
 * a large database WILL be interrupted at some point, and the recovery has to
 * be "run it again" rather than "work out where it stopped".
 *
 * USAGE
 *
 *   FIREBASE_SERVICE_ACCOUNT=./service-account.json \
 *   node scripts/migrate-to-tenants.mjs --org acme --name "Acme Distribution" [--dry]
 *
 * ALWAYS run with --dry first. It prints exactly what it would write.
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/*
 * NOTHING HAPPENS AT IMPORT.
 *
 * Reading the arguments and opening a Firebase connection used to happen at
 * module scope, which meant this file could only ever be run — importing it to
 * test one of its reshaping functions would parse argv, demand a service
 * account and connect to production. So the most dangerous code in the
 * repository was the only code with no tests. `boot()` does that work, `main()`
 * calls it, and `tests/migrate.test.mjs` imports the pure functions and leaves
 * it alone.
 */
let ORG_ID = '';
let ORG_NAME = '';
let DRY = false;
let db = null;

function boot() {
  const { values } = parseArgs({
    options: {
      org: { type: 'string' },
      name: { type: 'string' },
      dry: { type: 'boolean', default: false },
    },
  });

  if (!values.org) {
    console.error('Missing --org. Give the new organisation a short id, e.g. --org acme');
    process.exit(1);
  }

  ORG_ID = values.org;
  ORG_NAME = values.name ?? ORG_ID;
  DRY = values.dry;

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!keyPath) {
    console.error('Set FIREBASE_SERVICE_ACCOUNT to the path of a service-account JSON file.');
    process.exit(1);
  }

  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
  db = getFirestore();
}

/**
 * Old collection → new collection, with an optional shape fix.
 *
 * The renames are not cosmetic. `inventory` became `stock` because the old name
 * was used for two different things in the same codebase (a distributor's
 * holding and the company warehouse), and `inventoryMovements` became
 * `stockMovements` to match. The id rewrite on `stock` is the important one:
 * positions are now keyed `{warehouseId}_{productId}` rather than auto-id, which
 * is what turns a deduction into a single transactional update instead of a
 * query-then-write that can fork a balance. See `types/index.ts`.
 */
/*
 * `claims` is deliberately absent.
 *
 * Claims were removed from the product: they are settled offline, and the part
 * that belongs in software is the outcome — a return, which puts the stock back
 * and raises the credit. Old claim documents are left where they are rather than
 * copied into the tenant subtree, so nothing is destroyed and nothing dead is
 * carried forward. Export them first if you want the history.
 */
const MAP = [
  { from: 'products', to: 'products' },
  { from: 'distributors', to: 'distributors' },
  { from: 'orders', to: 'orders', shape: fixOrder },
  { from: 'warehouses', to: 'warehouses' },
  { from: 'inventory', to: 'stock', id: stockId, shape: fixStock },
  { from: 'inventoryMovements', to: 'stockMovements', shape: fixMovement },
  { from: 'stockMovements', to: 'stockMovements', shape: fixMovement },
  { from: 'sales', to: 'sales', shape: fixSale },
  { from: 'leads', to: 'leads' },
  { from: 'invoices', to: 'invoices', shape: fixInvoice },
  { from: 'returns', to: 'returns' },
  { from: 'annualTargets', to: 'targets' },
  /*
   * A root `payments` collection only existed in some deployments — in others
   * the payments were an array on the invoice, which `explodeInvoicePayments`
   * below handles. Listing it here is harmless when it is absent: a missing
   * collection is reported and skipped.
   */
  { from: 'payments', to: 'payments', shape: fixPayment },
];

/* The old schema called them `items`; the type calls them `lines`, because an
   "item" in this domain is a product and calling an order row an item made
   every function signature ambiguous. */
export function fixOrder(data) {
  const lines = (data.items ?? data.lines ?? []).map((line) => ({
    productId: line.prodId ?? line.productId ?? '',
    productName: line.prodName ?? line.productName ?? '',
    category: line.category ?? '',
    unit: line.unit ?? '',
    quantity: Number(line.qty ?? line.quantity ?? 0),
    unitPrice: Number(line.unitPrice ?? 0),
    lineTotal: Number(line.totalValue ?? line.lineTotal ?? 0),
  }));

  return {
    ...untenant(strip(data, ['items'])),
    lines,
    total: Number(data.totalValue ?? data.total ?? 0),
    /* A legacy role string on the author. `normaliseRole` handles it at read
       time too, but fixing it here means the data is clean rather than
       permanently in need of translation. */
    createdByRole: normaliseRole(data.createdByRole),
  };
}

function stockId(data, oldId) {
  const warehouse = data.warehouseId ?? data.distId ?? 'default';
  const product = data.prodId ?? data.productId;
  return product ? `${warehouse}_${product}` : oldId;
}

export function fixStock(data) {
  return {
    warehouseId: data.warehouseId ?? data.distId ?? 'default',
    productId: data.prodId ?? data.productId ?? '',
    productName: data.prodName ?? data.productName ?? '',
    unit: data.unit ?? '',
    quantity: Number(data.qty ?? data.quantity ?? 0),
    threshold: Number(data.threshold ?? 0),
    updatedAt: data.updatedAt ?? FieldValue.serverTimestamp(),
  };
}

function fixMovement(data) {
  return {
    warehouseId: data.warehouseId ?? data.distId ?? 'default',
    productId: data.prodId ?? data.productId ?? '',
    productName: data.prodName ?? data.productName ?? '',
    type: MOVEMENT_TYPES[data.type] ?? 'adjustment',
    direction: data.direction === 'in' ? 'in' : 'out',
    /* Always positive. The old data had signed quantities in places, which is
       exactly the ambiguity `moveStock` now refuses to allow. */
    quantity: Math.abs(Number(data.qty ?? data.quantity ?? 0)),
    balanceAfter: Number(data.balanceAfter ?? 0),
    referenceId: data.saleId ?? data.orderId ?? null,
    note: data.note ?? null,
    createdBy: data.createdBy ?? '',
    createdByName: data.createdByName ?? '',
    createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
  };
}

const MOVEMENT_TYPES = {
  manual: 'adjustment',
  delivery: 'stock_in',
  stock_in: 'stock_in',
  sale: 'sale',
  adjustment: 'adjustment',
  return: 'return',
  order_fulfillment: 'order_fulfilment',
  order_fulfilment: 'order_fulfilment',
  transfer: 'transfer',
};

export function fixSale(data) {
  return {
    ...untenant(strip(data, ['prodId', 'distId', 'qty', 'totalValue'])),
    productId: data.prodId ?? data.productId ?? '',
    productName: data.prodName ?? data.productName ?? '',
    distributorId: data.distId ?? data.distributorId ?? '',
    distributorName: data.distName ?? data.distributorName ?? '',
    quantity: Number(data.qty ?? data.quantity ?? 0),
    total: Number(data.totalValue ?? data.total ?? 0),
  };
}

const LEGACY_ROLES = {
  superadmin: 'super_admin',
  'super-admin': 'super_admin',
  warehouse: 'warehouse_manager',
  finance: 'finance_manager',
  operations: 'operations_manager',
  ops: 'operations_manager',
  rep: 'sales_rep',
  salesrep: 'sales_rep',
  'sales-rep': 'sales_rep',
};

export function normaliseRole(raw) {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  /*
   * `?? 'distributor'` did not fire here: the fallback was `value ??`, and an
   * empty string is not nullish. Documents with no role were migrated with
   * `role: ''`, which matches no `hasRole()` check in the rules and no branch
   * in `tiles.ts` — an account that can sign in and see nothing at all.
   * `distributor` is the right floor: it is the least-privileged role there is.
   */
  if (!value) return 'distributor';
  return LEGACY_ROLES[value] ?? value;
}

function strip(data, keys) {
  const out = { ...data };
  for (const key of keys) delete out[key];
  return out;
}

/**
 * The fields the subtree makes redundant, removed on the way in.
 *
 * In the flat database every document carried the tenant on itself, because
 * there was nowhere else to put it, and every query began by filtering on it.
 * Inside `orgs/{orgId}/…` the path carries it, `requireOrg()` enforces it, and
 * the rules test membership of the path rather than of a field — so the field
 * is not merely unused, it is a second source of truth that can disagree with
 * the first. `companyId` and `tenantId` are the two other names the same idea
 * went by in older builds.
 *
 * `users` is the deliberate exception and is stamped rather than stripped: it
 * is a ROOT collection, because signing in yields a uid and nothing else, so
 * something readable before a tenant is known has to say which tenant a uid
 * belongs to.
 */
const TENANT_FIELDS = ['orgId', 'companyId', 'tenantId'];

/**
 * The abbreviations the flat schema used, and what the types call them now.
 *
 * WHY THIS IS ONE TABLE AND NOT A SHAPE FUNCTION PER COLLECTION
 *
 * `distId`, `prodId`, `qty` and `totalValue` are not per-collection quirks —
 * they are house style from the old codebase and they appear on orders, sales,
 * invoices, returns, movements and stock alike. Writing a shape function for
 * each collection meant the collections somebody remembered to write one for
 * were converted and the rest were copied verbatim: a migrated invoice kept
 * `distId`, so `listInvoices({ distributorId })` matched nothing and every
 * statement came out empty. That is a silent, total failure of a screen, found
 * by a customer.
 *
 * A rename only fires when the destination is absent, so a shape function that
 * has already computed the field — `fixOrder` summing `lineTotal` into `total`
 * — keeps its answer and the legacy key is simply dropped.
 */
const LEGACY_NAMES = {
  distId: 'distributorId',
  distName: 'distributorName',
  prodId: 'productId',
  prodName: 'productName',
  invId: 'invoiceId',
  invNumber: 'invoiceNumber',
  qty: 'quantity',
  totalValue: 'total',
  createdByUid: 'createdBy',
};

export function renameLegacy(data) {
  const out = { ...data };
  for (const [from, to] of Object.entries(LEGACY_NAMES)) {
    if (!(from in out)) continue;
    if (out[to] === undefined || out[to] === null || out[to] === '') out[to] = out[from];
    delete out[from];
  }
  return out;
}

export function untenant(data) {
  return strip(data, TENANT_FIELDS);
}

/* The old shape kept payments as an array of plain objects on the invoice, so
   the field names are whatever that build happened to use. */
/**
 * An invoice, minus the payments that are now their own documents.
 *
 * `explodeInvoicePayments` writes each element of this array into
 * `orgs/{orgId}/payments`. Leaving the array on the invoice as well would mean
 * two copies of the same money — and Firestore automatically indexes every
 * subfield of every element, so the copy nobody reads is also the one that
 * costs the most to store.
 */
export function fixInvoice(data) {
  return {
    ...strip(data, ['payments']),
    amountPaid: Number(
      data.amountPaid ??
        data.totalPaid ??
        (Array.isArray(data.payments)
          ? data.payments.reduce((sum, row) => sum + Number(row?.amount ?? 0), 0)
          : 0),
    ),
  };
}

export function fixPayment(data) {
  /*
   * Built field by field rather than spread-and-strip.
   *
   * These rows came out of an array inside an invoice, where nothing enforced
   * a shape — so across a few years of the old app they carry whichever names
   * that month's code used, plus whatever else somebody attached. Listing what
   * a payment IS guarantees nothing else survives; a strip list only removes
   * the legacy names somebody remembered to think of.
   */
  return {
    invoiceId: data.invoiceId ?? data.invId ?? '',
    invoiceNumber: data.invoiceNumber ?? data.invNumber ?? '',
    distributorId: data.distributorId ?? data.distId ?? '',
    amount: Number(data.amount ?? 0),
    method: ['transfer', 'cash', 'cheque', 'card'].includes(data.method) ? data.method : 'transfer',
    reference: data.reference ?? data.ref ?? null,
    paidOn: data.paidOn ?? data.date ?? '',
    recordedBy: data.recordedBy ?? data.createdBy ?? '',
    recordedByName: data.recordedByName ?? data.createdByName ?? '',
    createdAt: data.createdAt ?? data.date ?? FieldValue.serverTimestamp(),
  };
}

/* ------------------------------------------------------------------ run */

async function copyCollection({ from, to, id, shape }) {
  const snap = await db.collection(from).get();
  if (snap.empty) {
    console.log(`  ${from.padEnd(22)} — empty, skipped`);
    return 0;
  }

  let written = 0;
  /* Batches of 400, not 500. Firestore's limit is 500 operations, and leaving
     headroom means a shape function that later adds a second write per document
     does not silently start failing at scale. */
  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const newId = id ? id(data, doc.id) : doc.id;
    const payload = untenant(renameLegacy(shape ? shape(data) : data));
    const ref = db.collection(`orgs/${ORG_ID}/${to}`).doc(newId);

    if (DRY) {
      if (written < 2) console.log(`    would write orgs/${ORG_ID}/${to}/${newId}`);
    } else {
      batch.set(ref, payload, { merge: true });
      pending += 1;
      if (pending >= 400) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
    written += 1;
  }

  if (!DRY && pending > 0) await batch.commit();
  console.log(`  ${from.padEnd(22)} → ${to.padEnd(18)} ${written} documents`);
  return written;
}

/**
 * Turn the payments that lived on the invoice into their own documents.
 *
 * The old build stored them as `invoice.payments: [{ amount, date, … }]`,
 * which answers "what has been paid on this invoice" and nothing else. A
 * statement asks the opposite question — what has this account paid, across
 * every invoice, in date order — and an array inside forty documents cannot be
 * queried that way at all.
 *
 * The id is derived from the invoice and the index rather than auto-generated,
 * so re-running the migration overwrites the same document instead of creating
 * a second copy of every payment. That idempotence is the whole reason the ids
 * in this script are deterministic.
 */
async function explodeInvoicePayments() {
  const snap = await db.collection('invoices').get();
  if (snap.empty) {
    console.log('  invoice payments       — no invoices, skipped');
    return 0;
  }

  let batch = db.batch();
  let pending = 0;
  let written = 0;

  for (const doc of snap.docs) {
    const invoice = doc.data();
    const rows = Array.isArray(invoice.payments) ? invoice.payments : [];

    for (const [index, row] of rows.entries()) {
      const payload = fixPayment({
        ...row,
        invoiceId: doc.id,
        invoiceNumber: invoice.invoiceNumber ?? invoice.invNumber ?? '',
        distributorId: invoice.distributorId ?? invoice.distId ?? '',
      });
      const ref = db.doc(`orgs/${ORG_ID}/payments/${doc.id}_${index}`);

      if (DRY) {
        if (written < 2) console.log(`    would write orgs/${ORG_ID}/payments/${doc.id}_${index}`);
      } else {
        batch.set(ref, payload, { merge: true });
        pending += 1;
        if (pending >= 400) {
          await batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
      written += 1;
    }
  }

  if (!DRY && pending > 0) await batch.commit();
  console.log(`  invoice payments       → payments           ${written} documents`);
  return written;
}

/**
 * Set each document counter past the highest number already issued.
 *
 * WHY THIS IS THE MOST IMPORTANT FUNCTION IN THE FILE
 *
 * The flat app numbered documents by counting the collection. The tenant build
 * uses a counter document per tenant per prefix per year, incremented inside a
 * transaction — which is the only way two reps submitting in the same second
 * get different numbers. But a counter that does not exist reads as zero, so
 * the first order raised after a migration is `PO-2026-0001`, and there is
 * already a `PO-2026-0001` that a distributor has in an email.
 *
 * Duplicate document numbers are not a display bug. An invoice number is in
 * somebody's accounts ledger, and two invoices sharing one is the kind of thing
 * that is found months later by an auditor rather than minutes later by a
 * developer. So the counters are seeded from the data, and seeded HIGH: the
 * maximum sequence already present, per year, not the document count — because
 * a cancelled order still consumed its number and counting the survivors would
 * hand that number out again.
 */
/**
 * The highest sequence already used, per year, for one prefix.
 *
 * `PREFIX-YYYY-NNNN` only. An old free-text number, or a number that came from
 * another system, is ignored rather than guessed at — guessing here means
 * seeding the counter LOW, which is the failure that hands out a duplicate.
 * Ignoring means the counter is seeded from the numbers this app itself
 * issued, which are the ones it is about to continue.
 *
 * Exported for `tests/migrate.test.mjs`.
 */
export function highestSequences(values, prefix) {
  const highest = new Map();
  for (const value of values) {
    const match = /^([A-Z]+)-(\d{4})-(\d+)$/.exec(String(value ?? ''));
    if (!match || match[1] !== prefix) continue;
    const [, , year, seq] = match;
    highest.set(year, Math.max(highest.get(year) ?? 0, Number(seq)));
  }
  return highest;
}

async function seedCounters() {
  const SOURCES = [
    { collection: 'orders', field: 'orderNumber', prefix: 'PO' },
    { collection: 'invoices', field: 'invoiceNumber', prefix: 'INV' },
    { collection: 'returns', field: 'returnNumber', prefix: 'RET' },
  ];

  let seeded = 0;

  for (const { collection, field, prefix } of SOURCES) {
    /* Read from the NEW location: the copy above may have reshaped things, and
       seeding from what was actually written is the only honest source. */
    const snap = await db.collection(`orgs/${ORG_ID}/${collection}`).get().catch(() => null);
    if (!snap || snap.empty) continue;

    const highest = highestSequences(
      snap.docs.map((doc) => doc.data()[field]),
      prefix,
    );

    for (const [year, value] of highest) {
      const path = `orgs/${ORG_ID}/counters/${prefix}-${year}`;
      if (DRY) {
        console.log(`    would set ${path} = ${value} (next: ${prefix}-${year}-${String(value + 1).padStart(4, '0')})`);
      } else {
        await db.doc(path).set({ value, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      seeded += 1;
    }
  }

  console.log(`  counters               → ${DRY ? 'would seed' : 'seeded'} ${seeded} sequence${seeded === 1 ? '' : 's'}`);
}

async function stampUsers() {
  const snap = await db.collection('users').get();
  let batch = db.batch();
  let pending = 0;
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    /* An owner belongs to the platform, not to a tenant — see `tenant.ts`. */
    if (normaliseRole(data.role) === 'owner') continue;

    const patch = { orgId: ORG_ID, role: normaliseRole(data.role) };
    if (DRY) {
      if (count < 2) console.log(`    would stamp users/${doc.id} → ${JSON.stringify(patch)}`);
    } else {
      batch.set(doc.ref, patch, { merge: true });
      pending += 1;
      if (pending >= 400) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
    count += 1;
  }

  if (!DRY && pending > 0) await batch.commit();
  console.log(`  users                  → stamped ${count} profiles with orgId=${ORG_ID}`);
}

async function main() {
  boot();
  console.log(`\n${DRY ? 'DRY RUN — nothing will be written' : 'MIGRATING'}`);
  console.log(`Organisation: ${ORG_ID} (${ORG_NAME})\n`);

  if (!DRY) {
    await db.doc(`orgs/${ORG_ID}`).set(
      {
        name: ORG_NAME,
        slug: ORG_ID.toLowerCase(),
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`  orgs/${ORG_ID} — tenant record created\n`);
  }

  let total = 0;
  for (const entry of MAP) {
    try {
      total += await copyCollection(entry);
    } catch (err) {
      /* A collection that does not exist is not an error — every deployment of
         the old app had a slightly different set. */
      console.log(`  ${entry.from.padEnd(22)} — not present (${err.code ?? 'error'})`);
    }
  }

  try {
    total += await explodeInvoicePayments();
  } catch (err) {
    console.log(`  invoice payments       — not present (${err.code ?? 'error'})`);
  }

  await stampUsers();

  /* Last, and after the copies, because it reads what they wrote. */
  await seedCounters();

  console.log(`\n${DRY ? 'Would copy' : 'Copied'} ${total} documents.`);
  console.log('The old root collections are untouched. Verify, then remove them by hand.');
  console.log('Next: firebase deploy --only firestore:indexes,firestore:rules\n');
}

/* Run only when invoked directly; importing this file does nothing. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('\nMigration failed:', err);
    process.exit(1);
  });
}
