/**
 * `/verify/id/:uid`: where the QR on an organisation's staff ID card points.
 * One public read of `idCards/{uid}`. It says whether the holder is a current
 * member of that company's staff, with their contact and a "Save contact".
 */
import { useParams } from 'react-router-dom';
import { BadgeCheck, Download, Mail, MessageCircle, Phone, ShieldAlert } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useAsync } from '@/hooks/useAsync';
import { readIdCard } from '@/lib/idCards';
import { vcard, whatsappNumber } from '@/lib/businessCard';
import { useBootDone } from '@/lib/boot';

export default function VerifyIdPage() {
  useBootDone();
  const { uid = '' } = useParams();
  const { data, loading } = useAsync(() => readIdCard(uid), [uid], { handleError: true });
  const active = data?.active === true;
  const wa = data ? whatsappNumber(data.phone ?? '') : null;

  const saveContact = () => {
    if (!data) return;
    const blob = new Blob(
      [vcard({ name: data.name, position: data.position, company: data.company, phone: data.phone ?? '', email: data.email ?? '', website: data.website ?? '', location: data.location ?? '', staffNo: data.staffNo, logo: '' })],
      { type: 'text/vcard' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/[^a-z0-9]+/gi, '_')}.vcf`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const row = 'flex items-center gap-3 rounded-xl px-4 py-3 text-[14.5px] font-semibold text-[#111420] ring-1 ring-inset ring-black/10 transition-colors hover:bg-black/[0.03]';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0f1f36] px-4 py-10">
      <Seo title="Staff check" description="Confirm a staff ID card." path={`/verify/id/${uid}`} noindex />
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-[#111420] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 border-b-4 border-[#ee6a00] bg-[#0f1f36] px-6 py-5 text-white">
          {data?.logo ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
              <img src={data.logo} alt="" className="max-h-full max-w-full object-contain" />
            </span>
          ) : null}
          <span className="font-display text-[1.1rem] font-extrabold leading-tight">{data?.company ?? 'Staff check'}</span>
        </div>
        <div className="px-6 py-7 text-center">
          {loading ? (
            <p className="text-[15px] text-[#686e7e]">Checking…</p>
          ) : data ? (
            <>
              {active ? (
                <BadgeCheck size={52} className="mx-auto text-[#16a34a]" aria-hidden />
              ) : (
                <ShieldAlert size={52} className="mx-auto text-[#d9534f]" aria-hidden />
              )}
              <p className={`mt-3 text-[12.5px] font-bold uppercase tracking-[0.12em] ${active ? 'text-[#16a34a]' : 'text-[#d9534f]'}`}>
                {active ? 'Verified staff member' : 'No longer active'}
              </p>
              <h1 className="mt-3 font-display text-[1.6rem] font-extrabold leading-tight">{data.name}</h1>
              {data.position && <p className="mt-1 text-[15px] font-bold text-[#ee6a00]">{data.position}</p>}
              <p className="mt-1 text-[13px] text-[#686e7e]">
                {data.company} · Staff no. {data.staffNo}
              </p>

              {active && (
                <div className="mt-6 space-y-2 text-left">
                  {data.phone && (
                    <a href={`tel:${data.phone}`} className={row}>
                      <Phone size={17} className="text-[#ee6a00]" aria-hidden /> {data.phone}
                    </a>
                  )}
                  {wa && (
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer noopener" className={row}>
                      <MessageCircle size={17} className="text-[#ee6a00]" aria-hidden /> WhatsApp
                    </a>
                  )}
                  {data.email && (
                    <a href={`mailto:${data.email}`} className={row}>
                      <Mail size={17} className="text-[#ee6a00]" aria-hidden /> {data.email}
                    </a>
                  )}
                  <button type="button" onClick={saveContact} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f1f36] px-4 py-3 text-[14.5px] font-bold text-white">
                    <Download size={17} aria-hidden /> Save contact
                  </button>
                </div>
              )}
              {!active && (
                <p className="mt-4 text-[13.5px] text-[#686e7e]">
                  This person is no longer an active member of staff of {data.company}. Do not deal with them on the company's behalf.
                </p>
              )}
            </>
          ) : (
            <>
              <ShieldAlert size={52} className="mx-auto text-[#d9534f]" aria-hidden />
              <h1 className="mt-3 font-display text-[1.4rem] font-extrabold">Not recognised</h1>
              <p className="mt-2 text-[14px] text-[#686e7e]">This card could not be found. Contact the company directly before dealing with the holder.</p>
            </>
          )}
          <p className="mt-6 text-[11px] text-[#9aa0ad]">Verified with AfterBI</p>
        </div>
      </div>
    </div>
  );
}
