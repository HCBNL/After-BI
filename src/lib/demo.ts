/**
 * A demonstration organisation, filled with a business that looks real.
 *
 * Everything is written through the app's own functions, so the numbers agree
 * with each other the way they would if a team had keyed them: fulfilling an
 * order moves the stock ledger, a payment moves the invoice's balance, and
 * sell-out lands on the dates it says it does.
 *
 * The rules require every record to be written by the person signed in, so a
 * super admin runs this; each record then carries a rep's name, which is what
 * the screens show. Nothing here can be deleted afterwards (returns, invoices
 * and the ledger are append-only by design), so it belongs in an organisation
 * created for demonstrations, never in a live one.
 */
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { orgPath, requireOrg } from './tenant';
import { createAccount } from './accounts';
import {
  cancelOrder,
  createInvoice,
  createOrder,
  createReturn,
  decideOrder,
  decideReturn,
  fulfilOrder,
  moveStock,
  recordPayment,
  recordSale,
  saveDistributor,
  saveLead,
  saveOrgSettings,
  saveProduct,
  saveTarget,
  saveWarehouse,
  setThreshold,
  listDistributors,
  listProducts,
  listWarehouses,
  updateProfile,
} from './db';
import type { Distributor, Invoice, LeadStage, PriceTier, Product, Role, UserProfile } from '@/types';

/** The password on every walkthrough sign-in this makes. Shown in Settings. */
export const DEMO_PASSWORD = 'DemoPass2026';

export interface DemoProgress {
  label: string;
  done: number;
  total: number;
}

/* ------------------------------------------------------------ the business */

const REPS = [
  { firstName: 'Ada', lastName: 'Okeke' },
  { firstName: 'Bayo', lastName: 'Adeyemi' },
  { firstName: 'Chidi', lastName: 'Nwosu' },
  { firstName: 'Halima', lastName: 'Yusuf' },
];

const DEPOTS = [
  { name: 'Lagos main depot', location: 'Lagos' },
  { name: 'Aba depot', location: 'Abia' },
  { name: 'Kano depot', location: 'Kano' },
];

const CATALOGUE: Omit<Product, 'id' | 'status'>[] = [
  { name: 'Classic Cooking Oil 5L', category: 'Edible oil', unit: 'carton of 4', moq: 10, pricing: { OT: 34500, MT: 33200, SA: 32000 } },
  { name: 'Classic Cooking Oil 1L', category: 'Edible oil', unit: 'carton of 12', moq: 10, pricing: { OT: 21600, MT: 20800, SA: 20000 } },
  { name: 'Sunrise Detergent 900g', category: 'Home care', unit: 'carton of 12', moq: 20, pricing: { OT: 18400, MT: 17600, SA: 17000 } },
  { name: 'Sunrise Bar Soap 700g', category: 'Home care', unit: 'carton of 20', moq: 20, pricing: { OT: 14200, MT: 13600, SA: 13100 } },
  { name: 'Mama Gold Noodles 70g', category: 'Food', unit: 'carton of 40', moq: 25, pricing: { OT: 8200, MT: 7900, SA: 7600 } },
  { name: 'Mama Gold Seasoning Cubes', category: 'Food', unit: 'carton of 60', moq: 15, pricing: { OT: 12600, MT: 12100, SA: 11700 } },
  { name: 'Tomato Paste 210g', category: 'Food', unit: 'carton of 24', moq: 15, pricing: { OT: 16800, MT: 16200, SA: 15600 } },
  { name: 'Full Cream Milk Powder 400g', category: 'Dairy', unit: 'carton of 12', moq: 10, pricing: { OT: 38400, MT: 36900, SA: 35500 } },
  { name: 'Choco Biscuits 45g', category: 'Snacks', unit: 'carton of 50', moq: 20, pricing: { OT: 9400, MT: 9000, SA: 8700 } },
  { name: 'Citrus Energy Drink 330ml', category: 'Beverages', unit: 'carton of 24', moq: 20, pricing: { OT: 11200, MT: 10800, SA: 10400 } },
  { name: 'Fresh Mint Toothpaste 140g', category: 'Personal care', unit: 'carton of 24', moq: 15, pricing: { OT: 22400, MT: 21500, SA: 20800 } },
  { name: 'Soft Touch Tissue 10 rolls', category: 'Home care', unit: 'bale of 6', moq: 20, pricing: { OT: 15600, MT: 15000, SA: 14400 } },
];

