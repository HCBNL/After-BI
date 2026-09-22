/**
 * The laptop home screen: the phone's panel with more room, the greeting and
 * photograph, the bars behind them, the page rising over it on a curve, plus
 * the shortcuts card and the sales-month card that sit under it.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Search, Sun } from 'lucide-react';
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
import { displayName, greeting, LayoutButton, ProfilePhoto } from './HomeHero';

export const HERO_ICON =
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

function DeskTiles({ role }: { role: Role }) {
  const actions = useMemo(() => actionsForRole(role).filter((a) => !a.soon), [role]);
  return (
    <div className="grid grid-cols-6 gap-3 xl:grid-cols-8">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.id}
            to={resolveTo(action, role)}
            title={action.description}
            className="group flex min-h-[112px] flex-col items-center justify-center gap-2.5 rounded-[20px] bg-white/[0.08] px-2 py-4 text-center ring-1 ring-inset ring-white/[0.08] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/[0.15]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.12] text-white transition-colors group-hover:bg-white group-hover:text-[color:var(--hero)]">
              <Icon size={21} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-white/90">{action.label}</span>
          </Link>
        );
      })}
    </div>
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
          <p className="text-[13.5px] font-medium text-white/65">{today}</p>
          <div className="flex items-center gap-2">
            <HeroThemeButton />
            <LayoutButton />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-5">
          <ProfilePhoto user={user} size="lg" />
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-white/70">{hello},</p>
            <h1 className="truncate font-display text-[34px] font-bold leading-[1.12] tracking-[-0.025em] text-white">
              {displayName(user)}
            </h1>
            <p className="mt-1 truncate text-[14px] text-white/60">{orgName}</p>
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
  const actions = useMemo(() => actionsForRole(role).filter((a) => !a.soon), [role]);

  return (
    <section
      aria-labelledby="desk-shortcuts-heading"
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
              className="group flex flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/15 dark:text-brand-200 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
                <Icon size={20} strokeWidth={1.9} aria-hidden />
              </span>
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

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Where the sales month stands, as a card: today ringed on a small calendar,
 * the days gone filled, the days left empty: month-end is when targets close.
 */
export function MonthCard({ footnote }: { footnote?: string }) {
  const m = useMemo(() => monthPosition(), []);
  const cells: (number | null)[] = [
    ...Array.from({ length: m.firstWeekday }, () => null),
    ...Array.from({ length: m.days }, (_, i) => i + 1),
  ];

  return (
    <section
      aria-label="This month"
      className="relative isolate flex w-full flex-col overflow-hidden rounded-[22px] border border-hairline surface-card p-5 shadow-card"
    >
      <BrandBars className="pointer-events-none absolute -right-6 -top-8 -z-10 h-36 w-36 text-brand-600/[0.07] dark:text-brand-400/[0.09]" />
      <p className="text-[13px] font-semibold text-secondary">
        Sales month, {m.name} {m.year}
      </p>
      <p className="mt-2 font-display text-[40px] font-bold leading-none tracking-[-0.03em] text-primary">
        Day {m.day}
        <span className="text-[19px] font-semibold tracking-normal text-muted"> of {m.days}</span>
      </p>

      <div className="my-auto py-5">
        <div
          className="mx-auto grid w-full max-w-[17rem] grid-cols-7 gap-1.5"
          role="img"
          aria-label={`Day ${m.day} of ${m.days}`}
        >
          {WEEKDAYS.map((d, i) => (
            <span key={`h${i}`} aria-hidden className="pb-0.5 text-center text-[10.5px] font-semibold text-muted">
              {d}
            </span>
          ))}
          {cells.map((n, i) =>
            n === null ? (
              <span key={`e${i}`} aria-hidden />
            ) : (
              <span
                key={n}
                title={`${n} ${m.name}`}
                className={cn(
                  'block aspect-square rounded-[5px]',
                  n < m.day && 'bg-brand-600/80 dark:bg-brand-500/75',
                  n === m.day && 'bg-brand-600 outline outline-2 outline-offset-2 outline-brand-600/35 dark:bg-brand-500',
                  n > m.day && 'surface-sunken',
                )}
              />
            ),
          )}
        </div>
      </div>

      <div>
        <div className="h-2 overflow-hidden rounded-full surface-sunken" aria-hidden>
          <div
            className="h-full rounded-full bg-brand-600 dark:bg-brand-500"
            style={{ width: `${(m.day / m.days) * 100}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 text-[12.5px] text-muted">
          <span className="truncate">{footnote ?? `Month ends ${m.days} ${m.name}`}</span>
          <span className="shrink-0 font-semibold text-secondary">
            {m.left > 0 ? `${m.left} day${m.left === 1 ? '' : 's'} to go` : 'Last day'}
          </span>
        </div>
      </div>
    </section>
  );
}
