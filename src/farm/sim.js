// Farm simulation, one farm day at a time. Deterministic: the same seed and the
// same actions on the same days always give the same harvest, so the server can
// replay a season and score it. State is plain data, changed in place.
import { CROPS, COSTS, CLIMATE, PRICE_BY_MONTH, WEIGHTS, seasonFor, stageFor } from './data.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = (seed, day, salt) => mulberry32((seed ^ Math.imul(day + 1, 2654435761) ^ salt) >>> 0)();

// ---------- calendar and weather ----------
export function monthOf(s, day) { return ((s.startMonth - 1 + Math.floor(Math.max(0, day - 1) / 30)) % 12) + 1; }
export function dateOf(s, day) { return { month: monthOf(s, day), date: (Math.max(0, day - 1) % 30) + 1 }; }

// Weather of a farm day is fixed by the seed, so a forecast can be shown.
export function weatherOn(s, day) {
  const m = monthOf(s, day);
  const c = CLIMATE[m];
  // a dry spell can break the rains for about ten days
  const block = Math.floor((day - 1) / 10);
  const spell = c.rain > 0.3 && rnd(s.seed, block, 77) < (s.hardness || 0.22);
  const chance = spell ? c.rain * 0.08 : c.rain;
  const r = rnd(s.seed, day, 11);
  const rains = r < chance;
  const mm = rains ? Math.round(c.mm * (0.4 + rnd(s.seed, day, 13) * 1.2)) : 0;
  const cloud = rains ? 0.75 + rnd(s.seed, day, 17) * 0.25 : clamp(1 - c.sun + (rnd(s.seed, day, 19) - 0.5) * 0.3, 0, 1);
  const sun = clamp(1 - cloud * 0.85 - (c.haze ? 0.12 : 0), 0.1, 1);
  return {
    day, month: m, rains, mm, sun: Math.round(sun * 100) / 100, cloud: Math.round(cloud * 100) / 100,
    hum: Math.round(clamp(c.hum + (rains ? 10 : 0) + (rnd(s.seed, day, 23) - 0.5) * 12, 15, 98)),
    temp: Math.round(c.temp + (rains ? -3 : 0) + (rnd(s.seed, day, 29) - 0.5) * 4),
    haze: !!c.haze, chance: Math.round(chance * 100), spell,
  };
}

export function priceOn(s, day) {
  const crop = CROPS[s.crop];
  return Math.round((crop.basePrice * PRICE_BY_MONTH[monthOf(s, day)] * (0.97 + rnd(s.seed, Math.floor(day / 5), 31) * 0.06)) / 5) * 5;
}

export function irrigateCost(s, day) {
  const c = CLIMATE[monthOf(s, day)];
  return (c.rain < 0.2 ? COSTS.irrigateDry : COSTS.irrigateRainy) * s.plots;
}

// ---------- a new season ----------
// profile: { stage, seasonNo, wallet, seedKg, restaurants }
export function newSeason(profile, seed) {
  const season = seasonFor(profile.seasonNo);
  return {
    v: 3, seed: seed >>> 0, crop: 'maize',
    stage: profile.stage, seasonNo: profile.seasonNo, season: season.id, hard: season.hard, startMonth: season.startMonth,
    hardness: season.hard ? 0.4 : 0.22,
    phase: 'plan', status: 'playing', day: 0,
    wallet: profile.wallet, walletStart: profile.wallet, seedKg: profile.seedKg || 0, restaurants: profile.restaurants || 0,
    plots: 1, auto: { water: false, manure: false },
    soil: { moisture: season.hard ? 22 : 55, nutrients: 55 },
    plant: { progress: 0, health: 100, potential: 1 },
    today: null, matureDay: null, harvestDay: null,
    booking: null,
    grainKg: 0, reserveKg: 0, sold: { market: 0, restaurant: 0, booked: 0 },
    spent: { rent: 0, seed: 0, planting: 0, manure: 0, irrigation: 0, harvest: 0, selling: 0, farmHand: 0 },
    revenue: 0, newRestaurants: 0,
    stats: { careSum: 0, careDays: 0, stressDays: 0, weakDays: 0, hungryDays: 0, rainDays: 0, paidWater: 0 },
    feed: [],
    pulse: { water: 0, manure: 0, harvest: 0 },
  };
}

