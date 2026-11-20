/**
 * Approvals: everything waiting on your signature, in one place.
 *
 * WHY THIS IS NOT JUST "ORDERS, FILTERED"
 *
 * Because an approver's job is not "review orders", it is "unblock whatever is
 * stuck on me", and in this business that is orders today and returns and credit
 * requests tomorrow. Making people remember which screen each queue lives on is
 * how a return sits unreviewed for three weeks while the orders queue is
 * spotless.
 *
 * The rule this screen follows: if a record cannot move without a named
 * person's decision, it appears here for that person and nowhere else demands
 * they go looking for it.
 */

import { useMemo } from 'react';
import { ClipboardCheck, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { listOrders, listPendingAdjustments } from '@/lib/db';
import { ADJUSTMENT_SIGNERS, sidesToSign, SIDE_LABEL, waitingLine } from '@/lib/adjustments';
import { packLabel, unitsToPieces } from '@/lib/packs';
import { formatDate, naira, count } from '@/lib/format';
import { orderNet, summarise } from '@/lib/pricing';
import { PORTAL_ROOT } from '@/lib/tiles';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const root = user ? PORTAL_ROOT[user.role] : '/';

  const { data, loading } = useAsync(
    () => listOrders({ status: 'pending_approval', max: 200 }),
    [],
    { handleError: true },
  );

  /*
   * Mine, not everyone's.
   *
   * The query cannot do this, Firestore has no "array contains my uid" plus
   * "ordered by date" without a composite index per user, so it is filtered
   * here. The list is capped at 200 pending orders, which for any real
   * organisation is already an emergency, so the client-side filter is not the
   * thing that will fall over.
 */
  /* Stock adjustments waiting on this person's signature (finance or operations). */
  const signer = Boolean(user && ADJUSTMENT_SIGNERS.includes(user.role));
  const { data: adjustments } = useAsync(
    () => (signer ? listPendingAdjustments() : Promise.resolve([])),
    [signer],
    { handleError: true },
  );
  const adjWaiting = useMemo(
    () => (adjustments ?? []).filter((a) => user && sidesToSign(a, user.id, user.role).length > 0),
    [adjustments, user],
  );

  const mine = useMemo(
    () => (data ?? []).filter(
        (order) => user && ((order.approvers ?? []).includes(user.id) || user.role === 'super_admin'),
      ),
    [data, user],
  );

  const waiting = useMemo(
    () =>
      mine.filter(
        (order) => !order.approvals?.some((a) => a.uid === user?.id),
      ),
    [mine, user],
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Approvals" description="Everything waiting on your signature." />
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Everything waiting on your signature. Nothing here can move until you decide."
      />

      {adjWaiting.length > 0 && (
        <ul className="mb-2.5 space-y-2.5">
          {adjWaiting.map((a) => (
            <li key={a.id}>
              <Link
                to={`${root}/adjustments`}
                className="flex items-start gap-3 rounded-2xl border border-hairline surface-card p-4 shadow-card transition-colors hover:bg-[var(--surface-sunken)]"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-800 dark:bg-gold-900/30 dark:text-gold-300">
                  <Scale size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="tabular text-body font-bold text-primary">{a.number}</p>
                    <p className="truncate text-label text-secondary">{`Stock adjustment · ${a.productName}`}</p>
                  </div>
                  <p className="mt-0.5 text-label text-muted">
                    {`${a.direction === 'out' ? 'Remove' : 'Add'} ${packLabel(unitsToPieces(a.quantity, a.piecesPerUnit), a.piecesPerUnit, a.unit)} at ${a.warehouseName}, raised by ${a.requestedByName} on ${formatDate(a.createdAt)}`}
                  </p>
                  <p className="mt-1 text-caption text-muted">{waitingLine(a)}</p>
                </div>
                <Badge tone="gold" className="shrink-0">
                  {`Sign for ${user ? sidesToSign(a, user.id, user.role).map((s) => SIDE_LABEL[s]).join(' and ') : ''}`}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {waiting.length === 0 && adjWaiting.length > 0 ? null : waiting.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={22} />}
          title="Nothing waiting"
          description="When an order or a stock adjustment needs your signature it appears here, and on your home screen."
        />
      ) : (
        <ul className="space-y-2.5">
          {waiting.map((order) => (
            <li key={order.id}>
              <Link
                to={`${root}/orders?order=${order.id}`}
                className="flex items-start gap-3 rounded-2xl border border-hairline surface-card p-4 shadow-card transition-colors hover:bg-[var(--surface-sunken)]"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-800 dark:bg-gold-900/30 dark:text-gold-300">
                  <ClipboardCheck size={18} aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="tabular text-body font-bold text-primary">{order.orderNumber}</p>
                    <p className="truncate text-label text-secondary">{order.distributorName}</p>
                  </div>
                  <p className="mt-0.5 text-label text-muted">
                    {order.lines.length === 1
                      ? `1 line · raised by ${order.createdByName} on ${formatDate(order.createdAt)}`
                      : `${count(order.lines.length)} lines · raised by ${order.createdByName} on ${formatDate(order.createdAt)}`}
                  </p>

                  {/*
                    How many other signatures are still outstanding.

                    It changes what you do: the last signature on an order means
                    the depot can pick it this afternoon, and knowing you are the
                    last one is the difference between signing now and signing
                    after lunch.
                  */}
                  {order.approvers.length > 1 && (
                    <p className="mt-1 text-caption text-muted">
                      {`Any one of the ${order.approvers.length} named can sign`}</p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="tabular text-lead font-bold text-primary">{naira(orderNet(order))}</p>
                  {summarise(order.lines ?? []).discount > 0 && (
                    <p className="tabular mt-0.5 text-caption font-semibold text-[#0a7a0a] dark:text-[#4ec54e]">
                      {`${naira(summarise(order.lines).discount)} discount`}</p>
                  )}
                  <Badge tone="gold" className="mt-1">
                    {user && (order.approvers ?? []).includes(user.id) ? 'Awaiting you' : 'Super admin'}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
