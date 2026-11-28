import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus, X, Globe, Check } from 'lucide-react';
import { useApp } from '../lib/app.jsx';

// ---------- brand ----------
// The real GetSchool mark: the G takes the colour it sits on, the square is always red.
const MARK_G = 'M69.6 32.4 A26.5 26.5 0 1 0 61.6 72.5 L61.6 74.4 Q61.6 75.8 63 75.8 L73.4 75.8 Q74.8 75.8 74.8 74.4 L74.8 59.2 Q74.8 57.8 73.4 57.8 L62.29 57.8 A15.8 15.8 0 1 1 61.08 38.89 Z';
export function Mark({ size = 30 }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="21.5 22.5 53.8 53.8" role="img" aria-label="GetSchool">
      <path d={MARK_G} fill="currentColor" />
      <rect x="61.8" y="42.5" width="13" height="12.7" rx="1.4" fill="#ff0a22" />
    </svg>
  );
}
// "GetSchool" written with the mark as its G, then "etschool" sat on its baseline.
export function Logo({ word = true, size = 26 }) {
  const h = Math.round(size * 0.82);
  return (
    <span className="logo" aria-label="GetSchool">
      <Mark size={h} />
      {word && <span className="logo-w" style={{ fontSize: h * 1.36, marginLeft: h * 0.04 }}>etschool</span>}
    </span>
  );
}

// ---------- petal artworks ----------
export const TONES = ['#1d4ef5', '#0b9f55', '#f0581a', '#7a36f0', '#e23d78', '#f5a30a', '#1593ee', '#079a8c'];
const SHAPES = ['scallop', 'bloom', 'daisy', 'pinwheel', 'fourfold', 'trefoil', 'fivefold'];

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

function ShapeSvg({ shape, color }) {
  const rot = (n, el) => Array.from({ length: n }, (_, i) => (
    <g key={i} transform={`rotate(${(360 / n) * i} 50 50)`}>{el}</g>
  ));
  let body;
  switch (shape) {
    case 'bloom': body = rot(4, <ellipse cx="50" cy="27" rx="18" ry="25" />); break;
    case 'daisy': body = rot(6, <ellipse cx="50" cy="26" rx="13" ry="23" />); break;
    case 'pinwheel': body = rot(4, <path d="M50 50 L50 8 Q85 9 83 42 Z" />); break;
    case 'fourfold': body = rot(4, <path d="M50 50 Q22 18 50 6 Q78 18 50 50 Z" />); break;
    case 'trefoil': body = rot(3, <circle cx="50" cy="31" r="24" />); break;
    case 'fivefold': body = rot(5, <ellipse cx="50" cy="28" rx="17" ry="23" />); break;
    default: body = rot(10, <circle cx="50" cy="16" r="13" />);
  }
  return (
    <svg className="petal-shape" viewBox="0 0 100 100" aria-hidden="true">
      <g fill={color}>{body}<circle cx="50" cy="50" r="30" /></g>
    </svg>
  );
}

export function Petal({ id = 'x', icon: Icon, size = 52, shape, color, spin = false }) {
  const h = hash(id);
  const s = shape || SHAPES[h % SHAPES.length];
  const c = color || TONES[(h >>> 3) % TONES.length];
  return (
    <span className={'petal' + (spin ? ' spin' : '')} style={{ width: size, height: size }}>
      <ShapeSvg shape={s} color={c} />
      {Icon && <Icon size={Math.round(size * 0.38)} strokeWidth={2.2} color="#fff" />}
    </span>
  );
}

