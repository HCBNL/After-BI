/**
 * Sales analytics: the head of sales' report, on one screen.
 *
 * Revenue by salesperson, customer, channel, location and product category,
 * for a period, against the period before it. A real map of Nigeria on a
 * laptop: click a state and everything on the screen narrows to it. Every
 * table exports to a spreadsheet for the monthly pack.
 *
 * Light by design: one read for the period (orders or sell-out), one for the
 * team, and the rest is arithmetic in the browser (`lib/salesAnalytics.ts`).
 * The map's outlines are fetched only on a screen wide enough to show them.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Download, MapPin, PhoneCall, Users, Wallet, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, SegmentedControl, Select, StatTile } from '@/components/ui';
import { BrandLoader } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { useOrg } from '@/context/OrgContext';
import { listMembers, listOrdersSince, listSales } from '@/lib/db';
import { formatDate, naira, nairaShort } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  applyFilters,
  breakdown,
  DIMENSION_LABEL,
  downloadCsv,
  factsFrom,
  inPeriod,
  lapsed,
  periodFor,
  PERIODS,
  stateOf,
  summarise,
  type Dimension,
  type Filters,
  type PeriodKey,
  type Row,
  type Source,
} from '@/lib/salesAnalytics';
import { TIER_LABEL } from '@/types';

const NigeriaMap = lazy(() => import('@/components/analytics/NigeriaMap'));

const SOURCES: { value: Source; label: string }[] = [
  { value: 'sell-in', label: 'Sell-in (orders)' },
  { value: 'sell-out', label: 'Sell-out' },
];

const TABS: Dimension[] = ['rep', 'customer', 'channel', 'zone', 'state', 'category', 'product'];

/** Dimensions a click can filter by. */
const FILTERABLE: Partial<Record<Dimension, keyof Filters>> = { rep: 'rep', channel: 'channel', state: 'state' };

function useWide(): boolean {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const on = () => setWide(list.matches);
    list.addEventListener('change', on);
    return () => list.removeEventListener('change', on);
  }, []);
  return wide;
}

