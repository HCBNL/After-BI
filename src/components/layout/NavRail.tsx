import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  BellRing,
  Building2,
  Home,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/components/brand/Wordmark';
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
  const root = PORTAL_ROOT[role];
  const { openMenu } = useShell();
  const { counts } = useReminders();
  const entitlements = useEntitlements();
  const [collapsed, setCollapsed] = useState(readCollapsed);

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
      data-tour="nav"
      aria-label="Main"
      className={cn(
        'hidden lg:flex lg:flex-col',
        'sticky top-0 h-dvh shrink-0 border-r border-hairline surface-card',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-[72px]' : 'w-[244px]',
      )}
    >
      {/* the top: pinned */}
      <div className="shrink-0 px-2.5 pt-3">
        <div className={cn('flex h-11 items-center', collapsed ? 'justify-center' : 'justify-between pl-2')}>
          {!collapsed && <Wordmark className="text-[1.15rem]" />}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Show the menu labels' : 'Show icons only'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            className={ICON_BUTTON}
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          </button>
        </div>

        {collapsed ? (
          <div className="mt-1 flex justify-center" title={orgName}>
            <OrgPlanBadge size={22} />
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-[var(--surface-sunken)] px-3 py-2">
            <Building2 size={15} className="shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-secondary">{orgName}</span>
            <OrgPlanBadge size={17} />
          </div>
        )}

        <button
          type="button"
          onClick={() => openMenu({ search: true })}
          aria-label="Search"
          title="Search (Ctrl K)"
          className={cn(
            'mt-2 flex h-10 w-full items-center rounded-xl text-[13px] text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary',
            collapsed ? 'justify-center' : 'gap-2.5 border border-hairline px-3',
          )}
        >
          <Search size={17} aria-hidden />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <kbd className="rounded-md border border-hairline px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-muted">Ctrl K</kbd>
            </>
          )}
        </button>

        <div className="mt-2 space-y-0.5">
          <RailLink to={root} end icon={Home} label="Home" collapsed={collapsed} />
          {showReminders && (
            <RailLink to={`${root}/reminders`} icon={BellRing} label="Reminders" collapsed={collapsed} badge={counts.action} />
          )}
        </div>
      </div>

      {/* the middle: every section open; scrollbar hidden so the icons stay centred */}
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 pb-2">
        {groups.map(({ group, items }) => (
          <section key={group} aria-label={group} className="mt-3.5 first:mt-2">
            {collapsed ? (
              <span aria-hidden className="mx-auto mb-1.5 block h-px w-6 bg-[var(--border-hairline)]" />
            ) : (
              <p className="px-3 pb-1 text-[12px] font-semibold text-muted">{group}</p>
            )}
            <ul className="space-y-0.5">
              {items.map((action) => (
                <li key={action.id}>
                  <RailLink to={resolveTo(action, role)} icon={action.icon} label={action.label} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* the foot: pinned */}
      <div className="shrink-0 space-y-1.5 border-t border-hairline px-2.5 py-3">
        <RailLink to={`${root}/all`} icon={LayoutGrid} label="All actions" collapsed={collapsed} />

        <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'rounded-2xl bg-[var(--surface-sunken)] p-2')}>
          <Link
            to={`${root}/profile`}
            title="Your profile"
            className={cn('flex min-w-0 items-center gap-2.5 rounded-xl transition-opacity hover:opacity-85', collapsed ? 'justify-center' : 'flex-1')}
          >
            <Avatar name={`${person.firstName} ${person.lastName}`} src={person.photoURL} size="sm" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-primary">{fullName(person)}</span>
                <span className="block truncate text-[11.5px] text-muted">{ROLE_LABEL[role]}</span>
              </span>
            )}
          </Link>
          <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className={cn(ICON_BUTTON, 'hover:text-[#b3261e]')}>
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
    </nav>
  );
}

function RailLink({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
  badge,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  collapsed?: boolean;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex items-center rounded-xl text-[13.5px] font-semibold transition-colors',
          collapsed ? 'h-10 w-full justify-center px-0' : 'gap-2.5 px-3 py-2',
          isActive
            ? 'bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-200'
            : 'text-secondary hover:bg-[var(--surface-sunken)] hover:text-primary',
        )
      }
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon size={17} aria-hidden />
        {collapsed && Boolean(badge) && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-status-critical" aria-hidden />}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && Boolean(badge) && (
        <span className="tabular shrink-0 rounded-full bg-status-critical px-1.5 py-0.5 text-[10.5px] font-bold text-white">{badge}</span>
      )}
    </NavLink>
  );
}
