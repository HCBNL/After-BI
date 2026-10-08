/**
 * The front page. Image led, few words.
 *
 *   Hero       deep navy, one line, one ask, a photograph with live cards on it
 *   Lifecycle  four tabs (Sales, Operations, Finance, Intelligence); one picture each
 *   Showcase   one picture, three lines
 *   Industries icons only
 *   Questions  five, closed
 *
 * Every picture is a file in public/site/ (see SITE_IMAGES in lib/site.ts),
 * served with the site itself, so nothing waits on a database read. Until a
 * file exists the slot draws its own stand-in.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BellRing, Boxes, Check, CircleCheck, Landmark, TrendingUp, type LucideIcon } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { faqJsonLd, homeJsonLd } from '@/lib/siteJsonLd';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { Accordion, IndustryIcon, Section, SectionHead, SiteImage } from '@/components/marketing/site-ui';
import { ModuleMock, Phone, PortalScreen, Sparkline } from '@/components/marketing/mocks';
import { VideoCard } from '@/components/marketing/VideoCard';
import { homeVideos } from '@/lib/siteDoc';
import { cn } from '@/lib/cn';
import { FAQ, HERO, INDUSTRIES, LOGOS, META_DESCRIPTION, TABS, type TabKey } from '@/lib/site';

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
        <Showcase />
        <Industries />
        <Videos />
        <Questions />
      </PublicShell>
    </>
  );
}

/* -------------------------------------------------------------------- hero */

