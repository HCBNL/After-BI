import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAccentSync } from '@/hooks/useAccent';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandLoader } from '@/components/brand/Loader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { SchoolProvider, useSchool } from '@/context/SchoolContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { TourProvider } from '@/context/TourContext';
import { useSchoolBrand } from '@/context/BrandContext';
import { PageHeadingProvider, usePageHeading } from './PageHeading';
import { BottomBar } from './BottomBar';
import { NavRail } from './NavRail';
import { MenuSheet } from './MenuSheet';
import { ShellProvider, type ShellApi } from './ShellContext';
import { HomeChooser } from '@/components/home/HomeChooser';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { actionsForRole, resolveTo, PORTAL_ROOT } from '@/lib/tiles';
import { ROLE_LABEL, type Role } from '@/types';

/**
 * The shell.
 *
 * One layout at every width, adapting rather than switching: a tile-grid home,
 * a header that states where you are, and a navigation that is a bottom bar on
 * a phone and a rail on a laptop. It replaced a 248px sidebar carrying seven
 * headings, which was more reading than choosing on a desktop and a hamburger
 * on a phone — and a hamburger is where features go to be forgotten.
 *
 * The breakpoint is 1024px, and it is picked for the broadsheet: below it a
 * whole class on one sheet is going to scroll horizontally whatever we do, so
 * the navigation may as well take the bottom strip; above it there is room for
 * a rail beside a table that finally fits.
 */

/** The term strip in the header — the one place the current term is stated. */
function TermLine() {
  const { currentTerm, loading } = useSchool();
  if (loading || !currentTerm?.id) return null;
  return (
    <p className="truncate text-[11.5px] text-muted">
      {currentTerm.name} · {currentTerm.sessionName}
    </p>
  );
}

/**
 * Time of day, in the school's own timezone rather than the device's.
 *
 * A parent in London checking a Lagos school at eight in the evening should not
 * be told good morning, and more to the point a Nigerian school's app should
 * read as a Nigerian school's app.
 */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', hour: 'numeric', hour12: false }).format(
      new Date(),
    ),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Hold the page back until the term and class list have arrived.
 *
 * Every screen underneath queries by `currentTerm?.id`. Letting them mount a
 * moment early means they all fire a request against an empty term, get
 * nothing, and sit there showing "no results" — so the wait is a real feature,
 * not a courtesy. It also means no page needs the term in its dependency list.
 */
function SchoolGate({ children }: { children: ReactNode }) {
  const { loading, error, reload } = useSchool();

  /*
   * The brand loader, and nothing else. The home screen shows the same one in
   * the same place while its own numbers arrive, so a person opening the app
   * sees one mark turning and then the whole screen — never a grey sketch of
   * the screen first. See `BrandLoader` in Loader.tsx.
   */
  if (loading) return <BrandLoader />;

  if (error) {
    /*
     * The real sentence, not a generic one.
     *
     * Every failure here used to read "check your internet connection", which
     * is actively misleading for the two that are not about the connection at
     * all: an account with no school on its profile, and a read the rules
     * refused. Both need an administrator, not a better signal, and a person
     * told to check their Wi-Fi will check their Wi-Fi for a week. The
     * messages thrown underneath are already written for a person to read —
     * see `tenant.ts` and `deadline.ts` — so they are shown.
     */
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-[15px] font-bold text-primary">We could not open your school</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{error.message}</p>
        <Button className="mt-5" onClick={reload}>
          Try again
        </Button>
        <p className="mt-3 text-[12px] text-muted">
          Retries when you are back online.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * The bell, and the dot on it.
 *
 * IT USED TO BE THE OWNER'S ALONE, AND HIDDEN ON PHONES
 *
 * Both of those made sense when the only thing behind it was a platform
 * notice: the owner is who those come from, and a school's people were told
 * about them by a card on the home screen instead. Neither survives the school
 * getting a notice board of its own. A parent is now the main audience for the
 * thing behind this icon, a parent is on a phone, and `sm:flex` meant the one
 * person who needed it could not see it.
 *
 * The count is the school's board, not the platform's — a notice from
 * GetSchool is still announced by `NoticePop` on the home screen, and two
 * unread counts in one header would be two things to dismiss. The owner keeps
 * a plain bell: it belongs to no school, so there is no board to count, and
 * `listAnnouncements` would have no tenant to resolve.
 */
function NoticeBell({ root, role }: { root: string; role: Role }) {
  const board = useAnnouncements(role === 'owner');
  const count = board.unread.length;

  return (
    <Link
      /* `notices`, not `announcements`: the latter is not a route in any
         portal, so the bell used to land on the in-portal 404. */
      to={`${root}/notices`}
      aria-label={count ? `Notices — ${count} unread` : 'Notices'}
      className="tap relative flex items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
    >
      <Bell size={19} aria-hidden />
      {count > 0 && (
        <>
          {/*
            A count up to nine, a dot beyond it. The badge sits on a 19px icon
            inside a 44px tap target, and "12" is already at the width where
            the numeral stops being legible and starts being a smudge — at
            which point the honest signal is simply "there are several".
          */}
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--surface-card)]"
          >
            {count > 9 ? '9+' : count}
          </span>
        </>
      )}
    </Link>
  );
}

