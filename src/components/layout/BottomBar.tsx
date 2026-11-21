import { NavLink, useLocation } from 'react-router-dom';
import { useSelfPhoto } from '@/lib/selfPhoto';
import { Home, Menu as MenuIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/cn';
import { actionById, resolveTo, BAR, PORTAL_ROOT } from '@/lib/tiles';
import type { Role } from '@/types';
import { isActionLocked, useEntitlements } from '@/lib/plans';

/**
 * The bottom bar, on a phone or tablet (gone at 1024px, where the rail takes over).
 *
 * The owner's design: a floating, rounded, frosted pill that sits above the
 * bottom edge, icons only, so the page shows through and around it. The
 * active item sits in a lighter pill of its own; profile is the person's own
 * picture on the right. Labels are gone from sight but every item keeps its
 * name for screen readers (`aria-label`) and `aria-current` on the page it is
 * on, so the active item is never told by colour alone.
 */
export function BottomBar({
  role,
  onOpenMenu,
  menuOpen,
}: {
  role: Role;
  onOpenMenu: () => void;
  menuOpen: boolean;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const photo = useSelfPhoto(user);
  const root = PORTAL_ROOT[role];
  useEntitlements();
  /* A slot whose screen the plan has locked is left out rather than leading nowhere. */
  const slots = BAR[role].filter((slot) => !isActionLocked(slot.id));

  const item = (active: boolean) =>
    cn(
      'flex h-11 w-full items-center justify-center rounded-full transition-colors duration-200',
      active
        ? 'bg-black/[0.07] text-brand-700 dark:bg-white/[0.12] dark:text-white'
        : 'text-primary/75 hover:text-primary',
    );

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 lg:hidden"
      style={{ bottom: 'calc(var(--safe-bottom) + 0.75rem)' }}
    >
      <ul
        className="ab-dock pointer-events-auto flex h-[3.5rem] w-full max-w-[25rem] items-center gap-1 rounded-full px-1.5"
        data-tour="nav"
      >
        {slots.map((slot) => {
          /* the menu */
          if (slot.id === 'menu') {
            return (
              <li key="menu" className="flex-1">
                <button
                  type="button"
                  onClick={onOpenMenu}
                  aria-expanded={menuOpen}
                  aria-haspopup="dialog"
                  aria-label={slot.label}
                  title={slot.label}
                  className={item(menuOpen)}
                >
                  <MenuIcon size={23} strokeWidth={menuOpen ? 2.3 : 1.9} aria-hidden />
                </button>
              </li>
            );
          }

          /* home, profile, actions */
          const isHome = slot.id === 'home';
          const isProfile = slot.id === 'profile';
          const action = actionById(slot.id);

          const to = isHome ? root : isProfile ? `${root}/profile` : action ? resolveTo(action, role) : root;
          const Icon = isHome ? Home : action?.icon ?? Home;

          return (
            <li key={slot.id} className="flex-1">
              <NavLink
                to={to}
                end={isHome}
                aria-label={slot.label}
                title={slot.label}
                aria-current={location.pathname === to ? 'page' : undefined}
                className={({ isActive }) => item(isActive && !menuOpen)}
              >
                {({ isActive }) =>
                  isProfile && user ? (
                    <Avatar
                      name={`${user.firstName} ${user.lastName}`}
                      src={photo}
                      size="xs"
                      className={cn(
                        'h-[30px] w-[30px] ring-2 transition-shadow',
                        isActive && !menuOpen ? 'ring-brand-600 dark:ring-white' : 'ring-transparent',
                      )}
                    />
                  ) : (
                    <Icon size={23} strokeWidth={isActive && !menuOpen ? 2.3 : 1.9} aria-hidden />
                  )
                }
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
