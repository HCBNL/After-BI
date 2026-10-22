/**
 * The laptop home screen: the phone's panel with more room, the greeting and
 * photograph, the bars behind them, the page rising over it on a curve, plus
 * the shortcuts card and the sales-month card that sit under it.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Moon, Search, Sun } from 'lucide-react';
import { useShell } from '@/components/layout/ShellContext';
import { setStoredTheme } from '@/lib/theme';
import { actionsForRole, resolveTo } from '@/lib/tiles';
import { monthPosition } from '@/lib/month';
import { cn } from '@/lib/cn';
import type { HomeLayout } from '@/hooks/useHomeLayout';
import type { Role, UserProfile } from '@/types';
import type { Kpi } from './HomeSlides';
import { KpiGlassGrid } from './HomeSlides';
import { BrandBars } from './HomeArt';
import { OrgPlanBadge } from '@/components/brand/PlanBadge';
import { displayName, greeting, LayoutButton, ProfilePhoto } from './HomeHero';

const HERO_ICON =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white transition-colors hover:bg-white/20 active:bg-white/25';

/** "Sunday, 20 September", in Lagos. */
function todayLine(): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Lagos',
  }).format(new Date());
}

/** Light or dark in one press, dressed for the panel. Follows the theme however it was changed. */
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
 * Two rows of tiles, then "Show all". The grid has a different number of
 * columns below and above the xl breakpoint, so the cut is made in CSS: tiles
 * past two rows are hidden at each width until the list is opened.
 */
function rowCut(index: number, expanded: boolean, small: number, large: number): string {
  if (expanded) return 'flex';
  if (index >= large) return 'hidden';
  if (index >= small) return 'hidden xl:flex';
  return 'flex';
}

function ShowAll({
  count,
  small,
  large,
  expanded,
  onToggle,
  dark,
}: {
  count: number;
  small: number;
  large: number;
  expanded: boolean;
  onToggle: () => void;
  dark?: boolean;
}) {
  if (count <= small) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        'mx-auto mt-3 flex items-center gap-1.5 rounded-full px-4 py-2 text-label font-bold transition-colors',
        dark ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-secondary hover:bg-[var(--surface-sunken)] hover:text-primary',
        /* Above xl two rows already hold every tile: nothing hidden, no button. */
        !expanded && count <= large && 'xl:hidden',
      )}
    >
      {expanded ? 'Show less' : `Show all (${count})`}
      {expanded ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
    </button>
  );
}

function DeskTiles({ role }: { role: Role }) {
  const [expanded, setExpanded] = useState(false);
  const actions = useMemo(() => actionsForRole(role).filter((a) => !a.soon), [role]);
  return (
    <>
    <div className="grid grid-cols-6 gap-3 xl:grid-cols-8" data-tour="shortcuts">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.id}
            to={resolveTo(action, role)}
            title={action.description}
            className={cn(rowCut(i, expanded, 12, 16), "group min-h-[112px] flex-col items-center justify-center gap-2.5 rounded-[20px] bg-white/[0.08] px-2 py-4 text-center ring-1 ring-inset ring-white/[0.08] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/[0.15]")}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.12] text-white transition-colors group-hover:bg-white group-hover:text-[color:var(--hero)]">
              <Icon size={21} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="line-clamp-2 text-label font-semibold leading-tight text-white/90">{action.label}</span>
          </Link>
        );
      })}
    </div>
    <ShowAll count={actions.length} small={12} large={16} expanded={expanded} onToggle={() => setExpanded((v) => !v)} dark />
    </>
  );
}

