import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, House, LayoutGrid, LogOut, PanelsTopLeft, Search, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  actionsForRole,
  resolveTo,
  PORTAL_ROOT,
  type ActionGroup,
  type AppAction,
  GROUP_ICON,
  GROUP_ORDER,
} from '@/lib/tiles';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AccentPicker } from '@/components/AccentPicker';
import { Avatar } from '@/components/ui';
import { BrandBars } from '@/components/home/HomeArt';
import { ROLE_LABEL, type Role } from '@/types';

/**
 * Everything, in one sheet: as plain as a banking app's menu: the coloured
 * panel with the person, a search and three quick tiles, then every section
 * open with its screens as clean rows. Typing in the search lists matches.
 */
function ActionRow({ action, role, onClose }: { action: AppAction; role: Role; onClose: () => void }) {
  const Icon = action.icon;
  return (
    <li className="border-b border-hairline last:border-b-0">
      <Link
        to={resolveTo(action, role)}
        onClick={onClose}
        className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
          <Icon size={17} strokeWidth={1.9} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15.5px] font-medium text-primary">{action.label}</span>
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-secondary"
        >
          <ChevronRight size={16} />
        </span>
      </Link>
    </li>
  );
}

export function MenuSheet({
  role,
  open,
  onClose,
  onSignOut,
  orgName,
  personName,
  focusSearch = false,
  photoURL,
  onChooseHome,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  orgName: string;
  personName: string;
  focusSearch?: boolean;
  photoURL?: string;
  onChooseHome?: () => void;
}) {
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const root = PORTAL_ROOT[role];
  const actions = useMemo(() => actionsForRole(role).filter((a) => !a.soon), [role]);

  const grouped = useMemo(() => {
    const map = new Map<ActionGroup, AppAction[]>();
    for (const action of actions) {
      const list = map.get(action.group) ?? [];
      list.push(action);
      map.set(action.group, list);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [actions]);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      needle
        ? actions.filter((a) => a.label.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle))
        : [],
    [actions, needle],
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    if (focusSearch) searchRef.current?.focus();
    else closeRef.current?.focus();
  }, [open, focusSearch]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [open]);

  if (!open) return null;

  const tile =
    'flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/[0.1] px-2 py-3 text-center text-[12.5px] font-semibold text-white ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.16] active:bg-white/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6 sm:backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex h-dvh w-full flex-col surface-card',
          'sm:h-auto sm:max-h-[88dvh] sm:max-w-lg sm:overflow-hidden sm:rounded-3xl sm:shadow-pop',
          'animate-[slide-up_0.24s_cubic-bezier(0.16,1,0.3,1)_both]',
        )}
      >
        <div className="ab-hero relative isolate shrink-0 overflow-hidden px-4 pb-11 pt-2 text-white">
          <BrandBars className="pointer-events-none absolute -right-12 -top-10 -z-10 h-56 w-56 text-white/[0.05]" />
          <div aria-hidden className="sm:hidden" style={{ height: 'var(--safe-top)' }} />

          <div className="relative flex h-11 items-center justify-center">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="tap absolute -left-1 flex items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={21} aria-hidden />
            </button>
            <p className="text-[16px] font-bold">Menu</p>
          </div>

          <div className="mt-2 flex items-center gap-3 px-1">
            <span className="flex shrink-0 rounded-full border-2 border-white/45 p-[2px]">
              <Avatar name={personName} src={photoURL} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-tight">{personName}</p>
              <p className="mt-0.5 truncate text-[12px] text-white/60">
                {ROLE_LABEL[role]}, {orgName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOut();
              }}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white transition-colors hover:bg-white/20 active:bg-white/25"
            >
              <LogOut size={18} aria-hidden />
            </button>
          </div>

          <div className="relative mt-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8f]"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search the menu"
              className="h-11 w-full rounded-xl border-0 bg-white pl-10 pr-3 text-[14.5px] text-[#141414] outline-none placeholder:text-[#8a8a8f]"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <Link to={`${root}/profile`} onClick={onClose} className={tile}>
              <UserRound size={20} strokeWidth={1.8} aria-hidden />
              Profile
            </Link>
            <Link to={`${root}/all`} onClick={onClose} className={tile}>
              <LayoutGrid size={20} strokeWidth={1.8} aria-hidden />
              All actions
            </Link>
            {onChooseHome ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChooseHome();
                }}
                className={tile}
              >
                <PanelsTopLeft size={20} strokeWidth={1.8} aria-hidden />
                Home screen
              </button>
            ) : (
              <Link to={root} onClick={onClose} className={tile}>
                <House size={20} strokeWidth={1.8} aria-hidden />
                Home
              </Link>
            )}
          </div>

          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-t-[28px] surface-card" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {needle ? (
            matches.length ? (
              <ul className="py-1">
                {matches.map((action) => (
                  <ActionRow key={action.id} action={action} role={role} onClose={onClose} />
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-[14px] text-muted">
                Nothing here matches &ldquo;{query.trim()}&rdquo;.
              </p>
            )
          ) : (
            <div className="pb-4">
              {grouped.map(([group, items]) => {
                const GroupIcon = GROUP_ICON[group];
                return (
                  <section key={group} aria-labelledby={`menu-${group}`}>
                    <h3
                      id={`menu-${group}`}
                      className="sticky top-0 z-10 flex items-center gap-2 border-y border-hairline bg-[var(--surface-sunken)] px-5 py-2.5 text-[13.5px] font-bold text-primary"
                    >
                      <GroupIcon size={15} className="text-brand-700 dark:text-brand-400" aria-hidden />
                      {group}
                    </h3>
                    <ul>
                      {items.map((action) => (
                        <ActionRow key={action.id} action={action} role={role} onClose={onClose} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-hairline px-4 py-3 pb-safe-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-secondary">Colour</span>
            <AccentPicker size={30} />
          </div>
          <ThemeToggle full />
        </div>
      </div>
    </div>
  );
}
