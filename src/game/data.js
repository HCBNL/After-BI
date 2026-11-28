// Game content for the Entrepreneur journey.
// All money is in virtual coins. Text lives in src/lib/i18n.jsx, keyed by id.

export const PRODUCTS = {
  water:   { id: 'water',   cost: 1800, ref: 2100, demand: 120, perishable: false },
  rice:    { id: 'rice',    cost: 6500, ref: 7600, demand: 45,  perishable: false },
  soap:    { id: 'soap',    cost: 3200, ref: 3750, demand: 55,  perishable: false },
  noodles: { id: 'noodles', cost: 7000, ref: 8200, demand: 35,  perishable: false },
  bread:   { id: 'bread',   cost: 700,  ref: 880,  demand: 200, perishable: true  },
};

// Three suppliers, shared across products.
// ask: multiplier on product cost. disc: hidden room to negotiate. min: minimum order.
export const SUPPLIERS = [
  { id: 'market',      ask: 1.00, disc: 0.07, min: 1,  credit: false },
  { id: 'distributor', ask: 0.97, disc: 0.08, min: 20, credit: true  },
  { id: 'factory',     ask: 0.92, disc: 0.05, min: 60, credit: false },
];

export const CREDIT_MARKUP = 0.04;   // buying on credit costs 4% more
export const CREDIT_WEEKS = 2;       // and is paid two weeks later

export const MARKETING = [
  { id: 'none',   cost: 0,     lift: 0,    rep: 0 },
  { id: 'flyers', cost: 5000,  lift: 0.10, rep: 0.005 },
  { id: 'radio',  cost: 15000, lift: 0.22, rep: 0.012 },
  { id: 'social', cost: 30000, lift: 0.35, rep: 0.02 },
];

// AI rivals. pf = price factor against the reference price.
export const RIVALS = {
  kofi:  { id: 'kofi',  pf: 0.95, mkt: 0.10, rep: 1.00, style: 'discount' },
  amina: { id: 'amina', pf: 1.06, mkt: 0.25, rep: 1.08, style: 'premium' },
  chidi: { id: 'chidi', pf: 1.00, mkt: 0.10, rep: 1.00, style: 'steady' },
  zola:  { id: 'zola',  pf: 0.97, mkt: 0.20, rep: 1.02, style: 'aggressive' },
};

// Market events. Each changes demand or cost for one week.
export const EVENTS = {
  calm:      { id: 'calm' },
  festive:   { id: 'festive',   demand: 1.40 },
  rain:      { id: 'rain',      demand: 0.75 },
  fuel:      { id: 'fuel',      cost: 1.10 },
  schools:   { id: 'schools',   demand: 1.30, only: ['water', 'noodles', 'bread'] },
  shortage:  { id: 'shortage',  cost: 1.20, demand: 1.10, pick: true },
  pricewar:  { id: 'pricewar',  rivalCut: 0.88 },
  closed:    { id: 'closed',    supplierOut: 'factory' },
  payday:    { id: 'payday',    demand: 1.20 },
};

export const LEVELS = [
  {
    id: 1, key: 'beginner', premium: false,
    weeks: 6, capital: 200000, rent: 12000, wages: 0, storage: 300,
    products: ['water', 'rice'], rivals: ['kofi', 'chidi'],
    events: ['calm', 'calm', 'calm', 'payday', 'rain', 'festive'],
    loanLimit: 0, credit: false, target: 150000, pass: 60,
  },
  {
    id: 2, key: 'apprentice', premium: false,
    weeks: 8, capital: 250000, rent: 16000, wages: 8000, storage: 400,
    products: ['water', 'rice', 'soap'], rivals: ['kofi', 'amina', 'chidi'],
    events: ['calm', 'calm', 'payday', 'rain', 'festive', 'fuel', 'pricewar'],
    loanLimit: 0, credit: true, target: 240000, pass: 65,
  },
  {
    id: 3, key: 'professional', premium: true,
    weeks: 10, capital: 300000, rent: 20000, wages: 15000, storage: 500,
    products: ['water', 'rice', 'soap', 'noodles'], rivals: ['kofi', 'amina', 'chidi'],
    events: ['calm', 'payday', 'rain', 'festive', 'fuel', 'pricewar', 'schools', 'shortage'],
    loanLimit: 200000, credit: true, target: 460000, pass: 70,
  },
  {
    id: 4, key: 'expert', premium: true,
    weeks: 12, capital: 350000, rent: 25000, wages: 22000, storage: 600,
    products: ['water', 'rice', 'soap', 'noodles', 'bread'], rivals: ['kofi', 'amina', 'chidi', 'zola'],
    events: ['calm', 'payday', 'rain', 'festive', 'fuel', 'pricewar', 'schools', 'shortage', 'closed'],
    loanLimit: 300000, credit: true, target: 540000, pass: 75,
  },
];

// Premium challenges reuse a level and change its rules.
export const CHALLENGES = [
  { id: 'festive-rush', base: 2, premium: true, change: { weeks: 6, eventsFixed: ['payday', 'festive', 'festive', 'calm', 'festive', 'rain'], target: 200000 } },
  { id: 'start-in-debt', base: 3, premium: true, change: { capital: 120000, startLoan: 150000, target: 300000 } },
  { id: 'price-war', base: 3, premium: true, change: { eventsFixed: ['pricewar', 'pricewar', 'calm', 'pricewar', 'fuel', 'pricewar', 'calm', 'pricewar', 'festive', 'pricewar'], target: 320000 } },
];

export const LOAN_RATE = 0.02;        // interest per week on loans
export const OVERDRAFT_FEE = 0.05;    // fee on any negative cash at week end
export const END_STOCK_VALUE = 0.8;   // leftover stock is valued at 80% of cost
export const WEIGHTS = { profit: 35, cash: 20, inventory: 15, negotiation: 10, pricing: 20 };

export function levelConfig(levelId, challengeId) {
  const base = LEVELS.find((l) => l.id === Number(levelId));
  if (!challengeId) return { ...base };
  const ch = CHALLENGES.find((c) => c.id === challengeId);
  const lv = LEVELS.find((l) => l.id === ch.base);
  return { ...lv, ...ch.change, challenge: ch.id, premium: true };
}
