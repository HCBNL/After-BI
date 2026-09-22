/**
 * Pricing: the published plans, and what everyone actually pays.
 *
 * BOTH, AND THAT IS THE POINT
 *
 * A negotiated figure with no price list behind it is a number nobody can
 * explain a year later. A price list nobody may depart from loses deals. So the
 * plan gives the rate, the tenant record overrides it with what was agreed, and
 * this screen shows the gap: which is the number that tells you whether your
 * list price is right.
 */

import { useMemo } from 'react';
import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, DataTable, StatTile, type Column } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { listTenants } from '@/lib/db';
import { naira, nairaShort } from '@/lib/format';
import type { OrgTenant } from '@/lib/tenant';

export default function PricingPage() {
  const { data, loading } = useAsync(() => listTenants(), [], { handleError: true });
  const tenants = data ?? [];

  const summary = useMemo(() => {
    const active = tenants.filter((t) => t.status === 'active');
    const paying = active.filter((t) => (t.subscriptionFee ?? 0) > 0);
    const mrr = active.reduce((sum, t) => sum + (t.subscriptionFee ?? 0), 0);
    return {
      mrr,
      arr: mrr * 12,
      average: paying.length ? mrr / paying.length : 0,
      unpriced: active.length - paying.length,
    };
  }, [tenants]);

  const columns: Column<OrgTenant>[] = [
    {
      key: 'name',
      header: 'Organisation',
      sortValue: (row) => row.name,
      cell: (row) => <span className="text-[13.5px] font-semibold text-primary">{row.name}</span>,
    },
    {
      key: 'seats',
      header: 'Seats',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.seats ?? 0,
      cell: (row) => <span className="tabular text-[13px]">{row.seats ?? 0}</span>,
    },
    {
      key: 'fee',
      header: 'Monthly',
      align: 'right',
      sortValue: (row) => row.subscriptionFee ?? 0,
      cell: (row) =>
        row.subscriptionFee ? (
          <span className="tabular text-[13.5px] font-bold text-primary">
            {naira(row.subscriptionFee)}
          </span>
        ) : (
          <Badge tone="gold">Not priced</Badge>
        ),
    },
    {
      key: 'perSeat',
      header: 'Per seat',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => (row.seats ? (row.subscriptionFee ?? 0) / row.seats : 0),
      cell: (row) =>
        row.seats && row.subscriptionFee ? (
          <span className="tabular text-[13px] text-muted">
            {naira(row.subscriptionFee / row.seats)}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted">Not set</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge tone={row.status === 'active' ? 'good' : row.status === 'trial' ? 'gold' : 'critical'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pricing"
        description="What every organisation on the platform actually pays, and what that averages to."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Monthly" value={nairaShort(summary.mrr)} icon={<Wallet size={16} />} tone="good" />
        <StatTile label="Annualised" value={nairaShort(summary.arr)} hint="Monthly × 12" />
        <StatTile label="Average" value={nairaShort(summary.average)} hint="Per paying organisation" />
        <StatTile
          label="Unpriced"
          value={String(summary.unpriced)}
          tone={summary.unpriced ? 'warning' : 'good'}
          hint={summary.unpriced ? 'Active with no fee set' : 'Every active account is priced'}
        />
      </div>

      <DataTable
        rows={[...tenants].sort((a, b) => (b.subscriptionFee ?? 0) - (a.subscriptionFee ?? 0))}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        emptyIcon={<Wallet size={22} />}
        emptyTitle="No organisations yet"
      />
    </div>
  );
}
