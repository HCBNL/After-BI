/**
 * The public 404.
 *
 * Distinct from the one inside the portal, which keeps the shell and offers
 * the way back to that person's own home. Out here the visitor may have no
 * account at all, so the useful answer is the three places they were probably
 * trying to reach. The closing band is off: a page that is already an apology
 * should not also be a pitch.
 */

import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { PublicShell } from '@/components/marketing/kit';
import { Headline } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { SUPPORT_EMAIL } from '@/lib/site';

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="That address does not exist." path="/404" noindex />

      <PublicShell closing={false}>
        <section className="relative isolate overflow-hidden pb-24 pt-32 sm:pb-32 sm:pt-40">
          <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden className="ink-rule pointer-events-none absolute inset-0 -z-10" />

          <div className={container}>
            <p className="tabular font-display text-[4rem] font-extrabold leading-none tracking-[-0.05em] text-white/12 sm:text-[6rem]">
              404
            </p>
            <Headline as="h1" size="lg" className="mt-4 max-w-2xl">
              That page is not here
            </Headline>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-white/65">
              Check the address, or try one of these.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/" className={btn.green}>
                Front page
              </Link>
              <Link to="/product" className={btn.glass}>
                The product
              </Link>
              <Link to="/login" className={btn.glass}>
                Sign in
              </Link>
            </div>

            <p className="mt-10 text-[14px] text-white/45">
              Broken link?{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Broken%20link`}
                className="font-semibold text-white underline decoration-brand-500 decoration-2 underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </section>
      </PublicShell>
    </>
  );
}
