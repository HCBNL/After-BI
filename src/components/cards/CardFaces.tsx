/**
 * The staff ID card and the business card, drawn once and used twice: as the
 * preview on screen, and (rendered to an image at print resolution) as the
 * PDF. What you see is exactly what prints.
 *
 * The look borrows from real corporate credentials: a fine line (guilloche)
 * background and a line of micro text, which are hard to fake; a verified
 * seal beside the photo; a small iridescent foil mark; a QR on the back that
 * opens the public staff check. All in the company's own colour (its brand
 * colour from Settings, the one its invoices print in, so every colleague's
 * card matches), with the owner's Primary artwork (a six petal daisy) turning
 * out of the corner, still, as print.
 *
 * Sizes are in px at 4 px per mm: the ID card is CR80 portrait (54 × 85.6 mm)
 * at 216 × 342, the business card 85 × 55 mm at 340 × 220.
 */
import { forwardRef, type ReactNode } from 'react';
import { BadgeCheck, Building2, Globe, Mail, MapPin, Phone } from 'lucide-react';

export interface CardPerson {
  fullName: string;
  position: string;
  location: string;
  phone: string;
  email?: string;
  staffNo?: string;
}

export interface CardCompany {
  name: string;
  short: string;
  rc?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  signature?: string;
  signatory?: string;
  signatoryTitle?: string;
  notice?: string;
  /** The company colour, #rrggbb. */
  color: string;
}

/* ------------------------------------------------------------- colour */

