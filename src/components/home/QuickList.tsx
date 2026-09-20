/**
 * The Cards screen's shortcuts: a two-column list with a way to everything.
 *
 * The Tiles screen puts the whole action grid on the red panel. The Cards
 * screen gives that room to the numbers, so the shortcuts come down onto the
 * page as a compact list — six of them, in the catalogue's own order (which is
 * frequency order, see `tiles.ts`), and a "More" row that opens the full menu
 * with its search. Nothing is lost by choosing Cards; it is one tap further.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { actionsForRole, resolveTo } from '@/lib/tiles';
import { cn } from '@/lib/cn';
import type { Role } from '@/types';

export function QuickList({ role, onMore, className }: { role: Role; onMore: () => void; className?: string }) {
  const shown = useMemo(() => actionsForRole(role).slice(0, 6), [role]);

  return (
    <section
      aria-label="Shortcuts"
      data-tour="shortcuts"
      className={cn('overflow-hidden rounded-[22px] border border-hairline surface-card shadow-card', className)}
    >
      <ul className="grid grid-cols-2">
        {shown.map((action, i) => {
          const Icon = action.icon;
          const alone = shown.length % 2 === 1 && i === shown.length - 1;
          return (
            <li
              key={action.id}
              className={cn('border-b border-hairline', alone ? 'col-span-2' : i % 2 === 0 && 'border-r')}
            >
              <Link
                to={resolveTo(action, role)}
                className="flex items-center gap-2.5 px-3.5 py-3.5 transition-colors hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
                  <Icon size={18} strokeWidth={1.9} aria-hidden />
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 text-[13.5px] font-semibold leading-tight text-primary">{action.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onMore}
        className="flex w-full items-center justify-center gap-2 py-3 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
      >
        <Menu size={16} aria-hidden />
        More
      </button>
    </section>
  );
}
