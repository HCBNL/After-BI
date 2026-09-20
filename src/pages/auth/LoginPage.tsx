/**
 * Sign in.
 *
 * TWO PANELS ON A LAPTOP, ONE ON A PHONE
 *
 * The left panel is the only place in the app that is ink-dark in both themes —
 * see `.ink` in index.css. It is a material, not a theme state, and it exists
 * because this is the one screen a person sees before they have any reason to
 * trust the thing they are typing a password into. On a phone it collapses
 * entirely: at 360px a decorative panel is a screen of scrolling before the
 * form, and the form is the whole point.
 */

import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { Wordmark } from '@/components/brand/Mark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';

/**
 * A Firebase auth code, as a sentence somebody can act on.
 *
 * `auth/invalid-credential` covers both a wrong password and an email with no
 * account — Firebase stopped distinguishing them deliberately, so an attacker
 * cannot enumerate accounts. The message has to be honest about that ambiguity
 * rather than guessing, or somebody spends ten minutes resetting a password for
 * an address they never registered.
 */
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
      return 'This account has been suspended. An administrator can switch it back on.';
    default:
      return 'We could not sign you in. Try again in a moment.';
  }
}

export default function LoginPage() {
  const { signIn, resetPassword, suspended } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setError(readable((err as { code?: string }).code ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError('Type your email address first, then press this again.');
      return;
    }
    try {
      await resetPassword(email);
      setSent(true);
      setError(null);
    } catch {
      /* Deliberately reports success either way: whether an address has an
         account is not something a sign-in page should confirm. */
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-dvh surface-page">
      {/* ------------------------------------------------------- the panel */}
      <aside className="ink ink-glow relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden p-10 lg:flex">
        <div className="ink-rule absolute inset-0 opacity-60" aria-hidden />

        <div className="relative">
          <Wordmark className="[&_span]:text-white" />
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-[34px] font-extrabold leading-[1.1] tracking-tight text-white">
            Every carton, from your depot to the shelf.
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[#bcc3ce]">
            Orders, stock, invoices and returns in one place — and the sell-out figure that tells
            you whether any of it was real.
          </p>

          <div className="mt-8 flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" style={{ animation: 'ab-pulse-ring 2.4s ease-out infinite' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            <span className="text-[13px] font-semibold text-[#bcc3ce]">
              Works offline and online
            </span>
          </div>
        </div>

        <p className="relative text-[12px] text-[#8a94a3]">
          © {new Date().getFullYear()} AfterBI
        </p>
      </aside>

      {/* -------------------------------------------------------- the form */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-5 pt-5 lg:justify-end">
          <span className="lg:hidden">
            <Wordmark />
          </span>
          <ThemeToggle compact />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            <h2 className="font-display text-[26px] font-extrabold tracking-tight text-primary">
              Sign in
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              Use the email your administrator set you up with.
            </p>

            {suspended && (
              <Alert className="mt-5" tone="critical" title="This account has been suspended" defaultOpen>
                An administrator in your organisation can switch it back on.
              </Alert>
            )}

            {error && (
              <Alert className="mt-5" tone="critical" title="We could not sign you in" defaultOpen>
                {error}
              </Alert>
            )}

            {sent && (
              <Alert className="mt-5" tone="good" title="Check your email" defaultOpen>
                If there is an account for {email}, a reset link is on its way.
              </Alert>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Email" required>
                <Input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leading={<Mail size={16} />}
                  placeholder="you@company.com"
                />
              </Field>

              <Field label="Password" required>
                <Input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leading={<Lock size={16} />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={show ? 'Hide password' : 'Show password'}
                      className="text-muted transition-colors hover:text-primary"
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </Field>

              <Button type="submit" full size="lg" loading={busy} iconRight={<ArrowRight size={16} />}>
                Sign in
              </Button>
            </form>

            <button
              type="button"
              onClick={() => void forgot()}
              className="mt-4 text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-brand-400"
            >
              Forgotten your password?
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
