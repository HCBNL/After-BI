/**
 * The front page. Words first, plenty of room, no stand-in pictures.
 *
 * Same sections, same order, same words as before; dressed in the owner's
 * site pattern (the one built for Contoric): white ground, a dark band with a
 * curved edge, the owner's own shapes in slow motion walking through the
 * palette, cards that lift, lean or turn over to a second face.
 *
 *   Hero         a tall heavy headline with a flower in it, one short line
 *   FeatureGrid  four cards (tall, two stacked, tall) that turn over on hover
 *   Trust        a turning badge and the three promises (and logos, when added)
 *   Lifecycle    four tabs (Sales, Operations, Finance, Intelligence) as a bento
 *   Values       a dark curved band; six coloured cards that turn over on hover
 *   Voices       the owner's own words, in the dashed frame that leans
 *   Leaders      heads of other companies, as cards (from Platform, Website)
 *   Videos       the films
 *   Questions    the FAQ
 *
 * Kept quiet on purpose: one weight for headings (semibold), one artwork per
 * section at most, and pictures only where the owner uploads them.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Truck,
  Undo2,
  Warehouse,
  BarChart3,
  Boxes,
  Check,
  Landmark,
  MessageCircle,
  Quote,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Seo } from '@/components/Seo';
import { faqJsonLd, homeJsonLd } from '@/lib/siteJsonLd';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { GetApp } from '@/components/marketing/GetApp';
import { Reveal } from '@/components/marketing/bits';
import { container } from '@/components/marketing/tokens';
import { Accordion, Section, SectionHead, SiteImage } from '@/components/marketing/site-ui';
import { VideoCard } from '@/components/marketing/VideoCard';
import { Art, SpinBadge, type ArtName } from '@/components/marketing/art';
import { homeTestimonials, homeVideos } from '@/lib/siteDoc';
import { imageUrl } from '@/lib/cloudinary';
import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';
import { FAQ, HERO, LEADER_QUOTES, META_DESCRIPTION, TABS, TESTIMONIALS, type TabKey } from '@/lib/site';

export default function HomePage() {
  return (
    <>
      <Seo
        title="AfterBI: the sales and distribution platform"
        description={META_DESCRIPTION}
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [...(homeJsonLd()['@graph'] as Record<string, unknown>[]), faqJsonLd(FAQ)],
        }}
      />
      <PublicShell>
        <Hero />
        <FeatureGrid />
        <Trust />
        <Lifecycle />
        <Values />
        <Voices />
        <Leaders />
        <Videos />
        <Questions />
      </PublicShell>
    </>
  );
}

/* -------------------------------------------------------------------- hero */

/**
 * PART ONE OF THE FRONT PAGE: a headline, a line, and the feature cards.
 *
 * Built the way PiggyVest's front page is built: a pale ground, a tall heavy
 * headline (Archivo, narrow and tight, see `.site-heavy`) with one of the
 * owner's flowers set inside the words, one short line under it, and nothing
 * else: no buttons, no badges. The header holds the only actions.
 */
function HeadlineFlower() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      focusable="false"
      className="art art-spin mx-[0.02em] inline-block h-[0.78em] w-[0.78em] -translate-y-[0.05em] align-middle"
      style={{ ['--shift' as string]: 1, ['--speed' as string]: 0.45 }}
    >
      <g className="art-a">
        <circle cx="50" cy="50" r="34" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={i} cx={50 + 32 * Math.cos(a)} cy={50 + 32 * Math.sin(a)} r="16" />;
        })}
      </g>
      <circle cx="50" cy="50" r="9" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="bg-[var(--site-top)] pb-14 pt-14 sm:pb-16 sm:pt-20 lg:pb-20 lg:pt-24">
      {/*
        A phone: everything centred, one under another. A laptop: the headline
        on the far left, and on the right a short line about the business with
        the two install buttons under it, as PiggyVest lays theirs out.
      */}
      <div className={cn(container, 'text-center lg:grid lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-16 lg:text-left')}>
        <Reveal>
          <h1 className="site-heavy mx-auto max-w-[11ch] text-[3.15rem] text-navy-900 sm:max-w-[13ch] sm:text-[4.6rem] lg:mx-0 lg:max-w-none lg:text-[5.4rem]">
            The smarter way <HeadlineFlower /> to run distribution.
          </h1>
        </Reveal>
        <Reveal delay={100} className="mt-8 lg:mt-0">
          <p className="mx-auto max-w-[24rem] text-[16.5px] leading-[1.55] text-navy-600 sm:max-w-md sm:text-[17.5px] lg:mx-0">
            AfterBI helps distributors, importers and manufacturers run orders, stock and payments with their reps and partners, from any phone.
          </p>
          <GetApp className="mt-7 justify-center lg:justify-start" />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- feature cards */