function mix(hex: string, other: string, share: number): string {
  const a = hex.replace('#', '');
  const b = other.replace('#', '');
  const c = [0, 2, 4].map((i) => {
    const x = parseInt(a.slice(i, i + 2), 16);
    const y = parseInt(b.slice(i, i + 2), 16);
    return Math.round(x * (1 - share) + y * share)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${c.join('')}`;
}

export function cardColour(hex?: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex! : '#1d4ef5';
}

/* --------------------------------------------------------- security art */

/** Fine wavy lines across the whole card, like a banknote's ground. */
function Guilloche({ w, h, color, opacity }: { w: number; h: number; color: string; opacity: number }) {
  const lines: string[] = [];
  for (let i = -2; i < h / 7 + 2; i += 1) {
    let d = '';
    for (let x = 0; x <= w; x += 4) {
      const y = i * 7 + 3.2 * Math.sin(x / 15 + i * 0.55) + 1.6 * Math.sin(x / 6.5 + i);
      d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(2)}`;
    }
    lines.push(d);
  }
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <g fill="none" stroke={color} strokeWidth="0.45" opacity={opacity}>
        {lines.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** A rosette of loops, the classic guilloche centrepiece. */
function Rosette({ size, color, opacity, className }: { size: number; color: string; opacity: number; className?: string }) {
  const r = size / 2;
  const paths: string[] = [];
  for (let k = 0; k < 18; k += 1) {
    let d = '';
    for (let t = 0; t <= 360; t += 4) {
      const a = (t * Math.PI) / 180;
      const rr = r * (0.62 + 0.3 * Math.sin(6 * a + (k * Math.PI) / 9));
      const x = r + rr * Math.cos(a + k * 0.035);
      const y = r + rr * Math.sin(a + k * 0.035);
      d += `${t === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    paths.push(`${d}Z`);
  }
  return (
    <svg aria-hidden className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g fill="none" stroke={color} strokeWidth="0.4" opacity={opacity}>
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** One line of tiny repeated text: readable under a loupe, a smudge to a copier. */
function Microtext({ text, color, className }: { text: string; color: string; className?: string }) {
  return (
    <div aria-hidden className={`overflow-hidden whitespace-nowrap font-bold uppercase ${className ?? ''}`} style={{ color, fontSize: 3.2, letterSpacing: 0.4, lineHeight: 1 }}>
      {Array.from({ length: 14 }, () => `${text} · `).join('')}
    </div>
  );
}

/** The owner's six petal daisy (Primary artwork), for the corner of a card. */
function Daisy({ size, petal, centre, opacity = 1, className }: { size: number; petal: string; centre: string; opacity?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={className} style={{ opacity }}>
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <ellipse key={r} cx="50" cy="28" rx="13" ry="23" transform={`rotate(${r} 50 50)`} fill={petal} />
      ))}
      <circle cx="50" cy="50" r="10" fill={centre} />
    </svg>
  );
}

/** A scalloped seal with a tick: the company vouches for this person. */
export function VerifiedSeal({ size, color }: { size: number; color: string }) {
  const n = 12;
  let d = '';
  for (let i = 0; i <= n * 2; i += 1) {
    const a = (i * Math.PI) / n - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 43;
    d += `${i === 0 ? 'M' : 'L'}${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  }
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100">
      <path d={`${d}Z`} fill={color} stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
      <path d="M31 51l13 13 26-28" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A small iridescent square, standing in for a hologram foil. */
function Foil({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="relative block overflow-hidden rounded-[3px] ring-1 ring-black/10"
      style={{
        width: size,
        height: size,
        background: 'conic-gradient(from 210deg, #c9f0ff, #f8d1ff, #fff3c4, #c8ffe0, #c9d8ff, #c9f0ff)',
      }}
    >
      <Rosette size={size} color="#ffffff" opacity={0.9} className="absolute inset-0" />
    </span>
  );
}

function Logo({ src, size, radius, color }: { src?: string; size: number; radius: number; color: string }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden bg-white" style={{ width: size, height: size, borderRadius: radius, padding: size * 0.1 }}>
      {src ? <img src={src} alt="" crossOrigin="anonymous" className="max-h-full max-w-full object-contain" /> : <Building2 style={{ width: size * 0.5, height: size * 0.5, color }} />}
    </span>
  );
}

const FONT = "'Plus Jakarta Sans', 'Archivo', Helvetica, Arial, sans-serif";

/* ------------------------------------------------------------- ID card */

export const IdCardFace = forwardRef<
  HTMLDivElement,
  { side: 'front' | 'back'; person: CardPerson; company: CardCompany; photo?: string; qr?: string }
>(function IdCardFace({ side, person, company, photo, qr }, ref) {
  const c = cardColour(company.color);
  const deep = mix(c, '#05070d', 0.55);
  const ink = '#10131c';
  const grey = '#69707f';
  const micro = `${company.short} authentic staff credential`;

  return (
    <div
      ref={ref}
      translate="no"
      className="relative overflow-hidden bg-white"
      style={{ width: 216, height: 342, borderRadius: 12, fontFamily: FONT, color: ink }}
    >
      <Guilloche w={216} h={342} color={c} opacity={0.1} />

      {side === 'front' ? (
        <>
          {/* the colour band, with a soft curve under it */}
          <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: 128, background: `linear-gradient(150deg, ${c} 0%, ${deep} 100%)` }}>
            <Guilloche w={216} h={128} color="#ffffff" opacity={0.09} />
            <div className="absolute" style={{ right: -40, top: -38 }}>
              <Daisy size={126} petal="rgba(255,255,255,0.2)" centre="#FFBE45" />
            </div>
          </div>
          <svg aria-hidden className="absolute left-0" style={{ top: 110 }} width="216" height="24" viewBox="0 0 216 24">
            <path d="M0 18 C60 2 150 2 216 14 V24 H0Z" fill="#ffffff" />
          </svg>

          <div className="absolute flex items-center gap-2" style={{ left: 14, top: 14, right: 60 }}>
            <Logo src={company.logo} size={34} radius={9} color={c} />
            <div className="min-w-0 text-white">
              <p className="truncate font-extrabold" style={{ fontSize: 10, lineHeight: 1.15 }}>{company.short}</p>
              <p className="font-bold uppercase" style={{ fontSize: 5.6, letterSpacing: 1.6, opacity: 0.75 }}>Staff identity card</p>
            </div>
          </div>

          {/* the photo, framed, with the seal */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 56, width: 150, height: 150 }}>
            <div className="absolute overflow-hidden bg-[#eceef3]" style={{ left: 26, top: 15, width: 98, height: 120, borderRadius: 14, border: '3px solid #fff', boxShadow: '0 8px 18px -8px rgba(5,7,13,0.45)' }}>
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="absolute" style={{ left: 26 + 98 - 18, top: 15 + 120 - 18 }}>
              <VerifiedSeal size={26} color={c} />
            </div>
          </div>

          <div className="absolute inset-x-3 text-center" style={{ top: 214 }}>
            <p className="truncate font-extrabold uppercase" style={{ fontSize: 12.5, letterSpacing: 0.3 }}>{person.fullName || 'Your name'}</p>
            <p className="mt-0.5 truncate font-bold uppercase" style={{ fontSize: 8, letterSpacing: 1.2, color: c }}>{person.position || 'Position'}</p>
            {person.location && (
              <p className="mt-0.5 flex items-center justify-center gap-0.5 truncate" style={{ fontSize: 7.5, color: grey }}>
                <MapPin style={{ width: 7, height: 7 }} /> {person.location}
              </p>
            )}
          </div>

          <div className="absolute flex items-end gap-3" style={{ left: 16, right: 16, top: 262, borderTop: '1px solid #e3e6ee', paddingTop: 6 }}>
            {[
              ['Staff no', person.staffNo || ''],
              ['Phone', person.phone || 'Not set'],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 flex-1">
                <p className="font-bold uppercase" style={{ fontSize: 5.2, letterSpacing: 0.9, color: grey }}>{label}</p>
                <p className="truncate font-extrabold" style={{ fontSize: 9, letterSpacing: 0.2 }}>{value}</p>
              </div>
            ))}
            <div className="flex shrink-0 flex-col items-center gap-0.5">
              <Foil size={17} />
              <span className="font-bold uppercase" style={{ fontSize: 3.8, letterSpacing: 0.6, color: grey }}>Authentic</span>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0" style={{ height: 30, background: deep }}>
            <Microtext text={micro} color="rgba(255,255,255,0.45)" className="pt-[3px]" />
            <p className="truncate px-3 text-center font-extrabold text-white" style={{ fontSize: 10, marginTop: 4 }}>{company.name}</p>
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-center px-3 text-center text-white" style={{ height: 50, background: `linear-gradient(150deg, ${c}, ${deep})` }}>
            <p className="w-full truncate font-extrabold" style={{ fontSize: 9.5 }}>{company.name}</p>
            {company.rc && <p style={{ fontSize: 6.5, opacity: 0.75 }}>{`RC ${company.rc}`}</p>}
          </div>

          <div className="absolute" style={{ left: 16, right: 16, top: 62 }}>
            <p style={{ fontSize: 6.8, lineHeight: 1.45, color: ink }}>{company.notice}</p>
            <div className="mt-2 space-y-[5px]">
              {(
                [
                  [MapPin, company.address],
                  [Phone, company.phone],
                  [Mail, company.email],
                  [Globe, company.website],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([Icon, v], i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 12, height: 12, background: c }}>
                      <Icon style={{ width: 6.5, height: 6.5, color: '#fff' }} />
                    </span>
                    <span className="min-w-0 break-words font-semibold" style={{ fontSize: 7, lineHeight: '12px' }}>{v}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="absolute flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5" style={{ left: 16, bottom: 122, background: mix(c, '#ffffff', 0.9) }}>
            <VerifiedSeal size={14} color={c} />
            <span className="font-bold" style={{ fontSize: 6.5, color: deep }}>{`Verified staff of ${company.short}`}</span>
          </div>

          <div className="absolute flex items-end gap-3" style={{ left: 16, right: 16, bottom: 42 }}>
            <div className="flex shrink-0 flex-col items-center">
              <div className="rounded-[6px] bg-white p-[3px]" style={{ border: `1px solid ${mix(c, '#ffffff', 0.7)}` }}>
                {qr ? <img src={qr} alt="" style={{ width: 58, height: 58 }} /> : <div style={{ width: 58, height: 58, background: '#eceef3' }} />}
              </div>
              <span className="mt-1 flex items-center gap-0.5 font-bold" style={{ fontSize: 5.5, color: c }}>
                <BadgeCheck style={{ width: 7, height: 7 }} /> Scan to verify
              </span>
            </div>
            <div className="min-w-0 flex-1 text-center">
              {company.signature ? <img src={company.signature} alt="" crossOrigin="anonymous" className="mx-auto object-contain" style={{ height: 30 }} /> : <div style={{ height: 30 }} />}
              <div className="truncate font-bold" style={{ fontSize: 7.5, borderTop: `1px solid ${ink}`, paddingTop: 2 }}>{company.signatory || ' '}</div>
              <div className="truncate" style={{ fontSize: 6, color: grey }}>{company.signatoryTitle}</div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0" style={{ height: 28, background: deep }}>
            <Microtext text={micro} color="rgba(255,255,255,0.45)" className="pt-[3px]" />
            <p className="truncate px-3 text-center text-white" style={{ fontSize: 6.5, marginTop: 4, opacity: 0.85 }}>{`${company.name}, powered by AfterBI`}</p>
          </div>
        </>
      )}
    </div>
  );
});

/* -------------------------------------------------------- business card */

export const BusinessCardFace = forwardRef<
  HTMLDivElement,
  { side: 'front' | 'back'; person: CardPerson; company: CardCompany; photo?: string; qr?: string }
>(function BusinessCardFace({ side, person, company, photo, qr }, ref) {
  const c = cardColour(company.color);
  const deep = mix(c, '#05070d', 0.55);
  const ink = '#10131c';
  const grey = '#69707f';
  const initials = person.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div
      ref={ref}
      translate="no"
      className="relative overflow-hidden"
      style={{ width: 340, height: 220, borderRadius: 12, fontFamily: FONT, color: ink, background: side === 'front' ? `linear-gradient(140deg, ${c} 0%, ${deep} 100%)` : '#ffffff' }}
    >
      {side === 'front' ? (
        <>
          <Guilloche w={340} h={220} color="#ffffff" opacity={0.08} />
          <div className="absolute" style={{ right: -78, top: -10 }}>
            <Daisy size={230} petal="rgba(255,255,255,0.16)" centre="#FFBE45" />
          </div>
          <div className="absolute" style={{ left: 26, top: 50 }}>
            <Logo src={company.logo} size={54} radius={14} color={c} />
            <p className="mt-3 font-extrabold text-white" style={{ fontSize: 17, letterSpacing: -0.2, lineHeight: 1.15, maxWidth: 220 }}>{company.name}</p>
            {company.website && <p className="mt-1 text-white" style={{ fontSize: 9, opacity: 0.75 }}>{company.website}</p>}
          </div>
          <div className="absolute inset-x-0 bottom-0 px-[26px] pb-[10px]">
            <Microtext text={`${company.short} verified business card`} color="rgba(255,255,255,0.4)" />
          </div>
        </>
      ) : (
        <>
          <Guilloche w={340} h={220} color={c} opacity={0.06} />
          <div className="absolute" style={{ right: -54, bottom: -54 }}>
            <Daisy size={150} petal={mix(c, '#ffffff', 0.86)} centre={mix('#FFBE45', '#ffffff', 0.4)} />
          </div>

          <div className="absolute flex items-center gap-3" style={{ left: 22, top: 22, right: 112 }}>
            <span className="relative shrink-0">
              <span className="flex items-center justify-center overflow-hidden rounded-full font-extrabold text-white" style={{ width: 46, height: 46, background: c, fontSize: 15, border: '2px solid #fff', boxShadow: '0 4px 10px -4px rgba(5,7,13,0.4)' }}>
                {photo ? <img src={photo} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" /> : initials}
              </span>
              <span className="absolute" style={{ right: -4, bottom: -3 }}>
                <VerifiedSeal size={17} color={c} />
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate font-extrabold" style={{ fontSize: 15, letterSpacing: -0.2, lineHeight: 1.15 }}>{person.fullName || 'Your name'}</p>
              <p className="truncate font-bold uppercase" style={{ fontSize: 7.5, letterSpacing: 1.1, color: c, marginTop: 2 }}>{person.position || 'Your position'}</p>
            </div>
          </div>

          <div className="absolute space-y-[6px]" style={{ left: 22, right: 120, top: 90 }}>
            {(
              [
                [Phone, person.phone],
                [Mail, person.email],
                [Globe, company.website],
                [MapPin, person.location || company.address],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([Icon, v], i) => (
                <ContactRow key={i} color={c}>
                  <Icon style={{ width: 7, height: 7, color: '#fff' }} />
                  <span className="truncate font-semibold" style={{ fontSize: 8.5 }}>{v}</span>
                </ContactRow>
              ))}
          </div>

          <div className="absolute flex flex-col items-center" style={{ right: 22, top: 22 }}>
            <Logo src={company.logo} size={28} radius={7} color={c} />
            <div className="mt-3 rounded-[7px] bg-white p-[3px]" style={{ border: `1px solid ${mix(c, '#ffffff', 0.7)}` }}>
              {qr ? <img src={qr} alt="" style={{ width: 70, height: 70 }} /> : <div style={{ width: 70, height: 70, background: '#eceef3' }} />}
            </div>
            <span className="mt-1 font-bold" style={{ fontSize: 6, color: grey }}>Scan to save my contact</span>
          </div>

          <div className="absolute inset-x-0 bottom-0" style={{ height: 5, background: `linear-gradient(90deg, ${c}, ${deep})` }} />
        </>
      )}
    </div>
  );
});

function ContactRow({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 14, height: 14, background: color }}>
        {(children as ReactNode[])[0]}
      </span>
      {(children as ReactNode[])[1]}
    </div>
  );
}

/** A card drawn at its print size, shown scaled to the room it has. */
export function ScaledCard({ width, height, scale, children }: { width: number; height: number; scale: number; children: ReactNode }) {
  return (
    <div style={{ width: width * scale, height: height * scale }} className="relative mx-auto">
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})`, filter: 'drop-shadow(0 18px 30px rgba(5,7,13,0.28))' }}>
        {children}
      </div>
    </div>
  );
}
