/**
 * Signing in.
 *
 * Two halves on a laptop: the lit room on the left — the objects of the trade
 * drifting behind a green light — and the form on the right. On a phone the
 * art fills the screen and the form sits on it. Four controls and nothing else.
 *
 * When the password is right but the account is not usable yet (no profile,
 * no organisation, switched off), the screen says exactly which — and for a
 * missing profile it shows the UID to create, which is how the platform owner
 * finishes setting up their own account.
 */
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Copy, Eye, EyeOff } from 'lucide-react';
import { Mark } from '@/components/brand/Mark';
import { AuthArt } from '@/components/brand/AuthArt';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Alert } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth, type AuthProblem } from '@/context/AuthContext';

/** A Firebase auth code, as a sentence somebody can act on. */
function readable(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password do not match an account. Check both, or reset your password.';
    case 'auth/invalid-email':
      return 'That does not look like an email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, or reset your password.';
    case 'auth/network-request-failed':
      return 'We could not reach the server. Check your internet connection.';
    case 'auth/user-disabled':
      return 'This account has been switched off in Firebase Authentication.';
    default:
      return 'We could not sign you in. Try again in a moment.';
  }
}

function problemText(problem: AuthProblem): { title: string; body: string } {
  switch (problem.kind) {
    case 'no-profile':
      return {
        title: 'This sign-in has no profile yet',
        body: 'The password is right, but Firestore has no users document for this account. In Firebase console → Firestore → users, add a document with the ID below. This screen moves on by itself once it exists.',
      };
    case 'no-org':
      return {
        title: 'Not attached to an organisation',
        body: 'This account has no orgId on its profile. The organisation’s administrator, or the platform owner, needs to fix it.',
      };
    case 'org-missing':
      return {
        title: 'The organisation does not exist',
        body: `The profile points at “${problem.orgId}”, but there is no orgs/${problem.orgId} document. Create the organisation from the platform console first.`,
      };
    case 'account-suspended':
      return {
        title: 'This account has been suspended',
        body: 'An administrator in your organisation can switch it back on.',
      };
    case 'org-suspended':
      return {
        title: 'This organisation is suspended',
        body: 'Its AfterBI subscription is on hold, so the portal is closed. Your administrator needs to contact the AfterBI team.',
      };
  }
}

