/**
 * Home, for everybody inside an organisation.
 *
 * One component, because the shape of the home screen does not change with the
 * role: only the numbers do. The person picks one of two layouts from the
 * button beside their photograph (see `useHomeLayout` and `HomeChooser`):
 *
 *   Tiles  the panel with every shortcut, the "To do" card, and the three
 *          numbers as banners sitting on the bottom bar.
 *   Cards  the panel with the three numbers as cards, six shortcuts as a list,
 *          the "To do" card, and AfterBI's ads sitting on the bottom bar.
 *
 * A laptop gets the same screen with more room (`HomeDesk.tsx`).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { QuietLoader } from '@/components/brand/Loader';
import { useBootDone } from '@/lib/boot';
import { DeskHero, DeskShortcuts, MonthCard } from '@/components/home/HomeDesk';
import { HomeHero } from '@/components/home/HomeHero';
import type { Kpi } from '@/components/home/HomeSlides';
import { AdSlides, KpiBannerGrid, KpiBanners } from '@/components/home/HomeSlides';
import { useAppAds } from '@/hooks/useAppAds';
import { QuickList } from '@/components/home/QuickList';
import { SetupChecklist } from '@/components/home/SetupChecklist';
import { TodoCard, type TodoItem } from '@/components/home/TodoCard';
import { BriefCard } from '@/components/home/BriefCard';
import { useTour } from '@/context/TourContext';
import { useShell } from '@/components/layout/ShellContext';
import { useAsync } from '@/hooks/useAsync';
import { useHomeLayout } from '@/hooks/useHomeLayout';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { getHomeSummary } from '@/lib/db';
import { isAdmin, isFinance, isOperations, isPartner, partnerScope } from '@/lib/roles';
import { count, nairaShort } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';
import type { Role } from '@/types';

/** Turn "hang forever" on a bad connection into "fail in 25 seconds, with Try again". */
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

const APPROVERS: Role[] = [
  'super_admin',
  'admin',
  'staff',
  'finance_manager',
  'operations_manager',
  'warehouse_manager',
];

