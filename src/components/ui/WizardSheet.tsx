import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HintFooter } from '@/components/ui';

/**
 * Pick a class, then a subject, then a week.
 *
 * The pattern CloudNotte uses everywhere and the report is right that it works:
 * one question per screen, big targets, an obvious way back. A four-dropdown
 * form is faster for somebody who knows the app and much worse for somebody who
 * does not, and a class teacher opening this on a 5-inch phone between lessons
 * is firmly the second person.
 *
 * What is different here is the thing the report flags as CloudNotte's bug:
 *
 *   > this option shows all the subjects the school teaches irrespective of the
 *   > class the teacher selects
 *
 * A step's options are a **function of the answers so far**, not a fixed list.
 * That is enforced by the type, `options` may be a function, so the subject
 * step physically cannot be written to ignore the class above it. Fixing it
 * once in the primitive fixes it in every flow that uses the primitive.
 */

export interface WizardOption {
  value: string;
  label: string;
  /** Small second line: a subject's code, a week's dates. */
  hint?: string;
  disabled?: boolean;
}

export interface WizardStep {
  /** The question, as a question. "Which class?" not "Class". */
  question: string;
  /** Optional sentence under the question. */
  help?: string;
  /**
   * What the person does here.
   *
   * `choice` is the default and the common case. `text` and `textarea` exist
   * because two of the things the model needs cannot be picked from a list:
   * the topic, and a sentence or two describing what the lesson will cover.
   * Asking for those on the same screen as the choices would put the flow back
   * on the page it was taken off.
 */
  kind?: 'choice' | 'text' | 'textarea';
  /** For `text` and `textarea`. */
  placeholder?: string;
  maxLength?: number;
  /** A step that may be skipped. Only meaningful for text steps. */
  optional?: boolean;
  /**
   * An offer to fill this step in for the person.
   *
   * Only meaningful on a `textarea` step. It draws a button above the box; the
   * function is given every answer chosen so far and returns the text to put
   * in. While it is running the box is disabled and the button says so.
   *
   * This exists because the honest answer to "what will you cover?" for most
   * teachers, most days, is "the topic I just typed": and a blank box that
   * demands a paragraph before the real work starts is where the flow was
   * being abandoned. The generated text is dropped straight into the field
   * and stays editable; it is a first draft, not a submission.
 */
  assist?: {
    label: string;
    busyLabel?: string;
    run: (answers: Record<string, string>) => Promise<string>;
  };
  /**
   * The choices. A function receives every answer chosen so far, keyed by step
   * id: which is what makes a dependent step possible.
 */
  options?: WizardOption[] | ((answers: Record<string, string>) => WizardOption[]);
  /**
   * Whether to ask this at all.
   *
   * A question that only matters after another answer should not be asked of
   * everybody. "Describe the lesson" is worth asking somebody who wants the
   * app to write the note and is pure noise for somebody who is pasting a note
   * they already have. It reads only the answers above it, so a step can never
   * vanish once it has been reached.
   */
  when?: (answers: Record<string, string>) => boolean;
  /** Key this step's answer is stored under. */
  id: string;
  /**
   * Layout. `chips` for short labels (weeks, terms); `list` for long ones
   * (subjects, classes). Defaults to `chips` when every label is short.
   */
  layout?: 'chips' | 'list';
}

