/**
 * `/demo`, the address in the email campaign.
 *
 * Everywhere else "Book a walkthrough" opens the sheet directly, because the
 * person pressing it is already reading. This page is for somebody who arrived
 * cold, so it says what a walkthrough is in four lines and then offers the
 * form. `/demo?demo=1` still opens it immediately.
 */

import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { cn } from '@/lib/cn';
import { btn, container } from '@/components/marketing/tokens';
import { SiteImage } from '@/components/marketing/site-ui';
import { SUPPORT_EMAIL, WHATSAPP_URL } from '@/lib/site';

const EXPECT = [
  { title: 'Tailored', body: 'Configured with your products and price lists before we meet.' },
  { title: '30 minutes', body: 'A focused tour of the capabilities that matter to you.' },
  { title: 'Your team', body: 'Bring sales, operations and finance. Everyone sees their workspace.' },
  { title: 'No pressure', body: 'A clear proposal afterwards, and nothing more.' },
];

export default function DemoPage() {
  return (
    <>
      <Seo
        title="Book a demo"
        description="A guided AfterBI demo, configured around your products, partners and price lists."
        path="/demo"
      />
      <PublicShell closing={false}>
        <Body />
      </PublicShell>
    </>
  );
}

function Body() {
  const { book } = useAsk();

  return (
    <section className="site-wash">
      <div className={cn(container, 'grid gap-12 pb-20 pt-14 sm:pt-20 lg:grid-cols-2 lg:items-center lg:gap-16')}>
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy-500">Book a demo</p>
          <h1 className="mt-3 font-display text-[2.18rem] font-semibold leading-[1.05] tracking-[-0.04em] text-navy-900 sm:text-[3.02rem]">
            See AfterBI in action<span className="text-brand-700">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-[1.65] text-navy-700/85">
            A guided demo, configured around your products, partners and price lists.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={book} className={btn.accent}>
              Book a demo
            </button>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer noopener" className={btn.outline}>
              WhatsApp us
            </a>
          </div>
          <p className="mt-7 text-[14px] text-navy-500">
            Prefer email?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-navy-900 underline decoration-navy-900/30 underline-offset-4 hover:decoration-navy-900">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Reveal>

        <Reveal delay={120}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {EXPECT.map((item, index) => (
              <li key={item.title} className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-navy-900/10">
                <div className="relative">
                  <SiteImage
                    slot={`demo-${index + 1}`}
                    alt={item.title}
                    width={420}
                    className="aspect-[16/10]"
                  />
                  <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900/90 font-display text-[0.95rem] font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm">
                    0{index + 1}
                  </span>
                </div>
                <div className="p-6">
                  <h2 className="text-[16px] font-semibold text-navy-900">{item.title}</h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-navy-600">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
