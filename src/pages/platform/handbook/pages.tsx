/**
 * The sixteen pages of the AfterBI Handbook.
 *
 * Each is an A4 sheet at 794 by 1123 CSS pixels (see handbook.css). The
 * viewer scales them to fit the screen; the PDF captures them at full size.
 * Dark, white, mist and cream pages alternate the way the report's chapters
 * do, with the owner's shapes and illustrations on every spread.
 */

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import {
  Boxes,
  Crown,
  History,
  KeyRound,
  Lock,
  RefreshCw,
  Smartphone,
  Store,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Art, type ArtName } from '@/components/marketing/art';
import { Scene, type SceneName } from '@/components/marketing/scenes';
import { ModuleIcon } from '@/components/marketing/site-ui';
import { IconArt } from '@/components/ui/IconArt';
import { MARK_BARS, MARK_BAR_WIDTH, WORDMARK_BARS, WORDMARK_BAR_WIDTH, WORDMARK_LETTERS, WORDMARK_RATIO, WORDMARK_VIEWBOX } from '@/components/brand/logoPaths';
import type { CustomBuild } from '@/lib/programme';
import {
  CHAPTERS,
  CONTACT_PHONE,
  FAQ,
  FLOW,
  PAINS,
  PLANS,
  PRODUCT_GROUPS,
  SITE_HOST,
  START,
  SUPPORT_EMAIL,
  SUPPORT_LEVELS,
  TRUST,
  WORKSPACES,
  modulesOf,
  naira,
  yearly,
} from '@/lib/handbook';
import './handbook.css';

export interface HandbookProps {
  year: number;
  company: string;
  custom: CustomBuild;
}

type Tone = 'white' | 'dark' | 'blue' | 'mist' | 'cream';

/* ------------------------------------------------------------ pieces */

function Page({ tone = 'white', n, year, children, foot = true }: { tone?: Tone; n: number; year: number; children: ReactNode; foot?: boolean }) {
  return (
    <section className={`hb-page is-${tone}`} data-page={n}>
      {children}
      {foot && (
        <div className="hb-foot">
          <span className="flex items-center gap-2">
            <Badge size={16} dark={tone === 'dark' || tone === 'blue'} />
            AfterBI Handbook {year}
          </span>
          <span className="hb-num">{String(n).padStart(2, '0')}</span>
        </div>
      )}
    </section>
  );
}

