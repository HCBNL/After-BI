/**
 * AfterBI: the whole domain, in one file.
 *
 * WHY ONE FILE
 *
 * Every screen in this app is a view of one of eight nouns: an organisation, a
 * person, a product, a distributor, an order, a stock position, an invoice, a
 * return. They reference each other constantly, an order line snapshots a
 * product, an invoice snapshots an order, a stock movement points at both, and
 * splitting them across eight files buys nothing but a circular import graph.
 *
 * WHAT A "SNAPSHOT" FIELD IS, AND WHY THERE ARE SO MANY
 *
 * Fields marked `(snapshot)` are copies taken at write time and never updated
 * again. `OrderLine.productName` is not a join, it is what the product was
 * called on the day the order was placed. This is deliberate and it is the
 * single most important modelling decision in the app: a distributor querying a
 * six-month-old invoice must see the price and the name they agreed to, not
 * today's. The old AfterBI got this right for `sales.unitPrice` and wrong for
 * almost everything else: a renamed product silently rewrote history on every
 * past order.
 *
 * The cost is denormalisation, and it is paid knowingly: a rename updates the
 * product and nothing else, and the old name stays on the old paper.
 */

/* roles */

/**
 * The eight roles, carried over from AfterBI unchanged.
 *
 * They were not collapsed, because in a distribution business they are eight
 * genuinely different jobs done by eight different people: unlike the old
 * `parent`/`student` split in the reference app, which was one household
 * pretending to be two accounts. A warehouse manager and a finance manager
 * share almost no screen.
 *
 * `owner` is new and is NOT one of the eight: it is the platform side, the
 * account that runs AfterBI itself and sees tenants rather than orders. It
 * belongs to whoever sells this software, never to a customer. Keeping it in
 * the same union is what lets one `actionsForRole` and one `<RequireRole>`
 * cover both the platform and the tenants inside it.
 */
export const ROLES = [
  'owner',
  'super_admin',
  'admin',
  'staff',
  'sales_rep',
  'distributor',
  'warehouse_manager',
  'finance_manager',
  'operations_manager',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Role strings that exist in the old database and in no build after this one.
 *
 * The same problem `roles.ts` solves in the reference app: TypeScript only sees
 * the code, and Firestore is not TypeScript. Every one of these is still
 * written into a live `users/{uid}` document somewhere and will be until the
 * migration has run everywhere. See `normaliseRole`.
 */
export const LEGACY_ROLES: Record<string, Role> = {
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

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Platform',
  super_admin: 'Super admin',
  admin: 'Administrator',
  staff: 'Staff',
  sales_rep: 'Sales representative',
  distributor: 'Distributor',
  warehouse_manager: 'Warehouse manager',
  finance_manager: 'Finance manager',
  operations_manager: 'Operations manager',
};

/** Short form, for a pill beside a name where the long label will not fit. */
export const ROLE_SHORT: Record<Role, string> = {
  owner: 'Platform',
  super_admin: 'Super admin',
  admin: 'Admin',
  staff: 'Staff',
  sales_rep: 'Sales rep',
  distributor: 'Distributor',
  warehouse_manager: 'Warehouse',
  finance_manager: 'Finance',
  operations_manager: 'Operations',
};

/* amendment trail */

/**
 * The amendment trail every changeable record carries.
 *
 * Stamped onto the record itself rather than kept in a log somewhere else.
 * A separate history collection is a second write on every change, a second
 * index, and a screen nobody opens to read one order: and a change nobody can
 * see on the document is indistinguishable from the document having always
 * said this. So the document carries its own amendment trail.
 */
export interface AmendmentTrail {
  /** Set when an administrator changed the record after it was decided. */
  amendedAt?: string;
  amendedBy?: string;
}

/* people */

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Mr, Mrs, Dr, Engr: Nigerian business correspondence uses these. */
  title?: string;
  role: Role;
  phone?: string;
  photoURL?: string;

  /**
   * Which organisation this account belongs to.
   *
   * The one field that makes the whole tenancy work, and the reason
   * `users/{uid}` stays a root collection: see `lib/tenant.ts`. Absent only on
   * an `owner`, who belongs to the platform rather than to any tenant.
 */
  orgId?: string;

  /** For a `distributor` or a `sales_rep`: the partner they act for. */
  distributorId?: string;
  /** Sales reps: every distributor account they manage. An account may have several reps. */
  distributorIds?: string[];
  /** Snapshot of that partner's price tier, so the catalogue needs no join. */
  distributorCategory?: PriceTier;

  /** For a `sales_rep`: the territories they cover. Empty means all. */
  territories?: string[];
  /** For a `warehouse_manager`: the depots they may move stock in. */
  warehouseIds?: string[];

  /** Set false to suspend. Checked on every profile read, not just at sign-in. */
  active?: boolean;
  createdAt?: string;
  lastSeenAt?: string;
}

/* catalogue */

/**
 * The three price tiers.
 *
 * OT (open trade): the corner shops. MT (modern trade): the supermarket
 * chains. SA (service account): a negotiated rate for a named account. Every
 * product carries all three and a distributor sees exactly one of them.
 * Records saved before the rename say "SEP"; `tierOf()` reads either.
 */
