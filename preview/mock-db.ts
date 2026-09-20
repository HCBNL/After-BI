/* Fixtures only. Every export here mirrors a real signature in src/lib/db.ts. */
import type {
  Distributor, Invoice, Lead, Order, OrgSettings, Payment,
  Product, ReturnRecord, Sale, StockMovement, StockPosition, Target, UserProfile, Warehouse,
} from '@/types';

const iso = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const day = (d: number) => iso(d).slice(0, 10);

export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Bella Malt 33cl', category: 'Beverages', unit: 'Per carton', sku: 'BM-033', pricing: { OT: 4200, MT: 3950, SEP: 3800 }, moq: 10, status: 'active' },
  { id: 'p2', name: 'Bella Malt 50cl', category: 'Beverages', unit: 'Per carton', sku: 'BM-050', pricing: { OT: 6100, MT: 5750 }, moq: 5, status: 'active' },
  { id: 'p3', name: 'Zesty Orange 1L', category: 'Juice', unit: 'Per crate', sku: 'ZO-100', pricing: { OT: 8900, MT: 8400, SEP: 8100 }, moq: 4, status: 'active' },
  { id: 'p4', name: 'Crunch Biscuit 45g', category: 'Snacks', unit: 'Per carton', sku: 'CB-045', pricing: { OT: 12400, MT: 11800 }, moq: 2, status: 'active' },
  { id: 'p5', name: 'Sparkle Water 75cl', category: 'Beverages', unit: 'Per pack', sku: 'SW-075', pricing: { OT: 2600, MT: 2450, SEP: 2300 }, moq: 20, status: 'active' },
];

export const DISTRIBUTORS: Distributor[] = [
  { id: 'd1', company: 'Adeola Ventures Ltd', contactName: 'Chidinma Okeke', email: 'chidinma@adeola.ng', phone: '08031234567', category: 'MT', location: 'Lagos', status: 'active', creditLimit: 12000000, paymentTermsDays: 30 },
  { id: 'd2', company: 'Northgate Trading', contactName: 'Musa Ibrahim', email: 'musa@northgate.ng', phone: '08099887766', category: 'OT', location: 'Kano', status: 'active', creditLimit: 4500000, paymentTermsDays: 21 },
  { id: 'd3', company: 'Delta Supplies Co', contactName: 'Ejiro Ovie', email: 'ejiro@deltasupplies.ng', category: 'SEP', location: 'Delta', status: 'active', creditLimit: 8000000 },
  { id: 'd4', company: 'Rivers Wholesale', contactName: 'Tamuno Briggs', email: 'tb@riverswholesale.ng', category: 'OT', location: 'Rivers', status: 'pending' },
];

const line = (p: Product, q: number, tier: 'OT'|'MT'|'SEP') => ({
  productId: p.id, productName: p.name, category: p.category, unit: p.unit,
  quantity: q, unitPrice: p.pricing[tier]!, lineTotal: p.pricing[tier]! * q,
});

