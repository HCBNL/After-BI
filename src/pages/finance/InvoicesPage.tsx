/**
 * Invoices — what is owed, and how late it is.
 *
 * THE DEFAULT SORT IS OLDEST OVERDUE FIRST
 *
 * Not newest first, which is what every list defaults to and what makes a
 * debtors screen useless. The invoice that needs a phone call today is the one
 * that has been outstanding longest, and putting last Tuesday's freshly issued
 * invoice above it buries the work under the news.
 *
 * "Overdue" is computed from the due date on read, never stored. A stored
 * status goes stale at midnight and needs a scheduled job to keep honest — and
 * the day that job fails, an aged debtors report quietly shows everything as
 * current.
 */

import { useMemo, useState } from 'react';
import { Ban, CalendarDays, Plus, Printer, Receipt } from 'lucide-react';
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
  Tabs,
  useToast,
  type Column,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import {
  createInvoice,
  listInvoices,
  listOrders,
  listPayments,
  recordPayment,
  updateInvoice,
  voidInvoice,
} from '@/lib/db';
import { isFinance, partnerScope } from '@/lib/roles';
import { invoiceAmendment } from '@/lib/amend';
import { useOrg } from '@/context/OrgContext';
import { useAsync as useAsyncOrders } from '@/hooks/useAsync';
import { daysOverdue, formatDate, naira, nairaShort, todayISO } from '@/lib/format';
import { INVOICE_STATUS_LABEL, type Invoice, type Payment } from '@/types';

/** How a payment arrived, in words rather than as a stored enum. */
const METHOD_LABEL: Record<Payment['method'], string> = {
  transfer: 'Bank transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  card: 'Card',
};
import { printDocument } from '@/lib/print';

type Filter = 'open' | 'overdue' | 'paid' | 'all';

