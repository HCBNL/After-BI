import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { railFor, resolveTo, PORTAL_ROOT } from '@/lib/tiles';
import type { Role } from '@/types';

/**
 * The laptop's navigation: every section open, its main jobs listed.
 *
 * It was an accordion — Home, then four closed headings — which left a tall
 * white column with five words in it and made every destination two clicks
 * away. Now each section is a small label with its main jobs under it, always
 * showing, and the rail never scrolls: the shortlist in `RAIL` (tiles.ts) is
 * sized for a 768px laptop, and a few `extra` rows appear only when the screen
 * is tall enough for them. Everything else is one click away in All actions,
 * which stays pinned at the foot with Sign out.
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
      {/*
        HOME IS PINNED. THE GROUPS SCROLL UNDER IT.

        It used to sit inside the scrolling area with everything else, in a
        box set to `overflow-hidden` — so on a short laptop screen, or once a
        school had enough sections, the rows at the bottom were simply cut off
        with no way to reach them, and Home scrolled away from the top.

        Now the three fixed things — Home at the top, All actions and Sign out
        at the bottom — stay where they are at every height, and only the part
        that grows is the part that moves. Those are the rows somebody reaches
        for without looking, and a control you have to hunt for is a control
        that has stopped being reliable.
      */}
      <div className="shrink-0 px-2.5 pt-3">
        <RailLink to={root} end icon={<Home size={17} aria-hidden />} label="Home" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pb-2">
        {sections.map(({ group, items }) => (
          <section key={group} aria-label={group} className="mt-3.5 first:mt-2">
            <p className="px-3 pb-1 text-[12px] font-semibold text-muted">{group}</p>
            <ul className="space-y-0.5">
              {items.map(({ action, extra }) => {
                const Icon = action.icon;
                return (
                  <li key={action.id} className={extra ? 'rail-extra' : undefined}>
                    <RailLink
                      to={resolveTo(action, role)}
                      icon={<Icon size={17} aria-hidden />}
                      label={action.label}
                      soon={action.soon}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Everything, always in the same place, always last. */}
      <div className="shrink-0 border-t border-hairline px-2.5 py-3">
        <RailLink to={`${root}/all`} icon={<LayoutGrid size={17} aria-hidden />} label="All actions" />

        {/*
          Sign out lives here on a laptop: the last row, below a rule, apart
          from the navigation because it is not navigation. See the history in
          the previous version of this file — there was once no way to sign
          out on a laptop at all.
        */}
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

function RailLink({
  to,
  label,
  icon,
  end,
  soon,
}: {
  to: string;
  label: string;
  icon?: React.ReactNode;
  end?: boolean;
  soon?: boolean;
}) {
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
      {soon && (
        <span className="shrink-0 rounded bg-gold-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-gold-800 dark:bg-gold-900/40 dark:text-gold-300">
          Soon
        </span>
      )}
    </NavLink>
  );
}
