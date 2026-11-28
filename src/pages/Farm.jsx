import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useBlocker, Navigate } from 'react-router-dom';
import {
  Sprout, Droplets, CloudRain, Sun, Moon, CloudSun, Wind, Thermometer, Wallet, Store, ShoppingBasket, Handshake,
  BookOpen, LogOut, Menu, X, ArrowRight, ArrowLeft, Award, Trophy, Leaf, Wheat, Tractor, CalendarDays, Package,
  Lightbulb, ShieldCheck, Crown, Lock, NotebookPen, Users, RotateCcw,
} from 'lucide-react';
import { useApp, fmt } from '../lib/app.jsx';
import { getFarm, farmStart, farmSubmit, saveRun, loadRun, clearRun, errorText, LOCAL } from '../lib/store.js';
import * as F from '../farm/sim.js';
import { FarmScene } from '../farm/FarmScene.jsx';
import { STAGES, CROPS, COSTS, DAY_PACE, SEASONS, seasonFor, stageFor, WEIGHTS } from '../farm/data.js';
import { Money, Dropdown, Stepper, Modal, Petal, Art, Logo } from '../components/ui.jsx';
import { Hero } from '../components/Shell.jsx';
import { Stars } from './Home.jsx';

const MONTHS = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'] };
const RUN_KEY = 'farm';

