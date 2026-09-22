/**
 * Analytics: what sold, who bought it, and where the country is covered.
 *
 * Deliberately small. Every figure is worked out in the browser from lists
 * the app already reads (sell-out, orders, distributors, people), so there is
 * no reporting pipeline to keep alive and no new index to create. The period
 * and the state at the top filter everything below them at once.
 */
import { useMemo, useState } from 'react';
import { BarChart3, MapPin, ShoppingCart, TrendingUp } from 'lucide-react';
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader';
import { Badge, SegmentedControl, StatTile } from '@/components/ui';
import { StateSelect } from '@/components/StateSelect';
import { BrandLoader } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { useOrg } from '@/context/OrgContext';
import { listMembers, listOrders, listSales } from '@/lib/db';
import { count, naira, nairaShort, todayISO } from '@/lib/format';
import { NIGERIAN_STATES, ZONE_OF } from '@/data/states';
import type { Sale } from '@/types';

const WINDOWS = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
];

/** The last n months, oldest first, as the keys sell-out dates carry. */
function recentMonths(n: number): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(date),
    };
  });
}

function ranked(rows: Sale[], id: (sale: Sale) => string, name: (sale: Sale) => string) {
  const map = new Map<string, { name: string; value: number }>();
  for (const sale of rows) {
    const key = id(sale);
    if (!key) continue;
    const held = map.get(key);
    if (held) held.value += sale.total;
    else map.set(key, { name: name(sale), value: sale.total });
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

function BarList({ items, empty }: { items: { name: string; value: number }[]; empty: string }) {
  const top = items.slice(0, 5);
  const max = top[0]?.value ?? 0;
  if (!top.length) return <p className="text-[13px] text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {top.map((item) => (
        <li key={item.name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-semibold text-primary">{item.name}</span>
            <span className="tabular shrink-0 text-[12.5px] text-secondary">{nairaShort(item.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full surface-sunken">
            <div
              className="h-full rounded-full bg-brand-600 dark:bg-brand-500"
              style={{ width: `${max ? (item.value / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-hairline surface-card p-5 shadow-card ${className ?? ''}`}>
      {children}
    </section>
  );
}

export default function AnalyticsPage() {
  const { distributors } = useOrg();
  const [window, setWindow] = useState('6');
  const [state, setState] = useState('');

  const months = Number(window);
  const { data, loading } = useAsync(
    async () => {
      const first = new Date();
      first.setUTCMonth(first.getUTCMonth() - (months - 1), 1);
      const from = first.toISOString().slice(0, 10);
      const [sales, orders, members] = await Promise.all([
        listSales({ from, to: todayISO(), max: 4000 }),
        listOrders({ max: 400 }),
        listMembers(),
      ]);
      return { sales, orders, members };
    },
    [months],
    { handleError: true },
  );

  /* Which state each account sits in, so sell-out can be read by state. */
  const stateOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of distributors) map.set(d.id, (d.location ?? '').trim());
    return map;
  }, [distributors]);

  const inState = (distributorId: string) => !state || stateOf.get(distributorId) === state;

  const sales = useMemo(() => (data?.sales ?? []).filter((s) => inState(s.distributorId)), [data, state, stateOf]);
  const orders = useMemo(
    () => (data?.orders ?? []).filter((o) => inState(o.distributorId)),
    [data, state, stateOf],
  );
  const accounts = useMemo(
    () => distributors.filter((d) => (!state || (d.location ?? '').trim() === state) && d.status === 'active'),
    [distributors, state],
  );

  const sellOut = sales.reduce((sum, s) => sum + s.total, 0);
  const ordered = orders.reduce((sum, o) => sum + o.total, 0);

  const monthly = useMemo(() => {
    const buckets = new Map(recentMonths(months).map((m) => [m.key, { ...m, value: 0 }]));
    for (const sale of sales) {
      const bucket = buckets.get((sale.saleDate ?? '').slice(0, 7));
      if (bucket) bucket.value += sale.total;
    }
    return [...buckets.values()];
  }, [sales, months]);
  const peak = Math.max(...monthly.map((m) => m.value), 1);

  const byProduct = useMemo(() => ranked(sales, (s) => s.productId, (s) => s.productName), [sales]);
  const byAccount = useMemo(() => ranked(sales, (s) => s.distributorId, (s) => s.distributorName), [sales]);
  const byPerson = useMemo(() => ranked(sales, (s) => s.capturedByName, (s) => s.capturedByName), [sales]);
  const byZone = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    for (const sale of sales) {
      const zone = ZONE_OF[stateOf.get(sale.distributorId) ?? ''] ?? 'Unplaced';
      const held = map.get(zone);
      if (held) held.value += sale.total;
      else map.set(zone, { name: zone, value: sale.total });
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [sales, stateOf]);

  /* Coverage: who is where, and the states nobody is in. */
  const coverage = useMemo(() => {
    const reps = new Map<string, string[]>();
    for (const member of data?.members ?? []) {
      if (member.role !== 'sales_rep' || member.active === false) continue;
      for (const territory of member.territories ?? []) {
        reps.set(territory, [...(reps.get(territory) ?? []), member.firstName]);
      }
    }
    const value = new Map<string, number>();
    for (const sale of sales) {
      const where = stateOf.get(sale.distributorId) ?? '';
      if (where) value.set(where, (value.get(where) ?? 0) + sale.total);
    }
    return NIGERIAN_STATES.map((name) => ({
      state: name,
      accounts: distributors.filter((d) => (d.location ?? '').trim() === name),
      reps: reps.get(name) ?? [],
      value: value.get(name) ?? 0,
    }));
  }, [data, distributors, sales, stateOf]);

  const covered = coverage.filter((row) => row.accounts.length > 0).sort((a, b) => b.value - a.value);
  const empty = coverage.filter((row) => row.accounts.length === 0);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Sell-out by month, the lines and accounts carrying it, and who covers where."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl size="sm" value={window} onChange={setWindow} options={WINDOWS} />
          <StateSelect
            value={state}
            onChange={setState}
            placeholder="Every state"
            className="max-w-[220px]"
          />
        </div>
      </PageHeader>

      {loading && !data ? (
        <BrandLoader label="Working out the numbers" />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Sell-out" value={nairaShort(sellOut)} icon={<TrendingUp size={16} />} tone="good" />
            <StatTile label="Ordered" value={nairaShort(ordered)} icon={<ShoppingCart size={16} />} />
            <StatTile label="Active accounts" value={count(accounts.length)} icon={<BarChart3 size={16} />} />
            <StatTile
              label="States covered"
              value={count(covered.length)}
              icon={<MapPin size={16} />}
              tone={covered.length ? 'good' : 'warning'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Sell-out by month" description="What left the shelves, keyed against each month." />
              <div className="flex h-44 items-end gap-2">
                {monthly.map((month) => (
                  <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="tabular text-[10.5px] text-muted">
                      {month.value ? nairaShort(month.value) : ''}
                    </span>
                    <div
                      title={naira(month.value)}
                      className="w-full rounded-t-lg bg-brand-600 transition-[height] duration-300 dark:bg-brand-500"
                      style={{ height: `${Math.max((month.value / peak) * 100, month.value ? 4 : 1)}%` }}
                    />
                    <span className="text-[11px] text-muted">{month.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle title="Top products" description="By the value of sell-out in this period." />
              <BarList items={byProduct} empty="No sell-out keyed in this period." />
            </Card>

            <Card>
              <SectionTitle title="Top accounts" description="The distributors carrying the month." />
              <BarList items={byAccount} empty="No sell-out keyed in this period." />
            </Card>

            <Card>
              <SectionTitle title="By zone" description="Where the country is buying." />
              <BarList items={byZone} empty="No sell-out keyed in this period." />
            </Card>

            <Card className="lg:col-span-2">
              <SectionTitle title="Who keyed it" description="Sell-out recorded per person, this period." />
              <BarList items={byPerson} empty="Nobody has keyed sell-out in this period." />
            </Card>
          </div>

          {empty.length > 0 && (
            <section className="mt-6">
              <SectionTitle
                title="No distributor yet"
                description="States with nobody buying from you. Each one is a conversation."
              />
              <div className="flex flex-wrap gap-1.5 rounded-2xl border border-hairline surface-card p-4 shadow-card">
                {empty.map((row) => (
                  <span
                    key={row.state}
                    className="rounded-lg bg-[var(--surface-sunken)] px-2.5 py-1 text-[12px] text-secondary"
                  >
                    {row.state}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            <SectionTitle title="Covered" description="Accounts, the reps on them, and what they sold." />
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {covered.map((row) => (
                <li key={row.state} className="rounded-2xl border border-hairline surface-card p-4 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-bold text-primary">{row.state}</p>
                    <Badge tone="brand">{count(row.accounts.length)}</Badge>
                  </div>
                  <p className="tabular mt-1 text-[12.5px] font-semibold text-secondary">{nairaShort(row.value)}</p>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-muted">
                    {row.accounts.map((d) => d.company).join(', ')}
                  </p>
                  {row.reps.length > 0 && (
                    <p className="mt-1.5 text-[11.5px] text-secondary">Rep: {row.reps.join(', ')}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
