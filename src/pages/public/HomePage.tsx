/**
 * `/` — the front door.
 *
 * WHAT IT IS MODELLED ON, AND WHY
 *
 * A streaming service's home screen: one large cover with words and two
 * buttons, then shelves of things to open, then the questions. Nobody reads a
 * distribution product top to bottom; they look at the big picture, scan a
 * shelf for the one thing they came about, and open it.
 *
 * The page is dark, the way `.ink` always was: a material, not a theme state.
 * The green band and the footer at the bottom are the same on every page.
 *
 * EVERY PICTURE ON IT IS THE OWNER'S
 *
 * The cover slides and the module pictures are set in Platform → Website. The
 * page ships no photograph of its own: until one is uploaded the cover draws
 * its built-in words on a drifting green light and a module draws its own
 * glyph on a dark panel. See `Banner.tsx` and `ModuleCover`.
 *
 * AND IT CLAIMS NOTHING IT CANNOT STAND BEHIND
 *
 * No customer count, no logo wall, no satisfaction figure, no testimonial with
 * a name under it.
 */

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Printer, Signal, Wallet } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { faqJsonLd, homeJsonLd } from '@/lib/siteJsonLd';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Questions, Row, Stop } from '@/components/marketing/bits';
import { ModuleCover } from '@/components/marketing/art';
import { BannerStage } from '@/components/marketing/Banner';
import { btn, container } from '@/components/marketing/tokens';
import { bannerHasContent } from '@/lib/siteDoc';
import { DEFAULT_BANNER, FAQ, META_DESCRIPTION, MODULES, MONTH_STEPS, PROOF, ROOMS, type ProofIcon } from '@/lib/site';

export default function HomePage() {
  return (
    <>
      <Seo
        title="AfterBI — distribution management for FMCG"
        description={META_DESCRIPTION}
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [...(homeJsonLd()['@graph'] as Record<string, unknown>[]), faqJsonLd(FAQ)],
        }}
      />

      <PublicShell overlay>
        <FrontDoor />
      </PublicShell>
    </>
  );
}

const shelfLink = 'text-[13.5px] font-semibold text-white/55 transition-colors hover:text-white';

function FrontDoor() {
  const { book, home } = useAsk();
  const navigate = useNavigate();
  const pictures = home?.moduleImages ?? {};

  /*
   * Nothing is drawn in the cover until `site/home` has answered, so the
   * built-in slide never flashes up for a moment before the owner's own.
   */
  const slides = useMemo(() => {
    if (!home) return [];
    const own = (home.banners ?? []).filter(bannerHasContent);
    return own.length > 0 ? own : DEFAULT_BANNER;
  }, [home]);

  return (
    <>
      <div className="relative h-[86svh] max-h-[760px] min-h-[540px] lg:h-[88svh] lg:max-h-[900px] lg:min-h-[600px]">
        <BannerStage slides={slides} onBook={book} onProduct={() => navigate('/product')} />
      </div>

      <Row
        id="modules"
        title="What it does"
        action={
          <Link to="/product" className={shelfLink}>
            All modules
          </Link>
        }
      >
        {MODULES.map((item) => (
          <ModuleTile key={item.slug} module={item} image={pictures[item.slug]} />
        ))}
      </Row>

      <MonthSteps />
      <Proof />

      <Row id="portals" title="Six portals">
        {ROOMS.map((room) => (
          <div
            key={room.name}
            className="flex w-[78vw] max-w-[22rem] shrink-0 flex-col rounded-md bg-night-2 p-5 ring-1 ring-inset ring-white/[0.06] sm:w-[20rem] lg:w-[23rem] lg:max-w-none"
          >
            <span aria-hidden className="block h-[3px] w-7 rounded-full bg-brand-500" />
            <h3 className="mt-auto pt-6 font-display text-[1.2rem] font-bold tracking-[-0.02em] text-white">
              {room.name}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{room.who}</p>
          </div>
        ))}
      </Row>

      <SignInStrip />
      <FrequentQuestions />
    </>
  );
}

