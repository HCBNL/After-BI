/**
 * The front page. Words first, plenty of room, no stand-in pictures.
 *
 *   Hero         one wide card in the structure colour, the AfterBI bars behind it
 *   Lifecycle    four tabs (Sales, Operations, Finance, Intelligence)
 *   Values       what the product holds to, in six short lines
 *   Voices       customers in their own words, sliding one to the next
 *   Industries   a card per category
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
import { homeVideos } from '@/lib/siteDoc';
import { cn } from '@/lib/cn';
import { FAQ, HERO, INDUSTRIES, LOGOS, META_DESCRIPTION, TABS, TESTIMONIALS, type TabKey } from '@/lib/site';

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
        <Logos />
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
 * AfterBI bars rising out of the right edge, a lemon glow under them. Type is
 * set for the phone first (large and firm) and eased off on a laptop.
 */
function Hero() {
  const { book } = useAsk();
  return (
    <section className="bg-white pt-4 sm:pt-6">
      <div className={cn(container, 'px-3 sm:px-8')}>
        <div className="site-card-hero relative isolate overflow-hidden rounded-[1.75rem] px-6 pb-12 pt-12 text-white sm:rounded-[2.25rem] sm:px-12 sm:pb-16 sm:pt-16 lg:px-16 lg:pb-20 lg:pt-20">
          <BrandBars className="pointer-events-none absolute -bottom-10 -right-10 -z-10 h-[17rem] w-[17rem] text-white/[0.09] sm:h-[26rem] sm:w-[26rem] lg:-bottom-16 lg:right-6 lg:h-[34rem] lg:w-[34rem]" />
          <BrandBars className="pointer-events-none absolute -left-8 -top-10 -z-10 h-40 w-40 text-white/[0.04] lg:h-56 lg:w-56" />
          <span aria-hidden className="pointer-events-none absolute -bottom-32 right-[12%] -z-10 h-72 w-72 rounded-full bg-[rgb(var(--site-accent))] opacity-25 blur-[90px]" />

          <Reveal className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-medium text-white/85 ring-1 ring-inset ring-white/15">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Sales and distribution platform
            </p>
            <h1 className="mt-5 font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.03em] text-balance sm:text-[3rem] lg:text-[3.5rem] lg:font-medium">
              {HERO.title}
              <span className="text-brand-500">.</span>
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
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- logos */

function Logos() {
  if (LOGOS.length === 0) return null;
  const row = [...LOGOS, ...LOGOS];
  return (
    <section className="border-b border-navy-900/8 bg-white py-10">
      <p className="text-center text-[13.5px] font-medium text-navy-500">Trusted by sales and distribution teams</p>
      <div className="mt-6 overflow-hidden">
        <div className="site-marquee flex w-max items-center gap-14 px-7">
          {row.map((logo, index) => (
            <img key={`${logo.name}-${index}`} src={logo.src} alt={logo.name} loading="lazy" className="h-9 w-auto opacity-70 grayscale" />
          ))}
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

function Lifecycle() {
  const [active, setActive] = useState<TabKey>('sales');
  const tab = TABS.find((t) => t.key === active) ?? TABS[0];
  const Icon = TAB_ICONS[tab.key];

  return (
    <Section>
      <SectionHead align="center" kicker="From lead to revenue" title="Complete commercial lifecycle management" />

      <div role="tablist" aria-label="Lifecycle" className="mt-12 grid grid-cols-4 border-b border-navy-900/10 sm:flex sm:justify-center sm:gap-10">
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
                'relative flex flex-col items-center gap-1.5 px-1 pb-4 pt-1 text-[12.5px] font-medium transition-colors sm:flex-row sm:gap-2 sm:px-2 sm:text-[15px]',
                on ? 'text-navy-900' : 'text-navy-500 hover:text-navy-900',
              )}
            >
              <TabIcon size={19} strokeWidth={1.8} aria-hidden />
              {t.label}
              {on && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-navy-900" />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" key={tab.key} className="mt-12 grid animate-fade-in items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-50 text-navy-800">
            <Icon size={20} strokeWidth={1.8} aria-hidden />
          </span>
          <h3 className="mt-5 font-display text-[1.6rem] font-medium tracking-[-0.025em] text-navy-900 sm:text-[1.9rem]">{tab.title}</h3>
          <Link
            to={tab.link}
            className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-medium text-navy-900 underline decoration-navy-900/30 underline-offset-4 transition-all hover:gap-3 hover:decoration-navy-900"
          >
            Learn more <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-navy-900/10 bg-navy-900/10 sm:grid-cols-2">
          {tab.points.map((point) => (
            <li key={point} className="flex gap-3 bg-white p-5 text-[14.5px] leading-snug text-navy-700 sm:[&:nth-child(odd):last-child]:col-span-2">
              <Check size={16} strokeWidth={2.2} aria-hidden className="mt-0.5 shrink-0 text-brand-700" />
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

function Values() {
  return (
    <Section tone="mist">
      <SectionHead align="center" kicker="What we hold to" title="Values that run through the product" />
      <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {VALUES.map((value) => {
          const Icon = value.icon;
          return (
            <div key={value.title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-navy-800 ring-1 ring-navy-900/10">
                <Icon size={19} strokeWidth={1.7} aria-hidden />
              </span>
              <h3 className="mt-4 text-[16px] font-semibold text-navy-900">{value.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-[1.65] text-navy-700/85">{value.body}</p>
            </div>
          );
        })}
      </div>
    </Section>
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
    <Section>
      <SectionHead align="center" kicker="In their words" title="Teams already running on AfterBI" />
      <div
        className="relative mx-auto mt-14 max-w-4xl overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
      >
        <div className="flex transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ transform: `translateX(-${index * 100}%)` }}>
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.name}
              aria-hidden={i !== index}
              className="grid w-full shrink-0 items-center gap-8 rounded-[1.75rem] border border-navy-900/10 bg-white p-7 sm:grid-cols-[auto_1fr] sm:gap-10 sm:p-10"
            >
              <img
                src={t.photo}
                alt={t.name}
                width={160}
                height={160}
                loading="lazy"
                decoding="async"
                className="h-28 w-28 rounded-full object-cover ring-4 ring-navy-50 sm:h-40 sm:w-40"
              />
              <div>
                <Quote size={26} aria-hidden className="text-brand-700" />
                <blockquote className="mt-3 font-display text-[1.15rem] font-normal leading-[1.55] text-navy-900 sm:text-[1.3rem]">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6">
                  <p className="text-[15px] font-semibold text-navy-900">{t.name}</p>
                  <p className="text-[13.5px] text-navy-500">{`${t.role}, ${t.company}`}</p>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>

        {count > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
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

function Industries() {
  return (
    <Section tone="mist">
      <SectionHead align="center" title="Built for every consumer goods category" />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {INDUSTRIES.map((item) => (
          <Link
            key={item.name}
            to="/solutions#industries"
            className="block rounded-2xl transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(15,31,54,0.45)]"
          >
            <IndustryCard icon={item.icon} name={item.name} />
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
      <SectionHead align="center" title="See AfterBI in action" />
      <div className={cn('mt-10 grid gap-5', videos.length > 1 && 'md:grid-cols-2')}>
        {videos.map((video) => (
          <VideoCard key={video.url} url={video.url} title={video.title} className="rounded-2xl" />
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- questions */

function Questions() {
  return (
    <Section>
      <div className="grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionHead title="Frequently asked questions" body="Still unsure? Book a short walkthrough and ask us anything." />
        <Accordion items={FAQ} />
      </div>
    </Section>
  );
}
