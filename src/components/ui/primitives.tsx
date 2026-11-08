import {
  forwardRef,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { initials as makeInitials } from '@/lib/format';
import { Hint } from './Hint';

/* Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 ' +
  'disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap ' +
  'active:scale-[0.98]';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-900 text-white hover:bg-brand-800 shadow-sm dark:bg-brand-500 dark:hover:bg-brand-400 dark:text-brand-950',
  secondary:
    'bg-brand-50 text-brand-900 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-100 dark:hover:bg-brand-900/60',
  gold: 'bg-gold-400 text-gold-950 hover:bg-gold-300 shadow-sm',
  outline:
    'border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]',
  ghost: 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
  danger: 'bg-status-critical text-white hover:opacity-90 shadow-sm',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-label',
  md: 'h-11 px-5 text-body',
  lg: 'h-13 px-7 text-lead',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, iconRight, full, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      data-variant={variant}
      disabled={disabled || loading}
      className={cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], full && 'w-full', className)}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 18 : 15} /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export interface LinkButtonProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
  className?: string;
  children: ReactNode;
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  full,
  className,
  children,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      data-variant={variant}
      className={cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], full && 'w-full', className)}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)]',
        'transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
        'disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* Spinner */

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin', className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* Card */

export function Card({
  className,
  children,
  padded = true,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={cn(
        'surface-card rounded-2xl border border-hairline shadow-card',
        padded && 'p-5 sm:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-lead font-semibold text-primary leading-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-label text-muted leading-snug">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* Badge */

type BadgeTone =
  | 'neutral' | 'brand' | 'gold' | 'good' | 'warning' | 'serious' | 'critical' | 'info';

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] ring-[var(--border-hairline)]',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800',
  gold: 'bg-gold-50 text-gold-800 ring-gold-200 dark:bg-gold-900/30 dark:text-gold-200 dark:ring-gold-800',
  good: 'bg-[#0ca30c]/10 text-[#0a7a0a] ring-[#0ca30c]/25 dark:text-[#4ec54e]',
  warning: 'bg-[#fab219]/12 text-[#8a6100] ring-[#fab219]/30 dark:text-[#fab219]',
  serious: 'bg-[#ec835a]/12 text-[#a4522c] ring-[#ec835a]/30 dark:text-[#ec835a]',
  critical: 'bg-[#d03b3b]/10 text-[#a52929] ring-[#d03b3b]/25 dark:text-[#f08080]',
  info: 'bg-[#2a78d6]/10 text-[#1c5cab] ring-[#2a78d6]/25 dark:text-[#7cb1f0]',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  icon,
  dot,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-micro font-semibold uppercase tracking-wide ring-1 ring-inset',
        BADGE_TONE[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  );
}

/* Form fields */

function Label({
  children,
  htmlFor,
  required,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5">
      <span className="text-label font-medium text-secondary">
        {children}
        {required && <span className="ml-0.5 text-status-critical">*</span>}
      </span>
      {/*
       * The hint is an (i), not a line of grey text at the end of the row.
       *
       * Forty-seven fields in this product carry one. Printed, they turned every
       * form into two columns of prose: and because they are different lengths
       * the labels never lined up. A hint answers a question somebody has once;
       * it does not need to be on screen for everybody who already knows.
 */}
      {hint && <Hint label={typeof children === 'string' ? `About ${children}` : 'About this field'}>{hint}</Hint>}
    </label>
  );
}

const FIELD_BASE =
  'w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-card)] px-3.5 text-body ' +
  'text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-shadow ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leading, trailing, ...rest },
  ref,
) {
  const field = (
    <input
      ref={ref}
      className={cn(
        FIELD_BASE,
        'h-11',
        leading ? 'pl-10' : '',
        trailing ? 'pr-10' : '',
        invalid && 'border-status-critical focus:border-status-critical focus:ring-status-critical/25',
        className,
      )}
      {...rest}
    />
  );

  if (!leading && !trailing) return field;

  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          {leading}
        </span>
      )}
      {field}
      {trailing && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{trailing}</span>
      )}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(FIELD_BASE, 'py-2.5 leading-relaxed', className)} {...rest} />;
  },
);

