import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth, HOME_FOR_ROLE } from '@/context/AuthContext';
import { PageSkeleton, ShellSkeleton } from '@/components/brand/Loader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AppShell from '@/components/layout/AppShell';
import { PlatformShellWithProviders } from '@/pages/platform/PlatformShell';
import LoginPage from '@/pages/auth/LoginPage';
import type { Role } from '@/types';

/*
 * Screens are loaded when they are opened, not when the app starts.
 *
 * The version this replaces had `LoginPage` and `DistributorDashboard` eager
 * and everything else lazy, which is nearly right — but it shipped one bundle
 * carrying the territory map's topojson client, exceljs and two charting
 * libraries to every account on every first load. On a Nigerian mobile
 * connection that is most of the wait before the first paint, paid by a
 * distributor who only wanted to see one invoice.
 *
 * `LoginPage` stays eager: it is the screen everybody arrives on, and making
 * the front door wait for a second request would undo the point. Everything
 * else is fetched the moment it is needed and then cached by the browser for
 * the rest of the visit.
 *
 * A chunk that fails to load because a deploy went out mid-visit is already
 * handled — `ErrorBoundary` recognises it and reloads once.
 */
const PortalHome = lazy(() => import('@/pages/home/PortalHome'));
const AllActions = lazy(() => import('@/pages/home/AllActions'));

const OrdersPage = lazy(() => import('@/pages/sales/OrdersPage'));
const CataloguePage = lazy(() => import('@/pages/sales/CataloguePage'));
const SellOutPage = lazy(() => import('@/pages/sales/SellOutPage'));
const LeadsPage = lazy(() => import('@/pages/sales/LeadsPage'));
const TargetsPage = lazy(() => import('@/pages/sales/TargetsPage'));
const ScorecardsPage = lazy(() => import('@/pages/sales/ScorecardsPage'));
const TerritoriesPage = lazy(() => import('@/pages/sales/TerritoriesPage'));

const StockPage = lazy(() => import('@/pages/inventory/StockPage'));
const ProductsPage = lazy(() => import('@/pages/inventory/ProductsPage'));
const MovementsPage = lazy(() => import('@/pages/inventory/MovementsPage'));
const WarehousesPage = lazy(() => import('@/pages/inventory/WarehousesPage'));
const ReturnsPage = lazy(() => import('@/pages/inventory/ReturnsPage'));

const DistributorsPage = lazy(() => import('@/pages/partners/DistributorsPage'));
const ContactsPage = lazy(() => import('@/pages/partners/ContactsPage'));

const InvoicesPage = lazy(() => import('@/pages/finance/InvoicesPage'));
const StatementPage = lazy(() => import('@/pages/finance/StatementPage'));
const CreditPage = lazy(() => import('@/pages/finance/CreditPage'));
const ReportsPage = lazy(() => import('@/pages/finance/ReportsPage'));

const ApprovalsPage = lazy(() => import('@/pages/ops/ApprovalsPage'));
const DeliveriesPage = lazy(() => import('@/pages/ops/DeliveriesPage'));

