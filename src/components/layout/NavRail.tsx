/**
 * The desktop rail — the mobile menu, standing up.
 *
 * WHAT IT REPLACED
 *
 * AfterBI's sidebar listed every section flat, with eight headings and up to
 * seventeen rows for a super admin, plus a `⋯` popover holding another
 * fourteen. Three problems at once. It disagreed with the phone, which had a
 * different list. It could not hold seventeen rows without scrolling, so the
 * bottom of it — Page access, Data reset, the price list — was reachable only by
 * scrolling a navigation bar, which is where features go to be forgotten. And
 * the popover meant the app had two menus, so "where is Territory map" had two
 * possible answers and one of them was wrong.
 *
 * So it is the phone's structure, exactly: the categories from `tiles.ts`, each
 * opening to reveal what is inside it, and All actions at the bottom. Six
 * collapsed rows plus Home plus All actions fits any laptop without scrolling,
 * which is the point — the whole app is visible in one glance, and nothing is
 * hidden behind a scrollbar.
 *
 * One category is open at a time, and the one holding the current page opens
 * itself. Opening a second closes the first, so the rail cannot grow past the
 * screen however many categories exist.
 */

import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Home, LayoutGrid, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { groupsForRole, resolveTo, GROUP_ICON, PORTAL_ROOT } from '@/lib/tiles';
import type { ActionGroup } from '@/lib/tiles';
import type { Role } from '@/types';

export function NavRail({ role, onSignOut }: { role: Role; onSignOut: () => void }) {
  const root = PORTAL_ROOT[role];
  const location = useLocation();

  /** Only the categories this role actually has anything in. */
  const groups = groupsForRole(role);

  const [open, setOpen] = useState<ActionGroup | null>(null);

  /*
   * The category holding the current page opens itself.
   *
   * Without this, arriving on Settings from a link leaves the rail showing no
   * indication of where you are — the row is inside a closed category, so the
   * highlight is invisible and the app feels like it lost you.
   */
  useEffect(() => {
    const match = groups.find((g) =>
      g.actions.some((a) => location.pathname.startsWith(resolveTo(a, role).split('?')[0])),
    );
    if (match) setOpen(match.group);
  }, [location.pathname, role]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav
      aria-label="Main"
      className={cn(
        'hidden lg:flex lg:flex-col',
        'sticky top-0 h-dvh w-[232px] shrink-0',
        'border-r border-hairline surface-card',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-2.5 py-3">
        <RailLink to={root} end icon={<Home size={17} />} label="Home" />

        <div className="my-2 border-t border-hairline" role="presentation" />

        {groups.map(({ group, actions }) => {
          const Icon = GROUP_ICON[group];
          const isOpen = open === group;

          return (
            <div key={group}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : group)}
                aria-expanded={isOpen}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold transition-colors',
                  isOpen ? 'text-primary' : 'text-secondary hover:bg-[var(--surface-sunken)] hover:text-primary',
                )}
              >
                <Icon size={17} className="shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{group}</span>
                <ChevronDown
                  size={15}
                  aria-hidden
                  className={cn('shrink-0 text-muted transition-transform', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen && (
                <ul className="mb-1 ml-[1.35rem] space-y-0.5 border-l border-hairline pl-2.5">
                  {actions.map((action) => (
                    <li key={action.id}>
                      <RailLink
                        to={resolveTo(action, role)}
                        label={action.label}
                        soon={action.soon}
                        nested
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Everything, always in the same place, always last. */}
      <div className="border-t border-hairline px-2.5 py-3">
        <RailLink to={`${root}/all`} icon={<LayoutGrid size={17} />} label="All actions" />

        {/*
          SIGN OUT, BELOW A RULE, BECAUSE IT IS NOT NAVIGATION.
          
          It has to be in the rail and not only in `MenuSheet`, which opens from
          `BottomBar`, which is `lg:hidden` — otherwise there is no way to sign
          out on a laptop at all. A storekeeper on a shared depot computer would
          have to clear the browser's storage.
        */}
        <button
          type="button"
          onClick={onSignOut}
          className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-[#b3261e]"
        >
          <LogOut size={17} />
          <span className="min-w-0 flex-1 truncate text-left">Sign out</span>
        </button>
      </div>
    </nav>
  );
}

function RailLink({
  to,
  label,
  icon,
  end,
  soon,
  nested,
}: {
  to: string;
  label: string;
  icon?: React.ReactNode;
  end?: boolean;
  soon?: boolean;
  nested?: boolean;
}) {
  /*
   * A `soon` row is dimmed and does not navigate.
   *
   * The badge alone was not enough: the row was still a live link to a screen
   * that does not exist, so tapping it landed on the in-portal 404. Rendering it
   * as a plain span keeps the row in the list — which is the point of announcing
   * something is coming — without pretending it is there.
   */
  if (soon) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          'flex cursor-not-allowed items-center gap-2.5 rounded-xl opacity-45',
          nested ? 'px-2.5 py-2 text-[13px]' : 'px-3 py-2.5 text-[13.5px] font-semibold',
          'text-secondary',
        )}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="shrink-0 rounded bg-gold-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-gold-800 dark:bg-gold-900/40 dark:text-gold-300">
          Soon
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-xl transition-colors',
          nested ? 'px-2.5 py-2 text-[13px]' : 'px-3 py-2.5 text-[13.5px] font-semibold',
          isActive
            ? 'bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-200'
            : 'text-secondary hover:bg-[var(--surface-sunken)] hover:text-primary',
        )
      }
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </NavLink>
  );
}
