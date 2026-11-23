/**
 * Create account: four details on one screen, then a clear confirmation.
 *
 * The visitor gives their name, the business, a phone number and an email.
 * The request is saved for the owner (lib/signupRequests), who sees it in
 * Platform, Sign up requests, and calls or messages them. Nothing opens
 * WhatsApp or a mail app. The confirmation says what happens next (a call
 * within 48 hours) and where to reach us if it does not, then takes the
 * visitor back to the front page.
 *
 * A full screen panel, not a card: the brand side on the left on wide
 * screens, the form on the right, the same look as signing in.
 */

import { forwardRef, useEffect, useRef, useState, type ComponentType, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Loader2, Mail, Phone, User, X } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';
import { PetalBackdrop } from '@/components/brand/PetalBackdrop';
import { cn } from '@/lib/cn';
import { CONTACT_PHONE, SUPPORT_EMAIL } from '@/lib/site';
import { sendSignupRequest, type SignupForm } from '@/lib/signupRequests';

const EMPTY: SignupForm = { name: '', company: '', phone: '', email: '' };
const RETURN_AFTER = 20; // seconds on the confirmation before it goes home by itself

function problemWith(form: SignupForm): Partial<Record<keyof SignupForm, string>> {
  const out: Partial<Record<keyof SignupForm, string>> = {};
  if (form.name.trim().length < 2) out.name = 'Your name, please.';
  if (form.company.trim().length < 2) out.company = 'The name of the business.';
  if (form.phone.replace(/\D/g, '').length < 7) out.phone = 'A number we can call.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) out.email = 'That email does not look complete.';
  return out;
}

