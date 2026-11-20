/**
 * Grouped settings, the way a phone's settings screen does it.
 *
 * One card per subject, its title at the top, then its options as rows with a
 * hairline between them: Appearance holds Automatic, Light and Dark; Security
 * holds the PIN and when it locks. Each row leads with its icon inside a piece
 * of artwork (IconArt), so the screen reads at a glance.
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconArt, type ArtTone } from './IconArt';

export function SettingsCard({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Beside the title, e.g. a hint. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-[22px] border border-hairline surface-card shadow-card', className)}>
      <header className="px-5 pb-1 pt-5">
        <div className="flex items-center gap-1.5">
          <h2 className="text-lead font-bold tracking-[-0.01em] text-primary">{title}</h2>
          {aside}
        </div>
        {description && <p className="mt-0.5 text-label text-muted">{description}</p>}
      </header>
      <div className="divide-y divide-[var(--border-hairline)] px-5">{children}</div>
    </section>
  );
}

export function SettingsRow({
  icon,
  art,
  tone,
  label,
  hint,
  right,
  below,
  onClick,
  selected,
  danger,
  disabled,
}: {
  icon?: LucideIcon;
  /** Picks the artwork's colour and shape; defaults to the label. */
  art?: string;
  tone?: ArtTone;
  label: ReactNode;
  hint?: ReactNode;
  /** A control at the end of the row: a button, a select, a switch. */
  right?: ReactNode;
  /** A wider control under the label, e.g. colour swatches. */
  below?: ReactNode;
  /** The whole row is a button. */
  onClick?: () => void;
  /** A choice row (Light, Dark): shows the tick. */
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const body = (
    <>
      {icon && <IconArt icon={icon} id={art ?? (typeof label === 'string' ? label : '')} tone={tone} size={40} />}
      <span className="min-w-0 flex-1 text-left">
        <span className={cn('block text-body font-semibold', danger ? 'text-red-600 dark:text-red-400' : 'text-primary')}>
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-label text-muted">{hint}</span>}
      </span>
      {right}
      {selected !== undefined && (
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            selected
              ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-brand-950'
              : 'border-[var(--border-strong)]',
          )}
        >
          {selected && <Check size={14} strokeWidth={3} aria-hidden />}
        </span>
      )}
      {onClick && selected === undefined && !right && (
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
      )}
    </>
  );

  if (onClick) {
    return (
      <div className="py-1">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={selected}
          className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3.5 rounded-2xl px-2 py-2.5 transition-colors hover:bg-[var(--surface-sunken)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
        >
          {body}
        </button>
      </div>
    );
  }

  return (
    <div className="group py-3.5">
      <div className="flex flex-wrap items-center gap-3.5 sm:flex-nowrap">{body}</div>
      {below && <div className={cn('mt-3', icon && 'sm:pl-[54px]')}>{below}</div>}
    </div>
  );
}
