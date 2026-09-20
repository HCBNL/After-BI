import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Loading } from '@/components/brand/Loader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, Button, Hint } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { OrgProvider, useOrg } from '@/context/OrgContext';
import { useBrand } from '@/lib/brand';
import { PageHeadingProvider, usePageHeading } from './PageHeading';
import { BottomBar } from './BottomBar';
import { NavRail } from './NavRail';
import { MenuSheet } from './MenuSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { actionsForRole, resolveTo, PORTAL_ROOT } from '@/lib/tiles';
import { fullName } from '@/lib/roles';
import { ROLE_LABEL, type Role } from '@/types';

/**
 * The shell.
 *
 * One layout at every width, adapting rather than switching: a tile-grid home,
 * a header that states where you are, and a navigation that is a bottom bar on
 * a phone and a rail on a laptop.
 *
 * WHAT THIS REPLACED
 *
 * A 248px sidebar carrying eight section headings and a `⋯` popover holding
 * everything that did not fit. That is a lot of reading and not much choosing
 * on a desktop, and on a phone it collapsed to a hamburger — which is where
 * features go to be forgotten. Nine of AfterBI's routes lived only in that
 * popover or in nothing at all.
 *
 * The breakpoint is 1024px, and it is picked for the widest thing in the app: a
 * stock ledger with eight columns. Below it that table is going to scroll
 * horizontally whatever we do, so the navigation may as well take the bottom
 * strip; above it there is room for a rail beside a table that finally fits.
 */

/** The depot strip in the header — the one place the working depot is stated. */
function DepotLine() {
  const { defaultWarehouse, loading } = useOrg();
  if (loading || !defaultWarehouse) return null;
  return (
    <p className="truncate text-[11.5px] text-muted">
      {defaultWarehouse.name}
      {defaultWarehouse.location ? ` · ${defaultWarehouse.location}` : ''}
    </p>
  );
}

/**
 * Time of day, in the organisation's own timezone rather than the device's.
 *
 * A finance manager checking a Lagos depot from London at eight in the evening
 * should not be told good morning, and more to the point a Nigerian
 * distributor's app should read as a Nigerian distributor's app.
 */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-NG', {
      timeZone: 'Africa/Lagos',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Hold the page back until the organisation's reference data has arrived.
 *
 * Every screen underneath resolves products, distributors and depots by id from
 * `OrgContext`. Letting them mount a moment early means they all render
 * "Unknown product" for a beat and then repaint — so the wait is a real
 * feature, not a courtesy. The header and the bottom bar are already drawn
 * around this; they do not wait, so the app is navigable throughout.
 */
