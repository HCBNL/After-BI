/**
 * The front page. Words first, plenty of room, no stand-in pictures.
 *
 * Same sections, same order, same words as before; dressed in the owner's
 * site pattern (the one built for Contoric): white ground, a dark band with a
 * curved edge, the owner's own shapes in slow motion walking through the
 * palette, cards that lift, lean or turn over to a second face.
 *
 *   Hero         one wide card in the structure colour, the AfterBI bars behind
 *                it, the owner's shapes turning on the right
 *   Trust        a turning badge and the three promises (and logos, when added)
 *   Lifecycle    four tabs (Sales, Operations, Finance, Intelligence) as a bento
 *   Values       a dark curved band; six coloured cards that turn over on hover
 *   Voices       customers in their own words, in a dashed frame that leans
 *   Industries   a card per category, a shape arriving on hover
 *   Videos       the films, with shapes in front and behind
 *   Questions    the FAQ
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
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
import { Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { Accordion, IndustryCard, Section, SectionHead } from '@/components/marketing/site-ui';
import { VideoCard } from '@/components/marketing/VideoCard';
import { BrandBars } from '@/components/home/HomeArt';
import { Art, ArtTile, SpinBadge, type ArtName } from '@/components/marketing/art';
import { homeVideos } from '@/lib/siteDoc';
import { cn } from '@/lib/cn';
import { FAQ, HERO, INDUSTRIES, META_DESCRIPTION, TABS, TESTIMONIALS, type TabKey } from '@/lib/site';

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
        <Trust />
        <Lifecycle />
        <Values />
        <Voices />
        <Industries />
        <Videos />
        <Questions />
      </PublicShell>
    </>
  );
}

/* -------------------------------------------------------------------- hero */

/**
 * A wide card, not a full-bleed band: navy deepening into teal, the four
 * AfterBI bars rising out of the right edge. The headline ends on one of the
 * owner's shapes in a tile, turning, in place of the full stop. On a laptop
 * the right hand side holds a slow arrangement of the shapes; on a phone they
 * sit behind the words, quieter.
 */
