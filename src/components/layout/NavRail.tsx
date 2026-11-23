import { useEffect, useMemo, useState } from 'react';
import { useSelfPhoto } from '@/lib/selfPhoto';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BellRing,
  Building2,
  Home,
  LayoutGrid,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconArt } from '@/components/ui/IconArt';
import { MarkSolid, Wordmark } from '@/components/brand/Wordmark';
import { OrgPlanBadge } from '@/components/brand/PlanBadge';
import { Avatar } from '@/components/ui';
import { actionsForRole, GROUP_ORDER, PORTAL_ROOT, resolveTo, type ActionGroup, type AppAction } from '@/lib/tiles';
import { isActionLocked, useEntitlements } from '@/lib/plans';
import { fullName } from '@/lib/roles';
import { ROLE_LABEL, type Role, type UserProfile } from '@/types';
import { useShell } from './ShellContext';
import { useReminders } from '@/context/RemindersContext';

/**
 * The laptop's navigation, laid out the way GetSchool's is.
 *
 * Every section is open all the time: a small label with its screens under it.
 * There are no fold buttons on the sections and no visible scrollbar, so the
 * column never narrows and every icon sits on the same centre line. Folded to
 * icons (the button at the top), each icon is centred in the rail and keeps its
 * name as a tooltip. Pinned at the top: the organisation, search, Home and
 * Reminders. Pinned at the foot: All actions and the person signed in.
 */

const COLLAPSED_KEY = 'afterbi.rail.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

const ICON_BUTTON =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary';

