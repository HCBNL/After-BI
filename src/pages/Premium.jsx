import { Check, Crown, MessageCircle, Mail } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { PLANS } from '../config/plans.js';
import { Hero } from '../components/Shell.jsx';

export default function Premium() {
  const { t, profile } = useApp();
  const free = ['prem.free.1', 'prem.free.2', 'prem.free.3', 'prem.free.4'];
  const paid = ['prem.paid.1', 'prem.paid.2', 'prem.paid.3', 'prem.paid.4'];
  const msg = encodeURIComponent(t('prem.wa', { e: profile?.email || '' }));

  return (
    <div className="page">
      <Hero eyebrow={t('nav.premium')} title={t('prem.title')} line={t('prem.line')}
        info={{ title: t('prem.title'), body: <><p>{t('prem.info')}</p></> }} />
      <section className="block">
        <div className="plan-grid">
          <div className="card plan">
            <h3>{t('prem.free')}</h3>
            <div className="plan-price">{t('prem.freePrice')}</div>
            <ul>{free.map((k) => <li key={k}><Check size={16} /> {t(k)}</li>)}</ul>
            {!profile?.premium && <span className="tag live">{t('prem.current')}</span>}
          </div>
          <div className="card plan dark">
            <h3><Crown size={18} /> {t('premium')}</h3>
            <div className="plan-price">{PLANS.premiumPriceLabel || t('prem.ask')}</div>
            <ul>{paid.map((k) => <li key={k}><Check size={16} /> {t(k)}</li>)}</ul>
            {profile?.premium ? (
              <span className="tag gold">{t('prem.active')}</span>
            ) : (
              <div className="plan-actions">
                <a className="btn red" href={`https://wa.me/${PLANS.upgradeWhatsApp}?text=${msg}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> {t('prem.whatsapp')}</a>
                <a className="btn light" href={`mailto:${PLANS.upgradeEmail}?subject=Premium&body=${msg}`}><Mail size={16} /> {t('prem.email')}</a>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
