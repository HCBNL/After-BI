/**
 * The rows of a settings screen, in the banking-app shape: a tinted icon
 * plate, the label, and a round chevron, grouped under small grey headings,
 * with forms that open in place under their own row.
 *
 * Shared by the profile page and the academic calendar, so every settings
 * screen reads the same way.
 */

import { useId, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export const ROW =
  'flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)]';

export function Plate({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
        danger
          ? 'bg-[#b3261e]/10 text-[#b3261e]'
          : 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200',
      )}
    >
      {children}
    </span>
  );
}

export function RoundChevron({ open = false }: { open?: boolean }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-secondary"
    >
      <ChevronRight size={17} className={cn('transition-transform duration-200', open && 'rotate-90')} />
    </span>
  );
}

export function Group({
  title,
  /** One control on the heading line, opposite the title. */
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-1 pb-2">
          {title && <h3 className="text-[13px] font-semibold text-muted">{title}</h3>}
          {action}
        </div>
      )}
      <div className="overflow-hidden rounded-[22px] border border-hairline surface-card shadow-card">{children}</div>
    </section>
  );
}

/** A row that opens in place to show its form. Only the caller decides which one is open. */
export function FoldRow({
  icon,
  title,
  detail,
  badge,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  /** One quiet line under the title. */
  detail?: string;
  /** A small badge before the chevron — "Current", say. */
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="border-b border-hairline last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className={ROW}>
        <Plate>{icon}</Plate>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-medium text-primary">{title}</span>
          {detail && <span className="block truncate text-[12.5px] text-muted">{detail}</span>}
        </span>
        {badge}
        <RoundChevron open={open} />
      </button>
      {open && (
        <div id={id} className="animate-fade-in px-4 pb-5 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