/* ================================================================ the shelf */

/**
 * A card on the shelf. With the owner's picture it is a poster; without one it
 * is the module's own glyph on a dark panel — a designed state, not a gap.
 */
function ModuleTile({
  module: item,
  image,
}: {
  module: (typeof MODULES)[number];
  image?: string;
}) {
  return (
    <Link
      to={`/product/${item.slug}`}
      className="group flex w-[78vw] max-w-[22rem] shrink-0 flex-col sm:w-[20rem] lg:w-[23rem] lg:max-w-none"
    >
      <ModuleCover
        art={item.art}
        image={image}
        width={420}
        className="aspect-video rounded-md ring-1 ring-white/[0.06] transition duration-300 group-hover:ring-white/30"
        glyphClassName="h-20 w-24"
      />
      <h3 className="mt-3 font-display text-[1.05rem] font-bold tracking-[-0.02em] text-white">{item.name}</h3>
      <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">{item.blurb}</p>
    </Link>
  );
}

/* =========================================================== the four steps */

function MonthSteps() {
  return (
    <section aria-labelledby="month-steps" className="py-6 sm:py-8">
      <div className={container}>
        <h2
          id="month-steps"
          className="font-display text-[1.3rem] font-bold tracking-[-0.025em] text-white sm:text-[1.6rem]"
        >
          Your month, in four steps
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {MONTH_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative isolate flex min-h-[9.5rem] flex-col justify-end overflow-hidden rounded-md bg-night-2 p-5 ring-1 ring-inset ring-white/[0.06] sm:min-h-[14.5rem] sm:p-6"
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
  );
}

/* ================================================================= the proof */

const PROOF_ICON: Record<ProofIcon, typeof Signal> = {
  signal: Signal,
  naira: Wallet,
  lock: Lock,
  print: Printer,
};

/** Four properties, four words each. Scanned, not read. */
function Proof() {
  return (
    <section className="py-6 sm:py-8">
      <div className={container}>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {PROOF.map((item) => {
            const Icon = PROOF_ICON[item.icon];
            return (
              <li
                key={item.value}
                className="flex items-center gap-3.5 rounded-md bg-night-2 px-5 py-4 ring-1 ring-inset ring-white/[0.06]"
              >
                <Icon size={19} aria-hidden className="shrink-0 text-brand-400" />
                <span className="text-[14.5px] font-semibold leading-snug text-white/85">{item.value}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ================================================================ the door */

/** For the rep after an order and the distributor after a statement. */
function SignInStrip() {
  return (
    <section className="py-6 sm:py-8">
      <div className={container}>
        <div className="flex flex-col gap-6 rounded-md bg-night-2 p-6 ring-1 ring-inset ring-white/[0.06] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-[1.35rem] font-bold tracking-[-0.025em] text-white sm:text-[1.6rem]">
              Already on AfterBI<Stop />
            </h2>
            <p className="mt-2 max-w-[34rem] text-[15px] leading-relaxed text-white/65">
              Orders, stock and statements are in your organisation’s portal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/login" className={btn.light}>
              Sign in
            </Link>
            <Link
              to="/help/sign-in"
              className="tap inline-flex items-center px-2 text-[14px] font-semibold text-white/60 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
            >
              Can’t sign in?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =============================================================== questions */

function FrequentQuestions() {
  const { book } = useAsk();

  return (
    <section id="faq" className="scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
        <Headline as="h2" size="lg" align="center">
          Frequently asked questions
        </Headline>

        <Questions items={FAQ} className="mt-10" />

        <p className="mt-10 text-center text-[15px] text-white/65">
          Something not answered here?{' '}
          <button
            type="button"
            onClick={book}
            className="font-bold text-white underline decoration-brand-500 decoration-2 underline-offset-4"
          >
            Ask us on a walkthrough
          </button>
          .
        </p>
      </div>
    </section>
  );
}
