/**
 * The cards that slide: the summary numbers in two dresses, and the tips.
 *
 *   • `KpiBanners` — the three numbers as picture banners at the foot of the
 *     Tiles screen, sitting on the bottom bar the way a banking app's
 *     "Featured" row does. A banner uses the platform picture set on the owner
 *     console when there is one (darkened exactly as `HomeKpis` does it), and a
 *     ground of its own when there is not, so it never falls back to a plain
 *     white box.
 *   • `KpiGlass` — the same numbers as frosted cards on the red panel at the
 *     top of the Cards screen, where a bank puts the balance.
 *   • `TipSlides` — short pointers into the app, per role, at the foot of the
 *     Cards screen.
 *
 * All of them take the same `Kpi` objects as the desktop grid, so a number can
 * never say one thing on a phone and another on a laptop.
 */

import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Kpi } from './HomeKpis';
import { Slider } from './Slider';
import { Squares } from './HomeArt';
import { TipStamp, TipTexture, type TipMotif } from './TipArt';

/*
 * Grounds for a card with no picture. Every one keeps white text above 4.5:1.
 *
 * The first two follow the interface colour (`src/lib/accent.ts`): steps 700,
 * 800 and 950 all carry white text by construction, whatever colour is chosen.
 */
const GROUNDS = [
  'linear-gradient(140deg, var(--color-brand-700) 0%, var(--color-brand-900) 52%, var(--color-brand-950) 100%)',
  'radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--color-brand-600) 38%, transparent), transparent 55%), linear-gradient(140deg, #2b313b 0%, #14171c 60%, #0b0d10 100%)',
  'linear-gradient(140deg, #b45309 0%, #92400e 55%, #5c2406 100%)',
];

/**
 * The one ground the three summary cards are drawn on.
 *
 * The same as the tips row's `ink`, so the two rows on the home screen read as
 * one set rather than as two designs that happen to share a screen.
 */
const KPI_GROUND = GROUNDS[1];

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

/* ------------------------------------------------------ banners, Tiles */

/**
 * A summary number, as a card of its own.
 *
 * NO PHOTOGRAPH BEHIND IT ANY MORE, AND WHY
 *
 * Each of these used to sit on a picture uploaded in Owner → Website: three
 * photographs, set once for the whole platform, behind three numbers. The idea
 * was warmth. What it produced was a number fighting a photograph for the same
 * few hundred pixels — which the picture wins, because a photograph of
 * children is more interesting than the figure 3 — and it needed the picture
 * darkened to 36% brightness before white text was legible over the worst
 * pixel anybody might upload. A picture dimmed that far is not a picture; it
 * is an expensive texture.
 *
 * So the card is designed rather than dressed. The same ground as the tip
 * cards at the foot of the screen (`GROUNDS[1]`), the same faint squares, the
 * same white icon plate — one family, and the number is now the brightest
 * thing on it, which is the only reason the card exists.
 *
 * ONE GROUND FOR ALL THREE, deliberately. They are three readings of the same
 * week and colouring them differently implies a difference in kind that is not
 * there. The icon and the label tell them apart; the colour does not have to.
 */
function BannerCard({ item }: { item: Kpi }) {
  return (
    <article
      className="relative isolate flex min-h-[164px] w-full flex-col overflow-hidden rounded-[22px] p-4 text-white shadow-card lg:min-h-[184px] lg:p-5"
      style={{ backgroundImage: KPI_GROUND }}
    >
      <Squares className="pointer-events-none absolute -bottom-12 -right-10 -z-10 h-44 w-44 -rotate-12 text-white/[0.08]" />

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
      <Actions item={item} primary="bg-white text-[color:var(--hero)]" secondary="bg-white/15 text-white" />
    </article>
  );
}

export function KpiBanners({
  items,
  placeholders = 0,
  failed = false,
  onRetry,
  className,
}: {
  items: Kpi[];
  placeholders?: number;
  failed?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  if (!items.length) {
    /* Still loading draws nothing: the home screen shows the brand loader instead. */
    if (!placeholders || !failed) return null;
    return (
      <section aria-label="Summary" data-tour="summary" aria-busy={!failed} className={className}>
        {failed ? (
          <div className="flex min-h-[164px] flex-col justify-center rounded-[22px] border border-hairline surface-card p-4 shadow-card">
            <p className="text-[14.5px] font-semibold text-primary">Your numbers did not load</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 self-start text-[13.5px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Try again
              </button>
            )}
          </div>
        ) : (
          null
        )}
      </section>
    );
  }

  return (
    <Slider label="Summary" autoplay={6000} dataTour="summary" className={className} trackClassName={BLEED}>
      {items.map((item) => (
        <BannerCard key={item.key} item={item} />
      ))}
    </Slider>
  );
}

