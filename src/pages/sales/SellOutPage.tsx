/**
 * Sell-out — what actually left the shelves.
 *
 * WHY THIS SCREEN MATTERS MORE THAN ORDERS
 *
 * An order is sell-IN: stock moving from us to a distributor. It is revenue and
 * it is also, on its own, a lie — a distributor who buys 2,000 cartons and sells
 * 300 has a warehouse problem and a cancelled order coming, and the sell-in
 * figure says the territory is booming. Sell-out is the number that tells you
 * whether the first number was real.
 *
 * Which is why keying it has to be nearly free. This screen is built for a rep
 * standing in a shop with one hand: a product, a quantity, an outlet, done. The
 * date defaults to today and is editable, because reps key Friday's calls on
 * Monday morning and filing three days of work under Monday makes the daily
 * curve useless.
 */

import { useMemo, useState } from 'react';
import { Pencil, Plus, TrendingUp, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Field,
  Input,
  Modal,
  SearchInput,
  Select,
  StatTile,
  useToast,
  type Column,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { deleteSale, listSales, recordSale, updateSale } from '@/lib/db';
import { partnerScope } from '@/lib/roles';
import { saleAmendment } from '@/lib/amend';
import { formatDate, naira, nairaShort, count, todayISO } from '@/lib/format';
import type { Sale } from '@/types';

export default function SellOutPage() {
  const { user } = useAuth();
  const toast = useToast();

  const scope = partnerScope(user);
  const monthStart = `${todayISO().slice(0, 7)}-01`;

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [removing, setRemoving] = useState<Sale | null>(null);

  const { data, loading, reload } = useAsync(
    () => listSales({ distributorId: scope, from: monthStart, max: 400 }),
    [scope, monthStart],
    { handleError: true },
  );

  const sales = data ?? [];

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sales.filter(
      (sale) =>
        !needle ||
        sale.productName.toLowerCase().includes(needle) ||
        (sale.outlet ?? '').toLowerCase().includes(needle) ||
        sale.distributorName.toLowerCase().includes(needle),
    );
  }, [sales, search]);

  const totals = useMemo(() => {
    const today = todayISO();
    return {
      month: sales.reduce((sum, s) => sum + s.total, 0),
      today: sales.filter((s) => s.saleDate === today).reduce((sum, s) => sum + s.total, 0),
      outlets: new Set(sales.map((s) => s.outlet).filter(Boolean)).size,
    };
  }, [sales]);

  const columns: Column<Sale>[] = [
    {
      key: 'date',
      header: 'Date',
      sortValue: (row) => row.saleDate,
      cell: (row) => <span className="text-[12.5px] text-secondary">{formatDate(row.saleDate)}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      sortValue: (row) => row.productName,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-primary">{row.productName}</p>
          <p className="truncate text-[12px] text-muted">{row.outlet ?? 'No outlet named'}</p>
        </div>
      ),
    },
    {
      key: 'distributor',
      header: 'Distributor',
      hideOnMobile: true,
      sortValue: (row) => row.distributorName,
      cell: (row) => <span className="text-[13px]">{row.distributorName}</span>,
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      sortValue: (row) => row.quantity,
      cell: (row) => <span className="tabular text-[13px]">{count(row.quantity)}</span>,
    },
    {
      key: 'total',
      header: 'Value',
      align: 'right',
      sortValue: (row) => row.total,
      cell: (row) => (
        <span className="tabular text-[13.5px] font-bold text-primary">{naira(row.total)}</span>
      ),
    },
    {
      key: 'by',
      header: 'Keyed by',
      hideOnMobile: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[12px] text-muted">{row.capturedByName}</p>
          {row.amendedAt && (
            <Badge tone="warning" className="mt-0.5">
              Amended
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'amend',
      header: '',
      width: '92px',
      cell: (row) => {
        /*
          Drawn per row rather than behind a selection, because correcting a
          sell-out line is a two-second job done while scanning the list — and
          the old app's answer was "you can't", which is why this column exists
          at all. `saleAmendment` decides whether either control appears: inside
          the month the person who keyed it can fix their own, after that it
          takes an administrator.
        */
        const amend = saleAmendment(user, row);
        if (!amend.canEdit) return null;
        return (
          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              aria-label={`Edit the ${row.productName} record`}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label={`Delete the ${row.productName} record`}
              onClick={(e) => {
                e.stopPropagation();
                setRemoving(row);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:text-status-critical"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sell-out"
        description="What actually left the shelves, by outlet and by day. The number behind the number."
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            Record a sale
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="This month" value={nairaShort(totals.month)} icon={<TrendingUp size={16} />} tone="good" />
        <StatTile label="Today" value={nairaShort(totals.today)} hint="Keyed so far today" />
        <StatTile label="Outlets" value={count(totals.outlets)} hint="Named this month" tone="info" />
      </div>

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Product, outlet or distributor…"
          className="max-w-sm"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        dense
        emptyIcon={<TrendingUp size={22} />}
        emptyTitle={search ? 'Nothing matches that' : 'Nothing recorded this month'}
        emptyDescription={
          search
            ? 'Try a different product or outlet.'
            : 'Record what the shops have taken and it appears here.'
        }
      />

      <SaleModal
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          reload();
          toast.success('Sale recorded');
        }}
      />

      <EditSaleModal
        sale={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
          toast.success('Record corrected');
        }}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete this record?"
        message="A sell-out line that never happened has nothing else pointing at it, so it is removed rather than kept as a cancelled row that every report would have to remember to filter out. The deletion itself is recorded in the activity log, which nobody can edit."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (!removing || !user) return;
          try {
            await deleteSale(removing.id, user);
            setRemoving(null);
            reload();
            toast.success('Record deleted');
          } catch (err) {
            setRemoving(null);
            toast.error('Not deleted', err instanceof Error ? err.message : undefined);
          }
        }}
      />
    </div>
  );
}

