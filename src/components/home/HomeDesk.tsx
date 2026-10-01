/**
 * The laptop home screen: the same panel, the same curve, the same cubes.
 *
 * WHY THE LAPTOP GOT THE PHONE'S SCREEN
 *
 * The laptop home was a header, a row of white summary tiles and a grid of
 * grey icons — correct, and a different product from the one on the phone. A
 * head teacher who approves notes on her phone at 7am and compiles results on
 * the office computer at 3pm should recognise the second screen as the first
 * one with more room. So this is `HomeHero` at 1024px and up: the red panel
 * from the top of the page, the photograph and the greeting, the cubes behind
 * them, and the page rising over it on a curve.
 *
 * EDGE TO EDGE
 *
 * The page's content is capped at 1400px and centred, which is right for the
 * cards and wrong for a panel: on a wide monitor it would float with white on
 * both sides. `.gs-desk` pulls it out to both edges of the content column —
 * see index.css for the arithmetic — and the inner row puts the text back on
 * the same line as the cards underneath.
 *
 * WHAT MOVED IN FROM THE HEADER
 *
 * The laptop header is hidden on home now, as it always was on the phone, so
 * the three things it carried live in the panel: notices, the theme switch
 * and the photograph. The layout button sits with them.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Search, Sun } from 'lucide-react';
import { useShell } from '@/components/layout/ShellContext';
import { useSchoolBrand } from '@/context/BrandContext';
import { useSchool } from '@/context/SchoolContext';
import { breakAfterWeek, termPosition, termWeeks } from '@/lib/db';
import { setStoredTheme } from '@/lib/theme';
import { homeShortcuts, resolveTo } from '@/lib/tiles';
import { cn } from '@/lib/cn';
import { ActionDot } from '@/components/layout/ActionDot';
import type { HomeLayout } from '@/hooks/useHomeLayout';
import { PlanBadge } from '@/components/brand/PlanBadge';
import type { Role, UserProfile } from '@/types';
import type { Kpi } from './HomeKpis';
import { KpiGlassGrid } from './HomeSlides';
import { Squares } from './HomeArt';
import { displayName, greeting, HERO_ICON, LayoutButton, NoticesButton, ProfilePhoto } from './HomeHero';
import type { Tier } from '@/lib/plans';

/* Re-exported: it is declared in HomeHero so both panels can reach it. */
export { HERO_ICON };

/** Today, the way the staffroom says it: "Thursday, 17 September". */
function todayLine(): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Lagos',
  }).format(new Date());
}

/**
 * Light or dark, in one press, drawn for the red panel.
 *
 * `ThemeToggle` is drawn for a white header and its colours are wrong on red,
 * so this is the same switch in the panel's own dress. It follows the theme
 * however it was changed — here, in the menu, or on the profile page — by
 * watching the stamp `theme.ts` puts on <html>.
 */
export function HeroThemeButton() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');

  useEffect(() => {
    const root = document.documentElement;
    const watcher = new MutationObserver(() => setDark(root.dataset.theme === 'dark'));
    watcher.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => watcher.disconnect();
  }, []);

  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={() => setStoredTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={HERO_ICON}
    >
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}

/**
 * The Tiles layout's shortcuts, on the panel.
 *
 * Every action the role has, eight to a row on a wide screen — sixteen for the
 * office, which is two clean rows. The plate turns white under the pointer so
 * a mouse user can see what they are about to press, which a thumb never
 * needed.
 */
