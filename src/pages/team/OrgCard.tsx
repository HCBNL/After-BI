/**
 * Team → Business card: a link to a contact card (`/card#…`) under the
 * organisation's name and logo, carrying the details in the link itself, so
 * nothing is stored. Share it, send it on WhatsApp, or let someone scan it.
 */

import { useEffect, useMemo, useState } from 'react';
import { Building2, Copy, ExternalLink, MapPin, MessageCircle, Phone, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, Card, useToast } from '@/components/ui';
import { Hint } from '@/components/ui/Hint';
import { cardLink } from '@/lib/businessCard';
import { PORTAL_ROOT } from '@/lib/tiles';
import { useOrgStaffDetails } from './OrgIdCard';

export default function OrgCard() {
  const toast = useToast();
  const { user, details, card, orgName, settings } = useOrgStaffDetails();
  const [qr, setQr] = useState('');

  const link = useMemo(() => cardLink(card), [JSON.stringify(card)]); // eslint-disable-line react-hooks/exhaustive-deps
  const qrLink = useMemo(() => cardLink({ ...card, logo: '' }), [JSON.stringify(card)]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = !details.position.trim() || !details.phone.trim();

  useEffect(() => {
    let live = true;
    void import('qrcode')
      .then((m) => m.default.toDataURL(qrLink, { margin: 1, width: 360, errorCorrectionLevel: 'M' }))
      .then((url) => live && setQr(url))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [qrLink]);

  const message = `Hello, I am ${details.fullName}${details.position ? `, ${details.position}` : ''} at ${orgName}. Here is my contact card: ${link}`;

  const copy = () =>
    void navigator.clipboard
      ?.writeText(link)
      .then(() => toast.success('Link copied', 'Paste it into any chat or email.'))
      .catch(() => toast.error('Could not copy', 'Press and hold the link to copy it.'));

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${details.fullName}, ${orgName}`, text: message, url: link }).catch(() => undefined);
    } else copy();
  };

  const initials = details.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <>
      <PageHeader
        title="My business card"
        actions={
          <Hint label="About your business card">
            A contact card anyone can open on their phone, under {orgName}&rsquo;s name and logo, with buttons to call you, WhatsApp you or save your
            number. The details travel in the link, so nothing is stored.
          </Hint>
        }
      />
      {missing && user && (
        <Alert tone="warning" className="mb-4">
          Add your position and phone on{' '}
          <Link to={`${PORTAL_ROOT[user.role]}/id-card`} className="font-bold underline">
            My ID card
          </Link>{' '}
          first, so your card is complete.
        </Alert>
      )}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-40px_rgba(238,106,0,0.5)] ring-1 ring-black/5">
          <div className="relative bg-[#0f1f36] px-6 pb-12 pt-5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
                {settings?.logoUrl ? <img src={settings.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : <Building2 size={18} className="text-[#0f1f36]" />}
              </span>
              <span className="truncate font-display text-[1.05rem] font-extrabold tracking-[-0.02em]">{orgName}</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-[#ee6a00]" />
          </div>
          <div className="-mt-9 px-6 pb-6">
            <span className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-[#ee6a00] font-display text-[1.6rem] font-extrabold text-white ring-4 ring-white">
              {initials}
            </span>
            <p className="mt-3 font-display text-[1.4rem] font-extrabold leading-tight text-[#111420]">{details.fullName}</p>
            <p className="text-[14px] font-bold text-[#ee6a00]">{details.position || 'Your position'}</p>
            {details.location && (
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[#686e7e]">
                <MapPin size={13} aria-hidden /> {details.location}
              </p>
            )}
            {details.phone && (
              <p className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-[#111420]">
                <Phone size={15} className="text-[#ee6a00]" aria-hidden /> {details.phone}
              </p>
            )}
          </div>
        </div>

        <Card className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            {qr ? <img src={qr} alt="QR code to your business card" className="h-44 w-44" /> : <div className="h-44 w-44 rounded bg-[var(--surface-sunken)]" />}
            <p className="text-[12.5px] text-muted">Let them scan this with their phone camera.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button icon={<Share2 size={16} />} onClick={() => void share()}>
              Share
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="tap inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[14.5px] font-bold text-white hover:brightness-95"
            >
              <MessageCircle size={17} aria-hidden /> Send on WhatsApp
            </a>
            <Button variant="outline" icon={<Copy size={16} />} onClick={copy}>
              Copy link
            </Button>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="tap inline-flex items-center justify-center gap-2 rounded-xl border border-hairline px-4 text-[14.5px] font-bold text-primary hover:bg-[var(--surface-sunken)]"
            >
              <ExternalLink size={16} aria-hidden /> Open my card
            </a>
          </div>
        </Card>
      </div>
    </>
  );
}
