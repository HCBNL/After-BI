/**
 * `/login`, signing in.
 *
 * THE LOOK
 *
 * Laid out like a bank's own sign-in screen on a phone: the wordmark at the
 * top, the heading in the middle, two filled fields with their icons, one big
 * button, and the ways out underneath. Behind it, large and faint, the
 * wordmark itself, the way a bank carries its own name behind the form.
 *
 * The drifting icons this replaces are gone. A field of trucks and cartons
 * wandering behind a form is movement with nothing to say: it competes with
 * the two boxes a person came here to fill in, it never settles, and on a
 * mid-range Android it is eleven animated elements running for as long as
 * somebody takes to find their password. What replaces it is still, is the
 * brand itself, and costs one inline SVG.
 *
 * It follows the visitor's theme, light or dark, with the switch at the top.
 * On a laptop an ink panel on the left says hello and the form sits on the
 * right, on the same ghosted wordmark.
 *
 * ONE LINE UNDER THE FORM, NOT FOUR
 *
 * The fields are ones everybody understands. The only things worth offering
 * under them are the way back to the site and the check for somebody whose
 * sign-in is not working.
 *
 * WHAT DELIBERATELY DID NOT CHANGE
 *
 * All of the account-problem handling. Those five states, no profile, no
 * organisation, a missing organisation, a suspended account, a suspended
 * organisation, are the difference between "this software is broken" and
 * "somebody needs to finish setting you up". They are worded for the public:
 * no database names, ids or settings are ever shown (see authText.ts).
 */

import { siteUrl } from '@/lib/hosts';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PetalBackdrop } from '@/components/brand/PetalBackdrop';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Wordmark } from '@/components/brand/Wordmark';
import { Alert } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth, type AuthProblem } from '@/context/AuthContext';
import { BRAND } from '@/lib/siteMeta';
import { readable, problemText } from './authText';
import { useBootDone } from '@/lib/boot';

/* ------------------------------------------------------- the account problem */