export function WizardSheet({
  title,
  steps: declared,
  initial,
  open,
  onClose,
  onDone,
  doneLabel = 'Continue',
}: {
  /** Small label above the question: the section this belongs to. */
  title?: string;
  steps: WizardStep[];
  /** Pre-chosen answers, so reopening a flow remembers where you were. */
  initial?: Record<string, string>;
  open: boolean;
  onClose: () => void;
  onDone: (answers: Record<string, string>) => void;
  doneLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  /* The `assist` offer on a textarea step: see `WizardStep.assist`. */
  const [assisting, setAssisting] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(initial ?? {});

  /*
   * The questions that actually apply, given what has been answered so far.
   *
   * Everything below counts against this list rather than the declared one, so
   * "3 of 5" and the progress bar report the walk the person is on rather than
   * the longest walk the flow could take.
   */
  const steps = useMemo(
    () => declared.filter((s) => !s.when || s.when(answers)),
    [declared, answers],
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  /*
   * Compared by content, not by identity.
   *
   * `initial` is written inline at the call site, so it is a new object on
   * every render of the screen underneath. Depending on the object itself
   * would reset the sheet to question one every time the page behind it
   * re-rendered, which on a slow phone means losing an answer to a toast.
   */
  const initialKey = JSON.stringify(initial ?? {});

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setAssisting(false);
    setAssistError(null);
    setAnswers(JSON.parse(initialKey) as Record<string, string>);
    // Focus the question, not the first option: a screen reader should read
    // what is being asked before it starts reading the answers.
    window.setTimeout(() => headingRef.current?.focus(), 40);
  }, [open, initialKey]);

  const step = steps[index];

  const isText = step?.kind === 'text' || step?.kind === 'textarea';

  const options = useMemo(() => {
    if (!step || isText) return [];
    return typeof step.options === 'function' ? step.options(answers) : (step.options ?? []);
  }, [step, answers, isText]);

  /* A text step gets the keyboard straight away; there is nothing to read. */
  useEffect(() => {
    if (!open || !isText) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, index, isText]);

  /*
   * An answer that is no longer offered is not an answer.
   *
   * Change the class after choosing a subject and that subject may not be
   * taught in the new class. Leaving it selected is how you end up filing
   * Further Mathematics marks against Primary 3.
   */
  useEffect(() => {
    if (!step || isText) return;
    const chosen = answers[step.id];
    if (chosen && !options.some((o) => o.value === chosen && !o.disabled)) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[step.id];
        // Everything downstream depended on it, so it goes too.
        for (const later of steps.slice(index + 1)) delete next[later.id];
        return next;
      });
    }
  }, [options, step, answers, steps, index, isText]);

  const choose = useCallback(
    (value: string) => {
      const next = { ...answers, [step.id]: value };
      // A changed answer invalidates every answer that came after it.
      for (const later of steps.slice(index + 1)) delete next[later.id];
      setAnswers(next);

      // Recounted against the answer just given, because a choice can add or
      // remove the questions that follow it.
      const live = declared.filter((s) => !s.when || s.when(next));

      if (index < live.length - 1) {
        setIndex(index + 1);
        window.setTimeout(() => headingRef.current?.focus(), 40);
      } else {
        onDone(next);
      }
    },
    [answers, step, steps, declared, index, onDone],
  );

  const back = useCallback(() => {
    if (index === 0) onClose();
    else {
      setIndex(index - 1);
      window.setTimeout(() => headingRef.current?.focus(), 40);
    }
  }, [index, onClose]);

  /* Escape closes; Tab stays inside; the page behind does not scroll. */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !step) return null;

  const chosen = answers[step.id];
  const isLast = index === steps.length - 1;
  const canContinue = isText ? step.optional || Boolean(chosen?.trim()) : Boolean(chosen);
  const layout =
    step.layout ?? (options.every((o) => o.label.length <= 14 && !o.hint) ? 'chips' : 'list');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-question"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl surface-card shadow-pop',
          'sm:max-w-md sm:rounded-3xl',
          'animate-[slide-up_0.24s_cubic-bezier(0.16,1,0.3,1)_both]',
        )}
      >
        {/* header */}
        <div className="shrink-0 px-5 pb-2 pt-4">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--border-strong)] sm:hidden" aria-hidden />

          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={back}
              aria-label={index === 0 ? 'Close' : 'Back'}
              className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
            >
              {index === 0 ? <X size={17} aria-hidden /> : <ArrowLeft size={17} aria-hidden />}
            </button>

            <div className="min-w-0 flex-1 text-center">
              {title && (
                <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.13em] text-brand-700 dark:text-brand-400">
                  {title}
                </p>
              )}
            </div>

            <span className="tabular w-8 shrink-0 text-right text-[12px] font-semibold text-muted" aria-hidden>
              {index + 1}/{steps.length}
            </span>
          </div>

          <h2
            id="wizard-question"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-center text-[19px] font-bold leading-snug text-primary outline-none"
          >
            {step.question}
          </h2>
          {step.help && (
            <p className="mt-1.5 text-center text-[13px] leading-snug text-muted">{step.help}</p>
          )}
        </div>

        {/* options */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
          {isText ? (
            /*
             * A typed answer. Enter moves on from a single-line field, which is
             * what a phone keyboard's blue key is for; a textarea keeps Enter
             * for new lines, because a description is more than one sentence.
             */
            step.kind === 'textarea' ? (
              <div className="space-y-2.5">
                {step.assist && (
                  <button
                    type="button"
                    disabled={assisting}
                    onClick={() => {
                      const runner = step.assist;
                      if (!runner) return;
                      setAssistError(null);
                      setAssisting(true);
                      runner
                        .run(answers)
                        .then((text) => {
                          if (text.trim()) {
                            setAnswers((prev) => ({ ...prev, [step.id]: text.trim() }));
                          }
                        })
                        .catch((err: unknown) =>
                          setAssistError(
                            err instanceof Error ? err.message : 'Could not write that. Type it yourself.',
                          ),
                        )
                        .finally(() => setAssisting(false));
                    }}
                    className={cn(
                      'tap inline-flex items-center gap-2 rounded-xl border px-3.5 text-[13.5px] font-bold transition-colors',
                      assisting
                        ? 'border-hairline text-muted'
                        : 'border-brand-700/40 bg-brand-50 text-brand-900 hover:bg-brand-100 dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-200',
                    )}
                  >
                    <Sparkles size={14} className={assisting ? 'animate-pulse' : ''} aria-hidden />
                    {assisting ? (step.assist.busyLabel ?? 'Writing…') : step.assist.label}
                  </button>
                )}

                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={chosen ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [step.id]: e.target.value }))}
                  placeholder={step.placeholder}
                  maxLength={step.maxLength ?? 1200}
                  rows={6}
                  disabled={assisting}
                  className="w-full rounded-xl border border-hairline bg-[var(--surface-page)] px-3.5 py-3 text-[15px] leading-relaxed text-primary outline-none transition-colors placeholder:text-muted focus:border-brand-600 disabled:opacity-60 dark:focus:border-brand-500"
                />

                {assistError && (
                  <p className="text-[12.5px] leading-relaxed text-[#b3261e] dark:text-red-300">
                    {assistError}
                  </p>
                )}
              </div>
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                value={chosen ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [step.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (canContinue) choose(chosen ?? '');
                }}
                placeholder={step.placeholder}
                maxLength={step.maxLength ?? 140}
                className="h-12 w-full rounded-xl border border-hairline bg-[var(--surface-page)] px-3.5 text-[16px] text-primary outline-none transition-colors placeholder:text-muted focus:border-brand-600 dark:focus:border-brand-500"
              />
            )
          ) : options.length === 0 ? (
            <HintFooter>
              There is nothing to choose here yet. Go back and pick something else, or ask an administrator to set this up.
            </HintFooter>
          ) : layout === 'chips' ? (
            <div className="flex flex-wrap justify-center gap-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => choose(option.value)}
                  aria-pressed={chosen === option.value}
                  className={cn(
                    'tap rounded-full border px-4 text-[13.5px] font-semibold transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    chosen === option.value
                      ? 'border-transparent bg-brand-600 text-white dark:bg-brand-500'
                      : 'border-hairline surface-sunken text-secondary hover:border-strong hover:text-primary',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    disabled={option.disabled}
                    onClick={() => choose(option.value)}
                    aria-pressed={chosen === option.value}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                      chosen === option.value
                        ? 'border-brand-600 bg-brand-600/8 dark:border-brand-500'
                        : 'border-hairline hover:bg-[var(--surface-sunken)]',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-primary">
                        {option.label}
                      </span>
                      {option.hint && (
                        <span className="block truncate text-[12.5px] text-muted">{option.hint}</span>
                      )}
                    </span>
                    {chosen === option.value && (
                      <Check
                        size={17}
                        strokeWidth={2.8}
                        className="shrink-0 text-brand-700 dark:text-brand-400"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* footer */}
        <div className="shrink-0 px-5 pt-2 pb-safe-4 sm:pb-safe-5">
          {/* Progress, as a bar rather than dots: the steps here are ordered
              and dependent, so "how far through" is the useful reading. */}
          <div
            className="mb-3 h-1 overflow-hidden rounded-full surface-sunken"
            role="progressbar"
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`Step ${index + 1} of ${steps.length}`}
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-300 dark:bg-brand-500"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>

          <button
            type="button"
            disabled={!canContinue}
            onClick={() => canContinue && choose(chosen ?? '')}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors',
              canContinue
                ? 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400'
                : 'surface-sunken text-muted',
            )}
          >
            {isLast ? doneLabel : step.optional && !chosen?.trim() ? 'Skip' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* helpers */

/**
 * Subjects a class is actually taught.
 *
 * This is the fix for the CloudNotte bug, and it lives here rather than in a
 * screen so that every screen gets it. A subject belongs to a class when the
 * class's section is in the subject's `sections`: and, for Secondary,
 * when the subject either has no stream (everyone takes it) or names the
 * stream the class is in.
 */
export function subjectsForClass<
  S extends { id: string; name: string; code?: string; sections: string[]; streams?: string[] },
  C extends { section: string; stream?: string },
>(subjects: S[], schoolClass: C | undefined): S[] {
  if (!schoolClass) return [];
  return subjects.filter((subject) => {
    if (!subject.sections.includes(schoolClass.section)) return false;
    if (!subject.streams || subject.streams.length === 0) return true;
    // A stream-tagged subject in a class with no stream set is still offered:
    // plenty of schools do not split SSS into streams at all, and hiding
    // Physics from them would be worse than showing it.
    if (!schoolClass.stream) return true;
    return subject.streams.includes(schoolClass.stream);
  });
}

/** A step's options, built from a list of records. */
export function toOptions<T>(
  rows: T[],
  map: (row: T) => WizardOption,
): WizardOption[] {
  return rows.map(map);
}

export type { ReactNode };
