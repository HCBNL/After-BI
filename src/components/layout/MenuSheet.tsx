import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { groupsForRole, resolveTo, GROUP_ICON, PORTAL_ROOT } from '@/lib/tiles';
import { ROLE_LABEL, type Role } from '@/types';

/**
 * The whole app, on a phone, from the fourth slot of the bottom bar.
 *
 * This is the rail's structure lying down — same categories from `tiles.ts`,
 * same order, same rows — which is the entire reason it is safe to have two
 * navigation surfaces at all. They are two renderings of one list. The version
 * this replaces had a sidebar and a `⋯` popover holding *different* items, so
 * the answer to "where is Scorecards" depended on which device you asked from.
 *
 * Everything is open. No accordion here, unlike the rail: a sheet scrolls
 * natively on a phone and a person who opened the full menu is looking for
 * something, so making them tap a category first to find out whether it is in
 * there is one tap of pure cost. The rail collapses because a rail that
 * scrolled would push its own foot off the screen; a sheet has no foot.
 */
export function MenuSheet({
  role,
  open,
  onClose,
  onSignOut,
  orgName,
  personName,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  orgName: string;
  personName: string;
}) {
  const root = PORTAL_ROOT[role];
  const groups = groupsForRole(role);

  /*
   * Escape closes it, and the page behind it stops scrolling while it is up.
   *
   * The second half matters more than it sounds: without it, a scroll gesture
   * that starts on the sheet and runs past its end scrolls the page underneath,
   * so closing the sheet reveals a page that has moved. On iOS that reads as
   * the app losing your place.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(10,12,16,0.5)] animate-fade-in"
      />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto',
          'rounded-t-3xl border-t border-hairline surface-card shadow-pop',
          'animate-slide-up pb-safe-6',
        )}
      >
        {/* ------------------------------------------------------- header */}
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-hairline surface-card px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-primary">{personName}</p>
            <p className="truncate text-[12px] text-muted">
              {ROLE_LABEL[role]} · {orgName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="tap -mr-1.5 -mt-1 flex shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        {/* ------------------------------------------------------ the app */}
        <nav className="px-2 py-2">
          {groups.map(({ group, actions }) => {
            const GroupIcon = GROUP_ICON[group];
            return (
              <section key={group} className="mb-1">
                <h2 className="flex items-center gap-2 px-3 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  <GroupIcon size={13} aria-hidden />
                  {group}
                </h2>
                <ul>
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <li key={action.id}>
                        {/* `soon` renders as a dimmed row, not a link — the
                            screen does not exist yet and tapping it 404s. */}
                        <Link
                          to={action.soon ? '' : resolveTo(action, role)}
                          onClick={(e) => {
                            if (action.soon) {
                              e.preventDefault();
                              return;
                            }
                            onClose();
                          }}
                          aria-disabled={action.soon || undefined}
                          className={cn(
                            'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                            action.soon
                              ? 'cursor-not-allowed opacity-45'
                              : 'active:bg-[var(--surface-sunken)]',
                          )}
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-secondary">
                            <Icon size={17} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold text-primary">
                                {action.label}
                              </span>
                              {action.soon && (
                                <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-gold-800 dark:bg-gold-900/40 dark:text-gold-300">
                                  Soon
                                </span>
                              )}
                            </span>
                            {/*
                              The sentence, on the phone only.

                              The rail shows labels alone because a pointer can
                              hover for a tooltip. A thumb cannot, and half this
                              app's nouns — Sell-out, Movements, Statement —
                              mean something specific in distribution that a
                              newly hired storekeeper will not guess.
                            */}
                            <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                              {action.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>

        {/* --------------------------------------------------------- foot */}
        <div className="mt-1 border-t border-hairline px-2 pt-2">
          <Link
            to={`${root}/all`}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-semibold text-primary transition-colors active:bg-[var(--surface-sunken)]"
          >
            <LayoutGrid size={18} aria-hidden />
            All actions
          </Link>

          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] font-semibold text-secondary transition-colors active:bg-[var(--surface-sunken)]"
          >
            <LogOut size={18} aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
