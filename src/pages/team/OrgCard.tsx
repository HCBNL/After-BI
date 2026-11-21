/**
 * Team → Business card: a contact card under the organisation's name, to
 * share as a link or print.
 *
 * The details live in the link (`/card#…`), so nothing about the card is
 * stored: share it, send it on WhatsApp, or let someone scan the code.
 *
 * WHY THE CARD IS LANDSCAPE
 *
 * It is a business card, and it is printable. A business card is 85 × 55 mm
 * in every country that is not the United States, and the preview on this
 * page is drawn to that proportion exactly so that what somebody approves on
 * screen is what comes back from the print shop. The portrait card this
 * replaced looked like a contact entry rather than a card, and nothing about
 * it could be handed to anybody.
 *
 * WHICH PHOTOGRAPH IT USES, WHICH IS NOT THE OBVIOUS ONE
 *
 * The profile picture, not the one cropped on My ID card. The ID card's
 * photograph is kept in `localStorage` on purpose and never uploaded, so it
 * exists on exactly one browser: fine for a PDF generated on that machine,
 * useless on a card somebody else opens on their phone, where it would
 * simply be missing. The profile picture is hosted, so it travels.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, ExternalLink, MessageCircle, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, Card, SegmentedControl, Switch, useToast } from '@/components/ui';
import { cardLink } from '@/lib/businessCard';
import { imageAsDataUrl, imageUrl } from '@/lib/cloudinary';
import { saveFile } from '@/lib/download';
import { PORTAL_ROOT } from '@/lib/tiles';
import { type BusinessCardLayout } from '@/lib/businessCardPdf';
import { BusinessCardFace, ScaledCard, cardColour, type CardCompany } from '@/components/cards/CardFaces';
import { cardPdf } from '@/lib/cardExport';
import { useOrgStaffDetails } from './OrgIdCard';

export default function OrgCard({ embedded = false }: { embedded?: boolean } = {}) {
  const toast = useToast();
  const { user, details, card, orgName, settings } = useOrgStaffDetails();
  const [qr, setQr] = useState('');
  const [layout, setLayout] = useState<BusinessCardLayout>('card');
  const [bleed, setBleed] = useState(false);
  const [busy, setBusy] = useState(false);

  const link = useMemo(() => cardLink(card), [JSON.stringify(card)]); // eslint-disable-line react-hooks/exhaustive-deps
  /* The QR carries no images: a code holding two URLs becomes too dense to scan. */
  const qrLink = useMemo(() => cardLink({ ...card, logo: '', photo: '' }), [JSON.stringify(card)]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = !details.position.trim() || !details.phone.trim();
  const photo = user?.photoURL ? imageUrl(user.photoURL, { width: 160 }) : '';
  /*
   * The company's colour, on screen and in the PDF alike.
   *
   * Deliberately NOT the `brand-*` utilities the rest of the app uses: those
   * follow the theme each person picks for themselves, so the card on screen
   * would be one colour, the printed card another, and two colleagues would
   * hand out different cards. `brandColor` is the organisation's own, and is
   * already the colour its invoices and statements print in.
   */
  const accent = cardColour(settings?.brandColor);
  /* The photo and logo as data, so the preview and the PDF draw the same pixels. */
  const [photoData, setPhotoData] = useState('');
  const [logoData, setLogoData] = useState('');
  useEffect(() => {
    let live = true;
    void imageAsDataUrl(user?.photoURL, 480).then((d) => live && setPhotoData(d));
    void imageAsDataUrl(settings?.logoUrl, 240).then((d) => live && setLogoData(d));
    return () => {
      live = false;
    };
  }, [user?.photoURL, settings?.logoUrl]);
  const company: CardCompany = {
    name: orgName,
    short: settings?.shortName || orgName,
    website: settings?.website?.replace(/^https?:\/\//, '') ?? '',
    address: settings?.address ?? '',
    logo: logoData || settings?.logoUrl,
    color: accent,
  };
  const person = { ...details, email: user?.email ?? '' };
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [face, setFace] = useState<'front' | 'back'>('back');
  /* The preview fills the column it has, up to 1.4 × print size. */
  const fitRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1.4, el.clientWidth / 340));
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

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

  /**
   * The print file.
   *
   * The pictures are fetched back as data URLs because jsPDF needs bytes, not
   * links, and both are allowed to fail: a card with initials and no logo
   * still prints, where a thrown error is a download that never happens.
   */
  const download = useCallback(async () => {
    setBusy(true);
    try {
      if (!frontRef.current || !backRef.current) throw new Error('not ready');
      const blob = await cardPdf({
        front: frontRef.current,
        back: backRef.current,
        w: 85,
        h: 55,
        sheet: layout,
        title: `${details.fullName}, ${orgName}`,
        bleed: layout === 'card' && bleed ? { front: accent, back: '#ffffff' } : undefined,
      });
      const name = `${details.fullName.replace(/\s+/g, '-').toLowerCase()}-business-card.pdf`;
      await saveFile(name, blob);
      toast.success('Card downloaded', layout === 'card' ? 'Send this file to your print shop.' : 'Print at 100% and cut along the marks.');
    } catch {
      toast.error('Could not build the card', 'Try again, or check your connection.');
    } finally {
      setBusy(false);
    }
  }, [details, orgName, layout, bleed, accent, toast]);


  return (
    <>
      {!embedded && (
        <PageHeader
          title="My business card"
        description={`A contact card anyone can open on their phone, under ${orgName}’s name and logo, with buttons to call you, WhatsApp you or save your number. The details travel in the link, so nothing is stored. Download it to print at 85 × 55 mm, the standard card size.`}
        />
      )}
      {missing && user && (
        <Alert tone="warning" className="mb-4">
          Add your position and phone on{' '}
          <Link to={`${PORTAL_ROOT[user.role]}/cards?tab=id`} className="font-bold underline">
            the ID card tab
          </Link>{' '}
          first, so your card is complete.
        </Alert>
      )}
      {!photo && (
        <Alert tone="info" className="mb-4">
          Your card shows your initials. Add a photo on{' '}
          <Link to="/profile" className="font-bold underline">
            your profile
          </Link>{' '}
          and it will appear here, on the card you share, and on the printed one.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/*
          The preview, drawn at 85 × 55 so it is honestly the shape of the
          thing that gets printed. `aspect-[85/55]` rather than a height, so
          it keeps that shape at every width.
        */}
        <div className="mx-auto w-full max-w-[30rem] space-y-3">
          <div className="flex justify-center">
            <SegmentedControl
              value={face}
              onChange={setFace}
              options={[
                { value: 'back', label: 'Your side' },
                { value: 'front', label: 'Company side' },
              ]}
            />
          </div>
          <div ref={fitRef} className="w-full">
            <ScaledCard width={340} height={220} scale={scale}>
              <BusinessCardFace side={face} person={person} company={company} photo={photoData || photo} qr={qr} />
            </ScaledCard>
          </div>
          <p className="text-center text-[12px] text-muted">Actual size 85 × 55 mm, the standard business card.</p>
          {/* Both faces at print size, off screen, for the PDF. */}
          <div aria-hidden className="pointer-events-none fixed -left-[2000px] top-0">
            <BusinessCardFace ref={frontRef} side="front" person={person} company={company} photo={photoData || photo} qr={qr} />
            <BusinessCardFace ref={backRef} side="back" person={person} company={company} photo={photoData || photo} qr={qr} />
          </div>
        </div>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              {qr ? <img src={qr} alt="QR code to your business card" className="h-40 w-40" /> : <div className="h-40 w-40 rounded bg-[var(--surface-sunken)]" />}
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

          <Card className="space-y-4">
            <div>
              <h2 className="text-[15px] font-bold text-primary">Print it</h2>
              <p className="mt-1 text-[13px] text-secondary">Front and back, at the standard 85 × 55 mm.</p>
            </div>
            <SegmentedControl
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'card', label: 'Card size' },
                { value: 'a4', label: 'On A4' },
              ]}
            />
            {layout === 'card' && (
              <Switch
                checked={bleed}
                onChange={setBleed}
                label="Add 3 mm bleed"
                description="For a commercial print shop. Leave this off for your own printer."
              />
            )}
            <Button full icon={<Download size={16} />} loading={busy} onClick={() => void download()}>
              Download PDF
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
