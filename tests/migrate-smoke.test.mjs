/**
 * Run the whole migration, against a Firestore that only exists in memory, and
 * look at what actually landed.
 *
 * WHY THIS AND NOT JUST THE UNIT TESTS
 *
 * `migrate.test.mjs` checks the reshaping functions one at a time, and every
 * one of them passed while the migration was still producing a broken
 * database — because the bugs were not in any single function. They were in
 * which functions were wired to which collection. `invoices` had no shape
 * function at all, so a migrated invoice kept `distId`, so
 * `listInvoices({ distributorId })` matched nothing and every statement in the
 * new app came out empty. Nothing threw. Nothing was missing. The screen was
 * just blank, for the customer, in production.
 *
 * That class of bug is only visible end to end. So this runs `main()` over a
 * small but realistic flat database — documents stamped with `orgId`, payments
 * as an array on the invoice, abbreviated field names, a legacy role spelling —
 * and asserts on every document that comes out the other side.
 *
 * The Firestore emulator would be the right tool and this environment cannot
 * download it (see the README). This covers the step the emulator would cover
 * least well anyway: not whether the writes succeed, but whether the right
 * things were written.
 *
 * Run with `npm run test:migrate:smoke`.
 */

import { register } from 'node:module';

register('./fakes/loader.mjs', import.meta.url);

const { SEED, WRITES } = await import('./fakes/firebase-admin.mjs');

let passed = 0;
const failures = [];
const note = (what, ok, detail = '') => {
  if (ok) passed += 1;
  else failures.push(`${what}${detail ? `\n      ${detail}` : ''}`);
};

/* ------------------------------------------------- a flat database, as found */

/*
 * Every quirk here was in the real thing: the tenant on the document rather
 * than in the path, `distId`/`prodId`/`qty`/`totalValue`, payments nested in
 * the invoice, a cancelled order still holding its number, an order whose
 * author has no role recorded, and a `superadmin` spelling from an older build.
 */
SEED.set('products', [['p1', { orgId: 'bella', name: 'Bella Malt 33cl', status: 'active' }]]);
SEED.set('orders', [
  ['o1', {
    orgId: 'bella',
    orderNumber: 'PO-2026-0001',
    items: [{ prodId: 'p1', prodName: 'Bella Malt 33cl', qty: 10, unitPrice: 3950, totalValue: 39500 }],
    totalValue: 39500,
    createdByRole: 'salesrep',
  }],
  ['o2', { orgId: 'bella', orderNumber: 'PO-2026-0040', status: 'cancelled', items: [], totalValue: 0 }],
  ['o3', { orgId: 'bella', orderNumber: 'PO-2025-0112', items: [], totalValue: 0 }],
]);
SEED.set('invoices', [
  ['i1', {
    orgId: 'bella',
    invoiceNumber: 'INV-2026-0111',
    distId: 'd1',
    totalValue: 460000,
    payments: [{ amount: '200000', method: 'bank', date: '2026-09-12', ref: 'GTB/8842119' }],
  }],
  ['i2', { orgId: 'bella', invoiceNumber: 'INV-2026-0007', distId: 'd2', totalValue: 10000, payments: [] }],
]);
SEED.set('sales', [['s1', { orgId: 'bella', prodId: 'p1', distId: 'd1', qty: 4, totalValue: 15800 }]]);
SEED.set('users', [
  ['u1', { role: 'superadmin' }],
  ['u2', { role: 'owner' }],
]);

/* --------------------------------------------------------------------- run */

process.env.FIREBASE_SERVICE_ACCOUNT = new URL('./fakes/service-account.json', import.meta.url).pathname;
process.argv = [
  process.argv[0],
  new URL('../scripts/migrate-to-tenants.mjs', import.meta.url).pathname,
  '--org', 'bella',
  '--name', 'Bella Group',
];

const quiet = console.log;
console.log = () => {};
await import('../scripts/migrate-to-tenants.mjs');
await new Promise((resolve) => setTimeout(resolve, 200));
console.log = quiet;

const at = (path) => WRITES.get(path)?.data;

