/**
 * The summary numbers as frosted cards on the panel at the top of the Cards
 * screen, where a bank puts the balance: `KpiGlass` slides on a phone,
 * `KpiGlassGrid` sits three across on a laptop. Both take the same `Kpi`
 * objects, so a number can never say one thing on a phone and another on a
 * laptop.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Slider } from './Slider';
import { BrandBars } from './HomeArt';
import { MoneyFigure } from '@/components/MoneyToggle';

export interface Kpi {
  key: string;
  label: string;
  value: string;
  /** A naira figure: tapping it hides or shows every balance. */
  money?: boolean;
  caption: string;
  icon: ReactNode;
  progress?: number;
  tone?: 'brand' | 'good' | 'warning' | 'critical';
  action?: { label: string; to: string };
  secondary?: { label: string; to: string };
}

function Progress({ value, track, fill }: { value?: number; track: string; fill: string }) {
  if (typeof value !== 'number') return null;
  return (
    <div className={cn('mt-2.5 h-1.5 w-full overflow-hidden rounded-full', track)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-700', fill)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function Actions({ item, primary, secondary }: { item: Kpi; primary: string; secondary: string }) {
  if (!item.action && !item.secondary) return null;
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3.5">
      {item.action && (
        <Link
          to={item.action.to}
          className={cn(
            'inline-flex h-8 items-center rounded-full px-3.5 text-label font-bold transition-opacity hover:opacity-90',
            primary,
          )}
        >
          {item.action.label}
        </Link>
      )}
      {item.secondary && (
        <Link
          to={item.secondary.to}
          className={cn(
            'inline-flex h-8 items-center gap-0.5 rounded-full px-3 text-label font-semibold transition-opacity hover:opacity-90',
            secondary,
          )}
        >
          {item.secondary.label}
          <ChevronRight size={14} aria-hidden />
        </Link>
      )}
    </div>
  );
}

function Failure({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[164px] flex-col justify-center rounded-[22px] border border-white/[0.12] bg-white/[0.07] p-4 text-white',
        className,
      )}
    >
      <p className="text-body font-semibold">Your numbers did not load</p>
      <p className="mt-1 text-label leading-snug text-white/70">Everything else still works. This is usually the connection.</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 self-start rounded-full bg-white/15 px-3.5 py-1.5 text-label font-bold">
          Try again
        </button>
      )}
    </div>
  );
}

function Figure({ item, className }: { item: Kpi; className: string }) {
  if (!item.money) return <p className={className}>{item.value}</p>;
  return (
    <MoneyFigure className={className}>
      <span>{item.value}</span>
    </MoneyFigure>
  );
}

/* glass, Cards */

function GlassCard({ item }: { item: Kpi }) {
  return (
    <article className="relative isolate flex min-h-[178px] w-full flex-col overflow-hidden rounded-[22px] border border-white/[0.14] bg-white/[0.09] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
      <BrandBars className="pointer-events-none absolute -right-5 -top-7 -z-10 h-32 w-32 text-white/[0.05]" />
      <div className="flex items-center gap-2.5">
        {item.icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden>
            {item.icon}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-body font-semibold text-white/85">{item.label}</p>
      </div>
      <Figure item={item} className="tabular mt-3 font-display text-jumbo font-bold leading-none tracking-[-0.03em]" />
      <p className="mt-2 line-clamp-2 text-label leading-snug text-white/70">{item.caption}</p>
      <Progress value={item.progress} track="bg-white/15" fill="bg-white" />
      <Actions item={item} primary="bg-white text-[color:var(--hero)]" secondary="bg-white/[0.12] text-white" />
    </article>
  );
}

export function KpiGlass({ items, failed = false, onRetry }: { items: Kpi[]; failed?: boolean; onRetry?: () => void }) {
  if (!items.length) {
    if (!failed) return null;
    return (
      <section aria-label="Summary" data-tour="summary" className="px-4">
        <Failure onRetry={onRetry} />
      </section>
    );
  }

  return (
    <Slider label="Summary" tone="hero" dataTour="summary" trackClassName="px-4 scroll-px-4">
      {items.map((item) => (
        <GlassCard key={item.key} item={item} />
      ))}
    </Slider>
  );
}

/* laptop grids */

export function KpiGlassGrid({ items, failed = false, onRetry }: { items: Kpi[]; failed?: boolean; onRetry?: () => void }) {
  if (!items.length && !failed) return null;
  return (
    <section aria-label="Summary" data-tour="summary" className="grid grid-cols-3 gap-4">
      {items.length ? (
        items.map((item) => <GlassCard key={item.key} item={item} />)
      ) : (
        <Failure onRetry={onRetry} className="col-span-3" />
      )}
    </section>
  );
}
