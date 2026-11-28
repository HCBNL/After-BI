// World levels. A level is a number of real time days in the town.
export const TICKS_PER_DAY = 720;      // one tick = one game minute, 07:00 to 19:00
export const OPEN_HOUR = 7;

export const COSTS = {
  kekeMarket: 300,       // fare between the street and the market
  kekeFactory: 500,      // fare to or from the factory
  pusher: 1500,          // truck pusher carries your goods back from the market
  carry: 30,             // units you can carry yourself
  pusherCarry: 200,      // units a truck pusher can carry
  deliverDistributor: 2000,
  deliverFactory: 4000,
  boyWage: 3000,         // nwa boi, per day
  sampling: 2000,        // sampling table, plus free units
  sampleUnits: 6,
  samplingTicks: 120,    // two game hours
  loanRate: 0.006,       // interest per day
  overdraftFee: 0.05,
};

export const WORLD_LEVELS = [
  { id: 1, key: 'beginner', premium: false, days: 4, capital: 150000, rent: 6000, storage: 250,
    products: ['water', 'rice'], rivals: ['kofi', 'chidi'], events: ['calm', 'calm', 'payday', 'rain', 'festive'],
    credit: false, loanLimit: 0, target: 60000, pass: 60 },
  { id: 2, key: 'apprentice', premium: false, days: 5, capital: 180000, rent: 8000, storage: 320,
    products: ['water', 'rice', 'soap'], rivals: ['kofi', 'chidi', 'amina'], events: ['calm', 'payday', 'rain', 'festive', 'fuel', 'pricewar'],
    credit: true, loanLimit: 0, target: 90000, pass: 65 },
  { id: 3, key: 'professional', premium: true, days: 6, capital: 220000, rent: 10000, storage: 400,
    products: ['water', 'rice', 'soap', 'noodles'], rivals: ['kofi', 'chidi', 'amina'], events: ['calm', 'payday', 'rain', 'festive', 'fuel', 'pricewar', 'schools', 'shortage'],
    credit: true, loanLimit: 150000, target: 160000, pass: 70 },
  { id: 4, key: 'expert', premium: true, days: 7, capital: 260000, rent: 12000, storage: 480,
    products: ['water', 'rice', 'soap', 'noodles', 'bread'], rivals: ['kofi', 'chidi', 'amina', 'zola'], events: ['calm', 'payday', 'rain', 'festive', 'fuel', 'pricewar', 'schools', 'shortage', 'closed'],
    credit: true, loanLimit: 200000, target: 240000, pass: 75 },
];

export const WORLD_CHALLENGES = [
  { id: 'festive-rush', base: 2, premium: true, change: { days: 4, eventsFixed: ['payday', 'festive', 'festive', 'festive'], target: 100000 } },
  { id: 'start-in-debt', base: 3, premium: true, change: { capital: 90000, startLoan: 120000, target: 110000 } },
  { id: 'price-war', base: 3, premium: true, change: { eventsFixed: ['pricewar', 'pricewar', 'calm', 'pricewar', 'fuel', 'pricewar'], target: 100000 } },
];

// street wide units wanted per day, before events and prices
export const DAY_DEMAND = { water: 90, rice: 30, soap: 36, noodles: 26, bread: 140 };

export function worldConfig(levelId, challengeId) {
  const base = WORLD_LEVELS.find((l) => l.id === Number(levelId));
  if (!challengeId) return { ...base };
  const ch = WORLD_CHALLENGES.find((c) => c.id === challengeId);
  const lv = WORLD_LEVELS.find((l) => l.id === ch.base);
  return { ...lv, ...ch.change, challenge: ch.id, premium: true };
}
