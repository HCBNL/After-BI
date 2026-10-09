/**
 * Team → My ID card: a staff ID card for anyone in an organisation, issued by
 * that organisation (its logo, name, RC number, contacts and signatory).
 *
 * The same card as AfterBI's own staff card (`pages/staff/StaffIdCard.tsx`),
 * with the organisation as issuer. The person fills in their position,
 * location and phone (saved to their own profile, so the business card uses
 * the same details), frames a photo, and downloads the PDF. The photo is never
 * uploaded. The QR code on the back opens their digital business card.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Camera, Download, ImageOff, Save } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, Card, Field, Input, SegmentedControl, Switch, useToast } from '@/components/ui';
import { Hint } from '@/components/ui/Hint';
import { PhotoCropper } from '@/components/PhotoCropper';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { updateProfile } from '@/lib/db';
import { publicDataUrl } from '@/lib/staff';
import { saveFile } from '@/lib/download';
import { cardLink, type BusinessCard } from '@/lib/businessCard';
import { buildStaffCard, type CardIssuer, type IdCardLayout } from '@/lib/staffCardPdf';
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
  const save = async () => {
    setSaving(true);
    try {
      if (user) await updateProfile(user.id, { position: details.position.trim(), location: details.location.trim(), phone: details.phone.trim() });
    } finally {
      setSaving(false);
    }
  };
  const orgName = settings?.name || 'Your organisation';
  const staffNo = user ? orgStaffNumber(user.id, orgName) : '';
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
  };
  return { user, settings, details, setDetails, save, saving, staffNo, card, orgName };
}

export default function OrgIdCard() {
  const toast = useToast();
  const { user, settings, details, setDetails, save, saving, staffNo, card, orgName } = useOrgStaffDetails();
  const [source, setSource] = useState('');
  const [photo, setPhoto] = useState(() => (user ? readStored(photoKey(user.id)) : ''));
  const [remember, setRemember] = useState(() => Boolean(user && readStored(photoKey(user.id))));
  const [layout, setLayout] = useState<IdCardLayout>('a4');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const issuer = issuerFor(settings);

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
      const QRCode = (await import('qrcode')).default;
      const [mark, signature, qr] = await Promise.all([
        settings?.logoUrl ? publicDataUrl(settings.logoUrl).catch(() => '') : Promise.resolve(''),
        settings?.signatureUrl ? publicDataUrl(settings.signatureUrl).catch(() => '') : Promise.resolve(''),
        /* Without the logo, so the printed code stays small enough to scan. */
        QRCode.toDataURL(cardLink({ ...card, logo: '' }), { margin: 1, width: 320, errorCorrectionLevel: 'L' }).catch(() => ''),
      ]);
      const doc = await buildStaffCard({ ...details, staffNo, photo, mark, signature, qr, issuer, qrLabel: 'Scan for contact' }, layout);
      await saveFile(`${orgName.replace(/[^a-z0-9]+/gi, '_')}_ID_${details.fullName.replace(/[^a-z0-9]+/gi, '_')}.pdf`, doc.output('blob'));
    } catch (err) {
      toast.error('Could not make the card', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof typeof details) => (e: { target: { value: string } }) => setDetails((d) => ({ ...d, [key]: e.target.value }));
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <>
      <PageHeader
        title="My ID card"
        actions={
          <Hint label="About your ID card">
            Your {orgName} staff ID card, front and back. Download it and print at 100%, or take the card size PDF to a print shop. Your photo is
            not uploaded anywhere.
          </Hint>
        }
      />
      {isAdmin && (!settings?.logoUrl || !settings?.signatoryName) && (
        <Alert tone="warning" className="mb-4" title="Finish the card in Settings">
          Add the company logo, the RC number, and who signs ID cards (with a signature image) in Settings, so every staff card is complete.
        </Alert>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="space-y-5">
          <Card>
            <h2 className="text-[15px] font-bold text-primary">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" hint="As set when your account was made. Change it on your Profile.">
                <Input value={details.fullName} readOnly />
              </Field>
              <Field label="Position">
                <Input value={details.position} onChange={set('position')} placeholder="Sales supervisor" maxLength={40} />
              </Field>
              <Field label="Location">
                <Input value={details.location} onChange={set('location')} placeholder="City or depot" maxLength={40} />
              </Field>
              <Field label="Phone">
                <Input value={details.phone} onChange={set('phone')} placeholder="0803 000 0000" maxLength={20} />
              </Field>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              icon={<Save size={16} />}
              loading={saving}
              onClick={() =>
                void save()
                  .then(() => toast.success('Saved', 'Your card details are updated.'))
                  .catch((err: unknown) => toast.error('Not saved', err instanceof Error ? err.message : undefined))
              }
            >
              Save my details
            </Button>
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
          <Preview side={side} details={details} staffNo={staffNo} photo={photo} issuer={issuer} logo={settings?.logoUrl} signature={settings?.signatureUrl} />
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

/** The card on screen at the PDF's proportions (4 px per mm). */
function Preview({
  side,
  details,
  staffNo,
  photo,
  issuer,
  logo,
  signature,
}: {
  side: 'front' | 'back';
  details: { fullName: string; position: string; location: string; phone: string };
  staffNo: string;
  photo: string;
  issuer: CardIssuer;
  logo?: string;
  signature?: string;
}) {
  const rows = [
    ['OFFICE', issuer.address],
    ['PHONE', issuer.phone],
    ['EMAIL', issuer.email],
    ['WEB', issuer.website],
  ].filter(([, v]) => v);
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-[10px] bg-white text-[#111420] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] ring-1 ring-black/10"
      style={{ width: 216, height: 342, fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {side === 'front' ? (
        <>
          <div className="absolute inset-x-0 top-0 border-b-[2.4px] border-[#ee6a00] bg-[#0f1f36]" style={{ height: 134 }} />
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 10 }}>
            <span className="flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-[10px] bg-white p-1">
              {logo ? <img src={logo} alt="" className="max-h-full max-w-full object-contain" /> : <Building2 className="h-7 w-7 text-[#0f1f36]" />}
            </span>
          </div>
          <p className="absolute inset-x-0 text-center text-[7.5px] font-bold tracking-[0.25em] text-[#c8cdda]" style={{ top: 70 }}>
            STAFF ID CARD
          </p>
          <div className="absolute left-1/2 -translate-x-1/2 rounded-[10px] bg-white p-[3px]" style={{ top: 90 }}>
            <div className="overflow-hidden rounded-[8px] ring-2 ring-[#ee6a00]" style={{ width: 90, height: 112 }}>
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[#eceef3]" />}
            </div>
          </div>
          <p className="absolute inset-x-2 truncate text-center text-[12px] font-bold uppercase" style={{ top: 222 }}>
            {details.fullName || 'Your name'}
          </p>
          <p className="absolute inset-x-2 truncate text-center text-[9.5px] font-bold text-[#ee6a00]" style={{ top: 239 }}>
            {details.position || 'Position'}
          </p>
          <p className="absolute inset-x-2 truncate text-center text-[8.5px] text-[#686e7e]" style={{ top: 252 }}>
            {details.location}
          </p>
          <div className="absolute inset-x-5 grid grid-cols-2 gap-2 border-t border-[#dee1e8] pt-1.5" style={{ top: 270 }}>
            {[
              ['PHONE', details.phone || 'Not set'],
              ['STAFF NO', staffNo],
            ].map(([label, value]) => (
              <p key={label} className="leading-tight">
                <span className="block text-[6px] font-bold text-[#686e7e]">{label}</span>
                <span className="block truncate text-[9.5px] font-bold">{value}</span>
              </p>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-[29px] items-center justify-center truncate border-t-2 border-[#ee6a00] bg-[#0f1f36] px-2 text-[12px] font-bold text-white">
            {issuer.short}
          </div>
        </>
      ) : (
        <>
          <div className="flex h-[44px] flex-col items-center justify-center border-b-2 border-[#ee6a00] bg-[#0f1f36] px-2 text-white">
            <span className="truncate text-[9.5px] font-bold">{issuer.name}</span>
            {issuer.rc && <span className="text-[7px] text-[#c8cdda]">{issuer.rc}</span>}
          </div>
          <div className="space-y-2 px-[18px] pt-3 text-[7.8px] leading-snug">
            <p>{issuer.notice}</p>
            <div className="divide-y divide-[#e4e7ee] pt-1">
              {rows.map(([label, value]) => (
                <p key={label} className="grid grid-cols-[40px_1fr] gap-1 py-[7px]">
                  <span className="pt-[1px] text-[6.5px] font-bold text-[#ee6a00]">{label}</span>
                  <span className="break-words font-bold">{value}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-[18px] flex items-end gap-3" style={{ bottom: 38 }}>
            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded bg-[#eceef3] text-center text-[6px] text-[#686e7e]">
              Scan for
              <br />
              contact
            </div>
            <div className="flex-1 text-center">
              {signature ? <img src={signature} alt="" className="mx-auto h-8 object-contain" /> : <div className="h-8" />}
              <div className="border-t border-[#111420] pt-0.5 text-[7.5px] font-bold">{issuer.signatory || ' '}</div>
              <div className="text-[6.5px] text-[#686e7e]">{issuer.signatoryTitle}</div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-[26px] items-center justify-center truncate border-t-2 border-[#ee6a00] bg-[#0f1f36] px-2 text-[7px] text-[#c8cdda]">
            {issuer.footer}
          </div>
        </>
      )}
    </div>
  );
}