export function DeskHero({
  user,
  orgName,
  layout,
  kpis,
  kpiFailed = false,
  onKpiRetry,
  className,
}: {
  user: UserProfile;
  orgName: string;
  layout: HomeLayout;
  kpis: Kpi[];
  kpiFailed?: boolean;
  onKpiRetry?: () => void;
  className?: string;
}) {
  const hello = useMemo(greeting, []);
  const today = useMemo(todayLine, []);

  return (
    <section className={cn('ab-hero ab-desk relative isolate overflow-hidden pb-[4.75rem]', className)}>
      <BrandBars className="pointer-events-none absolute -right-20 -top-16 -z-10 h-[28rem] w-[28rem] text-white/[0.045]" />
      <BrandBars className="pointer-events-none absolute -bottom-24 left-[42%] -z-10 h-64 w-64 text-white/[0.03]" />

      <div className="mx-auto max-w-[1440px] px-5 pt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-body font-medium text-white/65">{today}</p>
          <div className="flex items-center gap-2">
            <HeroThemeButton />
            <LayoutButton />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-5">
          <ProfilePhoto user={user} size="lg" />
          <div className="min-w-0">
            <p className="text-lead font-medium text-white/70">{hello},</p>
            <h1 className="flex items-center gap-2 font-display text-display font-bold leading-[1.12] tracking-[-0.025em] text-white">
              <span className="truncate">{displayName(user)}</span>
              <OrgPlanBadge size={26} />
            </h1>
            <p className="mt-1 truncate text-body text-white/60">{orgName}</p>
          </div>
        </div>

        <div className="mt-8">
          {layout === 'cards' ? (
            <KpiGlassGrid items={kpis} failed={kpiFailed} onRetry={onKpiRetry} />
          ) : (
            <DeskTiles role={user.role} />
          )}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-9 rounded-t-[36px] surface-page shadow-[0_-16px_36px_-18px_rgba(0,0,0,0.5)]"
      />
    </section>
  );
}