function DeskTiles({ role }: { role: Role }) {
  const actions = useMemo(() => homeShortcuts(role), [role]);
  return (
    <div className="grid grid-cols-6 gap-3 xl:grid-cols-8" data-tour="shortcuts">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.id}
            to={resolveTo(action, role)}
            title={action.description}
            className="group relative flex min-h-[112px] flex-col items-center justify-center gap-2.5 rounded-[20px] bg-white/[0.08] px-2 py-4 text-center ring-1 ring-inset ring-white/[0.08] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/[0.15]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.12] text-white transition-colors group-hover:bg-white group-hover:text-[color:var(--hero)]">
              <Icon size={21} strokeWidth={1.8} aria-hidden />
            </span>
            <ActionDot id={action.id} className="right-3 top-3" />
            <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-white/90">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

export function DeskHero({
  user,
  layout,
  kpis,
  kpiPlaceholders = 0,
  kpiFailed = false,
  onKpiRetry,
  className,
  tier,
}: {
  user: UserProfile;
  layout: HomeLayout;
  kpis: Kpi[];
  kpiPlaceholders?: number;
  kpiFailed?: boolean;
  onKpiRetry?: () => void;
  className?: string;
  /** The school's plan, for the seal beside its name. Absent for the owner. */
  tier?: Tier;
}) {
  const hello = useMemo(greeting, []);
  const today = useMemo(todayLine, []);
  const brand = useSchoolBrand();

  return (
    <section className={cn('gs-hero gs-desk relative isolate overflow-hidden pb-[4.75rem]', className)}>
      {/*
        The cubes: one cluster off the top right, a fainter one low in the
        middle — inside a layer of their own, which is not decoration.

        The lower cluster hangs 7rem below the panel's foot. Overhang below a
        box is scrollable height, and a box that clips is still a box a script
        can scroll: `scrollIntoView` walks up the tree setting scroll offsets
        on every ancestor it can, `overflow: hidden` included. That is how the
        tour used to slide this panel's contents up and strand the curve
        across its middle.

        This wrapper is `inset-0`, so it adds nothing to the panel's scroll
        height, and it clips the cubes itself — they were already clipped by
        the panel, so nothing looks different. The panel is now exactly as tall
        as its content and there is nothing left for anything to scroll.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Squares className="absolute -right-24 -top-28 h-[30rem] w-[30rem] rotate-[14deg] text-white/[0.045]" />
        <Squares className="absolute -bottom-28 left-[42%] h-72 w-72 -rotate-12 text-white/[0.03]" />
      </div>

      {/* 1440 = the page's 1400px plus its padding, so this text lines up with the cards below. */}
      <div className="mx-auto max-w-[1440px] px-5 pt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13.5px] font-medium text-white/65">{today}</p>
          <div className="flex items-center gap-2">
            {/* Everybody's bell now, not just the owner's — it is where the
                Notices tile went when it was lifted off the grid. */}
            <NoticesButton role={user.role} />
            <HeroThemeButton />
            <LayoutButton />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-5">
          <ProfilePhoto user={user} size="desk" />
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-white/70">{hello},</p>
            <h1 className="truncate font-display text-[34px] font-bold leading-[1.12] tracking-[-0.025em] text-white">
              {displayName(user)}
            </h1>
            {/* The school's name, and the seal for the plan it is on. */}
            <p className="mt-1 flex items-center gap-2 text-[14px] text-white/60">
              <span className="truncate">{user.role === 'owner' ? 'GetSchool platform' : brand.name}</span>
              {user.role !== 'owner' && tier && <PlanBadge tier={tier} size={17} />}
            </p>
          </div>
        </div>

        <div className="mt-8">
          {layout === 'cards' ? (
            <KpiGlassGrid items={kpis} placeholders={kpiPlaceholders} failed={kpiFailed} onRetry={onKpiRetry} />
          ) : (
            <DeskTiles role={user.role} />
          )}
        </div>
      </div>

      {/* The curve, a little wider on a big screen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-9 rounded-t-[36px] surface-page shadow-[0_-16px_36px_-18px_rgba(0,0,0,0.5)]"
      />
    </section>
  );
}

/* -------------------------------------------------------------- shortcuts */

/**
 * The Cards layout's shortcuts on a laptop, under the curve.
 *
 * The same brand-tinted plates as the phone's list, laid out as tiles because
 * a laptop has the width for all of them. "Find anything" opens the menu with
 * the caret already in its search box.
 */
export function DeskShortcuts({ role }: { role: Role }) {
  const { openMenu } = useShell();
  const actions = useMemo(() => homeShortcuts(role), [role]);

  return (
    <section
      aria-labelledby="desk-shortcuts-heading"
      data-tour="shortcuts"
      className="rounded-[22px] border border-hairline surface-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="desk-shortcuts-heading" className="text-[16px] font-bold text-primary">
          Shortcuts
        </h2>
        <button
          type="button"
          onClick={() => openMenu({ search: true })}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
        >
          <Search size={15} aria-hidden />
          Find anything
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 xl:grid-cols-8">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              to={resolveTo(action, role)}
              title={action.description}
              className="group relative flex flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/15 dark:text-brand-200 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
                <Icon size={20} strokeWidth={1.9} aria-hidden />
              </span>
              <ActionDot id={action.id} className="right-3 top-2.5" />
              <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-secondary group-hover:text-primary">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- term */

/**
 * Where the term is, as a card: the week, how far through, and when it ends.
 *
 * Read from the term already in memory, so it costs nothing. The week is the
 * staffroom's week (`weekOfTerm` counts from the Monday of the first week); the
 * bar is days elapsed against the term's own dates, so a short term fills
 * faster rather than pretending to be thirteen weeks long.
 */
export function TermCard() {
  const { currentTerm } = useSchool();
  if (!currentTerm?.id || !currentTerm.startDate) return null;

  const weeks = termWeeks(currentTerm);
  const position = termPosition(currentTerm);
  const week = Math.min(weeks, Math.max(1, position.week));
  const breakAfter = breakAfterWeek(currentTerm);
  const showBreak = breakAfter !== null && breakAfter < weeks;
  const start = new Date(`${currentTerm.startDate}T12:00:00`).getTime();
  const end = currentTerm.endDate ? new Date(`${currentTerm.endDate}T12:00:00`).getTime() : NaN;
  const span = end - start;
  const progress = Number.isFinite(span) && span > 0
    ? Math.max(0, Math.min(100, ((Date.now() - start) / span) * 100))
    : (week / weeks) * 100;
  const endsOn = Number.isFinite(end)
    ? new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(end))
    : null;
  const left = weeks - week;

  return (
    /*
     * Stretched by the home grid to the height of the "To do" card beside it,
     * so the row reads as one piece. The room that gives is spent on the term
     * drawn as one square a week — the cubes again — with the weeks gone
     * filled, this week ringed, and the weeks to come empty; the end date and
     * the bar sit at the foot whatever the height.
     */
    <section
      aria-label="This term"
      className="relative isolate flex w-full flex-col overflow-hidden rounded-[22px] border border-hairline surface-card p-5 shadow-card"
    >
      <Squares className="pointer-events-none absolute -right-9 -top-11 -z-10 h-40 w-40 rotate-12 text-brand-600/[0.07] dark:text-brand-400/[0.09]" />
      <p className="text-[13px] font-semibold text-secondary">
        {currentTerm.name}, {currentTerm.sessionName}
      </p>
      {position.onBreak ? (
        <p className="mt-2 font-display text-[32px] font-bold leading-none tracking-[-0.03em] text-primary">
          Mid-term break
        </p>
      ) : (
        <p className="mt-2 font-display text-[40px] font-bold leading-none tracking-[-0.03em] text-primary">
          Week {week}
          <span className="text-[19px] font-semibold tracking-normal text-muted"> of {weeks}</span>
        </p>
      )}

      {/* Centred in whatever room the stretch leaves, with its two ends named. */}
      <div className="my-auto py-5">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${weeks + (showBreak ? 1 : 0)}, minmax(0, 1fr))` }}
        role="img"
        aria-label={position.onBreak ? `Mid-term break, after week ${week} of ${weeks}` : `Week ${week} of ${weeks}`}
      >
        {Array.from({ length: weeks }, (_, i) => i + 1).flatMap((n) => {
          const done = n < week || (position.onBreak && n === week);
          const square = (
            <span
              key={n}
              title={`Week ${n}`}
              className={cn(
                'block aspect-square rounded-[5px]',
                done && 'bg-brand-600/80 dark:bg-brand-500/75',
                !done && n === week && 'bg-brand-600 outline outline-2 outline-offset-2 outline-brand-600/35 dark:bg-brand-500',
                n > week && 'surface-sunken',
              )}
            />
          );
          if (!showBreak || n !== breakAfter) return [square];
          // The break, in gold, where it falls — ringed while the school is on it.
          return [
            square,
            <span
              key="break"
              title="Mid-term break"
              className={cn(
                'block aspect-square rounded-[5px] bg-gold-400/70 dark:bg-gold-400/55',
                position.onBreak && 'outline outline-2 outline-offset-2 outline-gold-500/60',
              )}
            />,
          ];
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2 text-[11px] font-medium text-muted" aria-hidden>
        <span>Week 1</span>
        {showBreak && <span className="text-gold-700 dark:text-gold-300">Break after week {breakAfter}</span>}
        <span>Week {weeks}</span>
      </div>
      </div>

      <div>
        <div className="h-2 overflow-hidden rounded-full surface-sunken" aria-hidden>
          <div className="h-full rounded-full bg-brand-600 dark:bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 text-[12.5px] text-muted">
          <span className="truncate">{endsOn ? `Ends ${endsOn}` : 'End date not set'}</span>
          <span className="shrink-0 font-semibold text-secondary">
            {left > 0 ? `${left} week${left === 1 ? '' : 's'} to go` : 'Final week'}
          </span>
        </div>
      </div>
    </section>
  );
}