export const PRICE_TIERS = ['OT', 'MT', 'SA'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const TIER_LABEL: Record<PriceTier, string> = {
  OT: 'Open trade',
  MT: 'Modern trade',
  SA: 'Service account',
};

/** A stored tier, including the old "SEP", as today's tier. */
export function tierOf(value: unknown): PriceTier {
  return value === 'MT' ? 'MT' : value === 'SA' || value === 'SEP' ? 'SA' : 'OT';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  /** "Per carton", "Per crate": the unit a quantity is counted in. */
  unit: string;
  sku?: string;
  description?: string;
  /** One price per tier, in naira. A tier with no price cannot be ordered. */
  pricing: Partial<Record<PriceTier, number>>;
  /** Minimum order quantity. */
  moq: number;
  imageUrl?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

/* partners */

export type DistributorStatus = 'pending' | 'active' | 'inactive';

export interface Distributor {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone?: string;
  category: PriceTier;
  /** State or city. Feeds the territory map and the scorecard grouping. */
  location?: string;
  address?: string;
  status: DistributorStatus;
  /** Firebase Auth uid, once they have signed up. */
  userId?: string;

  /** Naira ceiling on unpaid invoices. 0 means cash-only, undefined no limit. */
  creditLimit?: number;
  /** Days from invoice to due date. */
  paymentTermsDays?: number;

  createdAt?: string;
  updatedAt?: string;
}

/* orders */

/**
 * An order line.
 *
 * Every field but `productId` and `quantity` is a snapshot. See the note at the
 * top of this file for why.
 */
export interface OrderLine {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number;
  /** Resolved from `product.pricing[distributor.category]` at write time. */
  unitPrice: number;
  /** `quantity × unitPrice`, stored rather than computed. */
  lineTotal: number;
}

export type OrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'fulfilled'
  | 'cancelled';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export interface OrderApproval {
  uid: string;
  name: string;
  decision: 'approved' | 'rejected';
  note?: string;
  decidedAt: string;
}

export interface Order extends AmendmentTrail {
  id: string;
  /** Human-readable, sequential per org: `PO-2026-0041`. See `docNumbers.ts`. */
  orderNumber: string;
  distributorId: string;
  distributorName: string;
  lines: OrderLine[];
  /** Sum of `lineTotal`. Stored, so a list does not have to reduce every row. */
  total: number;
  status: OrderStatus;

  /** UIDs required to sign off, fixed at submission. */
  approvers: string[];
  approverNames: Record<string, string>;
  approvals: OrderApproval[];

  note?: string;
  createdBy: string;
  createdByName: string;
  createdByRole: Role;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  fulfilledAt?: string;
  fulfilledBy?: string;

  /* Pulled back out of the approval queue by whoever raised it. Every
     signature is cleared at the same time: see `recallOrder`. */
  recalledAt?: string;
  recalledBy?: string;
  recallReason?: string;

  /* Ended without being deleted, because the number has been quoted. */
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
}

/* inventory */

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  /** The org's own depot, as opposed to a distributor's holding. */
  kind: 'company' | 'distributor';
  distributorId?: string;
}

/**
 * One stock position: how much of one product sits in one place.
 *
 * Keyed `{warehouseId}_{productId}` rather than auto-id, which is what makes a
 * deduction a single `updateDoc` on a known path instead of a query-then-write.
 * Two reps fulfilling at the same moment hit the same document and the
 * transaction serialises them; with auto-ids they would each have created a
 * second row for the same product and the balance would have forked.
 */
export interface StockPosition {
  id: string;
  warehouseId: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  /** Below this, the row goes amber and the home screen counts it. */
  threshold: number;
  updatedAt?: string;
}

export type MovementType =
  | 'stock_in'
  | 'order_fulfilment'
  | 'sale'
  | 'transfer'
  | 'adjustment'
  | 'return';

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  stock_in: 'Stock in',
  order_fulfilment: 'Order fulfilment',
  sale: 'Sale',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
  return: 'Return',
};

/**
 * The ledger. Append-only, and that is enforced in the rules, not here.
 *
 * `balanceAfter` is written by the same transaction that changes the position,
 * which is what makes the ledger reconstructable: replaying every movement for
 * a product must land on the number in `StockPosition.quantity`, and if it does
 * not, something wrote a balance outside a transaction.
 */
export interface StockMovement {
  id: string;
  warehouseId: string;
  productId: string;
  productName: string;
  type: MovementType;
  direction: 'in' | 'out';
  quantity: number;
  balanceAfter: number;
  /** The order, sale or return this movement belongs to. */
  referenceId?: string;
  note?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

/* sales */

/** Sell-out: what the distributor moved to the shops, keyed by day. */
export interface Sale extends AmendmentTrail {
  id: string;
  productId: string;
  productName: string;
  distributorId: string;
  distributorName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  outlet?: string;
  /** `YYYY-MM-DD`, the day of the sale: not the day it was keyed in. */
  saleDate: string;
  note?: string;
  capturedBy: string;
  capturedByName: string;
  /** Set when an admin keys a sale on a rep's behalf. */
  capturedForRep?: string;
  createdAt: string;
}

/* leads */

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
};

