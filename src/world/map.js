// The town: a 32 x 32 tile grid seen at an angle (isometric).
// Pure data and pathfinding, shared by the browser and the server.

export const W = 32;
export const H = 32;

// ground types
export const G = { GRASS: 0, ROAD: 1, PLAZA: 2 };

// Places you can walk to. door = the tile in front of the entrance.
// Entrances face north (smaller y): that is the side the camera sees.
// kind: shop | rival | supplier | bank | keke | house | decor
export const PLACES = [
  { id: 'myshop', kind: 'shop', x: 1, y: 11, w: 3, h: 3, door: [2, 10], color: '#e5252a' },
  { id: 'kofi', kind: 'rival', x: 5, y: 11, w: 3, h: 3, door: [6, 10], color: '#f0581a' },
  { id: 'kekeStreet', kind: 'keke', x: 8, y: 11, w: 2, h: 2, door: [8, 10], pad: true },
  { id: 'bank', kind: 'bank', x: 11, y: 11, w: 3, h: 3, door: [12, 10], color: '#1d4ef5' },
  { id: 'chidi', kind: 'rival', x: 18, y: 11, w: 3, h: 3, door: [19, 10], color: '#0b9f55' },
  { id: 'amina', kind: 'rival', x: 22, y: 11, w: 3, h: 3, door: [23, 10], color: '#e23d78' },
  { id: 'zola', kind: 'rival', x: 26, y: 11, w: 3, h: 3, door: [27, 10], color: '#7a36f0' },
  { id: 'market', kind: 'supplier', x: 20, y: 16, w: 3, h: 2, door: [21, 15], color: '#f5a30a', stall: true },
  { id: 'distributor', kind: 'supplier', x: 25, y: 16, w: 5, h: 4, door: [27, 15], color: '#079a8c' },
  { id: 'kekeMarket', kind: 'keke', x: 18, y: 19, w: 2, h: 2, door: [18, 18], pad: true },
  { id: 'factory', kind: 'supplier', x: 3, y: 26, w: 6, h: 5, door: [6, 25], color: '#6b6f78' },
  { id: 'kekeFactory', kind: 'keke', x: 10, y: 26, w: 2, h: 2, door: [10, 25], pad: true },
  { id: 'school', kind: 'decor', x: 21, y: 27, w: 6, h: 4, color: '#1c1d21', label: 'GetSchool' },
];

// supplier id in the game data -> place in town
export const SUPPLIER_PLACE = { market: 'market', distributor: 'distributor', factory: 'factory' };

const HOUSE_SPOTS = [
  [1, 1], [5, 1], [9, 1], [1, 5], [5, 5], [9, 5],
  [19, 1], [23, 1], [27, 1], [19, 5], [23, 5], [27, 5],
  [1, 15], [5, 15], [9, 15], [1, 19], [5, 19], [9, 19],
];
const HOUSE_COLORS = ['#d97a4a', '#c9a24d', '#8fa3b8', '#b86f6f', '#7fa07a', '#a58cc4'];
HOUSE_SPOTS.forEach(([x, y], i) => {
  PLACES.push({ id: 'house' + i, kind: 'house', x, y, w: 3, h: 3, door: [x + 1, y - 1], color: HOUSE_COLORS[i % HOUSE_COLORS.length] });
});

export const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));
export const HOMES = PLACES.filter((p) => p.kind === 'house');

// ---------- ground ----------
export const ground = new Uint8Array(W * H);
export const blocked = new Uint8Array(W * H);
export const owner = new Array(W * H).fill(null); // which place a tile belongs to
const idx = (x, y) => y * W + x;
export const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

for (let x = 0; x < W; x++) { ground[idx(x, 9)] = G.ROAD; ground[idx(x, 10)] = G.ROAD; ground[idx(x, 24)] = G.ROAD; ground[idx(x, 25)] = G.ROAD; }
for (let y = 0; y < H; y++) { ground[idx(15, y)] = G.ROAD; ground[idx(16, y)] = G.ROAD; }
for (let x = 18; x <= 30; x++) for (let y = 14; y <= 22; y++) if (ground[idx(x, y)] === G.GRASS) ground[idx(x, y)] = G.PLAZA;
for (let y = 11; y <= 23; y++) ground[idx(17, y)] = G.PLAZA; // path from the road into the market

