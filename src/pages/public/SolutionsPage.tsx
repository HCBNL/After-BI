/**
 * /solutions: AfterBI by the kind of business, then by category.
 * Each business type has an anchor, so the menu can link straight to it.
 */

import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { btn, container, eyebrow } from '@/components/marketing/tokens';
import { CheckList, IndustryIcon, ModuleIcon, Section, SectionHead, SiteImage } from '@/components/marketing/site-ui';
import { SceneMock } from '@/components/marketing/mocks';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { cn } from '@/lib/cn';
import { INDUSTRIES, MODULES, SOLUTIONS } from '@/lib/site';

export default function SolutionsPage() {
  return (
    <PublicShell>
      <Seo
        title="Solutions"
        description="AfterBI for manufacturers, brand owners, distributors and modern trade suppliers in consumer goods."
        path="/solutions"
        jsonLd={{ '@context': 'https://schema.org', '@graph': [breadcrumbJsonLd('/solutions', 'Solutions')] }}
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
        <div className={cn(container, 'pb-16 pt-14 sm:pb-20 sm:pt-20')}>
          <SectionHead
            as="h1"
            align="center"
            kicker="Solutions"
            title="Built for your part of the value chain"
            body="From manufacturer to modern trade, one platform configured to how you sell."
          />
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SOLUTIONS.map((s) => (
              <a
                key={s.slug}
                href={`#${s.slug}`}
                className="rounded-2xl bg-white px-5 py-4 text-center text-[15px] font-bold text-navy-900 ring-1 ring-navy-900/10 transition-colors hover:bg-navy-900 hover:text-white"
              >
                {s.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {SOLUTIONS.map((s, index) => (
        <Section key={s.slug} id={s.slug} tone={index % 2 ? 'mist' : 'white'}>
          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <SiteImage
                slot={s.image}
                alt={s.name}
                className={cn('aspect-[3/2] rounded-[2rem]', index % 2 === 1 && 'lg:order-2')}
                fallback={<SceneMock slug={s.modules[0]} />}
              />
              <div>
                <p className={eyebrow}>{s.name}</p>
                <h2 className="mt-3 font-display text-[2rem] font-extrabold leading-[1.1] tracking-[-0.035em] text-navy-900 sm:text-[2.5rem]">
                  {s.blurb}
                </h2>
                <CheckList items={s.points} className="mt-6" />
                <p className="mt-8 text-[13px] font-bold uppercase tracking-[0.12em] text-navy-400">Key capabilities</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {s.modules.map((slug) => {
                    const m = MODULES.find((x) => x.slug === slug);
                    return m ? (
                      <li key={slug}>
                        <Link
                          to={`/features/${slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[14px] font-bold text-navy-800 ring-1 ring-navy-900/10 hover:text-brand-700"
                        >
                          <ModuleIcon slug={slug} size={15} /> {m.name}
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
                <button type="button" onClick={book} className={cn(btn.green, 'mt-8')}>
                  Book a demo
                </button>
              </div>
            </div>
          </Reveal>
        </Section>
      ))}

      <Section tone="navy" id="industries">
        <SectionHead
          onDark
          align="center"
          kicker="Industries"
          title="Built for every consumer goods category"
        />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {INDUSTRIES.map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-4 rounded-2xl bg-white/[0.06] p-6 text-center ring-1 ring-inset ring-white/10">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
                <IndustryIcon icon={item.icon} />
              </span>
              <span className="text-[15.5px] font-bold">{item.name}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
