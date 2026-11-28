// The animated farm. Sky follows your real clock (sun by day, moon and stars at night);
// weather, soil and the maize follow the farm. Pure SVG and CSS animation.
import { useMemo } from 'react';
import { stageName } from './sim.js';

const VB_W = 1000, VB_H = 600;
const HORIZON = 360;

// ---------- colour helpers ----------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};
// sky colours through the day: [hour, top, bottom]
const SKY = [
  [0, '#070b1f', '#151c3d'], [4.5, '#0b1230', '#1c2650'], [5.8, '#3a3f78', '#e98d5a'], [6.8, '#6d9bd6', '#f6c08a'],
  [8.5, '#4f9be0', '#bfe2f6'], [15.5, '#4b97de', '#c6e6f7'], [17.3, '#6a7fc9', '#f6b37a'], [18.6, '#3a2f6b', '#e5704a'],
  [19.6, '#151a42', '#3a3164'], [24, '#070b1f', '#151c3d'],
];
function skyAt(h) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
    if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0); return [mix(t0, t1, t), mix(b0, b1, t)]; }
  }
  return [SKY[0][1], SKY[0][2]];
}
const darkness = (h) => (h < 5 || h > 20 ? 0.62 : h < 6.5 ? 0.62 * (6.5 - h) / 1.5 : h > 18.5 ? 0.62 * (h - 18.5) / 1.5 : 0);

// perspective: depth t 0 (far) .. 1 (near)
const rowY = (t) => HORIZON + 50 + Math.pow(t, 1.5) * 225;
const rowScale = (t) => 0.32 + t * 0.78;

// ---------- one maize plant ----------
function Maize({ x, y, s, g, health, hunger, thirst, harvested, seedN }) {
  if (harvested) {
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M-3 0 L-2 -16 L1 -16 L2 0 Z" fill="#b89a5a" />
        <path d="M-2 -16 L-6 -22 M1 -16 L5 -21" stroke="#a88a4c" strokeWidth="2" />
      </g>
    );
  }
  if (g <= 0) {
    return <g transform={`translate(${x} ${y}) scale(${s})`}><ellipse cx="0" cy="0" rx="9" ry="3" fill="#4a3220" opacity=".6" /></g>;
  }
  const mature = g >= 0.97;
  const drying = g >= 0.85;
  const H = 14 + Math.min(1, g / 0.62) * 230;
  // colour: healthy green, yellow when hungry or weak, tan when drying
  let leaf = mix('#2f8f3a', '#c9c040', Math.max(hunger * 0.8, (100 - health) / 140));
  if (drying) leaf = mix(leaf, '#c9a45c', mature ? 0.95 : (g - 0.85) / 0.15);
  const stem = mix(leaf, '#6b7d2c', 0.25);
  const leaves = Math.min(12, 2 + Math.floor(Math.min(1, g / 0.55) * 10));
  const droop = 12 + thirst * 38 + (mature ? 25 : 0);
  const items = [];
  for (let i = 0; i < leaves; i++) {
    const side = i % 2 ? 1 : -1;
    const ly = -H * (0.12 + (i / Math.max(1, leaves)) * 0.78);
    const len = (g < 0.2 ? 26 : 70) * (1 - (i / leaves) * 0.35) * (0.9 + ((seedN + i) % 3) * 0.06);
    const up = 26 - droop * 0.6;
    const tipY = ly - up + droop * 0.9;
    const cx = side * len * 0.55, cy = ly - up - 10;
    items.push(<path key={i} d={`M0 ${ly} Q${cx} ${cy} ${side * len} ${tipY} Q${cx * 0.9} ${cy + 9} 0 ${ly + 5} Z`} fill={leaf} stroke={mix(leaf, '#1d5a24', 0.4)} strokeWidth="0.8" />);
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="sway" style={{ animationDuration: `${3.2 + (seedN % 5) * 0.4}s`, animationDelay: `${-(seedN % 7) * 0.5}s` }}>
        <path d={`M-3 0 Q-2 ${-H * 0.5} -1.5 ${-H} L1.5 ${-H} Q2 ${-H * 0.5} 3 0 Z`} fill={stem} />
        {items}
        {g >= 0.5 && (
          <g transform={`translate(0 ${-H})`}>
            {[-14, -7, 0, 7, 14].map((a, i) => <path key={i} d={`M0 0 L${a * 0.9} ${-18 - (i % 2) * 6}`} stroke={drying ? '#c8a45a' : '#d9b84a'} strokeWidth="2" strokeLinecap="round" />)}
          </g>
        )}
        {g >= 0.62 && [0, 1].slice(0, health > 45 ? 2 : 1).map((k) => (
          <g key={k} transform={`translate(${k ? -4 : 4} ${-H * (0.45 + k * 0.12)}) rotate(${k ? -22 : 22})`}>
            <ellipse cx="0" cy="-12" rx="7" ry={10 + Math.min(1, (g - 0.62) / 0.3) * 8} fill={drying ? '#c9a45c' : '#7fb04a'} stroke={drying ? '#a5823f' : '#4d7a2a'} strokeWidth="1" />
            {!drying && <path d="M0 -28 q-4 -8 -2 -14 M0 -28 q3 -8 5 -12" stroke="#8a5a2b" strokeWidth="1.2" fill="none" />}
            {mature && <ellipse cx="0" cy="-14" rx="4" ry="9" fill="#f2c94c" />}
          </g>
        ))}
      </g>
    </g>
  );
}

