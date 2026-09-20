/**
 * The frame every portal shares: the rail on a laptop, the bottom bar and menu
 * sheet on a phone, the sticky header (hidden on home and on any page drawing
 * its own panel), and the home-screen chooser. `AppShell` wraps it for a
 * tenant, `PlatformShell` for the platform owner — same frame, one codebase.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ComponentType } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomeChooser } from '@/components/home/HomeChooser';
import { useAuth } from '@/context/AuthContext';
import { actionsForRole, resolveTo, PORTAL_ROOT } from '@/lib/tiles';
import { fullName } from '@/lib/roles';
import type { Role } from '@/types';
import { BottomBar } from './BottomBar';
import { MenuSheet } from './MenuSheet';
import { NavRail } from './NavRail';
import { usePageHeading } from './PageHeading';
import { ShellProvider, type ShellApi } from './ShellContext';

function Passthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Chrome({
  orgName,
  Gate = Passthrough,
}: {
  orgName: string;
  /** Holds the page back until whatever it needs has loaded. */
  Gate?: ComponentType<{ children: ReactNode }>;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { heading, panel } = usePageHeading();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
    setChooserOpen(false);
  }, [location.pathname]);

  const role: Role = user?.role ?? 'staff';
  const root = PORTAL_ROOT[role];
  const atHome = location.pathname === root;

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
    <ShellProvider value={shell}>
      <div className="flex min-h-dvh surface-page">
        <NavRail role={role} onSignOut={() => void handleSignOut()} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={cn('sticky top-0 z-30 border-b border-hairline surface-card', (atHome || panel) && 'hidden')}
          >
            <div className="status-bar-fill" aria-hidden />
            <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-5">
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
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[16.5px] font-bold leading-tight text-primary sm:text-[18px]">
                  {heading ?? fallbackTitle}
                </h1>
                <p className="truncate text-[11.5px] text-muted">{orgName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
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

          <main className={cn('flex-1 px-3 py-4 sm:px-5 sm:py-6', 'pb-bottom-bar', (atHome || panel) && '@container')}>
            <div className="mx-auto max-w-[1400px]">
              <Gate>
                <ErrorBoundary resetOn={location.pathname} home={root}>
                  <Outlet />
                </ErrorBoundary>
              </Gate>
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
          orgName={orgName}
          personName={fullName(user)}
          focusSearch={menuSearch}
          photoURL={user.photoURL}
          onChooseHome={shell.openHomeChooser}
        />

        <HomeChooser open={chooserOpen} onClose={() => setChooserOpen(false)} uid={user.id} />
      </div>
    </ShellProvider>
  );
}
