/**
 * `/about` — why this exists.
 *
 * The story that produced the software, in three short paragraphs, because
 * the story IS the argument: a quarter that was up eleven per cent and was
 * not. Then four principles, one line each, and the ask.
 */

import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { ABOUT, FOUNDER, PROMISE, SUPPORT_EMAIL } from '@/lib/site';
import { aboutJsonLd } from '@/lib/siteJsonLd';

export default function AboutPage() {
  return (
    <>
      <Seo
        title="About"
        description={`${FOUNDER.name} founded AfterBI after a quarter that looked up eleven per cent and was not. Distribution software for Nigerian FMCG.`}
        path="/about"
        jsonLd={aboutJsonLd()}
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
      <section className="relative isolate overflow-hidden pb-12 pt-28 sm:pb-16 sm:pt-32">
        <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
        <div className={container}>
          <Reveal>
            <Headline as="h1" size="lg" className="max-w-4xl">
              {ABOUT.heading}
            </Headline>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-white/65">{PROMISE}</p>
          </Reveal>
        </div>
      </section>

      <section className="pb-12 sm:pb-16">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          {ABOUT.body.map((paragraph, index) => (
            <Reveal key={paragraph.slice(0, 32)} delay={index * 60}>
              <p
                className={
                  index === 0
                    ? 'text-[18px] leading-[1.7] text-white sm:text-[20px]'
                    : 'mt-5 text-[16.5px] leading-[1.75] text-white/70'
                }
              >
                {paragraph}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/*
        The founder, named, in ordinary indexable markup.

        A distribution business hands this software its order book and its
        credit terms, and the first question a managing director asks is who is
        behind it. "The AfterBI team" is the answer that loses the deal.

        The name is a real heading with real text around it rather than a
        picture or a decorative flourish, because a name that only exists as
        an image is a name no search engine can read. The matching Person node
        is in this page's structured data — see `aboutJsonLd`.
      */}
      <section className="py-8">
        <div className={container}>
          <div className="rounded-md bg-night-2 p-6 ring-1 ring-inset ring-white/[0.06] sm:p-8">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-brand-400">{FOUNDER.role}</p>
            <h2 className="mt-3 font-display text-[1.6rem] font-extrabold tracking-[-0.03em] text-white sm:text-[2rem]">
              {FOUNDER.name}
            </h2>
            <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-white/70">{FOUNDER.bio}</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-5 inline-block text-[14.5px] font-semibold text-white underline decoration-brand-500 decoration-2 underline-offset-4 transition-colors hover:text-brand-300"
            >
              Write to him
            </a>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className={container}>
          <h2 className="font-display text-[1.3rem] font-bold tracking-[-0.025em] text-white sm:text-[1.6rem]">
            How it gets built
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {ABOUT.values.map((value) => (
              <li
                key={value.title}
                className="flex min-h-[9rem] flex-col rounded-md bg-night-2 p-5 ring-1 ring-inset ring-white/[0.06] sm:p-6"
              >
                <span aria-hidden className="block h-[3px] w-7 rounded-full bg-brand-500" />
                <h3 className="mt-auto pt-6 font-display text-[1.05rem] font-bold tracking-[-0.02em] text-white">
                  {value.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{value.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className={container}>
          <div className="flex flex-col gap-6 rounded-md bg-night-2 p-6 ring-1 ring-inset ring-white/[0.06] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-[1.35rem] font-bold tracking-[-0.025em] text-white sm:text-[1.6rem]">
                Come and try to catch us out
              </h2>
              <p className="mt-2 max-w-[34rem] text-[15px] leading-relaxed text-white/65">
                Bring your own price list and your hardest month. Forty minutes.
              </p>
            </div>
            <button type="button" onClick={book} className={btn.light}>
              Book a walkthrough
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
