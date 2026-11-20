/**
 * One stock count, live: scan, count, and (for managers) the variance.
 *
 * Several counters can work the same count from their own phones at once;
 * every stack saved appears for everybody within a second, because the
 * entries are watched rather than read once.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, Boxes, CheckCircle2, Download, Lock, Printer, RefreshCw, ScanLine, Search } from 'lucide-react';
import { QuietLoader } from '@/components/brand/Loader';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Field, Modal, SearchInput, SegmentedControl, Textarea, useToast } from '@/components/ui';
import { ProductShot } from '@/components/catalogue/ProductShot';
import { BarcodeScanner, type ScanVerdict } from '@/components/stock/BarcodeScanner';
import { AdjustmentModal, type AdjustmentPreset } from '@/components/stock/AdjustmentModal';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { cancelCount, closeCount, listMovements, watchCount, watchCountEntries } from '@/lib/db';
import { readCountCode } from '@/lib/countCode';
import { getActiveOrg } from '@/lib/tenant';
import { countUnit, packLabel, piecesLabel, piecesOf, stockFactor } from '@/lib/packs';
import { LINE_LABEL, countedByProduct, isIssue, summarise, varianceLines, type VarianceLine } from '@/lib/variance';
import { printCountReport } from '@/lib/print';
import { downloadCsv } from '@/lib/download';
import { count, formatDateTime } from '@/lib/format';
import { ADJUSTMENT_RAISERS } from '@/lib/adjustments';
import { CountSheet } from './CountSheet';
import { VarianceView, type Moved } from './VarianceView';
import type { CountEntry, Product, Role, StockCount } from '@/types';

/** Open, close and cancel a count. A warehouse manager only in their own depots. */
export const COUNT_MANAGERS: Role[] = ['super_admin', 'admin', 'operations_manager', 'warehouse_manager'];
/** Count: the managers and the office staff who help on the floor. */
export const COUNTERS: Role[] = [...COUNT_MANAGERS, 'staff'];
/** See the variance while the count is still open. Everyone sees it once it is closed. */
const LIVE_VARIANCE: Role[] = ['super_admin', 'admin', 'operations_manager', 'finance_manager'];