function Growth({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[12px] text-muted">New</span>;
  const up = value >= 0;
  return (
    <span className={cn('tabular text-[12.5px] font-semibold', up ? 'text-status-good' : 'text-status-critical')}>
      {up ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-hairline surface-card p-5 shadow-card', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Bars({ rows: all, onPick, empty }: { rows: Row[]; onPick?: (key: string) => void; empty: string }) {
  /* Only what sold in this period; the table below shows what stopped. */
  const rows = all.filter((row) => row.revenue > 0);
  if (!rows.length) return <p className="text-[13px] text-muted">{empty}</p>;
  const max = rows[0]?.revenue || 1;
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <button
            type="button"
            disabled={!onPick}
            onClick={() => onPick?.(row.key)}
            className="w-full text-left disabled:cursor-default"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] font-semibold text-primary">{row.key}</span>
              <span className="tabular shrink-0 text-[12.5px] text-secondary">
                {nairaShort(row.revenue)} <span className="text-muted">· {row.share.toFixed(0)}%</span>
              </span>
            </span>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full surface-sunken">
              <span className="block h-full rounded-full bg-brand-600 dark:bg-brand-500" style={{ width: `${(row.revenue / max) * 100}%` }} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const { distributors, products } = useOrg();
  const wide = useWide();
  const [source, setSource] = useState<Source>('sell-in');
  const [periodKey, setPeriodKey] = useState<PeriodKey>('this-month');
  const [filters, setFilters] = useState<Filters>({});
  const [tab, setTab] = useState<Dimension>('rep');
  const [showAll, setShowAll] = useState(false);

  const period = useMemo(() => periodFor(periodKey), [periodKey]);
  const single = period.from === period.to;

  const { data: members } = useAsync(() => listMembers(), [], { handleError: true });
  const { data, loading, error } = useAsync(
    async () =>
      source === 'sell-in'
        ? { orders: await listOrdersSince(period.prevFrom), sales: [] }
        : { orders: [], sales: await listSales({ from: period.prevFrom, to: period.to, max: 8000 }) },
    [source, period.prevFrom, period.to],
    { handleError: true },
  );

  const facts = useMemo(
    () => (data ? factsFrom(source, data.orders, data.sales, { distributors, products, members: members ?? [] }) : []),
    [data, source, distributors, products, members],
  );

  /* The period and the one before, before and after the filters. */
  const allNow = useMemo(() => facts.filter((f) => inPeriod(f, period.from, period.to)), [facts, period]);
  const allBefore = useMemo(() => facts.filter((f) => inPeriod(f, period.prevFrom, period.prevTo)), [facts, period]);
  const now = useMemo(() => applyFilters(allNow, filters), [allNow, filters]);
  const before = useMemo(() => applyFilters(allBefore, filters), [allBefore, filters]);

  /* The map is shaded by everything but the state filter, so the other states stay visible. */
  const byState = useMemo(() => {
    const rows = breakdown(applyFilters(allNow, { ...filters, state: undefined }), [], 'state');
    return new Map(rows.map((r) => [r.key, r.revenue]));
  }, [allNow, filters]);

  const accountsInScope = useMemo(
    () =>
      distributors.filter(
        (d) =>
          d.status === 'active' &&
          (!filters.channel || TIER_LABEL[d.category] === filters.channel) &&
          (!filters.state || stateOf(d.location) === filters.state),
      ).length,
    [distributors, filters],
  );

  const summary = useMemo(() => summarise(now, before, accountsInScope), [now, before, accountsInScope]);
  const rows = useMemo(() => breakdown(now, before, tab), [now, before, tab]);
  const channels = useMemo(() => breakdown(now, before, 'channel'), [now, before]);
  const categories = useMemo(() => breakdown(now, before, 'category'), [now, before]);
  const toCall = useMemo(() => lapsed(now, before).slice(0, 8), [now, before]);

  const repOptions = useMemo(() => [...new Set(allNow.concat(allBefore).map((f) => f.rep))].sort(), [allNow, allBefore]);
  const stateRows = useMemo(() => breakdown(applyFilters(allNow, { ...filters, state: undefined }), [], 'state'), [allNow, filters]);

  /* For the selected state: the reps assigned to cover it, and active accounts there that bought nothing. */
  const coverage = useMemo(() => {
    if (!filters.state) return null;
    const state = filters.state;
    const reps = (members ?? [])
      .filter((m) => m.role === 'sales_rep' && m.active !== false && (m.territories ?? []).includes(state))
      .map((m) => `${m.firstName} ${m.lastName}`.trim());
    const buying = new Set(now.map((f) => f.customerId));
    const idle = distributors.filter((d) => d.status === 'active' && stateOf(d.location) === state && !buying.has(d.id));
    return { reps, idle };
  }, [filters.state, members, now, distributors]);

  const setFilter = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value || undefined }));
  const pick = (dim: Dimension) => {
    const key = FILTERABLE[dim];
    return key ? (value: string) => setFilter(key, value) : undefined;
  };

  const active = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  const visible = showAll ? rows : rows.slice(0, 12);
  const sourceLabel = source === 'sell-in' ? 'sell-in' : 'sell-out';

  return (
    <div>
      <PageHeader
        title="Sales analytics"
        description={
          single
            ? `${period.label}, ${formatDate(period.from)}, against ${formatDate(period.prevFrom)}.`
            : `${period.label}: ${formatDate(period.from)} to ${formatDate(period.to)}, against ${formatDate(period.prevFrom)} to ${formatDate(period.prevTo)}.`
        }
      >
        <div className="flex flex-wrap gap-2">
          <SegmentedControl size="sm" value={source} onChange={setSource} options={SOURCES} />
          <SegmentedControl size="sm" value={periodKey} onChange={setPeriodKey} options={PERIODS} />
        </div>
      </PageHeader>

      {/* ---------------------------------------------------------- filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Select value={filters.rep ?? ''} onChange={(e) => setFilter('rep', e.target.value)} className="w-auto min-w-[11rem]" aria-label="Salesperson">
          <option value="">All salespeople</option>
          {repOptions.map((rep) => (
            <option key={rep} value={rep}>
              {rep}
            </option>
          ))}
        </Select>
        <Select value={filters.channel ?? ''} onChange={(e) => setFilter('channel', e.target.value)} className="w-auto min-w-[10rem]" aria-label="Channel">
          <option value="">All channels</option>
          {Object.values(TIER_LABEL).map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </Select>
        <Select value={filters.state ?? ''} onChange={(e) => setFilter('state', e.target.value)} className="w-auto min-w-[9rem]" aria-label="State">
          <option value="">All states</option>
          {[...byState.keys()].sort().map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </Select>
        {active.length > 0 && (
          <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => setFilters({})}>
            Clear filters
          </Button>
        )}
      </div>

      {error ? (
        <p className="rounded-2xl border border-hairline surface-card p-6 text-[13.5px] text-secondary shadow-card">
          The figures could not be read. Check the connection and reload.
        </p>
      ) : loading && !data ? (
        <BrandLoader label="Working out the numbers" />
      ) : (
        <div className="space-y-5">
          {/* --------------------------------------------------------- KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={`Revenue (${sourceLabel})`}
              value={nairaShort(summary.revenue)}
              hint={summary.growth === null ? 'Nothing in the previous period' : `${summary.growth >= 0 ? '+' : ''}${summary.growth.toFixed(1)}% on the previous period`}
              icon={<Wallet size={17} />}
              tone={summary.growth !== null && summary.growth < 0 ? 'warning' : 'good'}
            />
            <StatTile
              label="Customers buying"
              value={`${summary.buying} of ${summary.accounts}`}
              hint={summary.accounts ? `${Math.round((summary.buying / summary.accounts) * 100)}% of active accounts` : 'No active accounts in scope'}
              icon={<Users size={17} />}
            />
            <StatTile label="Revenue per customer" value={nairaShort(summary.perCustomer)} hint="Among customers who bought" icon={<Wallet size={17} />} tone="info" />
            <StatTile
              label="Customers to win back"
              value={String(lapsed(now, before).length)}
              hint="Bought last period, nothing this one"
              icon={<PhoneCall size={17} />}
              tone={toCall.length ? 'warning' : 'good'}
            />
          </div>

          {/* ------------------------------------------------ the territory */}
          <div className="grid gap-5 lg:grid-cols-12">
            <Panel
              title="Territory"
              className="lg:col-span-7"
              action={
                filters.state ? (
                  <Button variant="outline" size="sm" icon={<X size={14} />} onClick={() => setFilter('state', '')}>
                    {filters.state}
                  </Button>
                ) : (
                  <span className="text-[12px] text-muted">Click a state to focus the report on it</span>
                )
              }
            >
              {wide ? (
                <Suspense fallback={<div className="aspect-[744/600] w-full animate-pulse rounded-xl surface-sunken" />}>
                  <NigeriaMap values={byState} selected={filters.state ?? ''} onSelect={(s) => setFilter('state', s)} format={naira} />
                </Suspense>
              ) : (
                <>
                  <p className="mb-4 flex items-start gap-2 rounded-xl surface-sunken p-3 text-[12.5px] leading-snug text-secondary">
                    <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden />
                    The map of Nigeria opens on a laptop or desktop. Here, the states are ranked; tap one to focus on it.
                  </p>
                  <Bars rows={stateRows.slice(0, 10)} onPick={(s) => setFilter('state', s)} empty="No revenue in this period." />
                </>
              )}
            </Panel>

            <Panel title={filters.state ? filters.state : 'All of Nigeria'} className="lg:col-span-5">
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl surface-sunken p-3">
                  <dt className="text-[11.5px] text-muted">Revenue</dt>
                  <dd className="tabular mt-0.5 text-[17px] font-bold text-primary">{nairaShort(summary.revenue)}</dd>
                  <dd className="mt-0.5">
                    <Growth value={summary.growth} />
                  </dd>
                </div>
                <div className="rounded-xl surface-sunken p-3">
                  <dt className="text-[11.5px] text-muted">Customers buying</dt>
                  <dd className="tabular mt-0.5 text-[17px] font-bold text-primary">
                    {summary.buying}
                    <span className="text-[13px] font-semibold text-muted"> / {summary.accounts}</span>
                  </dd>
                </div>
              </dl>
              <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Top customers</h3>
              <Bars rows={breakdown(now, before, 'customer').slice(0, 5)} empty="No customer bought in this period." />
              <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Salespeople</h3>
              <Bars rows={breakdown(now, before, 'rep').slice(0, 5)} onPick={pick('rep')} empty="Nobody sold in this period." />
              {coverage && (
                <div className="mt-5 rounded-xl surface-sunken p-3 text-[12.5px] leading-relaxed text-secondary">
                  <p>
                    <span className="font-semibold text-primary">Covering reps: </span>
                    {coverage.reps.length ? coverage.reps.join(', ') : 'nobody is assigned to this state (set it in People).'}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-primary">Active accounts not buying: </span>
                    {coverage.idle.length
                      ? coverage.idle.slice(0, 6).map((d) => d.company).join(', ') + (coverage.idle.length > 6 ? ` and ${coverage.idle.length - 6} more` : '')
                      : 'none. Every active account here bought in this period.'}
                  </p>
                </div>
              )}
            </Panel>
          </div>

          {/* --------------------------------------------------- breakdowns */}
          <Panel
            title={`Revenue by ${DIMENSION_LABEL[tab].toLowerCase()}`}
            action={
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={14} />}
                disabled={!rows.length}
                onClick={() => downloadCsv(`afterbi-${tab}-${period.from}-to-${period.to}`, DIMENSION_LABEL[tab], rows)}
              >
                Export to Excel (CSV)
              </Button>
            }
          >
            <div className="-mx-1 mb-4 overflow-x-auto px-1">
              <SegmentedControl
                size="sm"
                value={tab}
                onChange={(next) => {
                  setTab(next);
                  setShowAll(false);
                }}
                options={TABS.map((d) => ({ value: d, label: DIMENSION_LABEL[d] }))}
              />
            </div>
            {rows.length === 0 ? (
              <p className="text-[13px] text-muted">No {sourceLabel} in this period{active.length ? ' for these filters' : ''}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left">
                  <thead>
                    <tr className="border-b border-hairline text-[11.5px] uppercase tracking-[0.06em] text-muted">
                      <th className="py-2 pr-3 font-semibold">{DIMENSION_LABEL[tab]}</th>
                      <th className="py-2 pr-3 text-right font-semibold">Revenue</th>
                      <th className="w-[28%] py-2 pr-3 font-semibold">Share</th>
                      <th className="py-2 pr-3 text-right font-semibold">vs previous</th>
                      {tab !== 'customer' && tab !== 'product' && <th className="py-2 text-right font-semibold">Customers</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => {
                      const onPick = pick(tab);
                      return (
                        <tr key={row.key} className="border-b border-hairline last:border-0">
                          <td className="max-w-[16rem] py-2.5 pr-3">
                            {onPick ? (
                              <button type="button" onClick={() => onPick(row.key)} className="truncate text-[13.5px] font-semibold text-primary hover:underline">
                                {row.key}
                              </button>
                            ) : (
                              <span className="block truncate text-[13.5px] font-semibold text-primary">{row.key}</span>
                            )}
                          </td>
                          <td className="tabular py-2.5 pr-3 text-right text-[13px] text-primary">{naira(Math.round(row.revenue))}</td>
                          <td className="py-2.5 pr-3">
                            <span className="flex items-center gap-2">
                              <span className="h-2 flex-1 overflow-hidden rounded-full surface-sunken">
                                <span className="block h-full rounded-full bg-brand-600 dark:bg-brand-500" style={{ width: `${row.share}%` }} />
                              </span>
                              <span className="tabular w-14 shrink-0 text-right text-[12px] text-secondary">{row.share.toFixed(1)}%</span>
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <Growth value={row.growth} />
                          </td>
                          {tab !== 'customer' && tab !== 'product' && (
                            <td className="tabular py-2.5 text-right text-[13px] text-secondary">{row.customers}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length > 12 && (
                  <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAll(!showAll)}>
                    {showAll ? 'Show the top 12' : `Show all ${rows.length}`}
                  </Button>
                )}
              </div>
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="By channel">
              <Bars rows={channels} onPick={pick('channel')} empty="No revenue in this period." />
            </Panel>
            <Panel title="By category">
              <Bars rows={categories.slice(0, 6)} empty="No revenue in this period." />
            </Panel>
            <Panel title="Customers to win back">
              {toCall.length === 0 ? (
                <p className="text-[13px] text-muted">Everybody who bought last period has bought again.</p>
              ) : (
                <ul className="space-y-2.5">
                  {toCall.map((c) => (
                    <li key={c.customer} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[13px] font-semibold text-primary">{c.customer}</span>
                      <span className="tabular shrink-0 text-[12px] text-muted">{nairaShort(c.previous)} last period</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
