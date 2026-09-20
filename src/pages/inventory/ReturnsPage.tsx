/**
 * Returns — goods coming back, and the compensation that settles them.
 *
 * A return is two movements and a credit: stock back into a depot, and money
 * back off an account. Recording only the first is how a warehouse's numbers
 * stay right while the distributor's statement stays wrong — which is the
 * complaint that reaches the MD.
 *
 * THIS IS ALSO WHERE CLAIMS ENDED UP
 *
 * There was a Claims feature here: file, review, approve, reject, with its own
 * collection, screen, drawer and timeline. It is gone, because the argument
 * behind a claim is settled between people — on the phone, at the depot gate,
 * over WhatsApp — and software that models the argument adds process without
 * adding truth. What software is actually needed for is the OUTCOME, and the
 * outcome is exactly this: goods come back and a credit is raised, or they do
 * not and a discount is applied on the next order instead.
 *
 * So the reasons below are the old claim taxonomy — damage, shortage, expiry,
 * wrong item — landing on the record that does something about them.
 */

import { useMemo, useState } from 'react';
import { Check, Plus, RotateCcw, Truck, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Drawer,
  Field,
  Input,
  Modal,
  SearchInput,
  Select,
  Tabs,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { createReturn, decideReturn, listReturns } from '@/lib/db';
import { isOperations, partnerScope } from '@/lib/roles';
import { returnAmendment } from '@/lib/amend';
import { useOrg } from '@/context/OrgContext';
import { formatDate, naira, count } from '@/lib/format';
import type { ReturnRecord, ReturnStatus } from '@/types';

const TONE: Record<ReturnStatus, 'neutral' | 'gold' | 'good' | 'critical'> = {
  requested: 'gold',
  approved: 'good',
  received: 'good',
  rejected: 'critical',
};

export default function ReturnsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const scope = partnerScope(user);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<ReturnRecord | null>(null);
  const [raising, setRaising] = useState(false);

  const { data, loading, reload } = useAsync(() => listReturns(scope), [scope], { handleError: true });
  const returns = data ?? [];
  const current = open ? (returns.find((r) => r.id === open.id) ?? open) : null;

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return returns.filter((row) => {
      if (filter === 'open' && (row.status === 'received' || row.status === 'rejected')) return false;
      if (!needle) return true;
      return (
        row.returnNumber.toLowerCase().includes(needle) ||
        row.distributorName.toLowerCase().includes(needle) ||
        row.productName.toLowerCase().includes(needle)
      );
    });
  }, [returns, filter, search]);

  const columns: Column<ReturnRecord>[] = [
    {
      key: 'number',
      header: 'Return',
      sortValue: (row) => row.returnNumber,
      cell: (row) => (
        <div className="min-w-0">
          <p className="tabular truncate text-[13.5px] font-bold text-primary">{row.returnNumber}</p>
          <p className="truncate text-[12px] text-muted">{row.distributorName}</p>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      sortValue: (row) => row.productName,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-primary">{row.productName}</p>
          <p className="tabular text-[12px] text-muted">{count(row.quantity)}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      hideOnMobile: true,
      cell: (row) => <span className="text-[12.5px] text-secondary">{row.reason}</span>,
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      sortValue: (row) => row.creditValue ?? 0,
      cell: (row) => (
        <span className="tabular text-[13.5px] font-bold text-primary">
          {row.creditValue ? naira(row.creditValue) : '—'}
        </span>
      ),
    },
    {
      key: 'when',
      header: 'Raised',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.createdAt,
      cell: (row) => <span className="text-[12px] text-muted">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <Badge tone={TONE[row.status]}>{row.status}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Returns"
        description="Goods coming back — damage, shortage, expiry — and the credit each one raises."
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setRaising(true)}>
            Raise a return
          </Button>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Return number, distributor or product…"
          className="max-w-sm"
        />
      </PageHeader>

      <Tabs
        className="mb-4"
        active={filter}
        onChange={(id) => setFilter(id as 'open' | 'all')}
        items={[
          { id: 'open', label: 'Open', count: returns.filter((r) => r.status === 'requested' || r.status === 'approved').length },
          { id: 'all', label: 'All', count: returns.length },
        ]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={setOpen}
        loading={loading}
        emptyIcon={<RotateCcw size={22} />}
        emptyTitle={filter === 'open' ? 'Nothing coming back' : 'No returns'}
        emptyDescription="A return raised against a delivery appears here until the credit is settled."
      />

      <ReturnDrawer record={current} onClose={() => setOpen(null)} onChanged={reload} />

      <RaiseReturnModal
        open={raising}
        onClose={() => setRaising(false)}
        onRaised={() => {
          setRaising(false);
          reload();
          toast.success('Return raised', 'Operations will decide whether it can come back.');
        }}
      />
    </div>
  );
}

/**
 * One return, and the decision it is waiting on.
 *
 * `received` is the status that puts stock back, not `approved`. Approving a
 * return is agreeing it may come back; receiving it is somebody at the depot
 * counting it onto a shelf. Crediting stock on approval is how a warehouse ends
 * up with cartons it can sell twice — so the depot has to be named at the
 * moment of receipt, which is why that step asks for one.
 */
function ReturnDrawer({
  record,
  onClose,
  onChanged,
}: {
  record: ReturnRecord | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const { warehouses, defaultWarehouse } = useOrg();
  const toast = useToast();

  const [credit, setCredit] = useState('');
  const [depot, setDepot] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | 'receive'>(null);

  if (!record) return null;

  const amend = returnAmendment(user, record);
  const canDecide = user ? isOperations(user.role) || user.role === 'staff' : false;

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      onChanged();
      toast.success(done);
    } catch (err) {
      toast.error('That did not go through', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open onClose={onClose} title={record.returnNumber} width="max-w-lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-primary">{record.distributorName}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Raised by {record.requestedByName} · {formatDate(record.createdAt)}
            </p>
          </div>
          <Badge tone={TONE[record.status]}>{record.status}</Badge>
        </div>

        <div className="rounded-2xl border border-hairline surface-sunken p-4">
          <p className="text-[14px] font-bold text-primary">{record.productName}</p>
          <p className="tabular mt-0.5 text-[13px] text-muted">{count(record.quantity)} coming back</p>
          <p className="mt-2 text-[13px] leading-relaxed text-secondary">{record.reason}</p>
          {record.creditValue ? (
            <p className="tabular mt-3 text-[15px] font-extrabold text-primary">
              {naira(record.creditValue)} credit
            </p>
          ) : null}
        </div>

        {canDecide && record.status === 'requested' && (
          <div className="space-y-3 rounded-2xl border border-hairline p-4">
            <Field label="Credit to raise" hint="Optional at this stage">
              <Input
                type="number"
                min={0}
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                leading={<span className="text-[13px]">₦</span>}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={<Check size={15} />}
                loading={busy}
                onClick={() =>
                  run(
                    () =>
                      decideReturn(record.id, 'approved', user!, {
                        creditValue: credit === '' ? undefined : Number(credit),
                      }),
                    'Return approved',
                  )
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<X size={15} />}
                loading={busy}
                onClick={() => run(() => decideReturn(record.id, 'rejected', user!), 'Return rejected')}
              >
                Reject
              </Button>
            </div>
          </div>
        )}

        {canDecide && record.status === 'approved' && (
          <div className="space-y-3 rounded-2xl border border-hairline surface-sunken p-4">
            <p className="text-[13.5px] font-bold text-primary">Receive it back into stock</p>
            <p className="text-[12.5px] leading-snug text-muted">
              This adds {count(record.quantity)} of {record.productName} to the depot you pick and
              writes it to the ledger. Only do it once the goods are physically counted in.
            </p>
            <Field label="Depot">
              <Select value={depot || defaultWarehouse?.id || ''} onChange={(e) => setDepot(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              size="sm"
              icon={<Truck size={15} />}
              disabled={busy || !warehouses.length}
              onClick={() => setConfirm('receive')}
            >
              Mark received
            </Button>
          </div>
        )}

        {!canDecide && amend.reason && (
          <p className="rounded-xl border border-hairline surface-sunken px-3.5 py-2.5 text-[12.5px] leading-snug text-muted">
            {amend.reason}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'receive'}
        onClose={() => setConfirm(null)}
        title="Receive these goods back?"
        message="The quantity goes into the depot and into the ledger. The ledger entry cannot be edited afterwards — a miscount is corrected with a stock adjustment."
        confirmLabel="Receive"
        loading={busy}
        onConfirm={() => {
          setConfirm(null);
          void run(
            () =>
              decideReturn(record.id, 'received', user!, {
                warehouseId: depot || defaultWarehouse!.id,
              }),
            'Received back into stock',
          );
        }}
      />
    </Drawer>
  );
}

function RaiseReturnModal({
  open,
  onClose,
  onRaised,
}: {
  open: boolean;
  onClose: () => void;
  onRaised: () => void;
}) {
  const { user } = useAuth();
  const { distributors, products } = useOrg();
  const toast = useToast();

  const scoped = user?.distributorId;
  const [distributorId, setDistributorId] = useState(scoped ?? '');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reasonType, setReasonType] = useState('Damaged in transit');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const distributor = distributors.find((d) => d.id === distributorId);
  const product = products.find((p) => p.id === productId);

  const save = async () => {
    const qty = Number(quantity);
    if (!user || !distributor || !product || !(qty > 0)) {
      toast.warning('Missing something', 'A return needs an account, a product and a quantity.');
      return;
    }
    setBusy(true);
    try {
      /* The heading and the detail, stored as one sentence — the list screen has
         one column for it and a reader wants the category first. */
      const full = reason.trim() ? `${reasonType} — ${reason.trim()}` : reasonType;
      await createReturn({ distributor, product, quantity: qty, reason: full, actor: user });
      setQuantity('');
      setReason('');
      onRaised();
    } catch (err) {
      toast.error('Not raised', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise a return"
      note="This is how damage, shortages and expiry are settled: the goods come back and a credit is raised. Nothing moves in stock until somebody receives them at a depot."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Raise return
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Account" required>
          <Select value={distributorId} disabled={Boolean(scoped)} onChange={(e) => setDistributorId(e.target.value)}>
            <option value="">Choose…</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.company}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product" required>
            <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Choose…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity" required hint={product?.unit}>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
        </div>

        <Field label="Why" required>
          <Select value={reasonType} onChange={(e) => setReasonType(e.target.value)}>
            <option>Damaged in transit</option>
            <option>Short delivery</option>
            <option>Wrong item shipped</option>
            <option>Near or past expiry</option>
            <option>Not selling</option>
            <option>Other</option>
          </Select>
        </Field>

        <Field label="Detail" hint="What the person deciding this will read">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Two pallets crushed against the tailgate — waybill 88213, driver signed for 120."
          />
        </Field>
      </div>
    </Modal>
  );
}
