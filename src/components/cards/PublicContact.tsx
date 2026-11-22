/**
 * The contact card someone sees when they scan a business card or an ID card.
 *
 * One design for both, in the company's own colour: the photograph large and
 * round on a guilloche band, the company's logo and name, a verified seal when
 * the company vouches for the person, quick buttons to call, message, email or
 * open the website, and "Save contact", which puts the person into the phone
 * with their picture. Public and light: no Firebase client, no shell.
 */
import { useState, type ReactNode } from 'react';
import { BadgeCheck, Building2, Download, Globe, Loader2, Mail, MapPin, MessageCircle, Phone, ShieldAlert, UserRound } from 'lucide-react';
import { Mark } from '@/components/brand/Wordmark';
import { Daisy, Guilloche, VerifiedSeal, cardColour, mix } from './CardFaces';
import { saveContact, whatsappNumber, type BusinessCard } from '@/lib/businessCard';

export interface PublicContactProps {
  name: string;
  position?: string;
  company?: string;
  logo?: string;
  photo?: string;
  color?: string;
  location?: string;
  phone?: string;
  email?: string;
  website?: string;
  staffNo?: string;
  /** verified: the company vouches for them now. inactive: no longer staff. plain: a card from a link. */
  status: 'verified' | 'inactive' | 'plain';
}

const FONT = "'Plus Jakarta Sans', 'Archivo', system-ui, sans-serif";