function ProblemBox({ problem, onSignOut }: { problem: AuthProblem; onSignOut: () => void }) {
  const [copied, setCopied] = useState(false);
  const { title, body } = problemText(problem);
  const uid = problem.kind === 'no-profile' ? problem.uid : null;

  return (
    <div className="rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 text-white lg:text-[var(--text-primary)]">
      <p className="text-[14px] font-bold">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-white/75 lg:text-[var(--text-secondary)]">{body}</p>
      {uid && (
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-lg bg-black/25 px-2.5 py-1.5 text-[12.5px] lg:bg-[var(--surface-sunken)]">
            {uid}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(uid).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              });
            }}
            aria-label="Copy the UID"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20 lg:bg-[var(--surface-sunken)]"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      )}
      {(problem.kind === 'no-profile' || problem.kind === 'no-org' || problem.kind === 'org-missing') && (
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 text-[12.5px] font-bold underline underline-offset-4 opacity-80 hover:opacity-100"
        >
          Use a different account
        </button>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { signIn, signOut, resetPassword, problem } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSent(false);
    setBusy(true);
    try {
      await signIn(email, password);
      navigate(redirectTo ?? '/', { replace: true });
    } catch (err) {
      setError(readable((err as { code?: string }).code ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Type your email address first, then press “Forgot password?” again.');
      return;
    }
    try {
      await resetPassword(email);
    } catch {
      /* Reported as sent either way: a sign-in page should not confirm which addresses have accounts. */
    }
    setSent(true);
  };

  const field =
    'w-full border-b bg-transparent px-3 pb-2.5 pt-1 text-[16px] font-semibold outline-none transition-colors ' +
    'text-white placeholder:font-normal placeholder:text-white/35 ' +
    'lg:text-[var(--text-primary)] lg:placeholder:text-[var(--text-muted)] focus:border-brand-500';
  const fieldRule = 'border-white/20 lg:border-[var(--border-strong)]';
  const labelStyle = 'block text-[12.5px] font-bold uppercase tracking-[0.1em] text-white/50 lg:text-[var(--text-muted)]';

  return (
    <div className="relative h-[100dvh] overflow-hidden lg:grid lg:h-auto lg:min-h-[100dvh] lg:grid-cols-2 lg:overflow-visible">
      <aside
        className="absolute inset-0 isolate overflow-hidden bg-[#080a0e] lg:relative lg:inset-auto lg:h-auto"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <AuthArt />

        <div className="relative z-10 hidden h-full flex-col justify-between gap-8 p-10 lg:flex xl:p-12">
          <span className="inline-flex w-fit items-center gap-2.5">
            <Mark size={30} />
            <span className="font-display text-[1.15rem] font-extrabold tracking-[-0.02em] text-white">AfterBI</span>
          </span>

          <div className="lg:pb-14 xl:pb-20">
            <p className="text-[13px] font-semibold text-white/50">Distribution management</p>
            <h2 className="mt-4 font-display text-[3.2rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-white xl:text-[3.6rem]">
              Welcome back.
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/55">
              Orders, stock, invoices and sell-out, exactly where you left them.
            </p>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex h-full flex-col lg:h-auto lg:bg-[var(--surface-page)]">
        <div className="absolute right-4 top-4 z-20 hidden lg:block">
          <ThemeToggle compact />
        </div>

        <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-6 sm:px-8 lg:py-14">
          <div className="w-full max-w-[24rem]">
            <span className="inline-flex items-center gap-2 lg:hidden">
              <Mark size={26} />
              <span className="font-display text-[1rem] font-extrabold tracking-[-0.02em] text-white">AfterBI</span>
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-white lg:mt-0 lg:text-[2rem] lg:leading-tight lg:tracking-[-0.035em] lg:text-[var(--text-primary)]">
              <span className="lg:hidden">Welcome back.</span>
              <span className="hidden lg:inline">Sign in to your account</span>
            </h1>

            <form onSubmit={submit} className="mt-8 space-y-6">
              {problem && <ProblemBox problem={problem} onSignOut={() => void signOut()} />}

              {error && (
                <Alert tone="critical" title="Could not sign you in" defaultOpen>
                  {error}
                </Alert>
              )}

              {sent && (
                <Alert tone="good" title="Check your email" defaultOpen>
                  If there is an account for {email.trim()}, a reset link is on its way.
                </Alert>
              )}

              <div>
                <label htmlFor="login-email" className={cn('mb-1', labelStyle)}>
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="you@company.com"
                  className={cn(field, error ? 'border-status-critical' : fieldRule)}
                />
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <label htmlFor="login-password" className={labelStyle}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => void forgot()}
                    className="text-[12.5px] font-bold text-brand-400 transition-colors hover:text-brand-300 lg:text-brand-700 lg:hover:text-brand-900 dark:lg:text-brand-400"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(field, 'pr-10', error ? 'border-status-critical' : fieldRule)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-1 text-white/45 transition-colors hover:text-white lg:text-[var(--text-muted)] lg:hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="tap inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-[15.5px] font-bold text-white shadow-card transition-all hover:bg-brand-500 active:scale-[0.99] disabled:opacity-60 lg:bg-brand-900 lg:hover:bg-brand-800 dark:lg:bg-brand-500 dark:lg:text-brand-950"
              >
                {busy ? 'Signing in' : 'Sign in'}
                {!busy && <ArrowRight size={17} aria-hidden />}
              </button>
            </form>

            <p className="mt-8 text-center text-[13.5px] text-white/45 lg:text-[var(--text-secondary)]">
              Accounts are created by your administrator.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
