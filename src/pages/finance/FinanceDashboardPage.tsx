/**
 * Finance dashboard: the business's money at a glance.
 *
 * Not analytics (that is sales: who bought what, where). This answers the
 * finance questions: how much did we bill, how much came in, how much is
 * still owed, how late is it, and who owes it.
 *
 * Laid out on the 60 / 30 / 10 rule (see components/finance/FinanceCards):
 * quiet cards, dark ink, and one bright card in the organisation's colour for
 * the figure that needs chasing, what is owed.
 *
 * Three bounded reads (lib/db: listInvoicesSince, listOpenInvoices,
 * listPaymentsSince); every sum is in lib/financeSummary.ts.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BadgePercent, Clock3, FileText, PieChart, Receipt, RotateCcw, TrendingUp, Users, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { QuietLoader } from '@/components/brand/Loader';
import { Hint } from '@/components/ui';
import {
  AccentArrow,
  AccentBadge,
  AccentCard,
  AccentTile,
  CardHead,
  Change,
  InkLink,
  MeterRow,
  OutlineLink,
  Pill,
  QuietCard,
  Ring,
} from '@/components/finance/FinanceCards';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { listInvoicesSince, listOpenInvoices, listPaymentsSince } from '@/lib/db';
import { change, loadFrom, PERIOD_LABEL, summarise, type Activity, type FinancePeriod } from '@/lib/financeSummary';
import { formatDate, naira, nairaShort } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';
import { cn } from '@/lib/cn';

const PERIODS: FinancePeriod[] = ['month', 'quarter', 'year'];

const COLLECTED_LABEL: Record<FinancePeriod, string> = {
  month: 'Collected this month',
  quarter: 'Collected this quarter',
  year: 'Collected this year',
};

/** What was invoiced and what came off it, as one sentence for each case. */
function invoicedLine(invoiced: number, notes: number, returns: number): string {
  const total = naira(invoiced);
  if (notes > 0 && returns > 0) return `${total} invoiced, less ${naira(notes)} in credit notes and ${naira(returns)} in returns`;
  if (notes > 0) return `${total} invoiced, less ${naira(notes)} in credit notes`;
  if (returns > 0) return `${total} invoiced, less ${naira(returns)} in returns`;
  return `${total} invoiced`;
}

