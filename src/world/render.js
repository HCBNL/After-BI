// 2.5D isometric drawing of the town on a canvas. Light enough for low end phones:
// the ground is drawn once into an offscreen canvas, only people and buildings each frame.
import { W, H, G, PLACES, TREES, ground, placeById, findPath, walkable } from './map.js';
import { TICKS_PER_DAY } from './levels.js';

const TW = 64, TH = 32;
const BH = { shop: 46, rival: 46, bank: 54, supplier: 40, house: 34, decor: 60 };
const iso = (u, v) => [(u - v) * (TW / 2), (u + v) * (TH / 2)];
// town coordinates to screen: the camera looks from the north east, so north and east walls face you
const P = (x, y) => iso(x, H - y);
const SKIN = ['#6b4226', '#8d5524', '#5a3825', '#7a4a2a', '#9c6b43'];
const CLOTH = ['#1d4ef5', '#0b9f55', '#f0581a', '#7a36f0', '#e23d78', '#f5a30a', '#1593ee', '#079a8c', '#c0392b', '#2c3e50'];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export class WorldView {
  constructor(canvas, { labels, onTap }) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.labels = labels;
    this.onTap = onTap;
    this.zoom = window.innerWidth < 700 ? 0.8 : 1;
    this.cam = null;
    this.target = null;
    this.ground = this.buildGround();
    this.initWalkers();
    this.resize();
    this.bind();
  }

  setLabels(l) { this.labels = l; }

  // people passing by: only for life on the street, not part of the game
  initWalkers() {
    this.walkers = [];
    const roads = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ground[y * W + x] !== G.GRASS && walkable(x, y)) roads.push([x, y]);
    this.roads = roads;
    for (let i = 0; i < 18; i++) {
      const [x, y] = roads[Math.floor(Math.random() * roads.length)];
      this.walkers.push({ id: 100 + i, x, y, path: [], speed: 1.4 + Math.random() * 1.2 });
    }
    this.lastWalk = performance.now();
  }

  walk(ui) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastWalk) / 1000);
    this.lastWalk = now;
    if (!ui.moving) return;
    for (const w of this.walkers) {
      if (!w.path.length) {
        const [tx, ty] = this.roads[Math.floor(Math.random() * this.roads.length)];
        w.path = (findPath(Math.round(w.x), Math.round(w.y), tx, ty) || []).slice(0, 14);
        if (!w.path.length) continue;
      }
      const [nx, ny] = w.path[0];
      const dx = nx - w.x, dy = ny - w.y, dist = Math.hypot(dx, dy);
      const stepLen = w.speed * dt * (ui.speed || 1);
      if (dist <= stepLen) { w.x = nx; w.y = ny; w.path.shift(); } else { w.x += (dx / dist) * stepLen; w.y += (dy / dist) * stepLen; }
    }
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.vw = r.width; this.vh = r.height;
    this.c.width = Math.round(r.width * dpr);
    this.c.height = Math.round(r.height * dpr);
  }

  buildGround() {
    const off = document.createElement('canvas');
    const [minX] = iso(0, H), [maxX] = iso(W, 0);
    this.ox = -minX + TW;
    this.oy = TH * 2;
    off.width = maxX - minX + TW * 2;
    off.height = (W + H) * (TH / 2) + TH * 4;
    const g = off.getContext('2d');
    g.fillStyle = '#7cb46b';
    g.fillRect(0, 0, off.width, off.height);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const [sx, sy] = P(x, y + 1);
        const px = sx + this.ox, py = sy + this.oy;
        const t = ground[y * W + x];
        g.beginPath();
        g.moveTo(px, py); g.lineTo(px + TW / 2, py + TH / 2); g.lineTo(px, py + TH); g.lineTo(px - TW / 2, py + TH / 2); g.closePath();
        g.fillStyle = t === G.ROAD ? '#5d6068' : t === G.PLAZA ? ((x + y) % 2 ? '#e4d6b8' : '#dccca9') : ((x * 7 + y * 3) % 5 ? '#86bd72' : '#7fb66a');
        g.fill();
        if (t === G.ROAD) {
          g.strokeStyle = 'rgba(255,255,255,.06)'; g.stroke();
          // centre line dashes
          const horiz = (y === 9 || y === 24) && !(x === 15 || x === 16);
          const vert = x === 15 && !(y === 9 || y === 10 || y === 24 || y === 25);
          if ((horiz && x % 2 === 0) || (vert && y % 2 === 0)) {
            g.strokeStyle = 'rgba(255,230,120,.8)'; g.lineWidth = 2; g.beginPath();
            const cy = py + TH / 2;
            if (horiz) { g.moveTo(px - 8, cy - 4); g.lineTo(px + 8, cy + 4); }
            else { g.moveTo(px + 8, cy - 4); g.lineTo(px - 8, cy + 4); }
            g.stroke(); g.lineWidth = 1;
          }
        } else if (t === G.PLAZA) { g.strokeStyle = 'rgba(0,0,0,.05)'; g.stroke(); }
      }
    }
    return off;
  }

  bind() {
    let down = null;
    this.c.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    this.c.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
      down = null;
      if (moved > 12) return;
      const r = this.c.getBoundingClientRect();
      const tile = this.screenToTile(e.clientX - r.left, e.clientY - r.top);
      if (tile) this.onTap(tile[0], tile[1]);
    });
    this.c.addEventListener('wheel', (e) => { e.preventDefault(); this.setZoom(this.zoom * (e.deltaY > 0 ? 0.9 : 1.1)); }, { passive: false });
  }

  setZoom(z) { this.zoom = Math.max(0.5, Math.min(1.8, z)); }

  screenToTile(mx, my) {
    if (!this.cam) return null;
    const wx = (mx - this.vw / 2) / this.zoom + this.cam[0];
    const wy = (my - this.vh / 2) / this.zoom + this.cam[1];
    const u = (wx / (TW / 2) + wy / (TH / 2)) / 2;
    const v = (wy / (TH / 2) - wx / (TW / 2)) / 2;
    const x = Math.floor(u), y = Math.floor(H - v);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    // a tap on a raised wall or roof lands on ground behind it: check towards the camera too
    for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1], [2, -1], [1, -2]]) {
      const p = PLACES.find((q) => x + dx >= q.x && x + dx < q.x + q.w && y + dy >= q.y && y + dy < q.y + q.h && !q.pad);
      if (p) return [x + dx, y + dy];
    }
    return [x, y];
  }

  // a = 0..1, how far between the last tick and the next
  draw(s, a, ui) {
    const ctx = this.ctx;
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#6aa35a';
    ctx.fillRect(0, 0, this.vw, this.vh);

    const pl = s.player;
    const pxf = pl.px + (pl.x - pl.px) * a, pyf = pl.py + (pl.y - pl.py) * a;
    const [cx, cy] = P(pxf + 0.5, pyf + 0.5);
    this.walk(ui);
    if (!this.cam) this.cam = [cx, cy];
    this.cam[0] += (cx - this.cam[0]) * 0.12;
    this.cam[1] += (cy - this.cam[1]) * 0.12;

    ctx.save();
    ctx.translate(this.vw / 2, this.vh / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.cam[0], -this.cam[1]);
    ctx.drawImage(this.ground, -this.ox, -this.oy);

    // door glow where you stand
    if (ui.here) { const d = placeById[ui.here].door; this.diamond(d[0], d[1], 'rgba(255,255,255,.55)'); }
    if (ui.dest) this.diamond(ui.dest[0], ui.dest[1], 'rgba(229,37,42,.55)');

    // everything with height, back to front
    const items = [];
    // depth: things nearer the camera (larger x, smaller y) are drawn later
    PLACES.forEach((p) => { if (!p.pad) items.push({ d: p.x - p.y + 0.5, f: () => this.building(p, s, ui) }); else items.push({ d: p.x - p.y + 0.4, f: () => this.kekePad(p) }); });
    TREES.forEach(([x, y]) => items.push({ d: x - y, f: () => this.tree(x, y) }));
    this.walkers.forEach((w) => items.push({ d: w.x - w.y + 0.1, f: () => this.person(w.x, w.y, w.id, false, true) }));
    s.agents.forEach((ag) => {
      const x = ag.px + (ag.x - ag.px) * a, y = ag.py + (ag.y - ag.py) * a;
      items.push({ d: x - y + 0.2, f: () => this.person(x, y, ag.id, ag.leg === 'back' && ag.got) });
    });
    if (s.boy) { const d = placeById.myshop.door; items.push({ d: d[0] - d[1] + 1.05, f: () => this.boy(d[0] + 0.75, d[1] + 0.15, ui.t) }); }
    if (s.sampling.left > 0) { const d = placeById.myshop.door; items.push({ d: d[0] - d[1] + 0.3, f: () => this.sampleTable(d[0] - 1.1, d[1] - 0.2, ui.t) }); }
    if (pl.pusher) {
      const back = pl.path.length ? [pxf - (pl.x - pl.px) * 0.9, pyf - (pl.y - pl.py) * 0.9] : [pxf - 0.7, pyf + 0.1];
      items.push({ d: back[0] - back[1] + 0.25, f: () => this.pusher(back[0], back[1]) });
    }
    items.push({ d: pxf - pyf + 0.3, f: () => (pl.keke ? this.keke(pxf, pyf, ui.t) : this.player(pxf, pyf, s)) });
    items.sort((p, q) => p.d - q.d);
    items.forEach((it) => it.f());
    ctx.restore();

    // light of the day: soft dawn, bright noon, orange evening
    const f = s.phase === 'day' ? s.tick / TICKS_PER_DAY : 0;
    let tint = null;
    if (f < 0.12) tint = `rgba(255,190,120,${0.18 * (1 - f / 0.12)})`;
    else if (f > 0.78) tint = `rgba(255,120,40,${0.22 * ((f - 0.78) / 0.22)})`;
    if (s.phase !== 'day') tint = 'rgba(20,24,60,.35)';
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, this.vw, this.vh); }
  }

  diamond(x, y, fill) {
    const ctx = this.ctx; const [sx, sy] = P(x, y + 1);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + TW / 2, sy + TH / 2); ctx.lineTo(sx, sy + TH); ctx.lineTo(sx - TW / 2, sy + TH / 2); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }

  building(p, s, ui) {
    const ctx = this.ctx;
    const h = BH[p.kind] || 40;
    const top = P(p.x, p.y + p.h), right = P(p.x + p.w, p.y + p.h), bottom = P(p.x + p.w, p.y), left = P(p.x, p.y);
    const base = p.kind === 'house' ? '#efe6d8' : p.kind === 'supplier' && p.stall ? '#c98b3a' : '#f4f1ec';
    const inactive = p.kind === 'rival' && !ui.rivals.includes(p.id);
    // walls
    ctx.beginPath(); ctx.moveTo(left[0], left[1]); ctx.lineTo(bottom[0], bottom[1]); ctx.lineTo(bottom[0], bottom[1] - h); ctx.lineTo(left[0], left[1] - h); ctx.closePath();
    ctx.fillStyle = shade(base === '#f4f1ec' ? '#e9e4dc' : base, 0.86); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bottom[0], bottom[1]); ctx.lineTo(right[0], right[1]); ctx.lineTo(right[0], right[1] - h); ctx.lineTo(bottom[0], bottom[1] - h); ctx.closePath();
    ctx.fillStyle = shade(base === '#f4f1ec' ? '#e9e4dc' : base, 0.72); ctx.fill();
    // roof
    const roof = inactive ? '#9a9da5' : p.color;
    ctx.beginPath(); ctx.moveTo(top[0], top[1] - h); ctx.lineTo(right[0], right[1] - h); ctx.lineTo(bottom[0], bottom[1] - h); ctx.lineTo(left[0], left[1] - h); ctx.closePath();
    ctx.fillStyle = p.kind === 'house' ? shade(p.color, 0.95) : roof; ctx.fill();
    if (p.kind !== 'house') { ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.stroke(); }
    // windows / door on the front walls
    if (p.kind === 'house') {
      ctx.fillStyle = '#5b7fa6';
      for (let i = 0; i < p.w; i++) { const a = P(p.x + i + 0.5, p.y); ctx.fillRect(a[0] - 4, a[1] - h * 0.62, 7, 9); }
      if (p.door) { const d = P(p.door[0] + 0.5, p.y); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(d[0] - 5, d[1] - 17, 10, 15); }
    } else if (p.kind !== 'decor') {
      // awning over the street side
      ctx.beginPath(); ctx.moveTo(left[0], left[1] - h * 0.55); ctx.lineTo(bottom[0], bottom[1] - h * 0.55); ctx.lineTo(bottom[0] + 6, bottom[1] - h * 0.55 + 10); ctx.lineTo(left[0] + 6, left[1] - h * 0.55 + 10); ctx.closePath();
      ctx.fillStyle = inactive ? '#b8bbc2' : shade(p.color, 1.08); ctx.fill();
      // door opening
      if (p.door) { const d = P(p.door[0] + 0.5, p.y); ctx.fillStyle = 'rgba(30,30,40,.78)'; ctx.fillRect(d[0] - 7, d[1] - 21, 14, 19); }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < p.w; i++) { const a = P(p.x + i + 0.5, p.y); ctx.fillRect(a[0] - 5, a[1] - h * 0.6, 8, 12); }
    }
    // sign
    const label = this.labels[p.id];
    if (label && p.kind !== 'house') {
      const [lx, ly] = P(p.x + p.w / 2, p.y + p.h / 2);
      ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(label).width;
      const bx = lx - tw / 2 - 8, by = ly - h - 34;
      ctx.fillStyle = p.id === 'myshop' ? '#e5252a' : inactive ? '#8a8d95' : '#1c1d21';
      this.round(bx, by, tw + 16, 20, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, bx + 8, by + 14);
    }
    // stock dots on your shop roof so you can see the shelves empty
    if (p.id === 'myshop') {
      const units = Object.values(s.shop.stock).reduce((x, v) => x + v, 0);
      const [lx, ly] = P(p.x + p.w / 2, p.y + p.h / 2);
      ctx.fillStyle = units > 0 ? '#2fd17f' : '#ff5a5f';
      ctx.beginPath(); ctx.arc(lx + 30, ly - h - 24, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  kekePad(p) {
    const ctx = this.ctx;
    const [sx, sy] = P(p.x + 1, p.y + 1);
    this.diamond(p.x, p.y, 'rgba(255,190,69,.35)'); this.diamond(p.x + 1, p.y, 'rgba(255,190,69,.25)');
    this.diamond(p.x, p.y + 1, 'rgba(255,190,69,.25)'); this.diamond(p.x + 1, p.y + 1, 'rgba(255,190,69,.35)');
    this.kekeShape(sx + 10, sy + 4, '#f5c400');
    const label = this.labels[p.id];
    if (label) {
      ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = '#f5a30a'; this.round(sx - tw / 2 - 7, sy - 40, tw + 14, 18, 9); ctx.fill();
      ctx.fillStyle = '#1c1d21'; ctx.fillText(label, sx - tw / 2, sy - 27);
    }
  }

  kekeShape(x, y, color) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; this.round(x - 14, y - 20, 28, 18, 6); ctx.fill();
    ctx.fillStyle = '#1c1d21'; this.round(x - 15, y - 26, 30, 7, 3); ctx.fill();
    ctx.fillStyle = '#9fd3ff'; ctx.fillRect(x - 10, y - 17, 9, 7); ctx.fillRect(x + 2, y - 17, 9, 7);
    ctx.fillStyle = '#222'; [[-9, 0], [9, 0]].forEach(([dx]) => { ctx.beginPath(); ctx.arc(x + dx, y - 1, 3.5, 0, Math.PI * 2); ctx.fill(); });
  }

  keke(x, y, t) {
    const [sx, sy] = P(x + 0.5, y + 0.5);
    this.kekeShape(sx, sy + Math.sin(t / 60) * 1, '#f5c400');
    this.ctx.fillStyle = '#e5252a'; this.ctx.beginPath(); this.ctx.arc(sx, sy - 34, 5, 0, Math.PI * 2); this.ctx.fill();
  }

  tree(x, y) {
    const ctx = this.ctx; const [sx, sy] = P(x + 0.5, y + 0.5);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(sx, sy, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5230'; ctx.fillRect(sx - 2, sy - 16, 4, 16);
    ctx.fillStyle = '#3f8a3a'; ctx.beginPath(); ctx.arc(sx, sy - 24, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4fa047'; ctx.beginPath(); ctx.arc(sx - 4, sy - 28, 8, 0, Math.PI * 2); ctx.fill();
  }

  figure(sx, sy, cloth, skin, scale = 1) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(sx, sy, 7 * scale, 3 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2c31'; ctx.fillRect(sx - 4 * scale, sy - 8 * scale, 3 * scale, 8 * scale); ctx.fillRect(sx + 1 * scale, sy - 8 * scale, 3 * scale, 8 * scale);
    ctx.fillStyle = cloth; this.round(sx - 6 * scale, sy - 20 * scale, 12 * scale, 13 * scale, 4 * scale); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(sx, sy - 25 * scale, 5 * scale, 0, Math.PI * 2); ctx.fill();
  }

  person(x, y, id, bag, passer) {
    const [sx, sy] = P(x + 0.5, y + 0.5);
    if (passer) this.ctx.globalAlpha = 0.8;
    this.figure(sx, sy, CLOTH[id % CLOTH.length], SKIN[id % SKIN.length], passer ? 0.82 : 0.9);
    this.ctx.globalAlpha = 1;
    if (bag) { this.ctx.fillStyle = '#fff'; this.ctx.strokeStyle = '#999'; this.round(sx + 5, sy - 14, 7, 8, 2); this.ctx.fill(); this.ctx.stroke(); }
  }

  player(x, y, s) {
    const ctx = this.ctx; const [sx, sy] = P(x + 0.5, y + 0.5);
    ctx.strokeStyle = '#e5252a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(sx, sy, 12, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    this.figure(sx, sy, '#1c1d21', '#7a4a2a', 1.15);
    // a box on the head when carrying goods
    const load = Object.values(s.player.carry).reduce((a, c) => a + c.qty, 0);
    if (load > 0 && !s.player.pusher) { ctx.fillStyle = '#c98b3a'; ctx.fillRect(sx - 8, sy - 44, 16, 11); ctx.strokeStyle = '#8a5d22'; ctx.strokeRect(sx - 8, sy - 44, 16, 11); }
    // marker
    ctx.fillStyle = '#e5252a'; ctx.beginPath(); ctx.moveTo(sx, sy - 48 - (load && !s.player.pusher ? 10 : 0)); ctx.lineTo(sx - 6, sy - 58 - (load && !s.player.pusher ? 10 : 0)); ctx.lineTo(sx + 6, sy - 58 - (load && !s.player.pusher ? 10 : 0)); ctx.closePath(); ctx.fill();
  }

  boy(x, y, t) {
    const ctx = this.ctx; const [sx, sy] = P(x + 0.5, y + 0.5);
    this.figure(sx, sy, '#f5a30a', '#6b4226', 0.85);
    const wave = Math.sin(t / 150) * 4;
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + 5, sy - 16); ctx.lineTo(sx + 11, sy - 26 + wave); ctx.stroke(); ctx.lineWidth = 1;
    if (Math.floor(t / 1600) % 2 === 0) {
      ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
      const msg = this.labels.boyCall || 'Buy here!';
      const tw = ctx.measureText(msg).width;
      ctx.fillStyle = '#fff'; this.round(sx - tw / 2 - 7, sy - 52, tw + 14, 18, 8); ctx.fill();
      ctx.fillStyle = '#1c1d21'; ctx.fillText(msg, sx - tw / 2, sy - 39);
    }
  }

  sampleTable(x, y, t) {
    const ctx = this.ctx; const [sx, sy] = P(x + 0.5, y + 0.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 14, sy - 14, 28, 8);
    ctx.fillStyle = '#e5252a'; ctx.fillRect(sx - 14, sy - 6, 28, 6);
    ctx.fillStyle = '#8a5d22'; ctx.fillRect(sx - 12, sy, 3, 8); ctx.fillRect(sx + 9, sy, 3, 8);
    [0, 1, 2].forEach((i) => this.figure(sx - 22 + i * 16, sy + 16 + Math.sin(t / 300 + i) * 1.5, CLOTH[(i + 3) % CLOTH.length], SKIN[i], 0.75));
    ctx.font = '800 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#e5252a'; ctx.fillText(this.labels.free || 'FREE', sx - 12, sy - 18);
  }

  pusher(x, y) {
    const ctx = this.ctx; const [sx, sy] = P(x + 0.5, y + 0.5);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(sx + 6, sy, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a6fa5'; ctx.fillRect(sx - 2, sy - 14, 22, 9);
    ctx.fillStyle = '#c98b3a'; ctx.fillRect(sx, sy - 24, 8, 10); ctx.fillRect(sx + 9, sy - 22, 8, 8);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(sx + 3, sy - 3, 3, 0, Math.PI * 2); ctx.arc(sx + 16, sy - 3, 3, 0, Math.PI * 2); ctx.fill();
    this.figure(sx - 8, sy + 2, '#8e44ad', '#5a3825', 0.8);
  }

  round(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
}
