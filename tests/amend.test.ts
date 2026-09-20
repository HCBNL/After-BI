/**
 * The amendment policy, as a truth table.
 *
 * Every row is a sentence somebody said about the old app — "I couldn't recall
 * my own order", "only an admin should touch it once it's approved" — turned
 * into an assertion.
 *
 * This tests `lib/amend.ts`, which decides whether a button is drawn.
 * `firestore.rules` mirrors it and decides whether the write lands; the two are
 * written to be read side by side, and where they disagree the rules win.
 */

import {
  amendmentFor,
  distributorAccess,
  invoiceAmendment,
  orderAmendment,
  saleStage,
  orderStage,
  invoiceStage,
} from '../src/lib/amend';
import type { Order, Role, UserProfile } from '../src/types';

let passed = 0;
const failures: string[] = [];

function check(what: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed += 1;
  else failures.push(`${what}\n      expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const person = (role: Role, id = 'me', distributorId?: string): UserProfile => ({
  id, email: `${id}@x.ng`, firstName: 'A', lastName: 'B', role, active: true, orgId: 'o1', distributorId,
});

const order = (status: Order['status'], createdBy: string, distributorId = 'd1'): Order => ({
  id: 'o', orderNumber: 'PO-1', distributorId, distributorName: 'D', lines: [], total: 1000,
  status, approvers: [], approverNames: {}, approvals: [],
  createdBy, createdByName: 'X', createdByRole: 'sales_rep', createdAt: '2026-01-01T00:00:00Z',
});

/* ---------------- stage mapping ---------------- */
check('draft maps to open', orderStage('draft'), 'open');
check('pending_approval maps to submitted', orderStage('pending_approval'), 'submitted');
check('approved maps to settled', orderStage('approved'), 'settled');
check('fulfilled maps to settled', orderStage('fulfilled'), 'settled');
check('invoice issued maps to submitted', invoiceStage('issued'), 'submitted');
check('invoice paid maps to settled', invoiceStage('paid'), 'settled');

/* ---------------- a rep can fix their own draft ---------------- */
{
  const v = orderAmendment(person('sales_rep', 'me', 'd1'), order('draft', 'me'));
  check('rep edits own draft', v.canEdit, true);
  check('rep cancels own draft', v.canCancel, true);
}

/* ---------------- a rep can RECALL their own submitted order ---------------- */
{
  const v = orderAmendment(person('sales_rep', 'me', 'd1'), order('pending_approval', 'me'));
  check('rep recalls own submitted order', v.canRecall, true);
  check('rep cannot edit in place while submitted', v.canEdit, false);
  check('recall is explained, not blank', v.reason.length > 20, true);
}

/* ---------------- a rep may NOT touch a colleague's in-flight order ---------------- */
{
  const v = orderAmendment(person('sales_rep', 'me', 'd1'), order('pending_approval', 'other'));
  check('rep cannot recall a colleagues submitted order', v.canRecall, false);
  check('rep cannot edit a colleagues submitted order', v.canEdit, false);
}

/* ---------------- but a peer CAN fix a colleague's DRAFT ---------------- */
{
  const v = orderAmendment(person('staff', 'me'), order('draft', 'other'));
  check('staff fixes a colleagues draft', v.canEdit, true);
}

/* ---------------- only admin once approved ---------------- */
{
  const rep = orderAmendment(person('sales_rep', 'me', 'd1'), order('approved', 'me'));
  check('rep cannot edit their own approved order', rep.canEdit, false);
  check('rep is told why', rep.reason.includes('administrator'), true);

  const admin = orderAmendment(person('admin', 'boss'), order('approved', 'me'));
  check('admin edits an approved order', admin.canEdit, true);
  check('admin edit is flagged an override', admin.byOverride, true);

  const sa = orderAmendment(person('super_admin', 'boss'), order('fulfilled', 'me'));
  check('super admin amends a fulfilled order', sa.canEdit, true);
}

/* ---------------- admin may amend in flight without recalling ---------------- */
{
  const v = orderAmendment(person('admin', 'boss'), order('pending_approval', 'someone'));
  check('admin edits a submitted order in place', v.canEdit, true);
  check('admin can also recall it', v.canRecall, true);
}

/* ---------------- tenancy: a partner cannot reach another account ---------------- */
{
  const v = orderAmendment(person('distributor', 'me', 'd1'), order('draft', 'me', 'd2'));
  check('distributor blocked from another account order', v.canEdit, false);
  check('and told it belongs to another account', v.reason.includes('another account'), true);
}

/* ---------------- the ledger is closed to everyone ---------------- */
{
  const v = amendmentFor(person('super_admin', 'boss'), { stage: 'locked', noun: 'stock movement' });
  check('super admin cannot edit the ledger', v.canEdit, false);
  check('super admin cannot cancel a ledger entry', v.canCancel, false);
  check('and is told to use an opposite entry', v.reason.includes('opposite entry'), true);
}

/* ---------------- sell-out: this month is the authors, older is admins ---------------- */
{
  const now = new Date('2026-09-14T10:00:00Z');
  check('sale this month is open', saleStage('2026-09-02', now), 'open');
  check('sale last month is settled', saleStage('2026-08-30', now), 'settled');

  const mine = amendmentFor(person('sales_rep', 'me', 'd1'), {
    stage: saleStage('2026-09-02', now), authorId: 'me', distributorId: 'd1', noun: 'sell-out record',
  });
  check('rep fixes own sale inside the month', mine.canEdit, true);

  const old = amendmentFor(person('sales_rep', 'me', 'd1'), {
    stage: saleStage('2026-08-02', now), authorId: 'me', distributorId: 'd1', noun: 'sell-out record',
  });
  check('rep cannot rewrite a reported month', old.canEdit, false);

  const boss = amendmentFor(person('admin', 'boss'), {
    stage: saleStage('2026-08-02', now), authorId: 'me', noun: 'sell-out record',
  });
  check('admin corrects a reported month', boss.canEdit, true);
}

/* ---------------- a shipped order cannot be cancelled by anyone ---------------- */
{
  const admin = orderAmendment(person('admin', 'boss'), order('fulfilled', 'me'));
  check('admin can still amend a fulfilled order', admin.canEdit, true);
  check('but cannot cancel it — the stock has gone', admin.canCancel, false);

  const cancelled = orderAmendment(person('admin', 'boss'), order('cancelled', 'me'));
  check('an already-cancelled order offers no cancel', cancelled.canCancel, false);

  const approved = orderAmendment(person('admin', 'boss'), order('approved', 'me'));
  check('an approved (unshipped) order can still be cancelled', approved.canCancel, true);
}

/* ---------------- finance owns invoices while they are in flight ------------- */
{
  const issued = (createdBy, amountPaid = 0) => ({
    id: 'i', invoiceNumber: 'INV-1', distributorId: 'd1', distributorName: 'D',
    lines: [], total: 1000, amountPaid, status: 'issued', issuedOn: '2026-09-01',
    dueOn: '2026-10-01', createdBy, createdAt: '2026-09-01T00:00:00Z',
  });

  const finance = invoiceAmendment(person('finance_manager', 'me'), issued('someone-else'));
  check('finance edits an issued invoice they did not raise', finance.canEdit, true);
  check('and that is their job, not an override', finance.byOverride, false);

  const staff = invoiceAmendment(person('staff', 'me'), issued('someone-else'));
  check('staff cannot edit an issued invoice', staff.canEdit, false);

  const paid = invoiceAmendment(person('finance_manager', 'me'), { ...issued('me'), status: 'paid' });
  check('a paid invoice is admin-only, even for finance', paid.canEdit, false);

  const partPaid = invoiceAmendment(person('finance_manager', 'me'), issued('me', 400));
  check('an invoice with money against it cannot be voided', partPaid.canCancel, false);
}

/* ---------------- customer details: split by field, not by role ---------------- */
{
  const admin = distributorAccess(person('admin', 'boss'), 'd1');
  check('admin edits contact details', admin.canEditContact, true);
  check('admin edits commercial terms', admin.canEditTerms, true);

  const staff = distributorAccess(person('staff', 'me'), 'd1');
  check('staff edits contact details', staff.canEditContact, true);
  check('staff cannot change the price tier', staff.canEditTerms, false);

  const ownRep = distributorAccess(person('sales_rep', 'me', 'd1'), 'd1');
  check('rep fixes their own accounts contact details', ownRep.canEditContact, true);
  check('rep cannot change that accounts credit limit', ownRep.canEditTerms, false);

  const otherRep = distributorAccess(person('sales_rep', 'me', 'd1'), 'd2');
  check('rep cannot touch another account at all', otherRep.canEditContact, false);

  const partner = distributorAccess(person('distributor', 'me', 'd1'), 'd1');
  check('distributor fixes their own contact details', partner.canEditContact, true);
  check('distributor cannot change their own credit limit', partner.canEditTerms, false);

  const warehouse = distributorAccess(person('warehouse_manager', 'me'), 'd1');
  check('warehouse manager does not edit customers', warehouse.canEditContact, false);
}

/* ---------------- a null user never gets a live control ---------------- */
{
  const v = orderAmendment(null, order('draft', 'me'));
  check('unauthenticated gets nothing', [v.canEdit, v.canRecall, v.canCancel], [false, false, false]);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFAILURES:\n' + failures.map((f) => '  x ' + f).join('\n'));
  process.exit(1);
}