export interface Lead {
  id: string;
  company: string;
  contactName: string;
  email?: string;
  phone?: string;
  location?: string;
  stage: LeadStage;
  /** Naira value if it closes. Feeds the pipeline figure on the home screen. */
  estimatedValue?: number;
  ownerId: string;
  ownerName: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

/* finance */

export type InvoiceStatus = 'draft' | 'issued' | 'part_paid' | 'paid' | 'overdue' | 'void';

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  part_paid: 'Part paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};

export interface Invoice extends AmendmentTrail {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  orderNumber?: string;
  distributorId: string;
  distributorName: string;
  lines: OrderLine[];
  total: number;
  /** Sum of payments received. `total - amountPaid` is what is owed. */
  amountPaid: number;
  status: InvoiceStatus;
  /** `YYYY-MM-DD`. */
  issuedOn: string;
  dueOn: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  /* Voided rather than deleted, for the same reason an order is cancelled. */
  voidReason?: string;
  voidedBy?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  distributorId: string;
  amount: number;
  method: 'transfer' | 'cash' | 'cheque' | 'card';
  reference?: string;
  paidOn: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

/* returns */

export type ReturnStatus = 'requested' | 'approved' | 'received' | 'rejected';

export interface ReturnRecord extends AmendmentTrail {
  id: string;
  returnNumber: string;
  distributorId: string;
  distributorName: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  status: ReturnStatus;
  /** Credit raised against this return, once approved. */
  creditValue?: number;
  requestedBy: string;
  requestedByName: string;
  createdAt: string;
  updatedAt?: string;
}

/* targets */

/**
 * A target, for one owner, over one period.
 *
 * `ownerType` rather than three collections, because the question "how am I
 * doing against target" is asked identically of a rep, a distributor and a
 * product line, and the scorecard should not need three loaders to answer it.
 */
export interface Target {
  id: string;
  ownerType: 'rep' | 'distributor' | 'product';
  ownerId: string;
  ownerName: string;
  /** `YYYY-MM` for a month, `YYYY-Qn` for a quarter, `YYYY` for a year. */
  period: string;
  /** Naira. */
  value: number;
  createdBy: string;
  createdAt: string;
}

/* the org itself */

/**
 * The organisation's own record: everything a tenant knows about itself.
 *
 * Lives at `orgs/{orgId}/settings/org`, NOT on the tenant document. The tenant
 * document is the platform's view of a customer (are they paying, how many
 * seats); this is the customer's view of themselves (what they are called, what
 * their invoice looks like). A tenant may write this one and may not write
 * that one, and keeping them apart is what makes that rule a one-liner.
 */
/**
 * One of the company's own bank accounts, as printed on a document.
 *
 * Kept on the settings record rather than in a collection of its own: there
 * are three or four of them, they are read on every printed page, and a
 * separate collection would be a second read on a document that is already
 * waiting for the order, the distributor and the settings.
 */
export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface OrgSettings {
  name: string;
  shortName?: string;
  logoUrl?: string;
  /** Hex. Reaches printed invoices and statements only: never the app chrome. */
  brandColor?: string;
  email?: string;
  phone?: string;
  address?: string;
  /** Printed on every invoice. Nigerian tax law requires it. */
  taxId?: string;
  currency: 'NGN';
  /** Where an order's stock is deducted from unless another is named. */
  defaultWarehouseId?: string;
  /** Naira ceiling above which an order needs a second signature. */
  approvalThreshold?: number;
  /** Roles that sign orders over the threshold. None chosen: the super admin signs. */
  approverRoles?: Role[];
  /**
   * The accounts a distributor may pay into.
   *
   * Printed on every proforma, invoice and statement, under a line saying that
   * nothing paid anywhere else is recognised. That sentence is the reason this
   * field exists: paying a "supplier account" that belongs to somebody else is
   * the commonest fraud in this trade, and it works because the invoice is the
   * only thing the payer checks.
   */
  banks?: BankAccount[];
  /** A line printed under the totals on every invoice. */
  invoiceFooter?: string;
  /** How long a proforma is honoured. Printed on it. */
  proformaValidityDays?: number;
  /** Set true once the setup checklist is done, to stop showing it. */
  setupComplete?: boolean;
  /** How long things may wait before the Reminders screen says something. See lib/reminders.ts. */
  reminders?: {
    approvalHours?: number;
    fulfilDays?: number;
    invoiceDays?: number;
    draftDays?: number;
    dormantDays?: number;
    sellOutDays?: number;
    creditPercent?: number;
  };
  /** A demonstration organisation: it fills itself the first time an administrator signs in. */
  demo?: boolean;
  demoSeeding?: string;
  demoSeededAt?: string;
  /** The walkthrough sign-ins made with the data. The password is `DEMO_PASSWORD`. */
  demoLogins?: { name: string; role: Role; email: string }[];
  updatedAt?: string;
}

