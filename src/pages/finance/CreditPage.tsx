/**
 * Credit limits: what each distributor may owe at once.
 *
 * Sorted by how much of their ceiling they have used, worst first, because the
 * account that is about to breach is the one that needs a decision today. An
 * account with no limit set sorts last and says so: "no limit" is a real
 * state, usually meaning nobody has got round to it, and it should look
 * unfinished rather than safe.
 */

import { useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, DataTable, ProgressBar, StatTile, type Column } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useOrg } from '@/context/OrgContext';
import { creditPosition } from '@/lib/db';
import { naira, nairaShort, percent } from '@/lib/format';
import type { Distributor } from '@/types';

interface Row extends Distributor {
  outstanding: number;
  overdue: number;
  headroom: number | null;
  used: number;
}

export default function CreditPage() {
  const { distributors, loading: loadingOrg } = useOrg();

  const { data, loading } = useAsync(
    async () => {
      const rows = await Promise.all(
        distributors.map(async (d) => {
          const position = await creditPosition(d.id, d.creditLimit);
          return {
            ...d,
            ...position,
            used: d.creditLimit ? (position.outstanding / d.creditLimit) * 100 : -1,
          };
        }),
      );
      return rows.sort((a, b) => b.used - a.used);
    },
    [distributors.map((d) => d.id).join('|')],
    { handleError: true },
  );

  const rows = data ?? [];

  const totals = useMemo(
    () => ({
      exposure: rows.reduce((sum, r) => sum + r.outstanding, 0),
      overdue: rows.reduce((sum, r) => sum + r.overdue, 0),
      breached: rows.filter((r) => r.headroom !== null && r.headroom < 0).length,
    }),
    [rows],
  );

  const columns: Column<Row>[] = [
    {
      key: 'company',
      header: 'Distributor',
      sortValue: (row) => row.company,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-primary">{row.company}</p>
          <p className="truncate text-[12px] text-muted">{row.location ?? row.category}</p>
        </div>
      ),
    },
    {
      key: 'limit',
      header: 'Limit',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.creditLimit ?? 0,
      cell: (row) =>
        row.creditLimit !== undefined ? (
          <span className="tabular text-[13px] text-secondary">{naira(row.creditLimit)}</span>
        ) : (
          <span className="text-[11.5px] text-muted">not set</span>
        ),
    },
    {
      key: 'outstanding',
      header: 'Owing',
      align: 'right',
      sortValue: (row) => row.outstanding,
      cell: (row) => (
        <div>
          <p className="tabular text-[13.5px] font-bold text-primary">{naira(row.outstanding)}</p>
          {row.overdue > 0 && (
            <p className="tabular text-[11.5px] font-semibold text-status-critical">
              {naira(row.overdue)} late
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'used',
      header: 'Ceiling used',
      width: '180px',
      sortValue: (row) => row.used,
      cell: (row) =>
        row.creditLimit === undefined ? (
          <Badge tone="neutral">No limit set</Badge>
        ) : (
          <div>
            <ProgressBar
              value={Math.min(100, row.used)}
              tone={row.used >= 100 ? 'critical' : row.used >= 80 ? 'gold' : 'good'}
            />
            <p className="tabular mt-1 text-[11.5px] text-muted">{percent(row.used)}</p>
          </div>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Credit limits"
        description="What each distributor may owe at once, and who is against their ceiling."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Total exposure" value={nairaShort(totals.exposure)} icon={<CreditCard size={16} />} />
        <StatTile label="Overdue" value={nairaShort(totals.overdue)} tone={totals.overdue ? 'critical' : 'good'} />
        <StatTile
          label="Over their limit"
          value={String(totals.breached)}
          tone={totals.breached ? 'critical' : 'good'}
          hint={totals.breached ? 'Needs a decision' : 'Everybody is inside'}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading || loadingOrg}
        emptyIcon={<CreditCard size={22} />}
        emptyTitle="No distributors yet"
        emptyDescription="Credit limits are set on the distributor record."
      />
    </div>
  );
}
