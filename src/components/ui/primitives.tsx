import {
  forwardRef,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type RefObject,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { initials as makeInitials } from '@/lib/format';
import { Hint } from './Hint';
import { DateField, TimeField } from './DateField';
import { IconArt } from './IconArt';
import { StripIndex } from './CardStrip';

/* Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 ' +
  'disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap ' +
  'active:scale-[0.98]';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  /* Vivid and thick: the theme green itself, a step deeper for white words on it. */
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 shadow-sm dark:bg-brand-500 dark:hover:bg-brand-400 dark:text-brand-950',
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
  /* Dates and times use the app's own pickers, never the browser's (see DateField.tsx). */
  if (rest.type === 'date' || rest.type === 'time') {
    const Picker = rest.type === 'date' ? DateField : TimeField;
    return (
      <Picker
        value={rest.value}
        onChange={rest.onChange}
        min={rest.min}
        max={rest.max}
        disabled={rest.disabled}
        required={rest.required}
        placeholder={rest.placeholder}
        name={rest.name}
        id={rest.id}
        className={className}
        invalid={invalid}
        aria-label={rest['aria-label']}
      />
    );
  }

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
/**
 * Centres an empty state in the middle of its section.
 *
 * When the empty state is the last thing on the page (nothing below it but
 * the bottom bar), it grows to fill the rest of the screen under it, so its
 * petal and words sit in the middle of the dark section, not at its top.
 * Measured again when the window changes (a folded menu, a turned phone).
 * Inside a dialog, or with more of the page below it, it keeps its own size.
 */
function useCentreInSection(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const main = el.closest('main');
    if (!main || el.closest('[role="dialog"]')) return;

    const isLast = () => {
      let node: HTMLElement | null = el;
      while (node && node !== main) {
        let next = node.nextElementSibling as HTMLElement | null;
        while (next) {
          const st = getComputedStyle(next);
          if (st.display !== 'none' && st.position !== 'absolute' && st.position !== 'fixed' && next.offsetHeight > 0) return false;
          next = next.nextElementSibling as HTMLElement | null;
        }
        node = node.parentElement;
      }
      return true;
    };

    let raf = 0;
    const fit = () => {
      raf = 0;
      el.style.minHeight = '';
      if (!isLast()) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const below = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      const room = window.innerHeight - top - below - 24;
      if (room > el.offsetHeight) el.style.minHeight = `${Math.round(room)}px`;
    };
    const later = () => {
      if (!raf) raf = requestAnimationFrame(fit);
    };
    fit();
    const t = window.setTimeout(later, 250);
    window.addEventListener('resize', later);
    return () => {
      window.removeEventListener('resize', later);
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

export function EmptyState({
  icon,
  title,
  description,
  loud = false,
  onRetry,
  className,
}: {
  icon?: ReactNode;
  /**
   * A label, not a sentence. One to three words: "No orders yet", "Empty".
   * Anything that needs a verb and an object belongs in `description`.
   */
  title: string;
  /** The reason. Shown only when `loud` (a failure); an empty list just shows its title. */
  description?: string;
  /** Keep the description visible. For a failure, never for an empty table. */
  loud?: boolean;
  /**
   * A failure only: one quiet Try again. An empty list never carries a
   * button here; the page's own add button, top right, is the only one.
   */
  onRetry?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useCentreInSection(ref);
  return (
    <div ref={ref} className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <IconArt id={title} size={60} className="mb-4">
          {icon}
        </IconArt>
      )}

      {/* Just the title. What the page is for is in its guide, top right; an (i) here repeated it. */}
      <h3 className="text-lead font-semibold text-primary">{title}</h3>

      {description && loud && (
        <p className="mt-1.5 max-w-sm text-body leading-relaxed text-muted">{description}</p>
      )}

      {loud && onRetry && (
        <div className="mt-5">
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}

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

/*
 * One of the owner's Primary artworks in a figure card's bottom right corner,
 * mostly off the card, so only part of it shows as it turns. Each place in a
 * strip has its own shape and colours, chosen to sit well on that ground:
 * soft blue daisy on the theme colour, blue bloom on night, soft blue
 * pinwheel on orange, pink twist on violet, gold spark on teal.
 */
export function CardArt({ index, className }: { index: number; className?: string }) {
  const n = index % 5;
  const shape = (() => {
    switch (n) {
      case 1:
        return (
          <>
            {[0, 90, 180, 270].map((r) => (
              <ellipse key={r} cx="50" cy="27" rx="18" ry="25" transform={`rotate(${r} 50 50)`} fill="#0866F5" />
            ))}
            <circle cx="50" cy="50" r="9" fill="#FFBE45" />
          </>
        );
      case 2:
        return (
          <>
            {[0, 90, 180, 270].map((r) => (
              <path key={r} d="M50 50 L50 8 Q85 9 83 42 Z" transform={`rotate(${r} 50 50)`} fill="#7C9CFF" />
            ))}
          </>
        );
      case 3:
        return (
          <>
            {[0, 90, 180, 270].map((r) => (
              <path key={r} d="M50 50 Q25 20 50 10 Q75 20 50 50 Z" transform={`rotate(${r} 50 50)`} fill="#FF78A8" />
            ))}
            <circle cx="50" cy="50" r="7" fill="#FFBE45" />
          </>
        );
      case 4:
        return (
          <path
            fillRule="evenodd"
            fill="#FFBE45"
            d="M50 6 L61 38 L94 50 L61 61 L50 94 L39 61 L6 50 L39 38 Z M59 50 A9 9 0 1 0 41 50 A9 9 0 1 0 59 50 Z"
          />
        );
      default:
        return (
          <>
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <ellipse key={r} cx="50" cy="28" rx="13" ry="23" transform={`rotate(${r} 50 50)`} fill="#7C9CFF" />
            ))}
            <circle cx="50" cy="50" r="10" fill="#FFBE45" />
          </>
        );
    }
  })();
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={cn(
        'ab-card-art pointer-events-none absolute -bottom-16 -right-12 -z-10 h-32 w-32 lg:-bottom-20 lg:-right-16 lg:h-40 lg:w-40',
        n % 2 === 1 && 'ab-card-art-back',
        className,
      )}
    >
      {shape}
    </svg>
  );
}

/**
 * A figure card, drawn like the home screen's old banners: a rich ground
 * (set by its place in a CardStrip, see `.ab-strip-slot` in index.css), the
 * owner's petals turning slowly in the corner, the label and an icon chip on
 * top, the figure large, a line of context under it. Put a page's figures in
 * a CardStrip so they swipe rather than squeeze.
 */
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
  /* The card's ground and artwork come from its place in a CardStrip; the tone is a small lamp on the icon. */
  const place = useContext(StripIndex);
  const lamp = {
    brand: '',
    gold: 'bg-[#f5c518]',
    good: 'bg-[#5fdc7a]',
    warning: 'bg-[#fab219]',
    critical: 'bg-[#ff8a8a]',
    info: 'bg-[#7cc4ff]',
  };

  return (
    <article
      className={cn(
        'ab-banner relative isolate flex min-h-[150px] w-full flex-col overflow-hidden rounded-[22px] p-4 text-white shadow-card transition-transform duration-300 hover:-translate-y-0.5 lg:min-h-[168px] lg:p-5',
        className,
      )}
    >
      <CardArt index={place} />
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 pt-1 text-label font-semibold leading-snug text-white/85">{label}</p>
        {icon && (
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 [&_svg]:h-[18px] [&_svg]:w-[18px]" aria-hidden>
            {icon}
            {tone !== 'brand' && <span className={cn('absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white/25', lamp[tone])} />}
          </span>
        )}
      </div>
      <p className="tabular mt-2 pr-6 font-display text-headline font-bold leading-none tracking-[-0.02em] sm:text-display">{value}</p>
      {(hint || delta !== undefined) && (
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full bg-white/15 px-1.5 py-0.5 text-caption font-semibold tabular',
                delta >= 0 ? 'text-[#a7f3b8]' : 'text-[#ffc2c2]',
              )}
            >
              <span aria-hidden="true">{delta >= 0 ? '▲' : '▼'}</span>
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="line-clamp-2 max-w-[78%] text-label leading-snug text-white/80">{hint}</span>}
        </div>
      )}
    </article>
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