export const ORDERS: Order[] = [
  { id: 'o1', orderNumber: 'PO-2026-0041', distributorId: 'd1', distributorName: 'Adeola Ventures Ltd', lines: [line(PRODUCTS[0], 120, 'MT'), line(PRODUCTS[2], 40, 'MT')], total: 810000, status: 'pending_approval', approvers: ['u1'], approverNames: { u1: 'Mr Oluwaseun Adeyemi' }, approvals: [], createdBy: 'u9', createdByName: 'Blessing Eze', createdByRole: 'sales_rep', createdAt: iso(1), note: 'Needs to leave before Friday loading.' },
  { id: 'o2', orderNumber: 'PO-2026-0040', distributorId: 'd2', distributorName: 'Northgate Trading', lines: [line(PRODUCTS[3], 30, 'OT')], total: 372000, status: 'approved', approvers: ['u1'], approverNames: { u1: 'Mr Oluwaseun Adeyemi' }, approvals: [{ uid: 'u1', name: 'Mr Oluwaseun Adeyemi', decision: 'approved', decidedAt: iso(2) }], createdBy: 'u9', createdByName: 'Blessing Eze', createdByRole: 'sales_rep', createdAt: iso(3) },
  { id: 'o3', orderNumber: 'PO-2026-0039', distributorId: 'd3', distributorName: 'Delta Supplies Co', lines: [line(PRODUCTS[4], 200, 'SEP'), line(PRODUCTS[0], 60, 'SEP')], total: 688000, status: 'fulfilled', approvers: [], approverNames: {}, approvals: [], createdBy: 'u1', createdByName: 'Mr Oluwaseun Adeyemi', createdByRole: 'admin', createdAt: iso(9), fulfilledAt: iso(7) },
  { id: 'o4', orderNumber: 'PO-2026-0038', distributorId: 'd1', distributorName: 'Adeola Ventures Ltd', lines: [line(PRODUCTS[1], 80, 'MT')], total: 460000, status: 'fulfilled', approvers: [], approverNames: {}, approvals: [], createdBy: 'u9', createdByName: 'Blessing Eze', createdByRole: 'sales_rep', createdAt: iso(14), fulfilledAt: iso(12) },
  { id: 'o5', orderNumber: 'PO-2026-0037', distributorId: 'd2', distributorName: 'Northgate Trading', lines: [line(PRODUCTS[2], 25, 'OT')], total: 222500, status: 'draft', approvers: [], approverNames: {}, approvals: [], createdBy: 'u1', createdByName: 'Mr Oluwaseun Adeyemi', createdByRole: 'admin', createdAt: iso(0) },
  /* Raised by the preview user themselves — the case that exercises "recall
     your own in-flight order". `o1` is deliberately somebody else's, so the two
     together cover both sides of the rule. */
  { id: 'o7', orderNumber: 'PO-2026-0042', distributorId: 'd1', distributorName: 'Adeola Ventures Ltd', lines: [line(PRODUCTS[4], 200, 'MT')], total: 490000, status: 'pending_approval', approvers: ['u5'], approverNames: { u5: 'Mrs Funke Adebayo' }, approvals: [], createdBy: 'u1', createdByName: 'Mr Oluwaseun Adeyemi', createdByRole: 'sales_rep', createdAt: iso(0) },
  { id: 'o6', orderNumber: 'PO-2026-0036', distributorId: 'd3', distributorName: 'Delta Supplies Co', lines: [line(PRODUCTS[3], 12, 'SEP')], total: 141600, status: 'rejected', approvers: ['u1'], approverNames: { u1: 'Mr Oluwaseun Adeyemi' }, approvals: [{ uid: 'u1', name: 'Mr Oluwaseun Adeyemi', decision: 'rejected', note: 'Account is over its limit — clear the March invoice first.', decidedAt: iso(5) }], createdBy: 'u9', createdByName: 'Blessing Eze', createdByRole: 'sales_rep', createdAt: iso(6) },
];

export const WAREHOUSES: Warehouse[] = [
  { id: 'w1', name: 'Ikeja main warehouse', location: 'Lagos', kind: 'company' },
  { id: 'w2', name: 'Kano depot', location: 'Kano', kind: 'company' },
];

export const STOCK: StockPosition[] = [
  { id: 'w1_p1', warehouseId: 'w1', productId: 'p1', productName: 'Bella Malt 33cl', unit: 'Per carton', quantity: 42, threshold: 80, updatedAt: iso(1) },
  { id: 'w1_p2', warehouseId: 'w1', productId: 'p2', productName: 'Bella Malt 50cl', unit: 'Per carton', quantity: 310, threshold: 100, updatedAt: iso(2) },
  { id: 'w1_p3', warehouseId: 'w1', productId: 'p3', productName: 'Zesty Orange 1L', unit: 'Per crate', quantity: 18, threshold: 40, updatedAt: iso(0) },
  { id: 'w1_p4', warehouseId: 'w1', productId: 'p4', productName: 'Crunch Biscuit 45g', unit: 'Per carton', quantity: 640, threshold: 150, updatedAt: iso(4) },
  { id: 'w1_p5', warehouseId: 'w1', productId: 'p5', productName: 'Sparkle Water 75cl', unit: 'Per pack', quantity: 1240, threshold: 0, updatedAt: iso(6) },
];

/* Invoice lines are copied from the order at the moment it is raised — see
   `createInvoice`. The mock carries real ones so the printed document, which
   is nothing but those lines, can actually be looked at. */
const invLines = (a: number, b: number) => [
  { productId: 'p1', productName: 'Bella Malt 33cl', category: 'Beverages', unit: 'Per carton', quantity: a, unitPrice: 3950, lineTotal: a * 3950 },
  { productId: 'p3', productName: 'Zesty Orange 1L', category: 'Juice', unit: 'Per crate', quantity: b, unitPrice: 8400, lineTotal: b * 8400 },
];