export function stageName(p) {
  const pr = p.progress;
  if (pr <= 0) return 'seed';
  if (pr < 0.05) return 'germination';
  if (pr < 0.2) return 'seedling';
  if (pr < 0.5) return 'vegetative';
  if (pr < 0.62) return 'tasselling';
  if (pr < 0.85) return 'grainFill';
  if (pr < 1) return 'drying';
  return 'mature';
}

export function expectedKg(s) {
  const crop = CROPS[s.crop];
  return Math.round(s.plots * crop.yieldPerPlot * s.plant.potential * (0.6 + 0.4 * s.plant.health / 100));
}

const note = (s, k, extra = {}) => { s.feed.unshift({ day: s.day, k, ...extra }); if (s.feed.length > 40) s.feed.pop(); };

function pay(s, key, amount) {
  if (s.wallet < amount) return false;
  s.wallet -= amount; s.spent[key] += amount;
  return true;
}

// ---------- one farm day ----------
export function stepDay(s) {
  if (s.status !== 'playing' || s.phase === 'plan' || s.phase === 'sell') return false;
  // a crop left standing long after it is ready stops changing: what is lost is lost
  if (s.phase === 'harvest' && s.day - s.matureDay > CROPS[s.crop].harvestWindow + 40) return false;
  const d = s.day + 1;
  s.day = d;
  const w = weatherOn(s, d);
  s.today = w;
  s.pulse = { water: 0, manure: 0, harvest: 0 };
  if (w.rains) s.stats.rainDays += 1;

  // standing orders, done by your farm hand at sunrise
  if (s.phase === 'grow' || s.phase === 'harvest') {
    if (s.auto.water || s.auto.manure) {
      const wage = COSTS.farmHandPerPlot * s.plots;
      if (!pay(s, 'farmHand', wage)) { s.auto = { water: false, manure: false }; note(s, 'handLeft'); }
    }
    if (s.auto.water && s.soil.moisture < 35 && s.phase === 'grow' && !w.rains) doWater(s, true);
    if (s.auto.manure && s.soil.nutrients < 30 && s.plant.progress < 0.85) doManure(s, true);
  }

  // water in and out of the soil
  const et = 3 + (w.temp - 26) * 0.3 + w.sun * 3 + (w.haze ? 1 : 0);
  s.soil.moisture = clamp(s.soil.moisture + w.mm * 1.5 - et, 0, 100);

  if (s.phase === 'grow') {
    const p = s.plant;
    const crop = CROPS[s.crop];
    const fw = s.soil.moisture >= 45 ? 1 : Math.max(0.15, s.soil.moisture / 45);
    const fs = 0.55 + 0.45 * Math.min(1, w.sun / 0.75);
    const fn = s.soil.nutrients >= 35 ? 1 : 0.45 + s.soil.nutrients / 64;
    const germinating = p.progress < 0.05;
    if (!(germinating && s.soil.moisture < 25)) p.progress += (1 / crop.days) * fw * fs * fn;
    const critical = p.progress >= 0.5 && p.progress < 0.85;
    s.soil.nutrients = clamp(s.soil.nutrients - (0.25 + (p.progress < 0.62 ? 0.75 : 0.35)), 0, 100);

    let fine = true;
    if (s.soil.moisture < 30) { p.health -= critical ? 6 : 3.5; p.potential -= critical ? 0.018 : 0.006; s.stats.stressDays += 1; fine = false; }
    if (w.sun < 0.45) { p.health -= 1.2; s.stats.weakDays += 1; fine = false; }
    if (s.soil.nutrients < 30 && p.progress < 0.62) { p.potential -= 0.004; p.health -= 0.6; s.stats.hungryDays += 1; fine = false; }
    if (fine && s.soil.moisture >= 40) p.health += 2;
    p.health = clamp(p.health, 0, 100);
    p.potential = clamp(p.potential, 0.05, 1);
    s.stats.careSum += p.health; s.stats.careDays += 1;

    // a buyer may offer to book your harvest while the grain fills
    if (!s.booking && p.progress >= 0.62 && p.progress < 0.9 && rnd(s.seed, d, 41) < 0.07) {
      s.booking = { day: d, kg: Math.round(expectedKg(s) * 0.5 / 10) * 10, until: d + 5, accepted: null };
      note(s, 'booking', { kg: s.booking.kg });
    }
    if (s.booking && s.booking.accepted === null && d > s.booking.until) { s.booking.accepted = false; note(s, 'bookingGone'); }

    if (s.soil.moisture < 30 && !w.rains) { if (!s.feed.length || s.feed[0].k !== 'dry' || s.feed[0].day < d - 3) note(s, 'dry'); }
    if (p.progress >= 1) { p.progress = 1; s.phase = 'harvest'; s.matureDay = d; note(s, 'mature'); }
  } else if (s.phase === 'harvest') {
    const crop = CROPS[s.crop];
    if (d - s.matureDay > crop.harvestWindow) {
      s.plant.potential = Math.max(0.3, s.plant.potential * 0.985);
      if ((d - s.matureDay - crop.harvestWindow) % 4 === 1) note(s, 'lateHarvest');
    }
  }
  if (w.rains && w.mm > 18) note(s, 'bigRain', { mm: w.mm });
  return true;
}