/** The round badge with the three bars. */
function Badge({ size, dark = false, blue = false }: { size: number; dark?: boolean; blue?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <circle cx="50" cy="50" r="47.7" fill={blue ? '#1238e6' : dark ? '#ffffff' : '#0a0a0b'} />
      <path d={MARK_BARS} stroke={dark && !blue ? '#07142e' : '#ffffff'} strokeWidth={MARK_BAR_WIDTH} strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Wordmark({ height, color }: { height: number; color: string }) {
  return (
    <svg viewBox={WORDMARK_VIEWBOX} height={height} width={height * WORDMARK_RATIO} aria-label="AfterBI" role="img">
      <path d={WORDMARK_BARS} stroke={color} strokeWidth={WORDMARK_BAR_WIDTH} strokeLinecap="round" fill="none" />
      <g fill={color}>
        {WORDMARK_LETTERS.map(([x, d], i) => (
          <path key={i} transform={`translate(${x} 0)`} d={d} />
        ))}
      </g>
    </svg>
  );
}

/**
 * One of the owner's shapes, held still, in the colours given.
 *
 * The colours are written onto the parts as attributes, not left to the
 * stylesheet, because the PDF capture copies each element on its own and an
 * attribute is the one thing guaranteed to travel with it.
 */
function Shape({ name, a, b, c, size, style }: { name: ArtName; a: string; b?: string; c?: string; size: number; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const paint = (sel: string, attr: 'fill' | 'stroke', colour: string) =>
      root.querySelectorAll(`${sel}, ${sel} *`).forEach((el) => {
        el.setAttribute(attr, colour);
        (el as SVGElement).style.setProperty(attr, colour);
      });
    paint('.art-a', 'fill', a);
    paint('.art-b', 'fill', b ?? a);
    paint('.art-c', 'fill', c ?? a);
    paint('.art-stroke', 'stroke', a);
    paint('.art-ink', 'fill', '#07142e');
  }, [a, b, c, name]);
  return (
    <span ref={ref} className="inline-flex" style={{ width: size, height: size, ...style }}>
      <Art name={name} motion="none" style={{ width: size, height: size }} />
    </span>
  );
}

function Kicker({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <p className="hb-kicker" style={{ color: color ?? '#1238e6' }}>
      {children}
    </p>
  );
}

function Tick({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <p className="hb-tick hb-p" style={color ? ({ ['--tick' as string]: color } as CSSProperties) : undefined}>
      <span>{children}</span>
    </p>
  );
}

function Illustration({ name, size, ground, style }: { name: SceneName; size: number; ground?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center rounded-full"
      style={{ width: size, height: size, background: ground ?? 'transparent', ...style }}
    >
      <Scene name={name} still className="h-[84%] w-[84%]" />
    </div>
  );
}

/* ------------------------------------------------------------ 1 cover */

function Cover({ year, company }: HandbookProps) {
  return (
    <section className="hb-page is-dark" data-page={1}>
      {/* the colour field behind */}
      <div aria-hidden className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(18,56,230,0.55), transparent)' }} />
      <div aria-hidden className="absolute -bottom-52 -left-40 h-[560px] w-[560px] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(255,120,168,0.22), transparent)' }} />

      <div className="absolute left-16 right-16 top-14 flex items-center justify-between">
        <Wordmark height={30} color="#ffffff" />
        <span className="rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ background: 'rgba(255,255,255,0.1)' }}>
          Edition {year}
        </span>
      </div>

      {/* the tile, as on the report's cover */}
      <div className="absolute left-1/2 top-[178px] -translate-x-1/2">
        <div className="relative h-[330px] w-[330px] rotate-[-4deg] rounded-[72px] p-10 shadow-[0_50px_90px_-30px_rgba(0,0,0,0.7)]" style={{ background: '#1238e6' }}>
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 place-items-center gap-6">
            <div className="flex h-[104px] w-[104px] items-center justify-center rounded-full bg-white">
              <svg viewBox="0 0 100 100" width={70} height={70} aria-hidden>
                <path d={MARK_BARS} stroke="#1238e6" strokeWidth={MARK_BAR_WIDTH * 1.1} strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <Shape name="kite" a="#ffffff" size={104} />
            <Shape name="droplet" a="#ffffff" size={104} />
            <Shape name="blocks" a="#ffffff" size={100} />
          </div>
          <div className="absolute -right-7 -top-7 flex h-[92px] w-[92px] items-center justify-center">
            <Shape name="daisy" a="#ffbe45" b="#ffbe45" size={92} style={{ position: 'absolute', inset: 0 }} />
            <span className="relative text-center font-black leading-[0.9] text-[#07142e]" style={{ fontFamily: 'var(--heavy)', fontSize: 19 }}>
              {String(year).slice(0, 2)}
              <br />
              {String(year).slice(2)}
            </span>
          </div>
        </div>
      </div>

      {/* the owner's shapes drifting round it */}
      <Shape name="bloom" a="#ff78a8" size={86} style={{ position: 'absolute', left: 70, top: 250 }} />
      <Shape name="spark" a="#7c9cff" size={58} style={{ position: 'absolute', right: 96, top: 210 }} />
      <Shape name="orbit" a="#ff78a8" b="#7c9cff" size={70} style={{ position: 'absolute', right: 70, top: 470 }} />
      <Shape name="droplet" a="#ffbe45" size={44} style={{ position: 'absolute', left: 150, top: 520 }} />

      <div className="absolute bottom-[150px] left-16 right-16">
        <h1 className="hb-h" style={{ fontSize: 92 }}>
          The AfterBI
          <br />
          Handbook <span style={{ color: '#ffbe45' }}>{year}</span>
        </h1>
        <p className="hb-lead mt-6 max-w-[520px]" style={{ color: 'rgba(255,255,255,0.78)', fontSize: 17 }}>
          How we run sales and distribution for consumer goods companies, what it costs, and how we start together.
        </p>
      </div>

      <div className="absolute bottom-14 left-16 right-16 flex items-end justify-between">
        {company ? (
          <div>
            <p className="hb-kicker" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Prepared for
            </p>
            <p className="mt-1.5 text-[20px] font-bold leading-tight">{company}</p>
          </div>
        ) : (
          <p className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Smart distribution, made simple.™
          </p>
        )}
        <p className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {SITE_HOST}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ 2 contents */

function Contents({ year }: HandbookProps) {
  return (
    <Page n={2} year={year}>
      <div className="hb-in flex flex-col">
        <Kicker>Inside</Kicker>
        <h2 className="hb-h mt-4" style={{ fontSize: 58 }}>
          Welcome to
          <br />
          AfterBI.
        </h2>
        <p className="hb-lead hb-muted mt-6 max-w-[560px]">
          This handbook is our brand card. It explains what AfterBI does, how your teams and partners would work in it, what it costs and how we would start. Read it with your team, fill in the commitment page at the back, and send it to us. We will agree the final details with you and sign together.
        </p>

        <div className="mt-10 flex flex-col gap-[9px]">
          {CHAPTERS.map((c, i) => (
            <div key={c.title} className="flex items-center gap-4">
              <span className="flex h-[38px] w-[54px] items-center justify-center rounded-[12px] text-[13px] font-extrabold text-white" style={{ background: c.color }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[15.5px] font-semibold">{c.title}</span>
              <span className="mx-1 flex-1 border-b-2 border-dotted" style={{ borderColor: 'rgba(15,31,54,0.18)' }} />
              <span className="text-[15px] font-extrabold" style={{ fontFamily: 'var(--heavy)' }}>
                {String(c.page).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="absolute bottom-[110px] right-16 flex items-end gap-3">
        <Shape name="bloom" a="#ff78a8" size={64} />
        <Shape name="daisy" a="#ffbe45" b="#ff78a8" size={88} />
        <Shape name="kite" a="#0866f5" size={56} />
      </div>
      <p className="absolute bottom-[118px] left-16 max-w-[330px] text-[12px] leading-relaxed text-[#44526a]">
        Every price in this handbook is the price published on {SITE_HOST}. Nothing is hidden in the small print.
      </p>
    </Page>
  );
}

/* ------------------------------------------------------------ 3 why */

function Why({ year }: HandbookProps) {
  return (
    <Page n={3} year={year} tone="cream">
      <div className="hb-in">
        <Kicker color="#b56a00">01 · Why AfterBI exists</Kicker>
        <h2 className="hb-h mt-4 max-w-[520px]" style={{ fontSize: 50 }}>
          Distribution should not run on WhatsApp and memory.
        </h2>
        <p className="hb-lead hb-muted mt-5 max-w-[470px]">
          Most consumer goods companies we meet sell well and still lose money between the order and the shelf. Not from bad people, from tools that were never built for the job.
        </p>

        <div className="mt-9 grid grid-cols-2 gap-4">
          {PAINS.map((p, i) => (
            <div key={p.title} className="hb-card" style={{ padding: 20 }}>
              <span className="text-[30px] font-extrabold leading-none" style={{ fontFamily: 'var(--heavy)', color: ['#f0581a', '#0866f5', '#e23d78', '#7a36f0', '#0b9f55', '#f5a30a'][i] }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-3 text-[15px] font-bold leading-snug">{p.title}</p>
              <p className="hb-muted mt-1.5 text-[12.5px] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-5 rounded-[22px] p-6 text-white" style={{ background: '#07142e' }}>
          <Shape name="bloom" a="#ffbe45" size={48} />
          <p className="text-[15px] font-semibold leading-snug">
            AfterBI was built in Lagos by Contoric, for companies that sell through distributors and retailers, to close that gap for good.
          </p>
        </div>
      </div>
      <Illustration name="cost-checklist" size={190} style={{ position: 'absolute', right: 40, top: 50 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 4 the platform */

const GROUP_LINE: Record<string, string> = {
  'Sales Cloud': 'Win the order, then make sure the right one is raised.',
  'Operations and Finance': 'Move the goods, then make sure the money follows.',
  'Intelligence Platform': 'See what sold, everywhere, and act before month end.',
};
const GROUP_COLOR = ['#0866f5', '#ff78a8', '#ffbe45'];
const GROUP_SCENE: SceneName[] = ['target-goals', 'warehouse', 'data-analytics'];

function Platform({ year }: HandbookProps) {
  const chain: { label: string; art: ArtName; color: string }[] = [
    { label: 'Maker or importer', art: 'blocks', color: '#7c9cff' },
    { label: 'Your depots', art: 'kite', color: '#0866f5' },
    { label: 'Distributors', art: 'bloom', color: '#ff78a8' },
    { label: 'Retail shelf', art: 'daisy', color: '#ffbe45' },
  ];
  return (
    <Page n={4} year={year} tone="dark">
      <div className="hb-in">
        <Kicker color="#7c9cff">02 · One platform, the whole cycle</Kicker>
        <h2 className="hb-h mt-4" style={{ fontSize: 54 }}>
          From the factory gate
          <br />
          to the shop shelf.
        </h2>
        <p className="hb-lead hb-muted mt-5 max-w-[540px]">
          A CRM stops at the deal and an ERP starts at the warehouse. AfterBI runs the whole commercial cycle in between, including what your partners actually sell.
        </p>

        {/* the chain */}
        <div className="relative mt-12">
          <div className="absolute left-[60px] right-[60px] top-[44px] border-t-2 border-dashed" style={{ borderColor: 'rgba(255,255,255,0.28)' }} />
          <div className="relative grid grid-cols-4">
            {chain.map((c) => (
              <div key={c.label} className="flex flex-col items-center text-center">
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full" style={{ background: '#0d1f45' }}>
                  <Shape name={c.art} a={c.color} b="#ffffff" size={58} />
                </div>
                <p className="mt-3 text-[14px] font-bold">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* the three groups */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          {PRODUCT_GROUPS.map((g, i) => (
            <div key={g.title} className="overflow-hidden rounded-[22px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="h-2" style={{ background: GROUP_COLOR[i] }} />
              <div className="p-5">
                <p className="text-[16px] font-extrabold" style={{ fontFamily: 'var(--heavy)', letterSpacing: '-0.01em' }}>
                  {g.title}
                </p>
                <p className="hb-muted mt-1.5 text-[12px] leading-snug">{GROUP_LINE[g.title]}</p>
                <div className="mt-4 flex flex-col gap-2">
                  {modulesOf(g.slugs).map((m) => (
                    <p key={m.slug} className="hb-p flex items-center gap-2 text-[12.5px] font-semibold">
                      <ModuleIcon slug={m.slug} size={14} className="shrink-0 opacity-80" />
                      {m.name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="absolute bottom-0 left-0 text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Twelve parts, one login, one set of numbers. Turned on as you need them.
        </p>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------ 5 to 7 the modules */

function Group({ year, index }: HandbookProps & { index: number }) {
  const g = PRODUCT_GROUPS[index];
  const tone: Tone = index === 1 ? 'mist' : 'white';
  return (
    <Page n={5 + index} year={year} tone={tone}>
      <div className="hb-in">
        <Kicker color={['#0866f5', '#d6457f', '#b56a00'][index]}>03 · What is inside · {index + 1} of 3</Kicker>
        <h2 className="hb-h mt-4 max-w-[430px]" style={{ fontSize: 60 }}>
          {g.title}
        </h2>
        <p className="hb-lead hb-muted mt-4 max-w-[400px]">{GROUP_LINE[g.title]}</p>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6">
          {modulesOf(g.slugs).map((m) => (
            <div key={m.slug} className="hb-card" style={{ background: tone === 'white' ? '#f6f8fb' : '#ffffff', padding: 26, minHeight: 318 }}>
              <div className="flex items-center gap-3">
                <IconArt id={m.slug} size={44}>
                  <ModuleIcon slug={m.slug} size={18} />
                </IconArt>
                <p className="text-[16px] font-extrabold leading-tight" style={{ fontFamily: 'var(--heavy)', letterSpacing: '-0.01em' }}>
                  {m.name}
                </p>
              </div>
              <p className="hb-muted mt-4 text-[13.5px] leading-relaxed">{m.blurb}</p>
              <div className="mt-5 flex flex-col gap-3 text-[13.5px] leading-snug">
                {m.points.map((pt) => (
                  <Tick key={pt} color={GROUP_COLOR[index] === '#ffbe45' ? '#f5a30a' : GROUP_COLOR[index] === '#ff78a8' ? '#e23d78' : '#0866f5'}>
                    {pt}
                  </Tick>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Illustration name={GROUP_SCENE[index]} size={200} style={{ position: 'absolute', right: 40, top: 40 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 8 a day */

function Day({ year }: HandbookProps) {
  const colors = ['#ffbe45', '#ff78a8', '#7c9cff', '#ffffff', '#c8f531', '#ffbe45'];
  const arts: ArtName[] = ['bloom', 'kite', 'blocks', 'droplet', 'orbit', 'daisy'];
  return (
    <Page n={8} year={year} tone="blue">
      <div className="hb-in">
        <Kicker color="#ffbe45">04 · A day in AfterBI</Kicker>
        <h2 className="hb-h mt-4 max-w-[460px]" style={{ fontSize: 54 }}>
          One record moves through every team.
        </h2>
        <p className="hb-lead mt-5 max-w-[430px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Nobody retypes anything. The order a rep raises in the morning is the invoice finance sends in the afternoon.
        </p>

        <div className="relative mt-10">
          <div className="absolute bottom-6 left-[27px] top-6 w-[2px]" style={{ background: 'rgba(255,255,255,0.3)' }} />
          <div className="flex flex-col gap-[24px]">
            {FLOW.map((f, i) => (
              <div key={f.step} className="relative flex items-center gap-5">
                <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full" style={{ background: '#0c2bb8' }}>
                  <Shape name={arts[i]} a={colors[i]} b="#07142e" size={36} />
                </div>
                <div className="flex-1 rounded-[18px] px-5 py-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <p className="text-[16px] font-extrabold" style={{ fontFamily: 'var(--heavy)' }}>
                    <span style={{ color: '#ffbe45' }}>{String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;{f.step}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-snug" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Illustration name="workflow-automation" size={210} ground="#ffffff" style={{ position: 'absolute', right: 48, top: 70 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 9 who */

const WORK_ICON: LucideIcon[] = [Crown, Smartphone, Boxes, Wallet, Store];

function Who({ year }: HandbookProps) {
  return (
    <Page n={9} year={year}>
      <div className="hb-in">
        <Kicker color="#d6457f">05 · Who works in it</Kicker>
        <h2 className="hb-h mt-4 max-w-[470px]" style={{ fontSize: 54 }}>
          Everyone in one place, each in their own space.
        </h2>
        <p className="hb-lead hb-muted mt-5 max-w-[440px]">
          Every person signs in to a workspace made for their job. They see what they need, and nothing they should not.
        </p>

        <div className="mt-10 flex flex-col">
          {WORKSPACES.map((w, i) => (
            <div key={w.who}>
              {i > 0 && <hr className="hb-rule" />}
              <div className="flex items-center gap-5 py-[18px]">
                <IconArt icon={WORK_ICON[i]} id={`hb-${w.who}`} size={50} />
                <div className="flex-1">
                  <p className="flex items-center gap-2.5 text-[17px] font-extrabold" style={{ fontFamily: 'var(--heavy)', letterSpacing: '-0.01em' }}>
                    {w.who}
                    {w.free && (
                      <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white" style={{ background: '#0b9f55', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        Free
                      </span>
                    )}
                  </p>
                  <p className="hb-muted mt-1 text-[13px]">{w.does}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between rounded-[22px] px-7 py-6" style={{ background: '#ffe3ee' }}>
          <p className="hb-h" style={{ fontSize: 26 }}>
            Partner users are free
            <br />
            on every plan.
          </p>
          <Shape name="bloom" a="#ff78a8" b="#ff78a8" size={74} />
        </div>
      </div>
      <Illustration name="team-members" size={190} style={{ position: 'absolute', right: 40, top: 46 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 10 trust */

const TRUST_ICON: LucideIcon[] = [Lock, UsersRound, History, KeyRound, Smartphone, RefreshCw];

function Trust({ year }: HandbookProps) {
  return (
    <Page n={10} year={year} tone="dark">
      <div className="hb-in">
        <Kicker color="#c8f531">06 · Trust and security</Kicker>
        <h2 className="hb-h mt-4 max-w-[480px]" style={{ fontSize: 54 }}>
          Built to be trusted with your numbers.
        </h2>
        <p className="hb-lead hb-muted mt-5 max-w-[430px]">Your prices, your customers and your cash position are the most private things a company has. AfterBI treats them that way.</p>

        <div className="mt-10 grid grid-cols-2 gap-4">
          {TRUST.map((t, i) => (
            <div key={t.title} className="hb-card" style={{ padding: 22 }}>
              <IconArt icon={TRUST_ICON[i]} id={`trust-${t.title}`} size={44} />
              <p className="mt-4 text-[15.5px] font-bold">{t.title}</p>
              <p className="hb-muted mt-1.5 text-[12.5px] leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
      <Illustration name="security-and-privacy" size={196} ground="#ffffff" style={{ position: 'absolute', right: 52, top: 62 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 11 pricing */

function Pricing({ year }: HandbookProps) {
  return (
    <Page n={11} year={year}>
      <div className="hb-in">
        <Kicker color="#f0581a">07 · Plans and pricing</Kicker>
        <h2 className="hb-h mt-4" style={{ fontSize: 54 }}>
          Simple prices, per user,
          <br />
          per month.
        </h2>
        <p className="hb-lead hb-muted mt-5 max-w-[560px]">Every plan includes Standard support, every update and free partner users. Prices are in naira.</p>

        <div className="mt-9 grid grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const dark = Boolean(p.featured);
            return (
              <div
                key={p.id}
                className="relative flex min-h-[480px] flex-col rounded-[24px] p-6"
                style={dark ? { background: '#07142e', color: '#fff' } : { background: '#f6f8fb' }}
              >
                {dark && (
                  <span className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white" style={{ background: '#1238e6' }}>
                    Most chosen
                  </span>
                )}
                <p className="text-[20px] font-extrabold" style={{ fontFamily: 'var(--heavy)' }}>
                  {p.name}
                </p>
                <p className="mt-1 min-h-[38px] text-[12px] leading-snug" style={{ color: dark ? 'rgba(255,255,255,0.7)' : '#44526a' }}>
                  {p.forWho}
                </p>
                <p className="mt-4 font-extrabold leading-none" style={{ fontFamily: 'var(--heavy)', fontSize: 34, letterSpacing: '-0.03em' }}>
                  {naira(p.price ?? p.perUser * p.users)}
                </p>
                <p className="mt-1.5 text-[11.5px] font-semibold" style={{ color: dark ? 'rgba(255,255,255,0.7)' : '#44526a' }}>
                  a month · {naira(p.perUser)} per user · {p.users} users
                </p>
                <p className="mt-3 rounded-[12px] px-3 py-2 text-[11.5px] font-semibold" style={{ background: dark ? 'rgba(255,255,255,0.08)' : '#ffffff' }}>
                  {naira(yearly(p.price ?? p.perUser * p.users))} a year, two months free
                </p>
                <div className="mt-5 flex flex-col gap-2.5 text-[12.8px] leading-snug">
                  {p.includes.map((x) =>
                    x.endsWith(':') ? (
                      <p key={x} className="hb-p font-bold">
                        {x}
                      </p>
                    ) : (
                      <Tick key={x} color={dark ? '#ffbe45' : '#0866f5'}>
                        {x}
                      </Tick>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-4">
          {[
            ['No setup fee', 'We configure everything with you at no charge.'],
            ['Partners free', 'Distributors and retailers sign in at no cost, on every plan.'],
            ['Pay yearly', 'Ten months’ price for twelve: two months free.'],
          ].map(([t, b]) => (
            <div key={t} className="rounded-[18px] p-4" style={{ background: '#fff4d6' }}>
              <p className="text-[13.5px] font-bold">{t}</p>
              <p className="hb-muted mt-1 text-[11.5px] leading-snug">{b}</p>
            </div>
          ))}
        </div>
      </div>
      <Shape name="spark" a="#f0581a" size={70} style={{ position: 'absolute', right: 64, top: 64 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 12 support and custom */

function Support({ year, custom }: HandbookProps) {
  const colors = ['#0866f5', '#7a36f0', '#e23d78'];
  return (
    <Page n={12} year={year} tone="mist">
      <div className="hb-in">
        <Kicker color="#7a36f0">08 · Support and AfterBI Custom</Kicker>
        <h2 className="hb-h mt-4 max-w-[520px]" style={{ fontSize: 50 }}>
          People who answer, when you need them.
        </h2>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {SUPPORT_LEVELS.map((s, i) => (
            <div key={s.id} className="hb-card flex flex-col" style={{ padding: 22, minHeight: 300 }}>
              <span className="h-1.5 w-12 rounded-full" style={{ background: colors[i] }} />
              <p className="mt-4 text-[18px] font-extrabold" style={{ fontFamily: 'var(--heavy)' }}>
                {s.name}
              </p>
              <p className="mt-1 text-[13px] font-bold" style={{ color: colors[i] }}>
                {s.price ? `${naira(s.price)} a month` : 'Included in every plan'}
              </p>
              <div className="mt-5 flex flex-col gap-3 text-[12.8px] leading-snug">
                {s.lines.map((l) => (
                  <Tick key={l} color={colors[i]}>
                    {l}
                  </Tick>
                ))}
              </div>
            </div>
          ))}
        </div>

        {custom.enabled && (
          <div className="relative mt-8 overflow-hidden rounded-[26px] p-9 text-white" style={{ background: '#07142e' }}>
            <Shape name="orbit" a="#7c9cff" b="#ff78a8" size={150} style={{ position: 'absolute', right: -24, bottom: -30, opacity: 0.9 }} />
            <p className="hb-kicker" style={{ color: '#ffbe45' }}>
              Beyond the plans
            </p>
            <p className="hb-h mt-3" style={{ fontSize: 34 }}>
              {custom.name}
            </p>
            <p className="mt-2 max-w-[460px] text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {custom.tagline}
            </p>
            <div className="mt-6 grid max-w-[480px] grid-cols-2 gap-x-6 gap-y-3 text-[12.8px] leading-snug">
              {custom.points.slice(0, 6).map((pt) => (
                <Tick key={pt} color="#ffbe45">
                  {pt}
                </Tick>
              ))}
            </div>
            <p className="mt-6 inline-block rounded-full px-4 py-1.5 text-[12px] font-bold" style={{ background: '#1238e6' }}>
              {custom.priceLine}
            </p>
          </div>
        )}
      </div>
      <Illustration name="customer-support" size={150} style={{ position: 'absolute', right: 52, top: 40 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 13 getting started */

function Start({ year }: HandbookProps) {
  const needs = [
    'Your product list, with pack sizes and price lists',
    'Your depots and opening stock',
    'Your distributors and retailers, with credit limits',
    'The people who will use it, and who approves what',
  ];
  const colors = ['#0866f5', '#e23d78', '#7a36f0', '#0b9f55'];
  return (
    <Page n={13} year={year} tone="cream">
      <div className="hb-in">
        <Kicker color="#b56a00">09 · Getting started</Kicker>
        <h2 className="hb-h mt-4" style={{ fontSize: 56 }}>
          Live in about
          <br />a month.
        </h2>
        <p className="hb-lead hb-muted mt-5 max-w-[440px]">A single site can be live within a week. A larger network usually takes about a month, set up together with you.</p>

        <div className="mt-10 grid grid-cols-4 gap-3">
          {START.map((s, i) => (
            <div key={s.when} className="flex flex-col">
              <span className="h-2 rounded-full" style={{ background: colors[i] }} />
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: colors[i] }}>
                {s.when}
              </p>
              <p className="mt-1 text-[19px] font-extrabold" style={{ fontFamily: 'var(--heavy)' }}>
                {s.title}
              </p>
              <p className="hb-muted mt-1.5 text-[12.8px] leading-snug">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="hb-card mt-10" style={{ padding: 26 }}>
          <p className="text-[17px] font-extrabold" style={{ fontFamily: 'var(--heavy)' }}>
            What we will ask you for
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[12.5px] leading-snug">
            {needs.map((n) => (
              <Tick key={n} color="#f5a30a">
                {n}
              </Tick>
            ))}
          </div>
          <p className="hb-muted mt-5 text-[12px]">A spreadsheet is fine for each. We import it for you.</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-6 overflow-hidden rounded-[26px] px-8 py-7 text-white" style={{ background: '#07142e' }}>
          <div className="flex-1">
            <p className="hb-h" style={{ fontSize: 30 }}>
              Your first month,
              <br />
              with us on hand.
            </p>
            <p className="mt-3 max-w-[330px] text-[12.8px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Every question answered on WhatsApp or email, and every screen with step by step help built in.
            </p>
          </div>
          <Illustration name="onboarding-dashboard" size={170} ground="#ffffff" />
        </div>
      </div>
      <Illustration name="team-onboarding" size={200} style={{ position: 'absolute', right: 44, top: 50 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 14 questions */

function Questions({ year }: HandbookProps) {
  const more = [
    { q: 'Can we pay yearly?', a: 'Yes. A yearly plan is ten months’ price for twelve months: two months free.' },
    { q: 'What happens after we read this?', a: 'Fill in the commitment page and send it to us. We agree the final price and start date with you and sign an agreement together.' },
  ];
  return (
    <Page n={14} year={year}>
      <div className="hb-in">
        <Kicker color="#1593ee">10 · Questions</Kicker>
        <h2 className="hb-h mt-4" style={{ fontSize: 56 }}>
          What companies
          <br />
          ask us first.
        </h2>
        <div className="mt-9 flex flex-col">
          {[...FAQ, ...more].map((f, i) => (
            <div key={f.q}>
              {i > 0 && <hr className="hb-rule" />}
              <div className="grid grid-cols-[230px_1fr] gap-6 py-4">
                <p className="text-[15px] font-bold leading-snug">{f.q}</p>
                <p className="hb-muted text-[13px] leading-relaxed">{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Illustration name="faqs" size={180} style={{ position: 'absolute', right: 44, top: 44 }} />
    </Page>
  );
}

/* ------------------------------------------------------------ 15 commitment */

function Commitment({ year, company }: HandbookProps) {
  const Line = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#44526a]">{label}</p>
      <div className="hb-line flex items-end pb-1 text-[14px] font-semibold">{value}</div>
    </div>
  );
  const Choice = ({ label }: { label: string }) => (
    <span className="flex items-center gap-2 text-[13px] font-semibold">
      <span className="hb-box" /> {label}
    </span>
  );
  return (
    <Page n={15} year={year}>
      <div className="hb-in">
        <Kicker color="#e23d78">11 · Your commitment</Kicker>
        <h2 className="hb-h mt-4" style={{ fontSize: 50 }}>
          Ready when you are.
        </h2>
        <p className="hb-lead hb-muted mt-4 max-w-[560px]">
          Fill this page in and send it to us. It is not a contract: it tells us what you would like, so we can agree the final price and start date with you and sign together.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5">
          <Line label="Company" value={company || undefined} />
          <Line label="Contact person" />
          <Line label="Role" />
          <Line label="Phone" />
          <Line label="Email" />
          <Line label="Preferred start date" />
        </div>

        <div className="mt-8 grid grid-cols-[120px_1fr] items-center gap-y-5">
          <p className="text-[13px] font-bold">Plan</p>
          <div className="flex flex-wrap gap-6">
            {PLANS.map((p) => (
              <Choice key={p.id} label={`${p.name}, ${naira(p.price ?? p.perUser * p.users)}`} />
            ))}
          </div>
          <p className="text-[13px] font-bold">Billing</p>
          <div className="flex flex-wrap gap-6">
            <Choice label="Monthly" />
            <Choice label="Yearly, two months free" />
          </div>
          <p className="text-[13px] font-bold">Support</p>
          <div className="flex flex-wrap gap-6">
            {SUPPORT_LEVELS.map((s) => (
              <Choice key={s.id} label={s.name} />
            ))}
          </div>
          <p className="text-[13px] font-bold">Team size</p>
          <div className="flex gap-8">
            <span className="flex items-end gap-2 text-[13px] font-semibold">
              Users <span className="hb-line inline-block h-6 w-20" />
            </span>
            <span className="flex items-end gap-2 text-[13px] font-semibold">
              Depots <span className="hb-line inline-block h-6 w-20" />
            </span>
            <span className="flex items-end gap-2 text-[13px] font-semibold">
              Distributors <span className="hb-line inline-block h-6 w-20" />
            </span>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#44526a]">Anything we should know</p>
          <div className="mt-2 h-[130px] rounded-[16px] border-[1.5px]" style={{ borderColor: 'rgba(15,31,54,0.28)' }} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-5 rounded-[22px] px-7 py-5 text-white" style={{ background: '#1238e6' }}>
          <Shape name="kite" a="#ffffff" size={42} />
          <p className="text-[13.5px] font-semibold leading-snug">
            Send it to {SUPPORT_EMAIL} or {CONTACT_PHONE}. We reply within two working days.
          </p>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------ 16 back cover */

function Back({ year }: HandbookProps) {
  const shapes: { name: ArtName; a: string; b?: string }[] = [
    { name: 'bloom', a: '#ff78a8' },
    { name: 'kite', a: '#0866f5' },
    { name: 'daisy', a: '#ffbe45', b: '#ff78a8' },
    { name: 'blocks', a: '#7c9cff' },
    { name: 'droplet', a: '#c8f531' },
    { name: 'orbit', a: '#ff78a8', b: '#7c9cff' },
    { name: 'spark', a: '#ffbe45' },
    { name: 'pinwheel', a: '#0866f5' },
    { name: 'fourfold', a: '#ff78a8' },
    { name: 'petals', a: '#ffbe45', b: '#7c9cff' },
    { name: 'leaf', a: '#c8f531' },
    { name: 'cloud', a: '#7c9cff' },
  ];
  return (
    <section className="hb-page is-dark" data-page={16}>
      <div className="absolute left-16 right-16 top-[120px] grid grid-cols-4 gap-x-10 gap-y-10 opacity-95">
        {shapes.map((s, i) => (
          <div key={i} className="flex items-center justify-center">
            <Shape name={s.name} a={s.a} b={s.b} c={s.b} size={92} />
          </div>
        ))}
      </div>
      <div className="absolute bottom-16 left-16 right-16">
        <Wordmark height={44} color="#ffffff" />
        <p className="mt-5 text-[18px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Smart distribution, made simple.™
        </p>
        <div className="mt-10 grid grid-cols-3 gap-6 border-t pt-6 text-[13px]" style={{ borderColor: 'rgba(255,255,255,0.16)' }}>
          {[
            ['Website', SITE_HOST],
            ['Email', SUPPORT_EMAIL],
            ['Phone', CONTACT_PHONE],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="hb-kicker" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {k}
              </p>
              <p className="mt-1.5 font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          The AfterBI Handbook, edition {year}. AfterBI is built by Contoric. Prices and features as published on {SITE_HOST} at the time of download.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ the book */

/** Every page, in order. */
export function handbookPages(props: HandbookProps): ReactNode[] {
  return [
    <Cover key={1} {...props} />,
    <Contents key={2} {...props} />,
    <Why key={3} {...props} />,
    <Platform key={4} {...props} />,
    <Group key={5} {...props} index={0} />,
    <Group key={6} {...props} index={1} />,
    <Group key={7} {...props} index={2} />,
    <Day key={8} {...props} />,
    <Who key={9} {...props} />,
    <Trust key={10} {...props} />,
    <Pricing key={11} {...props} />,
    <Support key={12} {...props} />,
    <Start key={13} {...props} />,
    <Questions key={14} {...props} />,
    <Commitment key={15} {...props} />,
    <Back key={16} {...props} />,
  ];
}

export { Badge };
