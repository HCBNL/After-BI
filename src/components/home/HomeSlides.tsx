/**
 * The cards that slide: the summary numbers in two dresses, and the tips.
 *
 *   • `KpiBanners` — the three numbers as coloured banners at the foot of the
 *     Tiles screen, sitting on the bottom bar the way a banking app's
 *     "Featured" row does.
 *   • `KpiGlass` — the same numbers as frosted cards on the panel at the top
 *     of the Cards screen, where a bank puts the balance.
 *   • `TipSlides` — short pointers into the app, per role.
 *
 * All of them take the same `Kpi` objects, so a number can never say one thing
 * on a phone and another on a laptop.
 */
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Kpi } from './HomeKpis';
import { Slider } from './Slider';
import { Bars } from './HomeArt';

/* Every ground keeps white text above 4.5:1. */
const GROUNDS = [
  'linear-gradient(140deg, #0a7a52 0%, #065f46 52%, #022c22 100%)',
  'radial-gradient(120% 90% at 100% 0%, rgba(16, 185, 129, 0.34), transparent 55%), linear-gradient(140deg, #2b313b 0%, #14171c 60%, #0b0d10 100%)',
  'linear-gradient(140deg, #b45309 0%, #92400e 55%, #5c2406 100%)',
];

const TIP_GROUNDS = {
  brand: GROUNDS[0],
  ink: GROUNDS[1],
  amber: GROUNDS[2],
  blue: 'linear-gradient(140deg, #1d63c7 0%, #174a93 52%, #0c2a57 100%)',
} as const;

/* The track runs to the screen edge so the next card can peek past it. */
const BLEED = '-mx-3 px-3 scroll-px-3 sm:-mx-5 sm:px-5 sm:scroll-px-5';

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
            'inline-flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-bold transition-opacity hover:opacity-90',
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
            'inline-flex h-8 items-center gap-0.5 rounded-full px-3 text-[12.5px] font-semibold transition-opacity hover:opacity-90',
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

function Failure({ onRetry, onPanel, className }: { onRetry?: () => void; onPanel: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[164px] flex-col justify-center rounded-[22px] p-4',
        onPanel ? 'border border-white/[0.12] bg-white/[0.07] text-white' : 'border border-hairline surface-card shadow-card',
        className,
      )}
    >
      <p className={cn('text-[14.5px] font-semibold', !onPanel && 'text-primary')}>Your numbers did not load</p>
      <p className={cn('mt-1 text-[13px] leading-snug', onPanel ? 'text-white/70' : 'text-secondary')}>
        Everything else still works. This is usually the connection.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'mt-3 self-start rounded-full px-3.5 py-1.5 text-[12.5px] font-bold',
            onPanel ? 'bg-white/15' : 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200',
          )}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------ banners, Tiles */

function BannerCard({ item, index }: { item: Kpi; index: number }) {
  return (
    <article
      className="relative isolate flex min-h-[164px] w-full flex-col overflow-hidden rounded-[22px] p-4 text-white shadow-card lg:min-h-[184px] lg:p-5"
      style={{ backgroundImage: GROUNDS[index % GROUNDS.length] }}
    >
      <Bars className="pointer-events-none absolute -bottom-10 -right-8 -z-10 h-40 w-40 text-white/[0.08]" />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[13px] font-semibold text-white/80">{item.label}</p>
        {item.icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden>
            {item.icon}
          </span>
        )}
      </div>
      <p className="tabular mt-1 font-display text-[32px] font-bold leading-none tracking-[-0.02em]">{item.value}</p>
      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-white/85">{item.caption}</p>
      <Progress value={item.progress} track="bg-white/20" fill="bg-white" />
      <Actions item={item} primary="bg-white text-[#064e3b]" secondary="bg-white/15 text-white" />
    </article>
  );
}