PLACES.forEach((p) => {
  for (let x = p.x; x < p.x + p.w; x++) {
    for (let y = p.y; y < p.y + p.h; y++) {
      owner[idx(x, y)] = p.id;
      if (p.pad) ground[idx(x, y)] = G.PLAZA;
      else blocked[idx(x, y)] = 1;
    }
  }
});

// trees on grass, placed by a fixed pattern so every device draws the same town
export const TREES = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (ground[i] !== G.GRASS || blocked[i] || owner[i]) continue;
    const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const nearDoor = PLACES.some((p) => p.door && Math.abs(p.door[0] - x) + Math.abs(p.door[1] - y) <= 1);
    if (h % 9 === 0 && !nearDoor && y !== 0 && y !== 4 && y !== 8 && y !== 14 && y !== 18 && y !== 22 && y !== 23 && x % 4 !== 0) {
      TREES.push([x, y]);
      blocked[i] = 1;
    }
  }
}

export function walkable(x, y) { return inside(x, y) && !blocked[idx(x, y)]; }
export function placeAt(x, y) { return inside(x, y) ? owner[idx(x, y)] : null; }

// Where a tap should send you: a building sends you to its door.
export function targetFor(x, y) {
  if (!inside(x, y)) return null;
  const pid = owner[idx(x, y)];
  if (pid && placeById[pid].door) return placeById[pid].door;
  return walkable(x, y) ? [x, y] : null;
}

// The place whose door you are standing at (or next to).
export function placeAtDoor(x, y) {
  for (const p of PLACES) {
    if (!p.door || p.kind === 'house' || p.kind === 'decor') continue;
    if (Math.abs(p.door[0] - x) + Math.abs(p.door[1] - y) <= 1) return p.id;
  }
  return null;
}

// ---------- A* (roads are quicker than grass) ----------
const cost = (i) => (ground[i] === G.GRASS ? 1.6 : 1);
const cache = new Map();

export function findPath(sx, sy, tx, ty) {
  const key = sx + ',' + sy + '>' + tx + ',' + ty;
  if (cache.has(key)) return cache.get(key);
  const path = astar(sx, sy, tx, ty);
  if (cache.size > 4000) cache.clear();
  cache.set(key, path);
  return path;
}

function astar(sx, sy, tx, ty) {
  if (!walkable(tx, ty) || !inside(sx, sy)) return null;
  if (sx === tx && sy === ty) return [];
  const start = idx(sx, sy), goal = idx(tx, ty);
  const g = new Float64Array(W * H).fill(Infinity);
  const from = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  g[start] = 0;
  // small binary heap keyed by f, ties broken by insertion order for determinism
  const heap = [];
  let order = 0;
  const push = (i, f) => {
    heap.push([f, order++, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (less(heap[c], heap[p])) { [heap[c], heap[p]] = [heap[p], heap[c]]; c = p; } else break;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1, r = l + 1;
        let m = c;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === c) break;
        [heap[c], heap[m]] = [heap[m], heap[c]]; c = m;
      }
    }
    return top;
  };
  const hfn = (i) => Math.abs((i % W) - tx) + Math.abs(Math.floor(i / W) - ty);
  push(start, hfn(start));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (heap.length) {
    const [, , cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % W, cy = Math.floor(cur / W);
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (!inside(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (blocked[ni] && ni !== goal) continue;
      const ng = g[cur] + cost(ni);
      if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; push(ni, ng + hfn(ni)); }
    }
  }
  if (from[goal] === -1) return null;
  const out = [];
  for (let c = goal; c !== start; c = from[c]) out.push([c % W, Math.floor(c / W)]);
  return out.reverse();
}
function less(a, b) { return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]); }
