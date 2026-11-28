import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, Navigate, useNavigate, useBlocker } from 'react-router-dom';
import {
  Wallet, Boxes, Landmark, Lightbulb, ArrowRight, ArrowLeft, RotateCcw, Award, Trophy, Handshake,
  BadgePercent, LineChart, Droplets, Wheat, SprayCan, Soup, Croissant, Crown, MapPin, Store, Users,
  FileBarChart, BookOpen, LogOut, Menu, X, ShieldCheck, Pause, Play as PlayIcon, FastForward, ZoomIn, ZoomOut,
  Truck, Bike, Megaphone, Gift, Sun, CloudRain, PartyPopper, Fuel, School, AlertTriangle, Swords, DoorClosed, Banknote,
  Navigation, Package,
} from 'lucide-react';
import { useApp, fmt } from '../lib/app.jsx';
import { saveRun, loadRun, clearRun, startRun, submitRun, rememberLocalSeed, errorText, LOCAL } from '../lib/store.js';
import * as S from '../world/sim.js';
import { WorldView } from '../world/render.js';
import { placeById } from '../world/map.js';
import { worldConfig, WORLD_LEVELS, WORLD_CHALLENGES, COSTS, TICKS_PER_DAY } from '../world/levels.js';
import { PRODUCTS, SUPPLIERS, RIVALS, CREDIT_MARKUP, WEIGHTS } from '../game/data.js';
import { Money, Dropdown, Stepper, Modal, Petal, Art, Logo } from '../components/ui.jsx';
import { Hero } from '../components/Shell.jsx';
import { Stars } from './Home.jsx';
import { LEVEL_KEYS } from '../lib/journeys.js';

const P_ICON = { water: Droplets, rice: Wheat, soap: SprayCan, noodles: Soup, bread: Croissant };
const EV_ICON = { calm: Sun, festive: PartyPopper, rain: CloudRain, fuel: Fuel, schools: School, shortage: AlertTriangle, pricewar: Swords, closed: DoorClosed, payday: Banknote };
const SUP_OF_PLACE = { market: 'market', distributor: 'distributor', factory: 'factory' };
const TICK_MS = 250; // one game minute at normal speed: a day lasts 3 minutes
const round10 = (v) => Math.round(v / 10) * 10;

export default function WorldRoute() {
  const { key } = useParams();
  return <World key={key} />;
}

