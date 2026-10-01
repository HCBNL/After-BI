/**
 * `/about`, why this exists.
 *
 * The story that produced the software, in three short paragraphs, because
 * the story IS the argument: a quarter that was up eleven per cent and was
 * not. Then four principles, one line each, and the ask.
 */

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Reveal, Stop } from '@/components/marketing/bits';
import { SocialIcon, type SocialName } from '@/components/marketing/SocialIcon';
import { btn, container } from '@/components/marketing/tokens';
import { ABOUT, FOUNDER, PROMISE, SUPPORT_EMAIL } from '@/lib/site';
import { aboutJsonLd } from '@/lib/siteJsonLd';
import { founderLinkList } from '@/lib/siteDoc';
import { imageUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';

/** "linkedin.com": the accessible name and tooltip for a profile link. */
function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

/** Which mark to draw for one of the founder's links. Unknown hosts get a globe. */
function markFor(href: string): SocialName | undefined {
  const host = hostOf(href).toLowerCase();
  if (host.includes('instagram')) return 'instagram';
  if (host.includes('linkedin')) return 'linkedin';
  if (host.includes('facebook') || host.includes('fb.com')) return 'facebook';
  if (host.includes('tiktok')) return 'tiktok';
  if (host.includes('youtube') || host.includes('youtu.be')) return 'youtube';
  if (host === 'x.com' || host.includes('twitter')) return 'x';
  if (host.includes('wa.me') || host.includes('whatsapp')) return 'whatsapp';
  return undefined;
}

export default function AboutPage() {
  return (
    <PublicShell>
      <Body />
    </PublicShell>
  );
}

/**
 * The founder's photograph, faded in once it has loaded. Nothing at all when
 * none is set or it fails: the section is then words, which is a designed
 * state rather than a gap.
 */
function Portrait({ src }: { src: string }) {
  const url = imageUrl(src, { width: 320 });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="mb-3 h-28 w-28 overflow-hidden rounded-full bg-night-2 ring-1 ring-white/12 sm:h-32 sm:w-32">
      <img
        src={url}
        alt={`${FOUNDER.name}, founder of AfterBI`}
        width={128}
        height={128}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn('h-full w-full object-cover object-top transition-opacity duration-700', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  );
}

function Body() {
  const { book, home } = useAsk();
  const photo = home?.aboutFounder?.trim() ?? '';
  const links = founderLinkList(home?.founderLinks);
  const image = photo ? imageUrl(photo, { width: 600 }) : undefined;

  return (
    <>
      {/*
        THE FOUNDER'S NAME IS WRITTEN FOR SEARCH ENGINES TOO.

        In the title, the description, a real heading, the photograph's alt
        text and the Person record in the structured data, spelled the same way
        each time. The photograph and the profile links are the owner's, from
        Platform, Website; without them every one of those still says who
        founded AfterBI.
      */}
      <Seo
        title={`About us: founded by ${FOUNDER.name}`}
        description={`AfterBI was founded by ${FOUNDER.name} and is built in Lagos for Nigerian FMCG distribution: orders, stock, invoices, credit and sell-out.`}
        path="/about"
        image={image}
        jsonLd={aboutJsonLd({ image, sameAs: links })}
      />

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
        is in this page's structured data, see `aboutJsonLd`.
      */}
      <section id="founder" className="scroll-mt-24 py-12 sm:py-16">
        <div className={container}>
          <h2 className="font-display text-[1.9rem] font-extrabold leading-[1.06] tracking-[-0.04em] text-white sm:text-[2.5rem]">
            Built by someone who has run distribution
            <Stop />
          </h2>

          <div className="mt-7 max-w-[72rem]">
            {/* Picture, name and role float together, and the story runs around them. */}
            <div className="float-left mb-4 mr-6 w-28 shrink-0 sm:w-32">
              {photo && <Portrait src={photo} />}
              <h3 className="font-display text-[1rem] font-bold leading-tight tracking-[-0.02em] text-white">
                {FOUNDER.name}
              </h3>
              <p className="mt-0.5 text-[12.5px] leading-snug text-white/55">{FOUNDER.role}</p>

              {links.length > 0 && (
                <ul className="mt-3 flex flex-wrap items-center gap-2">
                  {links.map((href) => {
                    const mark = markFor(href);
                    const host = hostOf(href);
                    return (
                      <li key={href}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener me"
                          aria-label={`${FOUNDER.name} on ${host}`}
                          title={host}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
                        >
                          {mark ? <SocialIcon name={mark} size={15} /> : <Globe size={15} aria-hidden />}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-4 text-[16.5px] leading-[1.75] text-white/72">
              {FOUNDER.story.map((paragraph, index) =>
                index === 0 ? (
                  <p key={index}>
                    <strong className="font-semibold text-white">{FOUNDER.name}</strong>
                    {paragraph.slice(FOUNDER.name.length)}
                  </p>
                ) : (
                  <p key={index}>{paragraph}</p>
                ),
              )}
              <p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-semibold text-white underline decoration-brand-500 decoration-2 underline-offset-4 transition-colors hover:text-brand-300"
                >
                  Write to him
                </a>
              </p>
            </div>
            <div className="clear-both" />
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