/* ------------------------------------------ the tenant is in the path only */

const tenantDocs = [...WRITES].filter(([path]) => path.startsWith('orgs/bella/'));
note('the migration wrote something', tenantDocs.length > 0);

const leaked = tenantDocs.filter(([, { data }]) =>
  ['orgId', 'companyId', 'tenantId'].some((f) => f in data),
);
note(
  'no migrated document carries the tenant as a field',
  leaked.length === 0,
  leaked.map(([p]) => p).join(', '),
);

note('the user profile is stamped, because users is a root collection', at('u1')?.orgId === 'bella');
note('an owner belongs to the platform and is not stamped', !WRITES.has('u2'));
note('a legacy role spelling is normalised on the way', at('u1')?.role === 'super_admin');

/* ----------------------------------------------- the field names are current */

const invoice = at('orgs/bella/invoices/i1');
note('an invoice gained distributorId', invoice?.distributorId === 'd1', JSON.stringify(invoice));
note('an invoice lost distId', !('distId' in (invoice ?? {})));
note('totalValue became total', invoice?.total === 460000);

const sale = at('orgs/bella/sales/s1');
note('a sale gained productId and distributorId', sale?.productId === 'p1' && sale?.distributorId === 'd1');
note('a sale lost the abbreviations', !('prodId' in (sale ?? {})) && !('qty' in (sale ?? {})));

const order = at('orgs/bella/orders/o1');
note('an order`s items became lines', Array.isArray(order?.lines) && order.lines.length === 1);
note('a line carries the current field names', order?.lines[0]?.productId === 'p1' && order.lines[0].quantity === 10);
note('the order total survived the rename', order?.total === 39500, JSON.stringify(order?.total));
note('an order lost totalValue', !('totalValue' in (order ?? {})));
note('a legacy author role is normalised', order?.createdByRole === 'sales_rep');
note(
  'an order with no author role gets the least-privileged one, not an empty string',
  at('orgs/bella/orders/o3')?.createdByRole === 'distributor',
);

/* ------------------------------------- payments became their own documents */

const payment = at('orgs/bella/payments/i1_0');
note('a payment on an invoice became a document', Boolean(payment), [...WRITES.keys()].join(', '));
note('it knows its account, so a statement can find it', payment?.distributorId === 'd1');
note('its amount is a number', payment?.amount === 200000);
note('its method is one the app understands', payment?.method === 'transfer');
note('the array is not also left on the invoice', !('payments' in (invoice ?? {})));
note('the invoice knows what has been paid', invoice?.amountPaid === 200000);
note('an invoice with no payments is still zeroed, not undefined', at('orgs/bella/invoices/i2')?.amountPaid === 0);

/* ----------------------------------------------- the counters carry on from */

/*
 * THE ONE THAT MATTERS MOST.
 *
 * `PO-2026-0040` exists and is cancelled. A counter seeded from the number of
 * surviving documents, or not seeded at all, hands `PO-2026-0001` — or
 * `PO-2026-0040` — to the next order somebody raises, and two orders share a
 * number that a distributor has in an email.
 */
note('the PO counter continues past the highest number used', at('orgs/bella/counters/PO-2026')?.value === 40);
note('a cancelled order still holds its number', at('orgs/bella/counters/PO-2026')?.value !== 2);
note('counters are per year', at('orgs/bella/counters/PO-2025')?.value === 112);
note('the invoice counter is seeded too', at('orgs/bella/counters/INV-2026')?.value === 111);
note(
  'a year with no documents gets no counter, rather than one set to zero',
  !WRITES.has('orgs/bella/counters/RET-2026'),
);

/* -------------------------------------------------- the tenant record itself */

note('the tenant record exists', at('orgs/bella')?.name === 'Bella Group');
note('the old root collections are untouched', ![...WRITES.keys()].some((p) => p.startsWith('orders/')));

/* ------------------------------------------------------------------ report */

console.log(`\n${passed} migration smoke checks passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFAILURES:\n' + failures.map((f) => '  x ' + f).join('\n'));
  process.exit(1);
}
