// The live town. Deterministic: the same seed and the same moves at the same
// ticks always give the same result, so the server can replay a game and score it.
// State is changed in place (it runs many times a second).
import { PRODUCTS, SUPPLIERS, RIVALS, EVENTS, CREDIT_MARKUP, WEIGHTS } from '../game/data.js';
import { TICKS_PER_DAY, COSTS, DAY_DEMAND, worldConfig } from './levels.js';
import { placeById, HOMES, SUPPLIER_PLACE, findPath, targetFor, placeAtDoor } from './map.js';

const PRICE_K = 5;
const END_STOCK_VALUE = 0.8;

// ---------- random ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = (s, salt) => mulberry32((s.seed ^ (s.day * 7919) ^ (s.tick * 104729) ^ salt) >>> 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round10 = (v) => Math.round(v / 10) * 10;

// shoppers come in waves: a morning rush and an evening rush
const WAVE = (() => {
  const raw = [];
  for (let t = 0; t < TICKS_PER_DAY; t++) {
    const b = (c, w) => Math.exp(-((t - c) * (t - c)) / (2 * w * w));
    raw.push(0.55 + 0.9 * b(90, 70) + 0.5 * b(330, 80) + 1.1 * b(600, 70));
  }
  const mean = raw.reduce((a, v) => a + v, 0) / raw.length;
  return raw.map((v) => v / mean);
})();

export function config(s) { return worldConfig(s.levelId, s.challenge); }

// ---------- new game ----------
export function newWorld(levelId, challengeId = null, seed = 1) {
  const cfg = worldConfig(levelId, challengeId);
  const shop = { stock: {}, avgCost: {}, price: {} };
  cfg.products.forEach((pid) => { shop.stock[pid] = 0; shop.avgCost[pid] = PRODUCTS[pid].cost; shop.price[pid] = PRODUCTS[pid].ref; });
  const door = placeById.myshop.door;
  const s = {
    v: 2, levelId: cfg.id, challenge: cfg.challenge || null, seed: Math.floor(seed) >>> 0,
    day: 1, tick: 0, days: cfg.days, phase: 'night', status: 'playing',
    cash: cfg.capital + (cfg.startLoan || 0), loan: cfg.startLoan || 0, payables: [], rep: 1,
    shop,
    player: { x: door[0], y: door[1], px: door[0], py: door[1], path: [], speed: 1, carry: {}, pusher: false, keke: null },
    boy: false, boyToday: false,
    sampling: { left: 0, pid: null },
    deliveries: [],
    agents: [], nextId: 1,
    market: null, today: null, history: [],
    totals: { revenue: 0, cogs: 0, bought: 0, spoiled: 0, served: 0, lostStock: 0, lostClosed: 0,
      askValue: 0, paidValue: 0, roomValue: 0, overdraftDays: 0, lowCashDays: 0, shareSum: 0, shareCount: 0 },
  };
  prepareDay(s);
  return s;
}

function newToday() {
  return { revenue: 0, cogs: 0, sold: {}, wanted: {}, lostStock: {}, lostClosed: {}, spent: { keke: 0, pusher: 0, delivery: 0, sampling: 0, sampleUnits: 0 }, purchases: [], rivalSold: {} };
}

