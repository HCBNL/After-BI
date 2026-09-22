/**
 * Booking a walkthrough, one question at a time.
 *
 * WHAT THIS REPLACED, AND WHY
 *
 * A single card holding six labelled inputs, a strip of date chips and a row
 * of times. It collected the right things and it asked for all of them at
 * once, and a sales director opening that on a phone between two other jobs
 * reads the length before they read the first question. The abandon happens at
 * the sight of the form.
 *
 * This asks one thing per screen, in the order somebody would ask them aloud:
 * name, company, role, how to reach you, and only then the commercial
 * questions. Five of the nine are a single tap. The progress rail is honest
 * about the length rather than hiding it, and because the contact details come
 * first, a form abandoned two thirds of the way through still leaves somebody
 * we can call.
 *
 * WHERE THE ANSWERS GO
 *
 * Into a mail, or into WhatsApp — whichever the person prefers, offered side
 * by side on the last screen. See `bookingMailto` for why it is not posted to
 * an endpoint in this build.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MessageCircle } from 'lucide-react';
import { Sheet } from './Sheet';
import { cn } from '@/lib/cn';
import {
  SUPPORT_EMAIL,
  WIZARD_STEPS,
  bookingMailto,
  bookingWhatsApp,
  type WizardAnswers,
  type WizardStep,
} from '@/lib/site';

/* --------------------------------------------------------- the validation */

/**
 * One sentence back, or nothing.
 *
 * Written as a person would say it. "Enter a valid email" is a machine telling
 * somebody they failed; "that address is missing an @" tells them what to fix.
 */
function complain(step: WizardStep, value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    if (step.optional) return null;
    if (step.kind === 'multi-choice') return 'Choose at least one to carry on.';
    return step.kind === 'choice' ? 'Pick one to carry on.' : 'This one is needed.';
  }

  if (step.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return 'That address does not look complete. Check it and try again.';
  }

  if (step.kind === 'tel' && trimmed.replace(/\D/g, '').length < 7) {
    return 'That number looks too short. A mobile number is fine.';
  }

  if (step.kind === 'text' && trimmed.length < 2) return 'A little more than that.';

  return null;
}

const PRIMARY =
  'tap inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-[15px] font-bold text-white transition-all hover:bg-brand-500 active:scale-[0.98] disabled:opacity-60';
const SECONDARY =
  'tap inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--surface-card)] px-6 text-[15px] font-bold text-primary ring-1 ring-inset ring-[var(--border-hairline)] transition-colors hover:ring-[var(--border-strong)]';

/* ------------------------------------------------------------- the choices */

