/**
 * `/help/sign-in` — for the person who cannot get in.
 *
 * WHY THIS IS A PAGE AND NOT A PARAGRAPH ON THE SIGN-IN SCREEN
 *
 * The people who reach it are a distributor whose password stopped working
 * and a rep whose account was created last week and never switched on.
 * Neither can get past the sign-in screen to read anything, and neither has
 * anybody to ask at eight in the evening — which is exactly when a distributor
 * checks what they owe.
 *
 * `noindex`: it is for people who have an account, not for search results
 * about signing into somebody else's software.
 */

import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { PublicShell } from '@/components/marketing/kit';
import { Headline, Questions } from '@/components/marketing/bits';
import { btn } from '@/components/marketing/tokens';
import { SOCIAL, SUPPORT_EMAIL } from '@/lib/site';

const TROUBLE = [
  {
    q: 'My email and password do not match an account',
    a: 'Nine times out of ten this is the address rather than the password: people are invited on a work address and try the personal one they actually read. Check which address the invitation arrived at. If you are sure, press “Forgot password?” on the sign-in screen.',
  },
  {
    q: 'I reset my password and no link arrived',
    a: 'Look in spam first. If it is genuinely not there after ten minutes, the likeliest explanation is that there is no account on that exact address — the reset screen deliberately does not tell you either way, because a screen that confirms which addresses have accounts can be used to find out who your customers are.',
  },
  {
    q: 'It says I am not attached to an organisation',
    a: 'The password was right, so the account is real — it just has not been finished. An administrator in your organisation can fix it in about ten seconds. Send them a screenshot: it names exactly what is missing.',
  },
  {
    q: 'It says the account or organisation is suspended',
    a: 'A suspended account was switched off by an administrator in your own organisation, and they can switch it back on. A suspended organisation is a billing matter, and your administrator needs to contact us.',
  },
];

export default function SignInHelpPage() {
  return (
    <>
      <Seo title="Trouble signing in" description="What to do when AfterBI will not let you in." path="/help/sign-in" noindex />

      <PublicShell closing={false}>
        <section className="relative isolate overflow-hidden pb-14 pt-28 sm:pb-16 sm:pt-32">
          <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
          <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
            <Headline as="h1" size="lg" className="max-w-2xl">
              Can’t get in
            </Headline>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-white/65">
              Four things go wrong, in the order they are likely.
            </p>

            <Questions items={TROUBLE} className="mt-10" />

            <div className="mt-12 border-t border-white/10 pt-10">
              <h2 className="font-display text-[1.2rem] font-bold tracking-[-0.025em] text-white">None of those?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/65">
                Tell us the address you are trying and what the screen says. Nobody from AfterBI will ever ask for
                your password.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/login" className={btn.green}>
                  Back to sign in
                </Link>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Trouble%20signing%20in`} className={btn.line}>
                  Email us
                </a>
                <a href={SOCIAL[2].href} target="_blank" rel="noreferrer noopener" className={btn.line}>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </PublicShell>
    </>
  );
}
