/**
 * Raising an order — and editing one.
 *
 * ONE FORM FOR BOTH, DELIBERATELY
 *
 * An edit screen that is a separate component from the create screen is two
 * places to add a field and two places to get the pricing rule wrong. Pass an
 * `order` and this becomes its editor, pre-loaded; pass nothing and it raises a
 * new one. The only behavioural difference is what happens on submit.
 *
 * EDITING DOES NOT RE-PRICE
 *
 * When an order is amended without changing the distributor, each line keeps
 * the unit price it was raised at. An amendment is a correction, not a
 * re-quote — silently moving a six-week-old order onto today's price list is
 * how a distributor gets an invoice that does not match what they agreed.
 * Changing the distributor DOES re-price, because the tier is what sets the
 * price and the old one no longer applies.
 *
 * THE PRICE IS NOT A FIELD ON THIS FORM, AND THAT IS THE POINT.
 *
 * Pick a distributor, pick products, set quantities. The price comes from the
 * product's tier — `product.pricing[distributor.category]` — and is shown but
 * never typed. The version this replaces had an editable unit price on every
 * line, which meant any rep could discount any order to anything, with no
 * record of who authorised it and no way to tell a keying error from a deal.
 *
 * A genuine special price is a tier (`SEP`) on the distributor's account, set
 * by an administrator, which leaves a trail. That is the difference between a
 * discount and a leak.
 *
 * THE CREDIT CHECK RUNS BEFORE THE ORDER, NOT AFTER
 *
 * `creditPosition` is read the moment a distributor is chosen, so a rep sees
 * "₦1.2m of headroom left" while they are building the order rather than
 * finding out it is refused at submission. It does not block — a person with
 * the authority may still raise it, and the approver sees the same figure.
 */

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search, Send, Trash2 } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Drawer,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { createOrder, creditPosition, listMembers, submitOrder, updateOrder } from '@/lib/db';
import { isAdmin, partnerScope } from '@/lib/roles';
import { naira, count } from '@/lib/format';
import { TIER_LABEL, type Order, type Product } from '@/types';

