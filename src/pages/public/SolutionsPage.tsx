/**
 * /solutions: AfterBI by the kind of business, then by category.
 * Each business type has an anchor, so the menu can link straight to it.
 */

import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { btn, container, eyebrow } from '@/components/marketing/tokens';
import { CheckList, IndustryCard, ModuleIcon, PictureFallback, Section, SectionHead, SiteImage } from '@/components/marketing/site-ui';
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
          <SiteImage
            slot="solutions-hero"
            alt="AfterBI across the value chain"
            eager
            width={1400}
            className="mx-auto mt-10 aspect-[21/9] max-w-6xl rounded-[2rem] shadow-[0_30px_70px_-34px_rgba(15,31,54,0.45)]"
            fallback={<PictureFallback tone="dark" />}
          />
          <div className="mx-auto mt-6 grid max-w-6xl grid-cols-2 gap-3 lg:grid-cols-4">
            {SOLUTIONS.map((s) => (
              <a
                key={s.slug}
                href={`#${s.slug}`}
                className="group relative block overflow-hidden rounded-2xl ring-1 ring-navy-900/10 transition-transform hover:-translate-y-0.5"
              >
                <SiteImage
                  slot={s.image}
                  alt={s.name}
                  width={420}
                  className="aspect-[3/2]"
                  imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                  fallback={<SceneMock slug={s.modules[0]} />}
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent px-4 pb-3 pt-10 text-left text-[14.5px] font-bold text-white">
                  {s.name}
                </span>
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
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {INDUSTRIES.map((item) => (
            <IndustryCard key={item.name} icon={item.icon} name={item.name} className="ring-white/10" />
          ))}
        </div>
      </Section>
    </>
  );
}