function Hero() {
  const { book } = useAsk();
  const title = HERO.title;
  const body = HERO.body;

  return (
    <section className="site-hero relative overflow-hidden text-white">
      <div className={cn(container, 'grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-24')}>
        <Reveal>
          <h1 className="font-display text-[2.9rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance sm:text-[4.2rem] lg:text-[4.8rem]">
            {title}
            <span className="text-brand-500">.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[18px] leading-[1.6] text-white/80 sm:text-[20px]">{body}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={book} className={cn(btn.green, 'h-14 px-8 text-[16px]')}>
              Book a demo
            </button>
            <Link to="/pricing" className={cn(btn.lineWhite, 'h-14 px-8 text-[16px]')}>
              See plans and pricing
            </Link>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
            {HERO.trust.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[14.5px] font-semibold text-white/75">
                <Check size={16} strokeWidth={3} aria-hidden className="text-brand-400" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="relative mx-auto w-full max-w-[34rem] lg:mr-0">
          <HeroPhoto />
          <FloatingCards />
        </Reveal>
      </div>
    </section>
  );
}

/** The photograph, from public/site/hero.* */
function HeroPhoto() {
  const frame = 'relative aspect-[4/5] w-[82%] overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)]';
  return (
    <SiteImage
      slot="hero"
      alt="AfterBI in use"
      eager
      className={frame}
      fallback={
        <div className="relative h-full w-full bg-gradient-to-br from-navy-500 via-navy-700 to-navy-900">
          <div aria-hidden className="site-dark-dots absolute inset-0" />
          <div aria-hidden className="absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-brand-500/35 blur-3xl" />
          <div aria-hidden className="absolute right-0 top-0 h-48 w-48 rounded-full bg-navy-300/30 blur-3xl" />
        </div>
      }
    />
  );
}

/** Live looking cards over the photograph, as on the big platforms' front pages. */
function FloatingCards() {
  const card = 'absolute rounded-2xl bg-white text-navy-900 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)]';
  return (
    <>
      <div className={cn(card, 'site-float right-0 top-[6%] w-[60%] p-4 sm:w-[52%] sm:p-5')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-navy-500 sm:text-[14px]">Order approved</p>
            <p className="font-display text-[1.3rem] font-extrabold leading-tight sm:text-[1.6rem]">₦2,480,000</p>
          </div>
          <CircleCheck size={26} aria-hidden className="shrink-0 text-[#16a34a]" />
        </div>
        <p className="mt-2 text-[12px] font-semibold text-navy-500 sm:text-[13px]">Credit and stock checks passed</p>
      </div>

      <div className={cn(card, 'right-[-2%] top-[38%] hidden w-[58%] p-4 sm:block sm:p-5')} style={{ animationDelay: '1.5s' }}>
        <p className="flex items-center gap-2 text-[14px] font-bold sm:text-[15px]">
          <TrendingUp size={18} aria-hidden className="text-brand-500" /> Sell through
        </p>
        <p className="mt-0.5 text-[12.5px] text-navy-500">Up 12% this month</p>
        <Sparkline className="mt-2 h-14 sm:h-16" />
        <div className="mt-1 flex justify-between text-[9px] font-semibold text-navy-400 sm:text-[10px]">
          {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      <div className={cn(card, 'site-float bottom-[5%] right-0 w-[58%] p-4 sm:right-[6%] sm:w-[52%] sm:p-5')} style={{ animationDelay: '3s' }}>
        <p className="flex items-center gap-2 text-[14px] font-bold sm:text-[15px]">
          <BellRing size={18} aria-hidden className="text-brand-500" /> Automation
        </p>
        <p className="mt-1 text-[12.5px] text-navy-500 sm:text-[13px]">6 reminders sent, 3 approvals cleared</p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------- logos */

function Logos() {
  if (LOGOS.length === 0) return null;
  const row = [...LOGOS, ...LOGOS];
  return (
    <section className="border-b border-navy-900/8 bg-white py-10">
      <p className="text-center text-[14px] font-semibold text-navy-500">Trusted by sales and distribution teams</p>
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

  return (
    <Section>
      <div className="text-center">
        <p className="text-[16px] font-semibold text-navy-500">From lead to revenue</p>
        <h2 className="mt-2 font-display text-[2rem] font-extrabold tracking-[-0.035em] text-navy-900 sm:text-[2.8rem]">
          Complete commercial lifecycle management
        </h2>
      </div>

      <div role="tablist" aria-label="Lifecycle" className="mt-10 grid grid-cols-4 border-b border-navy-900/10 sm:flex sm:justify-center sm:gap-10">
        {TABS.map((t) => {
          const Icon = TAB_ICONS[t.key];
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 px-1 pb-4 pt-1 text-[13px] font-bold transition-colors sm:flex-row sm:gap-2 sm:px-2 sm:text-[19px]',
                on ? 'text-brand-600' : 'text-navy-800 hover:text-brand-600',
              )}
            >
              <Icon size={22} aria-hidden />
              {t.label}
              {on && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" key={tab.key} className="mt-12 grid animate-fade-in items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <h3 className="font-display text-[1.8rem] font-extrabold tracking-[-0.03em] text-navy-900 sm:text-[2.1rem]">{tab.title}</h3>
          <ul className="mt-6 space-y-3.5">
            {tab.points.map((point) => (
              <li key={point} className="flex gap-3 text-[16.5px] leading-snug text-navy-700">
                <span aria-hidden className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full bg-navy-700" />
                {point}
              </li>
            ))}
          </ul>
          <Link to={tab.link} className="mt-8 inline-flex items-center gap-2 text-[16px] font-bold text-brand-600 hover:gap-3 transition-all">
            Learn more <ArrowRight size={18} aria-hidden />
          </Link>
        </div>

        <div className="site-panel rounded-[1.6rem] p-5 sm:p-8">
          <SiteImage
            slot={tab.image}
            alt={tab.title}
            className="aspect-[7/5] rounded-2xl"
            imgClassName="object-contain"
            fallback={<TabArt slug={tab.art} />}
          />
        </div>
      </div>
    </Section>
  );
}

/** The tab picture until a real one is uploaded: a screen with a phone beside it. */
function TabArt({ slug }: { slug: string }) {
  return (
    <div className="relative h-full w-full">
      <ModuleMock slug={slug} className="!bg-none !bg-transparent !p-0 pr-[18%] pt-[4%]" />
      <Phone className="absolute bottom-[2%] right-0 w-[24%]">
        <PortalScreen />
      </Phone>
    </div>
  );
}

/* ---------------------------------------------------------------- showcase */

function Showcase() {
  const { book } = useAsk();
  return (
    <section className="bg-navy-50 py-16 sm:py-24">
      <div className={cn(container, 'grid items-center gap-12 lg:grid-cols-2 lg:gap-16')}>
        <SiteImage
          slot="showcase"
          alt="AfterBI on a phone in a store"
          className="aspect-[6/5] rounded-[2rem]"
          fallback={
            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-700 to-navy-950">
              <div aria-hidden className="site-dark-dots absolute inset-0" />
              <div aria-hidden className="absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
              <Phone className="relative w-[34%]">
                <PortalScreen />
              </Phone>
            </div>
          }
        />
        <div>
          <SectionHead title="Your whole business, in your pocket" body="Reps, managers and partners work from any phone, wherever the business happens." />
          <ul className="mt-7 space-y-3">
            {['Approve orders on the go', 'Live stock and credit, everywhere', 'Partners order without calling you'].map((line) => (
              <li key={line} className="flex items-center gap-3 text-[17px] font-semibold text-navy-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <Check size={14} strokeWidth={3} aria-hidden />
                </span>
                {line}
              </li>
            ))}
          </ul>
          <button type="button" onClick={book} className={cn(btn.green, 'mt-9')}>
            Book a demo
          </button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- industries */

function Industries() {
  return (
    <Section>
      <SectionHead align="center" title="Built for every consumer goods category" />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {INDUSTRIES.map((item) => (
          <Link
            key={item.name}
            to="/solutions"
            className="group flex flex-col items-center gap-4 rounded-2xl p-6 text-center ring-1 ring-navy-900/8 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(15,31,54,0.35)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
              <IndustryIcon icon={item.icon} />
            </span>
            <span className="text-[15px] font-bold text-navy-900">{item.name}</span>
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
    <Section tone="mist">
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
      <div className="mx-auto max-w-3xl">
        <SectionHead align="center" title="Frequently asked questions" />
        <Accordion items={FAQ} className="mt-10" />
      </div>
    </Section>
  );
}