export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const root = user ? PORTAL_ROOT[user.role] : '';
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const from = useMemo(() => loadFrom(period), [period]);

  const { data, loading } = useAsync(
    async () => {
      const [invoices, open, payments] = await Promise.all([listInvoicesSince(from), listOpenInvoices(), listPaymentsSince(from)]);
      return { invoices, open, payments };
    },
    [from],
    { handleError: true, key: from },
  );

  const sum = useMemo(() => (data ? summarise(period, data.invoices, data.open, data.payments) : null), [data, period]);

  return (
    <div>
      <PageHeader title="Finance" description="Invoiced, collected and owed, with who owes it and how late." />

      {loading && !sum ? (
        <QuietLoader label="Adding it up" />
      ) : !sum ? null : (
        <div className="space-y-4">
          {/* row 1: the headline and the one bright card */}
          <div className="grid gap-4 lg:grid-cols-12">
            <QuietCard className="lg:col-span-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div role="group" aria-label="Period" className="inline-flex rounded-full surface-sunken p-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={period === p}
                      onClick={() => setPeriod(p)}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-label font-semibold transition-colors',
                        period === p ? 'surface-card text-primary shadow-sm' : 'text-muted hover:text-primary',
                      )}
                    >
                      {PERIOD_LABEL[p]}
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-caption text-muted">Invoices raised</p>
                  <p className="tabular text-lead font-semibold text-primary">{sum.invoiceCount.toLocaleString('en-NG')}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1.5">
                <p className="text-label text-muted">Net sales</p>
                <Hint label="About net sales">
                  What was invoiced in the period, less credit notes (price adjustments) and credit for returns. The
                  value of what was really sold.
                </Hint>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="tabular font-display text-headline font-bold tracking-[-0.02em] text-primary sm:text-jumbo">{naira(sum.netSales)}</p>
                  <div className="mt-2">
                    <Change value={change(sum.invoiced, sum.invoicedPrev)} label={`${sum.range.previousLabel} (invoiced)`} />
                  </div>
                  <p className="tabular mt-2 text-caption text-muted">
                    {invoicedLine(sum.invoiced, sum.creditNotes, sum.returns)}
                  </p>
                </div>
                {root && <AccentArrow to={`${root}/reports`} label="Open reports" />}
              </div>

              {root && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <InkLink to={`${root}/invoices`} icon={<Receipt size={15} aria-hidden />}>
                    Invoices
                  </InkLink>
                  <OutlineLink to={`${root}/statement`} icon={<FileText size={15} aria-hidden />}>
                    Statements
                  </OutlineLink>
                </div>
              )}
            </QuietCard>

            <AccentCard className="lg:col-span-5">
              <div className="flex items-start justify-between gap-3">
                <AccentBadge icon={<Wallet size={13} aria-hidden />}>Owed to you</AccentBadge>
              </div>
              <p className="mt-5 text-label opacity-80">{`Across ${sum.openCount.toLocaleString('en-NG')} open invoices`}</p>
              <p className="tabular font-display text-headline font-bold tracking-[-0.02em] sm:text-display">{naira(sum.owed)}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <AccentTile
                  label="Overdue"
                  value={nairaShort(sum.overdue)}
                  hint={sum.overdueCount === 1 ? '1 invoice late' : `${sum.overdueCount} invoices late`}
                />
                <AccentTile
                  label={COLLECTED_LABEL[period]}
                  value={nairaShort(sum.collected)}
                  hint={`${sum.collectionRate}% of invoiced`}
                />
              </div>
            </AccentCard>
          </div>

          {/* row 2: collections, ageing, activity */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Collections sum={sum} period={period} />
            <Ageing sum={sum} />
            <RecentActivity items={sum.activity} root={root} />
          </div>

          {/* row 3: six months, and who owes most */}
          <div className="grid gap-4 lg:grid-cols-12">
            <Trend sum={sum} />
            <Debtors sum={sum} root={root} />
          </div>
        </div>
      )}
    </div>
  );
}

type Sum = ReturnType<typeof summarise>;

/* Credits sit between the bright cash and the empty track: a quiet grey. */
const CREDIT_TONE = 'color-mix(in srgb, var(--text-muted) 70%, transparent)';

function Collections({ sum, period }: { sum: Sum; period: FinancePeriod }) {
  const credits = sum.creditNotes + sum.returns;
  const rest = Math.max(0, sum.invoiced - sum.collected - credits);
  const total = Math.max(sum.invoiced, sum.collected + credits);
  return (
    <QuietCard>
      <CardHead icon={<PieChart size={18} aria-hidden />} title="Collected" right={<Pill>{PERIOD_LABEL[period]}</Pill>} />
      <Ring
        total={total}
        parts={[
          { value: sum.collected, color: 'var(--swatch)', label: `Collected ${naira(sum.collected)}` },
          { value: credits, color: CREDIT_TONE, label: `Credits ${naira(credits)}` },
        ]}
      >
        <p className="tabular font-display text-title font-bold text-primary">{nairaShort(sum.collected)}</p>
        <p className="tabular text-caption font-semibold text-muted">{`${sum.collectionRate}% in`}</p>
      </Ring>
      <div className="mt-4 flex justify-center">
        <Change value={change(sum.collected, sum.collectedPrev)} label={sum.range.previousLabel} />
      </div>
      <p className="mx-auto mt-3 w-fit rounded-full border border-hairline px-3 py-1 text-caption text-secondary">
        <BadgePercent size={13} aria-hidden className="mr-1 inline -translate-y-px" />
        {`${sum.collectionRate}% of what was invoiced came in as cash`}</p>
      <dl className="mt-4 space-y-2 text-caption">
        <Legend color="var(--swatch)" label="Cash in" value={naira(sum.collected)} strong />
        <Legend color={CREDIT_TONE} label="Credit notes and returns" value={naira(credits)} />
        <Legend color="var(--surface-sunken)" label="Still to come" value={naira(rest)} />
      </dl>
    </QuietCard>
  );
}

