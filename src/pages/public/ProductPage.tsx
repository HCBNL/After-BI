/**
 * `/product` — the eight modules.
 *
 * A grid, not eight essays. Every card is the module's picture, its name and
 * one line, and the detail is one tap away on its own page — which is where
 * somebody who wants it will go, and where a search engine will land them.
 */

import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Reveal } from '@/components/marketing/bits';
import { ModuleCover } from '@/components/marketing/art';
import { btn, container } from '@/components/marketing/tokens';
import { MODULES, MONTH_STEPS } from '@/lib/site';

export default function ProductPage() {
  return (
    <>
      <Seo
        title="Product"
        description="Orders, sell-out, stock and depots, invoices, credit control, deliveries, targets and the distributor portal."
        path="/product"
      />

      <PublicShell>
        <Body />
      </PublicShell>
    </>
  );
}

function Body() {
  const { book, home } = useAsk();
  const pictures = home?.moduleImages ?? {};

  return (
    <>
      <section className="relative isolate overflow-hidden pb-12 pt-28 sm:pb-16 sm:pt-32">
        <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden className="ink-rule pointer-events-none absolute inset-0 -z-10" />
        <div className={container}>
          <Reveal>
            <Headline as="h1" size="lg" className="max-w-3xl">
              One carton, from the order to the money back
            </Headline>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-white/65">
              Eight modules on one database, one price list and one set of permissions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={book} className={btn.green}>
                Book a walkthrough
              </button>
              <Link to="/pricing" className={btn.glass}>
                See pricing
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-8">
        <div className={container}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((item, index) => (
              <Reveal as="li" key={item.slug} delay={Math.min(index, 4) * 60}>
                <Link to={`/product/${item.slug}`} className="group flex h-full flex-col">
                  <ModuleCover
                    art={item.art}
                    image={pictures[item.slug]}
                    width={420}
                    className="aspect-video rounded-md ring-1 ring-white/[0.06] transition duration-300 group-hover:ring-white/30"
                    glyphClassName="h-20 w-24"
                  />
                  <h2 className="mt-3 font-display text-[1.05rem] font-bold tracking-[-0.02em] text-white">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">{item.blurb}</p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className={container}>
          <h2 className="font-display text-[1.3rem] font-bold tracking-[-0.025em] text-white sm:text-[1.6rem]">
            Your month, in four steps
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {MONTH_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative isolate flex min-h-[9.5rem] flex-col justify-end overflow-hidden rounded-md bg-night-2 p-5 ring-1 ring-inset ring-white/[0.06] sm:min-h-[13rem] sm:p-6"
              >
                <span
                  aria-hidden
                  className="outline-num absolute -right-1 -top-5 -z-10 font-display text-[8.5rem] font-extrabold leading-none tracking-[-0.06em] sm:text-[10rem]"
                >
                  {i + 1}
                </span>
                <h3 className="font-display text-[1.12rem] font-bold tracking-[-0.02em] text-white">{step.title}</h3>
                <p className="mt-1.5 max-w-[17rem] text-[14px] leading-relaxed text-white/65">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
