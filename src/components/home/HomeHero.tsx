/**
 * The phone home screen's coloured panel, in the two layouts a person can pick.
 *
 *   • Tiles: the greeting and the whole action grid.
 *   • Cards: a top bar (menu, search, photograph), the greeting with the day
 *     of the sales month, and the summary numbers as frosted cards where a bank
 *     puts the balance. The shortcuts move down onto the page (`QuickList`).
 *
 * It ends in the page rising over it on a curve, and it runs to the top of the
 * glass: `useBrowserChrome` paints the browser's own bar the same colour.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Menu, PanelsTopLeft, Search } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useShell } from '@/components/layout/ShellContext';
import { useBrowserChrome } from '@/hooks/useBrowserChrome';
import { useChooserSeen, type HomeLayout } from '@/hooks/useHomeLayout';
import { actionsForRole, PORTAL_ROOT, resolveTo } from '@/lib/tiles';
import { monthPosition } from '@/lib/month';
import { cn } from '@/lib/cn';
import type { UserProfile } from '@/types';
import type { Kpi } from './HomeSlides';
import { KpiGlass } from './HomeSlides';
import { PanelTexture } from './HomeArt';

/** Three rows of four before "Show all". */
const COLLAPSED = 12;

/** In Lagos time, whatever the device says. */
export function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', hour: 'numeric', hour12: false }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function displayName(user: UserProfile): string {
  return `${user.title ? `${user.title} ` : ''}${user.firstName}`;
}

/* The ring sits a small gap off the face, growing with the photograph. */
const PHOTO = {
  sm: { gap: 'p-[2px]', avatar: 'sm' },
  md: { gap: 'p-[3px]', avatar: 'md' },
  lg: { gap: 'p-[4px]', avatar: 'lg' },
} as const;

export function ProfilePhoto({ user, size = 'sm' }: { user: UserProfile; size?: keyof typeof PHOTO }) {
  return (
    <Link
      to={`${PORTAL_ROOT[user.role]}/profile`}
      aria-label="Your profile"
      className={cn(
        'flex shrink-0 rounded-full border-2 border-white/45 transition-opacity hover:opacity-90',
        PHOTO[size].gap,
      )}
    >
      <Avatar name={`${user.firstName} ${user.lastName}`} src={user.photoURL} size={PHOTO[size].avatar} />
    </Link>
  );
}

/** Opens "Choose your home screen". Wears a gold dot until it has been opened once. */
export function LayoutButton() {
  const { openHomeChooser } = useShell();
  const seen = useChooserSeen();
  return (
    <button
      type="button"
      onClick={openHomeChooser}
      aria-label="Change home screen"
      title="Change home screen"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white transition-colors hover:bg-white/20 active:bg-white/25"
    >
      <PanelsTopLeft size={19} strokeWidth={1.9} aria-hidden />
      {!seen && (
        <span
          className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-gold-400 ring-2 ring-[color:var(--hero)]"
          aria-hidden
        />
      )}
    </button>
  );
}

function HeroButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:bg-white/15"
    >
      {children}
    </button>
  );
}

function TilesPanel({ user, orgName }: { user: UserProfile; orgName: string }) {
  const hello = useMemo(greeting, []);
  const [expanded, setExpanded] = useState(false);

  const actions = useMemo(() => actionsForRole(user.role).filter((a) => !a.soon), [user.role]);
  const overflows = actions.length > COLLAPSED;
  const shown = overflows && !expanded ? actions.slice(0, COLLAPSED) : actions;

  return (
    <>
      <div className="flex items-center gap-3 px-5 pb-6 pt-5">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-white/70">{hello},</p>
          <h1 className="mt-0.5 break-words font-display text-[24px] font-bold leading-[1.15] tracking-[-0.02em] text-white">
            {displayName(user)}
          </h1>
          <p className="mt-1.5 truncate text-[12.5px] text-white/55">{orgName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <LayoutButton />
          <ProfilePhoto user={user} size="md" />
        </div>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-4 gap-2.5">
          {shown.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={resolveTo(action, user.role)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[18px] bg-white/[0.09] px-1.5 py-3 text-center ring-1 ring-inset ring-white/[0.07] transition-[background-color,transform] duration-150 hover:bg-white/[0.15] active:scale-[0.97] active:bg-white/20"
              >
                <Icon size={22} strokeWidth={1.8} className="shrink-0 text-white" aria-hidden />
                <span className="line-clamp-2 text-[11px] font-semibold leading-[1.25] text-white/90">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>

        {overflows && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mx-auto mt-3 flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {expanded ? 'Show less' : 'Show all'}
            {expanded ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
          </button>
        )}
      </div>
    </>
  );
}

function CardsPanel({
  user,
  kpis,
  kpiFailed,
  onKpiRetry,
}: {
  user: UserProfile;
  kpis: Kpi[];
  kpiFailed: boolean;
  onKpiRetry?: () => void;
}) {
  const hello = useMemo(greeting, []);
  const month = useMemo(() => monthPosition(), []);
  const { openMenu } = useShell();

  return (
    <>
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center">
          <HeroButton label="Menu" onClick={() => openMenu()}>
            <Menu size={22} strokeWidth={1.9} aria-hidden />
          </HeroButton>
          <HeroButton label="Search" onClick={() => openMenu({ search: true })}>
            <Search size={20} strokeWidth={2} aria-hidden />
          </HeroButton>
        </div>
        <div className="flex items-center gap-2 pr-2">
          <LayoutButton />
          <ProfilePhoto user={user} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 px-5 pt-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white/70">{hello},</p>
          <h1 className="truncate font-display text-[21px] font-bold leading-tight tracking-[-0.02em] text-white">
            {displayName(user)}
          </h1>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11.5px] font-medium text-white/60">{month.name}</p>
          <p className="font-display text-[16px] font-bold leading-tight text-white">
            Day {month.day}
            <span className="font-semibold text-white/55"> of {month.days}</span>
          </p>
        </div>
      </div>

      <div className="pt-4">
        <KpiGlass items={kpis} failed={kpiFailed} onRetry={onKpiRetry} />
      </div>
    </>
  );
}

export function HomeHero({
  user,
  orgName,
  layout,
  kpis,
  kpiFailed = false,
  onKpiRetry,
}: {
  user: UserProfile;
  orgName: string;
  layout: HomeLayout;
  kpis: Kpi[];
  kpiFailed?: boolean;
  onKpiRetry?: () => void;
}) {
  useBrowserChrome();

  return (
    /* The negative margins match the page's own padding exactly, so the panel meets the top of the glass. */
    <section className="ab-hero relative isolate -mx-3 -mb-3 -mt-4 overflow-hidden pb-12 sm:-mx-5 sm:-mt-6 lg:hidden">
      <PanelTexture className="pointer-events-none absolute -right-14 -top-8 -z-10 h-64 w-64 text-white/[0.045]" />
      <div aria-hidden style={{ height: 'var(--safe-top)' }} />

      {layout === 'cards' ? (
        <CardsPanel user={user} kpis={kpis} kpiFailed={kpiFailed} onKpiRetry={onKpiRetry} />
      ) : (
        <TilesPanel user={user} orgName={orgName} />
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-t-[28px] surface-page shadow-[0_-14px_30px_-16px_rgba(0,0,0,0.5)]"
      />
    </section>
  );
}
