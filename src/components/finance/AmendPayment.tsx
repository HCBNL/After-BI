/**
 * Correcting a payment that was posted with a mistake: the wrong amount, date,
 * method or reference. Or reversing it, when it should not have been posted
 * at all. Super admin and finance manager only (`PAYMENT_CORRECTORS`); the
 * rules hold the same line.
 *
 * Every correction asks why, and the payment keeps its history: what it said
 * before, who changed it, when and why. Shown under the form, so the next
 * person to open it sees the whole story.
 */
import { useState } from 'react';
import { History, Undo2 } from 'lucide-react';
import { Button, ConfirmDialog, Field, Input, Modal, Select, Textarea, useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { amendPayment, PAYMENT_CORRECTORS } from '@/lib/db';
import { formatDate, formatDateTime, naira, todayISO } from '@/lib/format';
import type { Payment } from '@/types';

const METHODS: { value: Payment['method']; label: string }[] = [
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
];
const METHOD_LABEL = Object.fromEntries(METHODS.map((m) => [m.value, m.label])) as Record<string, string>;

/** Whether this person may correct this payment. */
export function canCorrectPayment(role: string | undefined, payment: Pick<Payment, 'method' | 'reversed'>): boolean {
  return Boolean(role && PAYMENT_CORRECTORS.includes(role as never) && payment.method !== 'credit' && !payment.reversed);
}

export function AmendPaymentModal({
  payment,
  onClose,
  onDone,
}: {
  payment: Payment;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [amount, setAmount] = useState(String(payment.amount));
  const [paidOn, setPaidOn] = useState(payment.paidOn);
  const [method, setMethod] = useState<Payment['method']>(payment.method);
  const [reference, setReference] = useState(payment.reference ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reversing, setReversing] = useState(false);

  const value = Number(amount.replace(/,/g, ''));
  const changed =
    value !== payment.amount || paidOn !== payment.paidOn || method !== payment.method || reference.trim() !== (payment.reference ?? '');

  const run = async (reverse: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      await amendPayment({
        payment,
        reverse,
        changes: reverse ? undefined : { amount: value, paidOn, method, reference },
        reason,
        actor: user,
      });
      toast.success(reverse ? 'Payment reversed' : 'Payment corrected', `${payment.invoiceNumber}. The invoice and statement are updated.`);
      onDone();
    } catch (err) {
      toast.error(reverse ? 'Not reversed' : 'Not corrected', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
      setReversing(false);
    }
  };

  const history = [...(payment.amendments ?? [])].reverse();

  return (
    <Modal
      open
      onClose={onClose}
      title="Correct payment"
      footer={
        <>
          <Button variant="ghost" icon={<Undo2 size={15} />} onClick={() => setReversing(true)} disabled={busy || !reason.trim()} className="mr-auto">
            Reverse
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void run(false)} loading={busy && !reversing} disabled={!changed || !reason.trim() || !(value > 0)}>
            Save correction
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-label text-secondary">
          {`Against ${payment.invoiceNumber}. Posted ${formatDate(payment.paidOn)} by ${payment.recordedByName}, ${naira(payment.amount, true)}.`}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (₦)" required>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Date paid" required>
            <Input type="date" value={paidOn} max={todayISO()} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Teller or transfer reference" />
          </Field>
        </div>

        <Field label="Why" required hint="Kept with the payment for anyone who checks it later.">
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Posted ₦250,000 instead of ₦25,000." />
        </Field>

        {history.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-muted">
              <History size={13} aria-hidden /> Corrected before
            </p>
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.at} className="rounded-xl border border-hairline px-3.5 py-2.5 text-caption">
                  <p className="text-secondary">
                    <span className="font-semibold text-primary">{h.byName}</span>
                    {` · ${formatDateTime(h.at)}`}
                  </p>
                  <p className="mt-0.5 text-primary">
                    {`${naira(h.from.amount, true)} · ${formatDate(h.from.paidOn)} · ${METHOD_LABEL[h.from.method] ?? h.from.method}`}
                    {' → '}
                    {`${naira(h.to.amount, true)} · ${formatDate(h.to.paidOn)} · ${METHOD_LABEL[h.to.method] ?? h.to.method}`}
                  </p>
                  <p className="mt-0.5 italic text-muted">{h.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={reversing}
        onClose={() => setReversing(false)}
        onConfirm={() => void run(true)}
        loading={busy}
        tone="danger"
        title="Reverse this payment?"
        confirmLabel="Reverse payment"
        message={`${naira(payment.amount, true)} comes off ${payment.invoiceNumber} and the statement, as if it had not been posted. The record and the reason stay.`}
      />
    </Modal>
  );
}