function Legend({ color, label, value, strong = false }: { color: string; label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-[var(--border-hairline)]" style={{ backgroundColor: color }} />
      <dt className={strong ? 'font-semibold text-primary' : 'text-muted'}>{label}</dt>
      <dd className="tabular ml-auto text-secondary">{value}</dd>
    </div>
  );
}

function Ageing({ sum }: { sum: Sum }) {
  const total = sum.owed;
  const late = sum.ageing.slice(1);
  /* The biggest late bucket is the one to chase: it takes the accent. */
  const worst = late.reduce((a, b) => (b.amount > a.amount ? b : a), late[0]);
  return (
    <QuietCard>
      <CardHead
        icon={<Clock3 size={18} aria-hidden />}
        title="Owed by age"
        right={
          <span className="text-right">
            <span className="tabular block text-label font-semibold text-primary">{nairaShort(total)}</span>
            <span aria-hidden className="mt-1 block h-1 w-full rounded-full" style={{ backgroundColor: 'var(--swatch)' }} />
          </span>
        }
      />
      <div className="space-y-4">
        {sum.ageing.map((b) => {
          const share = total > 0 ? (b.amount / total) * 100 : 0;
          const strong = b === worst && b.amount > 0;
          return (
            <MeterRow
              key={b.key}
              label={b.label}
              value={naira(b.amount)}
              share={share}
              strong={strong}
              pill={strong ? `${Math.round(share)}%` : undefined}
            />
          );
        })}
      </div>
      {sum.overdue === 0 && total > 0 && <p className="mt-4 text-caption text-muted">Nothing is late. Every open invoice is still within its terms.</p>}
    </QuietCard>
  );
}

const ACTIVITY_ICON: Record<Activity['kind'], typeof Wallet> = {
  payment: Wallet,
  credit_note: BadgePercent,
  return: RotateCcw,
  invoice: Receipt,
};

