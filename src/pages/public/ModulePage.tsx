/**
 * `/product/:slug` — one module, on its own address.
 *
 * The visitor this is for did not come through the front door. They typed
 * something specific into a search engine and want one of the eight things
 * this product does. So it opens on that one thing, says it in four lines, and
 * then offers the rest.
 *
 * An unknown slug renders the 404 rather than an empty shell, because a module
 * that was renamed leaves its old address in somebody's bookmarks.
 */

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Reveal } from '@/components/marketing/bits';
import { ModuleCover } from '@/components/marketing/art';
import { btn, container } from '@/components/marketing/tokens';
import { MODULES, moduleBySlug } from '@/lib/site';
import NotFoundPage from './NotFoundPage';

export default function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const item = moduleBySlug(slug);

  if (!item) return <NotFoundPage />;

  return (
    <>
      <Seo title={item.name} description={item.blurb} path={`/product/${item.slug}`} />
      <PublicShell>
        <Body slug={item.slug} />
      </PublicShell>
    </>
  );
}

/**
 * Split out because `useAsk` reads the context the shell provides, and a
 * component that renders `<PublicShell>` is by definition outside it. Called
 * up there it would silently return the default and every button on the page
 * would look fine and do nothing.
 */
function Body({ slug }: { slug: string }) {
  const { book, home } = useAsk();
  const index = MODULES.findIndex((entry) => entry.slug === slug);
  const item = MODULES[index];
  const others = MODULES.filter((entry) => entry.slug !== slug).slice(0, 4);
  const pictures = home?.moduleImages ?? {};

  return (
    <>
      <section className="relative isolate overflow-hidden pb-12 pt-28 sm:pb-16 sm:pt-32">
        <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden className="ink-rule pointer-events-none absolute inset-0 -z-10" />

        <div className={container}>
          <Reveal>
            <Link
              to="/product"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white/55 transition-colors hover:text-white"
            >
              <ArrowLeft size={15} aria-hidden />
              All modules
            </Link>
          </Reveal>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
            <Reveal delay={60}>
              <Headline as="h1" size="lg">
                {item.name}
              </Headline>
              <p className="mt-5 text-[17px] leading-[1.7] text-white/70">{item.blurb}</p>

              <ul className="mt-8 space-y-4">
                {item.points.map((point) => (
                  <li key={point} className="flex gap-3.5">
                    <span aria-hidden className="mt-[0.62em] block h-[3px] w-5 shrink-0 rounded-full bg-brand-500" />
                    <span className="text-[15.5px] leading-relaxed text-white/75">{point}</span>
                  </li>
                ))}
              </ul>

              <button type="button" onClick={book} className={`${btn.green} mt-9`}>
                Book a walkthrough
              </button>
            </Reveal>

            <Reveal delay={120}>
              <ModuleCover
                art={item.art}
                image={pictures[item.slug]}
                width={720}
                priority
                className="aspect-[16/10] rounded-lg ring-1 ring-white/[0.07]"
                glyphClassName="h-40 w-48"
              />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className={container}>
          <h2 className="font-display text-[1.3rem] font-bold tracking-[-0.025em] text-white sm:text-[1.6rem]">
            The rest of it
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((other) => (
              <li key={other.slug}>
                <Link to={`/product/${other.slug}`} className="group flex h-full flex-col">
                  <ModuleCover
                    art={other.art}
                    image={pictures[other.slug]}
                    width={420}
                    className="aspect-video rounded-md ring-1 ring-white/[0.06] transition duration-300 group-hover:ring-white/30"
                    glyphClassName="h-20 w-24"
                  />
                  <h3 className="mt-3 font-display text-[1.05rem] font-bold tracking-[-0.02em] text-white">
                    {other.name}
                  </h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">{other.blurb}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
