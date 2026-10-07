/**
 * /features: every module, grouped the way the product menu groups them.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { ModuleIcon, Section, SectionHead, SiteImage } from '@/components/marketing/site-ui';
import { ModuleMock } from '@/components/marketing/mocks';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { cn } from '@/lib/cn';
import { MODULES, MONTH_STEPS, PRODUCT_GROUPS, type SiteImageKey } from '@/lib/site';

export default function ProductPage() {
  return (
    <PublicShell>
      <Seo
        title="Platform"
        description="Pipeline, order management, inventory, fulfilment, billing, credit, channel intelligence, analytics and workflow automation on one platform."
        path="/features"
        jsonLd={{ '@context': 'https://schema.org', '@graph': [breadcrumbJsonLd('/features', 'Platform')] }}
      />
      <Body />
    </PublicShell>
  );
}

function Body() {
  const { book } = useAsk();

  return (
    <>
      <section className="site-wash">
        <div className={cn(container, 'pb-16 pt-14 text-center sm:pb-20 sm:pt-20')}>
          <SectionHead
            as="h1"
            align="center"
            kicker="Platform"
            title="One platform. Twelve capabilities"
            body="Sales, operations, finance and intelligence on a single data model."
          />
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={book} className={btn.green}>
              Book a demo
            </button>
            <Link to="/pricing" className={btn.outline}>
              See plans and pricing
            </Link>
          </div>

          <nav aria-label="Modules" className="mt-12 flex flex-wrap justify-center gap-2">
            {MODULES.map((m) => (
              <a
                key={m.slug}
                href={`#${m.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-bold text-navy-700 ring-1 ring-navy-900/10 hover:text-brand-700"
              >
                <ModuleIcon slug={m.slug} size={15} /> {m.name}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {PRODUCT_GROUPS.map((group, groupIndex) => (
        <Section key={group.title} tone={groupIndex % 2 ? 'mist' : 'white'}>
          <SectionHead kicker={`0${groupIndex + 1}`} title={group.title} />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {group.slugs.map((slug, index) => {
              const m = MODULES.find((x) => x.slug === slug);
              if (!m) return null;
              return (
                <Reveal key={slug} delay={(index % 2) * 80}>
                  <Link
                    id={slug}
                    to={`/features/${slug}`}
                    className="group flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.6rem] bg-white ring-1 ring-navy-900/10 transition-shadow hover:shadow-[0_24px_50px_-24px_rgba(15,31,54,0.35)]"
                  >
                    <SiteImage
                      slot={`module-${slug}` as SiteImageKey}
                      alt={`${m.name} in AfterBI`}
                      className="aspect-[16/10]"
                      fallback={<ModuleMock slug={slug} />}
                    />
                    <div className="flex flex-1 flex-col p-7">
                      <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                          <ModuleIcon slug={slug} size={19} />
                        </span>
                        <h3 className="font-display text-[1.4rem] font-extrabold tracking-[-0.03em] text-navy-900">{m.name}</h3>
                      </span>
                      <p className="mt-3 flex-1 text-[16px] leading-relaxed text-navy-700/85">{m.blurb}</p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-bold text-brand-700">
                        Learn more <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Section>
      ))}

      <Section tone="navy">
        <SectionHead onDark align="center" kicker="How it works" title="Live in four steps" />
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MONTH_STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl bg-white/[0.06] p-7 ring-1 ring-inset ring-white/10">
              <span className="font-display text-[2.4rem] font-extrabold leading-none text-brand-400">{index + 1}</span>
              <h3 className="mt-4 text-[18px] font-bold">{step.title}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-white/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