export const INVOICES: Invoice[] = [
  { id: 'i1', invoiceNumber: 'INV-2026-0112', orderId: 'o3', orderNumber: 'PO-2026-0039', distributorId: 'd3', distributorName: 'Delta Supplies Co', lines: invLines(80, 44), total: 688000, amountPaid: 0, status: 'issued', issuedOn: day(40), dueOn: day(10), createdBy: 'u1', createdAt: iso(40) },
  { id: 'i2', invoiceNumber: 'INV-2026-0111', orderId: 'o4', orderNumber: 'PO-2026-0038', distributorId: 'd1', distributorName: 'Adeola Ventures Ltd', lines: invLines(64, 25), total: 460000, amountPaid: 200000, status: 'part_paid', issuedOn: day(12), dueOn: day(-18), createdBy: 'u1', createdAt: iso(12) },
  { id: 'i3', invoiceNumber: 'INV-2026-0110', distributorId: 'd2', distributorName: 'Northgate Trading', lines: invLines(48, 21), total: 372000, amountPaid: 372000, status: 'paid', issuedOn: day(30), dueOn: day(9), createdBy: 'u1', createdAt: iso(30) },
  { id: 'i4', invoiceNumber: 'INV-2026-0109', distributorId: 'd1', distributorName: 'Adeola Ventures Ltd', lines: invLines(200, 55), total: 1240000, amountPaid: 0, status: 'issued', issuedOn: day(75), dueOn: day(45), createdBy: 'u1', createdAt: iso(75) },
];

export const SALES: Sale[] = Array.from({ length: 24 }, (_, i) => {
  const p = PRODUCTS[i % PRODUCTS.length];
  const d = DISTRIBUTORS[i % 3];
  const qty = 8 + ((i * 7) % 40);
  const price = p.pricing[d.category] ?? 4000;
  return { id: `s${i}`, productId: p.id, productName: p.name, distributorId: d.id, distributorName: d.company, quantity: qty, unitPrice: price, total: qty * price, outlet: ['Mama Nkechi Stores','Shoprite Ikeja','Ojota Market Stall 14','Kano Central Provisions'][i % 4], saleDate: day(i % 14), capturedBy: 'u9', capturedByName: 'Blessing Eze', createdAt: iso(i % 14) } as Sale;
});

export const MOVEMENTS: StockMovement[] = Array.from({ length: 14 }, (_, i) => ({
  id: `m${i}`, warehouseId: 'w1', productId: PRODUCTS[i % 5].id, productName: PRODUCTS[i % 5].name,
  type: (['stock_in','order_fulfilment','adjustment','return'] as const)[i % 4],
  direction: i % 3 === 0 ? 'in' : 'out', quantity: 10 + i * 6, balanceAfter: 400 - i * 12,
  note: i % 3 === 0 ? 'Waybill 88213' : undefined,
  createdBy: 'u3', createdByName: 'Ifeanyi Nwosu', createdAt: iso(i),
})) as StockMovement[];

export const RETURNS: ReturnRecord[] = [
  { id: 'r1', returnNumber: 'RET-2026-0007', distributorId: 'd1', distributorName: 'Adeola Ventures Ltd', productId: 'p3', productName: 'Zesty Orange 1L', quantity: 12, reason: 'Near expiry', status: 'approved', creditValue: 100800, requestedBy: 'u7', requestedByName: 'Chidinma Okeke', createdAt: iso(5) },
  { id: 'r2', returnNumber: 'RET-2026-0006', distributorId: 'd2', distributorName: 'Northgate Trading', productId: 'p1', productName: 'Bella Malt 33cl', quantity: 6, reason: 'Wrong item shipped', status: 'requested', requestedBy: 'u8', requestedByName: 'Musa Ibrahim', createdAt: iso(1) },
];

export const LEADS: Lead[] = [
  { id: 'l1', company: 'Kwara Foods Ltd', contactName: 'Aisha Bello', phone: '08022223333', location: 'Kwara', stage: 'qualified', estimatedValue: 3200000, ownerId: 'u1', ownerName: 'Mr Oluwaseun Adeyemi', createdAt: iso(20), updatedAt: iso(3) },
  { id: 'l2', company: 'Enugu Mart', contactName: 'Obinna Eze', location: 'Enugu', stage: 'contacted', estimatedValue: 1400000, ownerId: 'u1', ownerName: 'Mr Oluwaseun Adeyemi', createdAt: iso(12), updatedAt: iso(5) },
  { id: 'l3', company: 'Abuja Grocers', contactName: 'Hauwa Sani', location: 'FCT', stage: 'new', estimatedValue: 900000, ownerId: 'u1', ownerName: 'Mr Oluwaseun Adeyemi', createdAt: iso(2), updatedAt: iso(2) },
  { id: 'l4', company: 'Port City Supplies', contactName: 'Ibim Georgewill', location: 'Rivers', stage: 'won', estimatedValue: 5100000, ownerId: 'u1', ownerName: 'Mr Oluwaseun Adeyemi', createdAt: iso(40), updatedAt: iso(9) },
];

