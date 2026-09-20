/**
 * Every read and write in the app, in one module.
 *
 * WHY A SINGLE FILE AND NOT A HOOK PER SCREEN
 *
 * Because of `tenant.ts`. The whole safety argument there — that a path without
 * an org id is not a valid path — only holds if there is one place that builds
 * paths. Thirty screens each calling `collection(db, …)` is thirty chances to
 * write a root collection name by habit, and the version of AfterBI this
 * replaces did exactly that in 37 files. Here, a screen cannot reach Firestore
 * except through a function below, and every function below goes through
 * `orgPath`, which throws when no organisation is active.
 *
 * WHAT A FUNCTION IN HERE OWES ITS CALLER
 *
 *   - It returns plain typed objects with an `id`, never a `QuerySnapshot`. A
 *     screen that has to know about `.docs.map(d => ({...d.data()}))` is a
 *     screen that knows about Firestore, and those are the screens that end up
 *     with a stray query in them.
 *   - It never throws for "nothing found". An empty list is an empty array.
 *   - It does its own ordering. A caller that sorts is a caller that will
 *     disagree with the next caller.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit as fsLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS, orgPath, requireOrg, TENANTS, type CollectionKey } from './tenant';
import { naira, todayISO } from './format';
import type {
  Distributor,
  Invoice,
  Lead,
  Order,
  OrderLine,
  OrderStatus,
  OrgSettings,
  Payment,
  Product,
  InvoiceStatus,
  ReturnRecord,
  ReturnStatus,
  Role,
  Sale,
  StockMovement,
  StockPosition,
  Target,
  UserProfile,
  Warehouse,
} from '@/types';

/* ------------------------------------------------------------- plumbing */

/**
 * A Firestore document as a typed object.
 *
 * `Timestamp` values are converted to ISO strings on the way out, so nothing
 * above this line ever holds a Firestore type. That matters more than it looks:
 * a `Timestamp` renders as `[object Object]`, sorts wrong against a string, and
 * cannot be put in a URL — and every one of those bugs is found in the UI, a
 * long way from the query that caused it.
 */
function shape<T>(id: string, data: DocumentData): T {
  const out: DocumentData = { id };
  for (const [key, value] of Object.entries(data)) {
    out[key] =
      value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function'
        ? (value as { toDate(): Date }).toDate().toISOString()
        : value;
  }
  return out as T;
}

async function list<T>(key: CollectionKey, ...constraints: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(collection(db, orgPath(key)), ...constraints));
  return snap.docs.map((d) => shape<T>(d.id, d.data()));
}

async function one<T>(key: CollectionKey, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, orgPath(key), id));
  return snap.exists() ? shape<T>(snap.id, snap.data()) : null;
}

/* -------------------------------------------------------------- document numbers */

/**
 * The next `PO-2026-0041`, allocated without two people getting the same one.
 *
 * A counter document incremented inside a transaction, NOT `count() + 1` over
 * the collection. Two reps submitting an order in the same second both read the
 * same count and both write `PO-2026-0041`; the transaction makes the second
 * one retry and get `0042`. This is the only correct way to do it in Firestore
 * and it costs one extra document write per order.
 *
 * The year is part of the key, so the sequence restarts each January — which is
 * what every Nigerian accounts department expects a PO book to do.
 *
 * Not exported: a document number is allocated as part of creating the document
 * it belongs to, never on its own. A caller that could take a number without
 * writing the record would burn one, and the gap in the sequence is exactly what
 * somebody asks about.
 */
async function nextNumber(prefix: 'PO' | 'INV' | 'RET'): Promise<string> {
  const year = new Date().getFullYear();
  const ref = doc(db, orgPath('counters'), `${prefix}-${year}`);

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists() ? (snap.data().value as number) : 0) + 1;
    tx.set(ref, { value: next, updatedAt: serverTimestamp() }, { merge: true });
    return next;
  });

  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/* ------------------------------------------------------------------ users */

/**
 * `users/{uid}` is a ROOT collection, deliberately. See `tenant.ts`.
 *
 * Signing in gives us a uid and nothing else; this document is what tells us
 * which organisation the session belongs to. A per-org user collection would
 * need the org id to find the document that contains the org id.
 *
 * There is no `getProfile` here on purpose: `AuthContext` subscribes to this
 * document with `onSnapshot` rather than reading it once, so a role change or a
 * suspension reaches an open session in a second rather than at the next
 * reload. A one-shot read would only have been a second, staler way to ask.
 */
export async function updateProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() });
}

/**
 * Everybody in this organisation.
 *
 * Queried by `orgId` on the root collection rather than from a subtree — the
 * one place in the app that filters instead of scoping, and it is safe only
 * because the rules refuse this query to anybody whose own `orgId` does not
 * match the filter. See the `users` block in `firestore.rules`; if that rule
 * is ever loosened, this function becomes a way to enumerate the platform.
 */
export async function listMembers(): Promise<UserProfile[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('orgId', '==', requireOrg()), orderBy('firstName')),
  );
  return snap.docs.map((d) => shape<UserProfile>(d.id, d.data()));
}

