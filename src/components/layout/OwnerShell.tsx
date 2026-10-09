/**
 * The owner's frame.
 *
 * WHAT IT WAS, AND WHY THAT STOPPED WORKING
 *
 * The smallest possible shell: a header saying whose account this is, a way to
 * sign out, and one screen underneath. That was true right up until the
 * console grew notices, a website editor and a blog, which went behind a row
 * of tabs on the one screen. So the platform got what every school has: a home
 * screen of tiles, a bar at the bottom, and a menu with everything in it.
 *
 * ONE CONSOLE, TWO SHAPES
 *
 * A phone gets the bar at the bottom and the menu sheet behind it. A laptop
 * gets a rail down the left with every screen grouped on it, a slim strip
 * carrying the page's name, and neither a bottom bar nor a modal menu: those
 * are a phone's answers to a small screen, and a dashboard read on a laptop
 * has a column of space down the left that a row of tabs only wastes.
 *
 * NAVY, EITHER WAY
 *
 * The console is drawn on the same navy as getschool.app, whatever theme the
 * schools are on. It is the platform's own room: the red panel on the home
 * screen, navy under it, and the wordmark at the top left.
 *
 * THE SAME HOME AS EVERY OTHER ROLE
 *
 * The schools' home screen then grew its panel: the greeting and photograph on
 * the brand colour, the numbers or the tiles, the chooser between those two
 * layouts, and on a laptop a rail down the side. The owner's did not, which is
 * why it looked like a different product. Now it draws the same panel, and
 * this shell provides what that panel reaches for, the menu, its search and
 * the layout chooser, through `ShellProvider`, and hides its own header on
 * home because the panel is the header there. Exactly as `AppShell` does.
 *
 * It is still deliberately NOT `AppShell`. That one is school-scoped: it loads
 * a term, a class list, a subject list and a crest before it will draw
 * anything, and the owner belongs to no school and is refused every one of
 * those collections by `firestore.rules`. The shared panel reads the school
 * through `useOptionalSchool`, and simply shows no term for the owner.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAccentSync } from '@/hooks/useAccent';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useRailCollapsed } from '@/hooks/useRailCollapsed';
import { cn } from '@/lib/cn';
import { Mark } from '@/components/brand/Mark';
import { Avatar } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomeChooser } from '@/components/home/HomeChooser';
import { EnquiryWatch } from '@/components/owner/EnquiryWatch';
import { ActionDot } from './ActionDot';
import { useAuth } from '@/context/AuthContext';
import { TourProvider } from '@/context/TourContext';
import { BottomBar } from './BottomBar';
import { MenuSheet } from './MenuSheet';
import { ShellProvider, type ShellApi } from './ShellContext';
import { actionsForRole, railFor, resolveTo, PORTAL_ROOT } from '@/lib/tiles';

const ROOT = PORTAL_ROOT.owner;

/**
 * THE CONSOLE'S NAVIGATION, DOWN THE SIDE RATHER THAN ACROSS THE TOP.
 *
 * WHAT WAS WRONG WITH THE BAR
 *
 * Ten screens in a horizontal row, sorted A to Z, with "All actions" and
 * "Sign out" competing for the same line. Three faults, and they compound:
 *
 *   • It cannot grow. A row of tabs is fixed by the width of the window, and
 *     the console gains a screen every few weeks. The eleventh wraps or
 *     truncates, and there is nowhere for it to go.
 *   • Alphabetical is not an order. "API balance, Blog, Enquiries, GetSchool
 *     AI, Notices, Pricing, Schools, Website" puts the money next to the
 *     marketing next to the tenants, so nothing is where the eye expects it.
 *   • It is a phone's navigation stretched. A dashboard read on a laptop has a
 *     column of space down the left that a top bar simply wastes.
 *
 * A rail fixes all three: it scrolls, it groups, and every item keeps its
 * label and its icon at full size. It is also what the schools' own portal
 * already does on a laptop (`NavRail.tsx`), so the console stops looking like
 * a different product from the thing it administers.
 *
 * Grouped through `railFor`, the same catalogue the tiles and the menu read,
 * so a renamed or regrouped action moves here without this file changing.
 */
const RAIL = railFor('owner');

/* ------------------------------------------------------------- the rail */