export function KpiBanners({
  items,
  failed = false,
  onRetry,
  className,
}: {
  items: Kpi[];
  failed?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  if (!items.length) {
    if (!failed) return null;
    return (
      <section aria-label="Summary" className={className}>
        <Failure onRetry={onRetry} onPanel={false} />
      </section>
    );
  }

  return (
    <Slider label="Summary" autoplay={6000} className={className} trackClassName={BLEED}>
      {items.map((item, i) => (
        <BannerCard key={item.key} item={item} index={i} />
      ))}
    </Slider>
  );
}

/* --------------------------------------------------------- glass, Cards */

function GlassCard({ item }: { item: Kpi }) {
  return (
    <article className="relative isolate flex min-h-[178px] w-full flex-col overflow-hidden rounded-[22px] border border-white/[0.14] bg-white/[0.09] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
      <Bars className="pointer-events-none absolute -right-5 -top-7 -z-10 h-32 w-32 text-white/[0.05]" />
      <div className="flex items-center gap-2.5">
        {item.icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden>
            {item.icon}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-white/85">{item.label}</p>
      </div>
      <p className="tabular mt-3 font-display text-[40px] font-bold leading-none tracking-[-0.03em]">{item.value}</p>
      <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-white/70">{item.caption}</p>
      <Progress value={item.progress} track="bg-white/15" fill="bg-white" />
      <Actions item={item} primary="bg-white text-[color:var(--hero)]" secondary="bg-white/[0.12] text-white" />
    </article>
  );
}

export function KpiGlass({ items, failed = false, onRetry }: { items: Kpi[]; failed?: boolean; onRetry?: () => void }) {
  if (!items.length) {
    if (!failed) return null;
    return (
      <section aria-label="Summary" className="px-4">
        <Failure onRetry={onRetry} onPanel />
      </section>
    );
  }

  return (
    <Slider label="Summary" tone="hero" trackClassName="px-4 scroll-px-4">
      {items.map((item) => (
        <GlassCard key={item.key} item={item} />
      ))}
    </Slider>
  );
}

/* ------------------------------------------------------- laptop grids */

export function KpiGlassGrid({ items, failed = false, onRetry }: { items: Kpi[]; failed?: boolean; onRetry?: () => void }) {
  if (!items.length && !failed) return null;
  return (
    <section aria-label="Summary" className="grid grid-cols-3 gap-4">
      {items.length ? (
        items.map((item) => <GlassCard key={item.key} item={item} />)
      ) : (
        <Failure onRetry={onRetry} onPanel className="col-span-3" />
      )}
    </section>
  );
}

export function KpiBannerGrid({ items, failed = false, onRetry }: { items: Kpi[]; failed?: boolean; onRetry?: () => void }) {
  if (!items.length && !failed) return null;
  return (
    <section aria-label="Summary" className="grid grid-cols-3 gap-5">
      {items.length ? (
        items.map((item, i) => <BannerCard key={item.key} item={item} index={i} />)
      ) : (
        <Failure onRetry={onRetry} onPanel={false} className="col-span-3" />
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- tips */

export interface Tip {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
  tone: keyof typeof TIP_GROUNDS;
  cta?: { label: string; to: string };
}

function TipCard({ tip }: { tip: Tip }) {
  const Icon = tip.icon;
  return (
    <article
      className="relative isolate flex min-h-[152px] w-full gap-3 overflow-hidden rounded-[22px] p-4 text-white shadow-card"
      style={{ backgroundImage: TIP_GROUNDS[tip.tone] }}
    >
      <Bars className="pointer-events-none absolute -bottom-12 -right-10 -z-10 h-44 w-44 text-white/[0.07]" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-display text-[17px] font-bold leading-[1.22] tracking-[-0.01em]">{tip.title}</h3>
        <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-white/80">{tip.body}</p>
        {tip.cta && (
          <div className="mt-auto pt-3">
            <Link
              to={tip.cta.to}
              className="inline-flex h-8 items-center gap-0.5 rounded-full bg-white px-3.5 text-[12.5px] font-bold text-[#14171c] transition-opacity hover:opacity-90"
            >
              {tip.cta.label}
              <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
        )}
      </div>
      <span
        className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/15"
        aria-hidden
      >
        <Icon size={26} strokeWidth={1.8} />
      </span>
    </article>
  );
}

export function TipSlides({
  tips,
  className,
  bleed = true,
  slideClassName,
}: {
  tips: Tip[];
  className?: string;
  bleed?: boolean;
  slideClassName?: string;
}) {
  if (!tips.length) return null;
  return (
    <Slider
      label="Tips"
      autoplay={6500}
      className={className}
      trackClassName={bleed ? BLEED : undefined}
      slideClassName={slideClassName}
    >
      {tips.map((tip) => (
        <TipCard key={tip.id} tip={tip} />
      ))}
    </Slider>
  );
}