function RecentActivity({ items, root }: { items: Activity[]; root: string }) {
  return (
    <QuietCard className="md:col-span-2 xl:col-span-1">
      <CardHead
        icon={<TrendingUp size={18} aria-hidden />}
        title="Latest"
        right={
          root ? (
            <Link to={`${root}/invoices`} aria-label="All invoices" className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-secondary hover:text-primary">
              <ArrowRight size={16} aria-hidden />
            </Link>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <p className="py-6 text-center text-label text-muted">Nothing yet. Invoices and payments show here as they happen.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-hairline)]">
          {items.map((a, i) => {
            const Icon = ACTIVITY_ICON[a.kind];
            const inflow = a.kind === 'payment';
            return (
              <li
                key={a.id}
                className={cn('flex items-center gap-3 py-3', i === 0 && 'rounded-2xl border border-hairline px-3 surface-sunken')}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline"
                  style={inflow ? { backgroundColor: 'var(--swatch)', color: 'var(--swatch-ink)', borderColor: 'transparent' } : undefined}
                >
                  <Icon size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label font-semibold text-primary">{a.title}</p>
                  <p className="truncate text-caption text-muted">
                    {a.detail} · {formatDate(a.date)}
                  </p>
                </div>
                <span className={cn('tabular shrink-0 text-label font-semibold', inflow ? 'text-status-good' : a.kind === 'invoice' ? 'text-primary' : 'text-secondary')}>
                  {inflow ? `+${naira(a.amount)}` : a.kind === 'invoice' ? naira(a.amount) : `(${naira(a.amount)})`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </QuietCard>
  );
}

function Trend({ sum }: { sum: Sum }) {
  const max = Math.max(1, ...sum.trend.flatMap((m) => [m.invoiced, m.collected]));
  return (
    <QuietCard className="lg:col-span-7">
      <CardHead
        icon={<TrendingUp size={18} aria-hidden />}
        title="Six months"
        right={
          <span className="flex items-center gap-3 text-caption text-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--text-muted) 45%, transparent)' }} />
              Invoiced
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--swatch)' }} />
              Collected
            </span>
          </span>
        }
      />
      <div className="flex h-52 items-end gap-2 sm:gap-4" role="img" aria-label="Invoiced and collected, month by month, over six months">
        {sum.trend.map((m, i) => {
          const now = i === sum.trend.length - 1;
          return (
            <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center gap-1">
                <div
                  title={`${m.label}: invoiced ${naira(m.invoiced)}`}
                  className="w-1/2 max-w-7 rounded-t-lg"
                  style={{ height: `${Math.max(m.invoiced > 0 ? 3 : 1, (m.invoiced / max) * 100)}%`, backgroundColor: 'color-mix(in srgb, var(--text-muted) 40%, transparent)' }}
                />
                <div
                  title={`${m.label}: collected ${naira(m.collected)}`}
                  className="w-1/2 max-w-7 rounded-t-lg"
                  style={{ height: `${Math.max(m.collected > 0 ? 3 : 1, (m.collected / max) * 100)}%`, backgroundColor: 'var(--swatch)' }}
                />
              </div>
              <span className={cn('text-caption', now ? 'font-semibold text-primary' : 'text-muted')}>{m.label}</span>
            </div>
          );
        })}
      </div>
    </QuietCard>
  );
}

function Debtors({ sum, root }: { sum: Sum; root: string }) {
  const top = sum.debtors[0]?.owed ?? 0;
  return (
    <QuietCard className="lg:col-span-5">
      <CardHead icon={<Users size={18} aria-hidden />} title="Who owes most" right={<Pill>{`Top ${sum.debtors.length || 0}`}</Pill>} />
      {sum.debtors.length === 0 ? (
        <p className="py-6 text-center text-label text-muted">Nobody owes anything. Every invoice is settled.</p>
      ) : (
        <ul className="space-y-4">
          {sum.debtors.map((d, i) => (
            <li key={d.distributorId}>
              <Link to={`${root}/statement?account=${encodeURIComponent(d.distributorId)}`} className="group block">
                <div className="mb-1.5 flex items-center gap-2 text-label">
                  <span className="min-w-0 flex-1 truncate font-semibold text-primary group-hover:underline">{d.name}</span>
                  {d.overdue > 0 && (
                    <span className="tabular inline-flex items-center gap-1 text-caption font-semibold text-status-critical">
                      <AlertTriangle size={12} aria-hidden /> {` ${nairaShort(d.overdue)} late`}</span>
                  )}
                  <span className="tabular font-semibold text-primary">{naira(d.owed)}</span>
                </div>
                <div className="relative h-2.5 rounded-full surface-sunken">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${Math.max(3, top > 0 ? (d.owed / top) * 100 : 0)}%`,
                      backgroundColor: i === 0 ? 'var(--swatch)' : 'color-mix(in srgb, var(--text-muted) 45%, transparent)',
                    }}
                  />
                </div>
                <p className="mt-1 text-caption text-muted">
                  {d.invoices === 1
                    ? d.oldestDays > 0 ? `1 open invoice, ${d.oldestDays} days late` : '1 open invoice, not late'
                    : d.oldestDays > 0 ? `${d.invoices} open invoices, oldest ${d.oldestDays} days late` : `${d.invoices} open invoices, none late`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </QuietCard>
  );
}
