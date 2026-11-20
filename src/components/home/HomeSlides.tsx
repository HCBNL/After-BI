/**
 * The cards that slide: the summary numbers in two dresses, and AfterBI's ads.
 *
 *   • `KpiBanners`: the three numbers as coloured banners at the foot of the
 *     Tiles screen, sitting on the bottom bar the way a banking app's
 *     "Featured" row does.
 *   • `KpiGlass`: the same numbers as frosted cards on the panel at the top
 *     of the Cards screen, where a bank puts the balance.
 *   • `AdSlides`: AfterBI's own ads, published by the platform owner.
 *
 * The number cards take the same `Kpi` objects, so a number can never say one thing
 * on a phone and another on a laptop.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Slider } from './Slider';
import { BrandBars } from './HomeArt';
import { MoneyFigure } from '@/components/MoneyToggle';
import { imageUrl } from '@/lib/cloudinary';
import type { AppAd } from '@/lib/siteDoc';

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

/* Every ground keeps white text above 4.5:1. The first follows the colour chosen in Profile. */
const GROUNDS = [
  'linear-gradient(140deg, var(--ground-a) 0%, var(--ground-b) 52%, var(--ground-c) 100%)',
  'radial-gradient(120% 90% at 100% 0%, rgba(16, 185, 129, 0.34), transparent 55%), linear-gradient(140deg, #2b313b 0%, #14171c 60%, #0b0d10 100%)',
  'linear-gradient(140deg, #b45309 0%, #92400e 55%, #5c2406 100%)',
];

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

function Failure({ onRetry, onPanel, className }: { onRetry?: () => void; onPanel: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[164px] flex-col justify-center rounded-[22px] p-4',
        onPanel ? 'border border-white/[0.12] bg-white/[0.07] text-white' : 'border border-hairline surface-card shadow-card',
        className,
      )}
    >
      <p className={cn('text-body font-semibold', !onPanel && 'text-primary')}>Your numbers did not load</p>
      <p className={cn('mt-1 text-label leading-snug', onPanel ? 'text-white/70' : 'text-secondary')}>
        Everything else still works. This is usually the connection.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'mt-3 self-start rounded-full px-3.5 py-1.5 text-label font-bold',
            onPanel ? 'bg-white/15' : 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200',
          )}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* banners, Tiles */

function BannerCard({ item, index }: { item: Kpi; index: number }) {
  return (
    <article
      className="relative isolate flex min-h-[164px] w-full flex-col overflow-hidden rounded-[22px] p-4 text-white shadow-card lg:min-h-[184px] lg:p-5"
      style={{ backgroundImage: GROUNDS[index % GROUNDS.length] }}
    >
      <BrandBars className="pointer-events-none absolute -bottom-10 -right-8 -z-10 h-40 w-40 text-white/[0.08]" />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-label font-semibold text-white/80">{item.label}</p>
        {item.icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden>
            {item.icon}
          </span>
        )}
      </div>
      <Figure item={item} className="tabular mt-1 font-display text-display font-bold leading-none tracking-[-0.02em]" />
      <p className="mt-1.5 line-clamp-2 text-label leading-snug text-white/85">{item.caption}</p>
      <Progress value={item.progress} track="bg-white/20" fill="bg-white" />
      <Actions item={item} primary="bg-white text-[#14171c]" secondary="bg-white/15 text-white" />
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
      <section aria-label="Summary" data-tour="summary" className={className}>
        <Failure onRetry={onRetry} onPanel={false} />
      </section>
    );
  }

  return (
    <Slider label="Summary" autoplay={6000} dataTour="summary" className={className} trackClassName={BLEED}>
      {items.map((item, i) => (
        <BannerCard key={item.key} item={item} index={i} />
      ))}
    </Slider>
  );
}

/* A KPI's number; a money one is a button that hides and shows balances. */
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
        <Failure onRetry={onRetry} onPanel />
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
        <Failure onRetry={onRetry} onPanel className="col-span-3" />
      )}
    </section>
  );
}

export function KpiBannerGrid({ items, failed = false, onRetry }: { items: Kpi[]; failed?: boolean; onRetry?: () => void }) {
  if (!items.length && !failed) return null;
  return (
    <section aria-label="Summary" data-tour="summary" className="grid grid-cols-3 gap-5">
      {items.length ? (
        items.map((item, i) => <BannerCard key={item.key} item={item} index={i} />)
      ) : (
        <Failure onRetry={onRetry} onPanel={false} className="col-span-3" />
      )}
    </section>
  );
}

/* AfterBI's own ads, uploaded by the platform owner (Platform, Website) */

/** A picture with optional words; a tap opens the link in the browser. */
function AdCard({ ad }: { ad: AppAd }) {
  const words = Boolean(ad.title || ad.body);
  const body = (
    <>
      <img
        src={imageUrl(ad.image, { width: 1200 })}
        alt={ad.title || 'AfterBI'}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      {words && <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />}
      <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
        AfterBI
      </span>
      {(words || ad.url) && (
        <span className="mt-auto flex items-end justify-between gap-3">
          <span className="min-w-0">
            {ad.title && <span className="block font-display text-title font-bold leading-tight">{ad.title}</span>}
            {ad.body && <span className="mt-0.5 line-clamp-2 block text-label text-white/80">{ad.body}</span>}
          </span>
          {ad.url && (
            <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-label font-semibold text-[#14171c]">
              {ad.cta || 'Learn more'}
              <ExternalLink size={13} aria-hidden />
            </span>
          )}
        </span>
      )}
    </>
  );
  const frame =
    'group relative isolate flex aspect-[16/7] min-h-[140px] w-full flex-col overflow-hidden rounded-[22px] bg-[var(--surface-sunken)] p-4 text-white shadow-card';
  if (!ad.url) return <article className={frame}>{body}</article>;
  return (
    <a href={ad.url} target="_blank" rel="noopener noreferrer" className={frame}>
      {body}
    </a>
  );
}

export function AdSlides({
  ads,
  className,
  bleed = true,
  slideClassName,
}: {
  ads: AppAd[];
  className?: string;
  bleed?: boolean;
  slideClassName?: string;
}) {
  if (!ads.length) return null;
  return (
    <Slider
      label="From AfterBI"
      autoplay={6500}
      className={className}
      trackClassName={bleed ? BLEED : undefined}
      slideClassName={slideClassName}
    >
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} />
      ))}
    </Slider>
  );
}