function OrgGate({ children }: { children: ReactNode }) {
  const { loading, error, reload } = useOrg();

  if (loading) {
    return (
      <div aria-hidden>
        <div className="min-h-[168px] rounded-[var(--radius-card)] border border-hairline surface-card p-4 shadow-card sm:min-h-[186px] sm:p-5 lg:max-w-[720px]">
          <div className="skeleton h-2.5 w-24 rounded-full" />
          <div className="skeleton mt-3 h-8 w-28 rounded-lg" />
          <div className="skeleton mt-3 h-3 w-full max-w-[15rem] rounded-full" />
          <div className="skeleton mt-1.5 h-3 w-3/5 max-w-[11rem] rounded-full" />
        </div>
        <Loading className="mt-5" label="Getting your organisation ready" rows={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-[15px] font-bold text-primary">We could not reach your organisation</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Check your internet connection and try again.
        </p>
        <Button className="mt-5" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

function Chrome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const brand = useBrand();
  const { heading, note } = usePageHeading();

  const [menuOpen, setMenuOpen] = useState(false);
  const hello = useMemo(greeting, []);

  // Any navigation closes the sheet — including the browser's back button,
  // which an onClick on each link would miss.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const role: Role = user?.role ?? 'distributor';
  const root = PORTAL_ROOT[role];
  const atHome = location.pathname === root;

  /*
   * What the header says when the page has not named itself.
   *
   * Resolved from the action catalogue rather than a second list of labels, so
   * a renamed action is renamed in the header too. Longest match wins, so
   * `/orders/new` resolves to Orders rather than to whatever else happens to
   * share a prefix.
   */
  const fallbackTitle = useMemo(() => {
    if (atHome) return 'Home';
    if (location.pathname === `${root}/profile`) return 'Profile';
    const match = actionsForRole(role)
      .map((a) => ({ a, to: resolveTo(a, role) }))
      .filter(({ to }) => location.pathname.startsWith(to.split('?')[0]))
      .sort((x, y) => y.to.length - x.to.length)[0];
    return match?.a.label ?? 'AfterBI';
  }, [atHome, location.pathname, role, root]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="flex min-h-dvh surface-page">
      <NavRail role={role} onSignOut={() => void handleSignOut()} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ------------------------------------------------------- header */}
        <header
          /* Solid for the same reason as the bottom bar. See BottomBar.tsx. */
          className="sticky top-0 z-30 border-b border-hairline surface-card"
        >
          {/*
            The strip the phone's own status bar sits on. See `.status-bar-fill`
            in index.css for why it is painted rather than left as padding.
          */}
          <div className="status-bar-fill" aria-hidden />

          <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-5">
            {/*
              Back rather than a hamburger.

              Navigation lives in the bar at the bottom, so the top-left slot is
              free for the thing a phone user actually wants there: out of this
              screen and back to the last one.

              NOTHING IN THIS SLOT ON THE HOME SCREEN. A mark here is a link to
              the page you are already on, it is already in the browser tab and
              on the sign-in screen, and it eats 38px off the only line that
              carries a person's name — so "Good afternoon, Oluwaseun" arrives
              truncated on a 360px phone, which is the width most of this app is
              read at.
            */}
            {!atHome && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="tap -ml-1.5 flex shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary lg:hidden"
              >
                <ArrowLeft size={20} aria-hidden />
              </button>
            )}

            {/*
              On the home screen this is the greeting, and it is the only place
              the greeting appears — not repeated as a heading on the page
              underneath, which is the same name twice in the top four inches
              pushing the tiles below the fold.
            */}
            <div className={cn('min-w-0 flex-1', atHome && '-ml-0.5')}>
              {/*
                The (i) sits against the title rather than under it. Every page
                used to open on a paragraph explaining itself; the paragraph is
                still there, one tap away, and the screen now opens on its data.
              */}
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="truncate text-[16.5px] font-bold leading-tight text-primary sm:text-[18px]">
                  {atHome
                    ? `${hello}, ${user.title ? `${user.title} ` : ''}${user.firstName}`
                    : (heading ?? fallbackTitle)}
                </h1>
                {!atHome && note && (
                  <Hint label={`About ${heading ?? fallbackTitle}`} className="shrink-0">
                    {note}
                  </Hint>
                )}
              </div>
              {atHome ? (
                <p className="truncate text-[11.5px] text-muted">{brand.name}</p>
              ) : (
                <DepotLine />
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Link
                to={`${root}/notices`}
                aria-label="Notices"
                className="tap hidden items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary sm:flex"
              >
                <Bell size={19} aria-hidden />
              </Link>

              <div className="hidden lg:block">
                <ThemeToggle compact />
              </div>

              <Link
                to={`${root}/profile`}
                aria-label="Your profile"
                className="ml-0.5 flex items-center rounded-full transition-opacity hover:opacity-85"
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} src={user.photoURL} size="sm" />
              </Link>
            </div>
          </div>
        </header>

        {/* --------------------------------------------------------- page */}
        <main className={cn('flex-1 px-3 py-4 sm:px-5 sm:py-6', 'pb-bottom-bar')}>
          <div className="mx-auto max-w-[1400px]">
            <OrgGate>
              {/*
                A second boundary, inside the shell.

                The one in `App.tsx` catches everything, but it sits outside
                this layout, so a screen that throws takes the header and the
                navigation down with it and the only way out is a link. This one
                keeps the shell standing: the failure is confined to the page
                area and every other screen is still one tap away.

                `resetOn`, not `key`, for the reason spelled out in App.tsx.
              */}
              <ErrorBoundary resetOn={location.pathname} home={root}>
                <Outlet />
              </ErrorBoundary>
            </OrgGate>
          </div>
        </main>
      </div>

      <BottomBar role={role} onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />

      <MenuSheet
        role={role}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSignOut={() => void handleSignOut()}
        orgName={brand.name}
        personName={fullName(user)}
      />
    </div>
  );
}

export default function AppShell() {
  /*
   * Providers, outermost first.
   *
   * `OrgProvider` loads products, distributors and depots once and shares them
   * with every screen. `PageHeadingProvider` lets a screen name itself in the
   * sticky bar without the bar importing every screen.
   */
  return (
    <OrgProvider>
      <PageHeadingProvider>
        <Chrome />
      </PageHeadingProvider>
    </OrgProvider>
  );
}

/** Re-exported so pages can label themselves without knowing the file layout. */
export { ROLE_LABEL };