const CUSTOMERS: {
  company: string;
  contactName: string;
  location: string;
  category: PriceTier;
  creditLimit: number;
  paymentTermsDays: number;
}[] = [
  { company: 'Bella Foods Ltd', contactName: 'Bella Nwachukwu', location: 'Lagos', category: 'MT', creditLimit: 6000000, paymentTermsDays: 30 },
  { company: 'Zenith Superstores', contactName: 'Tunde Bakare', location: 'Lagos', category: 'MT', creditLimit: 9000000, paymentTermsDays: 45 },
  { company: 'Onitsha Main Traders', contactName: 'Emeka Obi', location: 'Anambra', category: 'OT', creditLimit: 4000000, paymentTermsDays: 21 },
  { company: 'Ariaria Distribution', contactName: 'Chinyere Eze', location: 'Abia', category: 'OT', creditLimit: 3500000, paymentTermsDays: 21 },
  { company: 'Kano Central Supplies', contactName: 'Musa Danjuma', location: 'Kano', category: 'OT', creditLimit: 5000000, paymentTermsDays: 30 },
  { company: 'Abuja Retail Partners', contactName: 'Grace Audu', location: 'FCT', category: 'MT', creditLimit: 7000000, paymentTermsDays: 30 },
  { company: 'Port Harcourt Provisions', contactName: 'Ibim George', location: 'Rivers', category: 'OT', creditLimit: 3000000, paymentTermsDays: 14 },
  { company: 'Ibadan Wholesale Hub', contactName: 'Segun Alabi', location: 'Oyo', category: 'OT', creditLimit: 2500000, paymentTermsDays: 21 },
  { company: 'Benin Trade Stores', contactName: 'Osaro Igbinedion', location: 'Edo', category: 'OT', creditLimit: 2000000, paymentTermsDays: 14 },
  { company: 'Northern Hotels Group', contactName: 'Fatima Bello', location: 'Kaduna', category: 'SA', creditLimit: 4500000, paymentTermsDays: 45 },
];

const OUTLETS = [
  'Mile 12 market',
  'Balogun market',
  'Ariaria market',
  'Sabon Gari market',
  'Wuse market',
  'Oil Mill market',
  'Bodija market',
  'New Benin market',
];

const PIPELINE: { company: string; contactName: string; location: string; stage: LeadStage; estimatedValue: number }[] = [
  { company: 'Calabar Fresh Mart', contactName: 'Eno Effiong', location: 'Cross River', stage: 'new', estimatedValue: 1800000 },
  { company: 'Jos Highland Stores', contactName: 'Dung Pam', location: 'Plateau', stage: 'contacted', estimatedValue: 1200000 },
  { company: 'Ilorin Value Mart', contactName: 'Rasheed Lawal', location: 'Kwara', stage: 'qualified', estimatedValue: 2400000 },
  { company: 'Warri Coastal Traders', contactName: 'Oghenero Tega', location: 'Delta', stage: 'won', estimatedValue: 3100000 },
  { company: 'Maiduguri Grocers', contactName: 'Aisha Kolo', location: 'Borno', stage: 'lost', estimatedValue: 900000 },
];

/* --------------------------------------------------------------- helpers */

/* Seeded, so two demonstrations of the same script look the same. */
let seed = 20260920;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T,>(list: T[]): T => list[Math.floor(rnd() * list.length)] as T;
const between = (low: number, high: number) => low + Math.floor(rnd() * (high - low + 1));
const dayISO = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);

async function inChunks<T>(jobs: (() => Promise<T>)[], size = 6): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < jobs.length; i += size) {
    out.push(...(await Promise.all(jobs.slice(i, i + size).map((job) => job()))));
  }
  return out;
}

/** The signed-in person, wearing a rep's name so the screens read like a team's. */
function asRep(actor: UserProfile, index?: number) {
  const rep = index === undefined ? pick(REPS) : REPS[index % REPS.length];
  return { id: actor.id, firstName: rep.firstName, lastName: rep.lastName, role: 'sales_rep' as const };
}

