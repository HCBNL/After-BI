/**
 * Scorecards — everybody against target, ranked.
 *
 * The one screen in the app whose only job is comparison, so it is the one
 * screen that is allowed to rank people. It exists for the monthly pack, and it
 * is deliberately restricted to administrators and operations: a ranking table
 * visible to the people being ranked changes what the numbers get used for.
 */

import { useMemo, useState } from 'react';
import { LineChart } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, DataTable, SegmentedControl, type Column } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { listSales, listTargets } from '@/lib/db';
import { monthKey, naira, percent, count } from '@/lib/format';

interface Row {
  id: string;
  name: string;
  achieved: number;
  target: number;
  progress: number;
  orders: number;
}

export default function ScorecardsPage() {
  const [period, setPeriod] = useState(monthKey());
  const [dimension, setDimension] = useState<'distributor' | 'rep'>('distributor');

  const { data, loading } = useAsync(
    async () => {
      const [targets, sales] = await Promise.all([
        listTargets(period),
        listSales({ from: `${period}-01`, to: `${period}-31`, max: 2000 }),
      ]);
      return { targets, sales };
    },
    [period],
    { handleError: true },
  );

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];

    const key = dimension === 'distributor' ? 'distributorId' : 'capturedBy';
    const nameKey = dimension === 'distributor' ? 'distributorName' : 'capturedByName';

    const agg = new Map<string, { name: string; achieved: number; orders: number }>();
    for (const sale of data.sales) {
      const id = sale[key] as string;
      const current = agg.get(id) ?? { name: sale[nameKey] as string, achieved: 0, orders: 0 };
      current.achieved += sale.total;
      current.orders += 1;
      agg.set(id, current);
    }

    const targetFor = new Map(data.targets.map((t) => [t.ownerId, t.value]));

    return [...agg.entries()]
      .map(([id, value]) => {
        const target = targetFor.get(id) ?? 0;
        return {
          id,
          name: value.name,
          achieved: value.achieved,
          target,
          progress: target > 0 ? (value.achieved / target) * 100 : 0,
          orders: value.orders,
        };
      })
      /* Ranked by money, not by percentage. A distributor on 140% of a ₦2m
         target has not out-performed one on 90% of ₦40m, and sorting by
         attainment puts the small one at the top of the board every month. */
      .sort((a, b) => b.achieved - a.achieved);
  }, [data, dimension]);

  const periods = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 4; i += 1) {
      out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    return out;
  }, []);

  const columns: Column<Row>[] = [
    {
      key: 'rank',
      header: '#',
      width: '48px',
      cell: (_row, index) => (
        <span className="tabular text-[13px] font-bold text-muted">{index + 1}</span>
      ),
    },
    {
      key: 'name',
      header: dimension === 'distributor' ? 'Distributor' : 'Rep',
      sortValue: (row) => row.name,
      cell: (row) => <span className="text-[13.5px] font-semibold text-primary">{row.name}</span>,
    },
    {
      key: 'achieved',
      header: 'Sell-out',
      align: 'right',
      sortValue: (row) => row.achieved,
      cell: (row) => (
        <span className="tabular text-[13.5px] font-bold text-primary">{naira(row.achieved)}</span>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.target,
      cell: (row) => (
        <span className="tabular text-[13px] text-muted">{row.target ? naira(row.target) : '—'}</span>
      ),
    },
    {
      key: 'progress',
      header: 'Attainment',
      align: 'right',
      sortValue: (row) => row.progress,
      cell: (row) =>
        row.target ? (
          <Badge tone={row.progress >= 100 ? 'good' : row.progress >= 75 ? 'gold' : 'critical'}>
            {percent(row.progress)}
          </Badge>
        ) : (
          <span className="text-[11.5px] text-muted">no target</span>
        ),
    },
    {
      key: 'lines',
      header: 'Sales keyed',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.orders,
      cell: (row) => <span className="tabular text-[13px] text-muted">{count(row.orders)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Scorecards"
        description="Every rep and every distributor against target, ranked by value, for the monthly pack."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            size="sm"
            value={dimension}
            onChange={setDimension}
            options={[
              { value: 'distributor', label: 'Distributors' },
              { value: 'rep', label: 'Reps' },
            ]}
          />
          <SegmentedControl
            size="sm"
            value={period}
            onChange={setPeriod}
            options={periods.map((p) => ({ value: p, label: p }))}
          />
        </div>
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        emptyIcon={<LineChart size={22} />}
        emptyTitle="Nothing recorded in this period"
        emptyDescription="Scorecards are built from sell-out. Nothing has been keyed for this month yet."
      />
    </div>
  );
}