export function NewOrderDrawer({
  open,
  onClose,
  onCreated,
  order,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (orderId: string) => void;
  /** When set, this edits that order instead of raising a new one. */
  order?: Order | null;
}) {
  const { user } = useAuth();
  const { products, distributors, settings } = useOrg();
  const toast = useToast();

  const scoped = partnerScope(user);
  const editing = Boolean(order);

  const [distributorId, setDistributorId] = useState(order?.distributorId ?? scoped ?? '');
  const [lines, setLines] = useState<Record<string, number>>(
    () => Object.fromEntries((order?.lines ?? []).map((l) => [l.productId, l.quantity])),
  );
  const [search, setSearch] = useState('');
  const [note, setNote] = useState(order?.note ?? '');
  const [busy, setBusy] = useState(false);

  /* Re-seed when a different order is opened, or when the drawer is reopened
     for a new one. Without this the form keeps the previous order's basket,
     which is how one distributor's lines end up on another's order. */
  useEffect(() => {
    if (!open) return;
    setDistributorId(order?.distributorId ?? scoped ?? '');
    setLines(Object.fromEntries((order?.lines ?? []).map((l) => [l.productId, l.quantity])));
    setNote(order?.note ?? '');
    setSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id]);

  /* Did the distributor change during this edit? That is what decides whether
     the lines get re-priced — see the note at the top of this file. */
  const tierChanged = Boolean(order && order.distributorId !== distributorId);

  const distributor = distributors.find((d) => d.id === distributorId);

  /* Only products that have a price for THIS distributor's tier can be
     ordered. A product with no `MT` price is not an MT product. */
  const sellable = useMemo(() => {
    if (!distributor) return [];
    const needle = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        product.status === 'active' &&
        typeof product.pricing[distributor.category] === 'number' &&
        (!needle ||
          product.name.toLowerCase().includes(needle) ||
          (product.sku ?? '').toLowerCase().includes(needle)),
    );
  }, [products, distributor, search]);

  const { data: credit } = useAsync(
    () =>
      distributor
        ? creditPosition(distributor.id, distributor.creditLimit)
        : Promise.resolve(null),
    [distributor?.id, distributor?.creditLimit],
  );

  /* Who has to sign. Admins are the approver pool; the threshold decides
     whether anybody does. */
  const { data: members } = useAsync(() => listMembers(), []);

  const chosen = useMemo(
    () =>
      Object.entries(lines)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({
          product: products.find((p) => p.id === productId)!,
          quantity,
        }))
        .filter((line) => line.product),
    [lines, products],
  );

  /**
   * The price one line will actually be written at.
   *
   * On a new order, or after the distributor has changed, that is the tier
   * price. On an amendment to the same distributor it is whatever the line was
   * raised at — and for a line being ADDED to an existing order there is no
   * historic price, so it falls back to the tier. That last case is the only
   * one where an amendment introduces a current price, and it is correct: the
   * line is new.
   */
  const priceFor = useMemo(
    () => (productId: string, product: Product): number => {
      if (!editing || tierChanged) return product.pricing[distributor?.category ?? 'OT'] ?? 0;
      const existing = order?.lines.find((l) => l.productId === productId);
      return existing?.unitPrice ?? product.pricing[distributor?.category ?? 'OT'] ?? 0;
    },
    [editing, tierChanged, distributor, order],
  );

  const total = useMemo(
    () => chosen.reduce((sum, line) => sum + priceFor(line.product.id, line.product) * line.quantity, 0),
    [chosen, priceFor],
  );

  const threshold = settings?.approvalThreshold ?? 0;
  const needsApproval = threshold > 0 && total >= threshold;

  const setQuantity = (product: Product, quantity: number) => {
    setLines((current) => {
      const next = { ...current };
      /* A quantity below the MOQ is not an order, it is a typo. Snap to the
         MOQ rather than refusing the tap, which on a phone reads as broken. */
      if (quantity <= 0) delete next[product.id];
      else next[product.id] = Math.max(product.moq ?? 1, quantity);
      return next;
    });
  };

  const reset = () => {
    setLines({});
    setNote('');
    setSearch('');
    if (!scoped) setDistributorId('');
  };

  const submit = async (send: boolean) => {
    if (!user || !distributor || !chosen.length) return;
    setBusy(true);
    try {
      const approvers =
        send && needsApproval
          ? (members ?? [])
              .filter((m) => isAdmin(m.role) && m.id !== user.id)
              .slice(0, 3)
              .map((m) => ({ uid: m.id, name: `${m.firstName} ${m.lastName}` }))
          : [];

      if (order) {
        /*
         * Editing. The distributor is only passed through when it actually
         * changed — `updateOrder` treats its presence as "re-price at the new
         * tier", so handing it the unchanged distributor would silently move
         * every line onto today's price list.
         */
        await updateOrder(
          order.id,
          {
            lines: chosen,
            note: note.trim(),
            ...(tierChanged ? { distributor } : {}),
          },
          user,
          { settled: order.status !== 'draft' && order.status !== 'pending_approval' },
        );

        /* A draft being sent on in the same action. An order that was already
           in flight stays where it is; an admin amending it has not re-submitted
           it on the author's behalf. */
        if (send && order.status === 'draft') {
          await submitOrder(order.id, approvers, user);
        }

        onCreated(order.id);
        return;
      }

      const id = await createOrder({
        distributor,
        lines: chosen,
        note: note.trim() || undefined,
        author: user,
        submit: send,
        approvers,
      });

      reset();
      onCreated(id);
    } catch (err) {
      toast.error(
        order ? 'That change was not saved' : 'That order was not raised',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={order ? `Edit ${order.orderNumber}` : 'New order'}
    >
      <div className="space-y-5">
        {/* --------------------------------------------------- who it is for */}
        <Field label="Distributor" required>
          <Select
            value={distributorId}
            disabled={Boolean(scoped)}
            onChange={(e) => {
              setDistributorId(e.target.value);
              /* Clearing the lines is deliberate: the prices belong to the old
                 distributor's tier, and silently re-pricing a basket somebody
                 has already built is how an order goes out at the wrong rate. */
              setLines({});
            }}
          >
            <option value="">Choose a distributor…</option>
            {distributors
              .filter((d) => d.status === 'active')
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.company} — {TIER_LABEL[d.category]}
                </option>
              ))}
          </Select>
        </Field>

        {tierChanged && (
          <Alert tone="warning" title="Changing the distributor will re-price this order" defaultOpen>
            Every line moves onto {TIER_LABEL[distributor?.category ?? 'OT'].toLowerCase()} pricing,
            because the price comes from the account's tier. The total below already reflects that.
          </Alert>
        )}

        {distributor && credit && (
          <Alert
            tone={
              credit.headroom !== null && credit.headroom <= 0
                ? 'critical'
                : credit.overdue > 0
                  ? 'warning'
                  : 'info'
            }
            title={
              credit.headroom === null
                ? `${naira(credit.outstanding)} outstanding · no credit limit set`
                : credit.headroom <= 0
                  ? `Over their credit limit by ${naira(Math.abs(credit.headroom))}`
                  : `${naira(credit.headroom)} of credit left`
            }
          >
            {naira(credit.outstanding)} is outstanding on this account
            {credit.overdue > 0 ? `, of which ${naira(credit.overdue)} is past its due date.` : '.'}{' '}
            This does not stop you raising the order — the approver sees the same figure.
          </Alert>
        )}

        {/* ------------------------------------------------------- the basket */}
        {chosen.length > 0 && (
          <section className="rounded-2xl border border-hairline surface-sunken p-3">
            <h3 className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              {count(chosen.length)} line{chosen.length === 1 ? '' : 's'}
            </h3>

            <ul className="space-y-1.5">
              {chosen.map(({ product, quantity }) => {
                const unitPrice = priceFor(product.id, product);
                return (
                  <li
                    key={product.id}
                    className="flex items-center gap-2 rounded-xl surface-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-primary">{product.name}</p>
                      <p className="tabular text-[11.5px] text-muted">
                        {naira(unitPrice)} · {product.unit}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`One fewer ${product.name}`}
                        onClick={() => setQuantity(product, quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-secondary transition-colors hover:bg-[var(--surface-sunken)]"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={quantity}
                        aria-label={`Quantity of ${product.name}`}
                        onChange={(e) => setQuantity(product, Number(e.target.value))}
                        className="tabular h-8 w-14 rounded-lg border border-hairline bg-transparent text-center text-[13px] font-bold text-primary"
                      />
                      <button
                        type="button"
                        aria-label={`One more ${product.name}`}
                        onClick={() => setQuantity(product, quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-secondary transition-colors hover:bg-[var(--surface-sunken)]"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() => setQuantity(product, 0)}
                        className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:text-status-critical"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-[12px] font-bold uppercase tracking-wide text-muted">Total</span>
              <span className="tabular text-[17px] font-extrabold text-primary">{naira(total)}</span>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------ the catalogue */}
        {distributor && (
          <section>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the catalogue…"
              leading={<Search size={16} />}
            />

            {sellable.length === 0 ? (
              <EmptyState
                className="py-8"
                title="Nothing priced for this tier"
                description={`No active product carries a ${TIER_LABEL[distributor.category]} price. An administrator sets those on the product.`}
              />
            ) : (
              <ul className="mt-3 max-h-[320px] space-y-1 overflow-y-auto scrollbar-thin">
                {sellable.map((product) => {
                  const unitPrice = priceFor(product.id, product);
                  const inBasket = lines[product.id] ?? 0;
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => setQuantity(product, inBasket + (product.moq ?? 1))}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-sunken)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-primary">
                            {product.name}
                          </p>
                          <p className="tabular text-[12px] text-muted">
                            {naira(unitPrice)} · {product.unit}
                            {product.moq > 1 ? ` · min ${product.moq}` : ''}
                          </p>
                        </div>
                        {inBasket > 0 && <Badge tone="brand">{count(inBasket)}</Badge>}
                        <Plus size={16} className="shrink-0 text-muted" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <Field label="Note" hint="Optional">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Delivery instructions, a reference, anything the depot should know"
          />
        </Field>

        {/* ----------------------------------------------------------- submit */}
        <div className="sticky bottom-0 -mx-5 border-t border-hairline surface-card px-5 pb-safe-4 pt-3">
          {needsApproval && (
            <p className="mb-2 text-[12px] leading-snug text-muted">
              Over {naira(threshold)}, so this needs a signature before it can be fulfilled.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<Send size={15} />}
              loading={busy}
              disabled={!distributor || !chosen.length}
              onClick={() => void submit(true)}
            >
              {order
                ? order.status === 'draft'
                  ? needsApproval
                    ? 'Save and send for approval'
                    : 'Save and raise'
                  : 'Save changes'
                : needsApproval
                  ? 'Send for approval'
                  : 'Raise order'}
            </Button>
            {(!order || order.status === 'draft') && (
              <Button
                variant="outline"
                disabled={busy || !distributor || !chosen.length}
                onClick={() => void submit(false)}
              >
                {order ? 'Save as draft' : 'Save as draft'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