// ---------- the scene ----------
export function FarmScene({ farm, now, pulse }) {
  const h = now.getHours() + now.getMinutes() / 60;
  const w = farm?.today;
  const rain = !!w?.rains;
  const haze = !!w?.haze;
  const cloud = w ? w.cloud : 0.25;
  const dark = darkness(h);
  let [skyTop, skyBottom] = skyAt(h);
  if (rain && dark < 0.5) { skyTop = mix(skyTop, '#6f7c8a', 0.65); skyBottom = mix(skyBottom, '#b7bec6', 0.6); }
  else if (haze && dark < 0.5) { skyTop = mix(skyTop, '#cdbb92', 0.55); skyBottom = mix(skyBottom, '#efe1bd', 0.6); }

  const sunUp = h >= 6 && h <= 18.6;
  const sunT = (h - 6) / 12.6;
  const sunX = 80 + sunT * 840, sunY = HORIZON - 10 - Math.sin(Math.PI * Math.min(1, Math.max(0, sunT))) * 270;
  const moonT = h >= 18 ? (h - 18) / 12 : (h + 6) / 12;
  const moonX = 80 + moonT * 840, moonY = HORIZON - 30 - Math.sin(Math.PI * moonT) * 230;

  const moisture = farm ? farm.soil.moisture : 50;
  const soilTop = mix('#cfae78', '#6a4a2e', moisture / 100);
  const soilBottom = mix('#b8935a', '#4a3220', moisture / 100);
  const cracked = moisture < 22;

  const p = farm?.plant || { progress: 0, health: 100 };
  const growing = farm && farm.phase !== 'plan';
  const harvested = farm && (farm.phase === 'sell' || farm.phase === 'done');
  const g = growing ? p.progress : 0;
  const hunger = farm ? Math.max(0, (35 - farm.soil.nutrients) / 35) : 0;
  const thirst = farm ? Math.max(0, (40 - farm.soil.moisture) / 40) : 0;
  const plots = farm?.plots || 1;

  // plants: four rows, more columns for bigger land
  const plants = useMemo(() => {
    const out = [];
    const rows = 4;
    const cols = Math.min(16, 6 + plots * 2);
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.6) / rows;
      const y = rowY(t);
      const s = rowScale(t);
      const width = 380 + t * 760;
      for (let c = 0; c < cols; c++) {
        const x = 500 - width / 2 + ((c + 0.5) / cols) * width + ((r * 7 + c * 13) % 9) - 4;
        out.push({ key: r + '-' + c, x, y, s: s * (0.92 + ((r * 5 + c * 3) % 5) * 0.03), n: r * 31 + c * 7 });
      }
    }
    return out;
  }, [plots]);

  const clouds = useMemo(() => {
    const n = Math.round(1 + cloud * 7);
    return Array.from({ length: n }, (_, i) => ({ i, y: 50 + ((i * 47) % 140), scale: 0.6 + ((i * 37) % 10) / 12, dur: 70 + ((i * 29) % 60), delay: -((i * 53) % 90) }));
  }, [cloud]);

  const stars = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: (i * 137.5) % 1000, y: (i * 61.3) % 300, r: 0.6 + (i % 3) * 0.5, d: (i % 5) * 0.7 })), []);
  const bags = harvested ? Math.min(12, Math.max(1, Math.round(farm.grainKg / 120))) : 0;
  const stageLabel = farm ? stageName(p) : 'seed';

  return (
    <svg className="farm-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={stageLabel}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={skyTop} /><stop offset="1" stopColor={skyBottom} /></linearGradient>
        <radialGradient id="sunGlow"><stop offset="0" stopColor="#fff6d0" /><stop offset="0.35" stopColor="#ffd970" stopOpacity="0.9" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
        <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={soilTop} /><stop offset="1" stopColor={soilBottom} /></linearGradient>
        <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fb07a" /><stop offset="1" stopColor="#7a9d68" /></linearGradient>
        <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6f9a55" /><stop offset="1" stopColor="#557f42" /></linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="2.5" /></filter>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#sky)" />

      {dark > 0.2 && (
        <g opacity={Math.min(1, dark * 1.6)}>
          {stars.map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff" className="twinkle" style={{ animationDelay: st.d + 's' }} />)}
        </g>
      )}
      {!sunUp && moonY < HORIZON && (
        <g>
          <circle cx={moonX} cy={moonY} r="26" fill="#f4f1de" opacity=".95" />
          <circle cx={moonX + 10} cy={moonY - 6} r="23" fill={skyTop} />
        </g>
      )}
      {sunUp && (
        <g opacity={rain ? 0.15 : haze ? 0.55 : 1 - cloud * 0.45}>
          <circle cx={sunX} cy={sunY} r="95" fill="url(#sunGlow)" />
          <circle cx={sunX} cy={sunY} r="30" fill={haze ? '#f6e3b0' : '#fff3c4'} />
        </g>
      )}

      {/* clouds */}
      {clouds.map((c) => (
        <g key={c.i} className="cloud" style={{ animationDuration: c.dur + 's', animationDelay: c.delay + 's' }}>
          <g transform={`translate(0 ${c.y}) scale(${c.scale})`} filter="url(#soft)" fill={rain ? '#8d97a3' : dark > 0.4 ? '#3a4266' : '#ffffff'} opacity={rain ? 0.95 : 0.88}>
            <ellipse cx="60" cy="20" rx="60" ry="22" /><ellipse cx="110" cy="10" rx="48" ry="26" /><ellipse cx="150" cy="24" rx="52" ry="20" /><ellipse cx="100" cy="30" rx="80" ry="16" />
          </g>
        </g>
      ))}

      {/* land beyond the farm */}
      <path d={`M0 ${HORIZON - 40} C 150 ${HORIZON - 110} 280 ${HORIZON - 30} 420 ${HORIZON - 70} S 700 ${HORIZON - 120} 1000 ${HORIZON - 55} L1000 ${HORIZON + 20} L0 ${HORIZON + 20} Z`} fill="url(#hillFar)" />
      <path d={`M0 ${HORIZON - 5} C 200 ${HORIZON - 55} 360 ${HORIZON + 5} 560 ${HORIZON - 30} S 860 ${HORIZON - 10} 1000 ${HORIZON - 25} L1000 ${HORIZON + 40} L0 ${HORIZON + 40} Z`} fill="url(#hillNear)" />
      {/* savanna trees and palms on the horizon */}
      {[[90, 0.9, 'a'], [250, 0.7, 'p'], [690, 0.8, 'a'], [860, 1, 'p'], [950, 0.6, 'a']].map(([x, s, k], i) => (
        <g key={i} transform={`translate(${x} ${HORIZON - 2}) scale(${s})`}>
          {k === 'a' ? (
            <>
              <path d="M-2 0 L-1 -45 L-14 -60 M-1 -45 L12 -62" stroke="#5a4127" strokeWidth="4" fill="none" />
              <ellipse cx="0" cy="-66" rx="44" ry="11" fill="#4e7d3c" /><ellipse cx="-6" cy="-72" rx="30" ry="8" fill="#5b8c46" />
            </>
          ) : (
            <g className="sway slow">
              <path d="M0 0 Q4 -40 2 -80" stroke="#6b5232" strokeWidth="5" fill="none" />
              {[-60, -25, 15, 50, 80, 115].map((a, j) => <path key={j} d="M2 -80 q 22 -10 40 6" transform={`rotate(${a} 2 -80)`} stroke="#3f7a34" strokeWidth="5" fill="none" strokeLinecap="round" />)}
            </g>
          )}
        </g>
      ))}

      {/* farmhouse with a zinc roof */}
      <g transform={`translate(236 ${HORIZON + 30}) scale(0.62)`}>
        <rect x="0" y="-48" width="92" height="48" fill="#d9c3a0" />
        <rect x="0" y="-48" width="92" height="48" fill="#000" opacity={dark * 0.4} />
        <path d="M-10 -46 L46 -82 L102 -46 Z" fill="#9aa3ab" /><path d="M-10 -46 L46 -82 L46 -46 Z" fill="#b5bec6" />
        <rect x="38" y="-28" width="18" height="28" fill="#6b4226" />
        <rect x="10" y="-36" width="16" height="12" fill={dark > 0.3 ? '#ffd772' : '#5f86a8'} />
        <rect x="66" y="-36" width="16" height="12" fill={dark > 0.3 ? '#ffd772' : '#5f86a8'} />
        {/* water tank, filled when you irrigate */}
        <g transform="translate(112 -10)">
          <rect x="0" y="-52" width="5" height="52" fill="#7a6a5a" /><rect x="26" y="-52" width="5" height="52" fill="#7a6a5a" />
          <rect x="-4" y="-80" width="40" height="30" rx="4" fill="#2c6fb3" />
          <rect x="-4" y="-80" width="40" height="8" rx="3" fill="#3f86cf" />
        </g>
      </g>

      {/* the field */}
      <path d={`M${500 - 230} ${HORIZON + 40} L${500 + 230} ${HORIZON + 40} L1060 ${VB_H} L-60 ${VB_H} Z`} fill="url(#soil)" />
      {/* furrows */}
      {Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        return <path key={i} d={`M${500 - 230 + t * 460} ${HORIZON + 40} L${-60 + t * 1120} ${VB_H}`} stroke="#000" strokeOpacity={0.08 + (1 - moisture / 100) * 0.05} strokeWidth="2" />;
      })}
      {cracked && (
        <g stroke="#8a6a3e" strokeWidth="1.4" fill="none" opacity="0.7">
          {Array.from({ length: 18 }, (_, i) => { const x = 60 + ((i * 97) % 880), y = HORIZON + 80 + ((i * 53) % 200); return <path key={i} d={`M${x} ${y} l12 6 l-4 10 l14 4 M${x + 12} ${y + 6} l10 -6`} />; })}
        </g>
      )}
      {/* plot fences: one section per plot of land */}
      {plots > 1 && Array.from({ length: plots - 1 }, (_, i) => {
        const f = (i + 1) / plots;
        return <path key={i} d={`M${500 - 230 + f * 460} ${HORIZON + 40} L${-60 + f * 1120} ${VB_H}`} stroke="#8a6a3e" strokeWidth="3" strokeDasharray="10 14" />;
      })}

      {/* maize */}
      {plants.map((pl) => (
        <Maize key={pl.key} x={pl.x} y={pl.y} s={pl.s} g={g} health={p.health} hunger={hunger} thirst={thirst} harvested={harvested} seedN={pl.n} />
      ))}

      {/* harvest bags by the house */}
      {bags > 0 && Array.from({ length: bags }, (_, i) => (
        <g key={i} transform={`translate(${300 + (i % 6) * 20} ${HORIZON + 62 - Math.floor(i / 6) * 16}) scale(0.85)`}>
          <path d="M-10 0 Q-12 -20 -6 -24 L6 -24 Q12 -20 10 0 Z" fill="#e8dcc0" stroke="#b9a77f" />
          <path d="M-6 -24 L0 -30 L6 -24" fill="#e8dcc0" stroke="#b9a77f" />
        </g>
      ))}

      {/* irrigation spray */}
      {pulse.water > 0 && (
        <g key={'w' + pulse.water} className="spray">
          {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={80 + (i * 23) % 860} cy={HORIZON + 70 + (i * 37) % 200} r="3" fill="#8fd0ff" className="drop" style={{ animationDelay: (i % 10) * 0.08 + 's' }} />)}
        </g>
      )}
      {/* manure */}
      {pulse.manure > 0 && (
        <g key={'m' + pulse.manure}>
          {Array.from({ length: 50 }, (_, i) => <circle key={i} cx={60 + (i * 19) % 900} cy={HORIZON + 60 + (i * 41) % 220} r="2.6" fill="#5a3a1e" className="grain" style={{ animationDelay: (i % 12) * 0.06 + 's' }} />)}
        </g>
      )}

      {/* rain */}
      {rain && (
        <g className="rain">
          {Array.from({ length: 120 }, (_, i) => <line key={i} x1={(i * 8.3) % 1000} y1={-20 - (i * 17) % 300} x2={(i * 8.3) % 1000 - 6} y2={-2 - (i * 17) % 300} stroke="#cfe3f5" strokeWidth="1.4" style={{ animationDelay: -((i * 13) % 100) / 100 + 's' }} />)}
        </g>
      )}
      {haze && <rect width={VB_W} height={VB_H} fill="#e9d9b2" opacity={dark > 0.4 ? 0.08 : 0.22} />}
      {dark > 0 && <rect width={VB_W} height={VB_H} fill="#0a0f2c" opacity={dark} />}
      {/* the farmhouse windows glow through the night */}
      {dark > 0.3 && (
        <g transform={`translate(236 ${HORIZON + 30}) scale(0.62)`}>
          <rect x="10" y="-36" width="16" height="12" fill="#ffd772" /><rect x="66" y="-36" width="16" height="12" fill="#ffd772" />
          <circle cx="18" cy="-30" r="18" fill="#ffd772" opacity=".18" /><circle cx="74" cy="-30" r="18" fill="#ffd772" opacity=".18" />
        </g>
      )}
    </svg>
  );
}