// ================= farm home: the farmer's progress =================
export default function FarmHome() {
  const { t, profile, lang } = useApp();
  const nav = useNavigate();
  const [farm, setFarm] = useState(null);
  const [err, setErr] = useState('');
  const [pace, setPace] = useState('normal');
  const [busy, setBusy] = useState(false);
  const saved = profile ? loadRun(profile.uid, RUN_KEY) : null;
  const active = saved && saved.sim?.status === 'playing';

  useEffect(() => { if (profile) getFarm(profile).then(setFarm).catch((e) => setErr(errorText(t, e))); }, [profile, t]);

  const stage = farm ? stageFor(farm.stage) : STAGES[0];
  const season = farm ? seasonFor(farm.seasonNo) : SEASONS[0];
  const locked = stage.premium && !profile?.premium;

  const start = async () => {
    setBusy(true); setErr('');
    try {
      const res = await farmStart(profile, pace);
      const sim = F.newSeason(res.profile, res.seed);
      saveRun(profile.uid, RUN_KEY, { sim, meta: { runId: res.runId, pace, log: [], plantedAt: null } });
      nav('/app/farm/play');
    } catch (e) { console.error(e); setErr(errorText(t, e)); }
    setBusy(false);
  };

  return (
    <div className="page">
      <Hero eyebrow={t('j.farmer')} title={t('farm.title')} line={t('farm.line')}
        info={{ title: t('farm.info.title'), body: <p>{t('farm.info.body')}</p> }} />

      <section className="block">
        <h2 className="block-title">{t('farm.path')}</h2>
        <div className="card pilgrim">
          <svg className="pilgrim-road" viewBox="0 0 1000 170" preserveAspectRatio="none" aria-hidden="true">
            <path d="M20 120 C 140 20, 230 150, 340 80 S 560 10, 660 90 S 860 150, 980 50" stroke="#e7e2d6" strokeWidth="22" fill="none" strokeLinecap="round" />
            <path d="M20 120 C 140 20, 230 150, 340 80 S 560 10, 660 90 S 860 150, 980 50" stroke="#c9bfa6" strokeWidth="2" strokeDasharray="8 10" fill="none" />
          </svg>
          <div className="pilgrim-stops">
            {STAGES.map((st) => {
              const state = !farm ? 'next' : st.id < farm.stage ? 'done' : st.id === farm.stage ? 'now' : 'next';
              return (
                <div key={st.id} className={'stop ' + state}>
                  <span className="stop-dot">{state === 'done' ? <Leaf size={18} /> : st.id}</span>
                  <b>{t('fs.' + st.key)}</b>
                  <span>{st.maxPlots === 1 ? t('farm.plot1') : t('farm.plots', { n: st.maxPlots })}</span>
                  {st.premium && <span className="tag gold sm"><Crown size={11} /> {t('premium')}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="two">
          <div className="card">
            <h3 className="card-title"><Tractor size={18} /> {t('farm.yourFarm')}</h3>
            {farm ? (
              <ul className="price-facts">
                <li><span>{t('farm.wallet')}</span><Money v={farm.wallet} /></li>
                <li><span>{t('farm.seedStore')}</span><b>{fmt(farm.seedKg)} kg</b></li>
                <li><span>{t('farm.restaurants')}</span><b>{farm.restaurants}</b></li>
                <li><span>{t('farm.stage')}</span><b>{t('fs.' + stage.key)}</b></li>
                <li><span>{t('farm.seasonNo')}</span><b>{farm.seasonNo}</b></li>
              </ul>
            ) : <div className="center-pad"><span className="dots dark"><i /><i /><i /></span></div>}
          </div>
          <div className="card season-card">
            <h3 className="card-title"><CalendarDays size={18} /> {t('farm.nextSeason')}</h3>
            <div className={'season-pill ' + season.id}>
              {season.hard ? <Sun size={18} /> : <CloudRain size={18} />}
              <div><b>{t('season.' + season.id)}</b><span>{t('season.' + season.id + '.line', { m: MONTHS[lang][season.startMonth - 1] })}</span></div>
            </div>
            {active ? (
              <Link className="btn red big full mt" to="/app/farm/play">{t('farm.continue')} <ArrowRight size={18} /></Link>
            ) : locked ? (
              <Link className="btn dark big full mt" to="/app/premium"><Crown size={18} /> {t('farm.unlock')}</Link>
            ) : (
              <>
                <div className="field-label mt">{t('farm.pace')}</div>
                <Dropdown value={pace} onChange={setPace} options={['fast', 'normal', 'relaxed'].map((k) => ({ value: k, label: t('pace.' + k), hint: t('pace.' + k + '.hint') }))} />
                <button className="btn red big full mt" onClick={start} disabled={busy || !farm}>
                  {busy ? <span className="dots"><i /><i /><i /></span> : <>{t('farm.startSeason')} <ArrowRight size={18} /></>}
                </button>
              </>
            )}
            {err && <p className="pc-msg bad mt">{err}</p>}
          </div>
        </div>
      </section>

      {farm?.history?.length > 0 && (
        <section className="block">
          <h2 className="block-title">{t('farm.history')}</h2>
          <div className="card">
            <ul className="price-facts">
              {farm.history.map((h, i) => (
                <li key={i}><span>{t('farm.seasonN', { n: h.seasonNo })} · {t('season.' + h.season)} · {t('fs.' + stageFor(h.stage).key)}</span>
                  <span className="vs"><Money v={h.profit} className={h.profit < 0 ? 'neg' : ''} /> <b className={h.passed ? '' : 'neg'}>{h.total}</b></span></li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

// ================= the season, live =================
export function FarmPlay() {
  const { t, profile, lang, setProfile } = useApp();
  const nav = useNavigate();
  const simRef = useRef(null);
  const metaRef = useRef(null);
  const [loaded] = useState(() => {
    const saved = profile ? loadRun(profile.uid, RUN_KEY) : null;
    if (saved?.sim?.v === 3) { simRef.current = saved.sim; metaRef.current = saved.meta; return true; }
    return false;
  });
  const [, setVer] = useState(0);
  const bump = useCallback(() => setVer((v) => v + 1), []);
  const [tool, setTool] = useState('farm');
  const [menu, setMenu] = useState(false);
  const [now, setNow] = useState(new Date());
  const [pulse, setPulse] = useState({ water: 0, manure: 0 });
  const [toast, setToast] = useState(null);

  const s = simRef.current;
  const save = useCallback(() => { if (profile && simRef.current) saveRun(profile.uid, RUN_KEY, { sim: simRef.current, meta: metaRef.current }); }, [profile]);
  const live = s && s.status === 'playing';
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !!live && currentLocation.pathname !== nextLocation.pathname);

  const doAct = useCallback((type, args = []) => {
    const st = simRef.current;
    const d = st.day;
    const res = F.act(st, type, args);
    if (res.ok) {
      metaRef.current.log.push({ d, t: type, a: args });
      if (type === 'plant') metaRef.current.plantedAt = Date.now();
      if (type === 'water') setPulse((p) => ({ ...p, water: p.water + 1 }));
      if (type === 'manure') setPulse((p) => ({ ...p, manure: p.manure + 1 }));
      if (type === 'harvest' || type === 'finish') setTool(type === 'harvest' ? 'market' : 'farm');
      save();
    } else if (res.error) setToast(t('f.err.' + res.error));
    bump();
    return res;
  }, [bump, save, t]);

  // the farm runs on real time: catch up every second, also after being away
  useEffect(() => {
    if (!s) return undefined;
    const tick = () => {
      const st = simRef.current, meta = metaRef.current;
      setNow(new Date());
      if (!st || st.status !== 'playing' || !meta.plantedAt) return;
      const ms = DAY_PACE[meta.pace] || DAY_PACE.normal;
      const target = Math.floor((Date.now() - meta.plantedAt) / ms);
      let changed = false, n = 0;
      const prevWater = st.spent.irrigation, prevManure = st.spent.manure, prevPhase = st.phase;
      while (st.day < target && (st.phase === 'grow' || st.phase === 'harvest') && n++ < 2000) { if (!F.stepDay(st)) break; changed = true; }
      if (changed) {
        if (st.spent.irrigation > prevWater) setPulse((p) => ({ ...p, water: p.water + 1 }));
        if (st.spent.manure > prevManure) setPulse((p) => ({ ...p, manure: p.manure + 1 }));
        if (prevPhase === 'grow' && st.phase === 'harvest') setTool('farm');
        save(); bump();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(null), 2800); return () => clearTimeout(id); }, [toast]);

  if (!profile) return null;
  if (!s) return <Navigate to="/app/farm" replace />;

  const msDay = DAY_PACE[metaRef.current.pace] || DAY_PACE.normal;
  const nextIn = metaRef.current.plantedAt ? msDay - ((Date.now() - metaRef.current.plantedAt) % msDay) : null;
  const props = { s, t, lang, doAct, msDay, nextIn, setTool };

  const tools = [
    [{ id: 'farm', icon: Sprout }, { id: 'care', icon: Droplets }, { id: 'weather', icon: CloudSun }],
    [{ id: 'market', icon: ShoppingBasket }, { id: 'wallet', icon: Wallet }, { id: 'diary', icon: NotebookPen }, { id: 'help', icon: BookOpen }],
  ];
  const side = (
    <>
      <div className="gt-week">
        <span>{t('j.farmer')} · {t('fs.' + stageFor(s.stage).key)}</span>
        <b>{s.phase === 'plan' ? t('season.' + s.season) : t('f.dayN', { n: s.day })}</b>
        <div className="gt-weekbar"><i style={{ width: Math.round(s.plant.progress * 100) + '%' }} /></div>
      </div>
      <nav className="side-nav">
        {tools.map((g, i) => (
          <div className="side-box" key={i}>
            {g.map((it) => (
              <button key={it.id} className={'side-link' + (tool === it.id ? ' active' : '')} onClick={() => { setTool(it.id); setMenu(false); }}>
                <it.icon size={18} /> <span>{t('ft.' + it.id)}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <button className="side-link leave" onClick={() => nav('/app/farm')}><LogOut size={18} /> <span>{t('f.leaveBtn')}</span></button>
    </>
  );

  const done = s.status === 'done';

  return (
    <div className="game is-world">
      <aside className="side game-tools">
        <div className="side-head"><Logo size={26} /></div>
        {side}
      </aside>
      <main className="game-work">
        <div className="world">
          <div className="world-stage farm-stage">
            <FarmScene farm={s} now={now} pulse={pulse} />
            <FarmHud s={s} t={t} lang={lang} now={now} nextIn={nextIn} />
            {s.booking && s.booking.accepted === null && (
              <div className="booking-banner">
                <Handshake size={18} />
                <span>{t('f.bookingOffer', { kg: fmt(s.booking.kg) })}</span>
                <button className="btn red sm" onClick={() => doAct('book', [true])}>{t('f.accept')}</button>
                <button className="btn light sm" onClick={() => doAct('book', [false])}>{t('f.decline')}</button>
              </div>
            )}
            {toast && <div className="toast bad">{toast}</div>}
          </div>
          <aside className="world-panel">
            {done ? <SeasonResults s={s} meta={metaRef.current} save={save} t={t} profile={profile} setProfile={setProfile} nav={nav} /> : (
              <>
                {tool === 'farm' && <FarmPanel {...props} />}
                {tool === 'care' && <CarePanel {...props} />}
                {tool === 'weather' && <WeatherPanel {...props} />}
                {tool === 'market' && <MarketPanel {...props} />}
                {tool === 'wallet' && <WalletPanel {...props} />}
                {tool === 'diary' && <DiaryPanel {...props} />}
                {tool === 'help' && <HelpPanel {...props} />}
              </>
            )}
          </aside>
        </div>
      </main>
      <nav className="bottom-nav">
        {[tools[0][0], tools[0][1], tools[0][2], tools[1][0]].map((it) => (
          <button key={it.id} className={tool === it.id ? 'active' : ''} onClick={() => setTool(it.id)}><it.icon size={20} /><span>{t('ft.' + it.id)}</span></button>
        ))}
        <button onClick={() => setMenu(true)}><Menu size={20} /><span>{t('nav.menu')}</span></button>
      </nav>
      {menu && (
        <div className="sheet-bg" onClick={() => setMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><Logo size={22} /><button className="icon-btn" onClick={() => setMenu(false)}><X size={18} /></button></div>
            {side}
          </div>
        </div>
      )}
      {blocker.state === 'blocked' && (
        <Modal>
          <div className="confirm">
            <Petal id="leave" icon={LogOut} size={56} />
            <h3 className="modal-title">{t('game.leave.title')}</h3>
            <p className="muted">{t('f.leave.line')}</p>
            <div className="confirm-actions">
              <button className="btn line" onClick={() => blocker.reset()}>{t('game.leave.stay')}</button>
              <button className="btn red" onClick={() => { save(); blocker.proceed(); }}>{t('game.leave.go')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- overlay on the scene ----------
function WeatherIcon({ w, night, size = 18 }) {
  if (!w) return night ? <Moon size={size} /> : <Sun size={size} />;
  if (w.rains) return <CloudRain size={size} />;
  if (night) return <Moon size={size} />;
  if (w.haze) return <Wind size={size} />;
  return w.cloud > 0.5 ? <CloudSun size={size} /> : <Sun size={size} />;
}
const fmtDate = (s, d, lang) => { const x = F.dateOf(s, d); return `${x.date} ${MONTHS[lang][x.month - 1]}`; };
const clockStr = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
const mmss = (ms) => { const m = Math.floor(ms / 60000), sec = Math.floor((ms % 60000) / 1000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(sec).padStart(2, '0')}`; };

function Gauge({ label, v, tone }) {
  return (
    <div className={'gauge ' + (tone || '')}>
      <span>{label}</span>
      <div className="gauge-bar"><i style={{ width: Math.round(Math.max(0, Math.min(100, v))) + '%' }} /></div>
    </div>
  );
}

function FarmHud({ s, t, lang, now, nextIn }) {
  const night = now.getHours() < 6 || now.getHours() >= 19;
  const w = s.today || (s.phase !== 'plan' ? null : F.weatherOn(s, 1));
  const stage = F.stageName(s.plant);
  return (
    <div className="hud farm-hud">
      <div className="hud-chip"><CalendarDays size={15} /><b>{s.phase === 'plan' ? t('season.' + s.season) : t('f.dayN', { n: s.day })}</b><span>{fmtDate(s, Math.max(1, s.day), lang)}</span></div>
      <div className="hud-chip"><Wallet size={15} /><Money v={s.wallet} className={s.wallet < 0 ? 'neg' : ''} /></div>
      <div className="hud-chip"><WeatherIcon w={w} night={night} size={15} />{w && <><span>{w.temp}°</span><span>{t('f.hum', { n: w.hum })}</span><span>{t('f.rainChance', { n: w.chance })}</span></>}</div>
      <div className="hud-chip clock"><span>{clockStr(now)}</span>{nextIn != null && s.status === 'playing' && (s.phase === 'grow' || s.phase === 'harvest') && <small>{t('f.nextDay', { m: mmss(nextIn) })}</small>}</div>
      <div className="gauges">
        <Gauge label={t('f.g.water')} v={s.soil.moisture} tone={s.soil.moisture < 30 ? 'bad' : 'blue'} />
        <Gauge label={t('f.g.food')} v={s.soil.nutrients} tone={s.soil.nutrients < 30 ? 'bad' : 'brown'} />
        <Gauge label={t('f.g.health')} v={s.plant.health} tone={s.plant.health < 50 ? 'bad' : 'green'} />
        <div className="gauge stage"><span>{t('f.stage.' + stage)}</span><div className="gauge-bar"><i style={{ width: Math.round(s.plant.progress * 100) + '%' }} /></div></div>
      </div>
    </div>
  );
}

// ---------- panels ----------
function FarmPanel({ s, t, doAct, setTool }) {
  const stage = stageFor(s.stage);
  if (s.phase === 'plan') {
    const c = F.planCost(s);
    const autoValue = s.auto.water && s.auto.manure ? 'both' : s.auto.water ? 'water' : 'none';
    return (
      <div className="panel-stack">
        <div className="card">
          <h3 className="card-title"><Sprout size={17} /> {t('f.plan.title')}</h3>
          <p className="muted small">{t('season.' + s.season + '.plan')}</p>
          <div className="field-label mt">{t('f.plan.plots', { max: stage.maxPlots })}</div>
          <Stepper value={s.plots} onChange={(v) => doAct('plots', [v])} min={1} max={stage.maxPlots} />
          <div className="field-label mt">{t('f.hand')}</div>
          <Dropdown value={autoValue} onChange={(v) => doAct('auto', [v !== 'none', v === 'both'])} options={[
            { value: 'none', label: t('f.hand.none') }, { value: 'water', label: t('f.hand.water') }, { value: 'both', label: t('f.hand.both') },
          ]} />
          <p className="muted small mt">{t('f.hand.info', { c: fmt(COSTS.farmHandPerPlot) })}</p>
          <ul className="price-facts mt">
            <li><span>{t('f.cost.rent', { n: s.plots })}</span><Money v={c.rent} /></li>
            <li><span>{c.ownSeed ? t('f.cost.seedOwn', { kg: c.ownSeed }) : t('f.cost.seed', { kg: c.need })}</span><Money v={c.seed} /></li>
            <li><span>{t('f.cost.planting')}</span><Money v={c.planting} /></li>
            <li><b>{t('biz.total')}</b><Money v={c.total} /></li>
            <li><span>{t('farm.wallet')}</span><Money v={s.wallet} className={s.wallet < c.total ? 'neg' : ''} /></li>
          </ul>
          <button className="btn red big full mt" onClick={() => doAct('plant')}><Sprout size={18} /> {t('f.plant')}</button>
        </div>
      </div>
    );
  }
  const expected = F.expectedKg(s);
  return (
    <div className="panel-stack">
      {s.phase === 'harvest' && (
        <div className="card harvest-card">
          <h3 className="card-title"><Wheat size={17} /> {t('f.ready')}</h3>
          <p className="muted small">{t('f.ready.line', { d: CROPS.maize.harvestWindow })}</p>
          <button className="btn red big full mt" onClick={() => doAct('harvest')}><Wheat size={18} /> {t('f.harvest', { c: fmt(COSTS.harvestPerPlot * s.plots) })}</button>
        </div>
      )}
      <div className="card">
        <h3 className="card-title"><Leaf size={17} /> {t('f.field')}</h3>
        <ul className="price-facts">
          <li><span>{t('f.cropLand')}</span><b>{t('f.maizeOn', { n: s.plots })}</b></li>
          <li><span>{t('f.growth')}</span><b>{t('f.stage.' + F.stageName(s.plant))} · {Math.round(s.plant.progress * 100)}%</b></li>
          <li><span>{t('f.g.health')}</span><b className={s.plant.health < 50 ? 'neg' : ''}>{Math.round(s.plant.health)}%</b></li>
          <li><span>{t('f.expected')}</span><b>{fmt(expected)} kg</b></li>
          <li><span>{t('f.price')}</span><Money v={F.priceOn(s, Math.max(1, s.day))} /></li>
        </ul>
        <div className="two-btn mt">
          <button className="btn line" onClick={() => setTool('care')}>{t('ft.care')}</button>
          <button className="btn line" onClick={() => setTool('weather')}>{t('ft.weather')}</button>
        </div>
      </div>
      <TipCard s={s} t={t} />
    </div>
  );
}

function TipCard({ s, t }) {
  let k = 'fine';
  if (s.soil.moisture < 30) k = 'thirsty';
  else if (s.soil.nutrients < 30 && s.plant.progress < 0.62) k = 'hungry';
  else if (s.today && s.today.sun < 0.45) k = 'cloudy';
  else if (s.phase === 'harvest') k = 'harvest';
  return <div className="panel-tip"><Lightbulb size={16} /><span>{t('f.tip.' + k)}</span></div>;
}

function CarePanel({ s, t, doAct }) {
  const autoValue = s.auto.water && s.auto.manure ? 'both' : s.auto.water ? 'water' : 'none';
  const wCost = F.irrigateCost(s, Math.max(1, s.day));
  const dry = wCost / s.plots >= COSTS.irrigateDry;
  return (
    <div className="panel-stack">
      <div className="card">
        <h3 className="card-title"><Droplets size={17} /> {t('f.water.title')}</h3>
        <Gauge label={t('f.g.water') + ' ' + Math.round(s.soil.moisture) + '%'} v={s.soil.moisture} tone={s.soil.moisture < 30 ? 'bad' : 'blue'} />
        <p className="muted small mt">{dry ? t('f.water.dry') : t('f.water.rainy')}</p>
        <button className="btn dark full mt" onClick={() => doAct('water')} disabled={s.phase !== 'grow'}><Droplets size={16} /> {t('f.water.btn', { c: fmt(wCost) })}</button>
      </div>
      <div className="card">
        <h3 className="card-title"><Package size={17} /> {t('f.manure.title')}</h3>
        <Gauge label={t('f.g.food') + ' ' + Math.round(s.soil.nutrients) + '%'} v={s.soil.nutrients} tone={s.soil.nutrients < 30 ? 'bad' : 'brown'} />
        <p className="muted small mt">{t('f.manure.info')}</p>
        <button className="btn dark full mt" onClick={() => doAct('manure')} disabled={s.phase !== 'grow' || s.plant.progress >= 0.85}><Package size={16} /> {t('f.manure.btn', { c: fmt(COSTS.manurePerPlot * s.plots) })}</button>
      </div>
      <div className="card">
        <h3 className="card-title"><Users size={17} /> {t('f.hand')}</h3>
        <Dropdown value={autoValue} onChange={(v) => doAct('auto', [v !== 'none', v === 'both'])} options={[
          { value: 'none', label: t('f.hand.none') }, { value: 'water', label: t('f.hand.water') }, { value: 'both', label: t('f.hand.both') },
        ]} />
        <p className="muted small mt">{t('f.hand.info', { c: fmt(COSTS.farmHandPerPlot) })}</p>
      </div>
    </div>
  );
}

function WeatherPanel({ s, t, lang }) {
  const start = Math.max(1, s.day);
  const days = Array.from({ length: 6 }, (_, i) => F.weatherOn(s, start + i));
  return (
    <div className="panel-stack">
      <div className="card">
        <h3 className="card-title"><CloudSun size={17} /> {t('f.forecast')}</h3>
        <div className="forecast">
          {days.map((w, i) => (
            <div key={w.day} className={'fc' + (i === 0 ? ' today' : '')}>
              <span>{i === 0 ? t('f.today') : fmtDate(s, w.day, lang)}</span>
              <WeatherIcon w={{ ...w, rains: i < 2 ? w.rains : false }} size={22} />
              <b>{w.temp}°</b>
              <small>{t('f.rainChance', { n: w.chance })}</small>
              <small>{t('f.hum', { n: w.hum })}</small>
            </div>
          ))}
        </div>
        <p className="muted small mt">{t('f.forecast.info')}</p>
      </div>
      <div className="card">
        <h3 className="card-title"><Thermometer size={17} /> {t('f.season')}</h3>
        <p className="small">{t('season.' + s.season + '.plan')}</p>
        {days.some((w) => w.spell) && <p className="pc-msg mid mt">{t('f.spell')}</p>}
      </div>
    </div>
  );
}

function MarketPanel({ s, t, doAct }) {
  const [restaurants, setRestaurants] = useState(Math.max(1, s.restaurants));
  const [kg, setKg] = useState(0);
  if (s.phase !== 'sell') {
    return (
      <div className="panel-stack">
        <div className="card">
          <h3 className="card-title"><ShoppingBasket size={17} /> {t('ft.market')}</h3>
          <p className="muted small">{t('f.sell.later')}</p>
          <ul className="price-facts mt"><li><span>{t('f.price')}</span><Money v={F.priceOn(s, Math.max(1, s.day))} /></li></ul>
          {s.booking && <p className={'pc-msg mt ' + (s.booking.accepted ? 'good' : 'mid')}>{s.booking.accepted ? t('f.bookedNote', { kg: fmt(s.booking.kg) }) : s.booking.accepted === false ? t('f.bookingDeclined') : t('f.bookingOffer', { kg: fmt(s.booking.kg) })}</p>}
        </div>
      </div>
    );
  }
  const price = F.priceOn(s, s.day);
  const left = F.left(s);
  const need = s.plots * CROPS.maize.seedKgPerPlot;
  const fresh = Math.max(0, restaurants - s.restaurants);
  const mkKg = kg || left;
  return (
    <div className="panel-stack">
      <div className="card">
        <h3 className="card-title"><Wheat size={17} /> {t('f.harvested', { kg: fmt(s.grainKg) })}</h3>
        <ul className="price-facts">
          <li><span>{t('f.price')}</span><Money v={price} /></li>
          {s.sold.booked > 0 && <li><span>{t('f.soldBooked')}</span><b>{fmt(s.sold.booked)} kg</b></li>}
          <li><span>{t('f.leftToSell')}</span><b>{fmt(left)} kg</b></li>
        </ul>
      </div>
      <div className="card">
        <h3 className="card-title"><Sprout size={17} /> {t('f.reserve')}</h3>
        <p className="muted small">{t('f.reserve.info', { kg: need, have: fmt(s.seedKg) })}</p>
        <div className="mt"><Stepper value={s.reserveKg} onChange={(v) => doAct('reserve', [v])} step={5} min={0} /></div>
      </div>
      <div className="card channel">
        <h3 className="card-title"><Store size={17} /> {t('f.ch.restaurant')}</h3>
        <p className="muted small">{t('f.ch.restaurant.info', { kg: COSTS.restaurantKg, c: fmt(COSTS.restaurantOutreach), n: s.restaurants })}</p>
        <div className="loan-row mt">
          <Stepper value={restaurants} onChange={setRestaurants} min={1} max={20} />
          <button className="btn dark sm" onClick={() => doAct('sellRestaurant', [restaurants])} disabled={left <= 0}>{t('f.sell')}</button>
        </div>
        <p className="small mt">{t('f.ch.cost', { c: fmt(fresh * COSTS.restaurantOutreach) })}</p>
      </div>
      <div className="card channel">
        <h3 className="card-title"><ShoppingBasket size={17} /> {t('f.ch.market')}</h3>
        <p className="muted small">{t('f.ch.market.info', { f: Math.round(COSTS.marketFee * 100), c: fmt(COSTS.marketTransport) })}</p>
        <div className="loan-row mt">
          <Stepper value={mkKg} onChange={setKg} step={50} min={0} max={left} />
          <button className="btn dark sm" onClick={() => { doAct('sellMarket', [mkKg]); setKg(0); }} disabled={left <= 0}>{t('f.sell')}</button>
        </div>
      </div>
      <div className="card">
        <p className="muted small">{t('f.finish.info')}</p>
        <button className="btn red big full mt" onClick={() => doAct('finish')}>{t('f.finish')} <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}

function WalletPanel({ s, t }) {
  const sp = s.spent;
  const rows = [['rent', sp.rent], ['seed', sp.seed], ['planting', sp.planting], ['manure', sp.manure], ['irrigation', sp.irrigation], ['farmHand', sp.farmHand], ['harvest', sp.harvest], ['selling', sp.selling]].filter(([, v]) => v > 0);
  const costs = rows.reduce((a, [, v]) => a + v, 0);
  return (
    <div className="panel-stack">
      <div className="card">
        <div className="panel-cash"><span>{t('farm.wallet')}</span><Money v={s.wallet} className={s.wallet < 0 ? 'neg' : ''} /></div>
        <div className="cost-list">
          <div className="cost-head">{t('f.spent')}</div>
          {rows.map(([k, v]) => <div key={k}><span>{t('f.sp.' + k)}</span><Money v={v} /></div>)}
          <div className="cost-total"><span>{t('biz.total')}</span><Money v={costs} /></div>
          {s.revenue > 0 && <div><span>{t('f.revenue')}</span><Money v={s.revenue} /></div>}
          {s.revenue > 0 && <div className="cost-total"><span>{t('f.profitSoFar')}</span><Money v={s.revenue - costs} className={s.revenue - costs < 0 ? 'neg' : ''} /></div>}
        </div>
      </div>
      <div className="card"><ul className="price-facts"><li><span>{t('farm.seedStore')}</span><b>{fmt(s.seedKg)} kg</b></li><li><span>{t('farm.restaurants')}</span><b>{s.restaurants}</b></li></ul></div>
    </div>
  );
}

function DiaryPanel({ s, t, lang }) {
  if (!s.feed.length) return <div className="card"><p className="empty-line">{t('f.diary.empty')}</p></div>;
  return (
    <div className="card">
      <h3 className="card-title"><NotebookPen size={17} /> {t('ft.diary')}</h3>
      <ul className="diary">
        {s.feed.map((e, i) => (
          <li key={i}><span className="diary-d">{e.day ? fmtDate(s, e.day, lang) : t('f.day0')}</span><span>{t('fd.' + e.k, { kg: e.kg ? fmt(e.kg) : '', c: e.c ? fmt(e.c) : '', n: e.n || '', mm: e.mm || '' })}</span></li>
        ))}
      </ul>
    </div>
  );
}

function HelpPanel({ s, t }) {
  return (
    <div className="panel-stack">
      {['time', 'grow', 'water', 'sell', 'land', 'score'].map((k) => (
        <div className="card" key={k}>
          <h3 className="card-title">{t('fh.' + k)}</h3>
          <p className="small">{t('fh.' + k + '.body', { w: Object.entries(WEIGHTS).map(([a, v]) => `${t('fsk.' + a)} ${v}`).join(', '), pass: stageFor(s.stage).pass })}</p>
        </div>
      ))}
    </div>
  );
}

// ---------- end of season ----------
const inFlight = new Set();
function SeasonResults({ s, meta, save, t, profile, setProfile, nav }) {
  const local = F.finalScore(s);
  const score = meta.serverScore || local;
  const [, setV] = useState(0);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (meta.saved || inFlight.has(meta.runId)) return;
    inFlight.add(meta.runId);
    (async () => {
      try {
        const res = await farmSubmit(profile, meta.runId, meta.log);
        Object.assign(meta, { saved: true, saveError: null, serverScore: res.score, certCode: res.certCode, next: res.profile });
        if (res.progress) setProfile({ ...profile, progress: res.progress });
      } catch (e) {
        console.error(e);
        Object.assign(meta, { saved: e?.code === 'already', saveError: errorText(t, e) });
      }
      inFlight.delete(meta.runId);
      save(); setV((v) => v + 1);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  const angle = Math.round((score.total / 100) * 360);
  const finishSeason = () => { clearRun(profile.uid, RUN_KEY); nav('/app/farm'); };
  return (
    <div className="panel-stack">
      <div className="card res-score">
        <h3 className="card-title">{score.passed ? t('f.res.passed') : t('f.res.failed')}</h3>
        <div className="ring" style={{ background: `conic-gradient(${score.passed ? '#1c1d21' : '#e5252a'} ${angle}deg, #eceef2 0)` }}>
          <div className="ring-in"><b>{score.total}</b><span>/ 100</span></div>
        </div>
        <Stars n={score.stars} />
        {meta.serverScore && !LOCAL && <span className="verified"><ShieldCheck size={15} /> {t('res.server')}</span>}
        <ul className="res-facts">
          <li><span>{t('f.res.harvest')}</span><b>{fmt(score.grainKg)} / {fmt(score.maxKg)} kg</b></li>
          <li><span>{t('res.profit')}</span><Money v={score.profit} className={score.profit < 0 ? 'neg' : ''} /></li>
          <li><span>{t('res.target')}</span><Money v={score.target} /></li>
          <li><span>{t('farm.wallet')}</span><Money v={score.wallet} /></li>
        </ul>
      </div>
      <div className="card">
        <h3 className="card-title">{t('res.competence')}</h3>
        {Object.entries(score.parts).map(([k, v]) => (
          <div key={k} className="part">
            <div className="part-top"><span>{t('fsk.' + k)}</span><b>{v}</b></div>
            <div className="part-bar"><i style={{ width: v + '%' }} className={v < 50 ? 'low' : ''} /></div>
            <p>{t('fsk.' + k + '.line', { s: score.sellShare, kg: fmt(score.seedKg), need: score.need })}</p>
          </div>
        ))}
      </div>
      {!meta.saved && !meta.saveError && <span className="saving"><span className="dots dark"><i /><i /><i /></span> {t('res.saving')}</span>}
      {meta.saveError && <p className="neg">{meta.saveError}</p>}
      {meta.saveError && !meta.saved && <button className="btn line full" onClick={() => { meta.saveError = null; setAttempt((a) => a + 1); }}><RotateCcw size={16} /> {t('res.retry')}</button>}
      {meta.certCode && <Link className="btn red big full" to={'/verify/' + meta.certCode}><Award size={18} /> {t('res.cert')}</Link>}
      {meta.saved && <p className="small">{score.passed ? t('f.res.up', { s: t('fs.' + stageFor(Math.min(6, s.stage + 1)).key) }) : t('f.res.stay')}</p>}
      <button className="btn dark big full" onClick={finishSeason} disabled={!meta.saved}>{t('f.res.next')} <ArrowRight size={18} /></button>
      <Link className="btn line big full" to="/app/leaderboard"><Trophy size={17} /> {t('nav.leaderboard')}</Link>
    </div>
  );
}

