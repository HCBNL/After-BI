/**
 * /solutions: AfterBI by the kind of business, then by category.
 * Each business type has an anchor, so the menu can link straight to it.
 */

import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { btn, container, eyebrow } from '@/components/marketing/tokens';
import { CheckList, ModuleIcon, Section, SectionHead, SiteImage } from '@/components/marketing/site-ui';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { cn } from '@/lib/cn';
import { MODULES, SOLUTIONS } from '@/lib/site';

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
          <SiteImage
            slot="solutions-hero"
            alt="AfterBI across the value chain"
            eager
            width={1400}
            className="mx-auto mt-10 aspect-[21/9] max-w-6xl rounded-[2rem] shadow-[0_30px_70px_-34px_rgba(15,31,54,0.45)]"
          />
          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2.5">
            {SOLUTIONS.map((s) => (
              <a
                key={s.slug}
                href={`#${s.slug}`}
                className="rounded-full bg-white px-5 py-2.5 text-[14.5px] font-semibold text-navy-900 ring-1 ring-navy-900/10 transition-colors hover:bg-navy-900 hover:text-white"
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
              />
              <div>
                <p className={eyebrow}>{s.name}</p>
                <h2 className="mt-3 font-display text-[1.68rem] font-semibold leading-[1.1] tracking-[-0.035em] text-navy-900 sm:text-[2.1rem]">
                  {s.blurb}
                </h2>
                <CheckList items={s.points} className="mt-6" />
                <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.12em] text-navy-400">Key capabilities</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {s.modules.map((slug) => {
                    const m = MODULES.find((x) => x.slug === slug);
                    return m ? (
                      <li key={slug}>
                        <Link
                          to={`/features/${slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[14px] font-semibold text-navy-800 ring-1 ring-navy-900/10 transition-colors hover:bg-navy-900 hover:text-white"
                        >
                          <ModuleIcon slug={slug} size={15} /> {m.name}
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
                <button type="button" onClick={book} className={cn(btn.accent, 'mt-8')}>
                  Create account
                </button>
              </div>
            </div>
          </Reveal>
        </Section>
      ))}

    </>
  );
}
