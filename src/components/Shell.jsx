import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Home, Store, Trophy, Award, Crown, LogOut, Plus, Globe, Menu, X, Info as InfoIcon, Sprout } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { signOut, LOCAL } from '../lib/store.js';
import { Logo, Loader, Art } from './ui.jsx';

const GROUPS = [
  [{ to: '/app', icon: Home, k: 'nav.home', end: true }, { to: '/app/farm', icon: Sprout, k: 'nav.farm' }, { to: '/app/journey/entrepreneur', icon: Store, k: 'nav.journey' }],
  [{ to: '/app/leaderboard', icon: Trophy, k: 'nav.leaderboard' }, { to: '/app/certificates', icon: Award, k: 'nav.certificates' }],
  [{ to: '/app/premium', icon: Crown, k: 'nav.premium' }],
];

export default function Shell() {
  const { authUser, profile, loading, t, lang, setLang, serverError } = useApp();
  const [dial, setDial] = useState(false);
  const [sheet, setSheet] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  if (authUser === null) return <Navigate to="/signin" replace />;
  if (loading) return <Loader />;
  // The game has its own split screen with a toolkit sidebar.
  if (loc.pathname.startsWith('/app/play/') || loc.pathname.startsWith('/app/farm/play')) return <Outlet />;

  const out = async () => { await signOut(); nav('/'); };
  const initials = (profile?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="shell">
      <aside className="side">
        <div className="side-head"><Logo size={24} /></div>
        <nav className="side-nav">
          {GROUPS.map((g, i) => (
            <div className="side-box" key={i}>
              {g.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className="side-link">
                  <it.icon size={18} /> <span>{t(it.k)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <span className="avatar">{initials}</span>
          <button className="icon-btn" onClick={out} aria-label={t('nav.signout')} title={t('nav.signout')}><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="main">
        {LOCAL && <div className="local-note">{t('local.note')}</div>}
        {serverError && <div className="server-note">{t('err.server')} {serverError}</div>}
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {[GROUPS[0][0], GROUPS[0][1], GROUPS[0][2], GROUPS[1][0]].map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}><it.icon size={20} /><span>{t(it.k)}</span></NavLink>
        ))}
        <button onClick={() => setSheet(true)}><Menu size={20} /><span>{t('nav.menu')}</span></button>
      </nav>

      {sheet && (
        <div className="sheet-bg" onClick={() => setSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><Logo size={22} /><button className="icon-btn" onClick={() => setSheet(false)}><X size={18} /></button></div>
            {GROUPS.map((g, i) => (
              <div className="side-box" key={i}>
                {g.map((it) => (
                  <NavLink key={it.to} to={it.to} end={it.end} className="side-link" onClick={() => setSheet(false)}>
                    <it.icon size={18} /> <span>{t(it.k)}</span>
                  </NavLink>
                ))}
              </div>
            ))}
            <button className="side-link danger" onClick={out}><LogOut size={18} /> <span>{t('nav.signout')}</span></button>
          </div>
        </div>
      )}

      <div className={'dial' + (dial ? ' open' : '')}>
        {dial && (
          <div className="dial-items">
            <button onClick={() => { setLang(lang === 'en' ? 'fr' : 'en'); }}>
              <span className="dial-label">{lang === 'en' ? 'Français' : 'English'}</span><span className="dial-dot"><Globe size={18} /></span>
            </button>
            <button onClick={() => { setDial(false); nav('/app/premium'); }}>
              <span className="dial-label">{t('nav.premium')}</span><span className="dial-dot"><Crown size={18} /></span>
            </button>
            <button onClick={out}>
              <span className="dial-label">{t('nav.signout')}</span><span className="dial-dot"><LogOut size={18} /></span>
            </button>
          </div>
        )}
        <button className="dial-main" onClick={() => setDial(!dial)} aria-label="quick options">
          <Art name="pinwheel" size={58} className="dial-art" />
          {dial ? <X size={22} /> : <Plus size={24} />}
        </button>
      </div>
    </div>
  );
}

// Coloured top panel used on every app page. The (i) opens its card inside the panel.
export function Hero({ eyebrow, title, line, right, children, info }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="hero">
      <div className="hero-petals" aria-hidden="true">
        <Art name="bloom" size={180} className="hp1" />
        <Art name="daisy" size={120} className="hp2" />
      </div>
      <div className="hero-top">
        <div>
          {eyebrow && <div className="hero-eyebrow">{eyebrow}</div>}
          <h1 className="hero-title">{title}</h1>
          {line && <p className="hero-line">{line}</p>}
        </div>
        <div className="hero-right">
          {right}
          {info && (
            <button type="button" className={'info-btn light' + (open ? ' on' : '')} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="information">
              {open ? <X size={20} /> : <InfoIcon size={20} />}
            </button>
          )}
        </div>
      </div>
      {info && open && (
        <div className="hero-info">
          <h3>{info.title}</h3>
          {info.body}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon: Icon, title }) {
  return (
    <div className="empty">
      <span className="petal-empty"><Art name="bloom" size={70} />{Icon && <Icon size={24} color="#fff" />}</span>
      <p>{title}</p>
    </div>
  );
}

