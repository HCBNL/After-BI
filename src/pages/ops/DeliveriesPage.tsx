/**
 * Deliveries — confirming what actually arrived.
 *
 * WHY THE CONFIRMATION IS A SEPARATE STEP FROM FULFILMENT
 *
 * Fulfilment is us saying what left. This is them saying what arrived, and the
 * gap between the two is the whole reason returns exist. A system where
 * fulfilment silently means "delivered" has no way to represent forty cartons
 * that fell off a truck in Onitsha, so the shortage becomes an argument on
 * WhatsApp instead of a record.
 *
 * So a fulfilled order is not delivered until a distributor says so, and a
 * confirmation that differs from what was sent raises a return — which is what
 * puts the stock back and raises the credit that settles it.
 */

import { useMemo } from 'react';
import { Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { listOrders } from '@/lib/db';
import { partnerScope } from '@/lib/roles';
import { formatDate, naira, count } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';

export default function DeliveriesPage() {
  const { user } = useAuth();
  const scope = partnerScope(user);
  const root = user ? PORTAL_ROOT[user.role] : '/';

  const { data, loading } = useAsync(
    () => listOrders({ status: 'fulfilled', distributorId: scope, max: 100 }),
    [scope],
    { handleError: true },
  );

  const orders = useMemo(() => data ?? [], [data]);

  return (
    <div>
      <PageHeader
        title="Deliveries"
        description="Confirm what arrived, against what was sent. A shortage raises a return from here."
      />

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Truck size={22} />}
          title="Nothing on its way"
          description="An order appears here once the depot has picked it and it has left."
        />
      ) : (
        <ul className="space-y-2.5">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`${root}/orders?order=${order.id}`}
                className="flex items-start gap-3 rounded-2xl border border-hairline surface-card p-4 shadow-card transition-colors hover:bg-[var(--surface-sunken)]"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <Truck size={18} aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="tabular text-[14px] font-bold text-primary">{order.orderNumber}</p>
                    <p className="truncate text-[13px] text-secondary">{order.distributorName}</p>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {count(order.lines.length)} line{order.lines.length === 1 ? '' : 's'} · sent{' '}
                    {formatDate(order.fulfilledAt)}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {order.lines.slice(0, 4).map((line, i) => (
                      <li
                        key={i}
                        className="tabular rounded-lg bg-[var(--surface-sunken)] px-2 py-0.5 text-[11.5px] text-secondary"
                      >
                        {line.productName} × {count(line.quantity)}
                      </li>
                    ))}
                    {order.lines.length > 4 && (
                      <li className="rounded-lg bg-[var(--surface-sunken)] px-2 py-0.5 text-[11.5px] text-muted">
                        +{order.lines.length - 4} more
                      </li>
                    )}
                  </ul>
                </div>

                <div className="shrink-0 text-right">
                  <p className="tabular text-[15px] font-extrabold text-primary">{naira(order.total)}</p>
                  <Badge tone="good" className="mt-1">
                    Sent
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
