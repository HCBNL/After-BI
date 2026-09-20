/**
 * The platform's own home — the same screen every tenant gets, counting
 * organisations instead of orders. Every naira in the revenue figure was typed
 * by the owner on the organisation it is owed by.
 */
import { useMemo } from 'react';
import { AlertCircle, Building2, Plus, TrendingUp, Wallet } from 'lucide-react';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { DeskHero, DeskShortcuts, MonthCard } from '@/components/home/HomeDesk';
import { HomeHero } from '@/components/home/HomeHero';
import type { Kpi } from '@/components/home/HomeKpis';
import { KpiBannerGrid, KpiBanners, TipSlides, type Tip } from '@/components/home/HomeSlides';
import { QuickList } from '@/components/home/QuickList';
import { TodoCard, type TodoItem } from '@/components/home/TodoCard';
import { useShell } from '@/components/layout/ShellContext';
import { useAsync } from '@/hooks/useAsync';
import { useHomeLayout } from '@/hooks/useHomeLayout';
import { useAuth } from '@/context/AuthContext';
import { listTenants } from '@/lib/db';
import { count, nairaShort } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';

const ROOT = PORTAL_ROOT.owner;

const TIPS: Tip[] = [
  {
    id: 'new-org',
    tone: 'brand',
    icon: Plus,
    title: 'Add an organisation and its first admin',
    body: 'One form. You get the sign-in details to hand over; nothing is emailed.',
    cta: { label: 'New organisation', to: `${ROOT}/organisations?new=1` },
  },
  {
    id: 'pricing',
    tone: 'ink',
    icon: Wallet,
    title: 'Set what each organisation pays',
    body: 'The monthly figure on this screen is the sum of what you typed on each one.',
    cta: { label: 'Open pricing', to: `${ROOT}/pricing` },
  },
  {
    id: 'suspend',
    tone: 'amber',
    icon: AlertCircle,
    title: 'Suspending closes the portal',
    body: 'Everyone in a suspended organisation is signed out. Their data stays exactly as it was.',
    cta: { label: 'Open organisations', to: `${ROOT}/organisations` },
  },
];

export default function PlatformHome() {
  const { user } = useAuth();
  const [layout] = useHomeLayout(user?.id);
  const { openMenu } = useShell();
  const { data, loading, error, reload } = useAsync(() => listTenants(), [], { handleError: true });

  const summary = useMemo(() => {
    const all = data ?? [];
    const active = all.filter((t) => t.status === 'active');
    const trial = all.filter((t) => t.status === 'trial');
    const atRisk = all.filter((t) => t.status === 'past-due' || t.status === 'suspended');
    const unpriced = active.filter((t) => !(t.subscriptionFee ?? 0));
    const mrr = active.reduce((sum, t) => sum + (t.subscriptionFee ?? 0), 0);
    return { all, active, trial, atRisk, unpriced, mrr };
  }, [data]);

  const kpis = useMemo<Kpi[]>(() => {
    if (!data) return [];
    return [
      {
        key: 'orgs',
        label: 'Organisations',
        value: count(summary.all.length),
        caption: `${count(summary.active.length)} active, ${count(summary.trial.length)} on trial.`,
        icon: <Building2 size={17} />,
        action: { label: '+ New organisation', to: `${ROOT}/organisations?new=1` },
        secondary: { label: 'View all', to: `${ROOT}/organisations` },
      },
      {
        key: 'revenue',
        label: 'Monthly revenue',
        value: nairaShort(summary.mrr),
        caption: 'Summed from what each active organisation pays.',
        icon: <Wallet size={17} />,
        tone: 'good',
        secondary: { label: 'Pricing', to: `${ROOT}/pricing` },
      },
      {
        key: 'risk',
        label: 'Needs attention',
        value: count(summary.atRisk.length),
        caption: summary.atRisk.length ? 'Past due or suspended. Every one is a conversation.' : 'Nobody is past due.',
        icon: <TrendingUp size={17} />,
        tone: summary.atRisk.length ? 'critical' : 'good',
        action: summary.atRisk.length ? { label: 'See who', to: `${ROOT}/organisations` } : undefined,
      },
    ];
  }, [data, summary]);

  const todo = useMemo<TodoItem[]>(() => {
    if (!data) return [];
    const items: TodoItem[] = [];
    items.push(
      summary.all.length
        ? {
            id: 'first-org',
            state: 'done',
            icon: Building2,
            to: `${ROOT}/organisations`,
            title: 'Organisations set up',
            detail: `${count(summary.all.length)} on the platform.`,
          }
        : {
            id: 'first-org',
            state: 'todo',
            icon: Building2,
            to: `${ROOT}/organisations?new=1`,
            title: 'Create your first organisation',
            detail: 'Name it, then add its first administrator in the same form.',
          },
    );
    if (summary.atRisk.length) {
      items.push({
        id: 'at-risk',
        state: 'todo',
        icon: AlertCircle,
        to: `${ROOT}/organisations`,
        count: summary.atRisk.length,
        title: 'Past due or suspended',
        detail: 'Organisations that need a conversation.',
      });
    }
    if (summary.unpriced.length) {
      items.push({
        id: 'unpriced',
        state: 'todo',
        icon: Wallet,
        to: `${ROOT}/pricing`,
        count: summary.unpriced.length,
        title: 'Active with no fee set',
        detail: 'Set what they pay so the revenue figure is real.',
      });
    }
    if (summary.trial.length) {
      items.push({
        id: 'trial',
        state: 'info',
        icon: TrendingUp,
        to: `${ROOT}/organisations`,
        title: `${count(summary.trial.length)} on trial`,
        detail: 'Switch them to active when they start paying.',
      });
    }
    return items;
  }, [data, summary]);

  if (!user) return null;
  if (loading && data === undefined) return <BrandLoader />;

  const cards = layout === 'cards';
  const failed = Boolean(error);
  const orgName = 'AfterBI platform';

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
        {cards ? <DeskShortcuts role="owner" /> : <KpiBannerGrid items={kpis} failed={failed} onRetry={reload} />}
      </div>

      {cards && <QuickList role="owner" onMore={() => openMenu()} className="lg:hidden" />}

      <TodoCard className="lg:col-span-8 lg:self-stretch" items={todo} failed={failed} onRetry={reload} />
      <div className="hidden lg:col-span-4 lg:flex lg:self-stretch">
        <MonthCard footnote={`Monthly revenue ${nairaShort(summary.mrr)}`} />
      </div>

      <div className="hidden lg:col-span-12 lg:block">
        <TipSlides tips={TIPS} bleed={false} slideClassName="lg:basis-[calc((100%_-_1.5rem)/3)]" />
      </div>

      {cards ? (
        <TipSlides tips={TIPS} className="mt-auto lg:hidden" />
      ) : (
        <KpiBanners className="mt-auto lg:hidden" items={kpis} failed={failed} onRetry={reload} />
      )}
    </div>
  );
}
