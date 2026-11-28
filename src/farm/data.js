// Farmer journey: crops, seasons, costs and the stages of the farmer's progress.
// Money is in virtual coins. One plot is one unit of farmland.

export const DAY_PACE = {
  fast: 60 * 1000,          // one farm day = 1 real minute (a season in about 2 hours)
  normal: 15 * 60 * 1000,   // one farm day = 15 real minutes (a season in about a day)
  relaxed: 60 * 60 * 1000,  // one farm day = 1 real hour (a season in about 4 days)
};

export const CROPS = {
  maize: {
    id: 'maize', days: 100,                  // days to maturity with good care
    seedKgPerPlot: 10, seedPrice: 1200,      // per kg, bought seed
    yieldPerPlot: 600,                       // kg per plot with perfect care
    basePrice: 450,                          // coins per kg, before the season moves it
    harvestWindow: 12,                       // days you can wait after maturity without loss
  },
  // ginger and cassava come in later stages
  ginger: { id: 'ginger', locked: true },
  cassava: { id: 'cassava', locked: true },
};

export const COSTS = {
  rentPerPlot: 30000,         // per season
  plantingPerPlot: 10000,     // labour to plant
  harvestPerPlot: 12000,      // labour to harvest
  manurePerPlot: 9000,        // one bag per plot
  irrigateRainy: 2500,        // per plot, pump fuel while rivers run
  irrigateDry: 4500,          // per plot, bought water in the hard season
  marketFee: 0.07,            // share of sales at the market
  marketTransport: 4000,      // per 500 kg taken to market
  restaurantOutreach: 15000,  // to win one restaurant
  restaurantKg: 300,          // one restaurant buys up to this much
  bookingFee: 0.02,           // a buyer who booked before harvest
  farmHandPerPlot: 350,       // per day, a farm hand who follows your standing orders
};

// month 1..12: chance of rain, rain size, sunshine, humidity, temperature
export const CLIMATE = {
  1: { rain: 0.02, mm: 6, sun: 0.72, hum: 30, temp: 31, haze: true },
  2: { rain: 0.05, mm: 8, sun: 0.75, hum: 32, temp: 33, haze: true },
  3: { rain: 0.15, mm: 14, sun: 0.85, hum: 45, temp: 34 },
  4: { rain: 0.38, mm: 18, sun: 0.75, hum: 65, temp: 32 },
  5: { rain: 0.5, mm: 20, sun: 0.65, hum: 75, temp: 30 },
  6: { rain: 0.58, mm: 22, sun: 0.58, hum: 80, temp: 28 },
  7: { rain: 0.6, mm: 22, sun: 0.52, hum: 84, temp: 27 },
  8: { rain: 0.42, mm: 16, sun: 0.58, hum: 82, temp: 27 },
  9: { rain: 0.58, mm: 22, sun: 0.56, hum: 84, temp: 28 },
  10: { rain: 0.38, mm: 16, sun: 0.68, hum: 75, temp: 29 },
  11: { rain: 0.08, mm: 8, sun: 0.82, hum: 50, temp: 31 },
  12: { rain: 0.02, mm: 5, sun: 0.72, hum: 34, temp: 30, haze: true },
};

// grain price across the year: cheap after the big harvest, dear in the lean months
export const PRICE_BY_MONTH = { 1: 1.1, 2: 1.15, 3: 1.2, 4: 1.25, 5: 1.25, 6: 1.15, 7: 0.95, 8: 0.85, 9: 0.85, 10: 0.9, 11: 0.95, 12: 1.0 };

// Seasons follow each other like the real farming calendar.
export const SEASONS = [
  { id: 'early', startMonth: 4, hard: false },  // main rains
  { id: 'late', startMonth: 8, hard: false },   // second rains, ending in the dry months
  { id: 'dry', startMonth: 12, hard: true },    // harmattan: water must be paid for
];

// The farmer's progress. Land you may rent grows as you pass each stage.
export const STAGES = [
  { id: 1, key: 'seed', maxPlots: 1, targetPerPlot: 90000, pass: 60, premium: false },
  { id: 2, key: 'sprout', maxPlots: 2, targetPerPlot: 100000, pass: 63, premium: false },
  { id: 3, key: 'grower', maxPlots: 3, targetPerPlot: 85000, pass: 66, premium: false },
  { id: 4, key: 'farmer', maxPlots: 5, targetPerPlot: 110000, pass: 68, premium: true },
  { id: 5, key: 'bigFarmer', maxPlots: 8, targetPerPlot: 115000, pass: 70, premium: true },
  { id: 6, key: 'agribusiness', maxPlots: 12, targetPerPlot: 120000, pass: 72, premium: true },
];

export const START_WALLET = 150000;
export const RESCUE_WALLET = 60000; // if a farmer is broke, the cooperative lends a fresh start
export const WEIGHTS = { yield: 30, profit: 25, care: 15, selling: 20, seed: 10 };

export function seasonFor(seasonNo) { return SEASONS[(seasonNo - 1) % SEASONS.length]; }
export function stageFor(id) { return STAGES.find((s) => s.id === Number(id)) || STAGES[0]; }
