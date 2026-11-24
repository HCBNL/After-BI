/**
 * Team → My ID card: a staff ID card for anyone in an organisation, issued by
 * that organisation (its logo, name, RC number, contacts and signatory).
 *
 * The same card as AfterBI's own staff card (`pages/staff/StaffIdCard.tsx`),
 * with the organisation as issuer. Position, location and phone are set by
 * the super admin (People) for everybody; the super admin alone sets their
 * own here, locked again after each save. The person frames a photo and
 * downloads the PDF. The photo is never
 * uploaded. The QR code on the back opens their digital business card.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, ImageOff, Save } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, Card, Field, Input, SegmentedControl, Switch, useToast } from '@/components/ui';
import { PhotoCropper } from '@/components/PhotoCropper';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { updateProfile } from '@/lib/db';
import { LockButton, useEditLock } from '@/components/lock/EditLock';
import { LocationSelect } from '@/components/people/LocationSelect';
import { cn } from '@/lib/cn';
import { publicDataUrl } from '@/lib/staff';
import { saveFile } from '@/lib/download';
import { type BusinessCard } from '@/lib/businessCard';
import { idVerifyUrl, publishIdCard } from '@/lib/idCards';
import { type CardIssuer, type IdCardLayout } from '@/lib/staffCardPdf';
import { IdCardFace, ScaledCard, type CardCompany } from '@/components/cards/CardFaces';
import { cardPdf } from '@/lib/cardExport';
import { imageUrl } from '@/lib/cloudinary';
import { ROLE_LABEL, type OrgSettings } from '@/types';

const photoKey = (uid: string) => `ab.org.photo.${uid}`;

function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** A staff number from the organisation's initials and the account id: BF-123456. */
export function orgStaffNumber(uid: string, orgName: string): string {
  const letters =
    orgName
      .replace(/\b(ltd|limited|plc|nigeria|nig|enterprises?|company|co)\b\.?/gi, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z]/g, '') || 'ST';
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${letters}-${(h % 1_000_000).toString().padStart(6, '0')}`;
}

export function issuerFor(settings: OrgSettings | null): CardIssuer {
  const name = settings?.name || 'Your organisation';
  return {
    name: name.toUpperCase(),
    rc: settings?.rcNumber ?? '',
    tagline: '',
    short: settings?.shortName || name,
    address: settings?.address ?? '',
    phone: settings?.phone ?? '',
    email: settings?.email ?? '',
    website: settings?.website?.replace(/^https?:\/\//, '') ?? '',
    signatory: settings?.signatoryName ?? '',
    signatoryTitle: settings?.signatoryTitle || 'Authorised signatory',
    footer: `${name}, powered by AfterBI`,
    notice: `The holder of this card is a member of staff of ${name}. This card is the property of the company and is not transferable. If found, please return it to:`,
  };
}

/** The signed-in person's card details, from their profile, editable and saveable. */
export function useOrgStaffDetails() {
  const { user } = useAuth();
  const { settings } = useOrg();
  const [details, setDetails] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    position: user?.position || (user ? ROLE_LABEL[user.role] : ''),
    location: user?.location ?? '',
    phone: user?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const orgName = settings?.name || 'Your organisation';
  /* The employee code is the staff number, when the person has one. */
  const staffNo = user ? user.employeeCode || orgStaffNumber(user.id, orgName) : '';
  /* The public record the card's QR checks against (lib/idCards.ts). */
  const publish = async () => {
    if (!user?.orgId || !details.fullName.trim()) return;
    await publishIdCard({
      uid: user.id,
      orgId: user.orgId,
      name: details.fullName.trim(),
      position: details.position.trim(),
      company: orgName,
      logo: settings?.logoUrl ?? '',
      photo: user.photoURL ?? '',
      color: settings?.brandColor ?? '',
      phone: details.phone.trim(),
      email: user.email ?? '',
      website: settings?.website ?? '',
      location: details.location.trim(),
      staffNo,
    }).catch(() => undefined);
  };
  const save = async () => {
    setSaving(true);
    try {
      /* Only a super admin sets their own position, base and phone (firestore.rules); everyone else's are set in People. */
      if (user?.role === 'super_admin') {
        await updateProfile(user.id, { position: details.position.trim(), location: details.location.trim(), phone: details.phone.trim() });
      }
      await publish();
    } finally {
      setSaving(false);
    }
  };
  const card: BusinessCard = {
    name: details.fullName,
    position: details.position,
    location: details.location,
    phone: details.phone,
    email: user?.email ?? '',
    staffNo,
    company: orgName,
    website: settings?.website ?? '',
    logo: settings?.logoUrl ?? '',
    /*
     * The profile photograph, which is the one picture of this person the
     * app actually hosts.
     *
     * Not the photograph cropped on this page: that one is deliberately kept
     * in `localStorage` and never uploaded, so it exists on one browser and
     * cannot be put on a card that other people open on their own phones.
     * The profile picture is on Cloudinary and already carries this person's
     * face everywhere else in the app, so it is the one the card can use.
     */
    photo: user?.photoURL ?? '',
  };
  return { user, settings, details, setDetails, save, saving, staffNo, card, orgName, publish };
}

export default function OrgIdCard({ embedded = false }: { embedded?: boolean } = {}) {
  const toast = useToast();
  const { user, settings, details, setDetails, save, saving, staffNo, orgName, publish } = useOrgStaffDetails();
  /* A real, scannable code on the preview too: it opens the public staff check. */
  const [qrPreview, setQrPreview] = useState('');
  useEffect(() => {
    if (!user) return;
    let live = true;
    void import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(idVerifyUrl(user.id), { margin: 1, width: 240, errorCorrectionLevel: 'M' }))
      .then((url) => live && setQrPreview(url))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [user]);
  const [source, setSource] = useState('');
  const [photo, setPhoto] = useState(() => (user ? readStored(photoKey(user.id)) : ''));
  const [remember, setRemember] = useState(() => Boolean(user && readStored(photoKey(user.id))));
  const [layout, setLayout] = useState<IdCardLayout>('a4');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const issuer = issuerFor(settings);
  /* The logo and signature as data, so the preview and the PDF draw the same pixels. */
  const [logoData, setLogoData] = useState('');
  const [signData, setSignData] = useState('');
  useEffect(() => {
    let live = true;
    if (settings?.logoUrl) void publicDataUrl(imageUrl(settings.logoUrl, { width: 160 })).then((d) => live && setLogoData(d)).catch(() => undefined);
    if (settings?.signatureUrl) void publicDataUrl(imageUrl(settings.signatureUrl, { width: 320 })).then((d) => live && setSignData(d)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [settings?.logoUrl, settings?.signatureUrl]);
  const company: CardCompany = {
    name: settings?.name || 'Your organisation',
    short: issuer.short,
    rc: settings?.rcNumber,
    address: issuer.address,
    phone: issuer.phone,
    email: issuer.email,
    website: issuer.website,
    logo: logoData || settings?.logoUrl,
    signature: signData || settings?.signatureUrl,
    signatory: issuer.signatory,
    signatoryTitle: issuer.signatoryTitle,
    notice: issuer.notice,
    color: settings?.brandColor ?? '',
  };
  const person = { ...details, staffNo, email: user?.email ?? '' };
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const onCrop = useCallback((data: string) => setPhoto(data), []);

  useEffect(() => {
    if (!user) return;
    try {
      if (remember && photo) localStorage.setItem(photoKey(user.id), photo);
      if (!remember) localStorage.removeItem(photoKey(user.id));
    } catch {
      /* storage full or blocked: it simply is not remembered */
    }
  }, [remember, photo, user]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result));
    reader.onerror = () => setError('That picture could not be read. Try a JPG or PNG.');
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const download = async () => {
    if (!details.fullName.trim() || !details.position.trim()) return setError('Fill in your name and position first.');
    setError('');
    setBusy(true);
    try {
      await publish();
      if (!frontRef.current || !backRef.current) throw new Error('The card is not ready yet.');
      const blob = await cardPdf({
        front: frontRef.current,
        back: backRef.current,
        w: 54,
        h: 85.6,
        sheet: layout,
        title: `${issuer.short} staff ID: ${details.fullName}`,
      });
      await saveFile(`${orgName.replace(/[^a-z0-9]+/gi, '_')}_ID_${details.fullName.replace(/[^a-z0-9]+/gi, '_')}.pdf`, blob);
    } catch (err) {
      toast.error('Could not make the card', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof typeof details) => (e: { target: { value: string } }) => setDetails((d) => ({ ...d, [key]: e.target.value }));
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  /* The super admin sets their own line on the card; it locks again after each save. */
  const ownsDetails = user?.role === 'super_admin';
  const { locked, lock, toggle } = useEditLock();
  const editable = ownsDetails && !locked;
  /* Everyone else's card follows what the super admin set: the public record is refreshed on every visit. */
  useEffect(() => {
    if (!ownsDetails) void publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownsDetails]);

  return (
    <>
      {!embedded && (
        <PageHeader
          title="My ID card"
        description={`Your ${orgName} staff ID card, front and back. Download it and print at 100%, or take the card size PDF to a print shop. Your photo is not uploaded anywhere.`}
        />
      )}
      {isAdmin && (!settings?.logoUrl || !settings?.signatoryName) && (
        <Alert tone="warning" className="mb-4" title="Finish the card in Settings">
          Add the company logo, the RC number, and who signs ID cards (with a signature image) in Settings, so every staff card is complete.
        </Alert>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-primary">Your details</h2>
              {ownsDetails && <LockButton surface locked={locked} onToggle={toggle} />}
            </div>
            <div className={cn('mt-4 grid gap-4 sm:grid-cols-2', ownsDetails && locked && 'ab-locked')}>
              <Field label="Full name" hint="As set when your account was made.">
                <Input value={details.fullName} readOnly />
              </Field>
              <Field label="Position" hint={ownsDetails ? undefined : 'Set by your super admin.'}>
                <Input value={details.position} onChange={set('position')} placeholder="Managing Director" maxLength={40} readOnly={!editable} />
              </Field>
              <Field label="Location" hint={ownsDetails ? undefined : 'Set by your super admin.'}>
                {editable ? (
                  <LocationSelect value={details.location} onChange={(v) => setDetails((d) => ({ ...d, location: v }))} />
                ) : (
                  <Input value={details.location || 'Not set'} readOnly />
                )}
              </Field>
              <Field label="Phone" hint={ownsDetails ? undefined : 'Set by your super admin.'}>
                <Input type="tel" value={details.phone} onChange={set('phone')} readOnly={!editable} placeholder={editable ? '0803 000 0000' : 'Not set'} />
              </Field>
            </div>
            {editable && (
              <Button
                variant="outline"
                className="mt-4"
                icon={<Save size={16} />}
                loading={saving}
                onClick={() =>
                  void save()
                    .then(() => {
                      lock();
                      toast.success('Saved and locked', 'Your card details are updated.');
                    })
                    .catch((err: unknown) => toast.error('Not saved', err instanceof Error ? err.message : undefined))
                }
              >
                Save my details
              </Button>
            )}
          </Card>

          <Card>
            <h2 className="text-[15px] font-bold text-primary">Photo</h2>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button icon={<Camera size={16} />} onClick={() => fileRef.current?.click()}>
                {photo ? 'Choose another photo' : 'Choose a photo'}
              </Button>
              {photo && (
                <Button
                  variant="ghost"
                  icon={<ImageOff size={16} />}
                  onClick={() => {
                    setPhoto('');
                    setSource('');
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
            {source && (
              <div className="mt-4">
                <PhotoCropper src={source} onChange={onCrop} />
              </div>
            )}
            <div className="mt-4">
              <Switch
                checked={remember}
                onChange={setRemember}
                label="Remember my photo on this device"
                description="Kept in this browser only. Never uploaded."
              />
            </div>
          </Card>
        </div>

        <Card className="space-y-4 lg:sticky lg:top-6">
          <div className="flex justify-center">
            <SegmentedControl
              value={side}
              onChange={setSide}
              options={[
                { value: 'front', label: 'Front' },
                { value: 'back', label: 'Back' },
              ]}
            />
          </div>
          <ScaledCard width={216} height={342} scale={1.2}>
            <IdCardFace side={side} person={person} company={company} photo={photo} qr={qrPreview} />
          </ScaledCard>
          {/* Both faces at print size, off screen, for the PDF. */}
          <div aria-hidden className="pointer-events-none fixed -left-[2000px] top-0">
            <IdCardFace ref={frontRef} side="front" person={person} company={company} photo={photo} qr={qrPreview} />
            <IdCardFace ref={backRef} side="back" person={person} company={company} photo={photo} qr={qrPreview} />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-primary">Print on</p>
            <SegmentedControl
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'a4', label: 'A4 paper (cut out)' },
                { value: 'card', label: 'Card size' },
              ]}
            />
          </div>
          {error && <Alert tone="critical">{error}</Alert>}
          <Button full icon={<Download size={16} />} loading={busy} onClick={() => void download()}>
            Download PDF
          </Button>
        </Card>
      </div>
    </>
  );
}