// Morning: news, demand, supplier prices, rival prices.
function prepareDay(s) {
  const cfg = config(s);
  const r = rng(s, 11);
  let eventId;
  if (cfg.eventsFixed) eventId = cfg.eventsFixed[(s.day - 1) % cfg.eventsFixed.length];
  else eventId = s.day === 1 ? 'calm' : cfg.events[Math.floor(r() * cfg.events.length)];
  const ev = EVENTS[eventId];
  const eventProduct = ev.pick ? cfg.products[Math.floor(r() * cfg.products.length)] : null;
  const pricewarRival = ev.rivalCut ? cfg.rivals[Math.floor(r() * cfg.rivals.length)] : null;
  const sellers = cfg.rivals.length + 1;
  const demand = {}, offers = {}, rivals = {};
  cfg.rivals.forEach((rid) => { rivals[rid] = {}; });
  const last = s.history[s.history.length - 1];

  cfg.products.forEach((pid) => {
    const P = PRODUCTS[pid];
    const applies = (!ev.only || ev.only.includes(pid)) && (!ev.pick || eventProduct === pid);
    const dm = applies && ev.demand ? ev.demand : 1;
    const cm = applies && ev.cost ? ev.cost : 1;
    demand[pid] = Math.round(DAY_DEMAND[pid] * (sellers / 3) * dm * (0.92 + r() * 0.16));
    offers[pid] = {};
    SUPPLIERS.forEach((sup) => {
      offers[pid][sup.id] = {
        ask0: round10(P.cost * sup.ask * cm * (0.97 + r() * 0.06)), ask: 0,
        room: sup.disc * (0.8 + r() * 0.4), patience: 3, walked: false, deal: 0, dealQty: 0,
        closed: ev.supplierOut === sup.id,
      };
      offers[pid][sup.id].ask = offers[pid][sup.id].ask0;
    });
    const playerLast = last ? last.products[pid]?.price : null;
    cfg.rivals.forEach((rid) => {
      const rv = RIVALS[rid];
      let price = P.ref * rv.pf * (1 + (cm - 1) * 0.7) * (0.98 + r() * 0.04);
      if ((rv.style === 'aggressive' || rv.style === 'discount') && playerLast && playerLast < price * 0.97) {
        price = Math.min(price, playerLast * (rv.style === 'aggressive' ? 0.99 : 1.02));
      }
      if (pricewarRival === rid) price *= ev.rivalCut;
      rivals[rid][pid] = round10(Math.max(price, P.cost * cm * 1.02));
    });
  });
  s.market = { event: eventId, eventProduct, pricewarRival, demand, offers, rivals };
  s.today = newToday();

  // deliveries ordered yesterday arrive in the morning
  s.deliveries.filter((d) => d.day <= s.day).forEach((d) => addStock(s, d.pid, d.qty, d.unit));
  s.deliveries = s.deliveries.filter((d) => d.day > s.day);
}

function addStock(s, pid, qty, unit) {
  const st = s.shop;
  st.avgCost[pid] = (st.avgCost[pid] * st.stock[pid] + unit * qty) / (st.stock[pid] + qty);
  st.stock[pid] += qty;
}