function doWater(s, auto) {
  const cost = irrigateCost(s, s.day || 1);
  if (!pay(s, 'irrigation', cost)) { if (auto) note(s, 'noCashWater'); return false; }
  s.soil.moisture = clamp(s.soil.moisture + 45, 0, 100);
  if (cost / s.plots >= COSTS.irrigateDry) s.stats.paidWater += 1;
  s.pulse.water = 1;
  note(s, auto ? 'autoWater' : 'water', { c: cost });
  return true;
}
function doManure(s, auto) {
  const cost = COSTS.manurePerPlot * s.plots;
  if (!pay(s, 'manure', cost)) { if (auto) note(s, 'noCashManure'); return false; }
  s.soil.nutrients = clamp(s.soil.nutrients + 35, 0, 100);
  s.pulse.manure = 1;
  note(s, auto ? 'autoManure' : 'manure', { c: cost });
  return true;
}

// ---------- actions ----------
export function act(s, t, a = []) {
  if (s.status !== 'playing') return { ok: false, error: 'over' };
  const crop = CROPS[s.crop];
  const stage = stageFor(s.stage);
  switch (t) {
    case 'plots': {
      if (s.phase !== 'plan') return { ok: false, error: 'state' };
      const n = Math.floor(a[0]);
      if (!(n >= 1 && n <= stage.maxPlots)) return { ok: false, error: 'plots' };
      s.plots = n;
      return { ok: true };
    }
    case 'auto': {
      s.auto = { water: !!a[0], manure: !!a[1] };
      return { ok: true };
    }
    case 'plant': {
      if (s.phase !== 'plan') return { ok: false, error: 'state' };
      const c = planCost(s);
      if (s.wallet < c.total) return { ok: false, error: 'cash' };
      pay(s, 'rent', c.rent); pay(s, 'seed', c.seed); pay(s, 'planting', c.planting);
      s.seedKg -= c.ownSeed;
      s.phase = 'grow'; s.day = 0;
      note(s, 'planted', { n: s.plots });
      return { ok: true };
    }
    case 'water': {
      if (s.phase !== 'grow') return { ok: false, error: 'state' };
      if (s.soil.moisture >= 90) return { ok: false, error: 'wet' };
      return doWater(s, false) ? { ok: true } : { ok: false, error: 'cash' };
    }
    case 'manure': {
      if (s.phase !== 'grow' || s.plant.progress >= 0.85) return { ok: false, error: 'state' };
      if (s.soil.nutrients >= 90) return { ok: false, error: 'full' };
      return doManure(s, false) ? { ok: true } : { ok: false, error: 'cash' };
    }
    case 'book': {
      if (!s.booking || s.booking.accepted !== null) return { ok: false, error: 'state' };
      s.booking.accepted = !!a[0];
      note(s, a[0] ? 'booked' : 'bookingNo', { kg: s.booking.kg });
      return { ok: true };
    }
    case 'harvest': {
      if (s.phase !== 'harvest') return { ok: false, error: 'state' };
      // harvest labour can wait to be paid from the sales
      s.wallet -= COSTS.harvestPerPlot * s.plots; s.spent.harvest += COSTS.harvestPerPlot * s.plots;
      s.grainKg = expectedKg(s);
      s.harvestDay = s.day;
      s.phase = 'sell';
      s.pulse.harvest = 1;
      if (s.booking && s.booking.accepted) {
        const kg = Math.min(s.booking.kg, s.grainKg);
        const gross = kg * priceOn(s, s.day);
        const fee = Math.round(gross * COSTS.bookingFee);
        s.sold.booked = kg; s.revenue += gross; s.spent.selling += fee; s.wallet += gross - fee;
        note(s, 'bookedSold', { kg });
      }
      note(s, 'harvested', { kg: s.grainKg });
      // suggest keeping enough seed for next season
      s.reserveKg = Math.min(left(s), Math.max(0, s.plots * crop.seedKgPerPlot - s.seedKg));
      return { ok: true, kg: s.grainKg };
    }
    case 'reserve': {
      if (s.phase !== 'sell') return { ok: false, error: 'state' };
      s.reserveKg = clamp(Math.floor(a[0]), 0, s.grainKg - s.sold.market - s.sold.restaurant - s.sold.booked);
      return { ok: true };
    }
    case 'sellMarket': {
      if (s.phase !== 'sell') return { ok: false, error: 'state' };
      const kg = Math.min(Math.floor(a[0]), left(s));
      if (!(kg > 0)) return { ok: false, error: 'qty' };
      const gross = kg * priceOn(s, s.day);
      const cost = Math.round(gross * COSTS.marketFee) + Math.ceil(kg / 500) * COSTS.marketTransport;
      s.sold.market += kg; s.revenue += gross; s.spent.selling += cost; s.wallet += gross - cost;
      return { ok: true, kg, net: gross - cost };
    }
    case 'sellRestaurant': {
      if (s.phase !== 'sell') return { ok: false, error: 'state' };
      const n = Math.floor(a[0]);
      if (!(n >= 1 && n <= 20)) return { ok: false, error: 'qty' };
      const kg = Math.min(n * COSTS.restaurantKg, left(s));
      if (!(kg > 0)) return { ok: false, error: 'qty' };
      const known = s.restaurants;                       // restaurants you already won keep buying
      const fresh = Math.max(0, n - known);
      const cost = fresh * COSTS.restaurantOutreach;
      if (s.wallet + kg * priceOn(s, s.day) < cost) return { ok: false, error: 'cash' };
      const gross = kg * priceOn(s, s.day);
      s.sold.restaurant += kg; s.revenue += gross; s.spent.selling += cost; s.wallet += gross - cost;
      s.restaurants = Math.max(s.restaurants, n); s.newRestaurants += fresh;
      return { ok: true, kg, fresh };
    }
    case 'finish': {
      if (s.phase !== 'sell') return { ok: false, error: 'state' };
      // grain you did not sell is kept in the store as seed for next season
      s.seedKg += left(s) + s.reserveKg;
      s.phase = 'done'; s.status = 'done';
      note(s, 'finished');
      return { ok: true };
    }
    default:
      return { ok: false, error: 'invalid' };
  }
}