export const MEMBERS: UserProfile[] = [
  { id: 'u1', email: 'oluwaseun@bellagroup.ng', firstName: 'Oluwaseun', lastName: 'Adeyemi', title: 'Mr', role: 'admin', phone: '08010001000', orgId: 'bella', active: true, createdAt: iso(300) },
  { id: 'u3', email: 'ifeanyi@bellagroup.ng', firstName: 'Ifeanyi', lastName: 'Nwosu', role: 'operations_manager', phone: '08020002000', orgId: 'bella', active: true, createdAt: iso(220) },
  { id: 'u9', email: 'blessing@bellagroup.ng', firstName: 'Blessing', lastName: 'Eze', role: 'sales_rep', phone: '08030003000', orgId: 'bella', distributorId: 'd1', territories: ['Lagos', 'Ogun'], active: true, createdAt: iso(120) },
  { id: 'u5', email: 'funke@bellagroup.ng', firstName: 'Funke', lastName: 'Adebayo', title: 'Mrs', role: 'finance_manager', orgId: 'bella', active: true, createdAt: iso(180) },
  { id: 'u6', email: 'tunde@bellagroup.ng', firstName: 'Tunde', lastName: 'Balogun', role: 'warehouse_manager', orgId: 'bella', warehouseIds: ['w1'], active: false, createdAt: iso(90) },
];

export const SETTINGS: OrgSettings = {
  name: 'Bella Group Nigeria', shortName: 'Bella', currency: 'NGN',
  email: 'accounts@bellagroup.ng', phone: '0700 BELLA NG', address: '14 Acme Road, Ikeja, Lagos',
  taxId: 'TIN-20984412', brandColor: '#0f6ab4', approvalThreshold: 500000, defaultWarehouseId: 'w1',
  proformaValidityDays: 7,
  invoiceFooter: 'Goods remain the property of Bella Group Nigeria until paid for in full.',
  banks: [
    { id: 'b1', bankName: 'Guaranty Trust Bank', accountName: 'Bella Group Nigeria Ltd', accountNumber: '0123456789' },
    { id: 'b2', bankName: 'Zenith Bank', accountName: 'Bella Group Nigeria Ltd', accountNumber: '1098765432' },
  ],
};

export const TARGETS: Target[] = [
  { id: 't1', ownerType: 'distributor', ownerId: 'd1', ownerName: 'Adeola Ventures Ltd', period: new Date().toISOString().slice(0,7), value: 4000000, createdBy: 'u1', createdAt: iso(20) },
  { id: 't2', ownerType: 'distributor', ownerId: 'd2', ownerName: 'Northgate Trading', period: new Date().toISOString().slice(0,7), value: 2500000, createdBy: 'u1', createdAt: iso(20) },
  { id: 't3', ownerType: 'rep', ownerId: 'u9', ownerName: 'Blessing Eze', period: new Date().toISOString().slice(0,7), value: 3000000, createdBy: 'u1', createdAt: iso(20) },
];

/* ---- the API surface, mirroring src/lib/db.ts ---- */
const ok = <T,>(v: T) => Promise.resolve(v);

export const listProducts = () => ok(PRODUCTS);
export const getProduct = (id: string) => ok(PRODUCTS.find((p) => p.id === id) ?? null);
export const saveProduct = async () => 'p9';
export const retireProduct = async () => {};
export const listDistributors = () => ok(DISTRIBUTORS);
export const getDistributor = (id: string) => ok(DISTRIBUTORS.find((d) => d.id === id) ?? null);
export const saveDistributor = async () => 'd9';
export const listOrders = (f: any = {}) => ok(f.status ? ORDERS.filter((o) => o.status === f.status) : ORDERS);
export const getOrder = (id: string) => ok(ORDERS.find((o) => o.id === id) ?? null);
export const createOrder = async () => 'o9';
export const decideOrder = async () => 'approved' as const;
export const fulfilOrder = async () => {};
export const listWarehouses = () => ok(WAREHOUSES);
export const listStock = () => ok(STOCK);
export const lowStock = () => ok(STOCK.filter((s) => s.threshold > 0 && s.quantity <= s.threshold));
export const listMovements = () => ok(MOVEMENTS);
export const moveStock = async () => 0;
export const setThreshold = async () => {};
export const listSales = () => ok(SALES);
export const recordSale = async () => 's9';
export const listLeads = () => ok(LEADS);
export const saveLead = async () => 'l9';
/* Honours `distributorId` as well as `status`. It used to ignore it, so the
   preview's statement listed three accounts' invoices under one account's
   name — a mock that lies about the one screen it exists to show. */