export function NavRail({
  role,
  person,
  orgName,
  onSignOut,
}: {
  role: Role;
  person: UserProfile;
  orgName: string;
  onSignOut: () => void;
}) {
  const photo = useSelfPhoto(person);
  const root = PORTAL_ROOT[role];
  const { openMenu } = useShell();
  /* Only what is new: seen reminders still stand, but they stop counting. */
  const { fresh } = useReminders();
  const entitlements = useEntitlements();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const location = useLocation();

  /* The logo is the home button. Already home: refresh it. */
  const goHome = (e: React.MouseEvent) => {
    if (location.pathname === root) {
      e.preventDefault();
      window.location.reload();
    }
  };
  const logo = (
    <Link to={root} onClick={goHome} title="Home" aria-label="Home" className="rounded-lg transition-opacity hover:opacity-80">
      <Wordmark className="text-[1.5rem]" />
    </Link>
  );

  /* Ctrl B (Cmd B) folds or opens the menu, as in most desktop apps. */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* private mode: the choice lasts this visit */
    }
  }, [collapsed]);

  const groups = useMemo(() => {
    const map = new Map<ActionGroup, AppAction[]>();
    for (const action of actionsForRole(role).filter((a) => !a.soon && a.id !== 'reminders')) {
      map.set(action.group, [...(map.get(action.group) ?? []), action]);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((group) => ({ group, items: map.get(group)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, entitlements]);

  const showReminders = role !== 'agent' && !isActionLocked('reminders');

  return (
    <nav
      aria-label="Main"
      className={cn(
        'hidden lg:flex lg:flex-col',
        'sticky top-0 z-30 h-dvh shrink-0 border-r border-hairline surface-card',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-[72px]' : 'w-[244px]',
      )}
    >
      {/* the top: pinned */}
      <div className="shrink-0 px-2.5 pt-3">
        {/* Only the logo up here. The menu folds from its edge (see the handle below). */}
        <div className={cn('flex h-11 items-center', collapsed ? 'justify-center' : 'pl-2')}>
          {collapsed ? (
            <Link to={root} onClick={goHome} title="Home" aria-label="Home" className="rounded-lg p-1 text-primary transition-opacity hover:opacity-80">
              <MarkSolid className="h-[22px] w-[36px]" />
            </Link>
          ) : (
            logo
          )}
        </div>

        {collapsed ? (
          <div className="mt-1 flex justify-center" title={orgName}>
            <OrgPlanBadge size={22} />
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-[var(--surface-sunken)] px-3 py-2">
            <Building2 size={15} className="shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-caption font-medium text-secondary">{orgName}</span>
            <OrgPlanBadge size={17} />
          </div>
        )}

        <button
          type="button"
          onClick={() => openMenu({ search: true })}
          aria-label="Search"
          title="Search (Ctrl K)"
          className={cn(
            'mt-2 flex h-10 w-full items-center rounded-xl text-label text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary',
            collapsed ? 'justify-center' : 'gap-2.5 border border-hairline px-3',
          )}
        >
          <Search size={17} aria-hidden />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <kbd className="rounded-md border border-hairline px-1.5 py-0.5 font-sans text-micro font-semibold text-muted">Ctrl K</kbd>
            </>
          )}
        </button>

      </div>

      {/* the middle: every section open; scrollbar hidden so the icons stay centred */}
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 pb-2">
        {/* Home and Reminders scroll with everything else; the logo is the home button too. */}
        <div className="mt-2 space-y-0.5">
          <RailLink to={root} end icon={Home} label="Home" collapsed={collapsed} />
          {showReminders && (
            <RailLink to={`${root}/reminders`} icon={BellRing} label="Reminders" collapsed={collapsed} badge={fresh.action} />
          )}
        </div>
        {groups.map(({ group, items }) => (
          <section key={group} aria-label={group} className="mt-3.5 first:mt-2">
            {collapsed ? (
              <span aria-hidden className="mx-auto mb-1.5 block h-px w-6 bg-[var(--border-hairline)]" />
            ) : (
              <p className="px-3 pb-1 text-micro font-semibold uppercase tracking-[0.08em] text-muted">{group}</p>
            )}
            <ul className="space-y-0.5">
              {items.map((action) => (
                <li key={action.id}>
                  <RailLink to={resolveTo(action, role)} icon={action.icon} label={action.label} artId={action.id} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {/* All actions sits at the end of the list, not pinned, so the menu has room. */}
        <div className="mt-3.5 border-t border-hairline pt-2">
          <RailLink to={`${root}/all`} icon={LayoutGrid} label="All actions" collapsed={collapsed} />
        </div>
      </div>

      {/* the foot: only the person signed in */}
      <div className="shrink-0 border-t border-hairline px-2.5 py-3">

        <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'rounded-2xl bg-[var(--surface-sunken)] p-2')}>
          <Link
            to={`${root}/profile`}
            title="Your profile"
            className={cn('flex min-w-0 items-center gap-2.5 rounded-xl transition-opacity hover:opacity-85', collapsed ? 'justify-center' : 'flex-1')}
          >
            <Avatar name={`${person.firstName} ${person.lastName}`} src={photo} size="sm" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-label font-medium text-primary">{fullName(person)}</span>
                <span className="block truncate text-caption text-muted">{ROLE_LABEL[role]}</span>
              </span>
            )}
          </Link>
          <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className={cn(ICON_BUTTON, 'hover:text-[#b3261e]')}>
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
      {/*
        Folding the menu: there is no button for it. Hovering the border
        between the menu and the page shows a line and a small round handle;
        a click folds the menu to its icons, or opens it again. Ctrl B (Cmd B
        on a Mac) does the same.
      */}
      <div className="group/edge absolute inset-y-0 -right-3 z-20 w-6">
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-brand-500 opacity-0 transition-opacity duration-150 group-hover/edge:opacity-100" />
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Open the menu' : 'Fold the menu'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Open the menu (Ctrl B)' : 'Fold the menu (Ctrl B)'}
          className="absolute left-1/2 top-[84px] flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-hairline surface-card text-secondary opacity-0 shadow-card transition-[opacity,color] duration-150 hover:text-primary focus-visible:opacity-100 group-hover/edge:opacity-100"
        >
          {collapsed ? <ChevronRight size={15} aria-hidden /> : <ChevronLeft size={15} aria-hidden />}
        </button>
      </div>
    </nav>
  );
}

function RailLink({
  to,
  label,
  icon: Icon,
  artId,
  end,
  collapsed,
  badge,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  /** What the badge stands for, so it wears the same colour as on the tiles. */
  artId?: string;
  end?: boolean;
  collapsed?: boolean;
  badge?: number;
}) {
  /*
    One container per row, no borders. Hover tints the row. The current screen
    gets a soft accent wash (the product's colour, --ground-a) that fades out to
    the right, and its icon tile is filled with that same colour.
  */
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-xl transition-colors duration-150',
          collapsed ? 'justify-center p-1' : 'gap-3 px-1.5 py-1',
          isActive && !collapsed
            ? 'bg-[linear-gradient(90deg,color-mix(in_oklab,var(--ground-a)_16%,transparent)_0%,transparent_100%)]'
            : 'hover:bg-[var(--surface-sunken)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative flex shrink-0 items-center justify-center">
            <IconArt icon={Icon} id={artId ?? label} variant={isActive ? 'color' : 'soft'} size={36} />
            {collapsed && Boolean(badge) && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-status-critical ring-2 ring-[var(--surface-card)]" aria-hidden />
            )}
          </span>
          {!collapsed && (
            <span
              className={cn(
                /* The rail is lighter than the page: medium weight, label size; the active item alone steps up. */
                'min-w-0 flex-1 truncate text-label transition-colors',
                isActive ? 'font-semibold text-primary' : 'font-medium text-secondary group-hover:text-primary',
              )}
            >
              {label}
            </span>
          )}
          {!collapsed && Boolean(badge) && (
            <span className="tabular mr-1 shrink-0 rounded-full bg-status-critical px-1.5 py-0.5 text-micro font-bold text-white">{badge}</span>
          )}
        </>
      )}
    </NavLink>
  );
}