/* ------------------------------------------------------------------ seed */

export async function seedDemo(actor: UserProfile, onProgress: (progress: DemoProgress) => void): Promise<void> {
  const total = 10;
  let done = 0;
  const tick = (label: string) => onProgress({ label, done: ++done, total });

  /* Claimed straight away, so a second window does not start it all again. */
  await saveOrgSettings({ demo: true, demoSeeding: new Date().toISOString() });

  /* 1. depots */
  tick('Opening the depots');
  const depots = await inChunks(
    DEPOTS.map((depot) => () => saveWarehouse({ ...depot, kind: 'company' as const })),
    3,
  );
  await saveOrgSettings({ defaultWarehouseId: depots[0], approvalThreshold: 1500000, currency: 'NGN' });

  /* 2. catalogue */
  tick('Loading the catalogue');
  const products: Product[] = await inChunks(
    CATALOGUE.map((line) => async () => {
      const id = await saveProduct({ ...line, status: 'active' });
      return { id, status: 'active', ...line } as Product;
    }),
  );

  /* 3. stock, with a few lines deliberately under their threshold */
  tick('Putting stock into the depots');
  const stockJobs: (() => Promise<unknown>)[] = [];
  depots.forEach((depotId, depotIndex) => {
    const lines = depotIndex === 0 ? products : products.slice(0, 6);
    for (const product of lines) {
      const quantity = between(60, 480);
      const low = rnd() < 0.2;
      stockJobs.push(async () => {
        await moveStock({
          warehouseId: depotId,
          product,
          type: 'stock_in',
          direction: 'in',
          quantity,
          note: 'Opening stock',
          actor,
        });
        await setThreshold(depotId, product.id, low ? Math.round(quantity * 1.4) : Math.round(quantity * 0.2));
      });
    }
  });
  await inChunks(stockJobs, 6);

  /* 4. the distributors */
  tick('Signing up the distributors');
  const customers: Distributor[] = await inChunks(
    CUSTOMERS.map((customer) => async () => {
      const id = await saveDistributor({
        ...customer,
        email: `${customer.company.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
        phone: `080${between(10000000, 99999999)}`,
        status: 'active' as const,
      });
      return { id, status: 'active', email: '', ...customer } as Distributor;
    }),
    5,
  );

  /* 5. six months of sell-out */
  tick('Six months of sell-out');
  const saleJobs: (() => Promise<unknown>)[] = [];
  for (let day = 178; day >= 1; day -= 2) {
    const distributor = pick(customers);
    const product = pick(products);
    saleJobs.push(() =>
      recordSale({
        product,
        distributor,
        quantity: between(2, 26),
        unitPrice: product.pricing[distributor.category] ?? 0,
        outlet: pick(OUTLETS),
        saleDate: dayISO(day),
        actor: asRep(actor),
      }),
    );
  }
  await inChunks(saleJobs, 8);

  /* 6. orders at every stage of the flow */
  tick('Orders through the flow');
  const linesFor = () => {
    const chosen = new Set<Product>();
    while (chosen.size < between(2, 4)) chosen.add(pick(products));
    return [...chosen].map((product) => ({ product, quantity: between(3, 14) }));
  };
  const raise = (options: { submit?: boolean; approvers?: { uid: string; name: string }[] } = {}, index = 0) => {
    const distributor = pick(customers);
    const lines = linesFor();
    return {
      distributor,
      lines,
      promise: createOrder({
        distributor,
        lines,
        note: rnd() < 0.4 ? pick(['Deliver before Friday', 'Call the store before the truck leaves', 'Split across two trucks']) : undefined,
        author: asRep(actor, index),
        ...options,
      }),
    };
  };

  for (let i = 0; i < 3; i++) await raise({}, i).promise;

  /* Waiting for a signature, and pointed at whoever is showing the demo. */
  for (let i = 0; i < 2; i++) {
    const id = await raise({ submit: true, approvers: [{ uid: 'demo-awaiting', name: 'Finance' }] }, i).promise;
    await updateDoc(doc(db, orgPath('orders'), id), {
      approvers: [actor.id],
      approverNames: { [actor.id]: `${actor.firstName} ${actor.lastName}`.trim() },
    });
  }

  for (let i = 0; i < 3; i++) await raise({ submit: true }, i).promise;

  const fulfilled: { id: string; distributor: Distributor; lines: { product: Product; quantity: number }[] }[] = [];
  for (let i = 0; i < 6; i++) {
    const order = raise({ submit: true }, i);
    const id = await order.promise;
    await fulfilOrder(id, depots[0], actor);
    fulfilled.push({ id, distributor: order.distributor, lines: order.lines });
  }

  const cancelled = await raise({}, 0).promise;
  await cancelOrder(cancelled, actor, 'The store changed its mind before the truck left');

  const rejected = await raise({ submit: true, approvers: [{ uid: 'demo-awaiting', name: 'Finance' }] }, 1).promise;
  await decideOrder(rejected, 'rejected', actor, 'Account is over its credit limit');

  /* 7. invoices, some paid, some part paid, one overdue */
  tick('Invoices and payments');
  for (const [index, order] of fulfilled.entries()) {
    const lines = order.lines.map(({ product, quantity }) => {
      const unitPrice = product.pricing[order.distributor.category] ?? 0;
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
    const invoiceId = await createInvoice({
      distributor: order.distributor,
      lines,
      total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
      issuedOn: dayISO(between(8, 75)),
      issue: true,
      actor,
    });
    const snap = await getDoc(doc(db, orgPath('invoices'), invoiceId));
    if (!snap.exists()) continue;
    const invoice = { id: invoiceId, ...(snap.data() as Omit<Invoice, 'id'>) };
    if (index % 3 === 0) continue; /* left open, and some of these fall overdue */
    await recordPayment({
      invoice,
      amount: index % 3 === 1 ? invoice.total : Math.round(invoice.total * 0.45),
      method: pick(['transfer', 'cash', 'cheque'] as const),
      reference: `TRF/${between(100000, 999999)}`,
      paidOn: dayISO(between(1, 20)),
      actor,
    });
  }

  /* 8. two claims */
  tick('Claims and credits');
  const damaged = pick(customers);
  const damagedLine = pick(products);
  const claim = await createReturn({
    distributor: damaged,
    product: damagedLine,
    quantity: 4,
    reason: 'Damage: four cartons crushed against the tailgate',
    actor,
  });
  await decideReturn(claim, 'received', actor, {
    creditValue: (damagedLine.pricing[damaged.category] ?? 0) * 4,
    warehouseId: depots[0],
  });
  await createReturn({
    distributor: pick(customers),
    product: pick(products),
    quantity: 3,
    reason: 'Shortage: waybill signed three short on arrival',
    actor,
  });

  /* 9. targets and a pipeline */
  tick('Targets and a pipeline');
  const period = monthKey();
  await inChunks([
    ...customers.slice(0, 6).map((customer) => () =>
      saveTarget(
        { ownerType: 'distributor', ownerId: customer.id, ownerName: customer.company, period, value: between(3, 12) * 500000 },
        actor,
      ),
    ),
    ...REPS.map((rep, index) => () =>
      saveTarget(
        {
          ownerType: 'rep',
          ownerId: `demo-rep-${index}`,
          ownerName: `${rep.firstName} ${rep.lastName}`,
          period,
          value: between(6, 16) * 500000,
        },
        actor,
      ),
    ),
    ...PIPELINE.map((lead, index) => () =>
      saveLead({
        ...lead,
        ownerId: actor.id,
        ownerName: `${REPS[index % REPS.length].firstName} ${REPS[index % REPS.length].lastName}`,
        note: 'Met at the trade fair in Lagos',
      }),
    ),
  ], 5);

  /* 10. the sign-ins for the walkthrough */
  tick('Sign-ins for the walkthrough');
  const orgId = requireOrg();
  const crew: {
    firstName: string;
    lastName: string;
    role: Exclude<Role, 'owner'>;
    handle: string;
    distributorIds?: string[];
    distributorId?: string;
    distributorCategory?: PriceTier;
    warehouseIds?: string[];
    territories?: string[];
  }[] = [
    {
      firstName: 'Ada',
      lastName: 'Okeke',
      role: 'sales_rep',
      handle: 'rep',
      distributorIds: customers.slice(0, 4).map((c) => c.id),
      territories: ['Lagos', 'Ogun', 'Oyo', 'Anambra'],
    },
    { firstName: 'Musa', lastName: 'Danjuma', role: 'warehouse_manager', handle: 'depot', warehouseIds: [depots[0]] },
    {
      firstName: 'Bella',
      lastName: 'Nwachukwu',
      role: 'distributor',
      handle: 'buyer',
      distributorId: customers[0].id,
      distributorCategory: customers[0].category,
    },
  ];

  const demoLogins: { name: string; role: Role; email: string }[] = [];
  for (const person of crew) {
    const email = `${person.handle}@${orgId}.demo`;
    try {
      const { uid } = await createAccount({
        email,
        password: DEMO_PASSWORD,
        role: person.role,
        firstName: person.firstName,
        lastName: person.lastName,
        distributorId: person.distributorId,
        distributorCategory: person.distributorCategory,
        distributorIds: person.distributorIds,
        warehouseIds: person.warehouseIds,
      });
      if (person.territories) await updateProfile(uid, { territories: person.territories });
      if (person.role === 'distributor' && person.distributorId) {
        await saveDistributor({ id: person.distributorId, userId: uid });
      }
    } catch {
      /* Already made on an earlier run: the sign-in still works. */
    }
    demoLogins.push({ name: `${person.firstName} ${person.lastName}`, role: person.role, email });
  }

  await saveOrgSettings({ demo: true, demoSeededAt: new Date().toISOString(), demoLogins });
  onProgress({ label: 'Ready to show', done: total, total });
}

/**
 * Keeps a demonstration current: this week's sell-out and two fresh orders,
 * one of them waiting for the signature of whoever is presenting. Run it
 * before a presentation if the organisation was filled a while ago.
 */
export async function topUpDemo(actor: UserProfile, onProgress: (progress: DemoProgress) => void): Promise<void> {
  const total = 3;
  let done = 0;
  const tick = (label: string) => onProgress({ label, done: ++done, total });

  tick('Reading the catalogue');
  const [products, customers, depots] = await Promise.all([listProducts(true), listDistributors(), listWarehouses()]);
  if (!products.length || !customers.length) {
    throw new Error('There is nothing to add to yet. Fill the organisation with demo data first.');
  }

  tick('This week of sell-out');
  await inChunks(
    Array.from({ length: 18 }, () => {
      const distributor = pick(customers);
      const product = pick(products);
      return () =>
        recordSale({
          product,
          distributor,
          quantity: between(2, 22),
          unitPrice: product.pricing[distributor.category] ?? 0,
          outlet: pick(OUTLETS),
          saleDate: dayISO(between(0, 6)),
          actor: asRep(actor),
        });
    }),
    8,
  );

  tick('Two fresh orders');
  const linesNow = () => {
    const chosen = new Set<Product>();
    while (chosen.size < 3) chosen.add(pick(products));
    return [...chosen].map((product) => ({ product, quantity: between(3, 10) }));
  };

  const waiting = pick(customers);
  const waitingId = await createOrder({
    distributor: waiting,
    lines: linesNow(),
    note: 'Wants it before the weekend',
    author: asRep(actor),
    submit: true,
    approvers: [{ uid: 'demo-awaiting', name: 'Finance' }],
  });
  await updateDoc(doc(db, orgPath('orders'), waitingId), {
    approvers: [actor.id],
    approverNames: { [actor.id]: `${actor.firstName} ${actor.lastName}`.trim() },
  });

  const shipped = pick(customers);
  const shippedLines = linesNow();
  const shippedId = await createOrder({ distributor: shipped, lines: shippedLines, author: asRep(actor), submit: true });
  try {
    if (depots[0]) await fulfilOrder(shippedId, depots[0].id, actor);
  } catch {
    /* The depot ran short: the order stays approved, which is true enough. */
  }

  await saveOrgSettings({ demoSeededAt: new Date().toISOString() });
  onProgress({ label: 'Up to date', done: total, total });
}