/** The Cards layout's shortcuts on a laptop, under the curve. */
export function DeskShortcuts({ role }: { role: Role }) {
  const { openMenu } = useShell();
  const [expanded, setExpanded] = useState(false);
  const actions = useMemo(() => actionsForRole(role).filter((a) => !a.soon), [role]);

  return (
    <section
      aria-labelledby="desk-shortcuts-heading"
      className="rounded-[22px] border border-hairline surface-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="desk-shortcuts-heading" className="text-title font-semibold text-primary">
          Shortcuts
        </h2>
        <button
          type="button"
          onClick={() => openMenu({ search: true })}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
        >
          <Search size={15} aria-hidden />
          Find anything
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 xl:grid-cols-8" data-tour="shortcuts">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              to={resolveTo(action, role)}
              title={action.description}
              className={cn(rowCut(i, expanded, 8, 16), "group flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center transition-colors hover:bg-[var(--surface-sunken)]")}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/15 dark:text-brand-200 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
                <Icon size={20} strokeWidth={1.9} aria-hidden />
              </span>
              <span className="line-clamp-2 text-label font-semibold leading-tight text-secondary group-hover:text-primary">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
      <ShowAll count={actions.length} small={8} large={16} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </section>
  );
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Lagos "today", re-read every 30 seconds so the card turns over at midnight on its own. */
function useLagosToday() {
  const [now, setNow] = useState(() => monthPosition());
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = monthPosition();
      setNow((current) => (current.day === next.day && current.month === next.month && current.year === next.year ? current : next));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * A live calendar: real dates, today marked, the days of the sales month gone
 * shown quieter, and arrows to look at other months. Month end is when targets
 * close, so the bar and the days left stay underneath.
 */
export function MonthCard({ footnote }: { footnote?: string }) {
  const today = useLagosToday();
  const [offset, setOffset] = useState(0);

  const view = useMemo(() => {
    const first = new Date(Date.UTC(today.year, today.month - 1 + offset, 1));
    const year = first.getUTCFullYear();
    const month = first.getUTCMonth() + 1;
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7;
    const prevDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
    const name = first.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
    const cells: { n: number; inMonth: boolean; weekend: boolean; key: string }[] = [];
    for (let i = 0; i < lead; i += 1) cells.push({ n: prevDays - lead + 1 + i, inMonth: false, weekend: i >= 5, key: `p${i}` });
    for (let d = 1; d <= days; d += 1) cells.push({ n: d, inMonth: true, weekend: (lead + d - 1) % 7 >= 5, key: `d${d}` });
    let t = 1;
    while (cells.length % 7 !== 0 || cells.length < 35) {
      cells.push({ n: t, inMonth: false, weekend: cells.length % 7 >= 5, key: `n${t}` });
      t += 1;
    }
    return { year, month, days, name, cells };
  }, [today, offset]);

  const isThisMonth = offset === 0;
  const weekday = useMemo(
    () => new Date(Date.UTC(today.year, today.month - 1, today.day)).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }),
    [today],
  );

  const navButton =
    'flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary';

  return (
    <section
      aria-label="Calendar"
      className="relative isolate flex w-full flex-col overflow-hidden rounded-[22px] border border-hairline surface-card p-5 shadow-card"
    >
      {/* today, large */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-brand-600 text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] dark:bg-brand-500">
            <span className="text-micro font-semibold uppercase tracking-[0.14em] opacity-80">{today.name.slice(0, 3)}</span>
            <span className="font-display text-headline font-bold leading-none">{today.day}</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-lead font-semibold text-primary">{weekday}</p>
            <p className="text-label text-muted">
              Day {today.day} of {today.days} · {today.left > 0 ? `${today.left} day${today.left === 1 ? '' : 's'} to go` : 'Last day'}
            </p>
          </div>
        </div>
      </div>

      {/* month and arrows */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-body font-semibold text-primary">
          {view.name} {view.year}
        </p>
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label="Previous month" className={navButton} onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft size={16} />
          </button>
          {!isThisMonth && (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="h-8 rounded-lg px-2 text-caption font-semibold text-brand-700 transition-colors hover:bg-[var(--surface-sunken)] dark:text-brand-300"
            >
              Today
            </button>
          )}
          <button type="button" aria-label="Next month" className={navButton} onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* the grid */}
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={d} className={cn('pb-1 text-micro font-semibold uppercase tracking-wide', i >= 5 ? 'text-muted opacity-70' : 'text-muted')}>
            {d.slice(0, 2)}
          </span>
        ))}
        {view.cells.map((cell) => {
          const isToday = isThisMonth && cell.inMonth && cell.n === today.day;
          const past = isThisMonth ? cell.inMonth && cell.n < today.day : offset < 0;
          return (
            <span key={cell.key} className="flex items-center justify-center">
              <span
                title={cell.inMonth ? `${cell.n} ${view.name} ${view.year}` : undefined}
                className={cn(
                  'tabular flex h-8 w-8 items-center justify-center rounded-full text-label transition-colors',
                  !cell.inMonth && 'text-muted opacity-40',
                  cell.inMonth && !isToday && past && 'text-muted',
                  cell.inMonth && !isToday && !past && (cell.weekend ? 'text-secondary' : 'font-semibold text-primary'),
                  cell.inMonth && !isToday && 'hover:bg-[var(--surface-sunken)]',
                  isToday && 'bg-brand-600 font-bold text-white shadow-sm dark:bg-brand-500',
                )}
              >
                {cell.n}
              </span>
            </span>
          );
        })}
      </div>

      {/* the sales month */}
      <div className="mt-auto pt-4">
        <div className="h-1.5 overflow-hidden rounded-full surface-sunken" aria-hidden>
          <div className="h-full rounded-full bg-brand-600 dark:bg-brand-500" style={{ width: `${(today.day / today.days) * 100}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-caption text-muted">
          <span className="truncate">{footnote ?? `Month ends ${today.days} ${today.name}`}</span>
          <span className="shrink-0 font-semibold text-secondary">{Math.round((today.day / today.days) * 100)}% of the month</span>
        </div>
      </div>
    </section>
  );
}
