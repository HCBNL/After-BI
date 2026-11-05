/**
 * Adjust the price on an order that has gone out but is not fully paid.
 *
 * The order and its invoice stay exactly as issued (a fulfilled order is
 * locked for good). Instead, each line can be given a new, lower price per
 * unit; the difference becomes a numbered credit note (CN202611001) that
 * comes off what the customer owes, and prints with the old price, the new
 * price and the reason. A second adjustment starts from the price after the
 * first, so notes stack correctly.
 *
 * For a fulfilled order with no invoice yet, the invoice is raised first, in
 * one tap, because the credit has to come off a bill.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, ReceiptText } from 'lucide-react';
import { Alert, Button, Field, Input, Modal, useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { createInvoice, invoiceForOrder, issueCreditNote, listCreditNotes } from '@/lib/db';
import { printDocument } from '@/lib/print';
import { applyCredits, kobo } from '@/lib/pricing';
import { naira } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { CreditNote, CreditNoteLine, Invoice, Order } from '@/types';

const REASONS = ['Market price drop', 'Negotiated discount', 'Bulk order discount', 'Damaged packaging'];

export function AdjustPriceModal({
  open,
  onClose,
  onDone,
  invoice: givenInvoice,
  order,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  invoice?: Invoice | null;
  /** When opened from an order: used to raise its invoice if there is none yet. */
  order?: Order | null;
}) {
  const { user } = useAuth();
  const { settings, distributorById } = useOrg();
  const toast = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(givenInvoice ?? null);
  const [earlier, setEarlier] = useState<CreditNote[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<CreditNote | null>(null);

  /* Fresh each time it opens; a reload behind it (after saving) must not wipe the result. */
  const given = useRef(givenInvoice);
  given.current = givenInvoice;
  useEffect(() => {
    if (!open) return;
    setInvoice(given.current ?? null);
    setPrices({});
    setReason('');
    setIssued(null);
  }, [open]);

  /* Opened from an order before its invoice had loaded: take it once it arrives. */
  useEffect(() => {
    if (open && !invoice && givenInvoice) setInvoice(givenInvoice);
  }, [open, invoice, givenInvoice]);

  /* Earlier credit notes on this invoice, so prices start where they now stand. */
  useEffect(() => {
    if (!open || !invoice) return;
    void listCreditNotes({ invoiceId: invoice.id, distributorId: invoice.distributorId }).then(setEarlier);
  }, [open, invoice]);

  const rows = useMemo(() => {
    if (!invoice) return [];
    /* Same sharing rule as the order and the proforma: see `applyCredits`. */
    const applied = applyCredits(invoice.lines, earlier);
    return invoice.lines.map((line, index) => {
      const current = applied[index].unitPrice;
      const key = `${line.productId}-${index}`;
      const typed = prices[key];
      const next = typed === undefined || typed.trim() === '' ? current : kobo(Number(typed));
      const valid = Number.isFinite(next) && next >= 0 && next <= current;
      return { key, line, current, next: valid ? next : current, invalid: !valid, credit: valid ? kobo((current - next) * line.quantity) : 0 };
    });
  }, [invoice, earlier, prices]);

  const total = kobo(rows.reduce((sum, r) => sum + r.credit, 0));
  const owing = invoice ? kobo(invoice.total - (invoice.amountPaid ?? 0)) : 0;
  const tooMuch = total > owing + 0.009;

  const raiseInvoice = async () => {
    if (!order || !user) return;
    const distributor = distributorById(order.distributorId);
    if (!distributor) return;
    setBusy(true);
    try {
      await createInvoice({ distributor, order, actor: user });
      setInvoice(await invoiceForOrder(order));
      toast.success('Invoice raised', 'Now set the new prices.');
    } catch (err) {
      toast.error('Invoice not raised', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!user || !invoice) return;
    const lines: CreditNoteLine[] = rows
      .filter((r) => r.credit > 0)
      .map((r) => ({
        productId: r.line.productId,
        productName: r.line.productName,
        unit: r.line.unit,
        quantity: r.line.quantity,
        fromPrice: r.current,
        toPrice: r.next,
        amount: r.credit,
      }));
    setBusy(true);
    try {
      const { id, creditNumber } = await issueCreditNote({ invoice, lines, reason, actor: user });
      const note: CreditNote = {
        id,
        creditNumber,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderId: invoice.orderId,
        orderNumber: invoice.orderNumber,
        distributorId: invoice.distributorId,
        distributorName: invoice.distributorName,
        lines,
        total,
        reason: reason.trim(),
        issuedOn: new Date().toISOString().slice(0, 10),
        createdBy: user.id,
        createdByName: `${user.firstName} ${user.lastName}`,
        createdAt: new Date().toISOString(),
      };
      setIssued(note);
      toast.success(`Credit note ${creditNumber} issued`, `${naira(total, true)} off ${invoice.invoiceNumber}.`);
      onDone();
    } catch (err) {
      toast.error('No credit note issued', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const printNote = (note: CreditNote) => {
    if (!settings || !invoice) return;
    printDocument({
      kind: 'credit',
      note,
      invoice: { ...invoice, amountPaid: kobo((invoice.amountPaid ?? 0) + (issued?.id === note.id ? note.total : 0)) },
      distributor: distributorById(invoice.distributorId) ?? null,
      company: { settings },
    });
  };

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Adjust price"
      note="For goods already delivered and not fully paid. The order and invoice stay as issued; the new price is recorded on a numbered credit note that comes off what the customer owes."
      footer={
        issued ? (
          <>
            <Button variant="outline" icon={<Printer size={15} />} onClick={() => printNote(issued)}>
              Print credit note
            </Button>
            <Button onClick={onClose}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              icon={<ReceiptText size={15} />}
              loading={busy}
              disabled={!invoice || total <= 0 || tooMuch || !reason.trim() || rows.some((r) => r.invalid)}
              onClick={() => void save()}
            >
              {total > 0 ? `Issue credit note (${naira(total, true)})` : 'Issue credit note'}
            </Button>
          </>
        )
      }
    >
      {issued ? (
        <div className="space-y-3 text-center">
          <p className="text-title font-semibold text-primary">Credit note {issued.creditNumber} issued</p>
          <p className="text-body text-secondary">
            {naira(issued.total, true)} has come off {issued.invoiceNumber}. It shows on the invoice, the customer's statement and
            their balance.
          </p>
        </div>
      ) : !invoice ? (
        <div className="space-y-4">
          <Alert tone="info" title="This order has no invoice yet" defaultOpen>
            The new price comes off the customer's bill, so the invoice is raised first. It copies the order exactly as delivered.
          </Alert>
          {order && (
            <Button loading={busy} onClick={() => void raiseInvoice()}>
              Raise the invoice and continue
            </Button>
          )}
        </div>
      ) : owing <= 0 ? (
        <Alert tone="info" title="This invoice is already settled" defaultOpen>
          Prices can only be adjusted while something is still owed.
        </Alert>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-hairline surface-sunken px-4 py-3">
            <p className="text-label text-secondary">
              {invoice.invoiceNumber}
              {invoice.orderNumber ? ` · ${invoice.orderNumber}` : ''} · {invoice.distributorName}
            </p>
            <p className="tabular text-label font-semibold text-primary">{naira(owing, true)} still owed</p>
          </div>

          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.key} className="rounded-xl border border-hairline surface-card p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-primary">{r.line.productName}</p>
                    <p className="tabular text-caption text-muted">
                      {r.line.quantity.toLocaleString('en-NG')} × {naira(r.current, true)} now
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-caption font-medium text-muted">
                    New price
                    <span className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-caption text-muted">₦</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={prices[r.key] ?? ''}
                        placeholder={String(r.current)}
                        onChange={(e) => setPrices((p) => ({ ...p, [r.key]: e.target.value }))}
                        aria-label={`New price per unit for ${r.line.productName}`}
                        className={cn(
                          'tabular h-9 w-28 rounded-lg border bg-transparent pl-6 pr-2 text-body font-semibold text-primary',
                          r.invalid ? 'border-status-critical' : 'border-hairline',
                        )}
                      />
                    </span>
                  </label>
                </div>
                {r.invalid && <p className="mt-1.5 text-caption text-status-critical">The new price must be lower than {naira(r.current, true)}. To charge more, raise a new order.</p>}
                {r.credit > 0 && (
                  <p className="tabular mt-1.5 text-caption font-semibold text-primary">
                    {naira(r.current - r.next, true)} off per unit · {naira(r.credit, true)} credit
                  </p>
                )}
              </li>
            ))}
          </ul>

          <Field label="Reason" required hint="Printed on the credit note, so the customer and your accounts see why the price changed.">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Market price drop" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-caption font-medium transition-colors',
                    reason === r ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200' : 'border-hairline text-secondary hover:text-primary',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </Field>

          <div className="space-y-1 rounded-xl border border-hairline px-4 py-3 text-label">
            <div className="flex justify-between text-secondary">
              <span>Still owed now</span>
              <span className="tabular">{naira(owing, true)}</span>
            </div>
            <div className="flex justify-between font-semibold text-primary">
              <span>Credit note</span>
              <span className="tabular">({naira(total, true)})</span>
            </div>
            <div className="flex justify-between border-t border-hairline pt-1.5 text-body font-semibold text-primary">
              <span>Owed after</span>
              <span className="tabular">{naira(Math.max(0, owing - total), true)}</span>
            </div>
          </div>
          {tooMuch && <p className="text-caption text-status-critical">That is more than is still owed. Lower the credit, or record the rest as a return.</p>}
          {earlier.length > 0 && (
            <p className="text-caption text-muted">
              Earlier on this invoice: {earlier.map((n) => `${n.creditNumber} (${naira(n.total)})`).join(', ')}.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
