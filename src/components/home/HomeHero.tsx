/**
 * The phone home screen's coloured panel, in the two layouts a person can pick.
 *
 * WHY A PANEL AT ALL
 *
 * The old arrangement spent the top of the screen on furniture and the
 * shortcuts began below the fold on a 360px phone. This is the pattern every
 * Nigerian banking app has settled on: one coloured panel from the very top of
 * the glass, the person's name in it, and the things they came to press right
 * there. DESKTOP DOES NOT USE THIS — a laptop has room for the rail, the header
 * and the summary grid at once.
 *
 * TWO LAYOUTS, ONE PANEL
 *
 *   • Tiles — the greeting and the whole action grid, as before.
 *   • Cards — a top bar (menu, search, photograph), the greeting with the
 *     week of term, and the summary numbers as frosted cards where a bank
 *     puts the balance. The shortcuts move down onto the page (`QuickList`).
 *
 * THE CURVE
 *
 * The panel ends in the page rising over it with round shoulders, the way the
 * reference savings app does it. It is drawn as the page's own colour laid
 * over the panel's bottom edge, not as a clip path: a clip would cut the panel,
 * this only covers it, so it is correct in both themes with nothing to keep in
 * step, and the soft shadow above it is what lifts the page off the red.
 *
 * TO THE TOP OF THE GLASS
 *
 * The panel is pulled up over the page's own top padding by exactly that
 * padding. It used to be pulled up by 12px against 16px of padding, which left
 * the 4px white line across the top of the screen. `useBrowserChrome` then
 * paints the browser's own bar the same colour, so the red runs from the clock
 * down with no seam in any browser.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, ChevronUp, Menu, PanelsTopLeft, Search } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useShell } from '@/components/layout/ShellContext';
import { UnreadDot } from '@/components/layout/UnreadDot';
import { ActionDot } from '@/components/layout/ActionDot';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useSchoolBrand } from '@/context/BrandContext';
import { useOptionalSchool } from '@/context/SchoolContext';
import { useBrowserChrome } from '@/hooks/useBrowserChrome';
import { useChooserSeen, type HomeLayout } from '@/hooks/useHomeLayout';
import { termPosition, termWeeks } from '@/lib/db';
import { homeShortcuts, PORTAL_ROOT } from '@/lib/tiles';
import { cn } from '@/lib/cn';
import { PlanBadge } from '@/components/brand/PlanBadge';
import type { Role, UserProfile } from '@/types';
import type { Kpi } from './HomeKpis';
import { KpiGlass } from './HomeSlides';
import { Squares } from './HomeArt';
import type { Tier } from '@/lib/plans';

/** Twelve — three rows of four. See the note in the previous version of this file. */
const COLLAPSED = 12;

/** In the school's timezone, like the header's greeting. */
export function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', hour: 'numeric', hour12: false }).format(
      new Date(),
    ),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function displayName(user: UserProfile): string {
  return `${user.title ? `${user.title} ` : ''}${user.firstName}`;
}

/**
 * The photograph, larger than before, with a ring that actually fits it.
 *
 * THE RING, FIXED. It used to be a box-shadow on the link, and the link was an
 * inline element wrapped round an inline-flex photograph — so its box was the
 * height of a line of text rather than of the photograph, and the ring came
 * out a few pixels taller than the face inside it and off-centre. The link is
 * now a flex box exactly the size of what it holds, and the ring is a real
 * border with a small gap, so it is concentric by construction on any ground.
 */
/* The gap between the ring and the face grows with the photograph. */
const PHOTO_GAP = { md: 'p-[2px]', hero: 'p-[3px]', desk: 'p-[4px]' } as const;

export function ProfilePhoto({ user, size = 'md' }: { user: UserProfile; size?: keyof typeof PHOTO_GAP }) {
  return (
    <Link
      to={`${PORTAL_ROOT[user.role]}/profile`}
      aria-label="Your profile"
      data-tour="profile"
      className={cn(
        'flex shrink-0 rounded-full border-2 border-white/45 transition-opacity hover:opacity-90',
        PHOTO_GAP[size],
      )}
    >
      <Avatar name={`${user.firstName} ${user.lastName}`} src={user.photoURL} size={size} />
    </Link>
  );
}

/**
 * The round glass button the panel's controls are all cut from.
 *
 * It lived in `HomeDesk` and is here now because the phone's panels need it
 * too, and `HomeDesk` already imports from this file — putting it the other way
 * round would have the two importing each other.
 */
export const HERO_ICON =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white transition-colors hover:bg-white/20 active:bg-white/25';

/**
 * Notices, as a button on the panel rather than a tile in the grid.
 *
 * WHY IT MOVED OFF THE GRID
 *
 * The grid is a wall of equal squares, and Notices was the seventeenth of
 * sixteen: on a laptop it dropped alone onto a third row and left seven empty
 * slots beside it, which reads as a page that did not finish loading. Sixteen
 * fills two rows exactly.
 *
 * It is also not the same kind of thing as its neighbours. Every other tile is
 * a place you go to do work — mark a register, publish results, admit a child.
 * Notices is a thing that arrives and asks to be read, which is what a bell in
 * the corner has always meant, and it is the one item here that can carry a
 * count. On the panel it is in the same spot on a phone and a laptop, on home
 * and on every other screen, which no tile in a collapsing grid can be.
 *
 * WHY THE DOT IS WHITE HERE
 *
 * `UnreadDot` is brand red, which is correct on the white and near-black
 * surfaces it normally lands on and useless on the red panel. See its `tone`.
 */
