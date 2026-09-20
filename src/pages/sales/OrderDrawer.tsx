/**
 * One order, everything about it, and everything you can do to it.
 *
 * WHAT DECIDES WHICH BUTTONS APPEAR
 *
 * `orderAmendment()` in `lib/amend.ts`, and nothing in this file. That module
 * is the single answer to "may this person change this record right now", and
 * `firestore.rules` mirrors it — so a button drawn here is a write that will
 * land, and a write that would be refused is a button that was never drawn. An
 * app full of controls that throw "permission denied" teaches people to
 * distrust every control in it.
 *
 * WHAT THIS SCREEN GAINED
 *
 * The version this replaces could only approve, reject and fulfil. There was no
 * way to edit an order, no way to pull one back out of the approval queue, and
 * no way to cancel one — so a wrong quantity meant rejecting the order and
 * raising a duplicate, and the duplicates are still in the data. Now:
 *
 *   Edit     a draft, or anything at all if you are an administrator
 *   Recall   your own order, back out of the queue and into your drafts
 *   Send     a draft on for approval
 *   Cancel   anything that has not already shipped
 *
 * Each one is gated by the stage the order is in, and when nothing is permitted
 * the screen says why rather than simply showing no buttons.
 */

import { useState } from 'react';
import { Ban, Check, PackageCheck, Pencil, Printer, Send, Undo2, X } from 'lucide-react';
import { Alert, Badge, Button, ConfirmDialog, Divider, Drawer, Field, Hint, Select, Textarea, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { cancelOrder, decideOrder, fulfilOrder, getOrder, listApproverPool, recallOrder, submitOrder } from '@/lib/db';
import { isOperations } from '@/lib/roles';
import { pickApprovers } from '@/lib/approvals';
import { orderAmendment } from '@/lib/amend';
import { formatDateTime, naira, count } from '@/lib/format';
import { printDocument } from '@/lib/print';
import { ORDER_STATUS_LABEL, ROLE_LABEL, type Order } from '@/types';

export function OrderDrawer({
  orderId,
  onClose,
  onChanged,
  onEdit,
}: {
  orderId: string | null;
  onClose: () => void;
  onChanged: () => void;
  /** Hands the loaded order back up so the page can open the form on it. */
  onEdit: (order: Order) => void;
}) {
  const { user } = useAuth();
  const { warehouses, defaultWarehouse, settings, distributorById } = useOrg();
  const toast = useToast();

  const [note, setNote] = useState('');
  const [depot, setDepot] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | 'reject' | 'fulfil' | 'recall' | 'cancel'>(null);
  /* A recall or cancel reason, shared by both confirm dialogs below. */
  const [reason] = useState('');

  const { data: order, loading, reload } = useAsync(
    () => (orderId ? getOrder(orderId) : Promise.resolve(null)),
    [orderId],
  );

  /*
   * EVERY HOOK ABOVE THE EARLY RETURN, WITHOUT EXCEPTION.
   *
   * This one sat below `if (!orderId) return null` for a while and it cost a
   * whole screen: with no order selected the component returned before reaching
   * it, so React counted one fewer hook; the moment a row was tapped the hook
   * ran and the counts disagreed, which is React error #310 and takes the
   * drawer down with it. The route sweep never caught it because it only ever
   * renders the closed drawer — it took clicking a row to find.
   *
   * The pool of approvers for a draft being sent on, same as `NewOrderDrawer`
   * builds when raising one.
   */
  const { data: members } = useAsync(() => listApproverPool(), []);

  if (!orderId) return null;

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      setNote('');
      reload();
      onChanged();
      toast.success(done);
    } catch (err) {
      /*
       * The message is shown, not swallowed.
       *
       * `fulfilOrder` throws a sentence naming the products that are short and
       * by how much — "Not enough stock in this depot for Malta 50cl (40 of
       * 120)". That is the entire value of the check, and a generic "Something
       * went wrong" toast throws it away and sends somebody to the stock screen
       * to work out which line failed.
       */
      toast.error('That did not go through', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const canDecide =
    user && order?.status === 'pending_approval' && ((order.approvers ?? []).includes(user.id) || user.role === 'super_admin');

  const canFulfil = user && order?.status === 'approved' && isOperations(user.role);

  const alreadyDecided =
    user && order?.approvals?.some((a) => a.uid === user.id && a.decision === 'approved');

  /* The one source of truth for edit / recall / cancel. See `lib/amend.ts`. */
  const amend = orderAmendment(user, order ?? null);

  const approversFor = () => (user ? pickApprovers(members, settings, user) : []);

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={loading ? 'Loading…' : (order?.orderNumber ?? 'Order')}
    >
      {loading && (
        <div className="space-y-3">
          <div className="skeleton h-5 w-40 rounded-lg" />
          <div className="skeleton h-24 w-full rounded-xl" />
          <div className="skeleton h-40 w-full rounded-xl" />
        </div>
      )}

      {!loading && !order && (
        <Alert tone="critical" title="That order no longer exists" defaultOpen>
          It may have been cancelled. Close this and refresh the list.
        </Alert>
      )}

      {order && (
        <div className="space-y-5">
          {/* ------------------------------------------------- the header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-primary">{order.distributorName}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Raised by {order.createdByName} · {formatDateTime(order.createdAt)}
              </p>
            </div>
            <Badge
              tone={
                order.status === 'fulfilled'
                  ? 'good'
                  : order.status === 'rejected'
                    ? 'critical'
                    : order.status === 'pending_approval'
                      ? 'gold'
                      : order.status === 'approved'
                        ? 'info'
                        : 'neutral'
              }
            >
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
          </div>

          {/*
            AMENDED AFTER IT WAS DECIDED — said on the record itself.

            The amendment is stamped onto the order: who changed it and when.
            An amendment nobody can see on the record is indistinguishable from
            the original having always said this.
          */}
          {order.amendedAt && (
            <Alert tone="warning" title="This order was amended after it was decided" defaultOpen>
              Changed by {order.amendedBy ?? 'an administrator'} on {formatDateTime(order.amendedAt)}.
            </Alert>
          )}

          {order.status === 'draft' && order.recalledAt && (
            <Alert tone="info" title="Recalled from approval" defaultOpen>
              {order.recalledBy ?? 'Somebody'} pulled this back on {formatDateTime(order.recalledAt)}
              {order.recallReason ? ` — ${order.recallReason}` : ''}. Every signature was cleared, so
              sending it again asks for them afresh.
            </Alert>
          )}

          {order.status === 'cancelled' && (
            <Alert tone="critical" title="This order was cancelled" defaultOpen>
              {order.cancelledBy ?? 'Somebody'} cancelled it
              {order.cancelReason ? ` — ${order.cancelReason}` : ''}. It is kept rather than deleted
              because its number has been quoted.
            </Alert>
          )}

          {order.note && (
            <Alert tone="info" title="Note on this order" defaultOpen>
              {order.note}
            </Alert>
          )}

          {/* --------------------------------------------- what you can change */}
          <div className="flex flex-wrap items-center gap-2">
            {/*
              PRINT IS ALWAYS AVAILABLE, AT EVERY STAGE.

              A proforma is what a rep sends a distributor to get the order
              agreed, which happens while it is still a draft — so gating this
              on approval would remove it from the only moment it is used. A
              cancelled order can be printed too: somebody is usually printing
              it to explain why it was cancelled.
            */}
            {settings && (
              <Button
                size="sm"
                variant="outline"
                icon={<Printer size={15} />}
                onClick={() => {
                  try {
                    printDocument({
                      kind: 'proforma',
                      order,
                      distributor: distributorById(order.distributorId) ?? null,
                      company: {
                        settings,
                        preparedBy: order.createdByName,
                        preparedByRole: ROLE_LABEL[order.createdByRole],
                      },
                    });
                  } catch (err) {
                    toast.error('Could not print', err instanceof Error ? err.message : undefined);
                  }
                }}
              >
                Proforma
              </Button>
            )}

            {amend.canEdit && (
              <Button
                size="sm"
                variant="outline"
                icon={<Pencil size={15} />}
                disabled={busy}
                onClick={() => onEdit(order)}
              >
                Edit
              </Button>
            )}

            {amend.canRecall && (
              <Button
                size="sm"
                variant="outline"
                icon={<Undo2 size={15} />}
                disabled={busy}
                onClick={() => setConfirm('recall')}
              >
                Recall
              </Button>
            )}

            {order.status === 'draft' && amend.canEdit && (
              <Button
                size="sm"
                icon={<Send size={15} />}
                loading={busy}
                onClick={() =>
                  run(async () => {
                    const status = await submitOrder(order.id, approversFor(), user!);
                    return status;
                  }, 'Sent for approval')
                }
              >
                Send for approval
              </Button>
            )}

            {amend.canCancel && order.status !== 'cancelled' && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Ban size={15} />}
                disabled={busy}
                onClick={() => setConfirm('cancel')}
              >
                Cancel order
              </Button>
            )}
          </div>

          {/*
            When nothing is permitted, say why.

            A screen with no buttons is indistinguishable from a screen that is
            broken, and "why can't I edit this" was the single most common
            question about the old app. `amend.reason` is always a sentence
            naming the stage and who can act.
          */}
          {!amend.canEdit && !amend.canRecall && !amend.canCancel && amend.reason && (
            <p className="rounded-xl border border-hairline surface-sunken px-3.5 py-2.5 text-[12.5px] leading-snug text-muted">
              {amend.reason}
            </p>
          )}

          {amend.canRecall && !amend.canEdit && amend.reason && (
            <p className="text-[12px] leading-snug text-muted">{amend.reason}</p>
          )}

          {amend.byOverride && (amend.canEdit || amend.canCancel) && (
            <p className="text-[12px] leading-snug text-muted">
              You can change this because you are an administrator. The change is recorded against
              your name and shown on the order.
            </p>
          )}

          {/* -------------------------------------------------- the lines */}
          <section>
            {/*
              The prices are what they were, not what they are.

              Worth being able to ask, because the first question anybody has
              when a six-week-old order does not match today's price list is
              whether the system is wrong. Behind the (i) rather than under the
              total: it is asked once and then never again. See the snapshot
              note at the top of `types/index.ts`.
            */}
            <h3 className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              {count(order.lines.length)} line{order.lines.length === 1 ? '' : 's'}
              <Hint label="About these prices">
                Prices are as they were when this order was raised, not today's. Every line carries
                the price its tier had on the day, so the order keeps saying what it said then.
              </Hint>
            </h3>

            <div className="surface-card overflow-hidden rounded-2xl border border-hairline">
              {order.lines.map((line, index) => (
                <div
                  key={`${line.productId}-${index}`}
                  className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-primary">
                      {line.productName}
                    </p>
                    <p className="tabular mt-0.5 text-[12px] text-muted">
                      {count(line.quantity)} × {naira(line.unitPrice)} · {line.unit}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-[13.5px] font-bold text-primary">
                    {naira(line.lineTotal)}
                  </p>
                </div>
              ))}

              <div className="flex items-center justify-between gap-3 surface-sunken px-4 py-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-muted">Total</p>
                <p className="tabular text-[16px] font-extrabold text-primary">{naira(order.total)}</p>
              </div>
            </div>

          </section>

          {/* ----------------------------------------------- the signatures */}
          {(order.approvers ?? []).length > 0 && (
            <section>
              <Divider label="Approvals" className="mb-3" />
              <ul className="space-y-2">
                {order.approvers.map((uid) => {
                  const decision = order.approvals?.find((a) => a.uid === uid);
                  return (
                    <li
                      key={uid}
                      className="flex items-start justify-between gap-3 rounded-xl border border-hairline px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-primary">
                          {order.approverNames?.[uid] ?? 'Approver'}
                        </p>
                        {decision?.note && (
                          <p className="mt-0.5 text-[12px] leading-snug text-muted">{decision.note}</p>
                        )}
                        {decision && (
                          <p className="mt-0.5 text-[11.5px] text-muted">
                            {formatDateTime(decision.decidedAt)}
                          </p>
                        )}
                      </div>
                      <Badge
                        tone={
                          !decision ? 'neutral' : decision.decision === 'approved' ? 'good' : 'critical'
                        }
                      >
                        {!decision ? 'Waiting' : decision.decision === 'approved' ? 'Signed' : 'Rejected'}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ------------------------------------------------- what you can do */}
          {canDecide && !alreadyDecided && (
            <section className="rounded-2xl border border-hairline surface-sunken p-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[13.5px] font-bold text-primary">Your signature</h3>
                <Hint label="About your signature">
                  This order cannot move until you decide. A rejection needs a reason — it is what
                  the person who raised it will read.
                </Hint>
              </div>

              <Field className="mt-3">
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional on approval, required on rejection"
                />
              </Field>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  icon={<Check size={15} />}
                  loading={busy}
                  onClick={() =>
                    run(
                      () => decideOrder(order.id, 'approved', user!, note.trim() || undefined),
                      'Approved',
                    )
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<X size={15} />}
                  disabled={busy}
                  onClick={() => {
                    if (!note.trim()) {
                      toast.warning('A rejection needs a reason', 'Say what has to change.');
                      return;
                    }
                    setConfirm('reject');
                  }}
                >
                  Reject
                </Button>
              </div>
            </section>
          )}

          {canFulfil && (
            <section className="rounded-2xl border border-hairline surface-sunken p-4">
              <h3 className="text-[13.5px] font-bold text-primary">Fulfil from a depot</h3>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">
                This deducts every line from the depot you pick and writes the ledger. If any line is
                short, nothing is deducted at all.
              </p>

              <Field className="mt-3" label="Depot">
                <Select
                  value={depot || defaultWarehouse?.id || ''}
                  onChange={(e) => setDepot(e.target.value)}
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                      {warehouse.location ? ` — ${warehouse.location}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Button
                className="mt-3"
                size="sm"
                icon={<PackageCheck size={15} />}
                disabled={busy || !warehouses.length}
                onClick={() => setConfirm('fulfil')}
              >
                Fulfil order
              </Button>
            </section>
          )}

          {order.status === 'draft' && !order.recalledAt && (
            <Alert tone="warning" title="This is still a draft">
              Nobody has been asked to sign it yet. Use <strong>Send for approval</strong> above when
              it is ready.
            </Alert>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'recall'}
        onClose={() => setConfirm(null)}
        title="Recall this order?"
        message="It goes back to your drafts and comes out of everyone's approval queue. Any signatures already given are cleared, so sending it again asks for them afresh — which is the point: nobody should be recorded as approving lines they never saw."
        confirmLabel="Recall"
        loading={busy}
        onConfirm={() => {
          setConfirm(null);
          void run(() => recallOrder(order!.id, user!, reason.trim() || undefined), 'Recalled to drafts');
        }}
      />

      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        title="Cancel this order?"
        message="It stays in the list as cancelled rather than disappearing, because its number has been quoted. A fulfilled order cannot be cancelled — raise a return instead."
        confirmLabel="Cancel order"
        tone="danger"
        loading={busy}
        onConfirm={() => {
          setConfirm(null);
          void run(() => cancelOrder(order!.id, user!, reason.trim() || undefined), 'Order cancelled');
        }}
      />

      <ConfirmDialog
        open={confirm === 'reject'}
        onClose={() => setConfirm(null)}
        title="Reject this order?"
        message="The person who raised it will see your reason and can send it again."
        confirmLabel="Reject"
        tone="danger"
        loading={busy}
        onConfirm={() => {
          setConfirm(null);
          void run(() => decideOrder(order!.id, 'rejected', user!, note.trim()), 'Rejected');
        }}
      />

      <ConfirmDialog
        open={confirm === 'fulfil'}
        onClose={() => setConfirm(null)}
        title="Fulfil and deduct stock?"
        message="Every line comes out of the depot and goes into the ledger. This cannot be undone from here — a mistake is corrected with an adjustment."
        confirmLabel="Fulfil"
        loading={busy}
        onConfirm={() => {
          setConfirm(null);
          void run(
            () => fulfilOrder(order!.id, depot || defaultWarehouse!.id, user!),
            'Fulfilled and stock deducted',
          );
        }}
      />
    </Drawer>
  );
}