export function CountSession({ countId, onBack }: { countId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { products, settings, warehouses } = useOrg();
  const toast = useToast();
  const navigate = useNavigate();

  const [stockCount, setStockCount] = useState<StockCount | null | undefined>(undefined);
  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [tab, setTab] = useState<'counted' | 'todo' | 'variance'>('counted');
  const [scanning, setScanning] = useState(false);
  const [finding, setFinding] = useState(false);
  const [sheet, setSheet] = useState<Product | null>(null);
  const [lastLocation, setLastLocation] = useState('');
  const [closing, setClosing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [moved, setMoved] = useState<Map<string, Moved>>(new Map());
  const [adjust, setAdjust] = useState<AdjustmentPreset | null>(null);
  const [search, setSearch] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setStockCount(undefined);
    setFailed(null);
    setSlow(false);
    const offCount = watchCount(countId, setStockCount, (err) => setFailed(err.message));
    const offEntries = watchCountEntries(countId, setEntries, (err) => setFailed(err.message));
    /* Never a loader for ever: after 12 seconds with nothing, say so and offer a retry. */
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => {
      window.clearTimeout(timer);
      offCount();
      offEntries();
    };
  }, [countId, attempt]);

  const role = user?.role;
  const scoped = role === 'warehouse_manager' ? (user?.warehouseIds ?? []) : null;
  const inDepot = !scoped || (stockCount ? scoped.includes(stockCount.warehouseId) : false);
  const isOpen = stockCount?.status === 'open';
  const canManage = Boolean(role && COUNT_MANAGERS.includes(role) && inDepot);
  const canCount = Boolean(role && COUNTERS.includes(role) && inDepot && isOpen);
  const canSeeVariance = Boolean(stockCount && (stockCount.status !== 'open' || (role && LIVE_VARIANCE.includes(role))));
  const canRaise = Boolean(role && ADJUSTMENT_RAISERS.includes(role) && inDepot && stockCount?.status === 'closed');

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = useMemo(
    () => (stockCount ? varianceLines(stockCount, entries, new Map(products.map((p) => [p.id, { name: p.name, unit: countUnit(p), factor: stockFactor(p) }]))) : []),
    [stockCount, entries, products],
  );
  const counted = useMemo(() => countedByProduct(entries), [entries]);
  const counters = useMemo(() => [...new Set(entries.filter((e) => !e.void).map((e) => e.countedByName))], [entries]);

  /* What moved in or out of this depot while the count was running. */
  useEffect(() => {
    if (!stockCount || !canSeeVariance) return;
    let live = true;
    const from = stockCount.startedAt ?? '';
    const to = stockCount.closedAt ?? '9999';
    listMovements(stockCount.warehouseId, 500)
      .then((rows) => {
        if (!live) return;
        const out = new Map<string, Moved>();
        for (const m of rows) {
          if (!m.createdAt || m.createdAt <= from || m.createdAt >= to) continue;
          const row = out.get(m.productId) ?? { inUnits: 0, outUnits: 0 };
          if (m.direction === 'in') row.inUnits += m.quantity;
          else row.outUnits += m.quantity;
          out.set(m.productId, row);
        }
        setMoved(out);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [stockCount?.warehouseId, stockCount?.startedAt, stockCount?.closedAt, canSeeVariance, entries.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* A count that has just closed opens on its variance. */
  useEffect(() => {
    if (stockCount && stockCount.status !== 'open') setTab('variance');
  }, [stockCount?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed || (stockCount === undefined && slow)) {
    return (
      <div>
        <PageHeader title="Stock count" />
        <Alert tone="warning" title="This count could not be opened" defaultOpen>
          <p>{failed ?? 'AfterBI could not reach the server. Check the connection (or close other AfterBI tabs on this phone) and try again.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
            <Button size="sm" variant="ghost" icon={<ArrowLeft size={14} />} onClick={onBack}>
              All counts
            </Button>
          </div>
        </Alert>
      </div>
    );
  }
  if (stockCount === undefined) {
    return (
      <div>
        <PageHeader title="Stock count" />
        <QuietLoader inline label="Opening the count" />
      </div>
    );
  }
  if (stockCount === null) {
    return (
      <div>
        <PageHeader title="Stock count" />
        <EmptyState icon={<Boxes size={22} />} title="That count does not exist" description="It may have been opened in another organisation." />
        <Button variant="ghost" icon={<ArrowLeft size={15} />} onClick={onBack} className="mt-3">
          All counts
        </Button>
      </div>
    );
  }

  const resolve = (text: string): ScanVerdict => {
    const org = getActiveOrg();
    if (!org) return { ok: false, message: 'No organisation is open.' };
    const reading = readCountCode(text, org);
    if (!reading.ok) {
      return {
        ok: false,
        message:
          reading.reason === 'other-company'
            ? 'That sticker belongs to another company. It does not open anything here.'
            : 'That is not an AfterBI stock sticker. Scan the sticker AfterBI printed, not the maker’s barcode.',
      };
    }
    const product = products.find((p) => p.countCode === reading.code);
    if (!product) return { ok: false, message: 'No product carries this sticker any more. It may have been given a new code: print fresh stickers.' };
    setScanning(false);
    setSheet(product);
    return { ok: true };
  };

  const notCounted = Object.entries(stockCount.snapshot ?? {})
    .filter(([id, s]) => s.quantity > 0 && !counted.has(id))
    .map(([id, s]) => ({ id, name: s.productName, product: productMap.get(id) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const countedRows = [...counted.entries()]
    .map(([id, c]) => ({ id, ...c, product: productMap.get(id) }))
    .filter((r) => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const doClose = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await closeCount(stockCount.id, summarise(lines), user);
      setClosing(false);
      toast.success(`${stockCount.number} closed`, 'It is now a report. Nothing in stock has changed.');
    } catch (err) {
      toast.error('Not closed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await cancelCount(stockCount.id, reason, user);
      setCancelling(false);
      toast.success(`${stockCount.number} cancelled`);
    } catch (err) {
      toast.error('Not cancelled', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const reportLines = (list: VarianceLine[]) =>
    list.map((l) => {
      const m = moved.get(l.productId);
      return {
        productName: l.productName,
        system: packLabel(l.systemPieces, l.piecesPerUnit, l.unit),
        counted: l.state === 'notCounted' ? 'None' : packLabel(l.countedPieces, l.piecesPerUnit, l.unit),
        variance: l.variancePieces === 0 ? '0' : packLabel(l.variancePieces, l.piecesPerUnit, l.unit, true),
        variancePieces: l.variancePieces,
        state: LINE_LABEL[l.state],
        issue: isIssue(l),
        places: l.places,
        movedNote: m && (m.inUnits || m.outUnits) ? `Moved during the count: ${m.inUnits} in, ${m.outUnits} out` : undefined,
      };
    });

  const print = () => {
    if (!settings) return;
    const s = summarise(lines);
    printCountReport({
      settings,
      number: stockCount.number,
      depot: stockCount.warehouseName,
      status: isOpen ? 'Still open' : stockCount.status === 'cancelled' ? 'Cancelled' : 'Closed',
      startedAt: stockCount.startedAt,
      closedAt: stockCount.closedAt,
      startedBy: stockCount.startedByName,
      closedBy: stockCount.closedByName,
      counters,
      lines: reportLines(lines),
      totals: { lines: s.lines, matched: s.matched, issues: s.lines - s.matched },
      preparedBy: user ? `${user.firstName} ${user.lastName}` : undefined,
    });
  };

  const exportCsv = async () => {
    const head = ['Product', 'Units per carton', 'System', 'System (units)', 'Counted', 'Counted (units)', 'Variance', 'Variance (units)', 'Status', 'Places counted'];
    const body = lines.map((l) => [
      l.productName,
      l.piecesPerUnit,
      packLabel(l.systemPieces, l.piecesPerUnit, l.unit),
      l.systemPieces,
      packLabel(l.countedPieces, l.piecesPerUnit, l.unit),
      l.countedPieces,
      packLabel(l.variancePieces, l.piecesPerUnit, l.unit, true),
      l.variancePieces,
      LINE_LABEL[l.state],
      l.places,
    ]);
    const outcome = await downloadCsv(`${stockCount.number}.csv`, [head, ...body]);
    if (outcome.status === 'unsupported') toast.warning('Not saved', outcome.reason);
  };

  const status = stockCount.status;
  const issues = lines.filter(isIssue).length;
  const warehouseGone = !warehouses.some((w) => w.id === stockCount.warehouseId);

  return (
    <div>
      <PageHeader
        title={stockCount.number}
        description="A stock count is a report. Counting changes no stock. When it is closed, the variance shows what the system held against what was found, and any correction goes through a stock adjustment that finance and operations both approve."
        actions={
          <div className="flex flex-wrap gap-2">
            {canSeeVariance && (
              <>
                <Button size="sm" variant="outline" icon={<Printer size={15} />} onClick={print}>
                  Print
                </Button>
                <Button size="sm" variant="outline" icon={<Download size={15} />} onClick={() => void exportCsv()}>
                  CSV
                </Button>
              </>
            )}
            {isOpen && canManage && (
              <>
                <Button size="sm" variant="ghost" icon={<Ban size={15} />} onClick={() => setCancelling(true)}>
                  Cancel count
                </Button>
                <Button size="sm" icon={<Lock size={15} />} onClick={() => setClosing(true)}>
                  Close count
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-label text-secondary">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-semibold text-primary">
            <ArrowLeft size={15} /> All counts
          </button>
          <span className="font-semibold text-primary">{stockCount.warehouseName}{warehouseGone ? ' (depot removed)' : ''}</span>
          <Badge tone={status === 'open' ? 'info' : status === 'closed' ? (issues ? 'critical' : 'good') : 'neutral'}>
            {status === 'open' ? 'Counting' : status === 'closed' ? (issues ? `Closed, ${issues} variances` : 'Closed, all matched') : 'Cancelled'}
          </Badge>
          <span>{`Started by ${stockCount.startedByName}, ${formatDateTime(stockCount.startedAt)}`}</span>
          {stockCount.closedAt && <span>{`Closed by ${stockCount.closedByName ?? ''}, ${formatDateTime(stockCount.closedAt)}`}</span>}
          <span>{`${count(counted.size)} products counted`}</span>
          {counters.length > 0 && <span>{`Counters: ${counters.join(', ')}`}</span>}
        </div>
      </PageHeader>

      {status === 'cancelled' && (
        <Alert tone="warning" className="mb-4" title="This count was cancelled" defaultOpen>
          {stockCount.cancelReason ?? ''}
        </Alert>
      )}
      {stockCount.note && <p className="mb-4 text-label text-secondary">{stockCount.note}</p>}

      {canCount && (
        <div className="mb-5 grid gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Button size="lg" full icon={<ScanLine size={20} />} onClick={() => setScanning(true)} className="h-14 text-lead">
            Scan a carton
          </Button>
          <Button size="lg" full variant="outline" icon={<Search size={18} />} onClick={() => setFinding(true)} className="h-14">
            Find without scanning
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SegmentedControl
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'counted', label: `Counted (${counted.size})` },
            { value: 'todo', label: `Not counted yet (${notCounted.length})` },
            ...(canSeeVariance ? [{ value: 'variance' as const, label: issues ? `Variance (${issues})` : 'Variance' }] : []),
          ]}
        />
        {tab === 'counted' && <SearchInput value={search} onChange={setSearch} placeholder="Find a counted product…" className="max-w-xs" />}
      </div>

      {tab === 'counted' &&
        (countedRows.length === 0 ? (
          <EmptyState
            icon={<ScanLine size={22} />}
            title={search ? 'Nothing matches that' : 'Nothing counted yet'}
            description={canCount ? 'Scan the sticker on a carton to open its product, then type what is stacked.' : 'Counts appear here as they are saved.'}
          />
        ) : (
          <ul className="space-y-2">
            {countedRows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => r.product && setSheet(r.product)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-hairline surface-card p-3.5 text-left shadow-card transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <ProductShot src={r.product?.imageUrl} alt="" width={40} className="h-10 w-10 shrink-0 border border-hairline" rounded="rounded-lg" imgClassName="p-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-primary">{r.name}</p>
                    <p className="text-caption text-muted">{r.places === 1 ? 'Counted in 1 place' : `Counted in ${r.places} places`}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-body font-bold text-primary">{packLabel(r.pieces, r.per, countUnit(r.product))}</p>
                    {r.per > 1 && <p className="tabular text-caption text-muted">{piecesLabel(r.pieces)}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'todo' &&
        (notCounted.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={22} />} title="Everything the system holds here has been counted" description="Products found that the system does not hold still show in the variance." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {notCounted.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={!r.product || !canCount}
                  onClick={() => r.product && setSheet(r.product)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-hairline surface-card p-3 text-left shadow-card transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-70"
                >
                  <ProductShot src={r.product?.imageUrl} alt="" width={36} className="h-9 w-9 shrink-0 border border-hairline" rounded="rounded-lg" imgClassName="p-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label font-semibold text-primary">{r.name}</p>
                    {r.product?.packSize && <p className="truncate text-caption text-muted">{r.product.packSize}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'variance' && canSeeVariance && (
        <VarianceView
          lines={lines}
          moved={moved}
          live={isOpen}
          onAdjust={
            canRaise
              ? (line) =>
                  setAdjust({
                    warehouseId: stockCount.warehouseId,
                    productId: line.productId,
                    direction: line.variancePieces < 0 ? 'out' : 'in',
                    pieces: Math.abs(line.variancePieces),
                    reason: `Stock count ${stockCount.number}: ${LINE_LABEL[line.state].toLowerCase()}, system ${packLabel(line.systemPieces, line.piecesPerUnit, line.unit)}, counted ${packLabel(line.countedPieces, line.piecesPerUnit, line.unit)}.`,
                    count: { id: stockCount.id, number: stockCount.number },
                  })
              : undefined
          }
        />
      )}

      <BarcodeScanner open={scanning} onClose={() => setScanning(false)} resolve={resolve} />

      <ProductFinder
        open={finding}
        products={products}
        onClose={() => setFinding(false)}
        onPick={(p) => {
          setFinding(false);
          setSheet(p);
        }}
      />

      {sheet && (
        <CountSheet
          count={stockCount}
          warehouse={warehouses.find((w) => w.id === stockCount.warehouseId)}
          product={sheet}
          entries={entries}
          canCount={canCount}
          canManage={canManage}
          lastLocation={lastLocation}
          onLocation={setLastLocation}
          onClose={() => setSheet(null)}
          onScanNext={() => {
            setSheet(null);
            setScanning(true);
          }}
        />
      )}

      <ConfirmDialog
        open={closing}
        onClose={() => setClosing(false)}
        onConfirm={() => void doClose()}
        loading={busy}
        title={`Close ${stockCount.number}?`}
        confirmLabel="Close count"
        message={
          <div className="space-y-2">
            <p>Nobody can add or change a stack after this, and the variance becomes the report.</p>
            {notCounted.length > 0 && (
              <p className="font-semibold text-status-critical">
                {notCounted.length === 1
                  ? '1 product the system holds here has not been counted. It will be reported as not counted.'
                  : `${count(notCounted.length)} products the system holds here have not been counted. They will be reported as not counted.`}
              </p>
            )}
            <p>Closing changes no stock.</p>
          </div>
        }
      />

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        title={`Cancel ${stockCount.number}?`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelling(false)} disabled={busy}>
              Keep counting
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void doCancel()} disabled={!reason.trim()}>
              Cancel count
            </Button>
          </>
        }
      >
        <Field label="Why" required>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Started in the wrong depot, depot not ready…" />
        </Field>
        <p className="mt-2 text-caption text-muted">What was counted stays on record. Start a new count when ready.</p>
      </Modal>

      <AdjustmentModal
        open={Boolean(adjust)}
        preset={adjust}
        onClose={() => setAdjust(null)}
        onDone={() => {
          setAdjust(null);
          toast.success('Sent for approval', 'Finance and operations both have to approve it before stock changes.');
          navigate('../adjustments', { relative: 'path' });
        }}
      />
    </div>
  );
}

/** Pick a product by name, for a torn sticker or a carton with none yet. */
function ProductFinder({
  open,
  products,
  onClose,
  onPick,
}: {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onPick: (product: Product) => void;
}) {
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);
  const goods = products.filter((p) => !p.service && p.status === 'active');
  const needle = q.trim().toLowerCase();
  const hits = goods
    .filter((p) => !needle || p.name.toLowerCase().includes(needle) || (p.sku ?? '').toLowerCase().includes(needle) || (p.brand ?? '').toLowerCase().includes(needle))
    .slice(0, 60);
  return (
    <Modal open={open} onClose={onClose} title="Find a product" size="md" note="For a carton whose sticker is torn or missing. Print it a new sticker afterwards so the next count can scan it.">
      <SearchInput value={q} onChange={setQ} placeholder="Name, SKU or brand…" />
      <ul className="mt-3 max-h-[52vh] divide-y divide-[var(--border-hairline)] overflow-y-auto">
        {hits.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-[var(--surface-sunken)]">
              <ProductShot src={p.imageUrl} alt="" width={36} className="h-9 w-9 shrink-0 border border-hairline" rounded="rounded-lg" imgClassName="p-0.5" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label font-semibold text-primary">{p.name}</p>
                <p className="truncate text-caption text-muted">{[p.packSize, piecesOf(p) > 1 ? `${piecesOf(p)} units per carton` : null].filter(Boolean).join(' · ')}</p>
              </div>
            </button>
          </li>
        ))}
        {hits.length === 0 && <li className="py-6 text-center text-label text-muted">Nothing matches that.</li>}
      </ul>
    </Modal>
  );
}
