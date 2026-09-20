/**
 * Home, for everybody inside an organisation.
 *
 * One component, because the shape of the home screen does not change with the
 * role — only the numbers do. The person picks one of two layouts from the
 * button beside their photograph (see `useHomeLayout` and `HomeChooser`):
 *
 *   Tiles  the panel with every shortcut, the "To do" card, and the three
 *          numbers as banners sitting on the bottom bar.
 *   Cards  the panel with the three numbers as cards, six shortcuts as a list,
 *          the "To do" card, and tips sitting on the bottom bar.
 *
 * A laptop gets the same screen with more room (`HomeDesk.tsx`).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  FileText,
  Package,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
  UserPlus,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { DeskHero, DeskShortcuts, MonthCard } from '@/components/home/HomeDesk';
import { HomeHero } from '@/components/home/HomeHero';
import type { Kpi } from '@/components/home/HomeSlides';
import { KpiBannerGrid, KpiBanners, TipSlides, type Tip } from '@/components/home/HomeSlides';
import { QuickList } from '@/components/home/QuickList';
import { SetupChecklist } from '@/components/home/SetupChecklist';
import { TodoCard, type TodoItem } from '@/components/home/TodoCard';
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

/** Three pointers per role, each to a screen that role has. */
function tipsFor(role: Role, root: string): Tip[] {
  if (isAdmin(role)) {
    return [
      {
        id: 'people',
        tone: 'brand',
        icon: UserPlus,
        title: 'Give your team their sign-ins',
        body: 'Create an account for each rep, depot and distributor. You hand them the details; nothing is emailed.',
        cta: { label: 'Add a person', to: `${root}/invite` },
      },
      {
        id: 'threshold',
        tone: 'ink',
        icon: Settings,
        title: 'Decide who signs big orders',
        body: 'Leave the approval threshold at zero until more than one person raises orders.',
        cta: { label: 'Open settings', to: `${root}/settings` },
      },
      {
        id: 'tiers',
        tone: 'amber',
        icon: Package,
        title: 'Price tiers do the discounting',
        body: 'Each product carries OT, MT and SEP prices. A distributor only ever sees their own tier.',
        cta: { label: 'Open products', to: `${root}/products` },
      },
    ];
  }
  if (role === 'sales_rep') {
    return [
      {
        id: 'order',
        tone: 'brand',
        icon: ShoppingCart,
        title: 'Raise an order in under a minute',
        body: 'Pick the distributor, add the lines. The price comes from their tier, not from a box you type in.',
        cta: { label: 'New order', to: `${root}/orders?new=1` },
      },
      {
        id: 'sellout',
        tone: 'ink',
        icon: TrendingUp,
        title: 'Key sell-out every day',
        body: 'What left the shelves is the number your target and scorecard are measured on.',
        cta: { label: 'Record sell-out', to: `${root}/sell-out` },
      },
      {
        id: 'target',
        tone: 'amber',
        icon: Target,
        title: 'Know where you stand',
        body: 'Your target for the month, and how far through it you are, on one screen.',
        cta: { label: 'Open targets', to: `${root}/targets` },
      },
    ];
  }
  if (role === 'distributor') {
    return [
      {
        id: 'statement',
        tone: 'brand',
        icon: FileText,
        title: 'Your statement, any time',
        body: 'Every invoice and payment to the balance carried forward. Print it or save it as a PDF.',
        cta: { label: 'Open statement', to: `${root}/statement` },
      },
      {
        id: 'catalogue',
        tone: 'ink',
        icon: Package,
        title: 'Order from your own price list',
        body: 'The catalogue shows your tier’s prices and the minimum order for each line.',
        cta: { label: 'Open catalogue', to: `${root}/catalogue` },
      },
      {
        id: 'returns',
        tone: 'amber',
        icon: RotateCcw,
        title: 'Something wrong with a delivery?',
        body: 'Raise a return for damage, shortage or expiry. The credit follows when it is approved.',
        cta: { label: 'Open returns', to: `${root}/returns` },
      },
    ];
  }
  if (isFinance(role)) {
    return [
      {
        id: 'payments',
        tone: 'brand',
        icon: Receipt,
        title: 'Record payments as they land',
        body: 'Part payments are fine. The invoice and the statement update together.',
        cta: { label: 'Open invoices', to: `${root}/invoices` },
      },
      {
        id: 'credit',
        tone: 'ink',
        icon: Wallet,
        title: 'Watch who is against their ceiling',
        body: 'Credit limits show what each distributor may owe at once.',
        cta: { label: 'Open credit limits', to: `${root}/credit` },
      },
      {
        id: 'reports',
        tone: 'amber',
        icon: FileText,
        title: 'Reports as spreadsheets',
        body: 'Sales, stock and debtors, for whoever asked for it in Excel.',
        cta: { label: 'Open reports', to: `${root}/reports` },
      },
    ];
  }
  if (isOperations(role)) {
    return [
      {
        id: 'stock-in',
        tone: 'brand',
        icon: Truck,
        title: 'Record stock in as it lands',
        body: 'Every movement is kept with who made it and the balance after it.',
        cta: { label: 'Open movements', to: `${root}/movements` },
      },
      {
        id: 'low',
        tone: 'ink',
        icon: Warehouse,
        title: 'Low stock turns amber',
        body: 'Set a threshold per line and it shows on this screen before orders stall.',
        cta: { label: 'Open stock', to: `${root}/stock` },
      },
      {
        id: 'returns',
        tone: 'amber',
        icon: RotateCcw,
        title: 'Returns put stock back',
        body: 'Receiving a return writes the ledger and carries its credit.',
        cta: { label: 'Open returns', to: `${root}/returns` },
      },
    ];
  }
  return [
    {
      id: 'orders',
      tone: 'brand',
      icon: ShoppingCart,
      title: 'Every order, draft to delivered',
      body: 'Who raised it, who still has to sign, and whether it has left the depot.',
      cta: { label: 'Open orders', to: `${root}/orders` },
    },
    {
      id: 'stock',
      tone: 'ink',
      icon: Warehouse,
      title: 'Stock in every depot',
      body: 'What is on hand right now, and what has fallen below its threshold.',
      cta: { label: 'Open stock', to: `${root}/stock` },
    },
    {
      id: 'distributors',
      tone: 'amber',
      icon: ClipboardCheck,
      title: 'Your trading partners',
      body: 'Tier, territory and credit for every distributor account.',
      cta: { label: 'Open distributors', to: `${root}/distributors` },
    },
  ];
}

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
      if (!user || user.role === 'owner') return null;
      return withTimeout(getHomeSummary({ role: user.role, uid: user.id, distributorId: scope }));
    },
    [user?.id, role, scope],
    { handleError: true },
  );

  /* One loader, then the whole screen at once — capped at five seconds, after which the shortcuts are worth more than a wait. */
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

  /** Three, never four — each something the person can act on from the card. */
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
      value: nairaShort(data.overdue || data.outstanding),
      caption: data.overdue
        ? `Past its due date. ${nairaShort(data.outstanding)} outstanding in total.`
        : 'Issued and not yet paid. Nothing is past its due date.',
      icon: <Wallet size={17} />,
      tone: data.overdue ? 'critical' : 'brand',
      progress: data.overdue && data.outstanding ? (data.overdue / data.outstanding) * 100 : undefined,
      action: { label: 'Open invoices', to: `${root}/invoices` },
    };

    if (isPartner(role)) return [orders, money, sellOut];
    if (isOperations(role) && !isAdmin(role)) return [stock, orders, approvals];
    if (isFinance(role) && !isAdmin(role)) return [money, approvals, orders];
    if (role === 'sales_rep') return [orders, sellOut, money];
    return [orders, approvals, money];
  }, [data, role, root]);

  /** What is waiting on this person, read from real records — it ticks itself off. */
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
        title: `${count(data.openOrders)} open order${data.openOrders === 1 ? '' : 's'}`,
        detail: 'Submitted or approved, not yet fulfilled.',
      });
    }

    return items;
  }, [data, role, root]);

  const tips = useMemo(() => (role ? tipsFor(role, root) : []), [role, root]);

  if (!user) return null;
  if (!ready) return <BrandLoader />;

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
        <TipSlides tips={tips} bleed={false} slideClassName="lg:basis-[calc((100%_-_1.5rem)/3)]" />
      </div>

      {cards ? (
        <TipSlides tips={tips} className="mt-auto lg:hidden" />
      ) : (
        <KpiBanners className="mt-auto lg:hidden" items={kpis} failed={failed} onRetry={reload} />
      )}
    </div>
  );
}
