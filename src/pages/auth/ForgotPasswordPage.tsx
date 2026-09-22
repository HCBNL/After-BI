/**
 * `/forgot-password` — one screen, one job.
 *
 * Built on exactly the sign-in screen's furniture: the same two columns, the
 * same ink panel, the same ghosted wordmark behind the form, the same field, the same
 * button. It is the screen next door, and a reset page that looks like a
 * different product is how somebody decides they have been phished.
 *
 * WHY THIS IS A PAGE RATHER THAN A BUTTON ON THE SIGN-IN SCREEN
 *
 * It used to be a button. Pressing it reset the password of whatever was in
 * the email field and reported the outcome into the same banner area the
 * sign-in errors used, which had two problems. A person who had typed nothing
 * got told off for it, and a person who had typed the wrong address got a
 * cheerful "a reset link is on its way" for an account that does not exist —
 * in the same place they had just been told their password was wrong. Two
 * operations reporting into one banner is how somebody ends up waiting half an
 * hour for a mail that was never sent.
 *
 * A separate address also gives support somewhere to point. "Go to
 * afterbi.com/forgot-password" is a sentence you can put in a WhatsApp message.
 *
 * WHY IT SAYS THE SAME THING WHETHER THE ACCOUNT EXISTS OR NOT
 *
 * Because a screen that confirms which addresses have accounts can be used to
 * enumerate a competitor's customer list, one address at a time. The failure
 * is swallowed deliberately, and the page says plainly that it is doing so,
 * which is more use to an honest person than a reassurance that might be false.
 */

import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MailCheck, Mail } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { BrandBars } from '@/components/home/HomeArt';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Alert } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/lib/siteMeta';
import { readable } from './authText';
import { Wordmark } from '@/components/brand/Wordmark';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const location = useLocation();

  /* Carried over from the sign-in screen, so somebody who typed their address
     and then realised they had forgotten the password does not type it twice. */
  const handed = (location.state as { email?: string } | null)?.email ?? '';

  const [email, setEmail] = useState(handed);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      /*
       * A malformed address is worth saying out loud — it is a typing mistake,
       * not a disclosure. "No such user" is not, and is reported as success
       * along with every other failure. See the note at the top.
       */
      if (code === 'auth/invalid-email' || code === 'auth/too-many-requests') {
        setError(readable(code));
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const field =
    'h-14 w-full rounded-xl border bg-[var(--surface-card)] pl-11 pr-4 text-[16px] text-primary shadow-card outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
  const year = new Date().getFullYear();

  return (
    <>
      <Seo
        title="Reset your password"
        description="Send yourself a link to set a new AfterBI password."
        path="/forgot-password"
        noindex
      />

      <div className="relative min-h-[100dvh] surface-page lg:grid lg:grid-cols-[1.05fr_1fr]">
        <aside className="ink relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
          <div aria-hidden className="banner-glow absolute -inset-[8%] -z-20 opacity-80" />
          {/* The signature, twice, hung off opposite corners. An abstract
              shape crops well, which is exactly why the wordmark could not do
              this job — see `home/HomeArt.tsx`. */}
          <BrandBars className="brand-bars pointer-events-none absolute -right-28 -top-24 -z-10 h-[34rem] w-[34rem] rotate-[14deg]" />
          <BrandBars className="brand-bars pointer-events-none absolute -bottom-32 -left-24 -z-10 h-[26rem] w-[26rem] -rotate-12" />

          <Link to="/" aria-label={`Back to the ${BRAND} home page`} className="w-fit">
            <Wordmark onInk className="text-[1.6rem]" />
          </Link>

          <div className="pb-10">
            <h2 className="font-display text-[3.4rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-white xl:text-[3.9rem]">
              It happens<span className="text-brand-500">.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-white/60">
              One email, one link, a new password. Your orders and statements are exactly where you left them.
            </p>
          </div>
        </aside>

        <main
          className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <BrandBars className="brand-bars pointer-events-none absolute -right-24 -top-16 -z-10 h-[26rem] w-[26rem] rotate-[14deg] lg:h-[30rem] lg:w-[30rem]" />
          <BrandBars className="brand-bars pointer-events-none absolute -bottom-24 -left-28 -z-10 h-[24rem] w-[24rem] -rotate-12 lg:hidden" />

          <div className="flex items-center justify-between px-5 pt-4 sm:px-8 lg:justify-end">
            <Link to="/" aria-label={`Back to the ${BRAND} home page`} className="lg:hidden">
              <Wordmark className="text-[1.45rem] text-primary" />
            </Link>
            <ThemeToggle compact />
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
            <div className="w-full max-w-[25rem]">
              {sent ? (
                <>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    <MailCheck size={26} aria-hidden />
                  </span>
                  <h1 className="mt-6 text-center font-display text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.04em] text-primary sm:text-[2.1rem]">
                    Check your email
                  </h1>
                  <p className="mt-4 text-center text-[15px] leading-relaxed text-secondary">
                    If there is an AfterBI account for{' '}
                    <strong className="font-semibold text-primary">{email.trim()}</strong>, a link to set a new
                    password is on its way. It expires in an hour.
                  </p>
                  <p className="mt-4 text-center text-[13.5px] leading-relaxed text-muted">
                    We say “if” on purpose: this screen never confirms which addresses have accounts. If nothing
                    arrives within ten minutes, check spam, then check you used the address your invitation came to.
                  </p>

                  <Link
                    to="/login"
                    className="tap mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[16px] font-bold text-white shadow-card transition-all hover:bg-brand-700 active:scale-[0.99]"
                  >
                    Back to sign in
                    <ArrowRight size={18} aria-hidden />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-5 w-full text-center text-[14px] font-bold text-secondary underline underline-offset-4 transition-colors hover:text-primary"
                  >
                    Try a different address
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-center font-display text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.04em] text-primary sm:text-[2.1rem]">
                    Reset your password
                  </h1>
                  <p className="mt-2 text-center text-[14px] text-secondary">
                    Type the address your invitation came to and we will send you a link.
                  </p>

                  <form onSubmit={submit} className="mt-8 space-y-4">
                    {error && (
                      <Alert tone="critical" title="That did not work" defaultOpen>
                        {error}
                      </Alert>
                    )}

                    <div className="relative">
                      <label htmlFor="reset-email" className="sr-only">
                        Email address
                      </label>
                      <Mail
                        size={18}
                        aria-hidden
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                        placeholder="Email address"
                        className={cn(field, error ? 'border-status-critical' : 'border-hairline')}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="tap inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[16px] font-bold text-white shadow-card transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
                    >
                      {busy ? 'Sending' : 'Send the link'}
                      {!busy && <ArrowRight size={18} aria-hidden />}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-[14px] text-secondary">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 font-bold text-primary underline decoration-brand-500 decoration-2 underline-offset-4"
                    >
                      <ArrowLeft size={15} aria-hidden />
                      Back to sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>

          <footer className="px-5 pb-5 text-center text-[12.5px] text-muted sm:px-8">
            <nav aria-label={BRAND} className="flex items-center justify-center gap-5 font-semibold">
              <Link to="/" className="transition-colors hover:text-primary">
                Home
              </Link>
              <Link to="/help/sign-in" className="transition-colors hover:text-primary">
                Trouble signing in
              </Link>
              <Link to="/demo" className="transition-colors hover:text-primary">
                Book a walkthrough
              </Link>
            </nav>
            <p className="mt-3">© {year} AfterBI Technologies Ltd.</p>
          </footer>
        </main>
      </div>
    </>
  );
}
