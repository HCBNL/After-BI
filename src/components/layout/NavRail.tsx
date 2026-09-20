import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/components/brand/Mark';
import { railFor, resolveTo, PORTAL_ROOT } from '@/lib/tiles';
import type { Role } from '@/types';

/**
 * The laptop's navigation, in three parts: the mark and Home pinned at the
 * top, the sections in the middle — which scroll when the screen is too short
 * for them, with a soft fade at either end to say there is more — and All
 * actions and Sign out pinned at the bottom.
 */
export function NavRail({ role, onSignOut }: { role: Role; onSignOut: () => void }) {
  const root = PORTAL_ROOT[role];
  const sections = railFor(role);

  return (
    <nav
      aria-label="Main"
      className={cn(
        'hidden lg:flex lg:flex-col',
        'sticky top-0 h-dvh w-[232px] shrink-0',
        'border-r border-hairline surface-card',
      )}
    >
      <div className="shrink-0 px-2.5">
        <div className="flex h-14 items-center px-2.5">
          <Wordmark />
        </div>
        <RailLink to={root} end icon={<Home size={17} aria-hidden />} label="Home" />
      </div>

      <div className="rail-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-5 pt-1">
        {sections.map(({ group, items }) => (
          <section key={group} aria-label={group} className="mt-3.5">
            <p className="px-3 pb-1 text-[12px] font-semibold text-muted">{group}</p>
            <ul className="space-y-0.5">
              {items.map(({ action }) => {
                const Icon = action.icon;
                return (
                  <li key={action.id}>
                    <RailLink to={resolveTo(action, role)} icon={<Icon size={17} aria-hidden />} label={action.label} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="shrink-0 border-t border-hairline px-2.5 py-3">
        <RailLink to={`${root}/all`} icon={<LayoutGrid size={17} aria-hidden />} label="All actions" />
        <button
          type="button"
          onClick={onSignOut}
          className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-[#b3261e]"
        >
          <LogOut size={17} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left">Sign out</span>
        </button>
      </div>
    </nav>
  );
}

function RailLink({ to, label, icon, end }: { to: string; label: string; icon?: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-colors',
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
