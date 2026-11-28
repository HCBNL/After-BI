import { Link } from 'react-router-dom';
import { Star, Lock } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { Petal } from '../components/ui.jsx';
import { Hero } from '../components/Shell.jsx';
import { JOURNEYS, LEVEL_KEYS } from '../lib/journeys.js';

export function Stars({ n = 0 }) {
  return <span className="stars">{[1, 2, 3].map((i) => <Star key={i} size={14} className={i <= n ? 'on' : ''} />)}</span>;
}

export default function Home() {
  const { t, profile } = useApp();
  const prog = profile?.progress || {};
  const passedCount = [1, 2, 3, 4].filter((i) => prog[i]?.passed).length;
  const current = Math.min(4, passedCount + 1);
  const first = (profile?.name || '').split(' ')[0];

  return (
    <div className="page">
      <Hero
        eyebrow={t('home.eyebrow')}
        title={t('home.hello', { name: first })}
        line={t('home.line')}
        info={{ title: t('home.info.title'), body: <><p>{t('home.info.body')}</p></> }}
      />

      <section className="block">
        <h2 className="block-title">{t('home.choose')}</h2>
        <div className="journey-grid">
          {JOURNEYS.map((j) => {
            const inner = (
              <>
                <Petal id={j.id} icon={j.icon} size={50} />
                <div className="jc-text">
                  <h3>{t('j.' + j.id)}</h3>
                  <p>{t('j.' + j.id + '.line')}</p>
                </div>
                <span className={'tag' + (j.open ? ' live' : '')}>{j.open ? t('j.play') : t('j.soon')}</span>
              </>
            );
            return j.open
              ? <Link key={j.id} to={j.to} className="jcard">{inner}</Link>
              : <div key={j.id} className="jcard off">{inner}</div>;
          })}
        </div>
      </section>

      <section className="block">
        <h2 className="block-title">{t('home.progress')}</h2>
        <div className="card progress-card">
          <div className="prog-line">
            {LEVEL_KEYS.map((k, i) => {
              const id = i + 1;
              const p = prog[id];
              const state = p?.passed ? 'done' : id === current ? 'now' : 'next';
              return (
                <div key={k} className={'prog-step ' + state}>
                  <span className="prog-dot">{id}</span>
                  <span className="prog-name">{t('lv.' + k)}</span>
                  {p?.passed ? <Stars n={p.stars} /> : id > current ? <Lock size={13} className="prog-lock" /> : <span className="prog-sub">{t('home.next')}</span>}
                </div>
              );
            })}
          </div>
          <div className="prog-foot">
            <p>{t('home.progress.line', { n: passedCount })}</p>
            <Link className="btn red" to="/app/journey/entrepreneur">{passedCount === 4 ? t('home.replay') : t('home.continue')}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