function RailLink({
  id,
  to,
  end,
  icon,
  label,
  pathname,
  collapsed,
}: {
  id?: string;
  to: string;
  end?: boolean;
  icon: ReactNode;
  label: string;
  pathname: string;
  collapsed?: boolean;
}) {
  const active = end ? pathname === to : pathname.startsWith(to);
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-xl py-2 text-[14px] font-semibold transition-colors',
        collapsed ? 'justify-center px-0' : 'px-3',
        active ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/6 hover:text-white',
      )}
    >
      <span className="relative shrink-0">
        {icon}
        {id && <ActionDot id={id} className="-right-1 -top-1" />}
      </span>
      {!collapsed && <span className="min-w-0 truncate">{label}</span>}
    </Link>
  );
}

/**
 * The console's own rail. Laptop only — a phone keeps the bar at the bottom
 * and the sheet behind it, which is the right control at that width.
 *
 * Navy rather than the schools' white, because this is the platform's room and
 * the rest of the console is already drawn on it.
 */
function OwnerRail({
  pathname,
  onSignOut,
  leaving,
  personName,
  photoURL,
}: {
  pathname: string;
  onSignOut: () => void;
  leaving: boolean;
  personName: string;
  photoURL?: string;
}) {
  /* Folded to icons by the button beside the name; each icon keeps a tooltip. */
  const [collapsed, toggle] = useRailCollapsed();
  return (
    <nav
      aria-label="Main"
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-white/8 bg-night transition-[width] duration-200 ease-out lg:flex',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <div className={cn('flex shrink-0 gap-1 py-4', collapsed ? 'flex-col items-center px-2' : 'items-center justify-between pl-5 pr-2.5')}>
        <Link to={ROOT} aria-label="Platform home" className="flex items-center gap-2.5 py-1">
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
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/8 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        </button>
      </div>

      {/* Pinned, like the block at the foot. Only the groups scroll. */}
      <div className="shrink-0 px-2.5">
        <RailLink to={ROOT} end icon={<Home size={17} aria-hidden />} label="Home" pathname={pathname} collapsed={collapsed} />
      </div>

      {/* Scrolls on its own, so the console can keep gaining screens. */}
      {/* Scrollbar hidden: a visible one narrows the column and pushes the icons off centre. */}
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 pb-2">
        {RAIL.map(({ group, items }) => (
          <section key={group} aria-label={group} className="mt-4 first:mt-3">
            {collapsed ? (
              <span aria-hidden className="mx-auto mb-1.5 block h-px w-6 bg-white/10" />
            ) : (
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/35">{group}</p>
            )}
            <ul className="space-y-0.5">
              {items.map(({ action }) => {
                const Icon = action.icon;
                return (
                  <li key={action.id}>
                    <RailLink
                      id={action.id}
                      to={resolveTo(action, 'owner')}
                      icon={<Icon size={17} aria-hidden />}
                      label={action.label}
                      pathname={pathname}
                      collapsed={collapsed}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="shrink-0 border-t border-white/8 px-2.5 py-3">
        <Link
          to={`${ROOT}/profile`}
          title={collapsed ? personName || 'Your profile' : undefined}
          aria-label={collapsed ? personName || 'Your profile' : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-xl py-2 text-white/60 transition-colors hover:bg-white/6 hover:text-white',
            collapsed ? 'justify-center px-0' : 'px-3',
          )}
        >
          <Avatar name={personName || 'Owner'} src={photoURL} size="sm" />
          {!collapsed && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{personName || 'Your profile'}</span>}
        </Link>

        <button
          type="button"
          onClick={onSignOut}
          disabled={leaving}
          title={collapsed ? 'Sign out' : undefined}
          aria-label={collapsed ? 'Sign out' : undefined}
          className={cn(
            'mt-1 flex w-full items-center gap-2.5 rounded-xl py-2 text-[14px] font-semibold text-white/60 transition-colors hover:bg-white/6 hover:text-white disabled:opacity-50',
            collapsed ? 'justify-center px-0' : 'px-3',
          )}
        >
          <LogOut size={17} aria-hidden />
          {!collapsed && (leaving ? 'Signing out…' : 'Sign out')}
        </button>
      </div>
    </nav>
  );
}

export function OwnerShell() {
  const { user, signOut } = useAuth();
  // The owner has no school, so this is their own colour or GetSchool red.
  useAccentSync();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Any navigation closes the sheet, including the browser's back button.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  /* What the home panel may open. See `ShellContext.ts`. */
  const shell = useMemo<ShellApi>(
    () => ({
      openMenu: (options) => {
        setMenuSearch(Boolean(options?.search));
        setMenuOpen(true);
      },
      openHomeChooser: () => {
        setMenuOpen(false);
        setChooserOpen(true);
      },
    }),
    [],
  );

  const atHome = location.pathname === ROOT;

  /*
   * What the header says off the home screen. Read out of the same catalogue
   * the tiles and the bar read, so a renamed action is renamed here.
   */
  const title = useMemo(() => {
    if (atHome) return null;
    const match = actionsForRole('owner')
      .map((a) => ({ a, to: resolveTo(a, 'owner') }))
      .filter(({ to }) => location.pathname.startsWith(to))
      .sort((x, y) => y.to.length - x.to.length)[0];
    return match?.a.label ?? 'Platform';
  }, [atHome, location.pathname]);

  const handleSignOut = async () => {
    setLeaving(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setLeaving(false);
    }
  };

  const personName = user ? `${user.title ? `${user.title} ` : ''}${user.firstName} ${user.lastName}` : '';

  return (
    <ShellProvider value={shell}>
      <div className="night flex min-h-dvh surface-page">
        {/* The strip the phone's clock sits on. See `.status-bar-scrim`. */}
        <div className="status-bar-scrim" aria-hidden />

        <OwnerRail
          pathname={location.pathname}
          onSignOut={() => void handleSignOut()}
          leaving={leaving}
          personName={personName}
          photoURL={user?.photoURL ?? undefined}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/*
           * A slim strip on a laptop, carrying the page's name and nothing
           * else. Everything that used to be up here — the whole navigation,
           * All actions, Sign out — is in the rail now, which is what makes
           * this a dashboard rather than a website with tabs.
           *
           * Hidden on home at every width, because the red panel is the header
           * there. Same rule as `AppShell`.
           */}
          {!atHome && (
            <header className="sticky top-0 z-30 hidden border-b border-white/8 bg-night/95 backdrop-blur-xl lg:block">
              <div className="flex h-16 items-center gap-4 px-8">
                <h1 className="min-w-0 truncate font-display text-[1.25rem] font-extrabold leading-none tracking-[-0.03em] text-white">
                  {title}
                </h1>
              </div>
            </header>
          )}

          {/* The row the clock sits on. See `.app-top-inset` and the note in
              `AppShell` — sticky alone left this header under the scrim. */}
          {!atHome && <div className="app-top-inset lg:hidden" aria-hidden />}

          {/* Hidden on home, where the panel is the header. See `AppShell`. */}
          <header
            className={cn(
              'sticky top-[var(--app-top)] z-30 border-b border-hairline surface-card lg:hidden',
              atHome && 'hidden',
            )}
          >

            <div className="flex h-14 items-center gap-3 px-3 sm:h-16 sm:px-5">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="tap -ml-1.5 flex shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
              >
                <ArrowLeft size={20} aria-hidden />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold leading-tight text-primary sm:text-[17.5px]">{title}</p>
                <p className="truncate text-[11.5px] text-muted">Platform owner</p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {user && (
                  <Link to={`${ROOT}/profile`} aria-label="Your profile" className="flex items-center">
                    <Avatar name={`${user.firstName} ${user.lastName}`} src={user.photoURL} size="sm" />
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/*
            The same padding and width as the schools' shell, so the home
            panel's edges line up the same way. A size container on home only;
            see `.gs-desk` in index.css.
          */}
          {/* Always a size container, for the reason set out in `AppShell`:
              the panel measures this column, and a class that arrives a frame
              late lays the curve out wrong on the paint before it. */}
          <main className={cn('min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-8', 'pb-bottom-bar lg:pb-12', '@container')}>
            <div className="mx-auto w-full min-w-0 max-w-[1400px]">
              {/*
                The tour lives here as well as in `AppShell`. `TourProvider`
                reads the role itself, so it shows the owner's own tour.
                `resetOn`, not `key`: a changed key would unmount everything
                below it on every navigation.
              */}
              <TourProvider>
                <ErrorBoundary resetOn={location.pathname} home={ROOT}>
                  <Outlet />
                </ErrorBoundary>
              </TourProvider>
            </div>
          </main>
        </div>

        {/* New enquiries: a dot on the Enquiries button and a pop-up, never a bar. */}
        <EnquiryWatch />
        <BottomBar role="owner" onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />

        <MenuSheet
          role="owner"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSignOut={() => void handleSignOut()}
          schoolName="GetSchool platform"
          personName={personName}
          focusSearch={menuSearch}
          photoURL={user?.photoURL ?? undefined}
          onChooseHome={shell.openHomeChooser}
        />

        {user && <HomeChooser open={chooserOpen} onClose={() => setChooserOpen(false)} uid={user.id} />}
      </div>
    </ShellProvider>
  );
}
