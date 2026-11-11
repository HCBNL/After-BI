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
import { btn, container } from '@/components/marketing/tokens';
import { SUPPORT_EMAIL } from '@/lib/site';
import { useBootDone } from '@/lib/boot';

export default function NotFoundPage() {
  useBootDone();
  return (
    <>
      <Seo title="Page not found" description="That address does not exist." path="/404" noindex />

      <PublicShell closing={false}>
        <section className="site-wash pb-28 pt-20 sm:pb-36 sm:pt-28">
          <div className={container}>
            <p className="tabular font-display text-[4.2rem] font-semibold leading-none tracking-[-0.05em] text-navy-100 sm:text-[5.88rem]">404</p>
            <h1 className="mt-4 max-w-2xl font-display text-[2.02rem] font-semibold leading-[1.05] tracking-[-0.04em] text-navy-900 sm:text-[2.69rem]">
              That page is not here
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.65] text-navy-700/85">Check the address, or try one of these.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/" className={btn.accent}>
                Front page
              </Link>
              <Link to="/features" className={btn.outline}>
                Features
              </Link>
              <Link to="/pricing" className={btn.outline}>
                Pricing
              </Link>
            </div>
            <p className="mt-10 text-[14px] text-navy-500">
              Broken link?{' '}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Broken%20link`} className="font-semibold text-navy-900 underline decoration-navy-900/30 underline-offset-4 hover:decoration-navy-900">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </section>
      </PublicShell>
    </>
  );
}
