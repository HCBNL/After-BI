import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { getCertificates } from '../lib/store.js';
import { Petal } from '../components/ui.jsx';
import { Hero, Empty } from '../components/Shell.jsx';
import { Stars } from './Home.jsx';
import { LEVEL_KEYS } from '../lib/journeys.js';
import { stageFor } from '../farm/data.js';

export default function Certificates() {
  const { t, profile, lang } = useApp();
  const [list, setList] = useState(null);

  useEffect(() => {
    if (!profile) return;
    getCertificates(profile.uid).then(setList).catch((e) => { console.error(e); setList([]); });
  }, [profile]);

  return (
    <div className="page">
      <Hero eyebrow={t('j.entrepreneur')} title={t('cert.title')} line={t('cert.line')}
        info={{ title: t('cert.title'), body: <><p>{t('cert.info')}</p></> }} />
      <section className="block">
        {list === null ? (
          <div className="center-pad"><span className="dots dark"><i /><i /><i /></span></div>
        ) : !list.length ? (
          <div className="card"><Empty icon={Award} title={t('cert.empty')} /></div>
        ) : (
          <div className="cert-grid">
            {list.map((c) => (
              <Link key={c.code} to={'/verify/' + c.code} className="card cert-card">
                <Petal id={'cert' + c.level} icon={Award} size={50} />
                <div>
                  <h3>{t('j.' + (c.journey || 'entrepreneur'))} · {c.journey === 'farmer' ? t('fs.' + stageFor(c.level).key) : t('lv.' + LEVEL_KEYS[c.level - 1])}</h3>
                  <p>{t('cert.score', { n: c.score })} · {new Date(c.issuedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}</p>
                  <Stars n={c.stars} />
                </div>
                <span className="cert-code">{c.code}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
