/**
 * Statement — one account, every invoice and payment, to the balance carried.
 *
 * WHY IT IS A RUNNING BALANCE AND NOT A TWO-COLUMN LIST
 *
 * Because the argument is always about the balance, not about a line. A
 * distributor who disputes their position needs to be able to point at the row
 * where the two accounts diverge, and a running balance in the right-hand
 * column is the only layout that lets them. It is also what a Nigerian
 * accounts department already reconciles against — this is the shape of the
 * paper it replaces.
 *
 * Printable, via `.print-doc` — see the print block in index.css.
 */

import { useEffect, useMemo, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, EmptyState, Select, StatTile, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { listAccountPayments, listInvoices } from '@/lib/db';
import { partnerScope } from '@/lib/roles';
import { useBrand } from '@/lib/brand';
import { formatDate, naira, todayISO } from '@/lib/format';
import { printDocument } from '@/lib/print';

interface Line {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function StatementPage() {
  const { user } = useAuth();
  const { distributors, settings } = useOrg();
  const brand = useBrand();
  const toast = useToast();

  const scope = partnerScope(user);
  const scoped = scope && scope.length === 1 ? scope[0] : null;
  const choices = scope ? distributors.filter((d) => scope.includes(d.id)) : distributors;
  const [distributorId, setDistributorId] = useState(scoped ?? '');

  /*
   * `distributors` is empty on the first render — OrgContext loads it — so
   * seeding this from `distributors[0]` in useState picked up '' and never
   * corrected itself. The screen then showed an empty select and no statement
   * at all, which reads as "this account has no history" rather than "nothing
   * is selected". Pick the first account once the list arrives, and only if
   * nobody has chosen one.
   */
  useEffect(() => {
    if (!distributorId && choices.length) setDistributorId(scoped ?? choices[0].id);
  }, [distributors, distributorId, scoped]);

  const distributor = distributors.find((d) => d.id === distributorId);

  const { data, loading } = useAsync(
    async () => {
      if (!distributorId) return null;
      /*
       * Two queries, not one-plus-one-per-invoice. An account with three
       * hundred invoices used to open three hundred connections to draw this
       * page — and the per-invoice query needs a composite index that, until
       * this round, was not in `firestore.indexes.json` at all, so in
       * production the whole screen failed rather than merely crawled.
       */
      const [invoices, payments] = await Promise.all([
        listInvoices({ distributorId, max: 300 }),
        listAccountPayments(distributorId),
      ]);
      return { invoices, payments };
    },
    [distributorId],
    { handleError: true },
  );

  const lines = useMemo<Line[]>(() => {
    if (!data) return [];

    const events = [
      ...data.invoices
        .filter((i) => i.status !== 'draft' && i.status !== 'void')
        .map((i) => ({
          id: `inv-${i.id}`,
          date: i.issuedOn,
          reference: i.invoiceNumber,
          description: i.orderNumber ? `Invoice for order ${i.orderNumber}` : 'Invoice',
          debit: i.total,
          credit: 0,
        })),
      ...data.payments.map((p) => ({
        id: `pay-${p.id}`,
        date: p.paidOn,
        reference: p.reference || p.invoiceNumber,
        description: `Payment received — ${p.method}`,
        debit: 0,
        credit: p.amount,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    let balance = 0;
    return events.map((event) => {
      balance += event.debit - event.credit;
      return { ...event, balance };
    });
  }, [data]);

  const closing = lines.length ? lines[lines.length - 1].balance : 0;

  return (
    <div>
      <PageHeader
        title="Statement"
        description="One account, every invoice and payment, to the balance carried forward."
        actions={
          /*
            `window.print()` used to print the screen, which meant the statement
            somebody emailed their distributor was a web page with a navigation
            bar hidden by a media query — and whatever the browser decided to do
            at a page break. This builds the document instead: one letterhead,
            one ledger that repeats its column headings across pages, and the
            bank accounts a payment is supposed to go to.
          */
          <Button
            size="sm"
            variant="outline"
            icon={<Printer size={15} />}
            disabled={!settings || !distributor || !data}
            onClick={() => {
              if (!settings || !distributor || !data) return;
              try {
                printDocument({
                  kind: 'statement',
                  distributor,
                  invoices: data.invoices,
                  payments: data.payments,
                  company: { settings },
                });
              } catch (err) {
                toast.error('Could not print', err instanceof Error ? err.message : undefined);
              }
            }}
          >
            Print
          </Button>
        }
      >
        {!scoped && (
          <Select
            value={distributorId}
            onChange={(e) => setDistributorId(e.target.value)}
            className="max-w-sm"
            aria-label="Distributor"
          >
            {choices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.company}
              </option>
            ))}
          </Select>
        )}
      </PageHeader>

      <div className="mb-5 grid gap-3 sm:grid-cols-3 no-print">
        <StatTile label="Balance" value={naira(closing)} icon={<FileText size={16} />} tone={closing > 0 ? 'warning' : 'good'} />
        <StatTile label="Invoices" value={String(data?.invoices.length ?? 0)} />
        <StatTile label="Payments" value={String(data?.payments.length ?? 0)} tone="good" />
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : lines.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="Nothing on this account"
          description="An invoice or a payment appears here the moment it is raised."
        />
      ) : (
        <div className="print-doc surface-card overflow-hidden rounded-2xl border border-hairline shadow-card">
          {/* The letterhead. Only the printed artefact carries the tenant's own
              colour and mark — see `lib/brand.ts` for why that stops here. */}
          <div
            className="border-b border-hairline px-5 py-4"
            style={{ borderTop: `3px solid ${brand.color}` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-extrabold text-primary">{brand.name}</p>
                <p className="text-[12px] text-muted">Statement of account</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold text-primary">{distributor?.company}</p>
                <p className="text-[12px] text-muted">As at {formatDate(todayISO())}</p>
              </div>
            </div>
          </div>

          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline surface-sunken">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted">Date</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted">Reference</th>
                  <th className="hidden px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted sm:table-cell">Description</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-muted">Debit</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-muted">Credit</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-muted">Balance</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-[12.5px] text-muted">{formatDate(line.date)}</td>
                    <td className="tabular px-4 py-2.5 text-[12.5px] font-semibold text-primary">{line.reference}</td>
                    <td className="hidden px-4 py-2.5 text-[12.5px] text-secondary sm:table-cell">{line.description}</td>
                    <td className="tabular px-4 py-2.5 text-right text-[12.5px] text-secondary">
                      {line.debit ? naira(line.debit, true) : ''}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-[12.5px] text-status-good">
                      {line.credit ? naira(line.credit, true) : ''}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-[12.5px] font-bold text-primary">
                      {naira(line.balance, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="surface-sunken">
                  <td colSpan={5} className="px-4 py-3 text-right text-[12px] font-bold uppercase tracking-wide text-muted">
                    Balance carried forward
                  </td>
                  <td className="tabular px-4 py-3 text-right text-[15px] font-extrabold text-primary">
                    {naira(closing, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
