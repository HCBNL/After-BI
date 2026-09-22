/**
 * `/demo` — the address in the email campaign.
 *
 * Everywhere else "Book a walkthrough" opens the sheet directly, because the
 * person pressing it is already reading. This page is for somebody who arrived
 * cold, so it says what a walkthrough is in four lines and then offers the
 * form. `/demo?demo=1` still opens it immediately.
 */

import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { SUPPORT_EMAIL, WHATSAPP_URL } from '@/lib/site';

const EXPECT = [
  { title: 'Forty minutes', body: 'Thirty watching your own month run through it. Ten of questions.' },
  { title: 'No slides', body: 'We load your price list and terms first, so it is your business on screen.' },
  { title: 'Bring the sceptic', body: 'Operations or finance get more out of it than whoever signs.' },
  { title: 'Then nothing', body: 'No sequence of seven follow-up emails.' },
];

export default function DemoPage() {
  return (
    <>
      <Seo
        title="Book a walkthrough"
        description="Forty minutes on your own price list, your own distributors and your own credit terms."
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
    <section className="relative isolate overflow-hidden pb-16 pt-28 sm:pb-20 sm:pt-32">
      <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="ink-rule pointer-events-none absolute inset-0 -z-10" />

      <div className={container}>
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <Reveal>
            <Headline as="h1" size="lg">
              Bring your hardest month
            </Headline>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-white/65">
              Your price list, your distributors, your credit terms. If it does not do what this site says, you will
              know inside ten minutes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={book} className={btn.green}>
                Pick a day and time
              </button>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer noopener" className={btn.glass}>
                WhatsApp us
              </a>
            </div>

            <p className="mt-7 text-[13.5px] text-white/45">
              Prefer email?{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-white underline decoration-brand-500 decoration-2 underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </Reveal>

          <Reveal delay={120}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {EXPECT.map((item) => (
                <li
                  key={item.title}
                  className="flex min-h-[9rem] flex-col rounded-md bg-night-2 p-5 ring-1 ring-inset ring-white/[0.06]"
                >
                  <span aria-hidden className="block h-[3px] w-7 rounded-full bg-brand-500" />
                  <h2 className="mt-auto pt-6 font-display text-[1.05rem] font-bold tracking-[-0.02em] text-white">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{item.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
