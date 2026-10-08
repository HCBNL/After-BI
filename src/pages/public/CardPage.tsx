/**
 * `/card#…`: an AfterBI staff member's digital business card.
 *
 * Public, light and self-contained: no Firebase, no shell. The details come
 * from the link itself (see `src/lib/businessCard.ts`).
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download, Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Mark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/Seo';
import { readCardHash, vcard, whatsappNumber } from '@/lib/businessCard';
import { COMPANY } from '@/lib/company';

export default function CardPage() {
  const card = useMemo(() => readCardHash(window.location.hash), []);

  const saveContact = () => {
    if (!card) return;
    const blob = new Blob([vcard(card)], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.name.replace(/[^a-z0-9]+/gi, '_')}.vcf`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const wa = card ? whatsappNumber(card.phone) : null;
  const initials = card ? card.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() : '';
  const row = 'flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold text-[#111420] ring-1 ring-inset ring-black/10 transition-colors hover:bg-black/[0.03]';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0f1f36] px-4 py-10">
      <Seo title={card ? card.name : 'Contact card'} description="AfterBI staff contact card." path="/card" noindex />
      {!card ? (
        <div className="max-w-sm text-center text-white">
          <Mark className="mx-auto h-12 w-12" />
          <p className="mt-4 text-[16px] text-white/70">This card link is incomplete. Ask for it to be sent again.</p>
          <Link to="/" className="mt-6 inline-block font-bold text-white underline">
            Visit afterbi.com
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_40px_100px_-40px_rgba(238,106,0,0.5)]">
          <div className="relative bg-[#0f1f36] px-6 pb-14 pt-6 text-white">
            <div className="flex items-center gap-2">
              <Mark className="h-8 w-8" />
              <span className="font-display text-[1.2rem] font-extrabold tracking-[-0.04em]">AfterBI</span>
            </div>
            <p className="mt-1 text-[12px] text-white/55">The sales and distribution platform</p>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-[#ee6a00]" />
          </div>
          <div className="-mt-10 px-6 pb-6">
            <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#ee6a00] font-display text-[1.8rem] font-extrabold text-white ring-4 ring-white">
              {initials}
            </span>
            <h1 className="mt-4 font-display text-[1.6rem] font-extrabold leading-tight tracking-[-0.03em] text-[#111420]">{card.name}</h1>
            {card.position && <p className="mt-1 text-[15px] font-bold text-[#ee6a00]">{card.position}</p>}
            {card.location && (
              <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-[#686e7e]">
                <MapPin size={14} aria-hidden /> {card.location}
              </p>
            )}
            {card.staffNo && <p className="mt-1 text-[12px] text-[#686e7e]">Staff no. {card.staffNo} · {COMPANY.name}</p>}

            <div className="mt-5 grid gap-2">
              {card.phone && (
                <a href={`tel:${card.phone.replace(/\s/g, '')}`} className={row}>
                  <Phone size={18} className="text-[#ee6a00]" aria-hidden /> {card.phone}
                </a>
              )}
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={row}>
                  <MessageCircle size={18} className="text-[#25D366]" aria-hidden />
                  WhatsApp
                </a>
              )}
              {card.email && (
                <a href={`mailto:${card.email}`} className={row}>
                  <Mail size={18} className="text-[#ee6a00]" aria-hidden /> <span className="truncate">{card.email}</span>
                </a>
              )}
              <a href="https://afterbi.com" className={row}>
                <Globe size={18} className="text-[#ee6a00]" aria-hidden /> afterbi.com
              </a>
            </div>

            <button
              type="button"
              onClick={saveContact}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ee6a00] text-[15px] font-bold text-white hover:bg-[#c95600]"
            >
              <Download size={17} aria-hidden /> Save contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