// Primary artworks used for decoration (viewBox 0 0 100 100)
export function Art({ name, size = 80, className = '' }) {
  const B = '#0866F5', SB = '#7C9CFF', P = '#FF78A8', G = '#FFBE45', N = '#07142E';
  const r4 = (el) => [0, 90, 180, 270].map((a) => <g key={a} transform={`rotate(${a} 50 50)`}>{el}</g>);
  const shapes = {
    fourfold: <g fill={B}>{r4(<path d="M50 50 Q25 20 50 10 Q75 20 50 50 Z" />)}</g>,
    dots: <g fill={B}>{[[20, 5], [40, 8], [60, 11], [80, 14]].map(([x, r]) => <circle key={x} cx={x} cy="50" r={r} />)}</g>,
    kite: <g><path d="M50 13 L83 44 L50 87 L17 44 Z" fill={P} /><path d="M50 13 V87 M17 44 H83" stroke="#fff" strokeWidth="3" /></g>,
    droplet: <path d="M50 8 C70 30 88 43 88 62 A38 38 0 0 1 12 62 C12 43 30 30 50 8 Z" fill={SB} />,
    loop: <path d="M50 12 C85 14 88 48 50 50 C12 52 15 86 50 88 C85 86 88 52 50 50" stroke={G} strokeWidth="11" strokeLinecap="round" fill="none" />,
    ripple: <path d="M12 50 C24 12 38 88 50 50 S76 12 88 50" stroke={B} strokeWidth="10" strokeLinecap="round" fill="none" />,
    leaf: <g><path d="M50 88 C-5 65 18 20 82 12 C88 58 77 83 50 88 Z" fill={B} /><path d="M29 73 Q50 49 70 32" stroke="#fff" strokeWidth="3" fill="none" /></g>,
    daisy: <g>{[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="50" cy="28" rx="13" ry="23" fill={P} transform={`rotate(${a} 50 50)`} />)}<circle cx="50" cy="50" r="10" fill={G} /></g>,
    blocks: <g fill={B}>{[[14, 48], [36, 30], [58, 12]].map(([x, y]) => <rect key={x} x={x} y={y} width="28" height="28" rx="4" />)}</g>,
    spark: <path fillRule="evenodd" fill={G} d="M50 6 L61 38 L94 50 L61 61 L50 94 L39 61 L6 50 L39 38 Z M59 50 A9 9 0 1 0 41 50 A9 9 0 1 0 59 50 Z" />,
    waves: <g><path d="M12 12 C47 12 47 46 12 46 Z" fill={B} /><path d="M12 12 C47 12 47 46 12 46 Z" fill={SB} transform="translate(25 14)" /><path d="M12 12 C47 12 47 46 12 46 Z" fill={P} transform="translate(50 28)" /></g>,
    orbit: <g><circle cx="50" cy="50" r="29" stroke={B} strokeWidth="10" fill="none" /><circle cx="50" cy="50" r="12" fill={G} /><circle cx="77" cy="19" r="8" fill={P} /></g>,
    ribbon: <g><path d="M10 60 Q30 10 50 50 T90 35" stroke={B} strokeWidth="9" strokeLinecap="round" fill="none" /><circle cx="90" cy="35" r="8" fill={G} /></g>,
    petals: <g fill={P}>{[12, 39, 66].map((x) => <path key={x} d="M0 0 Q46 18 0 36 Z" transform={`translate(${x} 30)`} />)}</g>,
    pinwheel: <g fill={G}>{r4(<path d="M50 50 L50 8 Q85 9 83 42 Z" />)}</g>,
    cloud: <path d="M12 58 C-2 40 19 24 34 34 C38 6 70 10 72 34 C98 28 104 60 83 68 C82 91 48 94 42 76 C22 91 4 78 12 58Z" fill="#fff" stroke={B} strokeWidth="3" strokeLinejoin="round" />,
    bloom: <g>{r4(<ellipse cx="50" cy="27" rx="18" ry="25" fill={B} />)}<circle cx="50" cy="50" r="7" fill={N} /></g>,
  };
  return (
    <svg className={'art ' + className} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">{shapes[name]}</svg>
  );
}

// ---------- money ----------
export function Coin({ size = 14 }) {
  return (
    <svg className="coin" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#f5a30a" /><circle cx="10" cy="10" r="5.5" fill="none" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}
export function Money({ v, className = '' }) {
  const n = Math.round(v || 0);
  return <span className={'money ' + className}><Coin />{(n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US')}</span>;
}

// ---------- inputs ----------
export function Dropdown({ value, options, onChange, className = '', disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const cur = options.find((o) => o.value === value) || options[0];
  return (
    <div className={'dd ' + className + (open ? ' open' : '')} ref={ref}>
      <button type="button" className="dd-btn" disabled={disabled} onClick={() => setOpen(!open)}>
        <span className="dd-label">{cur?.label}</span>
        {cur?.hint && <span className="dd-hint">{cur.hint}</span>}
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="dd-menu">
          {options.map((o) => (
            <button type="button" key={o.value} disabled={o.disabled} className={'dd-item' + (o.value === value ? ' on' : '')}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              <span className="dd-label">{o.label}</span>
              {o.hint && <span className="dd-hint">{o.hint}</span>}
              {o.value === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = Infinity, label }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, Number.isFinite(v) ? v : min)));
  return (
    <div className="stepper">
      {label && <span className="stepper-label">{label}</span>}
      <div className="stepper-row">
        <button type="button" aria-label="less" onClick={() => set(value - step)}><Minus size={15} /></button>
        <input inputMode="numeric" value={value} onChange={(e) => set(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))} />
        <button type="button" aria-label="more" onClick={() => set(value + step)}><Plus size={15} /></button>
      </div>
    </div>
  );
}

// ---------- overlays ----------
export function Modal({ children, onClose, wide }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={'modal' + (wide ? ' wide' : '')}>
        {onClose && <button className="modal-x" onClick={onClose} aria-label="close"><X size={18} /></button>}
        {children}
      </div>
    </div>
  );
}

export function Loader() {
  return (
    <div className="loader">
      <div className="loader-ring">
        <Art name="daisy" size={46} className="l1" />
        <Art name="pinwheel" size={40} className="l2" />
        <Art name="bloom" size={42} className="l3" />
        <Art name="spark" size={38} className="l4" />
      </div>
      <Logo word={false} size={54} />
    </div>
  );
}

export function LangMenu({ up }) {
  const { lang, setLang } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return (
    <div className="lang" ref={ref}>
      <button type="button" className="icon-btn" onClick={() => setOpen(!open)} aria-label="language"><Globe size={19} /></button>
      {open && (
        <div className={'lang-menu' + (up ? ' up' : '')}>
          {[['en', 'English'], ['fr', 'Français']].map(([k, n]) => (
            <button key={k} className={lang === k ? 'on' : ''} onClick={() => { setLang(k); setOpen(false); }}>{n}{lang === k && <Check size={14} />}</button>
          ))}
        </div>
      )}
    </div>
  );
}