export function NoticesButton({ role }: { role: Role }) {
  /* The owner's notices are the ones they write, not a board they are on —
     there is no school to read announcements from, so the fetch is skipped and
     the count is always zero. The button still goes to their notices screen. */
  const unread = useAnnouncements(role === 'owner').unread.length;

  return (
    <Link
      to={`${PORTAL_ROOT[role]}/notices`}
      aria-label={unread ? `Notices — ${unread} unread` : 'Notices'}
      title="Notices"
      className={HERO_ICON}
    >
      <Bell size={18} aria-hidden />
      {unread > 0 && <UnreadDot tone="hero" ring="ring-[color:var(--hero)]" className="absolute right-1 top-1" />}
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
      data-tour="layout"
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

/* ----------------------------------------------------------------- Tiles */

function TilesPanel({ user, tier }: { user: UserProfile; tier?: Tier }) {
  const hello = useMemo(greeting, []);
  const brand = useSchoolBrand();
  const [expanded, setExpanded] = useState(false);

  const actions = useMemo(() => homeShortcuts(user.role), [user.role]);
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
          {/* The school's name, and the seal for the plan it is on. */}
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-white/55">
            <span className="truncate">{user.role === 'owner' ? 'GetSchool platform' : brand.name}</span>
            {user.role !== 'owner' && tier && <PlanBadge tier={tier} size={15} />}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Where the Notices tile went. Same corner as on a laptop. */}
          <NoticesButton role={user.role} />
          <LayoutButton />
          <ProfilePhoto user={user} size="hero" />
        </div>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-4 gap-2.5" data-tour="shortcuts">
          {shown.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={action.to}
                className="relative flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[18px] bg-white/[0.09] px-1.5 py-3 text-center ring-1 ring-inset ring-white/[0.07] transition-[background-color,transform] duration-150 hover:bg-white/[0.15] active:scale-[0.97] active:bg-white/20"
              >
                <Icon size={22} strokeWidth={1.8} className="shrink-0 text-white" aria-hidden />
                <ActionDot id={action.id} className="right-2.5 top-2.5" />
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

/* ----------------------------------------------------------------- Cards */

function CardsPanel({
  user,
  kpis,
  kpiPlaceholders,
  kpiFailed,
  onKpiRetry,
}: {
  user: UserProfile;
  kpis: Kpi[];
  kpiPlaceholders: number;
  kpiFailed: boolean;
  onKpiRetry?: () => void;
}) {
  const hello = useMemo(greeting, []);
  const { openMenu } = useShell();
  /* The platform owner belongs to no school, so there may be no term to show. */
  const currentTerm = useOptionalSchool()?.currentTerm;
  const position = currentTerm?.startDate ? termPosition(currentTerm) : null;
  const week = position?.week ?? 0;
  const weeks = currentTerm ? termWeeks(currentTerm) : 0;
  const inTerm = week >= 1 && week <= weeks;

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
          {/* Where the Notices tile went. Same corner as on a laptop. */}
          <NoticesButton role={user.role} />
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
        {currentTerm?.id && (
          <div className="shrink-0 text-right">
            <p className="text-[11.5px] font-medium text-white/60">{currentTerm.name}</p>
            <p className="font-display text-[16px] font-bold leading-tight text-white">
              {position?.onBreak ? (
                'Mid-term break'
              ) : inTerm ? (
                <>
                  Week {week}
                  <span className="font-semibold text-white/55"> of {weeks}</span>
                </>
              ) : (
                currentTerm.sessionName
              )}
            </p>
          </div>
        )}
      </div>

      <div className="pt-4">
        <KpiGlass items={kpis} placeholders={kpiPlaceholders} failed={kpiFailed} onRetry={onKpiRetry} />
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- panel */

export function HomeHero({
  user,
  layout,
  kpis,
  kpiPlaceholders = 0,
  kpiFailed = false,
  onKpiRetry,
  tier,
}: {
  user: UserProfile;
  layout: HomeLayout;
  kpis: Kpi[];
  kpiPlaceholders?: number;
  kpiFailed?: boolean;
  onKpiRetry?: () => void;
  /** The school's plan, for the seal beside its name. Absent for the owner. */
  tier?: Tier;
}) {
  useBrowserChrome();

  return (
    /*
     * `-mt-4` / `sm:-mt-6` match the page's `py-4` / `sm:py-6` exactly — see
     * THE TOP OF THE GLASS above. `-mb-3` tucks the next card in under the
     * curve so the sheet reads as one surface.
     */
    <section className="gs-hero relative isolate -mx-3 -mb-3 -mt-4 overflow-hidden pb-12 sm:-mx-5 sm:-mt-6 lg:hidden">
      {/* In a clipped layer of its own, so the panel has no scrollable overflow
          for anything to scroll. See the longer note in `HomeDesk`. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Squares className="absolute -right-20 -top-14 h-72 w-72 rotate-[14deg] text-white/[0.045]" />
      </div>

      {/* The phone's status bar sits here, on the panel's own colour. */}
      <div aria-hidden className="app-top-inset" />

      {layout === 'cards' ? (
        <CardsPanel
          user={user}
          kpis={kpis}
          kpiPlaceholders={kpiPlaceholders}
          kpiFailed={kpiFailed}
          onKpiRetry={onKpiRetry}
        />
      ) : (
        <TilesPanel user={user} tier={tier} />
      )}

      {/* The curve: the page rising over the panel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-t-[28px] surface-page shadow-[0_-14px_30px_-16px_rgba(0,0,0,0.5)]"
      />
    </section>
  );
}