/** A Cloudinary picture at the size it is drawn; anything else untouched. */
function sized(url: string | undefined, px: number): string {
  if (!url) return '';
  return url.includes('/upload/') ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${px},h_${px},c_fill,g_face/`) : url;
}

/** The page behind the card: the company colour, deep, with the daisies drifting. */
export function ContactStage({ color, children }: { color?: string; children: ReactNode }) {
  const c = cardColour(color);
  return (
    <div
      className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: `radial-gradient(120% 70% at 20% 0%, ${mix(c, '#000000', 0.2)} 0%, ${mix(c, '#000000', 0.55)} 55%, ${mix(c, '#000000', 0.78)} 100%)`, fontFamily: FONT }}
    >
      <Daisy size={340} petal={mix(c, '#ffffff', 0.3)} centre={mix(c, '#ffffff', 0.3)} opacity={0.16} className="pointer-events-none absolute -left-32 -top-28 -z-10 animate-[spin_90s_linear_infinite]" />
      <Daisy size={420} petal={mix(c, '#ffffff', 0.2)} centre={mix(c, '#ffffff', 0.2)} opacity={0.12} className="pointer-events-none absolute -bottom-44 -right-40 -z-10 animate-[spin_120s_linear_infinite_reverse]" />
      {children}
      <p className="mt-6 flex items-center gap-2 text-[12px] font-semibold text-white/60">
        <Mark className="h-5 w-5" /> Verified with AfterBI
      </p>
    </div>
  );
}

export function PublicContact(p: PublicContactProps) {
  const c = cardColour(p.color);
  const ink = mix(c, '#000000', 0.18);
  const tint = mix(c, '#ffffff', 0.9);
  const [saving, setSaving] = useState(false);
  const wa = whatsappNumber(p.phone ?? '');
  const site = (p.website ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const live = p.status !== 'inactive';

  const save = async () => {
    setSaving(true);
    const card: BusinessCard = {
      name: p.name,
      position: p.position ?? '',
      location: p.location ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      staffNo: p.staffNo ?? '',
      company: p.company ?? '',
      website: site,
      photo: p.photo ?? '',
    };
    try {
      await saveContact(card);
    } finally {
      setSaving(false);
    }
  };

  const actions = [
    p.phone && { label: 'Call', icon: Phone, href: `tel:${p.phone.replace(/\s/g, '')}` },
    wa && { label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/${wa}` },
    p.email && { label: 'Email', icon: Mail, href: `mailto:${p.email}` },
    site && { label: 'Website', icon: Globe, href: `https://${site}` },
  ].filter(Boolean) as { label: string; icon: typeof Phone; href: string }[];

  return (
    <article className="w-full max-w-[380px] overflow-hidden rounded-[30px] bg-white text-[#0f1220] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.65)]">
      {/* the band: the company colour, banknote lines, the daisy half hidden */}
      <div className="relative h-[156px] overflow-hidden" style={{ background: `linear-gradient(135deg, ${c} 0%, ${mix(c, '#000000', 0.3)} 100%)` }}>
        <Guilloche w={420} h={160} color="#ffffff" opacity={0.2} />
        <Daisy size={170} petal="rgba(255,255,255,0.2)" centre="#f5b83d" className="absolute -bottom-20 -right-14" />
        <div className="relative flex items-center gap-2.5 px-5 pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
            {p.logo ? <img src={p.logo} alt="" className="max-h-full max-w-full object-contain" /> : <Building2 size={18} style={{ color: c }} aria-hidden />}
          </span>
          <span className="line-clamp-2 min-w-0 flex-1 text-[14.5px] font-bold leading-snug text-white">{p.company || 'AfterBI'}</span>
          {p.status === 'verified' && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white ring-1 ring-inset ring-white/25" style={{ background: 'rgba(255,255,255,0.16)' }}>
              <BadgeCheck size={13} aria-hidden /> Verified
            </span>
          )}
        </div>
      </div>

      <div className="relative -mt-[62px] flex flex-col items-center px-6 pb-6 text-center">
        <span className="relative">
          <span className="flex h-[124px] w-[124px] items-center justify-center overflow-hidden rounded-full ring-[5px] ring-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)]" style={{ background: tint }}>
            {p.photo ? (
              <img src={sized(p.photo, 260)} alt={p.name} className={`h-full w-full object-cover ${live ? '' : 'grayscale'}`} />
            ) : (
              <UserRound size={52} style={{ color: c }} aria-hidden />
            )}
          </span>
          {p.status === 'verified' && (
            <span className="absolute bottom-1 right-1">
              <VerifiedSeal size={34} color={c} />
            </span>
          )}
        </span>

        <h1 className="mt-4 text-[1.5rem] font-extrabold leading-tight tracking-[-0.02em]">{p.name}</h1>
        {p.position && (
          <p className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: ink }}>
            {p.position}
          </p>
        )}
        {p.location && (
          <p className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[#5c6273]">
            <MapPin size={13} aria-hidden /> {p.location}
          </p>
        )}

        {!live ? (
          <div className="mt-5 w-full rounded-2xl bg-[#fdecec] px-4 py-3.5 text-left">
            <p className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.08em] text-[#c0262c]">
              <ShieldAlert size={16} aria-hidden /> No longer active
            </p>
            <p className="mt-1 text-[13.5px] leading-snug text-[#5c6273]">
              {`This person is no longer a member of staff of ${p.company}. Do not deal with them on the company's behalf.`}
            </p>
          </div>
        ) : (
          <>
            {actions.length > 0 && (
              <div className="mt-6 flex w-full justify-center gap-5">
                {actions.map((a) => (
                  <a key={a.label} href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener" className="group flex w-14 flex-col items-center gap-1.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:-translate-y-0.5" style={{ background: tint, color: c }}>
                      <a.icon size={19} aria-hidden />
                    </span>
                    <span className="text-[11.5px] font-semibold text-[#5c6273]">{a.label}</span>
                  </a>
                ))}
              </div>
            )}

            <dl className="mt-6 w-full divide-y divide-black/[0.06] rounded-2xl text-left ring-1 ring-inset ring-black/[0.07]">
              {p.phone && <Line label="Phone" value={p.phone} href={`tel:${p.phone.replace(/\s/g, '')}`} />}
              {p.email && <Line label="Email" value={p.email} href={`mailto:${p.email}`} />}
              {site && <Line label="Website" value={site} href={`https://${site}`} />}
              {p.staffNo && <Line label="Staff number" value={p.staffNo} />}
            </dl>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="mt-5 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white transition-[filter] hover:brightness-110 disabled:opacity-70"
              style={{ background: c }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Download size={18} aria-hidden />}
              Save contact
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function Line({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8a90a0]">{label}</dt>
      <dd className="mt-0.5 truncate text-[14.5px] font-semibold text-[#0f1220]">{value}</dd>
    </>
  );
  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener" className="block px-4 py-3 transition-colors hover:bg-black/[0.02]">
      {body}
    </a>
  ) : (
    <div className="px-4 py-3">{body}</div>
  );
}

/** While the record loads, and when there is none. */
export function ContactMissing({ loading }: { loading: boolean }) {
  return (
    <article className="w-full max-w-[380px] rounded-[30px] bg-white px-6 py-10 text-center text-[#0f1220] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.65)]">
      {loading ? (
        <>
          <span className="mx-auto block h-[124px] w-[124px] animate-pulse rounded-full bg-black/[0.06]" />
          <span className="mx-auto mt-5 block h-6 w-48 animate-pulse rounded-lg bg-black/[0.06]" />
          <span className="mx-auto mt-3 block h-4 w-32 animate-pulse rounded-lg bg-black/[0.05]" />
        </>
      ) : (
        <>
          <ShieldAlert size={52} className="mx-auto text-[#c0262c]" aria-hidden />
          <h1 className="mt-3 text-[1.3rem] font-extrabold">Not recognised</h1>
          <p className="mt-2 text-[14px] leading-snug text-[#5c6273]">This card could not be found. Contact the company directly before dealing with the holder.</p>
        </>
      )}
    </article>
  );
}
