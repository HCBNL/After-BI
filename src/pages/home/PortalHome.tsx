/**
 * Home, for everybody.
 *
 * One component rather than nine, because the shape of the home screen does not
 * change with the role. Only the numbers do.
 *
 * The version this replaces had `AdminDashboard.jsx`, `SalesDashboard.jsx` and
 * `DistributorDashboard.jsx` — three files, 1,900 lines, three different
 * arrangements of the same four ideas, and three places to fix a layout bug. A
 * distributor's home and a warehouse manager's home are not different screens;
 * they are the same screen counting different things.
 *
 * WHAT IS ON IT, IN ORDER
 *
 *   1. The notice strip, when the platform has something to say.
 *   2. Three numbers, one card at a time, swiped by hand.
 *   3. The shortcuts. The reason anybody opened this screen.
 *   4. The setup list, while the organisation is still being set up.
 *
 * THE GREETING IS NOT HERE. It is in the header, next to the photograph, where
 * it was already being printed. See `AppShell.tsx`.
 */

import { useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { HomeKpis, type Kpi } from '@/components/home/HomeKpis';
import { Shortcuts } from '@/components/home/Shortcuts';
import { SetupChecklist } from '@/components/home/SetupChecklist';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { getHomeSummary } from '@/lib/db';
import { isAdmin, isFinance, isOperations, isPartner, partnerScope } from '@/lib/roles';
import { nairaShort, count } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';

/**
 * Cap how long a home read may hang.
 *
 * On a bad Nigerian mobile connection a Firestore query does not fail quickly —
 * it hangs, and the home screen sat on its skeleton for minutes before anything
 * appeared, which reads as a broken app. This turns "hang forever" into "fail
 * in twenty-five seconds" so the card flips to its own Try again instead. The
 * read that timed out is left to finish or fail on its own; `useAsync` ignores
 * a result that lands after a newer request, so nothing stale can slip through.
 * It never cancels a good read — only bounds a stuck one.
 */
function withTimeout<T>(work: Promise<T>, ms = 25_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('This is taking too long. Check your connection and try again.')),
      ms,
    );
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export default function PortalHome() {
  const { user } = useAuth();
  const { products, distributors, warehouses, settings } = useOrg();

  const role = user?.role;
  const root = role ? PORTAL_ROOT[role] : '/';
  const scope = partnerScope(user);

  const { data, error, reload } = useAsync(
    async () => {
      if (!user || user.role === 'owner') return null;
      return withTimeout(
        getHomeSummary({ role: user.role, uid: user.id, distributorId: scope }),
      );
    },
    [user?.id, role, scope],
    { handleError: true },
  );

  /*
   * REFRESH WHEN THE APP IS REOPENED.
   *
   * An installed PWA is not reloaded the way a browser tab is — a rep taps the
   * icon and the same process wakes with whatever it last had on screen, which
   * after a spell of no signal is the "could not add up your numbers" card. So
   * when the app comes back to the foreground, a read that had failed is tried
   * again on its own and the card recovers without anybody pressing Try again.
   * Only a failed read is retried: a screen that is showing its numbers is left
   * alone, so this costs nothing on a normal reopen.
   */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && error) reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [error, reload]);

  /**
   * Three, never four.
   *
   * Each one answers a question somebody actually asks at 7am, and each is
   * something they can act on from the card. Which three depends on the job —
   * a warehouse manager has never once wondered about the debtors figure — so
   * the role picks its own set rather than everyone getting a superset with
   * two cards greyed out.
   */
  const kpis = useMemo<Kpi[]>(() => {
    if (!data || !role) return [];

    const orders: Kpi = {
      key: 'orders',
      label: 'Open orders',
      value: count(data.openOrders),
      caption: data.openOrders
        ? 'Submitted or approved, not yet fulfilled.'
        : 'Nothing is waiting to go out.',
      icon: <ShoppingCart size={17} />,
      action: { label: '+ New order', to: `${root}/orders?new=1` },
      secondary: { label: 'View orders', to: `${root}/orders` },
    };

    const approvals: Kpi = {
      key: 'approvals',
      label: 'Waiting for you',
      value: count(data.awaitingMe),
      caption: data.awaitingMe
        ? `Order${data.awaitingMe === 1 ? '' : 's'} that cannot move until you sign.`
        : 'Nothing is waiting on your signature.',
      icon: <ClipboardCheck size={17} />,
      tone: data.awaitingMe ? 'warning' : 'brand',
      action: data.awaitingMe ? { label: 'Review and sign', to: `${root}/approvals` } : undefined,
    };

    const sellOut: Kpi = {
      key: 'sales',
      label: 'Sell-out this month',
      value: nairaShort(data.monthSales),
      caption: 'What actually left the shelves, keyed so far this month.',
      icon: <TrendingUp size={17} />,
      tone: 'good',
      action: { label: '+ Record sell-out', to: `${root}/sell-out` },
    };

    const stock: Kpi = {
      key: 'stock',
      label: 'Below threshold',
      value: count(data.lowStock),
      caption: data.lowStock
        ? `Product line${data.lowStock === 1 ? '' : 's'} at or under the level you set.`
        : 'Every line is above its threshold.',
      icon: <Warehouse size={17} />,
      tone: data.lowStock ? 'warning' : 'good',
      action: { label: 'Open stock', to: `${root}/stock` },
    };

    const money: Kpi = {
      key: 'money',
      label: data.overdue ? 'Overdue' : 'Outstanding',
      /*
       * The overdue figure wins the card when there is one.
       *
       * "₦18m outstanding" is a business fact and nobody does anything about it
       * today. "₦2.4m overdue" is a phone call, and burying it behind the
       * larger, calmer number is how it stops being made.
       */
      value: nairaShort(data.overdue || data.outstanding),
      caption: data.overdue
        ? `Past its due date. ${nairaShort(data.outstanding)} outstanding in total.`
        : 'Issued and not yet paid. Nothing is past its due date.',
      icon: <Wallet size={17} />,
      tone: data.overdue ? 'critical' : 'brand',
      /*
       * The bar shows the OVERDUE share, not the healthy one.
       *
       * It used to fill with `(outstanding - overdue) / outstanding` — the
       * proportion that is fine — on a card whose headline number, label and
       * colour are all about what is late. So the worse the debt got, the
       * emptier the red bar looked, which is exactly backwards. A meter under a
       * figure has to measure that figure.
       */
      progress:
        data.overdue && data.outstanding ? (data.overdue / data.outstanding) * 100 : undefined,
      action: { label: 'Open invoices', to: `${root}/invoices` },
    };

    if (isPartner(role)) return [orders, money, sellOut];
    if (isOperations(role) && !isAdmin(role)) return [stock, orders, approvals];
    if (isFinance(role) && !isAdmin(role)) return [money, approvals, orders];
    if (role === 'sales_rep') return [orders, sellOut, money];
    /* Admins and staff: the whole business, in the order they ask about it. */
    return [orders, approvals, money];
  }, [data, role, root]);

  if (!user) return null;

  const setupNeeded =
    isAdmin(user.role) &&
    !settings?.setupComplete &&
    (warehouses.length === 0 || products.length === 0 || distributors.length === 0);

  return (
    <div className="space-y-5">
      <HomeKpis
        items={kpis}
        /*
          The role decides how much room to hold, not the data — the data is what
          has not arrived yet. Holding three on a phone would be three grey
          rectangles; the carousel shows one at a time, so one is what is held.
        */
        placeholders={3}
        failed={Boolean(error)}
        onRetry={reload}
      />

      {/*
        The shortcuts.

        A home screen with nothing on it does not read as uncluttered, it reads
        as "this app has nothing for you" — which is exactly what a newly
        created distributor account saw in the old build, because their
        dashboard's four cards all rendered zero and there was nothing else on
        the page. These need no data at all and are always here.
      */}
      <Shortcuts role={user.role} />

      {setupNeeded && (
        <SetupChecklist
          root={root}
          state={{
            warehouses: warehouses.length,
            products: products.length,
            distributors: distributors.length,
            branded: Boolean(settings?.name),
          }}
        />
      )}
    </div>
  );
}