function ProblemBox({ problem, onSignOut }: { problem: AuthProblem; onSignOut: () => void }) {
  const { title, body } = problemText(problem);

  return (
    <div className="rounded-xl border border-gold-400/40 bg-gold-400/10 p-4">
      <p className="text-body font-semibold text-primary">{title}</p>
      <p className="mt-1 text-label leading-relaxed text-secondary">{body}</p>
      {(problem.kind === 'no-profile' || problem.kind === 'no-org' || problem.kind === 'org-missing') && (
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 text-label font-semibold text-secondary underline underline-offset-4 transition-colors hover:text-primary"
        >
          Use a different account
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- the page */

export default function LoginPage() {
  useBootDone();
  const { signIn, signOut, problem } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Fetch the portal's code while the password is being typed, so the first
     screen after signing in is already in the browser. */
  useEffect(() => {
    void import('@/components/layout/AppShell');
    void import('@/pages/home/PortalHome');
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      /*
       * Nothing to navigate to here. This used to send everybody to "/", the
       * public front page, which then had to load the marketing site before
       * anybody could tap "Your portal". The /login route itself now moves a
       * signed-in person straight to their own portal (or back to the portal
       * page they were sent here from) the moment their profile arrives.
       */
    } catch (err) {
      setError(readable((err as { code?: string }).code ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const field =
    'h-14 w-full rounded-xl border bg-[var(--surface-card)] pl-11 pr-4 text-title text-primary shadow-card outline-none transition-colors placeholder:text-muted focus:border-[#1d4ef5] focus:ring-2 focus:ring-[#1d4ef5]/20';
  const year = new Date().getFullYear();

  return (
    <>
      <Seo title="Sign in" description="Sign in to your AfterBI portal." path="/login" noindex />

      <div className="relative min-h-[100dvh] surface-page lg:grid lg:grid-cols-[1.05fr_1fr]">
        {/* ------------------------------------------- laptop: the ink panel */}
        <aside className="ink auth-blue relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
          {/* The PIN screen's petals, turning slowly, on the blue. */}
          <PetalBackdrop className="-z-10 text-white" />

          <Link to={siteUrl('/')} aria-label={`Back to the ${BRAND} home page`} className="w-fit">
            <Wordmark onInk className="text-headline" />
          </Link>

          <div className="pb-10">
            <h2 className="font-display text-jumbo font-bold leading-[1.02] tracking-[-0.045em] text-white xl:text-jumbo">
              Welcome back<span className="text-[#7fb2ff]">.</span>
            </h2>
            <p className="mt-4 max-w-sm text-title leading-relaxed text-white/60">
              Orders, stock, invoices and sell-out, exactly where you left them.
            </p>
          </div>
        </aside>

        {/* ------------------------------------------- the form, on the ghost */}
        <main
          className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* The same petals behind the form, in the page's ink: pale by day, faint white at night. */}
          <PetalBackdrop className="-z-10 text-[#1238e6] opacity-70 dark:text-white dark:opacity-60" />

          <div className="flex items-center justify-between px-5 pt-4 sm:px-8 lg:justify-end">
            <Link to={siteUrl('/')} aria-label={`Back to the ${BRAND} home page`} className="lg:hidden">
              <Wordmark className="text-headline text-primary" />
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitch />
              <ThemeToggle compact />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
            <div className="w-full max-w-[25rem]">
              <h1 className="text-center font-display text-display font-bold leading-[1.1] tracking-[-0.04em] text-primary sm:text-display">
                Sign in to your portal
              </h1>
              <p className="mt-2 text-center text-body text-secondary">
                No account yet?{' '}
                <Link to="/?demo=1" className="font-bold text-[#1d4ef5] hover:underline dark:text-[#8aa8ff]">
                  Create account
                </Link>
              </p>

              <form onSubmit={submit} className="mt-8 space-y-4">
                {problem && <ProblemBox problem={problem} onSignOut={() => void signOut()} />}

                {error && (
                  <Alert tone="critical" title="Could not sign in" defaultOpen>
                    {error}
                  </Alert>
                )}

                <div className="relative">
                  <label htmlFor="login-email" className="sr-only">
                    Email address
                  </label>
                  <Mail
                    size={18}
                    aria-hidden
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    id="login-email"
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

                <div className="relative">
                  <label htmlFor="login-password" className="sr-only">
                    Password
                  </label>
                  <Lock
                    size={18}
                    aria-hidden
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    className={cn(field, 'pr-12', error ? 'border-status-critical' : 'border-hairline')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex justify-end">
                  {/* Carries whatever has been typed, so the reset screen opens
                      with the address already in it. */}
                  <Link
                    to="/forgot-password"
                    state={{ email }}
                    className="text-body font-semibold text-[#1d4ef5] hover:underline dark:text-[#8aa8ff]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="tap inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1d4ef5] text-title font-semibold text-white shadow-card transition-all hover:bg-[#1638c9] active:scale-[0.99] disabled:opacity-60"
                >
                  {busy ? 'Signing in' : 'Sign in'}
                  {!busy && <ArrowRight size={18} aria-hidden />}
                </button>
              </form>

              <p className="mt-6 text-center text-body text-secondary">
                Can’t sign in?{' '}
                <Link
                  to="/help/sign-in"
                  className="font-bold text-primary underline decoration-[#1d4ef5] decoration-2 underline-offset-4"
                >
                  Check my sign-in
                </Link>
              </p>
            </div>
          </div>

          <footer className="px-5 pb-5 text-center text-label text-muted sm:px-8">
            <nav aria-label={BRAND} className="flex items-center justify-center gap-5 font-semibold">
              <Link to={siteUrl('/')} className="transition-colors hover:text-primary">
                Home
              </Link>
              <Link to="/features" className="transition-colors hover:text-primary">
                Features
              </Link>
              <Link to="/?demo=1" className="transition-colors hover:text-primary">
                Create account
              </Link>
            </nav>
            <p className="mt-3">{`© ${year} Contoric. AfterBI is a Contoric product.`}</p>
          </footer>
        </main>
      </div>
    </>
  );
}