function World() {
  const { key } = useParams();
  const { t, profile, setProfile } = useApp();
  const nav = useNavigate();
  const isLevel = /^[1-4]$/.test(key);
  const challenge = !isLevel ? WORLD_CHALLENGES.find((c) => c.id === key) : null;
  const levelId = isLevel ? Number(key) : challenge?.base;
  const cfg = levelId ? worldConfig(levelId, challenge?.id) : null;

  const simRef = useRef(null);
  const metaRef = useRef(null); // { runId, log, saved, ... }
  const [phase, setPhase] = useState(() => {
    const saved = profile ? loadRun(profile.uid, 'w' + key) : null;
    if (saved && saved.sim?.v === 2) { simRef.current = saved.sim; metaRef.current = saved.meta; return saved.sim.status === 'playing' ? 'play' : 'results'; }
    return 'brief';
  });
  const [, setVer] = useState(0);
  const bump = useCallback(() => setVer((v) => v + 1), []);
  const [tool, setTool] = useState('here');
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [dest, setDest] = useState(null);
  const [toast, setToast] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const [menu, setMenu] = useState(false);
  const [reportDay, setReportDay] = useState(null);

  const save = useCallback(() => {
    if (profile && simRef.current) saveRun(profile.uid, 'w' + key, { sim: simRef.current, meta: metaRef.current });
  }, [profile, key]);

  const s = simRef.current;
  const playing = phase === 'play' && s?.status === 'playing';
  const blocker = useBlocker(({ currentLocation, nextLocation }) => playing && currentLocation.pathname !== nextLocation.pathname);

  // every move is recorded with its day and minute so the server can replay the game
  const doAct = useCallback((type, args = []) => {
    const st = simRef.current;
    if (!st) return { ok: false };
    const d = st.day, k = st.tick;
    const res = S.act(st, type, args);
    if (res.ok) metaRef.current.log.push({ d, k, t: type, a: args });
    if (!res.ok && res.error) setToast({ tone: 'bad', text: t('w.err.' + res.error) });
    bump();
    return res;
  }, [bump, t]);

  const onDayEnd = useCallback((rep) => {
    save();
    setReportDay(rep.day);
    setDest(null);
    if (simRef.current.status !== 'playing') setPhase('final');
    bump();
  }, [bump, save]);

  if (!cfg || !profile) return <Navigate to="/app/journey/entrepreneur" replace />;
  const prog = profile.progress || {};
  const unlocked = !isLevel || levelId === 1 || prog[levelId - 1]?.passed;
  if (!unlocked) return <Navigate to="/app/journey/entrepreneur" replace />;
  if (cfg.premium && !profile.premium) return <Navigate to="/app/premium" replace />;
  const title = challenge ? t('ch.' + challenge.id) : t('lv.' + LEVEL_KEYS[levelId - 1]);

  const start = async () => {
    setStarting(true); setStartErr('');
    try {
      const { runId, seed } = await startRun(key);
      rememberLocalSeed(runId, seed);
      clearRun(profile.uid, 'w' + key);
      simRef.current = S.newWorld(levelId, challenge?.id || null, seed);
      metaRef.current = { runId, log: [] };
      setTool('here'); setReportDay(null); setPhase('play');
      save();
    } catch (e) { console.error(e); setStartErr(errorText(t, e)); }
    setStarting(false);
  };

  const leaveModal = blocker.state === 'blocked' && (
    <Modal>
      <div className="confirm">
        <Petal id="leave" icon={LogOut} size={56} />
        <h3 className="modal-title">{t('game.leave.title')}</h3>
        <p className="muted">{t('game.leave.line')}</p>
        <div className="confirm-actions">
          <button className="btn line" onClick={() => blocker.reset()}>{t('game.leave.stay')}</button>
          <button className="btn red" onClick={() => { save(); blocker.proceed(); }}>{t('game.leave.go')}</button>
        </div>
      </div>
    </Modal>
  );

  if (phase === 'brief' || !s) {
    return (
      <Frame side={<OuterTools />} menu={menu} setMenu={setMenu}>
        <Hero eyebrow={t('j.entrepreneur')} title={title} line={t('w.brief.line')} />
        <Brief cfg={cfg} levelId={levelId} challenge={challenge} onStart={start} starting={starting} err={startErr} />
      </Frame>
    );
  }
  if (phase === 'final') {
    const last = s.history[s.history.length - 1];
    return (
      <Frame side={<OuterTools />} menu={menu} setMenu={setMenu}>
        <Hero eyebrow={title} title={t('w.dayReport', { n: last.day })} line={t('game.finalLine')} />
        <section className="block"><DayReport r={last} />
          <div className="report-actions"><button className="btn red big" onClick={() => setPhase('results')}>{t('rep.seeResults')} <ArrowRight size={18} /></button></div>
        </section>
      </Frame>
    );
  }
  if (phase === 'results') {
    return (
      <Frame side={<OuterTools />} menu={menu} setMenu={setMenu}>
        <Results s={s} meta={metaRef.current} save={save} title={title} levelId={levelId} challenge={challenge} keyId={key} onRestart={start} setProfile={setProfile} profile={profile} nav={nav} />
      </Frame>
    );
  }

  // ---------- playing ----------
  const tools = [
    [{ id: 'here', icon: MapPin }, { id: 'shop', icon: Store }, { id: 'staff', icon: Users }],
    [{ id: 'money', icon: Landmark }, { id: 'reports', icon: FileBarChart }, { id: 'coach', icon: Lightbulb }, { id: 'help', icon: BookOpen }],
  ];
  const pick = (id) => { setTool(id); setMenu(false); };
  const side = (
    <>
      <div className="gt-week">
        <span>{title}</span>
        <b>{t('w.day', { n: s.day, of: s.days })}</b>
        <div className="gt-weekbar"><i style={{ width: ((s.day - 1 + s.tick / TICKS_PER_DAY) / s.days) * 100 + '%' }} /></div>
      </div>
      <nav className="side-nav">
        {tools.map((g, i) => (
          <div className="side-box" key={i}>
            {g.map((it) => (
              <button key={it.id} className={'side-link' + (tool === it.id ? ' active' : '')} onClick={() => pick(it.id)}>
                <it.icon size={18} /> <span>{t('wt.' + it.id)}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <button className="side-link leave" onClick={() => nav('/app/journey/entrepreneur')}><LogOut size={18} /> <span>{t('tool.leave')}</span></button>
    </>
  );
  const night = s.phase === 'night';
  const lastReport = s.history.find((h) => h.day === (reportDay || s.day - 1));
  const props = { s, cfg, t, doAct, bump, setToast, setDest, pick };

  return (
    <Frame side={side} menu={menu} setMenu={setMenu} game
      bottom={[{ id: 'here', icon: MapPin }, { id: 'shop', icon: Store }, { id: 'staff', icon: Users }, { id: 'reports', icon: FileBarChart }].map((it) => (
        <button key={it.id} className={tool === it.id ? 'active' : ''} onClick={() => pick(it.id)}><it.icon size={20} /><span>{t('wt.' + it.id)}</span></button>
      ))}>
      <div className="world">
        <div className="world-stage">
          {night ? (
            <NightView s={s} cfg={cfg} t={t} report={lastReport} onStart={() => { doAct('start'); setReportDay(null); setTool('here'); }} />
          ) : (
            <Canvas s={s} cfg={cfg} t={t} speed={speed} paused={paused} dest={dest} setDest={setDest} doAct={doAct} onDayEnd={onDayEnd} bump={bump} save={save} />
          )}
          {!night && (
            <Hud s={s} t={t} speed={speed} setSpeed={setSpeed} paused={paused} setPaused={setPaused} />
          )}
          {toast && <Toast toast={toast} onDone={() => setToast(null)} />}
        </div>
        <aside className="world-panel">
          {tool === 'here' && <HerePanel {...props} />}
          {tool === 'shop' && <ShopPanel {...props} />}
          {tool === 'staff' && <StaffPanel {...props} />}
          {tool === 'money' && <MoneyPanel {...props} />}
          {tool === 'reports' && <ReportsPanel s={s} t={t} />}
          {tool === 'coach' && <CoachPanel s={s} t={t} />}
          {tool === 'help' && <HelpPanel cfg={cfg} t={t} />}
        </aside>
      </div>
      {leaveModal}
    </Frame>
  );
}

// ---------- layout ----------
function Frame({ side, children, bottom, menu, setMenu, game }) {
  const { t, serverError } = useApp();
  return (
    <div className={'game' + (game ? ' is-world' : '')}>
      <aside className="side game-tools">
        <div className="side-head"><Logo size={26} /></div>
        {side}
      </aside>
      <main className="game-work">
        <div className="game-mobile-head"><Logo size={22} /></div>
        {LOCAL && !game && <div className="local-note">{t('local.note')}</div>}
        {serverError && <div className="server-note">{t('err.server')} {serverError}</div>}
        {children}
      </main>
      {bottom && (
        <nav className="bottom-nav">
          {bottom}
          <button onClick={() => setMenu(true)}><Menu size={20} /><span>{t('nav.menu')}</span></button>
        </nav>
      )}
      {menu && (
        <div className="sheet-bg" onClick={() => setMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><Logo size={22} /><button className="icon-btn" onClick={() => setMenu(false)}><X size={18} /></button></div>
            {side}
          </div>
        </div>
      )}
    </div>
  );
}

function OuterTools() {
  const { t } = useApp();
  return (
    <nav className="side-nav">
      <div className="side-box"><Link className="side-link" to="/app/journey/entrepreneur"><ArrowLeft size={18} /> <span>{t('tool.back')}</span></Link></div>
      <div className="side-box">
        <Link className="side-link" to="/app/leaderboard"><Trophy size={18} /> <span>{t('nav.leaderboard')}</span></Link>
        <Link className="side-link" to="/app/certificates"><Award size={18} /> <span>{t('nav.certificates')}</span></Link>
      </div>
    </nav>
  );
}

// ---------- the living town ----------
function Canvas({ s, cfg, t, speed, paused, dest, setDest, doAct, onDayEnd, bump, save }) {
  const ref = useRef(null);
  const view = useRef(null);
  const live = useRef({ speed, paused, dest });
  live.current = { speed, paused, dest };

  const labels = useMemo(() => ({
    myshop: t('w.place.myshop'), kofi: t('r.kofi'), chidi: t('r.chidi'), amina: t('r.amina'), zola: t('r.zola'),
    market: t('w.place.market'), distributor: t('w.place.distributor'), factory: t('w.place.factory'), bank: t('w.place.bank'),
    kekeStreet: t('w.place.keke'), kekeMarket: t('w.place.keke'), kekeFactory: t('w.place.keke'), school: 'GetSchool',
    boyCall: t('w.boyCall'), free: t('w.free'),
  }), [t]);

  useEffect(() => {
    const v = new WorldView(ref.current, {
      labels,
      onTap: (x, y) => {
        const res = doAct('move', [x, y]);
        if (res.ok) { const p = s.player.path; setDest(p.length ? p[p.length - 1] : null); }
      },
    });
    view.current = v;
    const onResize = () => v.resize();
    window.addEventListener('resize', onResize);
    let raf, last = performance.now(), acc = 0, uiAcc = 0, saveAcc = 0;
    const frame = (now) => {
      const dt = Math.min(250, now - last); last = now;
      const L = live.current;
      if (!L.paused && s.phase === 'day' && s.status === 'playing') {
        acc += dt * L.speed;
        while (acc >= TICK_MS) {
          acc -= TICK_MS;
          const rep = S.step(s);
          if (rep) { acc = 0; onDayEnd(rep); break; }
        }
      }
      uiAcc += dt; saveAcc += dt;
      if (uiAcc > 300) { uiAcc = 0; bump(); }
      if (saveAcc > 5000) { saveAcc = 0; save(); }
      if (L.dest && !s.player.path.length) setDest(null);
      const cfgNow = S.config(s);
      v.draw(s, Math.min(1, acc / TICK_MS), { here: S.here(s), dest: L.dest, t: now, rivals: cfgNow.rivals, moving: !L.paused && s.phase === 'day', speed: L.speed });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); save(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { view.current?.setLabels(labels); }, [labels]);

  return (
    <>
      <canvas ref={ref} className="world-canvas" />
      <div className="zoom">
        <button onClick={() => view.current?.setZoom(view.current.zoom * 1.15)} aria-label="zoom in"><ZoomIn size={18} /></button>
        <button onClick={() => view.current?.setZoom(view.current.zoom / 1.15)} aria-label="zoom out"><ZoomOut size={18} /></button>
      </div>
    </>
  );
}

function Hud({ s, t, speed, setSpeed, paused, setPaused }) {
  const ev = s.market.event;
  const Icon = EV_ICON[ev] || Sun;
  const vars = { p: s.market.eventProduct ? t('p.' + s.market.eventProduct) : '', r: s.market.pricewarRival ? t('r.' + s.market.pricewarRival) : '' };
  return (
    <div className="hud">
      <div className="hud-chip"><b>{t('w.dayShort', { n: s.day })}</b><span>{S.clock(s.tick)}</span></div>
      <div className="hud-chip"><Wallet size={15} /><Money v={s.cash} className={s.cash < 0 ? 'neg' : ''} /></div>
      <div className="hud-chip ev"><Icon size={15} /><span>{t('ev.' + ev, vars)}</span></div>
      <div className="hud-speed">
        <button className={paused ? 'on' : ''} onClick={() => setPaused(!paused)} aria-label="pause">{paused ? <PlayIcon size={16} /> : <Pause size={16} />}</button>
        {[1, 2, 4].map((x) => <button key={x} className={!paused && speed === x ? 'on' : ''} onClick={() => { setSpeed(x); setPaused(false); }}>{x === 4 ? <FastForward size={16} /> : x + 'x'}</button>)}
      </div>
    </div>
  );
}

function Toast({ toast, onDone }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const id = setTimeout(onDone, 2600); return () => clearTimeout(id); }, [toast]);
  return <div className={'toast ' + toast.tone}>{toast.text}</div>;
}

// ---------- night: day report and planning ----------
function NightView({ s, cfg, t, report, onStart }) {
  const ev = s.market.event;
  const Icon = EV_ICON[ev] || Sun;
  const vars = { p: s.market.eventProduct ? t('p.' + s.market.eventProduct) : '', r: s.market.pricewarRival ? t('r.' + s.market.pricewarRival) : '' };
  const arriving = s.deliveries.length === 0 ? null : s.deliveries;
  return (
    <div className="night">
      {report && <DayReport r={report} />}
      <div className="card morning">
        <div className="morning-top">
          <Petal id={'ev' + ev} icon={Icon} size={48} />
          <div><span className="muted small">{t('w.morning', { n: s.day })}</span><h3>{t('ev.' + ev, vars)}</h3><p className="muted">{t('ev.' + ev + '.line', vars)}</p></div>
        </div>
        {!report && <p className="muted">{t('w.firstMorning')}</p>}
        {arriving && <p className="small"><Package size={14} /> {t('w.delivered')}</p>}
        <button className="btn red big" onClick={onStart}>{t('w.startDay', { n: s.day })} <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}

// ---------- right panel: what you can do where you stand ----------
function HerePanel(props) {
  const { s, t, doAct, setDest } = props;
  const at = S.here(s);
  const go = (pid) => {
    const d = placeById[pid].door;
    const r = doAct('move', d);
    if (r.ok) setDest(s.player.path.length ? s.player.path[s.player.path.length - 1] : null);
  };
  const carry = S.carried(s);
  return (
    <div className="panel-stack">
      <div className="where">
        <MapPin size={16} />
        <span>{at ? t('w.place.' + (placeById[at].kind === 'rival' ? 'rival' : placeById[at].kind === 'keke' ? 'keke' : at), { r: t('r.' + at) }) : s.player.keke ? t('w.onKeke') : s.player.path.length ? t('w.walking') : t('w.street')}</span>
      </div>
      {carry > 0 && <div className="carry"><Package size={15} /> {t('w.carrying', { n: carry, c: S.carryCap(s) })}{s.player.pusher ? ' · ' + t('w.withPusher') : ''}</div>}

      {at === 'myshop' && <ShopHere {...props} />}
      {at && SUP_OF_PLACE[at] && <SupplierHere {...props} sid={SUP_OF_PLACE[at]} key={at + s.day} />}
      {at === 'bank' && <BankHere {...props} />}
      {at && placeById[at].kind === 'keke' && <KekeHere {...props} at={at} />}
      {at && placeById[at].kind === 'rival' && <RivalHere {...props} rid={at} />}

      <div className="card">
        <h3 className="card-title"><Navigation size={17} /> {t('w.goTo')}</h3>
        <p className="muted small">{t('w.tapHint')}</p>
        <div className="go-list">
          {['myshop', 'market', 'distributor', 'factory', 'bank', 'kekeStreet'].filter((p) => p !== at).map((p) => (
            <button key={p} onClick={() => go(p)} disabled={!!s.player.keke}>
              <span>{t('w.place.' + (p === 'kekeStreet' ? 'keke' : p))}</span><ArrowRight size={15} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StockList({ s, cfg, t }) {
  return (
    <ul className="price-facts">
      {cfg.products.map((pid) => (
        <li key={pid}><span className="cell-p"><Petal id={pid} icon={P_ICON[pid]} size={24} /> {t('p.' + pid)}</span><b className={s.shop.stock[pid] === 0 ? 'neg' : ''}>{s.shop.stock[pid]}</b></li>
      ))}
      <li><span>{t('w.storage')}</span><b>{S.shopUnits(s)} / {cfg.storage}</b></li>
    </ul>
  );
}

function ShopHere({ s, cfg, t, pick }) {
  return (
    <div className="card">
      <h3 className="card-title"><Store size={17} /> {t('w.place.myshop')}</h3>
      <StockList s={s} cfg={cfg} t={t} />
      <p className="muted small mt">{s.boy ? t('w.boyMinding') : t('w.youMinding')}</p>
      <div className="two-btn mt">
        <button className="btn line" onClick={() => pick('shop')}>{t('wt.shop')}</button>
        <button className="btn line" onClick={() => pick('staff')}>{t('wt.staff')}</button>
      </div>
    </div>
  );
}

function SupplierHere({ s, cfg, t, doAct, sid }) {
  const sup = SUPPLIERS.find((x) => x.id === sid);
  const deliver = sid !== 'market';
  return (
    <div className="card">
      <h3 className="card-title"><Truck size={17} /> {t('sup.' + sid)}</h3>
      <p className="muted small">{deliver ? t('w.deliverNote', { f: fmt(sid === 'factory' ? COSTS.deliverFactory : COSTS.deliverDistributor), m: sup.min }) : t('w.carryNote', { c: COSTS.carry })}</p>
      {!deliver && !s.player.pusher && (
        <button className="btn line full mt" onClick={() => doAct('pusher')}><Truck size={16} /> {t('w.hirePusher', { f: fmt(COSTS.pusher), c: COSTS.pusherCarry })}</button>
      )}
      <div className="buy-list">
        {cfg.products.map((pid) => <BuyRow key={pid} pid={pid} sid={sid} s={s} cfg={cfg} t={t} doAct={doAct} />)}
      </div>
    </div>
  );
}

function BuyRow({ pid, sid, s, cfg, t, doAct }) {
  const P = PRODUCTS[pid];
  const o = s.market.offers[pid][sid];
  const sup = SUPPLIERS.find((x) => x.id === sid);
  const sellers = cfg.rivals.length + 1;
  const guess = Math.max(sup.min, Math.round(s.market.demand[pid] / sellers) - s.shop.stock[pid]);
  const [qty, setQty] = useState(guess > 0 ? guess : sup.min || 10);
  const [offer, setOffer] = useState(round10(o.ask * 0.93));
  const [credit, setCredit] = useState('cash');
  const [msg, setMsg] = useState(null);
  if (o.closed) return <div className="buy-row closed"><b>{t('p.' + pid)}</b><span className="muted">{t('sup.closed')}</span></div>;
  const canCredit = cfg.credit && sup.credit;

  const buyAt = (unit) => {
    const r = doAct('buy', [pid, sid, qty, unit, credit === 'credit']);
    if (r.ok) setMsg({ tone: 'good', text: r.deliver ? t('w.ordered', { q: qty, p: t('p.' + pid) }) : t('buy.done', { q: qty, p: t('p.' + pid), u: fmt(r.unit) }) });
    else if (r.error) setMsg({ tone: 'bad', text: t('w.err.' + r.error, { min: sup.min }) });
  };
  const makeOffer = () => {
    const r = doAct('offer', [pid, sid, qty, offer]);
    if (!r.ok) return;
    if (r.result === 'accept') buyAt(r.price);
    else if (r.result === 'counter') { setMsg({ tone: 'mid', text: t('neg.counter', { s: t('sup.' + sid), u: fmt(r.price) }) }); setOffer(round10((offer + r.price) / 2)); }
    else setMsg({ tone: 'bad', text: t('neg.walk', { s: t('sup.' + sid), u: fmt(r.price) }) });
  };

  return (
    <div className="buy-row">
      <div className="buy-head">
        <Petal id={pid} icon={P_ICON[pid]} size={30} />
        <b>{t('p.' + pid)}</b>
        <span className="muted small">{t('play.ask')} <Money v={o.ask} /></span>
        <span className="patience">{[0, 1, 2].map((i) => <i key={i} className={i < o.patience && !o.walked ? 'on' : ''} />)}</span>
      </div>
      <div className="pc-row">
        <Stepper label={t('play.qty')} value={qty} onChange={setQty} step={sup.min >= 20 ? 10 : 5} min={0} />
        <Stepper label={t('play.offer')} value={offer} onChange={setOffer} step={P.cost > 3000 ? 50 : 10} min={10} />
      </div>
      {canCredit && <Dropdown value={credit} onChange={setCredit} options={[{ value: 'cash', label: t('pay.cash') }, { value: 'credit', label: t('pay.credit', { n: Math.round(CREDIT_MARKUP * 100) }) }]} />}
      {msg && <p className={'pc-msg ' + msg.tone}>{msg.text}</p>}
      <div className="pc-actions">
        <button className="btn dark sm" onClick={makeOffer} disabled={o.walked || qty <= 0}><Handshake size={15} /> {t('play.makeOffer')}</button>
        <button className="btn line sm" onClick={() => buyAt(o.ask)} disabled={qty <= 0}>{t('play.buyAsk')}</button>
      </div>
    </div>
  );
}

function BankHere({ s, cfg, t, doAct }) {
  const [amt, setAmt] = useState(50000);
  if (!cfg.loanLimit) return <div className="card"><h3 className="card-title"><Landmark size={17} /> {t('w.place.bank')}</h3><p className="muted">{t('w.noLoans')}</p></div>;
  return (
    <div className="card">
      <h3 className="card-title"><Landmark size={17} /> {t('w.place.bank')}</h3>
      <p className="muted small">{t('w.loanInfo', { r: (COSTS.loanRate * 100).toFixed(1) })}</p>
      <div className="loan-row mt">
        <Stepper value={amt} onChange={setAmt} step={10000} min={0} max={cfg.loanLimit} />
        <button className="btn line sm" onClick={() => doAct('borrow', [amt])} disabled={s.loan >= cfg.loanLimit}>{t('biz.borrow')}</button>
        <button className="btn line sm" onClick={() => doAct('repay', [amt])} disabled={!s.loan}>{t('biz.repay')}</button>
      </div>
      <ul className="price-facts mt"><li><span>{t('biz.owed')}</span><Money v={s.loan} /></li><li><span>{t('biz.limit')}</span><Money v={cfg.loanLimit} /></li></ul>
    </div>
  );
}

function KekeHere({ s, t, doAct, at, setDest }) {
  const stops = ['kekeStreet', 'kekeMarket', 'kekeFactory'].filter((x) => x !== at);
  return (
    <div className="card">
      <h3 className="card-title"><Bike size={17} /> {t('w.place.keke')}</h3>
      <p className="muted small">{t('w.kekeInfo')}</p>
      <div className="go-list">
        {stops.map((d) => {
          const fare = d === 'kekeFactory' || at === 'kekeFactory' ? COSTS.kekeFactory : COSTS.kekeMarket;
          return (
            <button key={d} onClick={() => { const r = doAct('keke', [d]); if (r.ok) setDest(placeById[d].door); }}>
              <span>{t('w.kekeTo.' + d)}</span><Money v={fare} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RivalHere({ s, cfg, t, rid }) {
  if (!cfg.rivals.includes(rid)) return <div className="card"><p className="muted">{t('w.toLet')}</p></div>;
  return (
    <div className="card">
      <h3 className="card-title"><Store size={17} /> {t('r.' + rid)} <small className="muted">{t('style.' + RIVALS[rid].style)}</small></h3>
      <p className="muted small">{t('w.spy')}</p>
      <ul className="price-facts mt">
        {cfg.products.map((pid) => <li key={pid}><span>{t('p.' + pid)}</span><span className="vs"><Money v={s.market.rivals[rid][pid]} /> <small className="muted">{t('market.you')} {fmt(s.shop.price[pid])}</small></span></li>)}
      </ul>
    </div>
  );
}

// ---------- tools ----------
function ShopPanel({ s, cfg, t, doAct }) {
  return (
    <div className="panel-stack">
      <div className="card">
        <h3 className="card-title"><Store size={17} /> {t('w.pricesTitle')}</h3>
        <p className="muted small">{t('w.pricesHint')}</p>
        <div className="buy-list">
          {cfg.products.map((pid) => {
            const P = PRODUCTS[pid];
            const avg = Math.round(cfg.rivals.reduce((a, r) => a + s.market.rivals[r][pid], 0) / cfg.rivals.length);
            const cost = s.shop.stock[pid] > 0 ? s.shop.avgCost[pid] : s.market.offers[pid].market.ask;
            const margin = s.shop.price[pid] - cost;
            return (
              <div className="buy-row" key={pid}>
                <div className="buy-head"><Petal id={pid} icon={P_ICON[pid]} size={30} /><b>{t('p.' + pid)}</b><span className="muted small">{t('w.inShop', { n: s.shop.stock[pid] })}</span></div>
                <div className="pc-row">
                  <Stepper label={t('play.yourPrice')} value={s.shop.price[pid]} onChange={(v) => doAct('price', [pid, v])} step={P.cost > 3000 ? 50 : 10} min={10} />
                  <div className={'pc-margin' + (margin < 0 ? ' bad' : '')}><span>{t('play.margin')}</span><Money v={margin} /><small>{Math.round((margin / s.shop.price[pid]) * 100)}%</small></div>
                </div>
                <p className="muted small">{t('ov.rivalAvg')} <Money v={avg} /></p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card"><h3 className="card-title"><Boxes size={17} /> {t('w.stockTitle')}</h3><StockList s={s} cfg={cfg} t={t} /></div>
    </div>
  );
}

function StaffPanel({ s, cfg, t, doAct }) {
  const [pid, setPid] = useState(cfg.products[0]);
  return (
    <div className="panel-stack">
      <div className="card">
        <h3 className="card-title"><Megaphone size={17} /> {t('w.boyTitle')}</h3>
        <p className="muted small">{t('w.boyInfo', { f: fmt(COSTS.boyWage) })}</p>
        {s.boy
          ? <button className="btn line full mt" onClick={() => doAct('boy', [false])}>{t('w.boyLetGo')}</button>
          : <button className="btn dark full mt" onClick={() => doAct('boy', [true])}>{t('w.boyHire', { f: fmt(COSTS.boyWage) })}</button>}
        {!s.boy && !S.atShop(s) && <p className="muted small mt">{t('w.boyAtShop')}</p>}
      </div>
      <div className="card">
        <h3 className="card-title"><Gift size={17} /> {t('w.sampleTitle')}</h3>
        <p className="muted small">{t('w.sampleInfo', { f: fmt(COSTS.sampling), n: COSTS.sampleUnits })}</p>
        {s.sampling.left > 0 ? (
          <p className="pc-msg good mt">{t('w.sampling', { p: t('p.' + s.sampling.pid), m: s.sampling.left })}</p>
        ) : (
          <>
            <div className="mt"><Dropdown value={pid} onChange={setPid} options={cfg.products.map((x) => ({ value: x, label: t('p.' + x), hint: t('w.inShop', { n: s.shop.stock[x] }) }))} /></div>
            <button className="btn red full mt" onClick={() => doAct('sample', [pid])} disabled={s.phase !== 'day'}><Gift size={16} /> {t('w.sampleStart')}</button>
          </>
        )}
      </div>
    </div>
  );
}

function MoneyPanel({ s, cfg, t }) {
  const c = S.dayCostsNow(s);
  return (
    <div className="panel-stack">
      <div className="card">
        <div className="panel-cash"><span>{t('play.cash')}</span><Money v={s.cash} className={s.cash < 0 ? 'neg' : ''} /></div>
        <div className="cost-list">
          <div className="cost-head">{t('w.closeCosts')}</div>
          <div><span>{t('biz.rent')}</span><Money v={c.rent} /></div>
          {c.boy > 0 && <div><span>{t('w.boyWage')}</span><Money v={c.boy} /></div>}
          {c.interest > 0 && <div><span>{t('biz.interest')}</span><Money v={c.interest} /></div>}
          {c.bills > 0 && <div><span>{t('biz.bills')}</span><Money v={c.bills} /></div>}
          <div className="cost-total"><span>{t('biz.total')}</span><Money v={c.rent + c.boy + c.interest + c.bills} /></div>
        </div>
      </div>
      <div className="card">
        <h3 className="card-title"><Truck size={17} /> {t('w.coming')}</h3>
        {s.deliveries.length ? <ul className="price-facts">{s.deliveries.map((d, i) => <li key={i}><span>{t('p.' + d.pid)} · {t('w.dayShort', { n: d.day })}</span><b>{d.qty}</b></li>)}</ul> : <p className="empty-line">{t('w.nothingComing')}</p>}
        {s.payables.length > 0 && <ul className="price-facts mt">{s.payables.map((p, i) => <li key={i}><span>{t('p.' + p.pid)} · {t('w.dueDay', { n: p.day })}</span><Money v={p.amount} /></li>)}</ul>}
        {s.loan > 0 && <p className="small mt">{t('biz.owed')} <Money v={s.loan} /></p>}
      </div>
    </div>
  );
}

function Tip({ tip }) {
  const { t } = useApp();
  return <li><Lightbulb size={16} /><span>{t('wtip.' + tip.k, { p: tip.pid ? t('p.' + tip.pid) : '', n: tip.n })}</span></li>;
}

function ReportsPanel({ s, t }) {
  const [day, setDay] = useState(null);
  if (!s.history.length) return <div className="card"><p className="empty-line">{t('w.noReport')}</p></div>;
  const r = s.history.find((h) => h.day === day) || s.history[s.history.length - 1];
  return (
    <div className="panel-stack">
      <Dropdown value={r.day} onChange={setDay} options={[...s.history].reverse().map((h) => ({ value: h.day, label: t('w.dayReport', { n: h.day }) }))} />
      <DayReport r={r} compact />
    </div>
  );
}

function CoachPanel({ s, t }) {
  if (!s.history.length) return <div className="card"><p className="empty-line">{t('w.noReport')}</p></div>;
  return (
    <div className="panel-stack">
      {[...s.history].reverse().map((h) => (
        <div className="card" key={h.day}><h3 className="card-title"><Lightbulb size={17} /> {t('w.dayShort', { n: h.day })}</h3><ul className="tips">{h.tips.map((x, i) => <Tip key={i} tip={x} />)}</ul></div>
      ))}
    </div>
  );
}

function HelpPanel({ cfg, t }) {
  return (
    <div className="panel-stack">
      {['move', 'buy', 'sell', 'boy', 'score'].map((p) => (
        <div className="card" key={p}>
          <h3 className="card-title">{t('wh.' + p)}</h3>
          <p className="small">{t('wh.' + p + '.body', { w: Object.entries(WEIGHTS).map(([k, v]) => `${t('skill.' + k)} ${v}`).join(', '), pass: cfg.pass })}</p>
        </div>
      ))}
    </div>
  );
}

function DayReport({ r, compact }) {
  const { t } = useApp();
  const lines = [
    ['rep.revenue', r.revenue], ['rep.cogs', -r.cogs], r.spoiled ? ['rep.spoiled', -r.spoiled] : null, r.sampleUnits ? ['w.rep.samples', -r.sampleUnits] : null,
    ['rep.rent', -r.rent], r.boy ? ['w.boyWage', -r.boy] : null, r.keke ? ['w.rep.keke', -r.keke] : null, r.pusher ? ['w.rep.pusher', -r.pusher] : null,
    r.delivery ? ['w.rep.delivery', -r.delivery] : null, r.sampling ? ['w.rep.sampling', -r.sampling] : null,
    r.interest ? ['rep.interest', -r.interest] : null, r.fee ? ['rep.fee', -r.fee] : null,
  ].filter(Boolean);
  return (
    <div className={'card report' + (compact ? ' compact' : '')}>
      <div className="report-head">
        <h3 className="card-title nomb">{t('w.dayReport', { n: r.day })}</h3>
        <span className={'tag ' + (r.profit >= 0 ? 'live' : 'redtag')}>{r.profit >= 0 ? t('rep.profitWeek') : t('rep.lossWeek')}</span>
      </div>
      <div className="report-grid">
        <div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>{t('rep.product')}</th><th>{t('rep.sold')}</th><th>{t('w.rep.empty')}</th><th>{t('w.rep.closed')}</th><th>{t('rep.share')}</th></tr></thead>
              <tbody>
                {Object.entries(r.products).map(([pid, x]) => (
                  <tr key={pid}><td>{t('p.' + pid)}</td><td>{x.sold}</td><td className={x.lostStock ? 'neg' : ''}>{x.lostStock}</td><td className={x.lostClosed ? 'neg' : ''}>{x.lostClosed}</td><td>{Math.round(x.share * 100)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="tips report-tips">{r.tips.map((x, i) => <Tip key={i} tip={x} />)}</ul>
        </div>
        <div className="pl">
          <div className="pl-head">{t('rep.pl')}</div>
          {lines.map(([k, v]) => <div key={k} className="pl-row"><span>{t(k)}</span><Money v={v} className={v < 0 ? 'neg' : ''} /></div>)}
          <div className="pl-row total"><span>{t('w.rep.profit')}</span><Money v={r.profit} className={r.profit < 0 ? 'neg' : ''} /></div>
          <div className="pl-row total"><span>{t('w.rep.cashEnd')}</span><Money v={r.cashEnd} className={r.cashEnd < 0 ? 'neg' : ''} /></div>
        </div>
      </div>
    </div>
  );
}

// ---------- brief ----------
function Brief({ cfg, levelId, challenge, onStart, starting, err }) {
  const { t } = useApp();
  return (
    <section className="block">
      <div className="brief">
        <div className="card brief-card">
          <h2 className="card-title">{t('brief.goal')}</h2>
          <ul className="brief-facts">
            <li><span>{t('w.brief.days')}</span><b>{cfg.days}</b></li>
            <li><span>{t('brief.capital')}</span><Money v={cfg.capital} /></li>
            {cfg.startLoan ? <li><span>{t('brief.startLoan')}</span><Money v={cfg.startLoan} /></li> : null}
            <li><span>{t('brief.target')}</span><Money v={cfg.target} /></li>
            <li><span>{t('brief.pass')}</span><b>{cfg.pass} / 100</b></li>
            <li><span>{t('w.brief.rent')}</span><Money v={cfg.rent} /></li>
            <li><span>{t('brief.storage')}</span><b>{cfg.storage}</b></li>
          </ul>
        </div>
        <div className="card brief-card">
          <h2 className="card-title">{t('brief.learn')}</h2>
          <ol className="brief-lessons">{[1, 2, 3].map((i) => <li key={i}><span>{i}</span>{t(`wb.${levelId}.${i}`)}</li>)}</ol>
          <p className="brief-note">{challenge ? t('brief.challenge') : t('w.brief.score')}</p>
          {err && <p className="pc-msg bad">{err}</p>}
          <div className="brief-actions">
            <button className="btn red big" onClick={onStart} disabled={starting}>
              {starting ? <span className="dots"><i /><i /><i /></span> : <>{t('w.enterTown')} <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- results ----------
const inFlight = new Set();
const PART_ICON = { profit: LineChart, cash: Wallet, inventory: Boxes, negotiation: Handshake, pricing: BadgePercent };

function Results({ s, meta, save, title, levelId, challenge, keyId, onRestart, setProfile, profile, nav }) {
  const { t } = useApp();
  const local = useMemo(() => S.finalScore(s), [s]);
  const score = meta.serverScore || local;
  const [, setV] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const busy = !meta.saved && !meta.saveError;

  useEffect(() => {
    if (meta.saved || inFlight.has(meta.runId)) return;
    inFlight.add(meta.runId);
    (async () => {
      try {
        const res = await submitRun(profile, keyId, meta.runId, meta.log);
        Object.assign(meta, { saved: true, saveError: null, certCode: res.certCode, serverScore: res.score });
        setProfile({ ...profile, progress: res.progress });
      } catch (e) {
        console.error(e);
        Object.assign(meta, { saved: e?.code === 'already', saveError: errorText(t, e) });
      }
      inFlight.delete(meta.runId);
      save(); setV((v) => v + 1);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const next = !challenge && levelId < 4 && score.passed ? WORLD_LEVELS[levelId] : null;
  const angle = Math.round((score.total / 100) * 360);
  const bankrupt = s.status === 'bankrupt';
  return (
    <>
      <Hero eyebrow={title} title={bankrupt ? t('res.bankrupt') : score.passed ? t('res.passed') : t('res.failed')}
        line={bankrupt ? t('res.bankrupt.line') : score.passed ? t('res.passed.line') : t('res.failed.line', { n: score.pass })} />
      <section className="block">
        <div className="res-grid">
          <div className="card res-score">
            <div className="ring" style={{ background: `conic-gradient(${score.passed ? '#1c1d21' : '#e5252a'} ${angle}deg, #eceef2 0)` }}>
              <div className="ring-in"><b>{score.total}</b><span>/ 100</span></div>
            </div>
            <Stars n={score.stars} />
            {meta.serverScore && !LOCAL && <span className="verified"><ShieldCheck size={15} /> {t('res.server')}</span>}
            <ul className="res-facts">
              <li><span>{t('res.profit')}</span><Money v={score.profit} className={score.profit < 0 ? 'neg' : ''} /></li>
              <li><span>{t('res.target')}</span><Money v={score.target} /></li>
              <li><span>{t('res.worth')}</span><Money v={score.netWorth} /></li>
              <li><span>{t('res.pass')}</span><b>{score.pass}</b></li>
            </ul>
          </div>
          <div className="card res-parts">
            <h3 className="card-title">{t('res.competence')}</h3>
            {Object.entries(score.parts).map(([k, v]) => {
              const Icon = PART_ICON[k];
              return (
                <div key={k} className="part">
                  <div className="part-top"><Icon size={16} /><span>{t('skill.' + k)}</span><b>{v}</b></div>
                  <div className="part-bar"><i style={{ width: v + '%' }} className={v < 50 ? 'low' : ''} /></div>
                  <p>{t(k === 'inventory' ? 'w.part.inventory' : 'res.part.' + k, { m: Math.round(score.margin * 100), f: Math.round(score.fill * 100), c: Math.round(Math.max(0, score.captured) * 100), s: Math.round(score.shareIdx * 100) })}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="res-actions">
          {busy && <span className="saving"><span className="dots dark"><i /><i /><i /></span> {t('res.saving')}</span>}
          {meta.saveError && <span className="neg">{meta.saveError}</span>}
          {meta.saveError && !meta.saved && <button className="btn line big" onClick={() => { meta.saveError = null; setAttempt((a) => a + 1); }}>{t('res.retry')}</button>}
          {meta.certCode && <Link className="btn red big" to={'/verify/' + meta.certCode}><Award size={18} /> {t('res.cert')}</Link>}
          {next && (next.premium && !profile.premium
            ? <Link className="btn dark big" to="/app/premium"><Crown size={18} /> {t('res.unlockNext')}</Link>
            : <button className="btn dark big" onClick={() => nav('/app/play/' + next.id)}>{t('res.next', { l: t('lv.' + next.key) })} <ArrowRight size={18} /></button>)}
          <button className="btn line big" onClick={onRestart}><RotateCcw size={17} /> {t('res.again')}</button>
          <Link className="btn line big" to="/app/leaderboard"><Trophy size={17} /> {t('nav.leaderboard')}</Link>
        </div>
      </section>
      <div className="res-art" aria-hidden="true"><Art name="spark" size={60} /><Art name="daisy" size={48} /><Art name="bloom" size={54} /></div>
    </>
  );
}
