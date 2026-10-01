import { NavLink, useLocation } from 'react-router-dom';
import { Home, Menu as MenuIcon, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { UnreadDot } from './UnreadDot';
import { ActionDot, PendingDot } from './ActionDot';
import { useAnyPending } from '@/lib/pending';
import { actionById, actionsForRole, resolveTo, BAR, PORTAL_ROOT } from '@/lib/tiles';
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
 *      up with the icon set, and this app's users include parents opening a
 *      school app for the first time. The label is small but it is there.
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

  /*
   * The board, through the shared cache.
   *
   * The header's bell already asks for this under the same key, so on a laptop
   * the two share one read and on a phone — where the bell is hidden and this
   * is the only asker — it is one read for the visit. Skipped for the platform
   * owner, who belongs to no school and has no board to count.
   */
  const unread = useAnnouncements(role === 'owner').unread.length;

  /* Something waiting behind an action that is only reachable through the menu. */
  const inMenu = actionsForRole(role)
    .map((action) => action.id)
    .filter((id) => !slots.some((slot) => slot.id === id));
  const menuPending = useAnyPending(inMenu);

  return (
    <nav
      aria-label="Main"
      data-tour="nav"
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
         * `bg-[color-mix(in_oklab,var(--surface-card),transparent_6%)]`; a school
         * register does not need a frosted bar.
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
                  /*
                   * The label says what is behind the button, and the dot says
                   * whether it is worth opening. Notices live inside the menu,
                   * and on the home screen — where the header and its bell are
                   * hidden — this is the only thing on the entire screen that
                   * can say a notice has arrived.
                   */
                  aria-label={unread ? `${slot.label} — unread notices` : undefined}
                  className={cn(
                    'relative flex h-full w-full flex-col items-center justify-center gap-1 px-1',
                    'transition-colors',
                    menuOpen ? 'text-brand-700 dark:text-brand-400' : 'text-muted hover:text-primary',
                  )}
                >
                  <MenuIcon size={21} strokeWidth={menuOpen ? 2.4 : 1.9} aria-hidden />
                  {menuPending ? (
                    <PendingDot className="right-[calc(50%-15px)] top-[calc(50%-15px)]" />
                  ) : (
                    unread > 0 && (
                      /* On the icon's top right, inside the tap target rather
                         than on its edge, so it is never clipped by the bar. */
                      <UnreadDot className="absolute right-[calc(50%-15px)] top-[calc(50%-15px)]" />
                    )
                  )}
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
                    'relative flex h-full w-full flex-col items-center justify-center gap-1 px-1',
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
                    {action && <ActionDot id={action.id} className="right-[calc(50%-15px)] top-[calc(50%-15px)]" />}
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
