/**
 * `/pricing` — three plans, priced per organisation.
 *
 * WHY THE PRICE IS ON THE PAGE
 *
 * Everything else in this category hides it behind "contact sales", and every
 * operations director reading this has spent an afternoon on a discovery call
 * to find out a number that turned out to be four times their budget. Printing
 * it costs a few leads that were never going to close and saves the ones that
 * were from a fortnight of qualifying.
 */

import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Questions, Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { cn } from '@/lib/cn';
import { FAQ, PLANS, PRICING_NOTES, naira, type Plan } from '@/lib/site';

/** The two questions a pricing page is actually asked. */
const PRICING_FAQ = FAQ.filter((item) =>
  ['How long does it take to start?', 'Can we get our data out?'].includes(item.q),
);

export default function PricingPage() {
  return (
    <>
      <Seo
        title="Pricing"
        description="Priced per organisation, in naira, with unlimited distributor logins on every plan. From ₦180,000 a month."
        path="/pricing"
      />
      <PublicShell>
        <Body />
      </PublicShell>
    </>
  );
}

function Body() {
  const { book } = useAsk();

  return (
    <>
      <section className="relative isolate overflow-hidden pb-12 pt-28 text-center sm:pb-16 sm:pt-32">
        <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
        <div className={container}>
          <Reveal>
            <Headline as="h1" size="lg" align="center" className="mx-auto max-w-3xl">
              Priced per business, not per person
            </Headline>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.7] text-white/65">
              Distributor logins are free on every plan, and always will be.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-10">
        <div className={container}>
          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 70}>
                <PlanCard plan={plan} onBook={book} />
              </Reveal>
            ))}
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {PRICING_NOTES.map((note) => (
              <li key={note} className="flex gap-2.5 text-[13.5px] leading-relaxed text-white/55">
                <span aria-hidden className="mt-[0.62em] block h-[3px] w-4 shrink-0 rounded-full bg-brand-500" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
          <Headline as="h2" align="center">
            Before you ask us
          </Headline>
          <Questions items={PRICING_FAQ} className="mt-8" />
          <p className="mt-8 text-center text-[15px] text-white/65">
            The rest are{' '}
            <Link to="/#faq" className="font-bold text-white underline decoration-brand-500 decoration-2 underline-offset-4">
              on the front page
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}

function PlanCard({ plan, onBook }: { plan: Plan; onBook: () => void }) {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-md p-6 ring-1 ring-inset sm:p-7',
        plan.featured ? 'bg-night-3 ring-brand-500' : 'bg-night-2 ring-white/[0.06]',
      )}
    >
      {plan.featured && (
        <span className="mb-4 inline-flex w-fit rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-950">
          Most businesses
        </span>
      )}

      <h2 className="font-display text-[1.35rem] font-extrabold tracking-[-0.03em] text-white">{plan.name}</h2>
      <p className="mt-2 min-h-[2.6rem] text-[14px] leading-relaxed text-white/60">{plan.forWho}</p>

      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="tabular font-display text-[2.1rem] font-extrabold leading-none tracking-[-0.04em] text-white">
          {plan.price === null ? 'Let’s talk' : naira(plan.price)}
        </p>
        <p className="mt-2 text-[13px] font-semibold text-white/50">{plan.cadence}</p>
      </div>

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.includes.map((line) => {
          /* A line ending in a colon is a heading inside the list ("Everything
             in Depot, plus:"), so it takes no tick: ticking it would claim it
             is a feature, which it is not. */
          const heading = line.endsWith(':');
          return (
            <li
              key={line}
              className={cn(
                'flex gap-2.5 text-[14px] leading-relaxed',
                heading ? 'pt-2 font-bold text-white' : 'text-white/75',
              )}
            >
              {!heading && <Check size={16} aria-hidden className="mt-[0.2em] shrink-0 text-brand-400" />}
              {line}
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={onBook} className={cn('mt-7 w-full', plan.featured ? btn.green : btn.line)}>
        {plan.cta}
      </button>
    </div>
  );
}
