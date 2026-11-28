import { Link } from 'react-router-dom';
import { Lock, Crown, CalendarDays, Package, Target, Store, Flame, TrendingDown, Swords } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { loadRun } from '../lib/store.js';
import { WORLD_LEVELS as LEVELS, WORLD_CHALLENGES as CHALLENGES, worldConfig as levelConfig } from '../world/levels.js';
import { Money, Petal } from '../components/ui.jsx';
import { Hero } from '../components/Shell.jsx';
import { Stars } from './Home.jsx';

const CH_ICON = { 'festive-rush': Flame, 'start-in-debt': TrendingDown, 'price-war': Swords };

export default function Journey() {
  const { t, profile } = useApp();
  const prog = profile?.progress || {};

  return (
    <div className="page">
      <Hero
        eyebrow={t('j.entrepreneur')}
        title={t('journey.title')}
        line={t('journey.line')}
        info={{ title: t('journey.info.title'), body: <><p>{t('journey.info.body')}</p></> }}
      />

      <section className="block">
        <h2 className="block-title">{t('journey.levels')}</h2>
        <div className="level-grid">
          {LEVELS.map((lv) => {
            const p = prog[lv.id];
            const unlocked = lv.id === 1 || prog[lv.id - 1]?.passed;
            const needsPremium = lv.premium && !profile?.premium;
            const saved = profile && loadRun(profile.uid, 'w' + lv.id);
            const canPlay = unlocked && !needsPremium;
            return (
              <div key={lv.id} className={'level-card' + (canPlay ? '' : ' locked')}>
                <div className="lc-top">
                  <span className="lc-num">{lv.id}</span>
                  <div>
                    <h3>{t('lv.' + lv.key)}</h3>
                    <p>{t('lv.' + lv.key + '.line')}</p>
                  </div>
                  {lv.premium && <span className="tag gold"><Crown size={12} /> {t('premium')}</span>}
                </div>
                <ul className="lc-facts">
                  <li><CalendarDays size={15} /> {t('w.days', { n: lv.days })}</li>
                  <li><Store size={15} /> {t('journey.capital')} <Money v={lv.capital} /></li>
                  <li><Package size={15} /> {lv.products.map((x) => t('p.' + x)).join(', ')}</li>
                  <li><Target size={15} /> {t('journey.target')} <Money v={lv.target} /> · {t('journey.pass', { n: lv.pass })}</li>
                </ul>
                <div className="lc-foot">
                  {p ? <span className="lc-best">{t('journey.best', { n: p.best })} <Stars n={p.stars} /></span> : <span className="lc-best muted">{t('journey.notyet')}</span>}
                  {!unlocked ? (
                    <span className="lc-lock"><Lock size={14} /> {t('journey.locked')}</span>
                  ) : needsPremium ? (
                    <Link className="btn line" to="/app/premium"><Crown size={15} /> {t('journey.unlock')}</Link>
                  ) : (
                    <Link className="btn red" to={'/app/play/' + lv.id}>{saved && saved.sim?.status === 'playing' ? t('journey.continue') : p ? t('journey.replay') : t('journey.start')}</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="block">
        <h2 className="block-title">{t('journey.challenges')}</h2>
        <div className="ch-grid">
          {CHALLENGES.map((c) => {
            const cfg = levelConfig(c.base, c.id);
            const p = prog[c.id];
            return (
              <div key={c.id} className="ch-card">
                <Petal id={c.id} icon={CH_ICON[c.id]} size={48} />
                <div className="ch-text">
                  <h3>{t('ch.' + c.id)}</h3>
                  <p>{t('ch.' + c.id + '.line')}</p>
                  <span className="ch-meta">{t('w.days', { n: cfg.days })} · {t('journey.target')} <Money v={cfg.target} />{p ? ' · ' + t('journey.best', { n: p.best }) : ''}</span>
                </div>
                {profile?.premium
                  ? <Link className="btn line" to={'/app/play/' + c.id}>{t('journey.start')}</Link>
                  : <Link className="btn line" to="/app/premium"><Crown size={15} /></Link>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
