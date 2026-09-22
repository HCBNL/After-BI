/**
 * Stock: what is in each depot, right now.
 *
 * THE THRESHOLD IS THE WHOLE SCREEN
 *
 * A stock list sorted by name is a reference document. A stock list that puts
 * what is running out at the top is a work queue, and the difference is whether
 * anybody opens it on a Tuesday. So the default sort is "closest to its
 * threshold first", the low rows carry amber, and the count of them is the
 * number on the home screen.
 *
 * A threshold of 0 means "not tracked" rather than "alert at zero": a product
 * nobody has set a level for should not be screaming, and a product genuinely
 * meant to hit zero is a special case somebody sets deliberately.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownUp, Boxes, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  DataTable,
  Field,
  Input,
  SearchInput,
  SegmentedControl,
  Select,
  Textarea,
  Modal,
  useToast,
  type Column,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { listStock, moveStock, setThreshold } from '@/lib/db';
import { isOperations, warehouseScope } from '@/lib/roles';
import { count, formatDate } from '@/lib/format';
import type { MovementType, StockPosition } from '@/types';

export default function StockPage() {
  const { user } = useAuth();
  const { warehouses, defaultWarehouse } = useOrg();
  const toast = useToast();

  const allowed = warehouseScope(user);
  const [depot, setDepot] = useState<string>(defaultWarehouse?.id ?? '');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'low' | 'all'>('low');
  /*
   * `null` is a real value here, not "nothing selected".
   *
   * The dialog opens on a POSITION when you tap a row, and on NOTHING when you
   * tap "Record a movement": because the first movement in a new organisation
   * is what creates the first position, so requiring one to exist first was a
   * bootstrap deadlock: the button did nothing at all until somebody had
   * already recorded stock, which is the thing the button is for. So `moving`
   * carries the position and `movingOpen` carries whether the dialog is up.
 */
  const [moving, setMoving] = useState<StockPosition | null>(null);
  const [movingOpen, setMovingOpen] = useState(false);
  /* `?add=<product>` from the Products screen opens the form with that product chosen. */
  const [params, setParams] = useSearchParams();
  const [addProduct, setAddProduct] = useState<string | undefined>(undefined);
  useEffect(() => {
    const id = params.get('add');
    if (!id) return;
    setAddProduct(id);
    setMoving(null);
    setMovingOpen(true);
    const next = new URLSearchParams(params);
    next.delete('add');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const { data, loading, reload } = useAsync(
    () => listStock(depot || undefined),
    [depot],
    { handleError: true },
  );

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = (data ?? []).filter(
      (row) => !needle || row.productName.toLowerCase().includes(needle),
    );

    const low = list.filter((row) => row.threshold > 0 && row.quantity <= row.threshold);
    const source = view === 'low' && low.length ? low : list;

    /*
     * Ordered by how close each line is to running out, not by name.
     *
     * `quantity / threshold` rather than `quantity - threshold`: forty cartons
     * left against a threshold of fifty is a different urgency from four
     * hundred against five hundred, and the subtraction says they are the same.
     * Untracked lines sort last, which is where a line nobody has set a level
     * for belongs.
     */
    return [...source].sort((a, b) => {
      const ra = a.threshold > 0 ? a.quantity / a.threshold : Number.POSITIVE_INFINITY;
      const rb = b.threshold > 0 ? b.quantity / b.threshold : Number.POSITIVE_INFINITY;
      return ra - rb;
    });
  }, [data, search, view]);

  const lowCount = (data ?? []).filter((r) => r.threshold > 0 && r.quantity <= r.threshold).length;
  const canMove = user ? isOperations(user.role) : false;

  const columns: Column<StockPosition>[] = [
    {
      key: 'product',
      header: 'Product',
      sortValue: (row) => row.productName,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-primary">{row.productName}</p>
          <p className="text-[12px] text-muted sm:hidden">{row.unit}</p>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      hideOnMobile: true,
      cell: (row) => <span className="text-[12.5px] text-muted">{row.unit}</span>,
    },
    {
      key: 'quantity',
      header: 'In stock',
      align: 'right',
      sortValue: (row) => row.quantity,
      cell: (row) => {
        const low = row.threshold > 0 && row.quantity <= row.threshold;
        return (
          <span
            className={
              low
                ? 'tabular text-[14px] font-extrabold text-status-warning'
                : 'tabular text-[14px] font-bold text-primary'
            }
          >
            {count(row.quantity)}
          </span>
        );
      },
    },
    {
      key: 'threshold',
      header: 'Threshold',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.threshold,
      cell: (row) =>
        row.threshold > 0 ? (
          <span className="tabular text-[13px] text-muted">{count(row.threshold)}</span>
        ) : (
          <span className="text-[12px] text-muted">not tracked</span>
        ),
    },
    {
      key: 'state',
      header: '',
      cell: (row) =>
        row.threshold > 0 && row.quantity <= row.threshold ? (
          <Badge tone="warning" icon={<AlertTriangle size={11} />}>
            Low
          </Badge>
        ) : null,
    },
    {
      key: 'updated',
      header: 'Last moved',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.updatedAt ?? '',
      cell: (row) => <span className="text-[12px] text-muted">{formatDate(row.updatedAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock"
        description="What is in each depot right now, and what has fallen below its threshold."
        actions={
          canMove && (
            <Button
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => {
                setMoving(null);
                setAddProduct(undefined);
                setMovingOpen(true);
              }}
            >
              Add stock
            </Button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={depot}
            onChange={(e) => setDepot(e.target.value)}
            className="max-w-[240px]"
            aria-label="Depot"
          >
            <option value="">Every depot</option>
            {warehouses
              .filter((w) => !allowed || allowed.includes(w.id))
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </Select>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Find a product…"
            className="max-w-xs"
          />

          <SegmentedControl
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'low', label: lowCount ? `Low (${lowCount})` : 'Low' },
              { value: 'all', label: 'Everything' },
            ]}
          />
        </div>
      </PageHeader>

      {allowed && allowed.length === 0 ? (
        <div className="rounded-2xl border border-hairline surface-card p-8 text-center shadow-card">
          <p className="text-[15px] font-bold text-primary">You are not on a depot yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            An administrator has to assign you one before you can see or move stock. Until then this
            screen has nothing to show you, which is not the same as the depots being empty.
          </p>
        </div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          onRowClick={
            canMove
              ? (row) => {
                  setMoving(row);
                  setMovingOpen(true);
                }
              : undefined
          }
          loading={loading}
          emptyIcon={<Boxes size={22} />}
          emptyTitle={search ? 'Nothing matches that' : 'No stock recorded'}
          emptyDescription={
            search
              ? 'Try a different product name.'
              : 'Record a movement in to open the first position.'
          }
        />
      )}

      <MovementModal
        position={moving}
        initialProductId={addProduct}
        depotId={depot || defaultWarehouse?.id || warehouses[0]?.id || ''}
        open={movingOpen}
        onClose={() => {
          setMovingOpen(false);
          setMoving(null);
          setAddProduct(undefined);
        }}
        onDone={() => {
          setMovingOpen(false);
          setMoving(null);
          setAddProduct(undefined);
          reload();
          toast.success('Stock updated');
        }}
      />
    </div>
  );
}

/**
 * One movement, in or out.
 *
 * The quantity is always positive and `direction` says which way: see
 * `moveStock` in db.ts for why a signed quantity is a bug waiting to happen.
 * The threshold is editable from the same dialog because the moment somebody
 * notices a line is running low is the moment they know what its level should
 * have been, and sending them to a different screen to set it means it never
 * gets set.
 */
function MovementModal({
  position,
  initialProductId,
  depotId,
  open,
  onClose,
  onDone,
}: {
  position: StockPosition | null;
  initialProductId?: string;
  depotId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const { products, warehouses } = useOrg();
  const toast = useToast();
  const allowed = warehouseScope(user);
  const [depot, setDepot] = useState(depotId);

  const [productId, setProductId] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [type, setType] = useState<MovementType>('stock_in');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThresholdValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);

  /* Re-seed when the dialog is opened on a different row: or on none. Without
     this, opening it from the toolbar after tapping a row keeps that row's
     product pre-selected, which is how stock lands against the wrong line. */
  const seedKey = open ? (position?.id ?? `new:${initialProductId ?? ''}`) : null;
  if (seedKey !== seed) {
    setSeed(seedKey);
    setDepot(position?.warehouseId ?? depotId);
    setProductId(position ? '' : (initialProductId ?? ''));
    setQuantity('');
    setThresholdValue('');
    setNote('');
  }

  const chosen = products.find((p) => p.id === (productId || position?.productId));

  const save = async () => {
    if (!user || !chosen || !depot) {
      toast.warning('Missing something', 'Choose the depot and the product.');
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.warning('How many?', 'A movement needs a quantity of at least one.');
      return;
    }

    setBusy(true);
    try {
      await moveStock({
        warehouseId: depot,
        product: chosen,
        type,
        direction,
        quantity: qty,
        note: note.trim() || undefined,
        actor: user,
      });

      const level = Number(threshold);
      if (Number.isFinite(level) && level >= 0 && threshold !== '') {
        await setThreshold(depot, chosen.id, level);
      }

      setQuantity('');
      setNote('');
      onDone();
    } catch (err) {
      toast.error('That movement was not recorded', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={position ? 'Stock movement' : 'Add stock to a depot'}
      note="Every movement is written to the ledger with the balance it left behind. Nothing here can be edited afterwards. A mistake is corrected with a second movement."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy} icon={<ArrowDownUp size={15} />}>
            Record
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Depot" required>
          <Select value={depot} onChange={(e) => setDepot(e.target.value)} disabled={Boolean(position)}>
            <option value="">Choose a depot…</option>
            {warehouses
              .filter((w) => !allowed || allowed.includes(w.id))
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Product" required>
          <Select
            value={productId || position?.productId || ''}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Choose a product…</option>
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
          <Field label="Direction" required>
            <SegmentedControl
              value={direction}
              onChange={(next) => {
                setDirection(next);
                setType(next === 'in' ? 'stock_in' : 'adjustment');
              }}
              options={[
                { value: 'in', label: 'In' },
                { value: 'out', label: 'Out' },
              ]}
            />
          </Field>

          <Field label="Reason" required>
            <Select value={type} onChange={(e) => setType(e.target.value as MovementType)}>
              <option value="stock_in">Stock in</option>
              <option value="transfer">Transfer</option>
              <option value="adjustment">Adjustment</option>
              <option value="return">Return</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity" required hint={chosen?.unit}>
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
            label="Low-stock threshold"
            hint="Optional"
          >
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={threshold}
              onChange={(e) => setThresholdValue(e.target.value)}
              placeholder={position ? String(position.threshold) : '0 = not tracked'}
            />
          </Field>
        </div>

        <Field label="Note" hint="Optional">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Waybill number, who delivered it, why it was adjusted"
          />
        </Field>
      </div>
    </Modal>
  );
}