/**
 * Correcting a sell-out line.
 *
 * The product and the distributor are fixed — changing either would make this a
 * different sale, and the honest version of that is to delete this one and key
 * the right one. What can change is what people actually get wrong: the
 * quantity, the day, and which outlet it went to.
 */
function EditSaleModal({
  sale,
  onClose,
  onSaved,
}: {
  sale: Sale | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [quantity, setQuantity] = useState('');
  const [outlet, setOutlet] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState<string | undefined>(undefined);

  if (sale && sale.id !== seed) {
    setSeed(sale.id);
    setQuantity(String(sale.quantity));
    setOutlet(sale.outlet ?? '');
    setSaleDate(sale.saleDate);
  }

  if (!sale) return null;

  const amend = saleAmendment(user, sale);
  const qty = Number(quantity) || 0;

  const save = async () => {
    if (!user || qty <= 0) {
      toast.warning('How many?', 'A sell-out record needs a quantity of at least one.');
      return;
    }
    setBusy(true);
    try {
      await updateSale(
        sale.id,
        { quantity: qty, outlet: outlet.trim(), saleDate },
        user,
        { settled: amend.stage === 'settled' },
      );
      onSaved();
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Correct this record"
      description={`${sale.productName} · ${sale.distributorName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Save correction
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {amend.stage === 'settled' && (
          <Alert tone="warning" title="This month has already been reported" defaultOpen>
            The figure is in a scorecard and probably a commission run. Changing it now is recorded
            against your name and shown on the record.
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity" required>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Date of sale" required hint="Not the day it was keyed">
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Outlet" hint="Optional">
          <Input value={outlet} onChange={(e) => setOutlet(e.target.value)} />
        </Field>

        {/*
          The price is not editable, for the same reason it is not editable when
          raising an order: it is the tier price snapshotted at capture. A sale
          recorded at the wrong price is a sale against the wrong tier, and that
          is fixed on the distributor's record, not here.
        */}
        <div className="flex items-center justify-between rounded-xl border border-hairline surface-sunken px-4 py-3">
          <span className="text-[12.5px] text-muted">
            {count(qty)} × {naira(sale.unitPrice)}
          </span>
          <span className="tabular text-[16px] font-extrabold text-primary">
            {naira(qty * sale.unitPrice)}
          </span>
        </div>
      </div>
    </Modal>
  );
}

function SaleModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { products, distributors } = useOrg();
  const toast = useToast();

  const scope = partnerScope(user);
  const scoped = scope && scope.length === 1 ? scope[0] : undefined;
  const [distributorId, setDistributorId] = useState(scoped ?? '');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [outlet, setOutlet] = useState('');
  const [saleDate, setSaleDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  const distributor = distributors.find((d) => d.id === distributorId);
  const product = products.find((p) => p.id === productId);
  /* The price is the tier price, not a field. Same reasoning as an order. */
  const unitPrice = product && distributor ? (product.pricing[distributor.category] ?? 0) : 0;
  const qty = Number(quantity) || 0;

  const save = async () => {
    if (!user || !product || !distributor || qty <= 0) {
      toast.warning('Missing something', 'A sale needs a distributor, a product and a quantity.');
      return;
    }
    setBusy(true);
    try {
      await recordSale({
        product,
        distributor,
        quantity: qty,
        unitPrice,
        outlet: outlet.trim() || undefined,
        saleDate,
        actor: user,
      });
      setQuantity('');
      setOutlet('');
      onSaved();
    } catch (err) {
      toast.error('Not recorded', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a sale"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Record
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Distributor" required>
          <Select
            value={distributorId}
            disabled={Boolean(scoped)}
            onChange={(e) => setDistributorId(e.target.value)}
          >
            <option value="">Choose…</option>
            {distributors
              .filter((d) => d.status === 'active' && (!scope || scope.includes(d.id)))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.company}
                </option>
              ))}
          </Select>
        </Field>

        <Field label="Product" required>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Choose…</option>
            {products
              .filter((p) => p.status === 'active')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity" required hint={product?.unit}>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field
            label="Date of sale"
            required
            hint="Not the day you key it"
          >
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Outlet" hint="Optional">
          <Input
            value={outlet}
            onChange={(e) => setOutlet(e.target.value)}
            placeholder="Shop or customer name"
          />
        </Field>

        {product && distributor && qty > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-hairline surface-sunken px-4 py-3">
            <span className="text-[12.5px] text-muted">
              {count(qty)} × {naira(unitPrice)}
            </span>
            <span className="tabular text-[16px] font-extrabold text-primary">
              {naira(qty * unitPrice)}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