// ---------- helpers for the screen ----------
export const clock = (tick) => {
  const m = 7 * 60 + Math.min(tick, TICKS_PER_DAY);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
export const carried = (s) => Object.values(s.player.carry).reduce((a, c) => a + c.qty, 0);
export const carryCap = (s) => (s.player.pusher ? COSTS.pusherCarry : COSTS.carry);
export const shopUnits = (s) => Object.values(s.shop.stock).reduce((a, v) => a + v, 0);
export const pending = (s) => s.deliveries.reduce((a, d) => a + d.qty, 0);
export const here = (s) => placeAtDoor(s.player.x, s.player.y);
export const atShop = (s) => here(s) === 'myshop';
export const minded = (s) => s.boy || atShop(s);
export const dayCostsNow = (s) => {
  const cfg = config(s);
  return { rent: cfg.rent, boy: s.boy || s.boyToday ? COSTS.boyWage : 0, interest: Math.round(s.loan * COSTS.loanRate), bills: s.payables.filter((p) => p.day === s.day).reduce((a, p) => a + p.amount, 0) };
};

// ---------- actions (each returns { ok, error?, ... }) ----------
export function act(s, t, a = []) {
  if (s.status !== 'playing') return { ok: false, error: 'over' };
  const cfg = config(s);
  switch (t) {
    case 'start': {
      if (s.phase !== 'night') return { ok: false, error: 'state' };
      s.phase = 'day';
      return { ok: true };
    }
    case 'move': {
      if (s.phase !== 'day' || s.player.keke) return { ok: false, error: 'state' };
      const tgt = targetFor(a[0] | 0, a[1] | 0);
      if (!tgt) return { ok: false, error: 'blocked' };
      const p = findPath(s.player.x, s.player.y, tgt[0], tgt[1]);
      if (!p) return { ok: false, error: 'blocked' };
      s.player.path = p.slice();
      return { ok: true };
    }
    case 'keke': {
      if (s.phase !== 'day' || s.player.keke) return { ok: false, error: 'state' };
      const from = here(s);
      const dest = a[0];
      const stops = ['kekeStreet', 'kekeMarket', 'kekeFactory'];
      if (!stops.includes(from) || !stops.includes(dest) || dest === from) return { ok: false, error: 'notHere' };
      const fare = from === 'kekeFactory' || dest === 'kekeFactory' ? COSTS.kekeFactory : COSTS.kekeMarket;
      if (s.cash < fare) return { ok: false, error: 'cash' };
      const d = placeById[dest].door;
      const p = findPath(s.player.x, s.player.y, d[0], d[1]);
      if (!p) return { ok: false, error: 'blocked' };
      s.cash -= fare; s.today.spent.keke += fare;
      s.player.path = p.slice(); s.player.keke = dest;
      return { ok: true, fare };
    }
    case 'offer': {
      const [pid, sid, qty, price] = a;
      if (!cfg.products.includes(pid) || !SUPPLIERS.some((x) => x.id === sid)) return { ok: false, error: 'invalid' };
      if (here(s) !== SUPPLIER_PLACE[sid]) return { ok: false, error: 'notHere' };
      const o = s.market.offers[pid][sid];
      if (o.closed) return { ok: false, error: 'closed' };
      if (o.walked) return { ok: true, result: 'walk', price: o.ask };
      const sup = SUPPLIERS.find((x) => x.id === sid);
      const p = Math.round(price);
      const volume = qty >= Math.max(sup.min, 1) * 3 ? 0.02 : qty >= Math.max(sup.min, 1) * 2 ? 0.01 : 0;
      const floor = round10(o.ask0 * (1 - o.room - volume));
      if (p >= o.ask) return { ok: true, result: 'accept', price: o.ask };
      if (p >= floor) { if (!o.deal || p < o.deal) { o.deal = p; o.dealQty = qty; } return { ok: true, result: 'accept', price: p }; }
      o.patience -= p < o.ask0 * 0.8 ? 2 : 1;
      if (o.patience <= 0) { o.walked = true; return { ok: true, result: 'walk', price: o.ask }; }
      o.ask = Math.max(floor, round10(o.ask - (o.ask - p) * 0.45));
      return { ok: true, result: 'counter', price: o.ask };
    }
    case 'buy': {
      const [pid, sid, qtyIn, unitIn, credit] = a;
      if (!cfg.products.includes(pid) || !SUPPLIERS.some((x) => x.id === sid)) return { ok: false, error: 'invalid' };
      if (here(s) !== SUPPLIER_PLACE[sid]) return { ok: false, error: 'notHere' };
      const o = s.market.offers[pid][sid];
      const sup = SUPPLIERS.find((x) => x.id === sid);
      const qty = Math.floor(qtyIn), unit = Math.round(unitIn);
      if (o.closed) return { ok: false, error: 'closed' };
      if (!(qty > 0)) return { ok: false, error: 'qty' };
      if (qty < sup.min) return { ok: false, error: 'min' };
      if (!(unit >= o.ask) && !(o.deal && unit >= o.deal && qty >= o.dealQty)) return { ok: false, error: 'price' };
      if (shopUnits(s) + pending(s) + carried(s) + qty > cfg.storage) return { ok: false, error: 'storage' };
      const useCredit = !!credit && cfg.credit && sup.credit;
      const paidUnit = useCredit ? Math.round(unit * (1 + CREDIT_MARKUP)) : unit;
      const deliver = sid !== 'market';
      const fee = sid === 'distributor' ? COSTS.deliverDistributor : sid === 'factory' ? COSTS.deliverFactory : 0;
      if (!deliver && carried(s) + qty > carryCap(s)) return { ok: false, error: 'carry' };
      const cashNeed = (useCredit ? 0 : paidUnit * qty) + fee;
      if (cashNeed > s.cash) return { ok: false, error: 'cash' };
      s.cash -= cashNeed;
      if (useCredit) s.payables.push({ amount: paidUnit * qty, day: s.day + 2, pid });
      if (deliver) { s.deliveries.push({ pid, qty, unit: paidUnit, day: s.day + 1 }); s.today.spent.delivery += fee; }
      else {
        const c = s.player.carry[pid] || { qty: 0, unit: 0 };
        c.unit = (c.unit * c.qty + paidUnit * qty) / (c.qty + qty); c.qty += qty;
        s.player.carry[pid] = c;
      }
      const t2 = s.totals;
      t2.bought += paidUnit * qty; t2.askValue += o.ask0 * qty; t2.paidValue += unit * qty; t2.roomValue += o.ask0 * o.room * qty;
      s.today.purchases.push({ pid, sid, qty, unit: paidUnit, credit: useCredit, deliver, ask0: o.ask0 });
      return { ok: true, deliver, unit: paidUnit };
    }
    case 'pusher': {
      if (here(s) !== 'market') return { ok: false, error: 'notHere' };
      if (s.player.pusher) return { ok: true };
      if (s.cash < COSTS.pusher) return { ok: false, error: 'cash' };
      s.cash -= COSTS.pusher; s.today.spent.pusher += COSTS.pusher; s.player.pusher = true;
      return { ok: true };
    }
    case 'price': {
      const [pid, p] = a;
      if (!cfg.products.includes(pid) || !(p > 0)) return { ok: false, error: 'invalid' };
      s.shop.price[pid] = Math.max(10, Math.min(1e7, round10(p)));
      return { ok: true };
    }
    case 'boy': {
      const on = !!a[0];
      if (on && !atShop(s)) return { ok: false, error: 'atShop' };
      s.boy = on;
      if (on) s.boyToday = true;
      return { ok: true };
    }
    case 'sample': {
      const pid = a[0];
      if (!cfg.products.includes(pid)) return { ok: false, error: 'invalid' };
      if (s.phase !== 'day') return { ok: false, error: 'state' };
      if (!minded(s)) return { ok: false, error: 'atShop' };
      if (s.sampling.left > 0) return { ok: false, error: 'busy' };
      if (s.shop.stock[pid] < COSTS.sampleUnits) return { ok: false, error: 'stock' };
      if (s.cash < COSTS.sampling) return { ok: false, error: 'cash' };
      s.cash -= COSTS.sampling;
      s.shop.stock[pid] -= COSTS.sampleUnits;
      const unitsCost = COSTS.sampleUnits * s.shop.avgCost[pid];
      s.today.spent.sampling += COSTS.sampling; s.today.spent.sampleUnits += unitsCost;
      s.sampling = { left: COSTS.samplingTicks, pid };
      return { ok: true };
    }
    case 'borrow': {
      if (here(s) !== 'bank') return { ok: false, error: 'notHere' };
      const room = Math.max(0, cfg.loanLimit - s.loan);
      const amt = Math.min(room, Math.max(0, Math.floor(a[0] || 0)));
      s.loan += amt; s.cash += amt;
      return { ok: true, amt };
    }
    case 'repay': {
      if (here(s) !== 'bank') return { ok: false, error: 'notHere' };
      const amt = Math.min(s.loan, s.cash, Math.max(0, Math.floor(a[0] || 0)));
      s.loan -= amt; s.cash -= amt;
      return { ok: true, amt };
    }
    default:
      return { ok: false, error: 'invalid' };
  }
}

// ---------- one game minute ----------
export function step(s) {
  if (s.status !== 'playing' || s.phase !== 'day') return null;
  const cfg = config(s);
  const pl = s.player;
  pl.px = pl.x; pl.py = pl.y;
  const speed = pl.keke ? 4 : 1;
  for (let i = 0; i < speed && pl.path.length; i++) { const [x, y] = pl.path.shift(); pl.x = x; pl.y = y; }
  if (!pl.path.length && pl.keke) pl.keke = null;
  if (atShop(s) && carried(s) > 0) unload(s);

  // shoppers
  const r = rng(s, 23);
  cfg.products.forEach((pid) => {
    const rate = (s.market.demand[pid] / TICKS_PER_DAY) * WAVE[s.tick] / 1.5;
    if (r() < rate * 1.4) spawn(s, pid, r, cfg);
  });

  // walking
  const keep = [];
  for (const ag of s.agents) {
    ag.px = ag.x; ag.py = ag.y;
    if (ag.path.length) { const [x, y] = ag.path.shift(); ag.x = x; ag.y = y; }
    if (!ag.path.length) {
      if (ag.leg === 'go') { arrive(s, ag); ag.leg = 'back'; const h = ag.home; ag.path = (findPath(ag.x, ag.y, h[0], h[1]) || []).slice(); if (ag.path.length) keep.push(ag); }
      continue;
    }
    keep.push(ag);
  }
  s.agents = keep;
  if (s.sampling.left > 0) s.sampling.left -= 1;

  s.tick += 1;
  if (s.tick >= TICKS_PER_DAY) return endDay(s);
  return null;
}

function unload(s) {
  Object.entries(s.player.carry).forEach(([pid, c]) => { if (c.qty > 0) addStock(s, pid, c.qty, c.unit); });
  s.player.carry = {};
  s.player.pusher = false;
}

function attractYou(s) {
  let lift = 0;
  if (s.boy) lift += 0.25;
  if (s.sampling.left > 0) lift += 0.45;
  return lift;
}

function spawn(s, pid, r, cfg) {
  const P = PRODUCTS[pid];
  const sellers = [{ id: 'myshop', price: s.shop.price[pid], a: s.rep * (1 + attractYou(s)) }];
  cfg.rivals.forEach((rid) => sellers.push({ id: rid, price: s.market.rivals[rid][pid], a: RIVALS[rid].rep * (1 + RIVALS[rid].mkt) }));
  sellers.forEach((x) => { x.a *= Math.exp(-PRICE_K * (x.price / P.ref - 1)); });
  const sum = sellers.reduce((a, x) => a + x.a, 0);
  const wavg = sellers.reduce((a, x) => a + (x.a / sum) * x.price, 0);
  const size = clamp(Math.pow(P.ref / wavg, 1.5), 0.6, 1.4);
  if (r() > size / 1.4) return; // high prices across the street mean fewer shoppers come out
  let pick = r() * sum, chosen = sellers[0];
  for (const x of sellers) { pick -= x.a; if (pick <= 0) { chosen = x; break; } }
  const home = HOMES[Math.floor(r() * HOMES.length)].door;
  const qty = r() < 0.5 ? 1 : 2;
  const door = placeById[chosen.id].door;
  const path = findPath(home[0], home[1], door[0], door[1]);
  if (!path) return;
  s.agents.push({ id: s.nextId++, pid, qty, shop: chosen.id, home, x: home[0], y: home[1], px: home[0], py: home[1], path: path.slice(), leg: 'go', got: null });
}

function arrive(s, ag) {
  const t = s.today;
  t.wanted[ag.pid] = (t.wanted[ag.pid] || 0);
  if (ag.shop !== 'myshop') { t.rivalSold[ag.pid] = (t.rivalSold[ag.pid] || 0) + ag.qty; ag.got = true; return; }
  t.wanted[ag.pid] += ag.qty;
  if (!minded(s)) {
    t.lostClosed[ag.pid] = (t.lostClosed[ag.pid] || 0) + ag.qty; s.totals.lostClosed += ag.qty;
    s.rep = clamp(s.rep - 0.004, 0.6, 1.3); ag.got = false; return;
  }
  const have = s.shop.stock[ag.pid];
  const sold = Math.min(have, ag.qty);
  const lost = ag.qty - sold;
  if (sold > 0) {
    const price = s.shop.price[ag.pid];
    s.shop.stock[ag.pid] -= sold;
    t.sold[ag.pid] = (t.sold[ag.pid] || 0) + sold;
    s.cash += sold * price;
    t.revenue += sold * price; t.cogs += sold * s.shop.avgCost[ag.pid];
    s.totals.served += sold;
    if (price <= PRODUCTS[ag.pid].ref * 1.05) s.rep = clamp(s.rep + 0.0015, 0.6, 1.3);
  }
  if (lost > 0) { t.lostStock[ag.pid] = (t.lostStock[ag.pid] || 0) + lost; s.totals.lostStock += lost; s.rep = clamp(s.rep - 0.004, 0.6, 1.3); }
  ag.got = sold > 0;
}

// ---------- evening ----------
function endDay(s) {
  const cfg = config(s);
  const t = s.today;
  const T = s.totals;
  if (carried(s) > 0) unload(s); // you take your goods home with you
  const costs = dayCostsNow(s);
  s.payables = s.payables.filter((p) => p.day !== s.day);

  let spoiled = 0;
  cfg.products.forEach((pid) => {
    if (PRODUCTS[pid].perishable && s.shop.stock[pid] > 0) { spoiled += s.shop.stock[pid] * s.shop.avgCost[pid]; s.shop.stock[pid] = 0; }
  });

  s.cash -= costs.rent + costs.boy + costs.interest + costs.bills;
  let fee = 0;
  if (s.cash < 0) { fee = Math.round(-s.cash * COSTS.overdraftFee) + 1000; s.cash -= fee; T.overdraftDays += 1; s.rep = clamp(s.rep - 0.05, 0.6, 1.3); }
  else if (s.cash < cfg.rent + COSTS.boyWage) T.lowCashDays += 1;

  const products = {};
  cfg.products.forEach((pid) => {
    const sold = t.sold[pid] || 0, wanted = t.wanted[pid] || 0, rivalSold = t.rivalSold[pid] || 0;
    const avgRival = Math.round(cfg.rivals.reduce((a, rid) => a + s.market.rivals[rid][pid], 0) / cfg.rivals.length);
    const share = sold + rivalSold > 0 ? sold / (sold + rivalSold) : 0;
    products[pid] = { sold, wanted, lostStock: t.lostStock[pid] || 0, lostClosed: t.lostClosed[pid] || 0, price: s.shop.price[pid], avgRival, share, revenue: sold * s.shop.price[pid] };
    T.shareSum += share * (cfg.rivals.length + 1); T.shareCount += 1;
  });

  const sp = t.spent;
  const profit = Math.round(t.revenue - t.cogs - spoiled - sp.sampleUnits - costs.rent - costs.boy - costs.interest - fee - sp.keke - sp.pusher - sp.delivery - sp.sampling);
  T.revenue += t.revenue; T.cogs += t.cogs; T.spoiled += spoiled;

  const report = {
    day: s.day, event: s.market.event, eventProduct: s.market.eventProduct, products,
    revenue: Math.round(t.revenue), cogs: Math.round(t.cogs), spoiled: Math.round(spoiled), sampleUnits: Math.round(sp.sampleUnits),
    rent: costs.rent, boy: costs.boy, interest: costs.interest, bills: costs.bills, fee,
    keke: sp.keke, pusher: sp.pusher, delivery: sp.delivery, sampling: sp.sampling,
    profit, cashEnd: Math.round(s.cash), rep: s.rep, tips: [],
  };
  report.tips = coach(s, report, cfg);
  s.history.push(report);

  s.agents = [];
  s.sampling = { left: 0, pid: null };
  s.boyToday = s.boy;
  const door = placeById.myshop.door;
  Object.assign(s.player, { x: door[0], y: door[1], px: door[0], py: door[1], path: [], keke: null });

  if (s.cash < -0.5 * cfg.capital) { s.status = 'bankrupt'; return report; }
  if (s.day >= s.days) { s.status = 'done'; return report; }
  s.day += 1; s.tick = 0; s.phase = 'night';
  prepareDay(s);
  return report;
}

function coach(s, r, cfg) {
  const tips = [];
  Object.entries(r.products).forEach(([pid, x]) => {
    if (x.lostClosed > 2) tips.push({ k: 'closed', pid, n: x.lostClosed });
    if (x.lostStock > 2) tips.push({ k: 'stockout', pid, n: x.lostStock });
    if (x.price > x.avgRival * 1.08 && x.share < 0.7 / (cfg.rivals.length + 1)) tips.push({ k: 'pricey', pid });
    const cost = s.shop.avgCost[pid];
    if (x.sold > 0 && (x.price - cost) / x.price < 0.08) tips.push({ k: 'thin', pid });
  });
  if (r.spoiled > 0) tips.push({ k: 'spoiled', pid: 'bread', n: '' });
  const paidAsk = s.today.purchases.filter((p) => !p.credit && p.unit >= p.ask0).length;
  if (s.today.purchases.length && paidAsk === s.today.purchases.length) tips.push({ k: 'negotiate' });
  if (r.fee > 0) tips.push({ k: 'overdraft' });
  if (r.keke + r.pusher + r.delivery > r.revenue * 0.1 && r.revenue > 0) tips.push({ k: 'trips' });
  if (s.day === s.days - 1) tips.push({ k: 'sellDown' });
  if (!tips.length) tips.push({ k: 'good' });
  return tips.slice(0, 3);
}

// ---------- scoring ----------
export function netWorth(s) {
  const stock = Object.keys(s.shop.stock).reduce((a, pid) => a + s.shop.stock[pid] * s.shop.avgCost[pid] * END_STOCK_VALUE, 0);
  const owed = s.payables.reduce((a, p) => a + p.amount, 0);
  const coming = s.deliveries.reduce((a, d) => a + d.qty * d.unit * END_STOCK_VALUE, 0);
  return Math.round(s.cash + stock + coming - s.loan - owed);
}

export function finalScore(s) {
  const cfg = config(s);
  const T = s.totals;
  const profit = netWorth(s) - cfg.capital;
  const profitScore = clamp(Math.round((100 * profit) / cfg.target), 0, 100);
  const days = s.history.length || 1;
  const cashScore = clamp(Math.round(100 - 30 * T.overdraftDays - (50 / days) * T.lowCashDays), 0, 100);
  const asked = T.served + T.lostStock + T.lostClosed;
  const fill = asked > 0 ? T.served / asked : 0;
  const waste = T.bought > 0 ? T.spoiled / T.bought : 0;
  const endStock = Object.keys(s.shop.stock).reduce((a, pid) => a + s.shop.stock[pid] * s.shop.avgCost[pid], 0);
  const endRatio = T.bought > 0 ? endStock / T.bought : 0;
  const inventoryScore = clamp(Math.round(100 * fill - 200 * waste - 120 * Math.max(0, endRatio - 0.08)), 0, 100);
  const captured = T.roomValue > 0 ? (T.askValue - T.paidValue) / T.roomValue : 0;
  const negotiationScore = clamp(Math.round(100 * captured), 0, 100);
  const margin = T.revenue > 0 ? (T.revenue - T.cogs) / T.revenue : 0;
  const marginScore = margin >= 0.12 && margin <= 0.4 ? 100 : margin < 0.12 ? clamp(Math.round((margin / 0.12) * 100), 0, 100) : clamp(Math.round(100 - (margin - 0.4) * 300), 0, 100);
  const shareIdx = T.shareCount ? T.shareSum / T.shareCount : 0;
  const pricingScore = Math.round(0.5 * marginScore + 0.5 * clamp(Math.round(100 * shareIdx), 0, 100));
  const parts = { profit: profitScore, cash: cashScore, inventory: inventoryScore, negotiation: negotiationScore, pricing: pricingScore };
  let total = Object.entries(parts).reduce((a, [k, v]) => a + v * WEIGHTS[k], 0) / 100;
  if (s.status === 'bankrupt') total = Math.min(total, 30);
  total = Math.round(total);
  const passed = s.status !== 'bankrupt' && total >= cfg.pass && profit > 0;
  return { total, parts, passed, stars: !passed ? 0 : total >= 90 ? 3 : total >= 75 ? 2 : 1, profit, target: cfg.target, pass: cfg.pass,
    netWorth: netWorth(s), margin, fill, captured, shareIdx, revenue: T.revenue };
}

// ---------- replay (server) ----------
// log entries: { d: day, k: tick, t: type, a: args }
const TYPES = new Set(['start', 'move', 'keke', 'offer', 'buy', 'pusher', 'price', 'boy', 'sample', 'borrow', 'repay']);
export function replayWorld(levelId, challengeId, seed, log) {
  const s = newWorld(levelId, challengeId, seed);
  for (const e of log || []) {
    if (s.status !== 'playing' || !e || !TYPES.has(e.t)) break;
    const target = (e.d | 0) * 100000 + (e.k | 0);
    let guard = 0;
    while (s.status === 'playing' && s.phase === 'day' && s.day * 100000 + s.tick < target && guard++ < 20000) step(s);
    if (s.day * 100000 + s.tick !== target) break; // out of order record
    act(s, e.t, Array.isArray(e.a) ? e.a : []);
  }
  let guard = 0;
  while (s.status === 'playing' && s.phase === 'day' && guard++ < 20000) step(s);
  return s;
}
