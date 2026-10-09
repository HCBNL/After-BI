/**
 * The field staff portal's frame.
 *
 * Field staff (role `agent`) are GetSchool's own people showing the product
 * to schools. They belong to no school, so nothing here reads a school: every
 * screen is built from the sample content in `src/lib/demo/data.ts`, plus
 * their own ID card and business card.
 *
 * Navy rail on a laptop, the same as the owner's. On a phone, a bar at the
 * bottom (Home, HR, CRM, Menu, Profile) and a menu sheet with everything else,
 * the colour picker and light/dark — the same shape as every other portal.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  FileSignature,
  FileText,
  BriefcaseBusiness,
  Handshake,
  Home,
  Landmark,
  IdCard,
  LogOut,
  Menu as MenuIcon,
  UserCircle2,
  UserRound,
  X,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui';
import { Squares } from '@/components/home/HomeArt';
import { PersonalColourPicker } from '@/components/ColourPicker';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAccentSync } from '@/hooks/useAccent';
import { Mark } from '@/components/brand/Mark';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useRailCollapsed } from '@/hooks/useRailCollapsed';
import { cn } from '@/lib/cn';
import { PageHeadingProvider, usePageHeading } from './PageHeading';

export const FIELD_ROOT = '/portal/field';

export type FieldGroup = 'Office' | 'Showcase';

/**
 * Two sections, like the owner's Platform / Content:
 *   Office    — the staff member's own work: HR, CRM, company details, cards.
 *   Showcase  — sample report cards, notes and tests to show a school.
 */
export const FIELD_NAV: { to: string; label: string; icon: ReactNode; end?: boolean; group?: FieldGroup }[] = [
  { to: FIELD_ROOT, label: 'Home', icon: <Home size={17} aria-hidden />, end: true },
  { to: `${FIELD_ROOT}/hr`, label: 'HR', icon: <BriefcaseBusiness size={17} aria-hidden />, group: 'Office' },
  { to: `${FIELD_ROOT}/crm`, label: 'CRM', icon: <Handshake size={17} aria-hidden />, group: 'Office' },
  { to: `${FIELD_ROOT}/company`, label: 'Company info', icon: <Landmark size={17} aria-hidden />, group: 'Office' },
  { to: `${FIELD_ROOT}/cards`, label: 'My cards', icon: <IdCard size={17} aria-hidden />, group: 'Office' },
  { to: `${FIELD_ROOT}/results`, label: 'Report cards', icon: <FileText size={17} aria-hidden />, group: 'Showcase' },
  { to: `${FIELD_ROOT}/lesson-notes`, label: 'Lesson notes', icon: <NotebookPen size={17} aria-hidden />, group: 'Showcase' },
  { to: `${FIELD_ROOT}/tests`, label: 'Test papers', icon: <ClipboardList size={17} aria-hidden />, group: 'Showcase' },
  { to: `${FIELD_ROOT}/proposals`, label: 'Proposals', icon: <FileSignature size={17} aria-hidden />, group: 'Showcase' },
];

export const FIELD_GROUPS: FieldGroup[] = ['Office', 'Showcase'];


export default function FieldShell() {
  /* Screens name themselves through PageHeader; this shell prints the name. */
  return (
    <PageHeadingProvider>
      <FieldFrame />
    </PageHeadingProvider>
  );
}

function RailItem({ item, collapsed }: { item: (typeof FIELD_NAV)[number]; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-xl py-2 text-[14px] font-semibold transition-colors',
          collapsed ? 'justify-center px-0' : 'px-3',
          isActive ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/6 hover:text-white',
        )
      }
    >
      {item.icon}
      {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
    </NavLink>
  );
}