/* --------------------------------------------------------------- settings */

export async function getOrgSettings(): Promise<OrgSettings | null> {
  const snap = await getDoc(doc(db, orgPath('settings'), 'org'));
  return snap.exists() ? (shape<OrgSettings & { id: string }>(snap.id, snap.data()) as OrgSettings) : null;
}

export async function saveOrgSettings(patch: Partial<OrgSettings>): Promise<void> {
  await setDoc(
    doc(db, orgPath('settings'), 'org'),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/* --------------------------------------------------------------- products */

export function listProducts(activeOnly = false): Promise<Product[]> {
  return activeOnly
    ? list<Product>('products', where('status', '==', 'active'), orderBy('name'))
    : list<Product>('products', orderBy('name'));
}

export async function saveProduct(product: Partial<Product> & { id?: string }): Promise<string> {
  const { id, ...data } = product;
  if (id) {
    await updateDoc(doc(db, orgPath('products'), id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, orgPath('products')), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Products are retired, never deleted.
 *
 * A deleted product leaves every past order line pointing at nothing — and
 * because those lines carry their own snapshot of name and price, they would
 * still *render* correctly while any attempt to re-order or reconcile them
 * failed with a missing document. Setting `status: 'inactive'` takes it out of
 * the catalogue and leaves the history whole.
 */
export async function retireProduct(id: string): Promise<void> {
  await updateDoc(doc(db, orgPath('products'), id), {
    status: 'inactive',
    updatedAt: serverTimestamp(),
  });
}

/* ----------------------------------------------------------- distributors */

export function listDistributors(): Promise<Distributor[]> {
  return list<Distributor>('distributors', orderBy('company'));
}

export async function saveDistributor(
  distributor: Partial<Distributor> & { id?: string },
): Promise<string> {
  const { id, ...data } = distributor;
  if (id) {
    await updateDoc(doc(db, orgPath('distributors'), id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, orgPath('distributors')), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/* ----------------------------------------------------------------- orders */

export interface OrderFilter {
  status?: OrderStatus;
  /** Set by `partnerScope()` — a distributor or rep sees only their account. */
  distributorId?: string | null;
  max?: number;
}

export async function listOrders(filter: OrderFilter = {}): Promise<Order[]> {
  const constraints: QueryConstraint[] = [];
  if (filter.status) constraints.push(where('status', '==', filter.status));
  if (filter.distributorId) constraints.push(where('distributorId', '==', filter.distributorId));
  constraints.push(orderBy('createdAt', 'desc'));
  if (filter.max) constraints.push(fsLimit(filter.max));
  return list<Order>('orders', ...constraints);
}

export const getOrder = (id: string) => one<Order>('orders', id);

/**
 * A new order, numbered and priced.
 *
 * The caller hands in lines with a product and a quantity; this resolves the
 * price from the distributor's own tier and snapshots everything. A caller
 * cannot pass a price, on purpose — that is how a rep's screen ends up able to
 * discount an order by editing a field, with no record of who authorised it.
 */
export async function createOrder(input: {
  distributor: Pick<Distributor, 'id' | 'company' | 'category'>;
  lines: { product: Product; quantity: number }[];
  note?: string;
  author: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>;
  submit?: boolean;
  approvers?: { uid: string; name: string }[];
}): Promise<string> {
  const lines: OrderLine[] = input.lines.map(({ product, quantity }) => {
    const unitPrice = product.pricing[input.distributor.category] ?? 0;
    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      unit: product.unit,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const approvers = input.approvers ?? [];

  /*
   * AN ORDER NOBODY HAS TO SIGN IS APPROVED, NOT "AWAITING APPROVAL".
   *
   * This wrote `pending_approval` whenever `submit` was true, including when
   * the approver list was empty — which is every order in an organisation that
   * has left `approvalThreshold` at its default of zero, i.e. every new
   * organisation. Nothing could then move it: `decideOrder` requires the caller
   * to be in `approvers`, and the array was empty, so the order sat in the
   * queue forever and the depot never saw it. The first thing anybody did with
   * this product was raise an order that could not be fulfilled.
   *
   * Submitting with no required signature now means exactly what it says:
   * approved, ready to pick.
   */
  const status: OrderStatus = !input.submit ? 'draft' : approvers.length ? 'pending_approval' : 'approved';

  const ref = await addDoc(collection(db, orgPath('orders')), {
    orderNumber: await nextNumber('PO'),
    distributorId: input.distributor.id,
    distributorName: input.distributor.company,
    lines,
    total,
    status,
    ...(status === 'approved' ? { approvedAt: serverTimestamp() } : {}),
    approvers: approvers.map((a) => a.uid),
    approverNames: Object.fromEntries(approvers.map((a) => [a.uid, a.name])),
    approvals: [],
    note: input.note ?? null,
    createdBy: input.author.id,
    createdByName: `${input.author.firstName} ${input.author.lastName}`,
    createdByRole: input.author.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

/**
 * One approver's decision, and the status that follows from it.
 *
 * The status is derived here rather than sent by the caller: one rejection is a
 * rejection, and it takes every required approver to make an approval. A screen
 * that computed that itself would eventually compute it differently from
 * another screen, and an order would sit approved with a rejection on it.
 */
export async function decideOrder(
  orderId: string,
  decision: 'approved' | 'rejected',
  approver: Pick<UserProfile, 'id' | 'firstName' | 'lastName'>,
  note?: string,
): Promise<OrderStatus> {
  const ref = doc(db, orgPath('orders'), orderId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('That order no longer exists.');
    const order = snap.data() as Order;

    const approvals = [
      ...(order.approvals ?? []).filter((a) => a.uid !== approver.id),
      {
        uid: approver.id,
        name: `${approver.firstName} ${approver.lastName}`,
        decision,
        note: note ?? null,
        decidedAt: new Date().toISOString(),
      },
    ];

    const rejected = approvals.some((a) => a.decision === 'rejected');
    const required = order.approvers ?? [];
    const allSigned = required.every((uid) =>
      approvals.some((a) => a.uid === uid && a.decision === 'approved'),
    );

    const status: OrderStatus = rejected ? 'rejected' : allSigned ? 'approved' : 'pending_approval';

    tx.update(ref, {
      approvals,
      status,
      updatedAt: serverTimestamp(),
      ...(status === 'approved' ? { approvedAt: serverTimestamp() } : {}),
      ...(status === 'rejected' ? { rejectedAt: serverTimestamp() } : {}),
    });

    return status;
  });
}

/**
 * Fulfil an order: deduct the stock and write the ledger, or do neither.
 *
 * ALL OF IT IN ONE TRANSACTION, AND THAT IS THE WHOLE POINT.
 *
 * The version this replaces did the deduction in a loop of `updateDoc` calls in
 * `inventoryDeduction.js` with no transaction at all. A connection dropped
 * halfway through a six-line order left three products deducted, three not, the
 * order marked fulfilled, and a ledger that no longer reconciled to the
 * balances — which is discovered a month later during a stock count, by which
 * point nobody can say which three.
 *
 * Reads before writes, because Firestore transactions require it: every
 * position is read first, then every write is issued. That also means the
 * shortfall check below sees the whole order at once, so an order that cannot
 * be filled completely deducts nothing rather than partially emptying a depot.
 */
export async function fulfilOrder(
  orderId: string,
  warehouseId: string,
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName'>,
): Promise<void> {
  const orderRef = doc(db, orgPath('orders'), orderId);
  const actorName = `${actor.firstName} ${actor.lastName}`;

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error('That order no longer exists.');
    const order = orderSnap.data() as Order;

    if (order.status !== 'approved') {
      throw new Error('Only an approved order can be fulfilled.');
    }

    /* ---- every read first ---- */
    const positions = await Promise.all(
      order.lines.map(async (line) => {
        const ref = doc(db, orgPath('stock'), `${warehouseId}_${line.productId}`);
        const snap = await tx.get(ref);
        return { line, ref, held: snap.exists() ? (snap.data().quantity as number) : 0, exists: snap.exists() };
      }),
    );

    const short = positions.filter((p) => p.held < p.line.quantity);
    if (short.length) {
      throw new Error(
        `Not enough stock in this depot for ${short
          .map((p) => `${p.line.productName} (${p.held} of ${p.line.quantity})`)
          .join(', ')}.`,
      );
    }

    /* ---- then every write ---- */
    for (const { line, ref, held, exists } of positions) {
      const balanceAfter = held - line.quantity;

      if (exists) {
        tx.update(ref, { quantity: balanceAfter, updatedAt: serverTimestamp() });
      } else {
        tx.set(ref, {
          warehouseId,
          productId: line.productId,
          productName: line.productName,
          unit: line.unit,
          quantity: balanceAfter,
          threshold: 0,
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(doc(collection(db, orgPath('movements'))), {
        warehouseId,
        productId: line.productId,
        productName: line.productName,
        type: 'order_fulfilment',
        direction: 'out',
        quantity: line.quantity,
        balanceAfter,
        referenceId: orderId,
        note: `Order ${order.orderNumber}`,
        createdBy: actor.id,
        createdByName: actorName,
        createdAt: serverTimestamp(),
      });
    }

    tx.update(orderRef, {
      status: 'fulfilled',
      fulfilledAt: serverTimestamp(),
      fulfilledBy: actor.id,
      updatedAt: serverTimestamp(),
    });
  });
}

/* -------------------------------------------------------------- inventory */

export function listWarehouses(): Promise<Warehouse[]> {
  return list<Warehouse>('warehouses', orderBy('name'));
}

export function listStock(warehouseId?: string): Promise<StockPosition[]> {
  return warehouseId
    ? list<StockPosition>('stock', where('warehouseId', '==', warehouseId), orderBy('productName'))
    : list<StockPosition>('stock', orderBy('productName'));
}

/** Positions at or below their own threshold — what the home screen counts. */
export async function lowStock(warehouseId?: string): Promise<StockPosition[]> {
  const rows = await listStock(warehouseId);
  return rows.filter((row) => row.threshold > 0 && row.quantity <= row.threshold);
}

export function listMovements(warehouseId?: string, max = 100): Promise<StockMovement[]> {
  const constraints: QueryConstraint[] = [];
  if (warehouseId) constraints.push(where('warehouseId', '==', warehouseId));
  constraints.push(orderBy('createdAt', 'desc'), fsLimit(max));
  return list<StockMovement>('movements', ...constraints);
}

/**
 * Move stock by hand: a delivery in, a count correction, a write-off.
 *
 * Same transaction discipline as `fulfilOrder`, for the same reason. A
 * `quantity` here is always positive; `direction` says which way it goes. That
 * is deliberate — a signed quantity means a caller can pass `-5` with
 * `direction: 'in'` and the ledger disagrees with itself in a way no screen
 * will show.
 */
export async function moveStock(input: {
  warehouseId: string;
  product: Pick<Product, 'id' | 'name' | 'unit'>;
  type: StockMovement['type'];
  direction: 'in' | 'out';
  quantity: number;
  note?: string;
  referenceId?: string;
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName'>;
}): Promise<number> {
  if (input.quantity <= 0) throw new Error('A movement must be for at least one unit.');

  const ref = doc(db, orgPath('stock'), `${input.warehouseId}_${input.product.id}`);
  const actorName = `${input.actor.firstName} ${input.actor.lastName}`;

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const held = snap.exists() ? (snap.data().quantity as number) : 0;
    const balanceAfter = input.direction === 'in' ? held + input.quantity : held - input.quantity;

    if (balanceAfter < 0) {
      throw new Error(`Only ${held} in this depot. That movement would leave a negative balance.`);
    }

    tx.set(
      ref,
      {
        warehouseId: input.warehouseId,
        productId: input.product.id,
        productName: input.product.name,
        unit: input.product.unit,
        quantity: balanceAfter,
        threshold: snap.exists() ? snap.data().threshold ?? 0 : 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    tx.set(doc(collection(db, orgPath('movements'))), {
      warehouseId: input.warehouseId,
      productId: input.product.id,
      productName: input.product.name,
      type: input.type,
      direction: input.direction,
      quantity: input.quantity,
      balanceAfter,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      createdBy: input.actor.id,
      createdByName: actorName,
      createdAt: serverTimestamp(),
    });

    return balanceAfter;
  });
}

export async function setThreshold(
  warehouseId: string,
  productId: string,
  threshold: number,
): Promise<void> {
  await setDoc(
    doc(db, orgPath('stock'), `${warehouseId}_${productId}`),
    { threshold, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/* ------------------------------------------------------------------ sales */

export function listSales(
  filter: { distributorId?: string | null; from?: string; to?: string; max?: number } = {},
): Promise<Sale[]> {
  const constraints: QueryConstraint[] = [];
  if (filter.distributorId) constraints.push(where('distributorId', '==', filter.distributorId));
  if (filter.from) constraints.push(where('saleDate', '>=', filter.from));
  if (filter.to) constraints.push(where('saleDate', '<=', filter.to));
  constraints.push(orderBy('saleDate', 'desc'));
  if (filter.max) constraints.push(fsLimit(filter.max));
  return list<Sale>('sales', ...constraints);
}

export async function recordSale(input: {
  product: Pick<Product, 'id' | 'name'>;
  distributor: Pick<Distributor, 'id' | 'company' | 'category'>;
  quantity: number;
  unitPrice: number;
  outlet?: string;
  saleDate?: string;
  note?: string;
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName'>;
}): Promise<string> {
  const ref = await addDoc(collection(db, orgPath('sales')), {
    productId: input.product.id,
    productName: input.product.name,
    distributorId: input.distributor.id,
    distributorName: input.distributor.company,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    total: input.quantity * input.unitPrice,
    outlet: input.outlet ?? null,
    /* The day of the SALE, not the day it was keyed. See `todayISO`. */
    saleDate: input.saleDate ?? todayISO(),
    note: input.note ?? null,
    capturedBy: input.actor.id,
    capturedByName: `${input.actor.firstName} ${input.actor.lastName}`,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/* ------------------------------------------------------------------ leads */

export function listLeads(ownerId?: string | null): Promise<Lead[]> {
  return ownerId
    ? list<Lead>('leads', where('ownerId', '==', ownerId), orderBy('updatedAt', 'desc'))
    : list<Lead>('leads', orderBy('updatedAt', 'desc'));
}

export async function saveLead(lead: Partial<Lead> & { id?: string }): Promise<string> {
  const { id, ...data } = lead;
  if (id) {
    await updateDoc(doc(db, orgPath('leads'), id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, orgPath('leads')), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/* ---------------------------------------------------------------- finance */

export function listInvoices(
  filter: { distributorId?: string | null; status?: Invoice['status']; max?: number } = {},
): Promise<Invoice[]> {
  const constraints: QueryConstraint[] = [];
  if (filter.distributorId) constraints.push(where('distributorId', '==', filter.distributorId));
  if (filter.status) constraints.push(where('status', '==', filter.status));
  constraints.push(orderBy('issuedOn', 'desc'));
  if (filter.max) constraints.push(fsLimit(filter.max));
  return list<Invoice>('invoices', ...constraints);
}

export function listPayments(invoiceId: string): Promise<Payment[]> {
  return list<Payment>('payments', where('invoiceId', '==', invoiceId), orderBy('paidOn', 'desc'));
}

/**
 * Every payment on an account, in one query.
 *
 * The statement used to call `listPayments` once per invoice — three hundred
 * round trips to draw one page, on a connection where each one is a couple of
 * hundred milliseconds. `Payment` already carries `distributorId` (snapshotted
 * at the moment it is recorded, like everything else here), so the whole
 * account is one query against one index.
 *
 * The per-invoice version stays: the payment history inside an invoice really
 * does want only that invoice's payments, and asking for the account's and
 * filtering in the browser would be the same mistake pointed the other way.
 */
export function listAccountPayments(distributorId: string, max = 500): Promise<Payment[]> {
  return list<Payment>(
    'payments',
    where('distributorId', '==', distributorId),
    orderBy('paidOn', 'desc'),
    fsLimit(max),
  );
}

/**
 * Record a payment and move the invoice's status with it.
 *
 * `amountPaid` is incremented server-side rather than read-then-written,
 * because two people in accounts posting two transfers against the same invoice
 * at the same moment is not a hypothetical. `increment()` is applied by the
 * server against whatever the value actually is, so neither posting is lost.
 *
 * The status is derived from the new total in the same write. It can only go to
 * `part_paid` or `paid` here — an invoice never returns to `issued` because
 * money arrived.
 */
export async function recordPayment(input: {
  invoice: Pick<Invoice, 'id' | 'invoiceNumber' | 'distributorId' | 'total' | 'amountPaid'>;
  amount: number;
  method: Payment['method'];
  reference?: string;
  paidOn?: string;
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName'>;
}): Promise<void> {
  if (input.amount <= 0) throw new Error('A payment must be for more than nothing.');

  const paidAfter = (input.invoice.amountPaid ?? 0) + input.amount;
  const settled = paidAfter >= input.invoice.total;

  await addDoc(collection(db, orgPath('payments')), {
    invoiceId: input.invoice.id,
    invoiceNumber: input.invoice.invoiceNumber,
    distributorId: input.invoice.distributorId,
    amount: input.amount,
    method: input.method,
    reference: input.reference ?? null,
    paidOn: input.paidOn ?? todayISO(),
    recordedBy: input.actor.id,
    recordedByName: `${input.actor.firstName} ${input.actor.lastName}`,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, orgPath('invoices'), input.invoice.id), {
    amountPaid: increment(input.amount),
    status: settled ? 'paid' : 'part_paid',
    updatedAt: serverTimestamp(),
  });
}

/**
 * What a distributor owes right now, and how much of their ceiling is left.
 *
 * Computed from the invoices rather than stored on the distributor, because a
 * stored balance is a number that can be wrong — and a credit check that passes
 * against a stale balance is how an account goes ₦4m over its limit.
 */
export async function creditPosition(
  distributorId: string,
  creditLimit?: number,
): Promise<{ outstanding: number; overdue: number; headroom: number | null }> {
  const invoices = await listInvoices({ distributorId });
  const open = invoices.filter((i) => i.status !== 'paid' && i.status !== 'void' && i.status !== 'draft');

  const outstanding = open.reduce((sum, i) => sum + (i.total - (i.amountPaid ?? 0)), 0);
  const today = todayISO();
  const overdue = open
    .filter((i) => i.dueOn < today)
    .reduce((sum, i) => sum + (i.total - (i.amountPaid ?? 0)), 0);

  return {
    outstanding,
    overdue,
    headroom: creditLimit === undefined ? null : creditLimit - outstanding,
  };
}

/* ------------------------------------------------------------- returns */

export function listReturns(distributorId?: string | null): Promise<ReturnRecord[]> {
  return distributorId
    ? list<ReturnRecord>('returns', where('distributorId', '==', distributorId), orderBy('createdAt', 'desc'))
    : list<ReturnRecord>('returns', orderBy('createdAt', 'desc'));
}

/* ---------------------------------------------------------------- targets */

export function listTargets(period: string): Promise<Target[]> {
  return list<Target>('targets', where('period', '==', period), orderBy('ownerName'));
}

/* ------------------------------------------------------------- home summary */

export interface HomeSummary {
  openOrders: number;
  awaitingMe: number;
  lowStock: number;
  monthSales: number;
  outstanding: number;
  overdue: number;
}

/**
 * The home screen's numbers, in as few reads as the shape allows.
 *
 * Scoped by `distributorId` when the viewer is a trading partner, so the same
 * function answers "how is the business doing" for an administrator and "how is
 * my account doing" for a distributor without a second implementation. A number
 * on a home screen that disagrees with the screen it links to is worse than no
 * number, and two implementations is how that happens.
 */
export async function getHomeSummary(input: {
  role: Role;
  uid: string;
  distributorId?: string | null;
}): Promise<HomeSummary> {
  const scope = input.distributorId ?? undefined;
  const monthStart = `${todayISO().slice(0, 7)}-01`;

  const [orders, pending, stock, sales, invoices] = await Promise.all([
    listOrders({ distributorId: scope, max: 200 }),
    listOrders({ status: 'pending_approval', distributorId: scope, max: 100 }),
    lowStock(),
    listSales({ distributorId: scope, from: monthStart, max: 500 }),
    listInvoices({ distributorId: scope, max: 300 }),
  ]);

  const today = todayISO();
  const open = invoices.filter((i) => i.status !== 'paid' && i.status !== 'void' && i.status !== 'draft');

  return {
    openOrders: orders.filter((o) => o.status === 'pending_approval' || o.status === 'approved').length,
    awaitingMe: pending.filter((o) => (o.approvers ?? []).includes(input.uid)).length,
    lowStock: stock.length,
    monthSales: sales.reduce((sum, s) => sum + s.total, 0),
    outstanding: open.reduce((sum, i) => sum + (i.total - (i.amountPaid ?? 0)), 0),
    overdue: open
      .filter((i) => i.dueOn < today)
      .reduce((sum, i) => sum + (i.total - (i.amountPaid ?? 0)), 0),
  };
}

/* ------------------------------------------------------------- the platform */

/**
 * The owner's view: every tenant on the platform.
 *
 * The one function in this file that does not go through `orgPath`, because it
 * is the one function that is not about an organisation — it is about all of
 * them. The rules refuse this collection to everybody but `owner`.
 */
export async function listTenants(): Promise<(import('./tenant').OrgTenant)[]> {
  const snap = await getDocs(query(collection(db, TENANTS), orderBy('name')));
  return snap.docs.map((d) => shape<import('./tenant').OrgTenant>(d.id, d.data()));
}


/* --------------------------------------------------- amending an order */

/**
 * Edit an order that is still amendable.
 *
 * The caller decides WHETHER this is allowed — `orderAmendment()` in
 * `lib/amend.ts` — and this decides what a legal edit looks like. The two are
 * separate on purpose: the policy is shared with the screens that draw the
 * buttons, and the shape enforcement belongs next to the write.
 *
 * Re-pricing happens here rather than in the caller, for the same reason it
 * does in `createOrder`: a caller that could pass a price could discount an
 * order from a text field.
 */
export async function updateOrder(
  orderId: string,
  patch: {
    lines?: { product: Product; quantity: number }[];
    note?: string;
    distributor?: Pick<Distributor, 'id' | 'company' | 'category'>;
  },
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
  options: { settled?: boolean } = {},
): Promise<void> {
  const ref = doc(db, orgPath('orders'), orderId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('That order no longer exists.');
    const order = snap.data() as Order;

    if (order.status === 'fulfilled' && patch.lines) {
      /*
       * Lines are frozen once stock has left the building.
       *
       * The movement that deducted them is in the ledger and cannot be edited,
       * so changing the lines here would make the order and the ledger disagree
       * — and the ledger is the one a stock count reconciles against. An
       * administrator can still fix the note, the distributor or cancel it; a
       * quantity that went out wrong is corrected with a stock adjustment and a
       * credit note, which is what those are for.
       */
      throw new Error(
        'This order has already been fulfilled, so its lines cannot change. Correct the stock with an adjustment and raise a credit note.',
      );
    }

    const next: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (patch.distributor) {
      next.distributorId = patch.distributor.id;
      next.distributorName = patch.distributor.company;
    }
    if (patch.note !== undefined) next.note = patch.note || null;

    if (patch.lines) {
      const tier = patch.distributor?.category ?? undefined;
      const lines: OrderLine[] = patch.lines.map(({ product, quantity }) => {
        /* If the distributor did not change, keep pricing at the tier the order
           was raised under — an amendment is not a re-quote. */
        const unitPrice = tier
          ? (product.pricing[tier] ?? 0)
          : (order.lines.find((l) => l.productId === product.id)?.unitPrice ??
             product.pricing[
               (order.lines[0] && undefined) as never
             ] ??
             0);
        const price = unitPrice || 0;
        return {
          productId: product.id,
          productName: product.name,
          category: product.category,
          unit: product.unit,
          quantity,
          unitPrice: price,
          lineTotal: price * quantity,
        };
      });
      next.lines = lines;
      next.total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    }

    /*
     * An amendment after the fact is stamped, visibly.
     *
     * So the next person who opens the order sees, on the record itself, that
     * it changed after it was decided. An amendment nobody can see is
     * indistinguishable from the original having always said this.
     */
    if (options.settled) {
      next.amendedAt = serverTimestamp();
      next.amendedBy = `${actor.firstName} ${actor.lastName}`;
    }

    tx.update(ref, next);
  });

}

/**
 * Pull an order back out of the approval queue.
 *
 * Status returns to `draft` and every signature collected so far is cleared —
 * which is the whole point. A recalled order that kept its approvals could be
 * edited and then be sitting "approved" against lines nobody approved, and that
 * is a signature forged by a state machine rather than a person.
 *
 * The approvers list is kept, so sending it again asks the same people.
 */
export async function recallOrder(
  orderId: string,
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
  reason?: string,
): Promise<void> {
  const ref = doc(db, orgPath('orders'), orderId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('That order no longer exists.');
    const order = snap.data() as Order;

    if (order.status !== 'pending_approval') {
      throw new Error('Only an order that is waiting for approval can be recalled.');
    }

    tx.update(ref, {
      status: 'draft',
      approvals: [],
      recalledAt: serverTimestamp(),
      recalledBy: `${actor.firstName} ${actor.lastName}`,
      recallReason: reason ?? null,
      updatedAt: serverTimestamp(),
    });
  });

}

/** Send a draft for approval. The counterpart to a recall. */
export async function submitOrder(
  orderId: string,
  approvers: { uid: string; name: string }[],
  _actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
): Promise<OrderStatus> {
  const ref = doc(db, orgPath('orders'), orderId);
  /* Same rule as `createOrder`: no required signature means approved. */
  const status: OrderStatus = approvers.length ? 'pending_approval' : 'approved';

  await updateDoc(ref, {
    status,
    approvers: approvers.map((a) => a.uid),
    approverNames: Object.fromEntries(approvers.map((a) => [a.uid, a.name])),
    approvals: [],
    ...(status === 'approved' ? { approvedAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });

  return status;
}

/**
 * End an order without deleting it.
 *
 * Cancelled rather than removed, because the order number has been quoted — in
 * an email, on a waybill, to a distributor on the phone — and a number that
 * exists and then does not is the thing somebody asks about first. A
 * fulfilled order cannot be cancelled: the stock has gone, and pretending
 * otherwise makes the ledger unreconcilable.
 */
export async function cancelOrder(
  orderId: string,
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
  reason?: string,
): Promise<void> {
  const ref = doc(db, orgPath('orders'), orderId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('That order no longer exists.');
    const order = snap.data() as Order;

    if (order.status === 'fulfilled') {
      throw new Error(
        'This order has been fulfilled and the stock has left. Raise a return instead of cancelling it.',
      );
    }

    tx.update(ref, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: `${actor.firstName} ${actor.lastName}`,
      cancelReason: reason ?? null,
      updatedAt: serverTimestamp(),
    });
  });

}

/* ------------------------------------------------------------ returns */

export async function createReturn(input: {
  distributor: Pick<Distributor, 'id' | 'company'>;
  product: Pick<Product, 'id' | 'name'>;
  quantity: number;
  reason: string;
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>;
}): Promise<string> {
  const ref = await addDoc(collection(db, orgPath('returns')), {
    returnNumber: await nextNumber('RET'),
    distributorId: input.distributor.id,
    distributorName: input.distributor.company,
    productId: input.product.id,
    productName: input.product.name,
    quantity: input.quantity,
    reason: input.reason,
    status: 'requested',
    requestedBy: input.actor.id,
    requestedByName: `${input.actor.firstName} ${input.actor.lastName}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

/**
 * Decide a return, and — when it is received — put the stock back.
 *
 * `received` is the status that touches inventory, not `approved`. Approving a
 * return is agreeing that it may come back; receiving it is somebody at the
 * depot counting it onto a shelf. Crediting stock on approval is how a
 * warehouse ends up with cartons it can sell twice.
 */
export async function decideReturn(
  returnId: string,
  status: ReturnStatus,
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
  options: { creditValue?: number; warehouseId?: string } = {},
): Promise<void> {
  const ref = doc(db, orgPath('returns'), returnId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('That return no longer exists.');
  const record = shape<ReturnRecord>(snap.id, snap.data());

  await updateDoc(ref, {
    status,
    ...(options.creditValue !== undefined ? { creditValue: options.creditValue } : {}),
    updatedAt: serverTimestamp(),
  });

  if (status === 'received' && options.warehouseId) {
    await moveStock({
      warehouseId: options.warehouseId,
      product: { id: record.productId, name: record.productName, unit: '' },
      type: 'return',
      direction: 'in',
      quantity: record.quantity,
      referenceId: returnId,
      note: `Return ${record.returnNumber}`,
      actor,
    });
  }

}

/* ------------------------------------------------------------ targets */

export async function saveTarget(
  target: Partial<Target> & { id?: string },
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
): Promise<string> {
  const { id, ...data } = target;

  if (id) {
    await updateDoc(doc(db, orgPath('targets'), id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }

  const ref = await addDoc(collection(db, orgPath('targets')), {
    ...data,
    createdBy: actor.id,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeTarget(
  targetId: string,
  _actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
): Promise<void> {
  await deleteDoc(doc(db, orgPath('targets'), targetId));
}

/* ----------------------------------------------------------- invoices */

/**
 * Raise an invoice, optionally from a fulfilled order.
 *
 * The lines are copied from the order rather than referenced, for the same
 * reason every other snapshot in this app exists: the invoice has to keep
 * saying what it said on the day it was issued, whatever happens to the order
 * or the product afterwards.
 */
export async function createInvoice(input: {
  distributor: Pick<Distributor, 'id' | 'company' | 'paymentTermsDays'>;
  order?: Pick<Order, 'id' | 'orderNumber' | 'lines' | 'total'>;
  lines?: OrderLine[];
  total?: number;
  issuedOn?: string;
  dueOn?: string;
  issue?: boolean;
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>;
}): Promise<string> {
  const lines = input.order?.lines ?? input.lines ?? [];
  const total = input.order?.total ?? input.total ?? lines.reduce((s, l) => s + l.lineTotal, 0);
  const issuedOn = input.issuedOn ?? todayISO();

  /* Due date from the distributor's own terms, so nobody types it wrong. */
  const due = new Date(issuedOn);
  due.setDate(due.getDate() + (input.distributor.paymentTermsDays ?? 30));
  const dueOn = input.dueOn ?? todayISO(due);

  const ref = await addDoc(collection(db, orgPath('invoices')), {
    invoiceNumber: await nextNumber('INV'),
    orderId: input.order?.id ?? null,
    orderNumber: input.order?.orderNumber ?? null,
    distributorId: input.distributor.id,
    distributorName: input.distributor.company,
    lines,
    total,
    amountPaid: 0,
    status: input.issue === false ? 'draft' : 'issued',
    issuedOn,
    dueOn,
    createdBy: input.actor.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateInvoice(
  invoiceId: string,
  patch: { dueOn?: string; issuedOn?: string; status?: InvoiceStatus; lines?: OrderLine[]; total?: number },
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
  options: { settled?: boolean } = {},
): Promise<void> {
  const ref = doc(db, orgPath('invoices'), invoiceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('That invoice no longer exists.');
  const invoice = snap.data() as Invoice;

  if ((invoice.amountPaid ?? 0) > 0 && patch.total !== undefined && patch.total < invoice.amountPaid) {
    /*
     * An invoice cannot be edited to below what has already been paid against
     * it. That would leave the account in credit with no credit note to explain
     * it, and the statement's running balance would go negative for a reason
     * nobody can point at.
     */
    throw new Error(
      `${naira(invoice.amountPaid)} has already been paid against this invoice. Raise a credit note instead of reducing it below that.`,
    );
  }

  await updateDoc(ref, {
    ...patch,
    ...(options.settled ? { amendedAt: serverTimestamp(), amendedBy: `${actor.firstName} ${actor.lastName}` } : {}),
    updatedAt: serverTimestamp(),
  });

}

/** Void rather than delete, for the same reason an order is cancelled. */
export async function voidInvoice(
  invoiceId: string,
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
  reason?: string,
): Promise<void> {
  const ref = doc(db, orgPath('invoices'), invoiceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('That invoice no longer exists.');
  const invoice = snap.data() as Invoice;

  if ((invoice.amountPaid ?? 0) > 0) {
    throw new Error(
      `${naira(invoice.amountPaid)} has been paid against this invoice, so it cannot be voided. Raise a credit note.`,
    );
  }

  await updateDoc(ref, {
    status: 'void',
    voidReason: reason ?? null,
    voidedBy: `${actor.firstName} ${actor.lastName}`,
    updatedAt: serverTimestamp(),
  });

}

/* -------------------------------------------------------------- sales */

/**
 * Correct a sell-out record.
 *
 * `saleStage()` decides who may: inside the current month the person who keyed
 * it can fix their own typo, and once the month is reported it takes an
 * administrator. See `lib/amend.ts`.
 */
export async function updateSale(
  saleId: string,
  patch: { quantity?: number; unitPrice?: number; outlet?: string; saleDate?: string; note?: string },
  actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
  options: { settled?: boolean } = {},
): Promise<void> {
  const ref = doc(db, orgPath('sales'), saleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('That record no longer exists.');
  const sale = snap.data() as Sale;

  const quantity = patch.quantity ?? sale.quantity;
  const unitPrice = patch.unitPrice ?? sale.unitPrice;

  if (quantity <= 0) throw new Error('A sell-out record needs a quantity of at least one.');

  await updateDoc(ref, {
    ...patch,
    quantity,
    unitPrice,
    /* Kept in step here rather than computed on read, because every report sums
       `total` and a stale one would quietly disagree with its own line. */
    total: quantity * unitPrice,
    ...(options.settled ? { amendedAt: serverTimestamp(), amendedBy: `${actor.firstName} ${actor.lastName}` } : {}),
    updatedAt: serverTimestamp(),
  });

}

/**
 * Remove a sell-out record.
 *
 * The one thing in this app that is genuinely deleted rather than cancelled,
 * and it is worth saying why: a sale that never happened has no counterpart to
 * point at. An order has a number somebody quoted, an invoice has a number in
 * an accounts ledger, a stock movement has a balance that follows from it — a
 * duplicated sell-out line has none of those. Leaving it as a "cancelled sale"
 * would mean every report had to remember to filter it out, and one day one
 * would not.
 */
export async function deleteSale(
  saleId: string,
  _actor: Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'>,
): Promise<void> {
  await deleteDoc(doc(db, orgPath('sales'), saleId));
}


export { COLLECTIONS, deleteDoc };
