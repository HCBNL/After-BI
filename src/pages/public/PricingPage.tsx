/**
 * /pricing: three plans, a monthly or yearly switch, and nothing else to read.
 * Yearly is ten months' price (two months free); see `yearly` in lib/site.ts.
 */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { SectionHead } from '@/components/marketing/site-ui';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { cn } from '@/lib/cn';
import { PLANS, PRICING_NOTES, yearly, type Plan } from '@/lib/site';

type Cycle = 'monthly' | 'yearly';

export default function PricingPage() {
  return (
    <>
      <Seo
        title="Pricing"
        description="From ₦7,500 per user a month, with free partner users on every plan."
        path="/pricing"
        jsonLd={{ '@context': 'https://schema.org', '@graph': [breadcrumbJsonLd('/pricing', 'Pricing')] }}
      />
      <PublicShell>
        <Body />
      </PublicShell>
    </>
  );
}

function Body() {
  const { book } = useAsk();
  const [cycle, setCycle] = useState<Cycle>('monthly');

  return (
    <section className="site-wash pb-20">
      <div className={cn(container, 'pt-14 text-center sm:pt-20')}>
        <SectionHead as="h1" align="center" title="Simple, transparent pricing" body="Every plan includes free partner users." />

        <div role="radiogroup" aria-label="Billing" className="mx-auto mt-8 inline-flex rounded-full bg-white p-1.5 shadow-sm ring-1 ring-navy-900/10">
          {(['monthly', 'yearly'] as Cycle[]).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={cycle === value}
              onClick={() => setCycle(value)}
              className={cn(
                'rounded-full px-5 py-2.5 text-[15px] font-bold transition-colors',
                cycle === value ? 'bg-navy-900 text-white' : 'text-navy-600 hover:text-navy-900',
              )}
            >
              {value === 'monthly' ? 'Monthly' : 'Yearly'}
              {value === 'yearly' && (
                <span className={cn('ml-2 rounded-full px-2 py-0.5 text-[11.5px]', cycle === value ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-800')}>
                  2 months free
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={cn(container, 'mt-12 grid gap-5 lg:grid-cols-3')}>
        {PLANS.map((plan, index) => (
          <Reveal key={plan.name} delay={index * 70}>
            <PlanCard plan={plan} cycle={cycle} onBook={book} />
          </Reveal>
        ))}
      </div>

      <ul className={cn(container, 'mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3')}>
        {PRICING_NOTES.map((note) => (
          <li key={note} className="flex items-center gap-2 text-[15px] font-semibold text-navy-600">
            <Check size={17} strokeWidth={3} aria-hidden className="text-brand-500" />
            {note}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "62500" as ₦62,500 and ".00": the kobo printed small, the way big platforms show prices. */
function Price({ amount, size = 'lg' }: { amount: number; size?: 'lg' | 'sm' }) {
  const fixed = amount.toFixed(2);
  const [whole, kobo] = fixed.split('.');
  const big = Number(whole).toLocaleString('en-NG');
  return size === 'lg' ? (
    <span className="tabular font-display font-extrabold leading-none tracking-[-0.04em] text-navy-900">
      <span className="text-[2.7rem]">₦{big}</span>
      <span className="text-[1.1rem]">.{kobo}</span>
    </span>
  ) : (
    <span className="tabular">
      ₦{big}.{kobo}
    </span>
  );
}

function PlanCard({ plan, cycle, onBook }: { plan: Plan; cycle: Cycle; onBook: () => void }) {
  const monthly = plan.price ?? plan.perUser * plan.users;
  const perMonth = cycle === 'yearly' ? yearly(monthly) / 12 : monthly;
  /* The headline is the price per user; the plan's total sits under it. */
  const perUser = perMonth / plan.users;
  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-[1.6rem] bg-white p-8 text-left',
        plan.featured ? 'ring-2 ring-brand-500 shadow-[0_30px_60px_-30px_rgba(238,106,0,0.45)]' : 'ring-1 ring-navy-900/10',
      )}
    >
      {plan.featured && (
        <span className="absolute -top-3.5 left-8 rounded-full bg-brand-500 px-3.5 py-1 text-[12px] font-bold uppercase tracking-[0.1em] text-white">
          Most popular
        </span>
      )}
      <h2 className="font-display text-[1.5rem] font-extrabold tracking-[-0.03em] text-navy-900">{plan.name}</h2>
      <p className="mt-1.5 min-h-[3rem] text-[15px] text-navy-600">{plan.forWho}</p>

      <p className="mt-6 h-6 text-[16px] text-navy-400 line-through">{cycle === 'yearly' ? <Price amount={plan.perUser} size="sm" /> : null}</p>
      <p className="flex items-baseline gap-1.5">
        <Price amount={perUser} />
        <span className="whitespace-nowrap text-[15px] font-semibold text-navy-500">/user/month</span>
      </p>
      <p className="mt-2 min-h-[2.6rem] text-[14.5px] leading-snug text-navy-600">
        {cycle === 'yearly' ? (
          <>
            <Price amount={perMonth} size="sm" /> a month for {plan.users} users. Billed <Price amount={yearly(monthly)} size="sm" /> yearly.
          </>
        ) : (
          <>
            <Price amount={monthly} size="sm" /> a month for {plan.users} users
          </>
        )}
      </p>

      <button type="button" onClick={onBook} className={cn('mt-6 w-full', plan.featured ? btn.green : btn.outline)}>
        {plan.cta}
      </button>

      <ul className="mt-7 flex-1 space-y-3 border-t border-navy-900/8 pt-7">
        {plan.includes.map((line) =>
          line.endsWith(':') ? (
            <li key={line} className="text-[14.5px] font-bold text-navy-900">
              {line}
            </li>
          ) : (
            <li key={line} className="flex gap-2.5 text-[15px] text-navy-700">
              <Check size={17} aria-hidden className="mt-[0.15em] shrink-0 text-brand-500" />
              {line}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
