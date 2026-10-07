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
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-700">Book a demo</p>
          <h1 className="mt-3 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-navy-900 sm:text-[3.6rem]">
            See AfterBI in action<span className="text-brand-500">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[18px] leading-[1.65] text-navy-700/85">
            A guided demo, configured around your products, partners and price lists.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={book} className={btn.green}>
              Book a demo
            </button>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer noopener" className={btn.outline}>
              WhatsApp us
            </a>
          </div>
          <p className="mt-7 text-[15px] text-navy-500">
            Prefer email?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-brand-700 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Reveal>

        <Reveal delay={120}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {EXPECT.map((item, index) => (
              <li key={item.title} className="flex min-h-[10rem] flex-col rounded-2xl bg-white p-6 ring-1 ring-navy-900/10">
                <span className="font-display text-[1.4rem] font-extrabold text-brand-600">0{index + 1}</span>
                <h2 className="mt-auto pt-5 text-[18px] font-bold text-navy-900">{item.title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-navy-600">{item.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
