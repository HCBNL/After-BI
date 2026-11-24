/**
 * Team → Business card: a contact card under the organisation's name, to
 * share as a link or print.
 *
 * The details live in the link (`/card#…`), so nothing about the card is
 * stored: share the short link, or let someone scan the code.
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
import { Copy, Loader2, Printer, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Card, SegmentedControl, Switch, useToast } from '@/components/ui';
import { imageAsDataUrl, imageUrl } from '@/lib/cloudinary';
import { saveFile } from '@/lib/download';
import { PORTAL_ROOT } from '@/lib/tiles';
import { BusinessCardFace, ScaledCard, cardColour, type CardCompany } from '@/components/cards/CardFaces';
import { cardPdf } from '@/lib/cardExport';
import { useOrgStaffDetails } from './OrgIdCard';
import { businessCardUrl } from '@/lib/idCards';

/** At card size for a print shop, or two up on A4 with cut marks for an office printer. */
type BusinessCardLayout = 'card' | 'a4';

export default function OrgCard({ embedded = false }: { embedded?: boolean } = {}) {
  const toast = useToast();
  const { user, details, orgName, settings, publish } = useOrgStaffDetails();
  const [qr, setQr] = useState('');
  const [layout, setLayout] = useState<BusinessCardLayout>('card');
  const [bleed, setBleed] = useState(false);
  const [busy, setBusy] = useState(false);

  /*
   * The QR and the shared link are short: /card/{uid}, read from the public
   * record (lib/idCards.ts). So the code stays easy to scan on a printed card,
   * and whoever scans it sees the current photograph, saved with the contact.
   */
  const link = useMemo(() => (user ? businessCardUrl(user.id) : ''), [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const qrLink = link;
  /* Keep the public record current with the photo and details on this page. */
  useEffect(() => {
    void publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.photoURL, settings?.brandColor, settings?.logoUrl]);
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

  const message = `${details.fullName}${details.position ? `, ${details.position}` : ''}, ${orgName}`;

  const copy = () =>
    void navigator.clipboard
      ?.writeText(link)
      .then(() => toast.success('Link copied', 'Paste it into any chat or email.'))
      .catch(() => toast.error('Could not copy', 'Press and hold the link to copy it.'));

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: message, url: link }).catch(() => undefined);
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
        description={`Your card under ${orgName}’s name and logo. Scanning its code opens your contact with your photo, ready to save. Print it at 85 × 55 mm, the standard card size.`}
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

      <div className="grid gap-5 lg:grid-cols-2">
        {/*
          The preview, drawn at 85 × 55 so it is honestly the shape of the
          thing that gets printed.
        */}
        <div className="mx-auto flex w-full max-w-[30rem] flex-col justify-center gap-3">
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

        <Card className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-primary">Print it</h2>
              <p className="mt-1 text-[13px] text-secondary">Front and back, at the standard 85 × 55 mm.</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <IconAction label="Copy link" onClick={copy}>
                <Copy size={17} aria-hidden />
              </IconAction>
              <IconAction label="Share" onClick={() => void share()}>
                <Share2 size={17} aria-hidden />
              </IconAction>
              <IconAction label="Download PDF" primary onClick={() => void download()} disabled={busy}>
                {busy ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Printer size={17} aria-hidden />}
              </IconAction>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-micro font-semibold uppercase tracking-[0.12em] text-muted">Show</p>
            <SegmentedControl
              value={face}
              onChange={setFace}
              options={[
                { value: 'back', label: 'Your side' },
                { value: 'front', label: 'Company side' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-micro font-semibold uppercase tracking-[0.12em] text-muted">Paper</p>
            <SegmentedControl
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'card', label: 'Card size' },
                { value: 'a4', label: 'On A4' },
              ]}
            />
          </div>
          {layout === 'card' && (
            <Switch
              checked={bleed}
              onChange={setBleed}
              label="Add 3 mm bleed"
              description="For a commercial print shop. Leave this off for your own printer."
            />
          )}
        </Card>
      </div>
    </>
  );
}

function IconAction({ label, onClick, children, primary, disabled }: { label: string; onClick: () => void; children: React.ReactNode; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        primary
          ? 'flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white transition-[filter] hover:brightness-110 disabled:opacity-60'
          : 'flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-primary transition-colors hover:bg-[var(--surface-sunken)]'
      }
    >
      {children}
    </button>
  );
}
