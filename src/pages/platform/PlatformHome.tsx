/**
 * The platform's own home.
 *
 * Same shape as every tenant's: three numbers and the tile grid. The numbers
 * are the only honest ones a SaaS dashboard can show — how many customers, how
 * many are paying, and what they pay — because every figure in them was typed
 * by the person it is owed to rather than derived from a price list nobody
 * departs from. See `subscriptionFee` in `lib/tenant.ts`.
 */

import { useMemo } from 'react';
import { Building2, TrendingUp, Wallet } from 'lucide-react';
import { HomeKpis, type Kpi } from '@/components/home/HomeKpis';
import { Shortcuts } from '@/components/home/Shortcuts';
import { useAsync } from '@/hooks/useAsync';
import { listTenants } from '@/lib/db';
import { nairaShort, count } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';

export default function PlatformHome() {
  const root = PORTAL_ROOT.owner;
  const { data, error, reload } = useAsync(() => listTenants(), [], { handleError: true });

  const kpis = useMemo<Kpi[]>(() => {
    if (!data) return [];

    const active = data.filter((t) => t.status === 'active');
    const trialing = data.filter((t) => t.status === 'trial');
    const atRisk = data.filter((t) => t.status === 'past-due' || t.status === 'suspended');
    const mrr = active.reduce((sum, t) => sum + (t.subscriptionFee ?? 0), 0);

    return [
      {
        key: 'orgs',
        label: 'Organisations',
        value: count(data.length),
        caption: `${count(active.length)} active, ${count(trialing.length)} on trial.`,
        icon: <Building2 size={17} />,
        action: { label: 'Open the list', to: `${root}/organisations` },
      },
      {
        key: 'revenue',
        label: 'Monthly revenue',
        value: nairaShort(mrr),
        caption: 'Summed from what each active organisation actually pays.',
        icon: <Wallet size={17} />,
        tone: 'good',
        secondary: { label: 'Pricing', to: `${root}/pricing` },
      },
      {
        key: 'risk',
        label: 'Needs attention',
        value: count(atRisk.length),
        caption: atRisk.length
          ? 'Past due or suspended. Every one is a conversation.'
          : 'Nobody is past due.',
        icon: <TrendingUp size={17} />,
        tone: atRisk.length ? 'critical' : 'good',
        action: atRisk.length ? { label: 'See who', to: `${root}/organisations` } : undefined,
      },
    ];
  }, [data, root]);

  return (
    <div className="space-y-5">
      <HomeKpis items={kpis} placeholders={3} failed={Boolean(error)} onRetry={reload} />
      <Shortcuts role="owner" />
    </div>
  );
}
