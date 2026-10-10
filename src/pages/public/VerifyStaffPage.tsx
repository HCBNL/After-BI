/**
 * `/verify/staff/:staffNo`: where the QR code on an AfterBI staff ID card
 * points. One public read of `staffCards/{staffNo}`; it says whether the
 * holder is a current member of staff, and nothing else.
 */

import { useParams, Link } from 'react-router-dom';
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Wordmark } from '@/components/brand/Wordmark';
import { useAsync } from '@/hooks/useAsync';
import { readStaffCard } from '@/lib/staff';
import { COMPANY } from '@/lib/company';
import { useBootDone } from '@/lib/boot';

export default function VerifyStaffPage() {
  useBootDone();
  const { staffNo = '' } = useParams();
  const { data, loading } = useAsync(() => readStaffCard(staffNo), [staffNo], { handleError: true });
  const active = data?.status === 'active';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0f1f36] px-4 py-10">
      <Seo title="Staff check" description="Confirm an AfterBI staff ID card." path={`/verify/staff/${staffNo}`} noindex />
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-[#111420] shadow-[0_40px_100px_-40px_rgba(238,106,0,0.5)]">
        <div className="border-b-4 border-[#ee6a00] bg-[#0f1f36] px-6 py-5">
          <Wordmark onInk className="text-[1.2rem]" />
        </div>
        <div className="px-6 py-7 text-center">
          {loading ? (
            <p className="text-[15px] text-[#686e7e]">Checking {staffNo}…</p>
          ) : data ? (
            <>
              {active ? (
                <BadgeCheck size={52} className="mx-auto text-[#16a34a]" aria-hidden />
              ) : (
                <ShieldAlert size={52} className="mx-auto text-[#d9534f]" aria-hidden />
              )}
              <p className={`mt-3 text-[13px] font-bold uppercase tracking-[0.12em] ${active ? 'text-[#16a34a]' : 'text-[#d9534f]'}`}>
                {active ? 'Verified staff member' : 'No longer active'}
              </p>
              <h1 className="mt-3 font-display text-[1.6rem] font-extrabold leading-tight">{data.name}</h1>
              {data.position && <p className="mt-1 text-[15px] font-bold text-[#ee6a00]">{data.position}</p>}
              {data.location && <p className="text-[13.5px] text-[#686e7e]">{data.location}</p>}
              <p className="mt-4 text-[12.5px] text-[#686e7e]">
                Staff no. {staffNo.toUpperCase()} · {COMPANY.name}
              </p>
            </>
          ) : (
            <>
              <ShieldAlert size={52} className="mx-auto text-[#d9534f]" aria-hidden />
              <h1 className="mt-3 font-display text-[1.4rem] font-extrabold">Not recognised</h1>
              <p className="mt-2 text-[14px] text-[#686e7e]">
                {staffNo.toUpperCase()} is not an AfterBI staff number. Contact {COMPANY.email} if you were shown this card.
              </p>
            </>
          )}
          <Link to="/" className="mt-6 inline-block text-[14px] font-bold text-[#c95600] underline">
            afterbi.com
          </Link>
        </div>
      </div>
    </div>
  );
}
