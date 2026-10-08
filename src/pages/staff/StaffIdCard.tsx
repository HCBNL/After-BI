/**
 * AfterBI staff → My ID card.
 *
 * The staff member fills in their position, location and phone (saved to
 * their own profile, so the business card uses the same details), chooses a
 * photo and frames their face, and downloads the card. The photo is never
 * uploaded: it can be remembered on this device only, for the next visit.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, ImageOff, Save } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, Card, Field, Input, SegmentedControl, Switch, useToast } from '@/components/ui';
import { Hint } from '@/components/ui/Hint';
import { PhotoCropper } from '@/components/PhotoCropper';
import { Mark } from '@/components/brand/Wordmark';
import { useAuth } from '@/context/AuthContext';
import { publicDataUrl, saveMyStaffDetails, staffNumber, staffVerifyUrl } from '@/lib/staff';
import { saveFile } from '@/lib/download';
import { COMPANY } from '@/lib/company';
import { buildStaffCard, type IdCardLayout } from '@/lib/staffCardPdf';

const photoKey = (uid: string) => `ab.staff.photo.${uid}`;

function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** The staff member's details, from their profile, editable and saveable. */
export function useStaffDetails() {
  const { user } = useAuth();
  const [details, setDetails] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    position: user?.position ?? '',
    location: user?.location ?? '',
    phone: user?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      if (user) await saveMyStaffDetails(user, details);
    } finally {
      setSaving(false);
    }
  };
  const staffNo = user ? staffNumber(user.id) : '';
  const email = user?.email ?? '';
  return { user, details, setDetails, save, saving, staffNo, email };
}

export default function StaffIdCard() {
  const toast = useToast();
  const { user, details, setDetails, save, saving, staffNo } = useStaffDetails();
  const [source, setSource] = useState('');
  const [photo, setPhoto] = useState(() => (user ? readStored(photoKey(user.id)) : ''));
  const [remember, setRemember] = useState(() => Boolean(user && readStored(photoKey(user.id))));
  const [layout, setLayout] = useState<IdCardLayout>('a4');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onCrop = useCallback((data: string) => setPhoto(data), []);

  /* Remember the framed photo on this device only, when asked to. */
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
      /* The QR opens the public staff check, which confirms the holder is current. */
      const link = staffVerifyUrl(staffNo);
      const [mark, signature, qr] = await Promise.all([
        publicDataUrl('/brand/afterbi-mark.png'),
        publicDataUrl('/brand/signature.png'),
        QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: 'M' }).catch(() => ''),
      ]);
      const doc = await buildStaffCard({ ...details, staffNo, photo, mark, signature, qr }, layout);
      await saveFile(`AfterBI_staff_ID_${details.fullName.replace(/[^a-z0-9]+/gi, '_')}.pdf`, doc.output('blob'));
    } catch (err) {
      toast.error('Could not make the card', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof typeof details) => (e: { target: { value: string } }) => setDetails((d) => ({ ...d, [key]: e.target.value }));

  return (
    <>
      <PageHeader
        title="My ID card"
        actions={
          <Hint label="About your ID card">
            Your AfterBI staff ID, front and back, signed by the CEO. Download it and print at 100%, or take the card-size PDF to a print
            shop. Your photo is not uploaded anywhere.
          </Hint>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="space-y-5">
          <Card>
            <h2 className="text-[15px] font-bold text-primary">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" hint="As set when your account was made. Ask the office to change it.">
                <Input value={details.fullName} readOnly />
              </Field>
              <Field label="Position">
                <Input value={details.position} onChange={set('position')} placeholder="Business Development Executive" maxLength={40} />
              </Field>
              <Field label="Location">
                <Input value={details.location} onChange={set('location')} placeholder="City" maxLength={40} />
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
              onClick={() => void save().then(() => toast.success('Saved', 'Your card details are updated.'))}
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
                description="Kept in this browser only, so you do not have to choose it again. Never uploaded."
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
          <StaffPreview side={side} details={details} staffNo={staffNo} photo={photo} />
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
function StaffPreview({
  side,
  details,
  staffNo,
  photo,
}: {
  side: 'front' | 'back';
  details: { fullName: string; position: string; location: string; phone: string };
  staffNo: string;
  photo: string;
}) {
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-[10px] bg-white text-[#111420] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] ring-1 ring-black/10"
      style={{ width: 216, height: 342, fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {side === 'front' ? (
        <>
          <div className="absolute inset-x-0 top-0 border-b-[2.4px] border-[#ee6a00] bg-[#0f1f36]" style={{ height: 134 }} />
          <div className="absolute left-1/2 -translate-x-1/2 text-white" style={{ top: 14 }}>
            <span className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px] bg-white"><Mark className="h-9 w-9" /></span>
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
              ['PHONE', details.phone || '—'],
              ['STAFF NO', staffNo],
            ].map(([label, value]) => (
              <p key={label} className="leading-tight">
                <span className="block text-[6px] font-bold text-[#686e7e]">{label}</span>
                <span className="block truncate text-[9.5px] font-bold">{value}</span>
              </p>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-[29px] items-center justify-center border-t-2 border-[#ee6a00] bg-[#0f1f36] text-[14px] font-bold text-white">
            AfterBI
          </div>
        </>
      ) : (
        <>
          <div className="flex h-[44px] flex-col items-center justify-center border-b-2 border-[#ee6a00] bg-[#0f1f36] text-white">
            <span className="text-[9.5px] font-bold">{COMPANY.name}</span>
            {COMPANY.rc && <span className="text-[7px] text-[#c8cdda]">{COMPANY.rc}</span>}
          </div>
          <p className="pt-2 text-center text-[8px] font-bold text-[#ee6a00]">{COMPANY.tagline}</p>
          <div className="space-y-2 px-[18px] pt-1.5 text-[7.8px] leading-snug">
            <p>
              The holder of this card is a member of staff of {COMPANY.name}, the company behind {COMPANY.product}. This
              card is the property of the company and is not transferable. If found, please return it to:
            </p>
            <div className="divide-y divide-[#e4e7ee] pt-1">
              {[
                ...(COMPANY.address ? [['OFFICE', [COMPANY.address]]] : []),
                ['PHONE', [COMPANY.phone]],
                ['EMAIL', [COMPANY.email]],
                ['WEB', [COMPANY.website]],
              ].map(([label, values]) => (
                <p key={label as string} className="grid grid-cols-[40px_1fr] gap-1 py-[7px]">
                  <span className="pt-[1px] text-[6.5px] font-bold text-[#ee6a00]">{label as string}</span>
                  <span className="font-bold">
                    {(values as string[]).map((v) => (
                      <span key={v} className="block">
                        {v}
                      </span>
                    ))}
                  </span>
                </p>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-[18px] flex items-end gap-3" style={{ bottom: 38 }}>
            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded bg-[#eceef3] text-center text-[6px] text-[#686e7e]">
              Scan to
              <br />
              verify
            </div>
            <div className="flex-1 text-center">
              <img src="/brand/signature.png" alt="" className="mx-auto h-8 object-contain" />
              <div className="border-t border-[#111420] pt-0.5 text-[7.5px] font-bold">{COMPANY.ceo}</div>
              <div className="text-[6.5px] text-[#686e7e]">{COMPANY.ceoTitle}</div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-[26px] items-center justify-center border-t-2 border-[#ee6a00] bg-[#0f1f36] text-[7px] text-[#c8cdda]">
            {COMPANY.footer}
          </div>
        </>
      )}
    </div>
  );
}