// unsold grain, not counting what is set aside as seed
export function left(s) { return Math.max(0, s.grainKg - s.sold.market - s.sold.restaurant - s.sold.booked - s.reserveKg); }

export function planCost(s) {
  const crop = CROPS[s.crop];
  const need = s.plots * crop.seedKgPerPlot;
  const ownSeed = Math.min(s.seedKg, need);
  const rent = COSTS.rentPerPlot * s.plots;
  const seed = (need - ownSeed) * crop.seedPrice;
  const planting = COSTS.plantingPerPlot * s.plots;
  return { rent, seed, planting, ownSeed, need, total: rent + seed + planting };
}

// ---------- score ----------
export function finalScore(s) {
  const crop = CROPS[s.crop];
  const stage = stageFor(s.stage);
  const sp = s.spent;
  const costs = sp.rent + sp.seed + sp.planting + sp.manure + sp.irrigation + sp.harvest + sp.selling + sp.farmHand;
  const profit = Math.round(s.revenue - costs);
  const target = stage.targetPerPlot * s.plots;
  const maxKg = s.plots * crop.yieldPerPlot;
  const yieldScore = clamp(Math.round((100 * s.grainKg) / maxKg), 0, 100);
  const profitScore = clamp(Math.round((100 * profit) / target), 0, 100);
  const careScore = s.stats.careDays ? clamp(Math.round(s.stats.careSum / s.stats.careDays), 0, 100) : 0;
  const sellCostShare = s.revenue > 0 ? sp.selling / s.revenue : 1;
  const sellingScore = s.revenue > 0 ? clamp(Math.round(100 - sellCostShare * 450), 0, 100) : 0;
  const need = s.plots * crop.seedKgPerPlot;
  const seedScore = clamp(Math.round((100 * s.seedKg) / need), 0, 100);
  const parts = { yield: yieldScore, profit: profitScore, care: careScore, selling: sellingScore, seed: seedScore };
  const total = Math.round(Object.entries(parts).reduce((a, [k, v]) => a + v * WEIGHTS[k], 0) / 100);
  const passed = total >= stage.pass && profit > 0;
  return {
    total, parts, passed, stars: !passed ? 0 : total >= 90 ? 3 : total >= 75 ? 2 : 1,
    profit, target, pass: stage.pass, grainKg: s.grainKg, maxKg, revenue: Math.round(s.revenue), costs,
    sellShare: Math.round(sellCostShare * 1000) / 10, seedKg: s.seedKg, need, wallet: s.wallet,
  };
}

// ---------- replay (server) ----------
// log entries: { d: farm day, t: action, a: args }
const TYPES = new Set(['plots', 'auto', 'plant', 'water', 'manure', 'book', 'harvest', 'reserve', 'sellMarket', 'sellRestaurant', 'finish']);
export function replaySeason(profile, seed, log) {
  const s = newSeason(profile, seed);
  for (const e of log || []) {
    if (s.status !== 'playing' || !e || !TYPES.has(e.t)) break;
    const d = e.d | 0;
    if (d < s.day) break;
    let guard = 0;
    while (s.day < d && (s.phase === 'grow' || s.phase === 'harvest') && guard++ < 1000) { if (!stepDay(s)) break; }
    if (s.day !== d) break;
    act(s, e.t, Array.isArray(e.a) ? e.a : []);
  }
  return s;
}

// What a finished season leaves for the next one.
export function nextProfile(s, score) {
  return {
    stage: score.passed ? Math.min(s.stage + 1, 6) : s.stage,
    seasonNo: s.seasonNo + 1,
    wallet: Math.round(s.wallet),
    seedKg: s.seedKg,
    restaurants: s.restaurants,
  };
}
