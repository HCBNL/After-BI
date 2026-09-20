import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { groupsForRole, resolveTo, GROUP_ICON } from '@/lib/tiles';

/**
 * Everything this account can open, as a page rather than a sheet.
 *
 * The sheets are for a thumb mid-task. This is the address you send somebody —
 * "it's all under All actions" — and the one a person lands on from the rail's
 * foot on a laptop, where a bottom sheet would be an odd thing to summon with a
 * mouse. Same list, same order, same source: `tiles.ts`.
 *
 * It is also the app's own index. If a screen exists and does not appear here,
 * it appears in no navigation at all, and that is a bug you can see rather than
 * one you find out about from a support call two months later.
 */
export default function AllActions() {
  const { user } = useAuth();
  if (!user) return null;

  const groups = groupsForRole(user.role);

  return (
    <div>
      <PageHeader
        title="All actions"
        description="Everything your account can open, grouped the way the menu groups it."
      />

      <div className="space-y-6">
        {groups.map(({ group, actions }) => {
          const GroupIcon = GROUP_ICON[group];
          return (
            <section key={group}>
              <h2 className="mb-2.5 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                <GroupIcon size={13} aria-hidden />
                {group}
              </h2>

              <ul className="surface-card overflow-hidden rounded-2xl border border-hairline shadow-card">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <li key={action.id} className="border-b border-hairline last:border-0">
                      {/* Not built yet: dimmed and inert. See `Shortcuts.tsx`. */}
                      <Link
                        to={action.soon ? '' : resolveTo(action, user.role)}
                        onClick={(e) => action.soon && e.preventDefault()}
                        aria-disabled={action.soon || undefined}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3.5 transition-colors',
                          action.soon
                            ? 'cursor-not-allowed opacity-45'
                            : 'hover:bg-[var(--surface-sunken)]',
                        )}
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-secondary">
                          <Icon size={17} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-primary">{action.label}</span>
                            {action.soon && (
                              <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-gold-800 dark:bg-gold-900/40 dark:text-gold-300">
                                Soon
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
                            {action.description}
                          </span>
                        </span>
                        <ChevronRight size={16} className="mt-2.5 shrink-0 text-muted" aria-hidden />
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
  );
}