function Chrome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const brand = useSchoolBrand();
  const { heading, panel } = usePageHeading();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  /*
   * What the pages may open. The home screen's Cards layout has its own menu
   * and search buttons, and both layouts have the home-screen chooser, but the
   * sheets themselves cover the whole app, so they live here. See
   * `ShellContext.ts`.
   */
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
  const hello = useMemo(greeting, []);

  // Any navigation closes the sheet — including the browser's back button,
  // which a `onClick` on each link would miss.
  useEffect(() => {
    setMenuOpen(false);
    setChooserOpen(false);
  }, [location.pathname]);

  const role: Role = user?.role ?? 'pg';
  const root = PORTAL_ROOT[role];
  const atHome = location.pathname === root;

  /*
   * What the header says when the page has not named itself.
   *
   * Resolved from the action catalogue rather than a second list of labels, so
   * a renamed action is renamed in the header too.
   */
  const fallbackTitle = useMemo(() => {
    if (atHome) return 'Home';
    if (location.pathname === `${root}/profile`) return 'Profile';
    const match = actionsForRole(role)
      .map((a) => ({ a, to: resolveTo(a, role) }))
      .filter(({ to }) => location.pathname.startsWith(to.split('?')[0]))
      .sort((x, y) => y.to.length - x.to.length)[0];
    return match?.a.label ?? 'GetSchool';
  }, [atHome, location.pathname, role, root]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const personName = `${user.title ? `${user.title} ` : ''}${user.firstName} ${user.lastName}`;

  return (
    <ShellProvider value={shell}>
    <div className="flex min-h-dvh surface-page">
      {/*
        The strip the phone's clock sits on, mounted once for every screen in
        the portal. See `.status-bar-scrim` in index.css for why it is fixed
        here rather than drawn by each header.
      */}
      <div className="status-bar-scrim" aria-hidden />

      <NavRail role={role} onSignOut={() => void handleSignOut()} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          The row the header is drawn in, reserved in the flow.

          A sticky header is painted at its `top` but still occupies its
          original place in the flow, so without this it hung over the first
          47px of the page and cut the tops off whatever was there. See
          `.app-top-inset`. Not drawn when the header is hidden: the panel that
          replaces it on those screens reserves the same row itself.
        */}
        {!(atHome || panel) && <div className="app-top-inset" aria-hidden />}

        {/* ------------------------------------------------------- header */}
        <header
          /*
            Solid for the same reason as the bottom bar. See BottomBar.tsx.
            
            HIDDEN ON THE HOME SCREEN, AT EVERY WIDTH. `HomeHero` draws the top of that
            screen itself — the coloured panel runs behind the status bar, and a
            white header above it would put a bar across the top of the very
            thing the panel exists to be. Everything this header carries on home
            (the greeting, the photograph) is in the panel instead. On a laptop the
            panel is `DeskHero`, which carries the bell and the theme switch as
            well. Off home, the header is unchanged.
          */
          /*
            `top-[var(--safe-top)]`, not `top-0`.
            
            The scrim above is fixed at the very top of the screen, so a header
            pinned at zero would slide underneath it and lose its first rows to
            the clock. Pinning at the inset puts the header exactly against the
            underside of the scrim, which is where it belongs and what makes
            the two read as one bar.
          */
          className={cn(
            'sticky top-[var(--app-top)] z-30 border-b border-hairline surface-card',
            (atHome || panel) && 'hidden',
          )}
        >

          <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-5">
            {/*
              Back rather than a hamburger.
              Navigation lives in the bar at the bottom, so the top-left slot is
              free for the thing a phone user actually wants there: out of this
              screen and back to the last one.
            */}
            {/*
              NOTHING IN THIS SLOT ON THE HOME SCREEN

              There used to be the GetSchool mark here, and it cost more than it
              gave. It is a link to the page you are already on, the crest is
              already in the browser tab and on the sign-in screen, and it ate
              38px off the only line that carries a person's name — so
              "Good afternoon, Miss Onyinyechukwu" arrived truncated on a 360px
              phone, which is the width most of this app is read at.

              Off the home screen the slot earns itself: it is the way back.
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
              the greeting appears.

              It used to be printed here as "Home · <school name>" and again, in
              full, as a heading on the page underneath — the same person's name
              twice in the top four inches, pushing the shortcuts they came to
              tap below the fold. The header already carries their photograph,
              so this is where a greeting belongs.
            */}
            <div className={cn('min-w-0 flex-1', atHome && '-ml-0.5')} data-tour="greeting">
              <h1 className="truncate text-[16.5px] font-bold leading-tight text-primary sm:text-[18px]">
                {atHome ? `${hello}, ${user.title ? `${user.title} ` : ''}${user.firstName}` : (heading ?? fallbackTitle)}
              </h1>
              {atHome ? (
                <p className="truncate text-[11.5px] text-muted">{brand.name}</p>
              ) : (
                <TermLine />
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <NoticeBell root={root} role={role} />

              <div className="hidden lg:block">
                <ThemeToggle compact />
              </div>

              <Link
                to={`${root}/profile`}
                aria-label="Your profile"
                data-tour="profile"
                className="ml-0.5 flex items-center rounded-full transition-opacity hover:opacity-85"
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} src={user.photoURL} size="sm" />
              </Link>
            </div>
          </div>
        </header>

        {/* --------------------------------------------------------- page */}
        {/*
          A SIZE CONTAINER, ALWAYS. THIS LINE WAS THE BROKEN CURVE.

          The red panel measures this column with `100cqw` to pull itself out
          to the page edges (`.gs-panel` and `.gs-desk` in index.css). The class
          used to be conditional — `(atHome || panel)` — and `panel` is React
          state that `PagePanel` sets in an effect, which is to say one frame
          AFTER the first paint. So every refresh, and every navigation,
          rendered the panel once with no container to measure.

          With no size container, `100cqw` falls back to the viewport width
          instead of the column. Below about 1400px that error happens to
          cancel out, which is why this survived so long. Above it, it does not:
          at 1440px the panel is laid out 20px wider than the page on each
          side, so the curve runs past the edge and the red shows where the
          white should be — then snaps into place when the effect lands. On a
          phone the geometry is fine either way, but adding and removing
          `contain: layout` on every single page change re-lays-out the whole
          column, which is the flicker at the curve.

          A constant class has neither problem: the first paint is the right
          one, and nothing reflows afterwards.

          The reason it was conditional is real, and is now handled properly:
          `container-type` implies `contain: layout`, which makes this element
          the containing block for `position: fixed` children. Every overlay
          that renders inside main is therefore portalled to <body> — see the
          note in `WizardSheet`, `NoticePop` and `MoreSheet`. That is where a
          modal belonged anyway.
        */}
        <main className={cn('flex-1 px-3 py-4 sm:px-5 sm:py-6', 'pb-bottom-bar', '@container')}>
          <div className="mx-auto max-w-[1400px]">
            <SchoolGate>
              {/*
                A second boundary, inside the shell.

                The one in `App.tsx` catches everything, but it sits outside
                this layout, so a screen that throws takes the header and the
                navigation down with it and the only way out is a link. This
                one keeps the shell standing: the failure is confined to the
                page area and every other screen is still one tap away.

                `resetOn`, not `key`, for the reason spelled out in App.tsx.
              */}
              <ErrorBoundary resetOn={location.pathname} home={root}>
                <Outlet />
              </ErrorBoundary>
            </SchoolGate>
          </div>
        </main>
      </div>

      <BottomBar
        role={role}
        onOpenMenu={() => {
          setMenuSearch(false);
          setMenuOpen(true);
        }}
        menuOpen={menuOpen}
      />

      <MenuSheet
        role={role}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSignOut={() => void handleSignOut()}
        schoolName={brand.name}
        personName={personName}
        focusSearch={menuSearch}
        photoURL={user.photoURL}
        onChooseHome={shell.openHomeChooser}
      />

      <HomeChooser open={chooserOpen} onClose={() => setChooserOpen(false)} uid={user.id} />
    </div>
    </ShellProvider>
  );
}

/** Paints the interface colour — see `src/hooks/useAccent.ts`. Renders nothing. */
function AccentPainter() {
  useAccentSync();
  return null;
}

export default function AppShell() {
  /*
   * Providers, outermost first.
   *
   * `SchoolProvider` loads the term, session and class list once and shares
   * them with every screen. `PageHeadingProvider` lets a screen name itself in
   * the sticky bar without the bar importing every screen.
   */
  return (
    <SchoolProvider>
      <PageHeadingProvider panels>
        {/*
          Innermost, because every step it draws points at something inside the
          shell. It renders nothing at all until somebody asks for it.
        */}
        <TourProvider>
          <AccentPainter />
          <Chrome />
        </TourProvider>
      </PageHeadingProvider>
    </SchoolProvider>
  );
}

/** Re-exported so pages can label themselves without knowing the file layout. */
export { ROLE_LABEL };
