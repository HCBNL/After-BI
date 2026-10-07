/**
 * `/features/:slug`, one module, on its own address.
 *
 * The visitor came from a search for one specific thing, so it opens on that
 * one thing: the promise and the screen, what it does, which businesses use it
 * most, and the modules next to it. An unknown slug renders the 404.
 */

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { btn, container, eyebrow } from '@/components/marketing/tokens';
import { CheckList, ModuleIcon, Section, SectionHead, SiteImage } from '@/components/marketing/site-ui';
import { ModuleMock } from '@/components/marketing/mocks';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { cn } from '@/lib/cn';
import { MODULES, SOLUTIONS, moduleBySlug, type SiteImageKey } from '@/lib/site';
import NotFoundPage from './NotFoundPage';

export default function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const item = moduleBySlug(slug);

  if (!item) return <NotFoundPage />;

  return (
    <>
      <Seo
        title={item.name}
        description={item.blurb}
        path={`/features/${item.slug}`}
        jsonLd={{ '@context': 'https://schema.org', '@graph': [breadcrumbJsonLd(`/features/${item.slug}`, item.name)] }}
      />
      <PublicShell>
        <Body slug={item.slug} />
      </PublicShell>
    </>
  );
}

function Body({ slug }: { slug: string }) {
  const { book } = useAsk();
  const item = MODULES.find((entry) => entry.slug === slug)!;
  const others = MODULES.filter((entry) => entry.slug !== slug).slice(0, 3);
  const usedBy = SOLUTIONS.filter((s) => s.modules.includes(slug));

  return (
    <>
      <section className="site-wash">
        <div className={cn(container, 'pb-16 pt-10 sm:pb-24 sm:pt-14')}>
          <Link to="/features" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy-500 hover:text-navy-900">
            <ArrowLeft size={15} aria-hidden /> Platform overview
          </Link>

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-bold text-brand-700 ring-1 ring-navy-900/8">
                <ModuleIcon slug={slug} size={15} /> {item.name}
              </span>
              <h1 className="mt-5 font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-navy-900 sm:text-[3.5rem]">
                {item.headline}
              </h1>
              <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-navy-700/85">{item.blurb}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={book} className={btn.green}>
                  Book a demo
                </button>
                <Link to="/pricing" className={btn.outline}>
                  See plans and pricing
                </Link>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <SiteImage
                slot={`module-${slug}` as SiteImageKey}
                alt={`${item.name} in AfterBI`}
                eager
                className="aspect-[16/10] rounded-[1.6rem] shadow-[0_30px_70px_-30px_rgba(15,31,54,0.4)]"
                fallback={<ModuleMock slug={slug} />}
              />
            </Reveal>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHead kicker="What it does" title="Key capabilities" />
          <div className="grid gap-4 sm:grid-cols-2">
            {item.points.map((point, index) => (
              <Reveal key={point} delay={index * 60}>
                <div className="h-full rounded-2xl bg-navy-50 p-6">
                  <span className="font-display text-[1.4rem] font-extrabold text-brand-600">0{index + 1}</span>
                  <p className="mt-3 text-[16.5px] font-semibold leading-snug text-navy-900">{point}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {usedBy.length > 0 && (
        <Section tone="mist">
          <SectionHead kicker="Solutions" title="Who it is built for" />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {usedBy.map((s) => (
              <Link
                key={s.slug}
                to={`/solutions#${s.slug}`}
                className="group rounded-2xl bg-white p-7 ring-1 ring-navy-900/8 transition-shadow hover:shadow-[0_20px_44px_-24px_rgba(15,31,54,0.35)]"
              >
                <p className={eyebrow}>{s.name}</p>
                <p className="mt-2 text-[18px] font-bold text-navy-900">{s.blurb}</p>
                <CheckList items={s.points} className="mt-5" />
                <span className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-bold text-brand-700">
                  See the solution <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section>
        <SectionHead kicker="Works with" title="Related capabilities" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {others.map((m) => (
            <Link
              key={m.slug}
              to={`/features/${m.slug}`}
              className="group flex flex-col rounded-2xl p-7 ring-1 ring-navy-900/10 transition-colors hover:bg-navy-50"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
                <ModuleIcon slug={m.slug} size={20} />
              </span>
              <h3 className="mt-5 text-[19px] font-bold text-navy-900">{m.name}</h3>
              <p className="mt-2 flex-1 text-[15.5px] leading-relaxed text-navy-700/80">{m.blurb}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-bold text-brand-700">
                Learn more <ArrowRight size={15} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