function ChoiceList({
  step,
  value,
  onPick,
}: {
  step: WizardStep;
  value: string;
  onPick: (next: string) => void;
}) {
  /*
   * A multi-choice answer is stored as one comma-separated string, not an
   * array.
   *
   * Everything downstream — the review list and the composed mail — already
   * handles a string per question. Introducing an array for one step would
   * mean a branch in both for the one field that is different. A joined string
   * is read by each of them unchanged.
   */
  const multi = step.kind === 'multi-choice';
  const picked = multi ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];

  const toggle = (option: string) => {
    const next = picked.includes(option)
      ? picked.filter((p) => p !== option)
      : /* Kept in the order the question lists them, not the order they were
           tapped, so two businesses that chose the same things read alike. */
        (step.options ?? []).filter((o) => picked.includes(o) || o === option);
    onPick(next.join(', '));
  };

  return (
    <div className="grid gap-2">
      {(step.options ?? []).map((option) => {
        const active = multi ? picked.includes(option) : value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => (multi ? toggle(option) : onPick(option))}
            aria-pressed={active}
            className={cn(
              'tap flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] font-semibold transition-all',
              active
                ? 'border-brand-500 bg-brand-600/15 text-white'
                : 'border-hairline bg-[var(--surface-card)] text-secondary hover:border-[var(--border-strong)] hover:text-primary',
            )}
          >
            <span className="min-w-0">{option}</span>
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                active ? 'border-brand-500 bg-brand-600 text-white' : 'border-[var(--border-strong)]',
              )}
            >
              {active && <Check size={12} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ======================================================================== */

export function BookDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const reviewing = index >= WIZARD_STEPS.length;
  const step = reviewing ? null : WIZARD_STEPS[index];
  const value = step ? (answers[step.id] ?? '') : '';

  /* The rail counts the review as the last stop, so it fills as the sheet is
     finished rather than reaching 100% with a screen still to go. */
  const progress = (index + (sent ? 1 : 0)) / (WIZARD_STEPS.length + 1);

  /* Every screen starts with the caret in the box. On a choice screen there is
     no box, and moving focus to the first option would read that option aloud
     as though it had already been chosen. */
  useEffect(() => {
    if (!open || !step) return;
    if (step.kind === 'choice') return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open, step, index]);

  /* A closed sheet forgets nothing until it has been sent. Somebody who taps
     the backdrop by accident six questions in comes back to question six. */
  useEffect(() => {
    if (!open || !sent) return;
    const id = window.setTimeout(() => {
      setIndex(0);
      setAnswers({});
      setSent(false);
    }, 400);
    return () => window.clearTimeout(id);
  }, [open, sent]);

  const set = (next: string) => {
    if (!step) return;
    setAnswers((previous) => ({ ...previous, [step.id]: next }));
    setError(null);
  };

  const forward = () => {
    if (!step) return;
    const problem = complain(step, value);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setIndex((current) => current + 1);
  };

  const back = () => {
    setError(null);
    setIndex((current) => Math.max(0, current - 1));
  };

  /* A tapped option answers the question, so it moves on by itself. The pause
     is long enough to see the tick land, short enough not to feel like a wait. */
  const pick = (option: string) => {
    set(option);
    window.setTimeout(() => setIndex((current) => current + 1), 170);
  };

  const send = (how: 'mail' | 'whatsapp') => {
    window.location.href = how === 'mail' ? bookingMailto(answers) : bookingWhatsApp(answers);
    setSent(true);
  };

  return (
    <Sheet open={open} onClose={onClose} label="Book a walkthrough of AfterBI" progress={progress}>
      {/* ------------------------------------------------------------ head */}
      {/* The wordmark in the middle, as on the front page, and where you are under it. */}
      <header
        className="flex shrink-0 flex-col items-center px-12 pb-2 pt-5 text-center sm:px-14"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <span className="font-display text-[1.45rem] font-extrabold leading-none tracking-[-0.05em] text-white">
          AfterBI<span className="text-brand-500">.</span>
        </span>
        <p className="mt-3 text-[13px] font-semibold text-white/55">
          Book a walkthrough ·{' '}
          {sent ? 'All done' : reviewing ? 'One last look' : `Question ${index + 1} of ${WIZARD_STEPS.length}`}
        </p>
      </header>

      {/* ------------------------------------------------------------ body */}
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-2 sm:px-7">
        {sent ? (
          <div className="my-auto flex flex-col items-center justify-center py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-400/15">
              <CheckCircle2 size={32} className="text-brand-400" aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-[1.5rem] font-extrabold tracking-tight text-primary">
              That is on its way
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-secondary">
              Send the message that just opened and somebody will come back to you within one working day, with a
              time and with your own price list already loaded.
            </p>
            <p className="mt-4 text-[13px] text-muted">
              Nothing opened? Write to{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand-400 underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        ) : reviewing ? (
          <div className="py-2">
            <h2 className="text-center font-display text-[1.7rem] font-extrabold leading-tight tracking-[-0.035em] text-primary">
              Is this right?
            </h2>
            <p className="mt-2 text-center text-[14px] leading-relaxed text-secondary">
              Tap anything to change it. Nothing has been sent yet.
            </p>

            <ul className="mt-5 divide-y divide-[var(--border-hairline)] rounded-2xl border border-hairline">
              {WIZARD_STEPS.map((entry, entryIndex) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(entryIndex)}
                    className="grid w-full grid-cols-[6.5rem_1fr] items-baseline gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
                  >
                    <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
                      {entry.label}
                    </span>
                    <span className="min-w-0 text-right text-[14px] font-semibold text-primary">
                      {(answers[entry.id] ?? '').trim() || <span className="font-normal text-muted">Not answered</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
              We use this to prepare the walkthrough and to call you back. We do not sell it, and we do not add you
              to a mailing list.
            </p>
          </div>
        ) : step ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              forward();
            }}
            className="my-auto w-full py-4"
          >
            <h2 className="text-center font-display text-[1.7rem] font-extrabold leading-[1.15] tracking-[-0.035em] text-primary sm:text-[1.95rem]">
              {step.question}
            </h2>
            {step.hint && (
              <p className="mt-2 text-center text-[14.5px] leading-relaxed text-secondary">{step.hint}</p>
            )}

            <div className="mt-6">
              {step.kind === 'choice' ? (
                <ChoiceList step={step} value={value} onPick={pick} />
              ) : step.kind === 'multi-choice' ? (
                /*
                  `set`, not `pick`. A single choice answers the question and
                  moves on by itself; a multi-choice must stay put, or the first
                  tap would carry the person past the options they had not
                  chosen yet. Continue is how they leave this step.
                */
                <ChoiceList step={step} value={value} onPick={set} />
              ) : step.kind === 'longtext' ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  rows={4}
                  value={value}
                  maxLength={step.maxLength}
                  placeholder={step.placeholder}
                  onChange={(event) => set(event.target.value)}
                  className="w-full rounded-xl border border-hairline bg-[var(--surface-card)] px-4 py-3 text-[16px] leading-relaxed text-primary outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type={step.kind === 'email' ? 'email' : step.kind === 'tel' ? 'tel' : 'text'}
                  value={value}
                  maxLength={step.maxLength}
                  placeholder={step.placeholder}
                  autoComplete={step.autoComplete}
                  inputMode={step.kind === 'tel' ? 'tel' : undefined}
                  onChange={(event) => set(event.target.value)}
                  className="h-14 w-full rounded-xl border border-hairline bg-[var(--surface-card)] px-4 text-[17px] font-semibold text-primary outline-none transition-colors placeholder:font-normal placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              )}
            </div>

            {/* Submitting on Enter, without a visible second button. */}
            <button type="submit" className="sr-only">
              Continue
            </button>
          </form>
        ) : null}
      </div>

      {/*
        The complaint sits OUTSIDE the scrolling area, and that is the whole
        point of it being here rather than under the content. On the review
        screen the list of nine answers is taller than the sheet, so an error
        rendered after it was a screen below the button that caused it: you
        pressed Send, and as far as you could tell nothing happened.
      */}
      {error && (
        <p
          role="alert"
          className="mx-5 mb-1 shrink-0 rounded-xl bg-status-critical/10 px-4 py-3 text-[13.5px] font-semibold text-[#f08080] sm:mx-7"
        >
          {error}
        </p>
      )}

      {/* ------------------------------------------------------------ foot */}
      <footer
        className={cn(
          'grid shrink-0 gap-3 border-t border-hairline px-5 py-4 pb-safe-4 sm:px-7',
          !sent && index > 0 ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        {sent ? (
          <button type="button" onClick={onClose} className={PRIMARY}>
            Done
          </button>
        ) : (
          <>
            {index > 0 && (
              <button type="button" onClick={back} className={SECONDARY}>
                <ArrowLeft size={16} aria-hidden />
                Back
              </button>
            )}
            {reviewing ? (
              /*
                Two ways out, side by side, because in this market the second
                one is the one most people take. Forcing a WhatsApp buyer
                through an email client is how a finished form goes nowhere.
              */
              <button type="button" onClick={() => send('whatsapp')} className={PRIMARY}>
                <MessageCircle size={16} aria-hidden />
                Send on WhatsApp
              </button>
            ) : (
              <button type="button" onClick={forward} className={PRIMARY}>
                Continue
                <ArrowRight size={16} aria-hidden />
              </button>
            )}
          </>
        )}
      </footer>

      {/* The quieter of the two, under the rail rather than beside it: offered
          without competing with the one most people will press. */}
      {reviewing && !sent && (
        <div className="shrink-0 px-5 pb-4 text-center sm:px-7">
          <button
            type="button"
            onClick={() => send('mail')}
            className="text-[13.5px] font-semibold text-muted underline underline-offset-4 transition-colors hover:text-primary"
          >
            Send by email instead
          </button>
        </div>
      )}
    </Sheet>
  );
}
