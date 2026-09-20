/**
 * The migration's reshaping, checked without a database.
 *
 * WHY THIS IS WORTH TESTING AND THE REST OF THE SCRIPT IS NOT
 *
 * A migration runs once per customer, against their real data, usually late at
 * night, and its mistakes are not recoverable by pressing undo. The batching,
 * the retry and the dry-run printing are all things you can watch happen. What
 * you cannot watch is the reshaping: a field quietly carried forward, a number
 * parsed wrong, a counter seeded one too low. Those produce a database that
 * looks completely fine and is wrong six weeks later.
 *
 * All three of the things checked here are consequences of the move from a flat
 * database to `orgs/{orgId}/…`, which is exactly the class of bug that survived
 * the original port.
 *
 * Run with `npm run test:migrate`.
 */

import {
  fixOrder,
  fixPayment,
  fixSale,
  highestSequences,
  normaliseRole,
  untenant,
} from '../scripts/migrate-to-tenants.mjs';

let passed = 0;
const failures = [];
const note = (what, ok, detail = '') => {
  if (ok) passed += 1;
  else failures.push(`${what}${detail ? `\n      ${detail}` : ''}`);
};
const same = (what, actual, expected) =>
  note(what, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}`);

/* ------------------------------------------- the tenant field is not carried */

/*
 * The document's path says which tenant it belongs to. A leftover `orgId`
 * field is a second source of truth that can disagree with the first — and it
 * will, the first time somebody clones an organisation's data to set up a
 * second one.
 */
for (const field of ['orgId', 'companyId', 'tenantId']) {
  const out = untenant({ [field]: 'bella', name: 'Bella Malt 33cl' });
  note(`untenant drops ${field}`, !(field in out));
  note(`untenant keeps everything else (${field})`, out.name === 'Bella Malt 33cl');
}

note(
  'untenant does not mutate its input',
  (() => {
    const input = { orgId: 'bella', name: 'x' };
    untenant(input);
    return input.orgId === 'bella';
  })(),
);

note('an order loses its tenant field', !('orgId' in fixOrder({ orgId: 'bella', items: [] })));
note('a sale loses its tenant field', !('orgId' in fixSale({ orgId: 'bella' })));
note('a payment loses its tenant field', !('orgId' in fixPayment({ orgId: 'bella' })));

/* -------------------------------------------------- counters are seeded high */

/*
 * THE FAILURE THIS PREVENTS
 *
 * Numbering moved from "count the collection" to a per-tenant counter. A
 * counter that does not exist reads as zero, so the first order after a
 * migration is PO-2026-0001 — a number a distributor already has in an email.
 */
const numbers = ['PO-2026-0001', 'PO-2026-0040', 'PO-2026-0007', 'PO-2025-0112', 'INV-2026-0900'];
const po = highestSequences(numbers, 'PO');
note('the counter is the highest number, not the count', po.get('2026') === 40, `got ${po.get('2026')}`);
note('counters are kept per year', po.get('2025') === 112, `got ${po.get('2025')}`);
note('another prefix is not counted', !String([...po.values()]).includes('900'));

note(
  'a cancelled order still holds its number',
  /*
   * Seeding from the document COUNT rather than the maximum would re-issue the
   * numbers of cancelled orders — which still exist, are still quoted, and are
   * kept rather than deleted precisely because of that.
   */
  highestSequences(['PO-2026-0001', 'PO-2026-0009'], 'PO').get('2026') === 9,
);

for (const junk of ['', null, undefined, 'INVOICE 42', 'PO/2026/0001', 'PO-26-1']) {
  note(
    `an unparseable number is ignored, not guessed: ${JSON.stringify(junk)}`,
    highestSequences([junk], 'PO').size === 0,
  );
}

/* ----------------------------------- payments become documents, not an array */

/*
 * They used to live as an array on the invoice, which answers "what has been
 * paid on this invoice" and cannot answer "what has this account paid" — the
 * question a statement is.
 */
const payment = fixPayment({
  invId: 'i7',
  invNumber: 'INV-2026-0111',
  distId: 'd1',
  amount: '200000',
  method: 'bank',
  date: '2026-09-12',
});
note(
  'a legacy payment is reshaped to the current type',
  payment.invoiceId === 'i7' &&
    payment.invoiceNumber === 'INV-2026-0111' &&
    payment.distributorId === 'd1' &&
    payment.amount === 200000 &&
    payment.method === 'transfer' &&
    payment.paidOn === '2026-09-12',
  JSON.stringify(payment),
);
note(
  'nothing from the legacy shape survives',
  !('invId' in payment) && !('date' in payment) && !('distId' in payment),
  `leaked: ${Object.keys(payment).filter((k) => ['invId', 'date', 'distId'].includes(k)).join(', ')}`,
);
note(
  'a field nobody anticipated does not ride along',
  !('someOldFlag' in fixPayment({ someOldFlag: true })),
);
note('an amount stored as a string becomes a number', typeof payment.amount === 'number');
note(
  'an unrecognised method falls back rather than storing junk',
  fixPayment({ method: 'momo' }).method === 'transfer',
);
note('a known method is kept', fixPayment({ method: 'cheque' }).method === 'cheque');

/* ------------------------------------------------------------ legacy roles */

same(
  'legacy role spellings are normalised',
  ['superadmin', 'sales-rep', 'finance', 'ops', 'distributor'].map(normaliseRole),
  ['super_admin', 'sales_rep', 'finance_manager', 'operations_manager', 'distributor'],
);

/* ------------------------------------------------------------------ report */

console.log(`\n${passed} migration checks passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFAILURES:\n' + failures.map((f) => '  x ' + f).join('\n'));
  process.exit(1);
}