/** True on a phone or tablet, where a card turns over on a tap instead of a hover. */
function useTouch(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(hover: none)');
    const on = () => setTouch(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return touch;
}

/**
 * One card with two faces. The first is a picture (uploaded in Platform,
 * Website) or a drawn scene; the second rises over it on hover (a tap on a
 * phone), in its own colour, with one of the owner's shapes in the corner.
 */
function FeatureCard({
  className,
  front,
  back,
  label,
}: {
  className?: string;
  front: ReactNode;
  back: { bg: string; ink?: string; art: ArtName; shift?: number; title: string; body: string; to: string };
  label: string;
}) {
  const touch = useTouch();
  const [flipped, setFlipped] = useState(false);
  return (
    <article
      tabIndex={0}
      aria-label={label}
      data-flipped={flipped}
      onClick={() => touch && setFlipped((v) => !v)}
      className={cn('feature-card relative isolate overflow-hidden rounded-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-navy-900/40', touch && 'cursor-pointer', className)}
    >
      {front}
      <div className="feature-back absolute inset-0 z-10 flex flex-col p-7 sm:p-8" style={{ background: back.bg, color: back.ink ?? '#ffffff' }}>
        <Art name={back.art} shift={back.shift ?? 0} className="h-14 w-14 shrink-0 self-end sm:h-20 sm:w-20 lg:absolute lg:right-6 lg:top-6 lg:h-24 lg:w-24" />
        <h3 className="mt-auto max-w-[16rem] font-display text-[1.65rem] font-bold leading-[1.05] tracking-[-0.03em]">{back.title}</h3>
        <p className="mt-3 max-w-sm text-[15px] leading-[1.6] opacity-80">{back.body}</p>
        <Link
          to={back.to}
          onClick={(e) => e.stopPropagation()}
          className="mt-6 inline-flex w-fit items-center gap-2 text-[14.5px] font-semibold underline decoration-current/30 underline-offset-4 transition-all hover:gap-3"
        >
          Learn more <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

/** A small bright disc of the owner's palette, half off the card's edge. */
function CornerDisc({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn('feature-front-art absolute rounded-full', className)} style={{ background: color }} />;
}

/** The catalogue, drawn: a phone's worth of product rows. Shown until a picture is uploaded. */
function CatalogueScene() {
  const rows = [
    { name: 'Mini fan, 12 inch', price: '₦18,500', tone: '#c8d8ff' },
    { name: 'Rice cooker, 1.8L', price: '₦42,000', tone: '#ffd9e6' },
    { name: 'LED bulb, pack of 4', price: '₦6,200', tone: '#fff0c2' },
    { name: 'Blender, 2 speed', price: '₦27,900', tone: '#d9f5c6' },
  ];
  return (
    <div className="absolute inset-0 bg-[#e9eef5]">
      <CornerDisc color="#ffbe45" className="-bottom-16 -left-16 h-48 w-48 opacity-90" />
      <Art name="bloom" shift={0} motion="none" className="feature-front-art absolute bottom-10 left-6 h-16 w-16" />
      <div className="absolute inset-x-8 top-8 rounded-[1.6rem] border-[6px] border-navy-900 bg-white p-4 shadow-[0_30px_60px_-30px_rgba(15,31,54,0.5)] sm:inset-x-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy-400">Catalogue</p>
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-3 rounded-xl bg-navy-50/70 p-2.5">
              <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: r.tone }} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-navy-800">{r.name}</span>
              <span className="text-[12.5px] font-bold text-navy-900">{r.price}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Finance, drawn: two lines, sold and collected, the gap between them owed. */
function FinanceScene() {
  return (
    <div className="absolute inset-0 bg-[#efe9fb]">
      <CornerDisc color="#ff78a8" className="-bottom-14 -right-12 h-40 w-40 opacity-90" />
      <div className="absolute inset-x-7 top-7 rounded-2xl bg-white p-4 shadow-[0_20px_40px_-26px_rgba(15,31,54,0.45)]">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy-400">Collected</p>
          <p className="font-display text-[1.35rem] font-bold text-navy-900">₦11.9m</p>
        </div>
        <svg viewBox="0 0 300 90" className="mt-2 h-20 w-full" aria-hidden>
          <path d="M0 60 L60 48 L120 66 L180 22 L240 32 L300 44 L300 90 L0 90 Z" fill="#2f6bff" opacity="0.08" />
          <path d="M0 60 L60 48 L120 66 L180 22 L240 32 L300 44" fill="none" stroke="#2f6bff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M0 62 L60 52 L120 72 L180 42 L240 60 L300 84" fill="none" stroke="#0aa158" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
      <Art name="spark" shift={2} className="absolute bottom-8 left-8 h-9 w-9" />
    </div>
  );
}

/** Stock, drawn: four flowers on stems, each holding one part of the warehouse. */
function StockScene() {
  const flowers = [
    { label: 'Depots', icon: Warehouse, color: '#d7c8fb', x: '6%', y: '10%' },
    { label: 'Cartons', icon: Boxes, color: '#c4ecae', x: '50%', y: '6%' },
    { label: 'Deliveries', icon: Truck, color: '#ffe08a', x: '2%', y: '42%' },
    { label: 'Returns', icon: Undo2, color: '#b7e6f8', x: '48%', y: '38%' },
  ];
  return (
    <div className="absolute inset-0 bg-[#eef1f5]">
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M30 40 C40 60, 48 72, 50 88 M72 36 C62 60, 54 72, 50 88 M28 70 C38 78, 46 82, 50 88 M70 66 C60 76, 54 82, 50 88" fill="none" stroke="#f3a7c4" strokeWidth="1.2" />
      </svg>
      <span aria-hidden className="absolute bottom-[4%] left-1/2 h-[12%] w-[34%] -translate-x-1/2 rounded-t-lg bg-[#fcd9e6]" />
      {flowers.map((f, i) => {
        const Icon = f.icon;
        return (
          <div
            key={f.label}
            className="feature-front-art absolute flex h-[38%] w-[46%] flex-col items-center justify-center"
            style={{ left: f.x, top: f.y, transitionDelay: `${i * 40}ms` }}
          >
            <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full">
              <g fill={f.color}>
                <circle cx="50" cy="50" r="34" />
                {Array.from({ length: 8 }, (_, k) => {
                  const a = (k / 8) * Math.PI * 2;
                  return <circle key={k} cx={50 + 32 * Math.cos(a)} cy={50 + 32 * Math.sin(a)} r="16" />;
                })}
              </g>
            </svg>
            <Icon size={24} strokeWidth={2} className="relative text-navy-900" aria-hidden />
            <span className="relative mt-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-navy-900">{f.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Four cards, PiggyVest's grid: one tall card on each side, two stacked in the
 * middle, all the same overall height. On a phone they stack, and a tap turns
 * a card over.
 */
function FeatureGrid() {
  return (
    <section className="bg-[var(--site-top)] pb-16 sm:pb-24">
      <div className={cn(container, 'grid gap-5 lg:h-[38rem] lg:grid-cols-[1fr_1.1fr_1fr] lg:grid-rows-2')}>
        <FeatureCard
          label="Product catalogue"
          className="h-[27rem] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-auto"
          front={
            <>
              <CatalogueScene />
              <SiteImage slot="hero-catalogue" alt="Product catalogue" width={720} className="!absolute inset-0 h-full w-full" />
            </>
          }
          back={{
            bg: '#0f1f36',
            art: 'bloom',
            title: 'Product catalogue',
            body: 'Every product with its carton size, units and price for each tier. Reps and distributors order from the same list.',
            to: '/features/orders',
          }}
        />

        <FeatureCard
          label="Orders and approvals"
          className="min-h-[18rem] lg:col-start-2 lg:row-start-1 lg:min-h-0"
          front={
            <div className="absolute inset-0 flex flex-col bg-[#eef1f5] p-7 sm:p-8">
              <h3 className="font-display text-[1.6rem] font-bold leading-[1.08] tracking-[-0.03em] text-navy-900 sm:text-[1.8rem]">
                Every order,
                <br />
                <span className="text-navy-400">signed in one tap.</span>
              </h3>
              <p className="mt-auto max-w-sm text-[14.5px] leading-[1.6] text-navy-600">
                Raised on any phone, approved by the right person, and tracked until it is paid.
              </p>
            </div>
          }
          back={{
            bg: '#1d4ef5',
            art: 'pinwheel',
            shift: 2,
            title: 'Orders and approvals',
            body: 'Proforma, approval, delivery note and invoice, numbered for you, with who signed each one.',
            to: '/features/orders',
          }}
        />

        <FeatureCard
          label="Finance and analytics"
          className="min-h-[18rem] lg:col-start-2 lg:row-start-2 lg:min-h-0"
          front={
            <>
              <FinanceScene />
              <SiteImage slot="hero-finance" alt="Finance and analytics" width={720} className="!absolute inset-0 h-full w-full" />
            </>
          }
          back={{
            bg: '#0b6b47',
            art: 'daisy',
            shift: 3,
            title: 'Finance and analytics',
            body: 'What was sold, what came in and what is still owed, by month, by customer, by rep.',
            to: '/features/analytics',
          }}
        />

        <FeatureCard
          label="Stock and deliveries"
          className="h-[27rem] lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:h-auto"
          front={
            <>
              <StockScene />
              <SiteImage slot="hero-stock" alt="Stock and deliveries" width={720} className="!absolute inset-0 h-full w-full" />
            </>
          }
          back={{
            bg: '#3a1f8f',
            art: 'orbit',
            shift: 4,
            title: 'Stock and deliveries',
            body: 'Every depot, section and row. Stock counts, adjustments with two signatures, and delivery notes.',
            to: '/features/stock',
          }}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- trust */

/**
 * A turning badge and the three promises. (The customers' logos are on the
 * white card above the footer.) The badge is the owner's trust strip: words round a ring, a spark
 * in the middle.
 */
function Trust() {
  return (
    <section className="bg-white py-12 sm:py-14">
      <div className={cn(container, 'flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-12')}>
        <SpinBadge text="AfterBI · Sales · Stock · Finance ·" className="h-28 w-28 shrink-0">
          <Art name="spark" className="h-[70%] w-[70%]" />
        </SpinBadge>
        <div className="text-center sm:text-left">
          <p className="font-display text-[1.25rem] font-semibold tracking-[-0.02em] text-navy-900 sm:text-[1.45rem]">
            Trusted by sales and distribution teams
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-start">
            {HERO.trust.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[14.5px] font-medium text-navy-700">
                <Check size={15} strokeWidth={2.5} aria-hidden className="text-brand-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- lifecycle */

const TAB_ICONS: Record<TabKey, LucideIcon> = {
  sales: BarChart3,
  operations: Boxes,
  finance: Landmark,
  intelligence: TrendingUp,
};

/* One of the owner's shapes for each tab, moving in the corner of its card. */
const TAB_ART: Record<TabKey, ArtName> = {
  sales: 'dots',
  operations: 'blocks',
  finance: 'pinwheel',
  intelligence: 'ribbon',
};

/**
 * The four tabs as a bento: a tall dark card on the left (the tab's title,
 * its shape turning in the corner) and the points as cards on the right that
 * lift to the pointer.
 */
function Lifecycle() {
  const [active, setActive] = useState<TabKey>('sales');
  const tab = TABS.find((t) => t.key === active) ?? TABS[0];
  const Icon = TAB_ICONS[tab.key];

  return (
    <Section>
      <SectionHead
        align="center"
        kicker="From lead to revenue"
        title="Complete commercial lifecycle management"
      />

      <div className="mt-12 flex justify-center">
        <div role="tablist" aria-label="Lifecycle" className="grid w-full max-w-2xl grid-cols-4 gap-1 rounded-full bg-navy-50 p-1.5 ring-1 ring-inset ring-navy-900/8">
          {TABS.map((t) => {
            const TabIcon = TAB_ICONS[t.key];
            const on = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(t.key)}
                className={cn(
                  'flex h-11 items-center justify-center gap-2 rounded-full px-2 text-[12.5px] font-semibold transition-all sm:text-[14.5px]',
                  on ? 'bg-navy-900 text-white shadow-[0_8px_20px_-10px_rgba(15,31,54,0.6)]' : 'text-navy-600 hover:text-navy-900',
                )}
              >
                <TabIcon size={17} strokeWidth={1.9} aria-hidden className="hidden sm:block" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" key={tab.key} className="mt-10 grid animate-fade-in gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-5">
        <div className="relative isolate flex min-h-[18rem] flex-col overflow-hidden rounded-[2rem] bg-navy-900 p-8 text-white sm:p-10">
          <Art name={TAB_ART[tab.key]} className="pointer-events-none absolute -bottom-8 -right-8 -z-10 h-52 w-52 opacity-90 sm:h-60 sm:w-60" />
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
            <Icon size={20} strokeWidth={1.8} aria-hidden />
          </span>
          <h3 className="mt-6 max-w-md font-display text-[1.6rem] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[1.9rem]">{tab.title}</h3>
          <Link
            to={tab.link}
            className="mt-auto inline-flex w-fit items-center gap-2 pt-8 text-[14.5px] font-semibold text-white underline decoration-white/30 underline-offset-4 transition-all hover:gap-3 hover:decoration-white"
          >
            Learn more <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {tab.points.map((point) => (
            <li
              key={point}
              className="group flex gap-3 rounded-2xl border border-navy-900/10 bg-white p-5 text-[14.5px] leading-snug text-navy-700 transition-all duration-300 hover:-translate-y-1 hover:border-navy-900/25 hover:shadow-[0_18px_40px_-22px_rgba(15,31,54,0.45)] sm:[&:nth-child(odd):last-child]:col-span-2"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-800 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                <Check size={13} strokeWidth={2.6} aria-hidden />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ values */

const VALUES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Workflow, title: 'Built for distribution', body: 'Price tiers, credit limits, depots and partners are how the product thinks, not add-ons.' },
  { icon: ReceiptText, title: 'Every naira traceable', body: 'Each order, invoice and payment carries who did it and when, from first line to last receipt.' },
  { icon: Users, title: 'Partners at no cost', body: 'Distributor and partner sign-ins are free on every plan, so the whole chain can work in one place.' },
  { icon: Smartphone, title: 'Any phone, any depot', body: 'The same screens on a laptop in head office and a phone at the warehouse gate.' },
  { icon: ShieldCheck, title: 'Secure in the cloud', body: 'Each business sees only its own data, and each person only what their role allows.' },
  { icon: MessageCircle, title: 'People you can reach', body: 'Setup, training and support from a team a WhatsApp message away.' },
];

/* The card faces: the owner's palette, each with the ink that reads on it. */
const VALUE_FACES: { bg: string; ink: string; art: ArtName }[] = [
  { bg: '#0866F5', ink: '#ffffff', art: 'bloom' },
  { bg: '#FF78A8', ink: '#07142E', art: 'daisy' },
  { bg: '#FFBE45', ink: '#07142E', art: 'pinwheel' },
  { bg: '#C8F531', ink: '#07142E', art: 'leaf' },
  { bg: '#7C9CFF', ink: '#07142E', art: 'orbit' },
  { bg: '#ffffff', ink: '#07142E', art: 'kite' },
];

/**
 * A dark band with a curved top, lapping over the section above. Six cards in
 * the owner's colours; on a laptop each one turns over to its second face
 * (the sentence) as the pointer reaches it, its shape moving in the corner.
 * On a phone, where there is no pointer, the sentence is simply shown.
 */
function Values() {
  return (
    <section className="site-curve relative isolate overflow-hidden bg-navy-900 py-20 text-white sm:py-28">
      <div className={container}>
        <header className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white/85 ring-1 ring-inset ring-white/15">
            What we hold to
          </p>
          <h2 className="mt-5 font-display text-[1.6rem] font-semibold leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.18rem]">
            Values that run through the product
          </h2>
        </header>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((value, i) => {
            const Icon = value.icon;
            const face = VALUE_FACES[i % VALUE_FACES.length];
            return (
              <Reveal key={value.title} delay={(i % 3) * 80}>
                <article
                  tabIndex={0}
                  className="group relative isolate flex h-full min-h-[15rem] flex-col overflow-hidden rounded-[1.75rem] p-7 outline-none focus-visible:ring-2 focus-visible:ring-white/60 [@media(hover:none)]:pb-28"
                  style={{ background: face.bg, color: face.ink }}
                >
                  {/* The shape sits on a disc of the opposite tone, so as it walks through the
                      palette it never vanishes into a card of its own colour. */}
                  <span
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute -bottom-14 -right-14 -z-10 flex h-40 w-40 items-center justify-center rounded-full transition-transform duration-700 group-hover:-translate-y-3 group-hover:scale-105 sm:-bottom-10 sm:-right-10 sm:h-44 sm:w-44',
                      face.bg === '#ffffff' ? 'bg-navy-900' : 'bg-white/90',
                    )}
                  >
                    <Art name={face.art} shift={i} className="-translate-x-4 -translate-y-4 h-16 w-16 sm:-translate-x-3 sm:-translate-y-3 sm:h-20 sm:w-20" />
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/10 ring-1 ring-inset ring-black/5">
                    <Icon size={20} strokeWidth={1.8} aria-hidden />
                  </span>
                  <h3 className="mt-6 max-w-[14rem] font-display text-[1.3rem] font-semibold leading-[1.15] tracking-[-0.02em]">{value.title}</h3>
                  {/* No pointer (a phone): the sentence is on the face. */}
                  <p className="mt-2 max-w-[17rem] text-[14.5px] leading-[1.6] opacity-85 [@media(hover:hover)]:hidden">{value.body}</p>

                  {/* A pointer: the card turns over to the sentence. */}
                  <div className="absolute inset-0 hidden translate-y-full flex-col justify-end bg-navy-950 p-7 text-white transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:translate-y-0 group-focus-visible:translate-y-0 [@media(hover:hover)]:flex">
                    {/* Keep the face's colour as a thin edge, so the card is still recognisably the same card. */}
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: face.bg }} />
                    <h3 className="font-display text-[1.15rem] font-semibold tracking-[-0.02em]">{value.title}</h3>
                    <p className="mt-2 text-[14.5px] leading-[1.6] text-white/80">{value.body}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ voices */

/** The owner's own words, in the dashed frame that leans. Slides every seven seconds when there is more than one. */
function Voices() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = TESTIMONIALS.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;
  const go = (by: number) => setIndex((i) => (i + by + count) % count);

  return (
    <Section className="site-curve overflow-hidden">
      <SectionHead align="center" kicker="In their words" title="Teams already running on AfterBI" />
      <div className="relative mx-auto mt-14 max-w-4xl">
        <div className="site-tilt relative rounded-[2.25rem] border-2 border-dashed border-navy-900/20 bg-white/60 p-2.5 sm:p-3.5">
          <div
            className="relative overflow-hidden rounded-[1.75rem]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-roledescription="carousel"
          >
            <div className="flex transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ transform: `translateX(-${index * 100}%)` }}>
              {TESTIMONIALS.map((t, i) => (
                <figure
                  key={t.name}
                  aria-hidden={i !== index}
                  className="grid w-full shrink-0 items-center gap-8 rounded-[1.75rem] bg-navy-900 p-7 text-white sm:grid-cols-[auto_1fr] sm:gap-10 sm:p-10"
                >
                  <img
                    src={t.photo}
                    alt={t.name}
                    width={160}
                    height={160}
                    loading="lazy"
                    decoding="async"
                    className="h-28 w-28 rounded-full object-cover ring-4 ring-white/15 sm:h-40 sm:w-40"
                  />
                  <div>
                    <Quote size={26} aria-hidden className="text-brand-500" />
                    <blockquote className="mt-3 font-display text-[1.15rem] font-normal leading-[1.55] text-white sm:text-[1.3rem]">
                      {t.quote}
                    </blockquote>
                    <figcaption className="mt-6">
                      <p className="text-[15px] font-semibold text-white">{t.name}</p>
                      <p className="text-[13.5px] text-white/60">{`${t.role}, ${t.company}`}</p>
                    </figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </div>

        {count > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button type="button" onClick={() => go(-1)} aria-label="Previous" className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-900/15 text-navy-700 hover:border-navy-900">
              <ChevronLeft size={17} aria-hidden />
            </button>
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${t.name}`}
                className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-navy-900' : 'w-1.5 bg-navy-900/25')}
              />
            ))}
            <button type="button" onClick={() => go(1)} aria-label="Next" className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-900/15 text-navy-700 hover:border-navy-900">
              <ChevronRight size={17} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- leaders */

/**
 * Heads of other companies on AfterBI, as cards: three across on a laptop,
 * swiping on a phone. The ones added in Platform, Website come first, then the
 * built in ones (LEADER_QUOTES in lib/site.ts). A card with no photograph yet
 * shows the person's initials.
 */
function Leaders() {
  const { home } = useAsk();
  const added = homeTestimonials(home);
  const names = new Set(added.map((t) => t.name.trim().toLowerCase()));
  const items = [...added, ...LEADER_QUOTES.filter((t) => !names.has(t.name.trim().toLowerCase()))];
  if (items.length === 0) return null;

  return (
    <Section tone="mist">
      <SectionHead align="center" kicker="From the people in charge" title="What business owners say" />
      <div
        className={cn(
          '-mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-auto md:grid md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden',
          items.length === 1 ? 'justify-center md:max-w-md md:grid-cols-1' : items.length === 2 ? 'md:max-w-4xl md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {items.map((t, i) => (
          <figure
            key={`${t.name}-${i}`}
            className="flex w-[82vw] shrink-0 snap-center flex-col rounded-[1.75rem] border border-navy-900/10 bg-white p-7 shadow-[0_18px_40px_-28px_rgba(15,31,54,0.35)] md:w-auto"
          >
            <Quote size={24} aria-hidden className="text-navy-300" />
            <blockquote className="mt-4 flex-1 text-[16px] leading-[1.65] text-navy-800">{t.quote}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-navy-900/10 pt-5">
              {t.photo ? (
                <img
                  src={t.photo.startsWith('/') ? t.photo : imageUrl(t.photo, { width: 112 })}
                  alt={t.name}
                  width={56}
                  height={56}
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-navy-900/10"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[15px] font-semibold text-white">
                  {initials(t.name)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-navy-900">{t.name}</span>
                <span className="block truncate text-[13.5px] text-navy-500">{[t.role, t.company].filter(Boolean).join(', ')}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ videos */

function Videos() {
  const { home } = useAsk();
  const videos = homeVideos(home);
  if (videos.length === 0) return null;
  return (
    <Section>
      <SectionHead
        align="center"
        title="See AfterBI in action"
      />
      <div className="relative isolate mt-10">
        <div className={cn('grid gap-5', videos.length > 1 && 'md:grid-cols-2')}>
          {videos.map((video) => (
            <VideoCard key={video.url} url={video.url} title={video.title} className="rounded-[1.75rem] shadow-[0_30px_60px_-30px_rgba(15,31,54,0.55)]" />
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- questions */

function Questions() {
  return (
    <Section>
      <div className="grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="relative">
          <SectionHead title="Frequently asked questions" body="Still unsure? Book a short walkthrough and ask us anything." />
        </div>
        <Accordion items={FAQ} />
      </div>
    </Section>
  );
}
