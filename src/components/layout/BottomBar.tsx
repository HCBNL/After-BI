import { NavLink, useLocation } from 'react-router-dom';
import { Home, Menu as MenuIcon, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { actionById, resolveTo, BAR, PORTAL_ROOT } from '@/lib/tiles';
import type { Role } from '@/types';

/**
 * The bottom bar.
 *
 * Five slots, thumb-height, fixed to the bottom of the viewport below 1024px
 * and gone above it — the desktop gets a rail instead, because a navigation bar
 * pinned to the bottom of a 27-inch monitor is a long way from where the
 * pointer already is.
 *
 * Three details that are easy to get wrong and expensive to get wrong:
 *
 *   1. **The home indicator.** `env(safe-area-inset-bottom)` is added as
 *      padding, not margin, so the bar's own background runs under the iPhone's
 *      home bar rather than leaving a strip of page showing through.
 *   2. **Labels stay.** Icon-only bars test badly with anyone who did not grow
 *      up with the icon set, and this app's users include a depot storekeeper
 *      opening it for the first time on a shared phone. The label is small but
 *      it is there.
 *   3. **The active item is announced, not just coloured.** `aria-current`
 *      carries what the red tint carries, which matters because the red tint is
 *      the only visual difference and colour alone is never enough.
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
  const root = PORTAL_ROOT[role];
  const slots = BAR[role];

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 lg:hidden',
        /*
         * Solid, deliberately.
         *
         * This was `surface-card/95 backdrop-blur-lg`, which looked right in the
         * source and rendered as nothing: `surface-card` is a plain utility
         * declaring `background-color: var(--surface-card)`, and Tailwind's `/95`
         * opacity modifier only applies to its own generated colour utilities.
         * The class was simply unknown, so the bar had no background and the page
         * scrolled visibly through it. A frosted bar would need
         * `bg-[color-mix(in_oklab,var(--surface-card),transparent_6%)]`; a stock
         * ledger does not need a frosted bar.
         */
        'border-t border-hairline surface-card',
        'pb-safe',
      )}
      style={{ height: 'calc(var(--bottom-bar-h) + var(--safe-bottom))' }}
    >
      <ul className="mx-auto flex h-[var(--bottom-bar-h)] max-w-lg items-stretch">
        {slots.map((slot) => {
          /* --------------------------------------------------- the menu */
          if (slot.id === 'menu') {
            return (
              <li key="menu" className="flex-1">
                <button
                  type="button"
                  onClick={onOpenMenu}
                  aria-expanded={menuOpen}
                  aria-haspopup="dialog"
                  className={cn(
                    'flex h-full w-full flex-col items-center justify-center gap-1 px-1',
                    'transition-colors',
                    menuOpen ? 'text-brand-700 dark:text-brand-400' : 'text-muted hover:text-primary',
                  )}
                >
                  <MenuIcon size={21} strokeWidth={menuOpen ? 2.4 : 1.9} aria-hidden />
                  <span className="text-[10.5px] font-semibold leading-none">{slot.label}</span>
                </button>
              </li>
            );
          }

          /* ------------------------------------- home, profile, actions */
          const isHome = slot.id === 'home';
          const isProfile = slot.id === 'profile';
          const action = actionById(slot.id);

          const to = isHome ? root : isProfile ? `${root}/profile` : action ? resolveTo(action, role) : root;
          const Icon = isHome ? Home : isProfile ? UserCircle2 : (action?.icon ?? Home);

          return (
            <li key={slot.id} className="flex-1">
              <NavLink
                to={to}
                end={isHome}
                aria-current={location.pathname === to ? 'page' : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex h-full w-full flex-col items-center justify-center gap-1 px-1',
                    'transition-colors',
                    isActive && !menuOpen
                      ? 'text-brand-700 dark:text-brand-400'
                      : 'text-muted hover:text-primary',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={21} strokeWidth={isActive && !menuOpen ? 2.4 : 1.9} aria-hidden />
                    <span className="max-w-full truncate text-[10.5px] font-semibold leading-none">
                      {slot.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