const LAYOUT = /^(?:[a-z0-9]+:)*-?(?:w|min-w|max-w|flex|basis|grow|shrink|m|mx|my|ml|mr|mt|mb|self|order|col|row|justify-self)(?:-|$)/;

function splitLayout(className?: string): { outer: string; inner: string } {
  const outer: string[] = [];
  const inner: string[] = [];
  for (const token of (className ?? '').split(/\s+/).filter(Boolean)) (LAYOUT.test(token) ? outer : inner).push(token);
  return { outer: outer.join(' '), inner: inner.join(' ') };
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    /*
     * Width and placement classes (max-w-sm, w-40, ml-auto, flex-1...) belong
     * on the wrapper, not the <select>: on the select alone the wrapper stayed
     * full width and the arrow sat at the far edge of the row, away from the
     * box it opens. Everything else (height, text) stays on the select.
     */
    const { outer, inner } = splitLayout(className);
    return (
      <div className={cn('relative', outer)}>
        <select
          ref={ref}
          className={cn(FIELD_BASE, 'h-11 w-full appearance-none pr-9 cursor-pointer', inner)}
          {...rest}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  },
);

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <Label required={required} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      {error && <p className="mt-1.5 text-caption font-medium text-status-critical">{error}</p>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** A few words on the current state. Printed. Keep it to one short line. */
  description?: string;
  /** The longer "why would I". Folded behind the (i). */
  hint?: string;
  disabled?: boolean;
}) {
  /*
   * The (i) sits outside the switch, not inside it: a button inside a button is
   * invalid HTML, and browsers resolve it by dropping one of them: which in
   * practice means the disclosure silently stops opening.
 */
  return (
    <div className="flex w-full items-center gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left disabled:opacity-50"
      >
        <span className="min-w-0">
          <span className="block text-body font-semibold text-primary">{label}</span>
          {description && <span className="mt-0.5 block text-caption text-muted leading-snug">{description}</span>}
        </span>
        <span
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
            checked ? 'bg-brand-600' : 'bg-[var(--border-strong)]',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              checked ? 'translate-x-[22px]' : 'translate-x-0.5',
            )}
          />
        </span>
      </button>
      {hint && (
        <Hint label={`About ${label}`} align="right">
          {hint}
        </Hint>
      )}
    </div>
  );
}

/* Avatar */

const AVATAR_SIZE = { xs: 'h-7 w-7 text-micro', sm: 'h-9 w-9 text-caption', md: 'h-11 w-11 text-body', lg: 'h-16 w-16 text-title', xl: 'h-24 w-24 text-headline' };

export function Avatar({
  name,
  src,
  size = 'md',
  className,
  ring,
}: {
  name: string;
  src?: string;
  size?: keyof typeof AVATAR_SIZE;
  className?: string;
  ring?: boolean;
}) {
  const parts = name.trim().split(/\s+/);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-800 dark:bg-brand-900/60 dark:text-brand-200',
        AVATAR_SIZE[size],
        ring && 'ring-2 ring-white dark:ring-[var(--surface-card)]',
        className,
      )}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        makeInitials(parts[0], parts[1])
      )}
    </span>
  );
}

/* Feedback */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}

