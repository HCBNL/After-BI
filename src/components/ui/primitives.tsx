import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { Hint } from './Hint';
import { cn } from '@/lib/cn';
import { initials as makeInitials } from '@/lib/format';

/* ------------------------------------------------------------------ Button */

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
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px]',
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
      disabled={disabled || loading}
      data-variant={variant}
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

/* ----------------------------------------------------------------- Spinner */

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

/* -------------------------------------------------------------------- Card */

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
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="text-[15px] font-bold text-primary leading-tight">{title}</h3>
          {subtitle && <Hint label={typeof title === 'string' ? `About ${title}` : 'More about this'}>{subtitle}</Hint>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */

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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset',
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

/* ------------------------------------------------------------- Form fields */

export function Label({
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
    <div className="mb-1.5 flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-secondary">
        {children}
        {required && <span className="ml-0.5 text-status-critical">*</span>}
      </label>
      {/* The explanation lives behind the (i): a label shows its name and nothing else. */}
      {hint && <Hint label={`About ${typeof children === 'string' ? children : 'this field'}`}>{hint}</Hint>}
    </div>
  );
}

const FIELD_BASE =
  'w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-card)] px-3.5 text-sm ' +
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

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(FIELD_BASE, 'h-11 appearance-none pr-9 cursor-pointer', className)}
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
      {error && <p className="mt-1.5 text-[12px] font-medium text-status-critical">{error}</p>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn('flex w-full items-center justify-between gap-4', disabled && 'opacity-50')}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="text-sm font-semibold text-primary"
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
        </span>
        {description && <Hint label={`About ${label}`}>{description}</Hint>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed',
          checked ? 'bg-brand-600' : 'bg-[var(--border-strong)]',
        )}
      >
        <span
          className={cn(
            'absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */

const AVATAR_SIZE = { xs: 'h-7 w-7 text-[10px]', sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', hero: 'h-14 w-14 text-base', desk: 'h-20 w-20 text-2xl', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' };

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

/* --------------------------------------------------------------- Feedback */

export function Skeleton({ className }: { className?: string }) {
  // No more grey placeholders anywhere: a loading screen shows the brand
  // loader (`Loading` in brand/Loader.tsx) and nothing pretends to be content.
  void className;
  return null;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-sunken)] text-[var(--text-muted)]">
          {icon}
        </span>
      )}
      <h3 className="text-base font-bold text-primary">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- Progress */

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
          {label && <span className="text-[12px] font-medium text-secondary">{label}</span>}
          {showValue && <span className="tabular text-[12px] font-bold text-primary">{Math.round(pct)}%</span>}
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

/* ------------------------------------------------------------- Stat tile */

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
  const iconTone = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    gold: 'bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300',
    good: 'bg-[#0ca30c]/10 text-[#0a7a0a] dark:text-[#4ec54e]',
    warning: 'bg-[#fab219]/12 text-[#8a6100] dark:text-[#fab219]',
    critical: 'bg-[#d03b3b]/10 text-[#a52929] dark:text-[#f08080]',
    info: 'bg-[#2a78d6]/10 text-[#1c5cab] dark:text-[#7cb1f0]',
  };

  return (
    <div className={cn('surface-card rounded-2xl border border-hairline p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconTone[tone])}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-[26px] font-extrabold leading-none text-primary sm:text-[30px]">{value}</p>
      {(hint || delta !== undefined) && (
        <div className="mt-2 flex items-center gap-2">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[12px] font-bold tabular',
                delta >= 0 ? 'text-[#006300] dark:text-[#0ca30c]' : 'text-status-critical',
              )}
            >
              <span aria-hidden="true">{delta >= 0 ? '▲' : '▼'}</span>
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-[12px] text-muted">{hint}</span>}
        </div>
      )}
    </div>
  );
}