function FieldFrame() {
  const { heading } = usePageHeading();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, toggle] = useRailCollapsed();
  const [menuOpen, setMenuOpen] = useState(false);
  /* Their own interface colour, chosen in the menu or on their profile. */
  useAccentSync();
  useEffect(() => setMenuOpen(false), [location.pathname]);
  const atHome = location.pathname === FIELD_ROOT;

  const leave = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const name = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <div className="flex min-h-dvh surface-page">
      {/* ------------------------------------------------ laptop rail */}
      <nav
        aria-label="Main"
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-white/8 bg-night transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[72px]' : 'w-[248px]',
        )}
      >
        <div className={cn('flex shrink-0 gap-1 py-4', collapsed ? 'flex-col items-center px-2' : 'items-center justify-between pl-5 pr-2.5')}>
          <Link to={FIELD_ROOT} className="flex items-center gap-2.5 py-1" aria-label="Home">
            <Mark size={26} className="text-white" />
            {!collapsed && (
              <span className="font-display text-[1.15rem] font-extrabold leading-none tracking-[-0.05em] text-white">
                GetSchool<span className="text-brand-500">.</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Show the menu labels' : 'Show icons only'}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:bg-white/8 hover:text-white"
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          </button>
        </div>
        <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2.5 pb-2">
          <RailItem item={FIELD_NAV[0]} collapsed={collapsed} />
          {FIELD_GROUPS.map((group) => (
            <section key={group} aria-label={group} className="mt-4">
              {collapsed ? (
                <span aria-hidden className="mx-auto mb-1.5 block h-px w-6 bg-white/10" />
              ) : (
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/35">{group}</p>
              )}
              <div className="space-y-0.5">
                {FIELD_NAV.filter((i) => i.group === group).map((item) => (
                  <RailItem key={item.to} item={item} collapsed={collapsed} />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="shrink-0 border-t border-white/8 px-2.5 py-3">
          {/* Their photo and name: opens their profile — photo, name, password, colour and theme. */}
          <NavLink
            to={`${FIELD_ROOT}/profile`}
            title={collapsed ? 'Profile & appearance' : undefined}
            aria-label={collapsed ? 'Profile & appearance' : undefined}
            className={({ isActive }) =>
              cn(
                'mb-1 flex items-center gap-2.5 rounded-xl py-2 transition-colors',
                collapsed ? 'justify-center px-0' : 'px-3',
                isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white',
              )
            }
          >
            <Avatar name={name || 'Staff'} src={user?.photoURL} size="sm" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-white/90">{name}</span>
                <span className="block truncate text-[11.5px] text-white/50">Profile &amp; appearance</span>
              </span>
            )}
          </NavLink>
          <button
            type="button"
            onClick={() => void leave()}
            title={collapsed ? 'Sign out' : undefined}
            aria-label={collapsed ? 'Sign out' : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl py-2 text-[14px] font-semibold text-white/60 hover:bg-white/6 hover:text-white',
              collapsed ? 'justify-center px-0' : 'px-3',
            )}
          >
            <LogOut size={17} aria-hidden />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </nav>

      {/* ------------------------------------------------- the page */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone: a slim title bar off the home screen. On home the panel is the header. */}
        {!atHome && (
          <header className="sticky top-0 z-30 border-b border-white/8 bg-night text-white lg:hidden" style={{ paddingTop: 'var(--safe-top)' }}>
            <div className="flex h-14 items-center gap-3 px-4">
              <Link to={FIELD_ROOT} aria-label="Home" className="shrink-0">
                <Mark size={24} className="text-white" />
              </Link>
              <p className="min-w-0 flex-1 truncate text-[16px] font-bold">{heading ?? 'GetSchool'}</p>
            </div>
          </header>
        )}

        {/* Same padding, width and size container as the owner's, so the home panel meets the edges the same way. */}
        <main className="@container min-w-0 flex-1 px-3 py-4 pb-bottom-bar sm:px-5 sm:py-6 lg:px-8 lg:pb-12">
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">
            {heading && (
              <h1 className="mb-1 hidden font-display lg:block text-[1.6rem] font-extrabold tracking-[-0.03em] text-primary sm:text-[1.9rem]">
                {heading}
                <span className="text-brand-600">.</span>
              </h1>
            )}
            <ErrorBoundary resetOn={location.pathname} home={FIELD_ROOT}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <FieldBottomBar menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
      <FieldMenu open={menuOpen} onClose={() => setMenuOpen(false)} name={name} photoURL={user?.photoURL} onSignOut={() => void leave()} />

    </div>
  );
}

/* ------------------------------------------------------------ phone nav */

const BAR: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: FIELD_ROOT, label: 'Home', icon: <Home size={21} aria-hidden />, end: true },
  { to: `${FIELD_ROOT}/hr`, label: 'HR', icon: <BriefcaseBusiness size={21} aria-hidden /> },
  { to: `${FIELD_ROOT}/crm`, label: 'CRM', icon: <Handshake size={21} aria-hidden /> },
];

/** The phone's bar: Home, HR, CRM, Menu, Profile — the same shape as every other portal's. */
function FieldBottomBar({ menuOpen, onOpenMenu }: { menuOpen: boolean; onOpenMenu: () => void }) {
  const item = (active: boolean) =>
    cn(
      'relative flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[10.5px] font-semibold leading-none transition-colors',
      active ? 'text-brand-700 dark:text-brand-400' : 'text-muted hover:text-primary',
    );
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline surface-card pb-safe lg:hidden"
      style={{ height: 'calc(var(--bottom-bar-h) + var(--safe-bottom))' }}
    >
      <ul className="mx-auto flex h-[var(--bottom-bar-h)] max-w-lg items-stretch">
        {BAR.map((b) => (
          <li key={b.to} className="flex-1">
            <NavLink to={b.to} end={b.end} className={({ isActive }) => item(isActive && !menuOpen)}>
              {({ isActive }) => (
                <>
                  {isActive && !menuOpen && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand-600" />}
                  {b.icon}
                  {b.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <button type="button" onClick={onOpenMenu} aria-expanded={menuOpen} aria-haspopup="dialog" className={item(menuOpen)}>
            {menuOpen && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand-600" />}
            <MenuIcon size={21} aria-hidden />
            Menu
          </button>
        </li>
        <li className="flex-1">
          <NavLink to={`${FIELD_ROOT}/profile`} className={({ isActive }) => item(isActive && !menuOpen)}>
            {({ isActive }) => (
              <>
                {isActive && !menuOpen && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand-600" />}
                <UserCircle2 size={21} aria-hidden />
                Profile
              </>
            )}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

/** Everything, the colour and light/dark — the phone's full menu. */
function FieldMenu({
  open,
  onClose,
  name,
  photoURL,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  photoURL?: string;
  onSignOut: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const tile =
    'flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/[0.1] px-2 py-3 text-center text-[12.5px] font-semibold text-white ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.16] active:bg-white/20';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-dvh w-full flex-col surface-card animate-[slide-up_0.24s_cubic-bezier(0.16,1,0.3,1)_both]"
      >
        <div className="gs-hero relative isolate shrink-0 overflow-hidden px-4 pb-11 pt-2 text-white">
          <Squares className="pointer-events-none absolute -right-16 -top-14 -z-10 h-60 w-60 rotate-[14deg] text-white/[0.05]" />
          <div aria-hidden className="app-top-inset" />
          <div className="relative flex h-11 items-center justify-center">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="tap absolute -left-1 flex items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white"
            >
              <X size={21} aria-hidden />
            </button>
            <p className="text-[16px] font-bold">Menu</p>
          </div>
          <div className="mt-2 flex items-center gap-3 px-1">
            <span className="flex shrink-0 rounded-full border-2 border-white/45 p-[2px]">
              <Avatar name={name || 'Staff'} src={photoURL} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-tight">{name}</p>
              <p className="mt-0.5 truncate text-[12px] text-white/60">Staff, GetSchool</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOut();
              }}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white hover:bg-white/20"
            >
              <LogOut size={18} aria-hidden />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <Link to={`${FIELD_ROOT}/profile`} onClick={onClose} className={tile}>
              <UserRound size={20} strokeWidth={1.8} aria-hidden />
              Profile
            </Link>
            <Link to={FIELD_ROOT} onClick={onClose} className={tile}>
              <Home size={20} strokeWidth={1.8} aria-hidden />
              Home
            </Link>
            <Link to={`${FIELD_ROOT}/company`} onClick={onClose} className={tile}>
              <Landmark size={20} strokeWidth={1.8} aria-hidden />
              Company
            </Link>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-t-[28px] surface-card" />
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-2">
          {FIELD_GROUPS.map((group) => (
            <section key={group} aria-label={group}>
              <p className="px-5 pb-1 pt-3 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">{group}</p>
              <ul>
                {FIELD_NAV.filter((i) => i.group === group).map((i) => (
                  <li key={i.to}>
                    <NavLink
                      to={i.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'mx-2 flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors',
                          isActive ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200' : 'text-primary hover:bg-[var(--surface-sunken)]',
                        )
                      }
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{i.icon}</span>
                      {i.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="shrink-0 space-y-3 border-t border-hairline px-4 py-3 pb-safe-4">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">Appearance</p>
          <PersonalColourPicker />
          <ThemeToggle full />
        </div>
      </div>
    </div>
  );
}
