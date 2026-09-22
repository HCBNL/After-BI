import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BellRing,
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Home,
  LayoutGrid,
  LogOut,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/components/brand/Wordmark';
import { Avatar } from '@/components/ui';
import {
  actionsForRole,
  GROUP_ICON,
  GROUP_ORDER,
  PORTAL_ROOT,
  resolveTo,
  type ActionGroup,
  type AppAction,
} from '@/lib/tiles';
import { fullName } from '@/lib/roles';
import { ROLE_LABEL, type Role, type UserProfile } from '@/types';
import { useShell } from './ShellContext';
import { useReminders } from '@/context/RemindersContext';

/**
 * The laptop's navigation.
 *
 * Pinned at the top: the mark, the organisation, search (Ctrl K) and Home.
 * In the middle: every screen the role has, in sections that open and close
 * (the section holding the current screen opens by itself, and the choice is
 * remembered). Pinned at the bottom: All actions and the person signed in.
 * The whole rail folds down to icons for more room, remembered per device.
 */

const COLLAPSED_KEY = 'afterbi.rail.collapsed';
const openKey = (role: Role) => `afterbi.rail.open.${role}`;

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function readOpen(role: Role): ActionGroup[] | null {
  try {
    const raw = localStorage.getItem(openKey(role));
    return raw ? (JSON.parse(raw) as ActionGroup[]) : null;
  } catch {
    return null;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice lasts this visit */
  }
}

const pathOf = (to: string) => to.split('?')[0];

const ICON_BUTTON =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary';

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
  const location = useLocation();
  const { openMenu } = useShell();
  const { counts } = useReminders();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const groups = useMemo(() => {
    const map = new Map<ActionGroup, AppAction[]>();
    for (const action of actionsForRole(role).filter((a) => !a.soon)) {
      map.set(action.group, [...(map.get(action.group) ?? []), action]);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((group) => ({ group, items: map.get(group)! }));
  }, [role]);

  /* The section holding the screen on show. */
  const current = useMemo(
    () =>
      groups.find(({ items }) =>
        items.some((a) => location.pathname.startsWith(pathOf(resolveTo(a, role)))),
      )?.group,
    [groups, location.pathname, role],
  );

  const [open, setOpen] = useState<ActionGroup[]>(() => readOpen(role) ?? (groups[0] ? [groups[0].group] : []));

  useEffect(() => {
    if (current) setOpen((list) => (list.includes(current) ? list : [...list, current]));
  }, [current]);
  useEffect(() => remember(openKey(role), JSON.stringify(open)), [open, role]);
  useEffect(() => remember(COLLAPSED_KEY, collapsed ? '1' : '0'), [collapsed]);

  const toggle = (group: ActionGroup) =>
    setOpen((list) => (list.includes(group) ? list.filter((g) => g !== group) : [...list, group]));

  return (
    <nav
      aria-label="Main"
      className={cn(
        'hidden lg:flex lg:flex-col',
        'sticky top-0 h-dvh shrink-0 border-r border-hairline surface-card',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-[76px]' : 'w-[256px]',
      )}
    >
      <div className="shrink-0 px-3 pt-3">
        <div className={cn('flex h-11 items-center', collapsed ? 'justify-center' : 'justify-between pl-2')}>
          <Wordmark className={collapsed ? 'text-[1rem]' : 'text-[1.2rem]'} />
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Fold the sidebar"
              title="Fold the sidebar"
              className={ICON_BUTTON}
            >
              <ChevronsLeft size={17} aria-hidden />
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-[var(--surface-sunken)] px-3 py-2">
            <Building2 size={15} className="shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-secondary">{orgName}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => openMenu({ search: true })}
          aria-label="Search"
          title="Search (Ctrl K)"
          className={cn(
            'mt-2 flex h-10 w-full items-center rounded-xl border border-hairline text-[13px] text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary',
            collapsed ? 'justify-center' : 'gap-2.5 px-3',
          )}
        >
          <Search size={16} aria-hidden />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <kbd className="rounded-md border border-hairline px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-muted">
                Ctrl K
              </kbd>
            </>
          )}
        </button>

        <div className="mt-2 space-y-0.5">
          <RailLink to={root} end icon={Home} label="Home" collapsed={collapsed} />
          <RailLink
            to={`${root}/reminders`}
            icon={BellRing}
            label="Reminders"
            collapsed={collapsed}
            badge={counts.action}
          />
        </div>
      </div>

      <div className="rail-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
        {groups.map(({ group, items }) => {
          if (collapsed) {
            return (
              <div key={group} className="mt-2 space-y-0.5 border-t border-hairline pt-2 first:mt-0 first:border-t-0 first:pt-0">
                {items.map((action) => (
                  <RailLink key={action.id} to={resolveTo(action, role)} icon={action.icon} label={action.label} collapsed />
                ))}
              </div>
            );
          }
          const GroupIcon = GROUP_ICON[group];
          const expanded = open.includes(group);
          return (
            <section key={group} className="mt-0.5">
              <button
                type="button"
                onClick={() => toggle(group)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-secondary"
              >
                <GroupIcon size={14} aria-hidden />
                <span className="flex-1 text-left">{group}</span>
                {group === current && !expanded && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />}
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={cn('transition-transform duration-200', !expanded && '-rotate-90')}
                />
              </button>
              {expanded && (
                <ul className="mb-1.5 space-y-0.5">
                  {items.map((action) => (
                    <li key={action.id}>
                      <RailLink to={resolveTo(action, role)} icon={action.icon} label={action.label} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="shrink-0 space-y-2 border-t border-hairline px-3 py-3">
        <RailLink to={`${root}/all`} icon={LayoutGrid} label="All actions" collapsed={collapsed} />

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Open the sidebar"
            title="Open the sidebar"
            className={cn(ICON_BUTTON, 'mx-auto')}
          >
            <ChevronsRight size={17} aria-hidden />
          </button>
        )}

        <div
          className={cn(
            'flex items-center gap-2',
            collapsed ? 'flex-col' : 'rounded-2xl bg-[var(--surface-sunken)] p-2',
          )}
        >
          <Link
            to={`${root}/profile`}
            title="Your profile"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl transition-opacity hover:opacity-85"
          >
            <Avatar name={`${person.firstName} ${person.lastName}`} src={person.photoURL} size="sm" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-primary">{fullName(person)}</span>
                <span className="block truncate text-[11.5px] text-muted">{ROLE_LABEL[role]}</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className={cn(ICON_BUTTON, 'hover:text-[#b3261e]')}
          >
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
          collapsed ? 'h-10 justify-center' : 'gap-2.5 px-3 py-2',
          isActive
            ? "bg-brand-50 text-brand-900 before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand-600 before:content-[''] dark:bg-brand-500/15 dark:text-brand-200 dark:before:bg-brand-400"
            : 'text-secondary hover:bg-[var(--surface-sunken)] hover:text-primary',
        )
      }
    >
      <span className="relative flex shrink-0 items-center">
        <Icon size={17} aria-hidden />
        {collapsed && Boolean(badge) && (
          <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-status-critical" aria-hidden />
        )}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && Boolean(badge) && (
        <span className="tabular shrink-0 rounded-full bg-status-critical px-1.5 py-0.5 text-[10.5px] font-bold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
