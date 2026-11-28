import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { getLeaderboard, LOCAL } from '../lib/store.js';
import { WORLD_LEVELS as LEVELS, WORLD_CHALLENGES as CHALLENGES } from '../world/levels.js';
import { STAGES } from '../farm/data.js';
import { Dropdown, Money } from '../components/ui.jsx';
import { Hero, Empty } from '../components/Shell.jsx';

export default function Leaderboard() {
  const { t, profile } = useApp();
  const [key, setKey] = useState('farm1');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    setRows(null); setErr(false);
    getLeaderboard(key).then((r) => live && setRows(r)).catch((e) => { console.error(e); if (live) { setErr(true); setRows([]); } });
    return () => { live = false; };
  }, [key]);

  const options = [
    ...STAGES.map((st) => ({ value: 'farm' + st.id, label: t('j.farmer') + ' · ' + t('fs.' + st.key) })),
    ...LEVELS.map((l) => ({ value: String(l.id), label: t('j.entrepreneur') + ' · ' + t('lv.' + l.key) })),
    ...CHALLENGES.map((c) => ({ value: c.id, label: t('ch.' + c.id) })),
  ];

  return (
    <div className="page">
      <Hero eyebrow={t('j.entrepreneur')} title={t('lb.title')} line={t('lb.line')}
        info={{ title: t('lb.title'), body: <><p>{t('lb.info')}</p>{LOCAL && <p>{t('lb.local')}</p>}</> }} />
      <section className="block">
        <div className="filter-row"><Dropdown value={key} onChange={setKey} options={options} /></div>
        <div className="card">
          {rows === null ? (
            <div className="center-pad"><span className="dots dark"><i /><i /><i /></span></div>
          ) : err ? (
            <p className="neg center-pad">{t('lb.error')}</p>
          ) : !rows.length ? (
            <Empty icon={Trophy} title={t('lb.empty')} />
          ) : (
            <ol className="lb">
              {rows.map((r, i) => (
                <li key={r.uid} className={r.uid === profile?.uid ? 'me' : ''}>
                  <span className={'lb-rank r' + (i + 1)}>{i + 1}</span>
                  <span className="lb-name">{r.name}</span>
                  <span className="lb-profit"><Money v={r.profit} /></span>
                  <b className="lb-score">{r.score}</b>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