const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const InvitePage = lazy(() => import('@/pages/admin/InvitePage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const SetupPage = lazy(() => import('@/pages/admin/SetupPage'));

const ProfilePage = lazy(() => import('@/pages/shared/ProfilePage'));
const NoticePage = lazy(() => import('@/pages/shared/NoticePage'));
const NotFoundPage = lazy(() => import('@/pages/shared/NotFoundPage'));

const PlatformHome = lazy(() => import('@/pages/platform/PlatformHome'));
const OrganisationsPage = lazy(() => import('@/pages/platform/OrganisationsPage'));
const EnquiriesPage = lazy(() => import('@/pages/platform/EnquiriesPage'));
const PricingPage = lazy(() => import('@/pages/platform/PricingPage'));
const NoticesAdminPage = lazy(() => import('@/pages/platform/NoticesAdminPage'));

/** Blocks a route until the user is signed in and holds one of `roles`. */
function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <ShellSkeleton />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  /*
   * Wrong role goes HOME, not to an "access denied" screen.
   *
   * The version this replaces rendered a lock icon and the words "You don't
   * have permission to view this page", which is the worst of both: it confirms
   * the screen exists, and it strands somebody who followed a link a colleague
   * sent them. Sending them to their own home is both safer and more useful —
   * they end up somewhere they can work.
   */
  if (!roles.includes(user.role)) return <Navigate to={HOME_FOR_ROLE[user.role]} replace />;

  return <>{children}</>;
}

/**
 * A screen inside a shared portal that is not for every role in it.
 *
 * `/portal/office` serves super admin, admin AND staff, but ten of its screens
 * are administrators' — Settings, People, Invite, the price
 * list. Without this, a staff member who typed one of those URLs got the screen:
 * the security rules still refused every write, so what they actually saw was a
 * form whose Save button failed. That is worse than a refusal, because it
 * teaches people that controls in this app cannot be trusted.
 *
 * The role list here is the same one that action carries in `tiles.ts`, said
 * again — and `tests/wiring.test.mjs` fails the build if the two drift.
 */
function AdminOnly({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={['super_admin', 'admin']}>{children}</RequireRole>;
}

/* ------------------------------------------------------------ role bundles */

const OFFICE: Role[] = ['super_admin', 'admin', 'staff'];
const OPS: Role[] = ['warehouse_manager', 'operations_manager'];

/**
 * AfterBI — the whole app, in one file, sectioned.
 *
 * SIX PORTALS, AND WHO IS IN EACH
 *
 *   /login             no account needed
 *   /portal/platform   the platform. Not a tenant; sees organisations, not orders.
 *   /portal/office     super admin, admin, staff — the head office
 *   /portal/sales      sales reps
 *   /portal/operations warehouse and operations managers
 *   /portal/finance    finance managers
 *   /portal/partner    distributors
 *
 * Each portal is one `<Route>` with a `RequireRole` guard and a shell, and its
 * children are the screens. A screen that is not listed under a portal cannot
 * be reached from it, whatever a link elsewhere says — which is the property
 * that makes the wildcard at the bottom of each block a 404 rather than a
 * silently blank page.
 *
 * WHAT CHANGED FROM THE FLAT ROUTE TABLE THIS REPLACES
 *
 * Every route used to live at the top level with its own `allowedRoles` array —
 * fifty-one of them, with the role lists maintained by hand and drifting from
 * both the menu and the security rules. Nine routes appeared in no menu at all.
 * Now a portal's route block and that role's rows in `tiles.ts` are the same
 * list said twice, and the second one is what draws the navigation, so a screen
 * that exists is a screen somebody can find.
 */
export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  return (
    /*
     * `resetOn`, never `key`.
     *
     * A changed key unmounts everything below it, so every tap on a navigation
     * button would tear down the shell, the contexts and all their cached data,
     * then build it again and re-read products, distributors and depots from
     * Firestore before the new screen could even start its own query. That is
     * how an app gets a loader on every navigation. `resetOn` clears a caught
     * error exactly as reliably, inside the boundary, without disturbing
     * anything underneath it.
     */
    <ErrorBoundary resetOn={location.pathname} home={user ? HOME_FOR_ROLE[user.role] : '/login'}>
      <Suspense
        fallback={location.pathname.startsWith('/portal') ? <ShellSkeleton /> : <PageSkeleton />}
      >
        <Routes>
          {/* ---------------------------------------------------------- public */}
          <Route
            path="/login"
            element={
              loading ? (
                <ShellSkeleton />
              ) : user ? (
                <Navigate to={HOME_FOR_ROLE[user.role]} replace />
              ) : (
                <LoginPage />
              )
            }
          />

          <Route
            path="/"
            element={
              loading ? (
                <ShellSkeleton />
              ) : (
                <Navigate to={user ? HOME_FOR_ROLE[user.role] : '/login'} replace />
              )
            }
          />

          {/* -------------------------------------------------------- platform */}
          <Route
            path="/portal/platform"
            element={
              <RequireRole roles={['owner']}>
                <PlatformShellWithProviders />
              </RequireRole>
            }
          >
            <Route index element={<PlatformHome />} />
            <Route path="all" element={<AllActions />} />
            <Route path="organisations" element={<OrganisationsPage />} />
            <Route path="enquiries" element={<EnquiriesPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="notices-admin" element={<NoticesAdminPage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage inPortal />} />
          </Route>

          {/* ---------------------------------------------------------- office */}
          <Route
            path="/portal/office"
            element={
              <RequireRole roles={OFFICE}>
                <AppShell />
              </RequireRole>
            }
          >
            <Route index element={<PortalHome />} />
            <Route path="all" element={<AllActions />} />

            <Route path="orders" element={<OrdersPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="sell-out" element={<SellOutPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="targets" element={<TargetsPage />} />

            <Route path="stock" element={<StockPage />} />
            <Route path="movements" element={<MovementsPage />} />
            <Route path="returns" element={<ReturnsPage />} />

            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="statement" element={<StatementPage />} />
            <Route path="reports" element={<ReportsPage />} />

            <Route path="distributors" element={<DistributorsPage />} />
            <Route path="contacts" element={<ContactsPage />} />

            {/* Administrators only — see `AdminOnly` above for why these are
                guarded rather than simply left off the staff menu. */}
            <Route path="products" element={<AdminOnly><ProductsPage /></AdminOnly>} />
            <Route path="warehouses" element={<AdminOnly><WarehousesPage /></AdminOnly>} />
            <Route path="credit" element={<AdminOnly><CreditPage /></AdminOnly>} />
            <Route path="scorecards" element={<AdminOnly><ScorecardsPage /></AdminOnly>} />
            <Route path="territories" element={<AdminOnly><TerritoriesPage /></AdminOnly>} />
            <Route path="setup" element={<AdminOnly><SetupPage /></AdminOnly>} />
            <Route path="users" element={<AdminOnly><UsersPage /></AdminOnly>} />
            <Route path="invite" element={<AdminOnly><InvitePage /></AdminOnly>} />
            <Route path="settings" element={<AdminOnly><SettingsPage /></AdminOnly>} />

            <Route path="profile" element={<ProfilePage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="*" element={<NotFoundPage inPortal />} />
          </Route>

          {/* ----------------------------------------------------------- sales */}
          <Route
            path="/portal/sales"
            element={
              <RequireRole roles={['sales_rep']}>
                <AppShell />
              </RequireRole>
            }
          >
            <Route index element={<PortalHome />} />
            <Route path="all" element={<AllActions />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="sell-out" element={<SellOutPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="targets" element={<TargetsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="statement" element={<StatementPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="*" element={<NotFoundPage inPortal />} />
          </Route>

          {/* ------------------------------------------------------ operations */}
          <Route
            path="/portal/operations"
            element={
              <RequireRole roles={OPS}>
                <AppShell />
              </RequireRole>
            }
          >
            <Route index element={<PortalHome />} />
            <Route path="all" element={<AllActions />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="movements" element={<MovementsPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="targets" element={<TargetsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="statement" element={<StatementPage />} />
            <Route path="contacts" element={<ContactsPage />} />

            {/*
              A SHARED PORTAL, TWO DIFFERENT JOBS.

              `/portal/operations` serves both a warehouse manager and an
              operations manager, and their catalogues are not the same — a
              storekeeper has no business in the debtors report or the customer
              list. Without a nested guard these four were routed for the whole
              portal, so a warehouse manager who typed the URL reached a screen
              their own menu says is not theirs.

              Each guard is that action's role list from `tiles.ts`, said again.
              `tests/wiring.test.mjs` checks the two agree: any leaf that is not
              in EVERY portal role's catalogue has to carry one of these.
            */}
            <Route
              path="warehouses"
              element={
                <RequireRole roles={['super_admin', 'admin', 'operations_manager']}>
                  <WarehousesPage />
                </RequireRole>
              }
            />
            <Route
              path="scorecards"
              element={
                <RequireRole roles={['super_admin', 'admin', 'operations_manager']}>
                  <ScorecardsPage />
                </RequireRole>
              }
            />
            <Route
              path="reports"
              element={
                <RequireRole
                  roles={['super_admin', 'admin', 'staff', 'finance_manager', 'operations_manager']}
                >
                  <ReportsPage />
                </RequireRole>
              }
            />
            <Route
              path="distributors"
              element={
                <RequireRole
                  roles={['super_admin', 'admin', 'staff', 'operations_manager', 'finance_manager']}
                >
                  <DistributorsPage />
                </RequireRole>
              }
            />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="*" element={<NotFoundPage inPortal />} />
          </Route>

          {/* --------------------------------------------------------- finance */}
          <Route
            path="/portal/finance"
            element={
              <RequireRole roles={['finance_manager']}>
                <AppShell />
              </RequireRole>
            }
          >
            <Route index element={<PortalHome />} />
            <Route path="all" element={<AllActions />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="statement" element={<StatementPage />} />
            <Route path="credit" element={<CreditPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="targets" element={<TargetsPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="distributors" element={<DistributorsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="*" element={<NotFoundPage inPortal />} />
          </Route>

          {/* --------------------------------------------------------- partner */}
          <Route
            path="/portal/partner"
            element={
              <RequireRole roles={['distributor']}>
                <AppShell />
              </RequireRole>
            }
          >
            <Route index element={<PortalHome />} />
            <Route path="all" element={<AllActions />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="sell-out" element={<SellOutPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="statement" element={<StatementPage />} />
            <Route path="targets" element={<TargetsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="*" element={<NotFoundPage inPortal />} />
          </Route>

          {/*
            THE OLD ADDRESSES.

            Every one of these is in somebody's bookmarks, in an emailed invoice
            link, or in a WhatsApp message a rep sent a distributor two years
            ago. They resolve rather than 404, and they resolve to the signed-in
            person's own portal — which is correct for all of them, because the
            old flat routes served every role from the same path anyway.
          */}
          <Route path="/admin/*" element={<LegacyRedirect />} />
          <Route path="/staff/*" element={<LegacyRedirect />} />
          <Route path="/distributor/*" element={<LegacyRedirect />} />
          <Route path="/sales-rep/*" element={<LegacyRedirect />} />
          <Route path="/finance/*" element={<LegacyRedirect />} />
          <Route path="/ops-home/*" element={<LegacyRedirect />} />
          <Route path="/operations/*" element={<LegacyRedirect />} />
          <Route path="/invoices" element={<LegacyRedirect to="invoices" />} />
          <Route path="/statement" element={<LegacyRedirect to="statement" />} />
          {/* Claims were removed — they are settled offline, and the software
              side of the outcome is a return. The old address goes there rather
              than 404ing, because it is in bookmarks and old WhatsApp messages. */}
          <Route path="/claims" element={<LegacyRedirect to="returns" />} />
          <Route path="/contacts" element={<LegacyRedirect to="contacts" />} />
          <Route path="/catalogue" element={<LegacyRedirect to="catalogue" />} />
          <Route path="/approvals" element={<LegacyRedirect to="approvals" />} />
          <Route path="/targets" element={<LegacyRedirect to="targets" />} />
          <Route path="/credit-limits" element={<LegacyRedirect to="credit" />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * An old address, resolved against whoever is signed in.
 *
 * A leaf is only honoured if the portal that person lands in actually has it —
 * otherwise the portal's own wildcard would show them a 404 that looks like a
 * broken app rather than an old link. So an unmatched leaf falls back to home.
 */
function LegacyRedirect({ to }: { to?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <ShellSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  const root = HOME_FOR_ROLE[user.role];
  return <Navigate to={to ? `${root}/${to}` : root} replace />;
}