export const listInvoices = (f: any = {}) =>
  ok(
    INVOICES.filter(
      (i) =>
        (!f.status || i.status === f.status) &&
        (!f.distributorId || i.distributorId === f.distributorId),
    ),
  );
export const getInvoice = (id: string) => ok(INVOICES.find((i) => i.id === id) ?? null);
export const PAYMENTS: Payment[] = [
  { id: 'pay1', invoiceId: 'i2', invoiceNumber: 'INV-2026-0111', distributorId: 'd1', amount: 200000, method: 'transfer', reference: 'GTB/8842119', paidOn: day(4), recordedBy: 'u1', recordedByName: 'Mr Oluwaseun Adeyemi', createdAt: iso(4) },
  { id: 'pay2', invoiceId: 'i3', invoiceNumber: 'INV-2026-0110', distributorId: 'd2', amount: 372000, method: 'transfer', reference: 'ZEN/551200', paidOn: day(22), recordedBy: 'u1', recordedByName: 'Mr Oluwaseun Adeyemi', createdAt: iso(22) },
];
export const listPayments = (invoiceId?: string) =>
  ok(invoiceId ? PAYMENTS.filter((p) => p.invoiceId === invoiceId) : PAYMENTS);
export const listAccountPayments = (distributorId: string) =>
  ok(PAYMENTS.filter((p) => p.distributorId === distributorId));
export const recordPayment = async () => {};
export const creditPosition = async (id: string, limit?: number) => {
  const open = INVOICES.filter((i) => i.distributorId === id && i.status !== 'paid');
  const outstanding = open.reduce((s, i) => s + (i.total - i.amountPaid), 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = open.filter((i) => i.dueOn < today).reduce((s, i) => s + (i.total - i.amountPaid), 0);
  return { outstanding, overdue, headroom: limit === undefined ? null : limit - outstanding };
};
export const listReturns = () => ok(RETURNS);
export const listTargets = () => ok(TARGETS);
export const listMembers = () => ok(MEMBERS);
export const getProfile = () => ok(MEMBERS[0]);
export const updateProfile = async () => {};
export const getOrgSettings = () => ok(SETTINGS);
export const saveOrgSettings = async () => {};
export const nextNumber = async () => 'PO-2026-0042';
export const listTenants = () => ok([
  { id: 'bella', name: 'Bella Group Nigeria', slug: 'bella', status: 'active' as const, createdAt: iso(300), subscriptionFee: 850000, seats: 34, renewsAt: iso(-20) },
  { id: 'harmony', name: 'Harmony Distribution', slug: 'harmony', status: 'trial' as const, createdAt: iso(12), seats: 6 },
  { id: 'sahel', name: 'Sahel Foods Nigeria', slug: 'sahel', status: 'past-due' as const, createdAt: iso(500), subscriptionFee: 420000, seats: 18, renewsAt: iso(14) },
]);
export const getHomeSummary = async () => ({
  openOrders: 2, awaitingMe: 1, lowStock: 2, monthSales: 4820000, outstanding: 3616000, overdue: 1500000,
});
export const COLLECTIONS = {} as any;
export const deleteDoc = async () => {};

/* ---- the amendment surface, mirroring the new writes in src/lib/db.ts ---- */
export const updateOrder = async () => {};
export const recallOrder = async () => {};
export const submitOrder = async () => 'pending_approval' as const;
export const cancelOrder = async () => {};
export const createReturn = async () => 'r9';
export const decideReturn = async () => {};
export const saveTarget = async () => 't9';
export const removeTarget = async () => {};
export const createInvoice = async () => 'i9';
export const updateInvoice = async () => {};
export const voidInvoice = async () => {};
export const updateSale = async () => {};
export const deleteSale = async () => {};