/**
 * Nothing here yet, said in as few words as possible.
 *
 * WHY THE REASON IS BEHIND AN (i)
 *
 * These used to be a headline and then a paragraph, centred in the middle of
 * an otherwise empty screen: "Nothing recorded in this period. Scorecards are
 * built from sell-out. Nothing has been keyed for this month yet." Two
 * sentences, set large, floating in white space with nothing to anchor them.
 * The effect is the opposite of the intent, a wall of centred prose is the
 * least readable shape text comes in, and it makes an ordinary empty table
 * look like an error page.
 *
 * The explanation is still worth having. Somebody seeing a blank scorecard for
 * the first time does need to know it is built from sell-out and that nobody
 * has keyed any. But they need it once, and the hundredth time they open the
 * screen they need the two words that tell them the month is empty and nothing
 * else. So the headline stays visible and the reason moves behind the (i)
 * beside it. Exactly the trade `Alert` and `Hint` already make everywhere else
 * in this app, which is what makes it feel native rather than clever.
 *
 * Because every empty state in the app, including every table's, renders
 * through this one component, this applies in all of them at once.
 *
 * WHEN THE REASON IS NOT FOLDED: `loud`
 *
 * A failure is not an explanation. "We could not load your orders" with the
 * reason hidden behind an icon is hiding the one sentence that tells somebody
 * what to do next, so a state that reports a fault passes `loud` and keeps its
 * description in the open. Same carve-out `Alert` makes for `critical`.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  loud = false,
  className,
}: {
  icon?: ReactNode;
  /**
   * A label, not a sentence. One to three words: "No orders yet", "Empty".
   * Anything that needs a verb and an object belongs in `description`.
   */
  title: string;
  /** The reason, shown when the (i) is pressed. */
  description?: string;
  action?: ReactNode;
  /** Keep the description visible. For a failure, never for an empty table. */
  loud?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-sunken)] text-[var(--text-muted)]">
          {icon}
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <h3 className="text-lead font-semibold text-primary">{title}</h3>
        {description && !loud && (
          /* `align="right"` so the panel opens back across the screen rather
             than off its right edge: the (i) sits at the centre of the page,
             and the panel is wider than the gap to the right of it. */
          <Hint label="Why this is empty" align="right">
            {description}
          </Hint>
        )}
      </div>

      {description && loud && (
        <p className="mt-1.5 max-w-sm text-body leading-relaxed text-muted">{description}</p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * A banner that says one line, and keeps the rest until it is asked for.
 *
 * WHY THE BODY IS FOLDED AWAY BY DEFAULT
 *
 * These banners were three and four lines each: "Sent for approval. The office
 * has it. You will see it move to Approved, or come back with a reason. Edit it
 * to make a change and send again." All true, all useful once, and read by
 * nobody after the first time. Stacked above a form they pushed the actual work
 * down the page, and because each one is a different length no two screens
 * lined up.
 *
 * So the headline stays, that is the signal, and it is one line, and the
 * explanation sits behind it. Every banner is now the same height until
 * somebody wants more, which is what makes a column of them look deliberate.
 *
 * TWO THINGS ARE NEVER FOLDED
 *
 *   - `critical`. An error is not an explanation, it is the answer to "why did
 *     that not work", and hiding it behind a chevron would be hiding the one
 *     sentence the person needs.
 *   - A banner with no `title`. There is no headline to collapse behind, so the
 *     body IS the headline.
 *
 * `defaultOpen` forces it open for the rare case that wants both: a rejection
 * reason, where the head's words are the whole point of the banner.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  icon,
  className,
  defaultOpen,
}: {
  tone?: 'info' | 'good' | 'warning' | 'critical';
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Force the body open. Errors and rejection reasons do this. */
  defaultOpen?: boolean;
}) {
  const tones = {
    info: 'bg-[#2a78d6]/8 border-[#2a78d6]/25 text-[#1c5cab] dark:text-[#7cb1f0]',
    good: 'bg-[#0ca30c]/8 border-[#0ca30c]/25 text-[#0a7a0a] dark:text-[#4ec54e]',
    warning: 'bg-[#fab219]/10 border-[#fab219]/30 text-[#8a6100] dark:text-[#fab219]',
    critical: 'bg-[#d03b3b]/8 border-[#d03b3b]/25 text-[#a52929] dark:text-[#f08080]',
  };

  const collapsible = Boolean(title && children) && tone !== 'critical' && !defaultOpen;
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const showBody = !collapsible || open;

  return (
    <div className={cn('rounded-xl border px-4 py-3', tones[tone], className)} role="status">
      <div className="flex gap-3">
        {icon && <span className="mt-0.5 shrink-0">{icon}</span>}

        <div className="min-w-0 flex-1 text-label leading-relaxed">
          {title &&
            (collapsible ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={bodyId}
                className="flex w-full items-center gap-1.5 text-left font-semibold"
              >
                <span className="min-w-0 flex-1 truncate">{title}</span>
                <ChevronDown
                  size={14}
                  className={cn('shrink-0 opacity-70 transition-transform', open && 'rotate-180')}
                />
              </button>
            ) : (
              <p className="font-bold">{title}</p>
            ))}

          {showBody && (
            <div id={bodyId} className={cn(title && collapsible && 'mt-1.5')}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Progress */

export function ProgressBar({
  value,
  max = 100,
  tone = 'brand',
  className,
  showValue,
  label,
}: {
  value: number;
  max?: number;
  tone?: 'brand' | 'gold' | 'good' | 'warning' | 'critical';
  className?: string;
  showValue?: boolean;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = {
    brand: 'bg-brand-600 dark:bg-brand-400',
    gold: 'bg-gold-400',
    good: 'bg-status-good',
    warning: 'bg-status-warning',
    critical: 'bg-status-critical',
  };

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-caption font-medium text-secondary">{label}</span>}
          {showValue && <span className="tabular text-caption font-bold text-primary">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', colors[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* Stat tile */

/**
 * A figure card in the app's own colour.
 *
 * The card is filled with the theme's deep shade (`--hero`, the same colour
 * as the page header), worked out from whatever colour the organisation
 * picked, so it is always dark enough for white figures in light and dark
 * mode alike. Behind the figure sit the AfterBI bars, the product's
 * signature, faint enough never to compete with the number.
 */
function TileBars() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="104"
      height="104"
      fill="currentColor"
      aria-hidden
      focusable="false"
      /* Sized and placed here as well as in index.css, so the bars can never
         spread across the card while the stylesheet is still loading or out of date. */
      className="ab-stat-bars pointer-events-none absolute -bottom-6 -right-2 -z-10 h-[6.5rem] w-[6.5rem] -rotate-6 text-white opacity-10"
    >
      <rect x="2" y="18" width="5.5" height="12" rx="2" />
      <rect x="10" y="13" width="5.5" height="17" rx="2" />
      <rect x="18" y="8" width="5.5" height="22" rx="2" />
      <rect x="26" y="2" width="4" height="28" rx="2" opacity="0.5" />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  hint,
  delta,
  icon,
  tone = 'brand',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: number;
  icon?: ReactNode;
  tone?: 'brand' | 'gold' | 'good' | 'warning' | 'critical' | 'info';
  className?: string;
}) {
  /* On the coloured card the tone is a small lamp on the icon, not a fill. */
  const lamp = {
    brand: 'bg-white/70',
    gold: 'bg-[#f5c518]',
    good: 'bg-[#5fdc7a]',
    warning: 'bg-[#fab219]',
    critical: 'bg-[#ff8a8a]',
    info: 'bg-[#7cc4ff]',
  };

  return (
    <div className={cn('ab-stat relative isolate overflow-hidden rounded-2xl p-4 text-white sm:p-5', className)} style={{ backgroundColor: 'var(--hero)' }}>
      <TileBars />
      <div className="flex items-start justify-between gap-3">
        <p className="text-micro font-semibold uppercase tracking-[0.08em] text-white/75">{label}</p>
        {icon && (
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-inset ring-white/15 backdrop-blur-sm">
            {icon}
            {tone !== 'brand' && <span aria-hidden className={cn('absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--hero)]', lamp[tone])} />}
          </span>
        )}
      </div>
      <p className="tabular mt-3 font-display text-headline font-bold leading-none text-white sm:text-display">{value}</p>
      {(hint || delta !== undefined) && (
        <div className="mt-2.5 flex items-center gap-2">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full bg-white/12 px-1.5 py-0.5 text-caption font-semibold tabular',
                delta >= 0 ? 'text-[#8af0a0]' : 'text-[#ffb0b0]',
              )}
            >
              <span aria-hidden="true">{delta >= 0 ? '▲' : '▼'}</span>
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-caption text-white/70">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/* Divider */

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn('border-t border-hairline', className)} />;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <hr className="flex-1 border-t border-hairline" />
      <span className="text-micro font-semibold uppercase tracking-wider text-muted">{label}</span>
      <hr className="flex-1 border-t border-hairline" />
    </div>
  );
}