export default function InvoicesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const scope = partnerScope(user);

  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [raising, setRaising] = useState(false);
  const [voiding, setVoiding] = useState<Invoice | null>(null);

  const { data, loading, reload } = useAsync(
    () => listInvoices({ distributorId: scope, max: 400 }),
    [scope],
    { handleError: true },
  );

  const invoices = data ?? [];
  const today = todayISO();

  const isOpen = (i: Invoice) => i.status !== 'paid' && i.status !== 'void' && i.status !== 'draft';

  const counts = useMemo(
    () => ({
      open: invoices.filter(isOpen).length,
      overdue: invoices.filter((i) => isOpen(i) && i.dueOn < today).length,
      paid: invoices.filter((i) => i.status === 'paid').length,
      all: invoices.length,
    }),
    [invoices, today],
  );

  const totals = useMemo(() => {
    const open = invoices.filter(isOpen);
    return {
      outstanding: open.reduce((sum, i) => sum + (i.total - (i.amountPaid ?? 0)), 0),
      overdue: open
        .filter((i) => i.dueOn < today)
        .reduce((sum, i) => sum + (i.total - (i.amountPaid ?? 0)), 0),
      /*
       * The oldest unpaid invoice, in days.
       *
       * One number that says more about an account than the balance does: ₦3m
       * outstanding across invoices raised this week is a healthy account; ₦3m
       * with something 140 days old is a write-off waiting to be recognised.
       */
      oldest: open.reduce((max, i) => Math.max(max, daysOverdue(i.dueOn)), 0),
    };
  }, [invoices, today]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return invoices
      .filter((invoice) => {
        if (filter === 'open' && !isOpen(invoice)) return false;
        if (filter === 'overdue' && !(isOpen(invoice) && invoice.dueOn < today)) return false;
        if (filter === 'paid' && invoice.status !== 'paid') return false;
        if (!needle) return true;
        return (
          invoice.invoiceNumber.toLowerCase().includes(needle) ||
          invoice.distributorName.toLowerCase().includes(needle) ||
          (invoice.orderNumber ?? '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        /* Overdue first, longest overdue at the top; then by due date. */
        const la = daysOverdue(a.dueOn);
        const lb = daysOverdue(b.dueOn);
        if (la !== lb) return lb - la;
        return a.dueOn.localeCompare(b.dueOn);
      });
  }, [invoices, filter, search, today]);

  const canTakePayment = user ? isFinance(user.role) : false;

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice',
      sortValue: (row) => row.invoiceNumber,
      cell: (row) => (
        <div className="min-w-0">
          <p className="tabular truncate text-[13.5px] font-bold text-primary">{row.invoiceNumber}</p>
          <p className="truncate text-[12px] text-muted">{row.distributorName}</p>
        </div>
      ),
    },
    {
      key: 'issued',
      header: 'Issued',
      hideOnMobile: true,
      sortValue: (row) => row.issuedOn,
      cell: (row) => <span className="text-[12.5px] text-muted">{formatDate(row.issuedOn)}</span>,
    },
    {
      key: 'due',
      header: 'Due',
      sortValue: (row) => row.dueOn,
      cell: (row) => {
        const late = daysOverdue(row.dueOn);
        const open = isOpen(row);
        return (
          <div>
            <p className="text-[12.5px] text-secondary">{formatDate(row.dueOn)}</p>
            {open && late > 0 && (
              <p className="text-[11.5px] font-bold text-status-critical">{late} days late</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.total,
      cell: (row) => <span className="tabular text-[13px] text-secondary">{naira(row.total)}</span>,
    },
    {
      key: 'owing',
      header: 'Owing',
      align: 'right',
      sortValue: (row) => row.total - (row.amountPaid ?? 0),
      cell: (row) => (
        <span className="tabular text-[13.5px] font-bold text-primary">
          {naira(row.total - (row.amountPaid ?? 0))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const late = isOpen(row) && row.dueOn < today;
        return (
          <Badge
            tone={
              row.status === 'paid'
                ? 'good'
                : late
                  ? 'critical'
                  : row.status === 'part_paid'
                    ? 'gold'
                    : 'neutral'
            }
          >
            {late ? 'Overdue' : INVOICE_STATUS_LABEL[row.status]}
          </Badge>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Raised, issued, part paid and overdue — with the days each one is late."
        actions={
          canTakePayment && (
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setRaising(true)}>
              Raise an invoice
            </Button>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Outstanding"
          value={nairaShort(totals.outstanding)}
          icon={<Receipt size={16} />}
          hint="Issued and not yet paid"
        />
        <StatTile
          label="Overdue"
          value={nairaShort(totals.overdue)}
          tone={totals.overdue ? 'critical' : 'good'}
          hint={totals.overdue ? 'Past the due date' : 'Nothing is late'}
        />
        <StatTile
          label="Oldest"
          value={totals.oldest ? `${totals.oldest}d` : '—'}
          tone={totals.oldest > 60 ? 'critical' : totals.oldest > 30 ? 'warning' : 'good'}
          hint="Longest anything has been overdue"
        />
      </div>

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Invoice number, distributor or order…"
          className="max-w-sm"
        />
      </div>

      <Tabs
        className="mb-4"
        active={filter}
        onChange={(id) => setFilter(id as Filter)}
        items={[
          { id: 'open', label: 'Open', count: counts.open },
          { id: 'overdue', label: 'Overdue', count: counts.overdue },
          { id: 'paid', label: 'Paid', count: counts.paid },
          { id: 'all', label: 'All', count: counts.all },
        ]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={canTakePayment ? (row) => setPaying(row) : undefined}
        loading={loading}
        emptyIcon={<Receipt size={22} />}
        emptyTitle={search ? 'Nothing matches that' : 'No invoices here'}
        emptyDescription={
          filter === 'overdue' ? 'Nothing is past its due date. Good.' : 'Invoices appear here once raised.'
        }
      />

      <PaymentModal
        invoice={paying}
        onClose={() => setPaying(null)}
        onVoid={(invoice) => {
          setPaying(null);
          setVoiding(invoice);
        }}
        onSaved={() => {
          setPaying(null);
          reload();
          toast.success('Payment recorded');
        }}
      />

      <RaiseInvoiceModal
        open={raising}
        onClose={() => setRaising(false)}
        onRaised={() => {
          setRaising(false);
          reload();
          toast.success('Invoice raised');
        }}
      />

      <ConfirmDialog
        open={Boolean(voiding)}
        onClose={() => setVoiding(null)}
        title="Void this invoice?"
        message="It stays in the list as void rather than disappearing, because its number is in an accounts ledger somewhere. An invoice with a payment against it cannot be voided at all — that needs a credit note."
        confirmLabel="Void invoice"
        tone="danger"
        onConfirm={async () => {
          if (!voiding || !user) return;
          try {
            await voidInvoice(voiding.id, user);
            setVoiding(null);
            reload();
            toast.success('Invoice voided');
          } catch (err) {
            setVoiding(null);
            toast.error('Not voided', err instanceof Error ? err.message : undefined);
          }
        }}
      />
    </div>
  );
}

/**
 * Raising an invoice, usually from an order that has already shipped.
 *
 * Picking a fulfilled order copies its lines and its total — a snapshot, like
 * every other one in this app, so the invoice keeps saying what it said on the
 * day it was issued whatever happens to the order afterwards. The due date
 * comes from the distributor's own payment terms rather than being typed, which
 * is the field people get wrong most often.
 */
function RaiseInvoiceModal({
  open,
  onClose,
  onRaised,
}: {
  open: boolean;
  onClose: () => void;
  onRaised: () => void;
}) {
  const { user } = useAuth();
  const { distributors } = useOrg();
  const toast = useToast();

  const [distributorId, setDistributorId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [issuedOn, setIssuedOn] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  /* Fulfilled orders that have not already been invoiced. Offering one twice is
     how a distributor gets billed twice for the same delivery. */
  const { data: orders } = useAsyncOrders(
    async () => {
      const [fulfilled, invoices] = await Promise.all([
        listOrders({ status: 'fulfilled', max: 200 }),
        listInvoices({ max: 500 }),
      ]);
      const invoiced = new Set(invoices.map((i) => i.orderId).filter(Boolean));
      return fulfilled.filter((o) => !invoiced.has(o.id));
    },
    [open],
  );

  const distributor = distributors.find((d) => d.id === distributorId);
  const forThisAccount = (orders ?? []).filter((o) => !distributorId || o.distributorId === distributorId);
  const order = (orders ?? []).find((o) => o.id === orderId);

  const save = async () => {
    if (!user || !distributor) {
      toast.warning('Which account?', 'An invoice needs a distributor.');
      return;
    }
    if (!order) {
      toast.warning('Which order?', 'Pick a fulfilled order to invoice.');
      return;
    }
    setBusy(true);
    try {
      await createInvoice({ distributor, order, issuedOn, actor: user });
      setOrderId('');
      onRaised();
    } catch (err) {
      toast.error('Not raised', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const terms = distributor?.paymentTermsDays ?? 30;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise an invoice"
      note="From a fulfilled order. The lines and the total are copied onto the invoice, so it keeps saying what it said today whatever happens to the order later."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Raise invoice
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Distributor" required>
          <Select
            value={distributorId}
            onChange={(e) => {
              setDistributorId(e.target.value);
              setOrderId('');
            }}
          >
            <option value="">Choose…</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.company}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Order" required hint="Fulfilled, not yet invoiced">
          <Select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">Choose…</option>
            {forThisAccount.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {naira(o.total)}
              </option>
            ))}
          </Select>
        </Field>

        {distributorId && forThisAccount.length === 0 && (
          <Alert tone="info" title="Nothing left to invoice on this account">
            Every fulfilled order for {distributor?.company} already has an invoice against it.
          </Alert>
        )}

        <Field label="Issue date" required>
          <Input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
        </Field>

        {distributor && (
          <p className="text-[12px] leading-snug text-muted">
            Due {terms} days after the issue date, from {distributor.company}'s payment terms. Change
            the terms on the distributor record rather than here, so every future invoice follows.
          </p>
        )}

        {order && (
          <div className="flex items-center justify-between rounded-xl border border-hairline surface-sunken px-4 py-3">
            <span className="text-[12.5px] text-muted">
              {order.lines.length} line{order.lines.length === 1 ? '' : 's'}
            </span>
            <span className="tabular text-[16px] font-extrabold text-primary">{naira(order.total)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PaymentModal({
  invoice,
  onClose,
  onSaved,
  onVoid,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onSaved: () => void;
  onVoid: (invoice: Invoice) => void;
}) {
  const { user } = useAuth();
  const { settings, distributorById } = useOrg();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Payment['method']>('transfer');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  /* Correcting the dates on the invoice itself, rather than taking money. */
  const [editingDates, setEditingDates] = useState(false);
  const [dueOn, setDueOn] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [seed, setSeed] = useState<string | undefined>(undefined);

  /*
   * ABOVE the `if (!invoice) return null` below, deliberately.
   *
   * A hook under an early return changes the hook count between the render
   * where nothing is selected and the render where something is — React error
   * #310, and it is exactly the bug the order drawer shipped with. Every hook
   * in this component runs on every render; only the markup is conditional.
   */
  const { data: payments } = useAsync(
    async () => (invoice ? listPayments(invoice.id) : []),
    [invoice?.id, invoice?.amountPaid],
  );

  if (invoice && invoice.id !== seed) {
    setSeed(invoice.id);
    setEditingDates(false);
    setDueOn(invoice.dueOn);
    setIssuedOn(invoice.issuedOn);
  }

  if (!invoice) return null;

  const owing = invoice.total - (invoice.amountPaid ?? 0);
  const amend = invoiceAmendment(user, invoice);
  const paid = payments ?? [];

  const save = async () => {
    if (!user) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.warning('How much?', 'A payment needs an amount.');
      return;
    }
    setBusy(true);
    try {
      await recordPayment({
        invoice,
        amount: value,
        method,
        reference: reference.trim() || undefined,
        paidOn,
        actor: user,
      });
      setAmount('');
      setReference('');
      onSaved();
    } catch (err) {
      toast.error('Not recorded', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Payment against ${invoice.invoiceNumber}`}
      description={`${invoice.distributorName} · ${naira(owing)} owing of ${naira(invoice.total)}`}
      footer={
        <>
          {/*
            Voiding lives here rather than on the row, because it is a decision
            you make while looking at what is owed. It is refused outright once
            any money has arrived — see `voidInvoice`.
          */}
          {amend.canCancel && (invoice.amountPaid ?? 0) === 0 && invoice.status !== 'void' && (
            <Button
              variant="ghost"
              className="mr-auto"
              icon={<Ban size={15} />}
              disabled={busy}
              onClick={() => onVoid(invoice)}
            >
              Void
            </Button>
          )}
          {/*
            The printed invoice is what actually gets paid — it is emailed, it
            is carried to a bank, it is filed. A voided one prints too, marked
            as such, because somebody is usually printing it to prove it was
            cancelled.
          */}
          {settings && (
            <Button
              variant="outline"
              icon={<Printer size={15} />}
              disabled={busy}
              className={amend.canCancel && (invoice.amountPaid ?? 0) === 0 && invoice.status !== 'void' ? undefined : 'mr-auto'}
              onClick={() => {
                try {
                  printDocument({
                    kind: 'invoice',
                    invoice,
                    distributor: distributorById(invoice.distributorId) ?? null,
                    company: { settings, preparedBy: settings.name },
                  });
                } catch (err) {
                  toast.error('Could not print', err instanceof Error ? err.message : undefined);
                }
              }}
            >
              Print
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy} disabled={invoice.status === 'void'}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {invoice.amendedAt && (
          <Alert tone="warning" title="This invoice was amended after it was issued" defaultOpen>
            Changed by {invoice.amendedBy ?? 'an administrator'}.
          </Alert>
        )}

        {invoice.status === 'void' && (
          <Alert tone="critical" title="This invoice has been voided" defaultOpen>
            It is kept rather than deleted because its number is in an accounts ledger.
          </Alert>
        )}

        {/*
          THE DUE DATE IS THE FIELD PEOPLE GET WRONG.
          
          It is derived from the distributor's payment terms when the invoice is
          raised, which is right almost always — and wrong whenever somebody
          agreed something different on the phone. Without this the only remedy
          was to void a correct invoice and raise it again under a new number,
          which is how an accounts ledger ends up with gaps nobody can explain.
        */}
        {amend.canEdit && !editingDates && invoice.status !== 'void' && (
          <button
            type="button"
            onClick={() => setEditingDates(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-hairline px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)]"
          >
            <CalendarDays size={15} />
            Correct the issue or due date
          </button>
        )}

        {editingDates && (
          <div className="space-y-3 rounded-xl border border-hairline surface-sunken p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Issued on" required>
                <Input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
              </Field>
              <Field label="Due on" required>
                <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                loading={busy}
                onClick={async () => {
                  if (!user) return;
                  setBusy(true);
                  try {
                    await updateInvoice(
                      invoice.id,
                      { issuedOn, dueOn },
                      user,
                      { settled: amend.stage === 'settled' },
                    );
                    setEditingDates(false);
                    onSaved();
                  } catch (err) {
                    toast.error('Not saved', err instanceof Error ? err.message : undefined);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Save dates
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditingDates(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <Field label="Amount" required>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            leading={<span className="text-[13px]">₦</span>}
            placeholder={String(owing)}
          />
        </Field>

        {/*
          A part payment is normal and is not an error.

          Nigerian distributors pay in instalments against a single invoice as a
          matter of routine, so there is no validation stopping a smaller
          amount. `recordPayment` derives part_paid vs paid from the running
          total, server-side, with `increment` — so two clerks posting at once
          cannot lose one of the transfers.
        */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
              <option value="transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </Select>
          </Field>
          <Field label="Date received" required>
            <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
        </div>

        <Field label="Reference" hint="Optional">
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Teller or transfer reference"
          />
        </Field>

        {/*
          WHAT HAS ALREADY BEEN PAID, NOT JUST HOW MUCH.

          The drawer showed a single `amountPaid` figure, which answers "how
          much" and none of the questions a clerk actually has in front of it:
          was that one transfer or three, which teller reference was it, has
          today's already been entered by somebody else. Posting the same
          transfer twice is the ordinary consequence of not being able to see
          the first one.
        */}
        {paid.length > 0 && (
          <div>
            <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              {paid.length} payment{paid.length === 1 ? '' : 's'} received
            </h3>
            <ul className="surface-card divide-y divide-[var(--border-hairline)] overflow-hidden rounded-xl border border-hairline">
              {paid.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-primary">
                      {formatDate(payment.paidOn)} · {METHOD_LABEL[payment.method]}
                    </p>
                    {payment.reference && (
                      <p className="truncate text-[11.5px] text-muted">{payment.reference}</p>
                    )}
                  </div>
                  <p className="tabular shrink-0 text-[13px] font-bold text-primary">
                    {naira(payment.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
