import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Coins, Handshake, Tag, Award, Wallet, Boxes, BadgePercent, LineChart, ShieldCheck } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { Logo, Petal, Art, LangMenu } from '../components/ui.jsx';
import { JOURNEYS, LEVEL_KEYS } from '../lib/journeys.js';

export default function Landing() {
  const { t, authUser } = useApp();
  const [menu, setMenu] = useState(false);
  const signedIn = !!authUser;

  const steps = [
    { id: 'capital', icon: Coins, art: 'blocks' },
    { id: 'buy', icon: Handshake, art: 'kite' },
    { id: 'sell', icon: Tag, art: 'ribbon' },
    { id: 'cert', icon: Award, art: 'spark' },
  ];
  const skills = [
    { id: 'profit', icon: LineChart }, { id: 'cash', icon: Wallet }, { id: 'inventory', icon: Boxes },
    { id: 'negotiation', icon: Handshake }, { id: 'pricing', icon: BadgePercent },
  ];

  return (
    <div className="site">
      <header className="site-head">
        <Link to="/" className="site-brand"><Logo size={26} /></Link>
        <nav className="site-links">
          <a href="#journeys">{t('site.nav.journeys')}</a>
          <a href="#how">{t('site.nav.how')}</a>
          <a href="#levels">{t('site.nav.levels')}</a>
          <a href="#certificate">{t('site.nav.certificate')}</a>
        </nav>
        <div className="site-actions">
          <LangMenu />
          {signedIn ? (
            <Link className="btn dark" to="/app">{t('site.open')}</Link>
          ) : (
            <>
              <Link className="btn dark" to="/signup">{t('site.create')}</Link>
              <Link className="btn line" to="/signin">{t('site.signin')}</Link>
            </>
          )}
        </div>
        <button className="burger" onClick={() => setMenu(true)} aria-label="menu"><Menu size={26} strokeWidth={2.6} /></button>
      </header>

      {menu && (
        <div className="site-sheet">
          <div className="site-sheet-head"><Logo size={24} /><button className="icon-btn" onClick={() => setMenu(false)}><X size={22} /></button></div>
          {['journeys', 'how', 'levels', 'certificate'].map((k) => (
            <a key={k} href={'#' + k} onClick={() => setMenu(false)}>{t('site.nav.' + k)}</a>
          ))}
          <div className="site-sheet-actions">
            <LangMenu />
            <Link className="btn dark" to={signedIn ? '/app' : '/signup'}>{signedIn ? t('site.open') : t('site.create')}</Link>
            {!signedIn && <Link className="btn line" to="/signin">{t('site.signin')}</Link>}
          </div>
        </div>
      )}

      <section className="s-hero">
        <div className="s-hero-copy">
          <div className="eyebrow">{t('site.hero.eyebrow')}</div>
          <h1 className="display">{t('site.hero.title1')} <span className="flower"><Art name="daisy" size={64} /></span> {t('site.hero.title2')}</h1>
        </div>
        <div className="s-hero-side">
          <p className="lead">{t('site.hero.line')}</p>
          <Link className="btn red big" to={signedIn ? '/app' : '/signup'}>{t('site.hero.cta')}</Link>
        </div>
        <div className="s-hero-art" aria-hidden="true">
          <Art name="bloom" size={110} className="float a1" />
          <Art name="kite" size={80} className="float a2" />
          <Art name="loop" size={90} className="float a3" />
          <Art name="orbit" size={96} className="float a4" />
          <Art name="waves" size={84} className="float a5" />
        </div>
      </section>

      <section className="s-sec" id="journeys">
        <div className="s-head">
          <h2 className="h2">{t('site.journeys.title')}</h2>
          <p>{t('site.journeys.line')}</p>
        </div>
        <div className="j-grid">
          {JOURNEYS.map((j) => (
            <div key={j.id} className={'j-card' + (j.open ? ' open' : '')}>
              <Petal id={j.id} icon={j.icon} size={54} />
              <h3>{t('j.' + j.id)}</h3>
              <p>{t('j.' + j.id + '.line')}</p>
              <span className={'tag' + (j.open ? ' live' : '')}>{j.open ? t('j.open') : t('j.soon')}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="s-sec mist" id="how">
        <div className="s-head">
          <h2 className="h2">{t('site.how.title')}</h2>
          <p>{t('site.how.line')}</p>
        </div>
        <div className="how-grid">
          {steps.map((s, i) => (
            <div key={s.id} className="how-card">
              <div className="how-art"><Art name={s.art} size={70} /></div>
              <span className="how-n">{i + 1}</span>
              <h3>{t('site.how.' + s.id)}</h3>
              <p>{t('site.how.' + s.id + '.line')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="s-sec" id="levels">
        <div className="s-head">
          <h2 className="h2">{t('site.levels.title')}</h2>
          <p>{t('site.levels.line')}</p>
        </div>
        <div className="ladder">
          {LEVEL_KEYS.map((k, i) => (
            <div key={k} className="ladder-step">
              <span className={'ladder-dot' + (i === 0 ? ' on' : '')}>{i + 1}</span>
              <h3>{t('lv.' + k)}</h3>
              <p>{t('lv.' + k + '.line')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="s-band" id="certificate">
        <div className="band-curve" />
        <div className="s-head light">
          <h2 className="h2">{t('site.cert.title')}</h2>
          <p>{t('site.cert.line')}</p>
        </div>
        <div className="skill-grid">
          {skills.map((s, i) => (
            <div key={s.id} className={'skill-card c' + i}>
              <s.icon size={26} />
              <h3>{t('skill.' + s.id)}</h3>
              <p>{t('skill.' + s.id + '.line')}</p>
            </div>
          ))}
          <div className="skill-card c5">
            <ShieldCheck size={26} />
            <h3>{t('site.cert.verify')}</h3>
            <p>{t('site.cert.verify.line')}</p>
          </div>
        </div>
      </section>

      <section className="s-final">
        <Art name="spark" size={70} className="final-art" />
        <h2 className="h2">{t('site.final.title')}</h2>
        <p>{t('site.final.line')}</p>
        <Link className="btn red big" to={signedIn ? '/app' : '/signup'}>{t('site.hero.cta')}</Link>
      </section>

      <footer className="site-foot">
        <div className="foot-brand">
          <Logo size={24} />
          <p>{t('site.foot.line')}</p>
        </div>
        <div className="foot-col">
          <h4>{t('site.foot.learn')}</h4>
          <a href="#journeys">{t('site.nav.journeys')}</a>
          <a href="#levels">{t('site.nav.levels')}</a>
          <a href="#certificate">{t('site.nav.certificate')}</a>
        </div>
        <div className="foot-col">
          <h4>{t('site.foot.account')}</h4>
          <Link to="/signup">{t('site.create')}</Link>
          <Link to="/signin">{t('site.signin')}</Link>
        </div>
        <div className="foot-copy">© {new Date().getFullYear()} GetSchool</div>
      </footer>
    </div>
  );
}
