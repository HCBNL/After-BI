/**
 * Reports: the spreadsheet somebody asked for.
 *
 * WHY THIS SCREEN IS DELIBERATELY BORING
 *
 * Because it is an export, not an analysis. Every attempt to make a reporting
 * screen do the analysis ends the same way: it answers the four questions
 * somebody thought of, and the finance manager exports to Excel anyway to
 * answer the fifth. So this picks a range, picks a dataset, and produces a
 * clean CSV: and the charts live on the screens where the numbers are acted
 * on, not here.
 *
 * CSV rather than XLSX on purpose: it opens in Excel, in Sheets and in
 * anything, needs no library in the bundle, and cannot carry a formula that
 * silently breaks in a different locale.
 */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Field, Hint, Input, Select, useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listInvoices, listOrders, listSales, listStock } from '@/lib/db';
import { partnerScope } from '@/lib/roles';
import { todayISO } from '@/lib/format';

type Dataset = 'sales' | 'orders' | 'invoices' | 'stock';

const LABEL: Record<Dataset, string> = {
  sales: 'Sell-out',
  orders: 'Orders',
  invoices: 'Invoices',
  stock: 'Stock on hand',
};

/**
 * A CSV cell that cannot break the file or the spreadsheet that opens it.
 *
 * Two hazards, both real. A value containing a comma, a quote or a newline
 * breaks the row unless it is quoted and its quotes doubled. And a value
 * starting with `=`, `+`, `-` or `@` is executed as a formula by Excel on
 * open: which is how an exported "customer name" becomes a CSV injection. The
 * leading apostrophe defuses it.
 */
function cell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.map(cell).join(','),
    ...rows.map((row) => headers.map((header) => cell(row[header])).join(',')),
  ].join('\n');
}

export default function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const scope = partnerScope(user);

  const [dataset, setDataset] = useState<Dataset>('sales');
  const [from, setFrom] = useState(`${todayISO().slice(0, 7)}-01`);
  const [to, setTo] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  const build = async (): Promise<Record<string, unknown>[]> => {
    switch (dataset) {
      case 'sales': {
        const rows = await listSales({ distributorId: scope, from, to, max: 5000 });
        return rows.map((s) => ({
          Date: s.saleDate,
          Product: s.productName,
          Distributor: s.distributorName,
          Outlet: s.outlet ?? '',
          Quantity: s.quantity,
          'Unit price': s.unitPrice,
          Total: s.total,
          'Keyed by': s.capturedByName,
        }));
      }
      case 'orders': {
        const rows = await listOrders({ distributorId: scope, max: 2000 });
        return rows
          .filter((o) => o.createdAt >= from && o.createdAt <= `${to}T23:59:59`)
          .map((o) => ({
            Order: o.orderNumber,
            Distributor: o.distributorName,
            Status: o.status,
            Lines: o.lines.length,
            Total: o.total,
            'Raised by': o.createdByName,
            Raised: o.createdAt,
            Fulfilled: o.fulfilledAt ?? '',
          }));
      }
      case 'invoices': {
        const rows = await listInvoices({ distributorId: scope, max: 2000 });
        return rows
          .filter((i) => i.issuedOn >= from && i.issuedOn <= to)
          .map((i) => ({
            Invoice: i.invoiceNumber,
            Order: i.orderNumber ?? '',
            Distributor: i.distributorName,
            Issued: i.issuedOn,
            Due: i.dueOn,
            Total: i.total,
            Paid: i.amountPaid ?? 0,
            Owing: i.total - (i.amountPaid ?? 0),
            Status: i.status,
          }));
      }
      case 'stock': {
        const rows = await listStock();
        return rows.map((s) => ({
          Product: s.productName,
          Unit: s.unit,
          Depot: s.warehouseId,
          Quantity: s.quantity,
          Threshold: s.threshold,
          'Last moved': s.updatedAt ?? '',
        }));
      }
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      const rows = await build();
      if (!rows.length) {
        toast.warning('Nothing in that range', 'Try a wider date range or a different dataset.');
        return;
      }

      const blob = new Blob([`﻿${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `afterbi-${dataset}-${from}-to-${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${rows.length} rows exported`);
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, stock and debtors, as a spreadsheet, for whoever asked for it in Excel."
      />

      <div className="max-w-xl rounded-2xl border border-hairline surface-card p-5 shadow-card">
        <Field label="What to export" required>
          <Select value={dataset} onChange={(e) => setDataset(e.target.value as Dataset)}>
            {(Object.keys(LABEL) as Dataset[]).map((key) => (
              <option key={key} value={key}>
                {LABEL[key]}
              </option>
            ))}
          </Select>
        </Field>

        {dataset !== 'stock' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="From" required>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To" required>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}

        {dataset === 'stock' && (
          <p className="mt-3 text-[12.5px] leading-snug text-muted">
            Stock on hand is a snapshot of right now, so it has no date range. For stock movement
            over a period, export the ledger from the Movements screen.
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <Button icon={<Download size={15} />} loading={busy} onClick={() => void download()}>
            Download CSV
          </Button>
          <Hint label="About the file">
            The file opens in Excel, Google Sheets or LibreOffice. Naira figures are plain numbers
            with no currency symbol, so they can be summed without cleaning.
          </Hint>
        </div>

      </div>
    </div>
  );
}
