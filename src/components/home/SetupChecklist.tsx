import { Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The first week, as a list that empties itself.
 *
 * A distribution platform is useless until four things exist: somewhere to hold
 * stock, something to sell, somebody to sell it to, and the company's own name
 * on the invoice. Until then every screen in the app is an empty state, and an
 * administrator who lands on six empty tables in a row concludes the software
 * is broken rather than that it is waiting.
 *
 * It disappears on its own — no dismiss button, because a dismissed checklist
 * is a checklist you cannot get back when you hire the person who was actually
 * going to do it. It goes when the work is done, or when an administrator ticks
 * `setupComplete` in Settings, which is the honest way to say "we do it
 * differently".
 */

interface Step {
  id: string;
  label: string;
  hint: string;
  to: string;
  done: boolean;
}

export function SetupChecklist({
  root,
  state,
}: {
  root: string;
  state: { warehouses: number; products: number; distributors: number; branded: boolean };
}) {
  const steps: Step[] = [
    {
      id: 'brand',
      label: 'Name your company',
      hint: 'What goes on the invoice, and the logo beside it.',
      to: `${root}/settings`,
      done: state.branded,
    },
    {
      id: 'depots',
      label: 'Add a depot',
      hint: 'Stock has to be somewhere before it can move.',
      to: `${root}/warehouses`,
      done: state.warehouses > 0,
    },
    {
      id: 'products',
      label: 'Load your products',
      hint: 'Name, unit, and a price for each of the three tiers.',
      to: `${root}/products`,
      done: state.products > 0,
    },
    {
      id: 'distributors',
      label: 'Add your distributors',
      hint: 'Who you sell to, which tier they are on, and their credit limit.',
      to: `${root}/distributors`,
      done: state.distributors > 0,
    },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  /* The first thing not done. Everything else can wait, and saying so is the
     difference between a list and an instruction. */
  const next = steps.find((s) => !s.done);

  return (
    <section
      aria-labelledby="setup-heading"
      className="surface-card rounded-2xl border border-hairline p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="setup-heading" className="text-[15px] font-bold text-primary">
            Finish setting up
          </h2>
          <p className="mt-1 text-[12.5px] leading-snug text-muted">
            {next ? `Next: ${next.hint}` : 'Almost there.'}
          </p>
        </div>
        <span className="tabular shrink-0 rounded-full bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-bold text-secondary">
          {done} of {steps.length}
        </span>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={steps.length}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-500 dark:bg-brand-400"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ul className="mt-3 space-y-0.5">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.to}
              className={cn(
                'flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--surface-sunken)]',
                step.done && 'opacity-55',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                  step.done
                    ? 'border-transparent bg-brand-600 text-white dark:bg-brand-400 dark:text-brand-950'
                    : 'border-[var(--border-strong)]',
                )}
              >
                {step.done && <Check size={13} strokeWidth={3} aria-hidden />}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 text-[13.5px] font-semibold',
                  step.done ? 'text-muted line-through' : 'text-primary',
                )}
              >
                {step.label}
              </span>
              {!step.done && <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
