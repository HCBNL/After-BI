import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { getCertificate } from '../lib/store.js';
import { Logo, Art, Loader, LangMenu } from '../components/ui.jsx';
import { LEVEL_KEYS } from '../lib/journeys.js';
import { stageFor } from '../farm/data.js';

export default function Verify() {
  const { code } = useParams();
  const { t, lang, authUser } = useApp();
  const [cert, setCert] = useState(undefined);

  useEffect(() => { getCertificate(code).then(setCert).catch(() => setCert(null)); }, [code]);
  if (cert === undefined) return <Loader />;

  return (
    <div className="verify">
      <div className="verify-bar no-print">
        <Link to={authUser ? '/app/certificates' : '/'} className="btn line sm"><ArrowLeft size={16} /> {t('verify.back')}</Link>
        <div className="verify-bar-r">
          <LangMenu />
          {cert && <button className="btn dark sm" onClick={() => window.print()}><Printer size={16} /> {t('verify.print')}</button>}
        </div>
      </div>

      {!cert ? (
        <div className="verify-miss"><h1>{t('verify.missing')}</h1><p>{t('verify.missing.line', { c: code })}</p></div>
      ) : (
        <>
          <div className="certificate">
            <div className="cf-art" aria-hidden="true">
              <Art name="bloom" size={120} className="cf1" /><Art name="daisy" size={90} className="cf2" />
              <Art name="pinwheel" size={80} className="cf3" /><Art name="loop" size={90} className="cf4" />
            </div>
            <div className="cf-inner">
              <Logo size={30} />
              <div className="cf-kicker">{t('verify.kicker')}</div>
              <p className="cf-small">{t('verify.presented')}</p>
              <h1 className="cf-name">{cert.name}</h1>
              <p className="cf-small">{t('verify.for')}</p>
              <h2 className="cf-level">{t('j.' + (cert.journey || 'entrepreneur'))} · {cert.journey === 'farmer' ? t('fs.' + stageFor(cert.level).key) : t('lv.' + LEVEL_KEYS[cert.level - 1])}</h2>
              <div className="cf-parts">
                {Object.entries(cert.parts || {}).map(([k, v]) => (
                  <div key={k}><b>{v}</b><span>{cert.journey === 'farmer' ? t('fsk.' + k) : t('skill.' + k)}</span></div>
                ))}
              </div>
              <div className="cf-foot">
                <div><span>{t('verify.score')}</span><b>{cert.score} / 100</b></div>
                <div><span>{t('verify.date')}</span><b>{new Date(cert.issuedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
                <div><span>{t('verify.code')}</span><b>{cert.code}</b></div>
              </div>
            </div>
          </div>
          <p className="verify-ok no-print"><ShieldCheck size={18} /> {t('verify.ok')}</p>
        </>
      )}
    </div>
  );
}