export default function PortalHome() {
  const { user } = useAuth();
  const { products, distributors, warehouses, settings } = useOrg();
  const [layout] = useHomeLayout(user?.id);
  const { openMenu } = useShell();

  const role = user?.role;
  const root = role ? PORTAL_ROOT[role] : '/';
  const scope = partnerScope(user);

  const { data, loading, error, reload } = useAsync(
    async () => {
      /* An HR officer has no orders, stock or invoices to summarise, and the
         rules would refuse them the reads: their home is the shortcuts. */
      if (!user || user.role === 'owner' || user.role === 'hr') return null;
      return withTimeout(getHomeSummary({ role: user.role, uid: user.id, distributorId: scope }));
    },
    [user?.id, role, scope],
    { handleError: true },
  );

  /* One loader, then the whole screen at once: capped at five seconds, after which the shortcuts are worth more than a wait. */
  const [patience, setPatience] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setPatience(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);
  const ready = patience || Boolean(error) || (!loading && data !== undefined);

  /* An installed app wakes with its last screen; a read that failed while offline retries itself. */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && error) reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [error, reload]);

  /** Three, never four: each something the person can act on from the card. */
  const kpis = useMemo<Kpi[]>(() => {
    if (!data || !role) return [];

    const orders: Kpi = {
      key: 'orders',
      label: 'Open orders',
      value: count(data.openOrders),
      caption: data.openOrders ? 'Submitted or approved, not yet fulfilled.' : 'Nothing is waiting to go out.',
      icon: <ShoppingCart size={17} />,
      action: { label: '+ New order', to: `${root}/orders?new=1` },
      secondary: { label: 'View orders', to: `${root}/orders` },
    };
    const approvals: Kpi = {
      key: 'approvals',
      label: 'Waiting for you',
      value: count(data.awaitingMe),
      caption: data.awaitingMe
        ? data.awaitingMe === 1
          ? 'An order that cannot move until you sign.'
          : 'Orders that cannot move until you sign.'
        : 'Nothing is waiting on your signature.',
      icon: <ClipboardCheck size={17} />,
      tone: data.awaitingMe ? 'warning' : 'brand',
      action: data.awaitingMe ? { label: 'Review and sign', to: `${root}/approvals` } : undefined,
    };
    const sellOut: Kpi = {
      key: 'sales',
      label: 'Sell-out this month',
      value: nairaShort(data.monthSales),
      money: true,
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
        ? data.lowStock === 1
          ? 'A product line at or under the level you set.'
          : 'Product lines at or under the level you set.'
        : 'Every line is above its threshold.',
      icon: <Warehouse size={17} />,
      tone: data.lowStock ? 'warning' : 'good',
      action: { label: 'Open stock', to: `${root}/stock` },
    };
    const money: Kpi = {
      key: 'money',
      label: data.overdue ? 'Overdue' : 'Outstanding',
      value: nairaShort(data.overdue || data.outstanding),
      money: true,
      caption: data.overdue
        ? `Past its due date. ${nairaShort(data.outstanding)} outstanding in total.`
        : 'Issued and not yet paid. Nothing is past its due date.',
      icon: <Wallet size={17} />,
      tone: data.overdue ? 'critical' : 'brand',
      progress: data.overdue && data.outstanding ? (data.overdue / data.outstanding) * 100 : undefined,
      action: { label: 'View invoices', to: `${root}/invoices` },
    };

    if (isPartner(role)) return [orders, money, sellOut];
    if (isOperations(role) && !isAdmin(role)) return [stock, orders, approvals];
    if (isFinance(role) && !isAdmin(role)) return [money, approvals, orders];
    if (role === 'sales_rep') return [orders, sellOut, money];
    return [orders, approvals, money];
  }, [data, role, root]);

  /** What is waiting on this person, read from real records: it ticks itself off. */
  const todo = useMemo<TodoItem[]>(() => {
    const items: TodoItem[] = [];
    if (!data || !role) return items;

    if (APPROVERS.includes(role)) {
      items.push(
        data.awaitingMe
          ? {
              id: 'approvals',
              state: 'todo',
              icon: ClipboardCheck,
              to: `${root}/approvals`,
              count: data.awaitingMe,
              title: 'Orders waiting for your signature',
              detail: 'They cannot move until you approve or reject them.',
            }
          : {
              id: 'approvals',
              state: 'done',
              icon: ClipboardCheck,
              to: `${root}/approvals`,
              title: 'Approvals clear',
              detail: 'Nothing is waiting on your signature.',
            },
      );
    }

    if (isOperations(role) || isAdmin(role) || role === 'staff') {
      items.push(
        data.lowStock
          ? {
              id: 'stock',
              state: 'todo',
              icon: Warehouse,
              to: `${root}/stock`,
              count: data.lowStock,
              title: 'Lines below threshold',
              detail: 'Restock or move stock before orders stall.',
            }
          : {
              id: 'stock',
              state: 'done',
              icon: Warehouse,
              to: `${root}/stock`,
              title: 'Stock above threshold',
              detail: 'Every line is above the level you set.',
            },
      );
    }

    if (isFinance(role) || isAdmin(role) || isPartner(role)) {
      items.push(
        data.overdue > 0
          ? {
              id: 'overdue',
              state: 'todo',
              icon: Receipt,
              to: `${root}/invoices`,
              title: `${nairaShort(data.overdue)} overdue`,
              detail: isPartner(role)
                ? 'Past its due date. Settling it keeps your next order moving.'
                : 'Invoices past their due date. Worth a call today.',
            }
          : {
              id: 'overdue',
              state: 'done',
              icon: Receipt,
              to: `${root}/invoices`,
              title: 'Nothing overdue',
              detail: data.outstanding ? `${nairaShort(data.outstanding)} outstanding, all within terms.` : 'No unpaid invoices.',
            },
      );
    }

    if (role === 'sales_rep' || role === 'distributor') {
      items.push(
        data.monthSales > 0
          ? {
              id: 'sellout',
              state: 'done',
              icon: TrendingUp,
              to: `${root}/sell-out`,
              title: 'Sell-out keyed this month',
              detail: `${nairaShort(data.monthSales)} so far.`,
            }
          : {
              id: 'sellout',
              state: 'todo',
              icon: TrendingUp,
              to: `${root}/sell-out`,
              title: 'No sell-out keyed this month',
              detail: 'Record what left the shelves so targets and scorecards are real.',
            },
      );
    }

    if (data.openOrders) {
      items.push({
        id: 'open-orders',
        state: 'info',
        icon: ShoppingCart,
        to: `${root}/orders`,
        title: data.openOrders === 1 ? '1 open order' : `${count(data.openOrders)} open orders`,
        detail: 'Submitted or approved, not yet fulfilled.',
      });
    }

    return items;
  }, [data, role, root]);

  const ads = useAppAds();

  /* The first visit plays the tour, once, after the screen has drawn. */
  const { startIfNew } = useTour();
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(startIfNew, 700);
    return () => window.clearTimeout(timer);
  }, [ready, startIfNew]);

  useBootDone(ready);
  if (!user) return null;
  if (!ready) return <QuietLoader label="Getting your home ready" />;

  const orgName = settings?.name || 'Your organisation';
  const cards = layout === 'cards';
  const failed = Boolean(error);
  const selling = role === 'sales_rep' || role === 'distributor' || (role ? isAdmin(role) : false);

  const setupNeeded =
    isAdmin(user.role) &&
    !settings?.setupComplete &&
    (warehouses.length === 0 || products.length === 0 || distributors.length === 0);

  return (
    <div className="min-h-home flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
      <HomeHero user={user} orgName={orgName} layout={layout} kpis={kpis} kpiFailed={failed} onKpiRetry={reload} />

      <DeskHero
        className="hidden lg:col-span-12 lg:-mb-6 lg:block"
        user={user}
        orgName={orgName}
        layout={layout}
        kpis={kpis}
        kpiFailed={failed}
        onKpiRetry={reload}
      />

      <div className="hidden lg:col-span-12 lg:block">
        {cards ? <DeskShortcuts role={user.role} /> : <KpiBannerGrid items={kpis} failed={failed} onRetry={reload} />}
      </div>

      {cards && <QuickList role={user.role} onMore={() => openMenu()} className="lg:hidden" />}

      <BriefCard root={root} className="lg:col-span-12" />

      <TodoCard className="lg:col-span-8 lg:self-stretch" items={todo} failed={failed} onRetry={reload} />
      <div className="hidden lg:col-span-4 lg:flex lg:self-stretch">
        <MonthCard footnote={selling && data ? `Sell-out so far ${nairaShort(data.monthSales)}` : undefined} />
      </div>

      {setupNeeded && (
        <div className="lg:col-span-12">
          <SetupChecklist
            root={root}
            state={{
              warehouses: warehouses.length,
              products: products.length,
              distributors: distributors.length,
              branded: Boolean(settings?.name),
            }}
          />
        </div>
      )}

      <div className="hidden lg:col-span-12 lg:block">
        <AdSlides ads={ads} bleed={false} slideClassName="lg:basis-[calc((100%_-_1.5rem)/3)]" />
      </div>

      {cards ? (
        <AdSlides ads={ads} className="mt-auto lg:hidden" />
      ) : (
        <KpiBanners className="mt-auto lg:hidden" items={kpis} failed={failed} onRetry={reload} />
      )}
    </div>
  );
}
