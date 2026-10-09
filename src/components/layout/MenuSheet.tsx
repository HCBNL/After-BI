import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, House, LogOut, PanelsTopLeft, Search, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { UnreadDot } from './UnreadDot';
import { ActionDot } from './ActionDot';
import {
  actionsForRole,
  resolveTo,
  PORTAL_ROOT,
  type AppAction,
} from '@/lib/tiles';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PersonalColourPicker } from '@/components/ColourPicker';
import { Avatar } from '@/components/ui';
import { Squares } from '@/components/home/HomeArt';
import { ROLE_LABEL, type Role } from '@/types';

/**
 * Everything, in one sheet — as plain as a banking app's menu.
 *
 * The `Menu` slot in the bottom bar. It is the completeness guarantee behind
 * the home screen: whatever the home shows, every action the role has is here.
 *
 * WHAT CHANGED
 *
 * It was a long list with a sentence under every row, which made the most
 * common thing a person does here — find a screen by its name — a job of
 * reading. It now looks like the menu people already use every day in their
 * bank's app:
 *
 *   • the red panel at the top, with the cubes and the curve, the person with
 *     a sign-out button beside them, the search, and three quick tiles
 *     (profile, notices, home screen);
 *   • every section open, as a highlighted heading that stays pinned while
 *     its screens scroll under it, and every screen a clean row with a round
 *     chevron and no description — no dropdowns, nothing to open first;
 *   • typing in the search skips the sections and lists what matches.
 *
 * The descriptions still exist; they are what the search matches against.
 *
 * Full height on a phone, because a menu is a destination rather than a peek;
 * a centred dialog from 640px.
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
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
          <Icon size={17} strokeWidth={1.9} aria-hidden />
          <ActionDot id={action.id} className="-right-1 -top-1" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15.5px] font-medium text-primary">{action.label}</span>
        {action.soon && (
          <span className="shrink-0 rounded-md bg-gold-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-gold-800 dark:bg-gold-900/40 dark:text-gold-300">
            Soon
          </span>
        )}
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
  schoolName,
  personName,
  focusSearch = false,
  photoURL,
  onChooseHome,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  schoolName: string;
  personName: string;
  /** Open with the caret in the search box: the Cards home screen's search button. */
  focusSearch?: boolean;
  /** The person's photograph, beside their name at the top. */
  photoURL?: string;
  /** Opens "Choose your home screen". Portals without that choice leave it out. */
  onChooseHome?: () => void;
}) {
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const root = PORTAL_ROOT[role];
  const actions = useMemo(() => actionsForRole(role), [role]);

  /* Shared with the header's bell and the Menu button, under one cache key. */
  const unread = useAnnouncements(role === 'owner').unread.length;

  /*
   * One list, A to Z.
   *
   * It used to be grouped, with each section's name pinned while its screens
   * scrolled under it. On a phone those pinned headings stacked and covered
   * the row you were reading, and "Academics" or "Daily" is not how anybody
   * looks for a screen anyway: they look for its name. So the names are the
   * only thing left, in the order a name is looked for.
   */
  const sorted = useMemo(() => [...actions].sort((a, b) => a.label.localeCompare(b.label)), [actions]);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      needle
        ? actions.filter((a) => a.label.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle))
        : [],
    [actions, needle],
  );

  /* Fresh each time it opens: no search, focus inside. */
  useEffect(() => {
    if (!open) return;
    setQuery('');
    if (focusSearch) searchRef.current?.focus();
    else closeRef.current?.focus();
  }, [open, focusSearch]);

  /* Escape closes; the page behind must not scroll while it is up. */
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

  /*
   * Keep Tab inside the sheet. Without this a keyboard user tabs straight out
   * of the dialog into the page underneath and drives a screen they cannot see.
   */
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
        {/* ------------------------------------------------ the red panel */}
        <div className="gs-hero relative isolate shrink-0 overflow-hidden px-4 pb-11 pt-2 text-white">
          <Squares className="pointer-events-none absolute -right-16 -top-14 -z-10 h-60 w-60 rotate-[14deg] text-white/[0.05]" />
          <div aria-hidden className="app-top-inset sm:hidden" />

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
                {ROLE_LABEL[role]}, {schoolName}
              </p>
            </div>
            {/*
              Sign out, as an icon beside the person it signs out. It used to be
              the last row of the list, which put it in the middle of the sheet
              whenever the list was short.
            */}
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
            <Link
              to={`${root}/notices`}
              onClick={onClose}
              className={cn(tile, 'relative')}
              aria-label={unread ? `Notices — ${unread} unread` : 'Notices'}
            >
              <Bell size={20} strokeWidth={1.8} aria-hidden />
              Notices
              {unread > 0 && (
                /* Ringed in the tile's own colour rather than the card's, so
                   it separates from the plate it sits on. */
                <UnreadDot className="absolute right-2.5 top-2.5" ring="ring-[var(--surface-sunken)]" />
              )}
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

          {/* The curve: the list rising over the panel. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-t-[28px] surface-card" />
        </div>

        {/* ------------------------------------------------------ the list */}
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
            <ul className="pb-4">
              {sorted.map((action) => (
                <ActionRow key={action.id} action={action} role={role} onClose={onClose} />
              ))}
            </ul>
          )}
        </div>

        {/* ---------------------------------------------------- the footer */}
        <div className="shrink-0 space-y-3 border-t border-hairline px-4 py-3 pb-safe-4">
          {/* The interface colour, then light or dark — together, like the reference menus. */}
          <PersonalColourPicker />
          <ThemeToggle full />
        </div>
      </div>
    </div>
  );
}