function Hero() {
  const { book } = useAsk();
  return (
    <section className="bg-white pt-4 sm:pt-6">
      <div className={cn(container, 'px-3 sm:px-8')}>
        <div className="site-card-hero relative isolate overflow-hidden rounded-[1.75rem] px-6 pb-12 pt-12 text-white sm:rounded-[2.25rem] sm:px-12 sm:pb-16 sm:pt-16 lg:grid lg:grid-cols-[1.3fr_0.7fr] lg:items-center lg:gap-8 lg:px-16 lg:pb-20 lg:pt-20">
          <BrandBars className="pointer-events-none absolute -bottom-10 -right-10 -z-10 h-[17rem] w-[17rem] text-white/[0.06] sm:h-[26rem] sm:w-[26rem] lg:-bottom-16 lg:right-6 lg:h-[34rem] lg:w-[34rem]" />
          <BrandBars className="pointer-events-none absolute -left-8 -top-10 -z-10 h-40 w-40 text-white/[0.04] lg:h-56 lg:w-56" />
          <span aria-hidden className="pointer-events-none absolute -bottom-32 right-[12%] -z-10 h-72 w-72 rounded-full bg-[rgb(var(--site-accent))] opacity-20 blur-[90px]" />

          {/* On a phone the shapes sit behind the words, small and faint. */}
          <div aria-hidden className="pointer-events-none absolute -right-8 top-6 -z-10 h-40 w-40 opacity-40 lg:hidden">
            <Art name="bloom" className="h-full w-full" speed={0.7} />
          </div>
          <Art name="spark" shift={2} className="pointer-events-none absolute right-8 top-44 -z-10 h-8 w-8 opacity-60 lg:hidden" />

          <Reveal className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-medium text-white/85 ring-1 ring-inset ring-white/15">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Sales and distribution platform
            </p>
            <h1 className="mt-5 font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.03em] text-balance sm:text-[3rem] lg:text-[3.5rem] lg:font-medium">
              {HERO.title}
              <ArtTile name="bloom" className="bg-white/12 ring-1 ring-inset ring-white/20" />
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-[1.6] text-white/80 sm:text-[17px] lg:text-[16.5px]">{HERO.body}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={book} className={cn(btn.accent, 'h-12 px-7')}>
                Book a demo
              </button>
              <Link to="/pricing" className={cn(btn.lineWhite, 'h-12 px-7')}>
                See plans and pricing
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {HERO.trust.map((item) => (
                <li key={item} className="flex items-center gap-2 text-[14px] font-medium text-white/75">
                  <Check size={15} strokeWidth={2.5} aria-hidden className="text-brand-500" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <HeroArt />
        </div>
      </div>
    </section>
  );
}

/**
 * The owner's shapes, arranged: a large bloom turning like a slow fan, an
 * orbit with its moon going round, a kite and a cloud drifting, sparks
 * catching the light. Every one walks through the palette on its own clock.
 */
function HeroArt() {
  return (
    <div aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-[24rem] lg:block">
      <span className="absolute inset-[12%] rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/10" />
      <span className="absolute inset-[30%] rounded-full border border-dashed border-white/10" />
      <Art name="bloom" speed={0.6} className="absolute left-[22%] top-[14%] h-[52%] w-[52%] drop-shadow-[0_18px_30px_rgba(0,0,0,0.25)]" />
      <Art name="orbit" shift={1} className="absolute bottom-[4%] left-[2%] h-[30%] w-[30%]" />
      <Art name="kite" shift={3} className="absolute right-[2%] top-[8%] h-[20%] w-[20%]" />
      <Art name="blocks" shift={2} className="absolute bottom-[8%] right-[6%] h-[28%] w-[28%]" />
      <Art name="cloud" shift={4} className="absolute left-[0%] top-[2%] h-[22%] w-[22%]" />
      <Art name="spark" shift={2} className="absolute right-[30%] top-[2%] h-[9%] w-[9%]" />
      <Art name="spark" shift={4} className="absolute bottom-[34%] left-[6%] h-[7%] w-[7%]" />
      <Art name="spark" shift={0} className="absolute bottom-[2%] right-[40%] h-[6%] w-[6%]" />
    </div>
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
          <p className="font-display text-[1.25rem] font-medium tracking-[-0.02em] text-navy-900 sm:text-[1.45rem]">
            Trusted by sales and distribution teams
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-start">
            {HERO.trust.map((item, i) => (
              <li key={item} className="flex items-center gap-2 text-[14.5px] font-medium text-navy-700">
                <Art name={(['bloom', 'pinwheel', 'daisy'] as ArtName[])[i % 3]} shift={i + 1} className="h-4 w-4" />
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
        title={
          <>
            Complete commercial lifecycle management
            <ArtTile name="orbit" shift={1} />
          </>
        }
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
          <Art name="spark" shift={3} className="pointer-events-none absolute right-10 top-10 -z-10 h-7 w-7" />
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
            <Icon size={20} strokeWidth={1.8} aria-hidden />
          </span>
          <h3 className="mt-6 max-w-md font-display text-[1.6rem] font-medium leading-[1.15] tracking-[-0.025em] sm:text-[1.9rem]">{tab.title}</h3>
          <Link
            to={tab.link}
            className="mt-auto inline-flex w-fit items-center gap-2 pt-8 text-[14.5px] font-semibold text-white underline decoration-white/30 underline-offset-4 transition-all hover:gap-3 hover:decoration-white"
          >
            Learn more <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {tab.points.map((point, i) => (
            <li
              key={point}
              className="group flex gap-3 rounded-2xl border border-navy-900/10 bg-white p-5 text-[14.5px] leading-snug text-navy-700 transition-all duration-300 hover:-translate-y-1 hover:border-navy-900/25 hover:shadow-[0_18px_40px_-22px_rgba(15,31,54,0.45)] sm:[&:nth-child(odd):last-child]:col-span-2"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-50 transition-colors group-hover:bg-navy-900">
                <Art name={(['spark', 'bloom', 'pinwheel', 'daisy'] as ArtName[])[i % 4]} shift={i} motion="none" className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-90" />
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
      <Art name="bloom" speed={0.5} className="pointer-events-none absolute -left-24 top-16 -z-10 h-72 w-72 opacity-[0.08]" />
      <Art name="spark" shift={2} className="pointer-events-none absolute right-[8%] top-20 -z-10 h-10 w-10 opacity-70" />
      <div className={container}>
        <header className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white/85 ring-1 ring-inset ring-white/15">
            <Art name="spark" motion="twinkle" className="h-3.5 w-3.5" />
            What we hold to
          </p>
          <h2 className="mt-5 font-display text-[1.6rem] font-medium leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.18rem]">
            Values that run through the product
            <ArtTile name="waves" shift={2} className="bg-white/10 ring-1 ring-inset ring-white/15" />
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
                    <Art name={face.art} shift={i + 2} className="absolute right-6 top-6 h-16 w-16" />
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

/** Customers' own words. Slides itself every seven seconds; pauses on hover. */
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
        <Art name="daisy" shift={1} className="pointer-events-none absolute -left-10 -top-10 h-24 w-24 sm:-left-16 sm:h-32 sm:w-32" />
        <Art name="cloud" shift={3} className="pointer-events-none absolute -bottom-8 -right-6 z-10 h-20 w-20 sm:-right-14 sm:h-28 sm:w-28" />
        <Art name="spark" shift={2} className="pointer-events-none absolute -right-4 top-6 h-8 w-8 sm:-right-10" />
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

/* -------------------------------------------------------------- industries */

const INDUSTRY_ART: ArtName[] = ['bloom', 'daisy', 'pinwheel', 'kite', 'orbit', 'leaf', 'fourfold', 'droplet', 'spark', 'waves', 'petals', 'blocks'];

/** A card per category. A shape arrives in the corner of the one the pointer reaches. */
function Industries() {
  return (
    <Section tone="mist">
      <SectionHead
        align="center"
        title={
          <>
            Built for every consumer goods category
            <ArtTile name="daisy" shift={3} />
          </>
        }
      />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {INDUSTRIES.map((item, i) => (
          <Link
            key={item.name}
            to="/solutions#industries"
            className="group relative block rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(15,31,54,0.45)]"
          >
            <IndustryCard icon={item.icon} name={item.name} />
            <Art
              name={INDUSTRY_ART[i % INDUSTRY_ART.length]}
              shift={i}
              className="pointer-events-none absolute -right-2 -top-3 z-10 h-9 w-9 scale-0 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
            />
          </Link>
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
        title={
          <>
            See AfterBI in action
            <ArtTile name="ripple" shift={1} />
          </>
        }
      />
      <div className="relative isolate mt-10">
        {/* Behind the films and in front of them, moving. */}
        <Art name="orbit" shift={2} className="pointer-events-none absolute -left-8 -top-10 -z-10 h-28 w-28 sm:-left-14 sm:h-40 sm:w-40" />
        <Art name="waves" shift={4} className="pointer-events-none absolute -bottom-10 -right-6 -z-10 h-28 w-28 sm:h-36 sm:w-36" />
        <Art name="cloud" shift={1} className="pointer-events-none absolute -right-5 -top-8 z-10 h-16 w-16 sm:h-24 sm:w-24" />
        <Art name="spark" shift={3} className="pointer-events-none absolute -bottom-5 left-[12%] z-10 h-9 w-9" />
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
          <div aria-hidden className="relative mt-10 hidden h-48 lg:block">
            <Art name="loop" shift={2} className="absolute left-0 top-0 h-36 w-36" />
            <Art name="kite" shift={4} className="absolute left-36 top-16 h-20 w-20" />
            <Art name="spark" shift={1} className="absolute left-28 top-0 h-8 w-8" />
          </div>
        </div>
        <Accordion items={FAQ} />
      </div>
    </Section>
  );
}
