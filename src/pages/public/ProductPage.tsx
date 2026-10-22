/**
 * /features: every module, grouped the way the product menu groups them.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { IconBadge, ModuleIcon, PictureFallback, Section, SectionHead, SiteImage } from '@/components/marketing/site-ui';
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

          <SiteImage
            slot="features-hero"
            alt="The AfterBI platform"
            eager
            width={1400}
            className="mx-auto mt-12 aspect-[21/9] max-w-6xl rounded-[2rem] shadow-[0_30px_70px_-34px_rgba(15,31,54,0.45)]"
            fallback={<PictureFallback tone="dark" />}
          />
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
                    <div className="relative">
                      <SiteImage
                        slot={`module-${slug}` as SiteImageKey}
                        alt={`${m.name} in AfterBI`}
                        className="aspect-[16/10]"
                        fallback={<ModuleMock slug={slug} />}
                      />
                      <IconBadge>
                        <ModuleIcon slug={slug} size={17} />
                      </IconBadge>
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <h3 className="font-display text-[1.4rem] font-extrabold tracking-[-0.03em] text-navy-900">{m.name}</h3>
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
            <li key={step.title} className="overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
              <div className="relative">
                <SiteImage
                  slot={`step-${index + 1}`}
                  alt={step.title}
                  width={480}
                  className="aspect-[16/10]"
                  fallback={<PictureFallback tone="dark" />}
                />
                <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 font-display text-[1.05rem] font-extrabold text-white ring-1 ring-white/25">
                  {index + 1}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-[18px] font-bold">{step.title}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-white/70">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
