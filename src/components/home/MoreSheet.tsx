import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { groupsForRole, resolveTo, GROUP_ICON } from '@/lib/tiles';
import type { Role } from '@/types';

/**
 * Everything, from the last tile in the grid.
 *
 * Deliberately the same content as `MenuSheet` and deliberately a different
 * entry point. The bottom bar's Menu is where you go when you know you are
 * navigating; this is where your thumb already is when you were looking at the
 * grid and the thing you wanted was not in it. Making the grid's overflow open
 * a *different* list from the menu is the mistake the old `⋯` popover made.
 */
export function MoreSheet({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const groups = groupsForRole(role);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="All actions">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(10,12,16,0.5)] animate-fade-in"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-hairline surface-card shadow-pop animate-slide-up pb-safe-6 sm:inset-x-auto sm:right-4 sm:top-20 sm:bottom-auto sm:w-[420px] sm:rounded-3xl sm:border">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-hairline surface-card px-4 pb-3 pt-4">
          <h2 className="text-[15px] font-bold text-primary">All actions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap -mr-1.5 flex items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="p-2">
          {groups.map(({ group, actions }) => {
            const GroupIcon = GROUP_ICON[group];
            return (
              <section key={group}>
                <h3 className="flex items-center gap-2 px-3 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  <GroupIcon size={13} aria-hidden />
                  {group}
                </h3>
                <ul className="grid grid-cols-4 gap-1">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    const face = (
                      <>
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-secondary">
                          <Icon size={19} aria-hidden />
                        </span>
                        <span className="line-clamp-2 text-[11.5px] font-semibold leading-tight text-secondary">
                          {action.label}
                        </span>
                      </>
                    );

                    /* Not built yet — dimmed and inert. See `Shortcuts.tsx`. */
                    if (action.soon) {
                      return (
                        <li key={action.id}>
                          <span
                            aria-disabled="true"
                            title={`${action.description} (not built yet)`}
                            className="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center opacity-45"
                          >
                            {face}
                          </span>
                        </li>
                      );
                    }

                    return (
                      <li key={action.id}>
                        <Link
                          to={resolveTo(action, role)}
                          onClick={onClose}
                          title={action.description}
                          className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition-colors active:bg-[var(--surface-sunken)]"
                        >
                          {face}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
