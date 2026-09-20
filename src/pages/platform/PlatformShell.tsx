import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar } from '@/components/ui';
import { Wordmark } from '@/components/brand/Mark';
import { useAuth } from '@/context/AuthContext';
import { PageHeadingProvider, usePageHeading } from '@/components/layout/PageHeading';
import { BottomBar } from '@/components/layout/BottomBar';
import { NavRail } from '@/components/layout/NavRail';
import { MenuSheet } from '@/components/layout/MenuSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { actionsForRole, resolveTo, PORTAL_ROOT } from '@/lib/tiles';
import { fullName } from '@/lib/roles';

/**
 * The platform console's shell.
 *
 * Almost `AppShell`, and deliberately not a branch inside it. The difference is
 * one thing and it is structural: there is no `OrgProvider` here, because an
 * owner belongs to no organisation. Every tenant screen resolves products and
 * distributors from that context, and an owner has neither — `requireOrg()`
 * would throw on the first read.
 *
 * Everything else is shared: the same rail, the same bottom bar, the same menu
 * sheet, the same action catalogue. The platform console gets the shape of the
 * product for free rather than growing its own navigation that drifts from it —
 * which is exactly what happened in the version this replaces, where the admin
 * console was one screen with a row of tabs inside it.
 */
export default function PlatformShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { heading } = usePageHeading();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const root = PORTAL_ROOT.owner;
  const atHome = location.pathname === root;

  const fallbackTitle = useMemo(() => {
    if (atHome) return 'Platform';
    if (location.pathname === `${root}/profile`) return 'Profile';
    const match = actionsForRole('owner')
      .map((a) => ({ a, to: resolveTo(a, 'owner') }))
      .filter(({ to }) => location.pathname.startsWith(to.split('?')[0]))
      .sort((x, y) => y.to.length - x.to.length)[0];
    return match?.a.label ?? 'AfterBI';
  }, [atHome, location.pathname, root]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="flex min-h-dvh surface-page">
      <NavRail role="owner" onSignOut={() => void handleSignOut()} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-hairline surface-card">
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

            <div className={cn('min-w-0 flex-1', atHome && '-ml-0.5')}>
              {atHome ? (
                <Wordmark />
              ) : (
                <h1 className="truncate text-[16.5px] font-bold leading-tight text-primary sm:text-[18px]">
                  {heading ?? fallbackTitle}
                </h1>
              )}
              {atHome && <p className="mt-0.5 text-[11.5px] text-muted">Platform console</p>}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <div className="hidden lg:block">
                <ThemeToggle compact />
              </div>
              <Link to={`${root}/profile`} aria-label="Your profile" className="ml-0.5">
                <Avatar name={`${user.firstName} ${user.lastName}`} src={user.photoURL} size="sm" />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 pb-bottom-bar sm:px-5 sm:py-6">
          <div className="mx-auto max-w-[1400px]">
            <ErrorBoundary resetOn={location.pathname} home={root}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <BottomBar role="owner" onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />

      <MenuSheet
        role="owner"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSignOut={() => void handleSignOut()}
        orgName="AfterBI"
        personName={fullName(user)}
      />
    </div>
  );
}

export function PlatformShellWithProviders() {
  return (
    <PageHeadingProvider>
      <PlatformShell />
    </PageHeadingProvider>
  );
}