export function BookDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupForm, string>>>({});
  const [state, setState] = useState<'form' | 'sending' | 'sent' | 'failed'>('form');
  const first = useRef<HTMLInputElement>(null);

  /* The page under it stays still, and Escape closes it. */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    const t = window.setTimeout(() => first.current?.focus(), 80);
    return () => {
      root.style.overflow = before;
      window.removeEventListener('keydown', key);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  /* Once sent and closed, the next visitor on this device starts clean. */
  useEffect(() => {
    if (open || state !== 'sent') return;
    const t = window.setTimeout(() => {
      setForm(EMPTY);
      setState('form');
    }, 400);
    return () => window.clearTimeout(t);
  }, [open, state]);

  const home = () => {
    onClose();
    navigate('/', { replace: true });
    window.scrollTo({ top: 0 });
  };

  /* The confirmation goes back to the front page by itself after a while. */
  useEffect(() => {
    if (!open || state !== 'sent') return;
    const t = window.setTimeout(home, RETURN_AFTER * 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state]);

  const set = (key: keyof SignupForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = problemWith(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setState('sending');
    try {
      await sendSignupRequest(form);
      setState('sent');
    } catch {
      setState('failed');
    }
  };

  if (!open || typeof document === 'undefined') return null;
  const firstName = form.name.trim().split(/\s+/)[0] ?? '';

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Create your AfterBI account" className="ab-signup fixed inset-0 z-[90] flex bg-white text-navy-900">
      {/* ------------------------------------------------ the brand side */}
      <aside className="relative isolate hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-[#1238e6] p-10 text-white lg:flex">
        <PetalBackdrop className="-z-10 text-white" />
        <Wordmark onInk className="text-[1.6rem]" />
        <div>
          <p className="font-display text-[clamp(2.2rem,3.4vw,3.2rem)] font-bold leading-[1.02] tracking-[-0.04em]">
            Let us set you up.
          </p>
          <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-white/80">
            Leave four details. Our team calls you within 48 hours and gets your business running on AfterBI.
          </p>
        </div>
        <p className="text-[13px] text-white/60">No payment needed to start.</p>
      </aside>

      {/* ------------------------------------------------ the form side */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8">
          <Wordmark className="text-[1.3rem] !text-navy-900 lg:invisible" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-navy-700 hover:bg-navy-900/5"
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 pb-12 pt-4 sm:px-0">
          {state === 'sent' ? (
            <Confirmation firstName={firstName} company={form.company.trim()} phone={form.phone.trim()} onHome={home} />
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="font-display text-[2rem] font-bold leading-tight tracking-[-0.04em] sm:text-[2.3rem]">Create your account</h2>
              <p className="mt-2 text-[15px] text-navy-500">We call you within 48 hours to set everything up.</p>

              <div className="mt-8 space-y-4">
                <Field ref={first} icon={User} label="Your name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
                <Field icon={Building2} label="Business name" autoComplete="organization" value={form.company} onChange={set('company')} error={errors.company} />
                <Field icon={Phone} label="Phone number" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
                <Field icon={Mail} label="Email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
              </div>

              {state === 'failed' && (
                <p role="alert" className="mt-5 rounded-xl bg-[#fde8e8] px-4 py-3 text-[14px] leading-relaxed text-[#8a1c1c]">
                  That did not go through. Check your connection and try again, or email{' '}
                  <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                </p>
              )}

              <button
                type="submit"
                disabled={state === 'sending'}
                className="tap mt-7 inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-[#1238e6] text-[15.5px] font-semibold text-white transition-colors hover:bg-[#0f2fc4] disabled:opacity-70"
              >
                {state === 'sending' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden /> Sending
                  </>
                ) : (
                  <>
                    Send request <ArrowRight size={18} aria-hidden />
                  </>
                )}
              </button>
              <p className="mt-4 text-center text-[13px] text-navy-500">Your details are only used to contact you about AfterBI.</p>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------- a field */


const Field = forwardRef<
  HTMLInputElement,
  {
    icon: ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    type?: string;
    inputMode?: 'tel' | 'email' | 'text';
    autoComplete?: string;
  }
>(function Field({ icon: Icon, label, value, onChange, error, type = 'text', inputMode, autoComplete }, ref) {
  return (
    <label className="block">
      <span className="text-[13.5px] font-semibold text-navy-700">{label}</span>
      <span
        className={cn(
          'mt-1.5 flex h-[3.25rem] items-center gap-3 rounded-xl border bg-white px-4 transition-colors focus-within:border-[#1238e6] focus-within:ring-2 focus-within:ring-[#1238e6]/20',
          error ? 'border-[#d33]' : 'border-navy-900/15',
        )}
      >
        <Icon size={18} className="shrink-0 text-navy-400" />
        <input
          ref={ref}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-navy-900 outline-none placeholder:text-navy-400"
        />
      </span>
      {error && <span className="mt-1.5 block text-[13px] text-[#c22]">{error}</span>}
    </label>
  );
});

/* ------------------------------------------------------- the confirmation */

function Confirmation({ firstName, company, phone, onHome }: { firstName: string; company: string; phone: string; onHome: () => void }) {
  return (
    <div className="text-center" role="status">
      <svg viewBox="0 0 96 96" className="ab-done mx-auto h-24 w-24" aria-hidden>
        <circle cx="48" cy="48" r="44" className="ab-done-ring" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="M30 49 L43 62 L67 36" className="ab-done-tick" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="mt-6 font-display text-[2rem] font-bold leading-tight tracking-[-0.04em]">Request received</h2>
      <p className="mx-auto mt-3 max-w-sm text-[15.5px] leading-relaxed text-navy-600">
        {`Thank you${firstName ? `, ${firstName}` : ''}. Your details are with the AfterBI team. We will call ${phone || 'you'} within 48 hours to set up ${company || 'your account'}.`}
      </p>
      <div className="mx-auto mt-7 max-w-sm rounded-2xl bg-[#f2f5fb] px-5 py-4 text-left text-[14px] leading-relaxed text-navy-700">
        <p className="font-semibold text-navy-900">Not heard from us in 48 hours?</p>
        <p className="mt-1">
          Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[#1238e6] underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>{' '}
          or call{' '}
          <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="whitespace-nowrap font-semibold text-[#1238e6] underline underline-offset-4">
            {CONTACT_PHONE}
          </a>
          .
        </p>
      </div>
      <button
        type="button"
        onClick={onHome}
        className="tap mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-navy-900 px-7 text-[15px] font-semibold text-white hover:bg-navy-800"
      >
        Back to the home page
      </button>
      <div className="mx-auto mt-5 h-1 w-40 overflow-hidden rounded-full bg-navy-900/10" aria-hidden>
        <div className="ab-done-timer h-full bg-[#1238e6]" style={{ animationDuration: `${RETURN_AFTER}s` }} />
      </div>
    </div>
  );
}