/* --------------------------------------------------------- glass, Cards */

function GlassCard({ item }: { item: Kpi }) {
  return (
    <article className="relative isolate flex min-h-[178px] w-full flex-col overflow-hidden rounded-[22px] border border-white/[0.14] bg-white/[0.09] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
      <Squares className="pointer-events-none absolute -right-7 -top-9 -z-10 h-36 w-36 rotate-12 text-white/[0.05]" />
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

export function KpiGlass({
  items,
  placeholders = 0,
  failed = false,
  onRetry,
}: {
  items: Kpi[];
  placeholders?: number;
  failed?: boolean;
  onRetry?: () => void;
}) {
  if (!items.length) {
    /* Still loading draws nothing: the home screen shows the brand loader instead. */
    if (!placeholders || !failed) return null;
    return (
      <section aria-label="Summary" data-tour="summary" aria-busy={!failed} className="px-4">
        <div
          className={cn(
            'flex min-h-[178px] flex-col justify-center rounded-[22px] border border-white/[0.12] bg-white/[0.07] p-4 text-white',
          )}
        >
          {failed && (
            <>
              <p className="text-[14.5px] font-semibold">Your numbers did not load</p>
              <p className="mt-1 text-[13px] leading-snug text-white/70">
                Everything below still works. This is usually the connection.
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 self-start rounded-full bg-white/15 px-3.5 py-1.5 text-[12.5px] font-bold"
                >
                  Try again
                </button>
              )}
            </>
          )}
        </div>
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

/* ------------------------------------------------------- laptop grids */

/*
 * On a laptop there is room for all three numbers at once, so the same cards
 * sit in a row rather than a slider — the reasoning `HomeKpis` gave for its
 * own desktop grid, kept. The caller decides at which widths the row shows.
 */

function GridFailure({ onRetry, onPanel }: { onRetry?: () => void; onPanel: boolean }) {
  return (
    <div
      className={cn(
        'col-span-3 flex min-h-[178px] flex-col justify-center rounded-[22px] p-5',
        onPanel ? 'border border-white/[0.12] bg-white/[0.07] text-white' : 'border border-hairline surface-card shadow-card',
      )}
    >
      <p className={cn('text-[15px] font-semibold', !onPanel && 'text-primary')}>Your numbers did not load</p>
      <p className={cn('mt-1 text-[13px] leading-snug', onPanel ? 'text-white/70' : 'text-secondary')}>
        Everything else on this page still works. This is usually the connection.
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

export function KpiGlassGrid({
  items,
  placeholders = 0,
  failed = false,
  onRetry,
}: {
  items: Kpi[];
  placeholders?: number;
  failed?: boolean;
  onRetry?: () => void;
}) {
  if (!items.length && (!placeholders || !failed)) return null;
  return (
    <section aria-label="Summary" data-tour="summary" aria-busy={!items.length && !failed} className="grid grid-cols-3 gap-4">
      {items.length
        ? items.map((item) => <GlassCard key={item.key} item={item} />)
        : failed
          ? <GridFailure onRetry={onRetry} onPanel />
          : null}
    </section>
  );
}

export function KpiBannerGrid({
  items,
  placeholders = 0,
  failed = false,
  onRetry,
}: {
  items: Kpi[];
  placeholders?: number;
  failed?: boolean;
  onRetry?: () => void;
}) {
  if (!items.length && (!placeholders || !failed)) return null;
  return (
    <section aria-label="Summary" data-tour="summary" aria-busy={!items.length && !failed} className="grid grid-cols-3 gap-5">
      {items.length
        ? items.map((item) => <BannerCard key={item.key} item={item} />)
        : failed
          ? <GridFailure onRetry={onRetry} onPanel={false} />
          : null}
    </section>
  );
}

/* ----------------------------------------------------------------- tips */

/**
 * THE TIP GROUNDS: DARK AND GREEN, AND DELIBERATELY NOT RED.
 *
 * These cards used to borrow the summary row's three grounds, one of which was
 * the brand red. On a screen whose header, panel and buttons are already that
 * red, a red card is not emphasis — it is camouflage. The row sat inside the
 * page instead of standing out from it.
 *
 * So they are their own family: near-black and deep green, with the brand red
 * kept for the mark stamped in the corner and nothing else. Green is the only
 * hue the product uses that means something on its own — it is the colour of
 * every "done" on the to-do list — and at this depth it reads as considered
 * rather than decorative. Every one keeps white text well above 4.5:1.
 */
const TIP_GROUNDS = {
  ink: 'radial-gradient(120% 95% at 100% 0%, rgba(16, 122, 72, 0.30), transparent 58%), linear-gradient(145deg, #1b2027 0%, #101317 55%, #080a0c 100%)',
  forest: 'radial-gradient(110% 90% at 88% 6%, rgba(38, 186, 114, 0.34), transparent 60%), linear-gradient(145deg, #0d6b42 0%, #08472c 55%, #042a1a 100%)',
  slate: 'radial-gradient(115% 92% at 92% 4%, rgba(56, 150, 160, 0.26), transparent 58%), linear-gradient(145deg, #1c2a33 0%, #121c22 56%, #0a1014 100%)',
} as const;

export type TipTone = keyof typeof TIP_GROUNDS;

/**
 * A tip: a headline, a mark, and one thing to do.
 *
 * NO BODY TEXT, AND THAT IS THE CHANGE.
 *
 * Every one of these used to carry a sentence or two under the title. Three
 * cards side by side meant nine lines of explanation on a screen somebody
 * opened to take a register, and the row read as documentation rather than as
 * something to act on. A headline that needs a paragraph to make sense is a
 * headline that has not been written yet, so the paragraphs went and the
 * titles were rewritten to stand up alone.
 */
export interface Tip {
  id: string;
  title: string;
  icon: LucideIcon;
  tone: TipTone;
  /** The texture behind it. Rotated by the caller so neighbours differ. */
  motif: TipMotif;
  cta?: { label: string; to?: string; onClick?: () => void };
}

function TipCard({ tip }: { tip: Tip }) {
  const Icon = tip.icon;
  const cta =
    'inline-flex h-8 items-center gap-0.5 rounded-full bg-white px-3.5 text-[12.5px] font-bold text-[#0a0f1e] transition-opacity hover:opacity-90';

  return (
    <article
      /*
       * Wider than it is tall, and shorter than it was.
       *
       * 132px against the old 152, with the paragraph gone: on a phone the row
       * now reads as a banner rather than as a stack of notes, which is the
       * whole point of the change. The laptop keeps a little more height
       * because the card is proportionally wider there.
       */
      className="relative isolate flex min-h-[132px] w-full gap-3 overflow-hidden rounded-[22px] p-4 text-white shadow-card lg:min-h-[148px] lg:p-5"
      style={{ backgroundImage: TIP_GROUNDS[tip.tone] }}
    >
      {/* The texture, then the maker's stamp over it, both barely there. */}
      <TipTexture motif={tip.motif} className="text-white/[0.07]" />
      <TipStamp className="-bottom-5 -right-4 h-32 w-32 text-white/[0.06] lg:-bottom-6 lg:-right-5 lg:h-40 lg:w-40" />

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="max-w-[20ch] font-display text-[18px] font-bold leading-[1.18] tracking-[-0.015em] lg:text-[20px]">
          {tip.title}
        </h3>
        {tip.cta && (
          <div className="mt-auto pt-3">
            {tip.cta.to ? (
              <Link to={tip.cta.to} className={cta}>
                {tip.cta.label}
                <ChevronRight size={14} aria-hidden />
              </Link>
            ) : (
              <button type="button" onClick={tip.cta.onClick} className={cta}>
                {tip.cta.label}
                <ChevronRight size={14} aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>

      <span
        className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.13] ring-1 ring-inset ring-white/15 lg:h-14 lg:w-14"
        aria-hidden
      >
        <Icon size={24} strokeWidth={1.8} />
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
  slideClassName?: string;
  className?: string;
  /** Run to the screen edge, as on a phone. Off inside a laptop's side column. */
  bleed?: boolean;
}) {
  if (!tips.length) return null;
  return (
    <Slider label="Tips" autoplay={6500} className={className} trackClassName={bleed ? BLEED : undefined} slideClassName={slideClassName}>
      {tips.map((tip) => (
        <TipCard key={tip.id} tip={tip} />
      ))}
    </Slider>
  );
}
