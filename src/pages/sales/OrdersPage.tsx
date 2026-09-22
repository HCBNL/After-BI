/**
 * Orders: the screen this product exists for.
 *
 * Everything else in the app either feeds an order (catalogue, credit limits),
 * follows one (stock, invoices, deliveries) or measures them (scorecards,
 * targets). So this screen sets the pattern the rest follow: a status strip, a
 * table that becomes cards on a phone, and a drawer for the one record rather
 * than a separate route.
 *
 * WHY A DRAWER AND NOT `/orders/:id`
 *
 * Because reviewing orders is a queue, not a destination. An approver opens
 * eleven in a row, and a route per order means eleven full page loads, eleven
 * scroll positions lost, and eleven presses of Back to get to the twelfth. The
 * drawer keeps the list behind it, so closing one leaves the cursor exactly
 * where it was. Orders that genuinely are destinations, a link in an email,
 * are handled by the `?order=` parameter below, which opens the drawer on the
 * right record from a cold load.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Pagination,
  SearchInput,
  Tabs,
  usePagination,
  useToast,
  type Column,
} from '@/components/ui';
import { OrderDrawer } from './OrderDrawer';
import { NewOrderDrawer } from './NewOrderDrawer';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { listOrders } from '@/lib/db';
import { isSelling, partnerScope } from '@/lib/roles';
import { formatDate, naira, count } from '@/lib/format';
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from '@/types';

/**
 * Status to badge tone, in one place.
 *
 * Amber is "a person has to look at this", red is "this went wrong", green is
 * "done". Brand green is deliberately NOT used for `approved`: approved is not
 * finished, it is the state before the depot picks it, and giving it the
 * finished colour is how an approved order sits unfulfilled for four days
 * because everyone reading the list thought it had shipped.
 */
const STATUS_TONE: Record<OrderStatus, 'neutral' | 'gold' | 'good' | 'critical' | 'info'> = {
  draft: 'neutral',
  pending_approval: 'gold',
  approved: 'info',
  rejected: 'critical',
  fulfilled: 'good',
  cancelled: 'neutral',
};

type Filter = 'all' | OrderStatus;

export default function OrdersPage() {
  const { user } = useAuth();
  const { distributors } = useOrg();
  const toast = useToast();

  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('order'));
  const [creating, setCreating] = useState(params.get('new') === '1');
  /* The order being edited. Null means the form raises a new one. */
  const [editing, setEditing] = useState<Order | null>(null);

  const scope = partnerScope(user);

  const { data, loading, error, reload } = useAsync(
    () => listOrders({ distributorId: scope, max: 300 }),
    [scope],
    { handleError: true },
  );

  const orders = useMemo(() => data ?? [], [data]);

  /*
   * Counts come from the whole list, not the filtered one.
   *
   * A tab that says "Awaiting approval 0" while you are standing on it looking
   * at four of them is the sort of thing that makes people stop believing the
   * rest of the screen.
   */
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: orders.length };
    for (const order of orders) out[order.status] = (out[order.status] ?? 0) + 1;
    return out;
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== 'all' && order.status !== filter) return false;
      if (!needle) return true;
      return (
        order.orderNumber.toLowerCase().includes(needle) ||
        order.distributorName.toLowerCase().includes(needle) ||
        order.lines.some((line) => line.productName.toLowerCase().includes(needle))
      );
    });
  }, [orders, filter, search]);

  const page = usePagination(filtered, 15);

  const openOrder = (id: string | null) => {
    setOpenId(id);
    const next = new URLSearchParams(params);
    if (id) next.set('order', id);
    else next.delete('order');
    next.delete('new');
    setParams(next, { replace: true });
  };

  const columns: Column<Order>[] = [
    {
      key: 'number',
      header: 'Order',
      sortValue: (row) => row.orderNumber,
      cell: (row) => (
        <div className="min-w-0">
          <p className="tabular truncate text-[13.5px] font-bold text-primary">{row.orderNumber}</p>
          {/*
            The distributor's name repeats here on a phone only, because the
            column that carries it is hidden below sm. Without it the mobile
            list is a column of order numbers, which nobody recognises.
          */}
          <p className="truncate text-[12px] text-muted sm:hidden">{row.distributorName}</p>
        </div>
      ),
    },
    {
      key: 'distributor',
      header: 'Distributor',
      hideOnMobile: true,
      sortValue: (row) => row.distributorName,
      cell: (row) => <span className="truncate text-[13px]">{row.distributorName}</span>,
    },
    {
      key: 'lines',
      header: 'Lines',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.lines.length,
      cell: (row) => <span className="tabular text-[13px]">{count(row.lines.length)}</span>,
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
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      cell: (row) => <Badge tone={STATUS_TONE[row.status]}>{ORDER_STATUS_LABEL[row.status]}</Badge>,
    },
    {
      key: 'created',
      header: 'Raised',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.createdAt,
      cell: (row) => <span className="text-[12.5px] text-muted">{formatDate(row.createdAt)}</span>,
    },
  ];

  const canCreate = user ? isSelling(user.role) || user.role === 'distributor' : false;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Purchase orders from draft to fulfilment, with who still has to sign."
        actions={
          canCreate && (
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              New order
            </Button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              page.reset();
            }}
            placeholder="Order number, distributor or product…"
            className="max-w-sm"
          />
        </div>
      </PageHeader>

      <Tabs
        className="mb-4"
        active={filter}
        onChange={(id) => {
          setFilter(id as Filter);
          page.reset();
        }}
        items={[
          { id: 'all', label: 'All', count: counts.all ?? 0 },
          { id: 'pending_approval', label: 'Awaiting approval', count: counts.pending_approval ?? 0 },
          { id: 'approved', label: 'Approved', count: counts.approved ?? 0 },
          { id: 'fulfilled', label: 'Fulfilled', count: counts.fulfilled ?? 0 },
          { id: 'draft', label: 'Drafts', count: counts.draft ?? 0 },
        ]}
      />

      {error ? (
        <EmptyState
          icon={<ShoppingCart size={22} />}
          title="We could not load your orders"
          description="Check your connection and try again."
          action={
            <Button variant="outline" onClick={reload}>
              Try again
            </Button>
          }
        />
      ) : (
        <DataTable
          rows={page.slice}
          columns={columns}
          getRowId={(row) => row.id}
          onRowClick={(row) => openOrder(row.id)}
          loading={loading}
          emptyIcon={<ShoppingCart size={22} />}
          emptyTitle={search || filter !== 'all' ? 'Nothing matches that' : 'No orders yet'}
          emptyDescription={
            search || filter !== 'all'
              ? 'Try a different search, or clear the filter above.'
              : distributors.length
                ? 'Raise the first one and it will appear here.'
                : 'Add a distributor first. An order needs somebody to be for.'
          }
          footer={
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              onChange={page.setPage}
              total={page.total}
              pageSize={page.pageSize}
            />
          }
        />
      )}

      <OrderDrawer
        orderId={openId}
        onClose={() => openOrder(null)}
        onChanged={reload}
        onEdit={(order) => {
          /*
            The detail drawer hands the loaded order up and the form takes over.
            Two drawers stacked on a phone is a trap, closing the top one looks
            like closing the screen, so the detail closes as the editor opens,
            and saving reopens the detail on the same order.
 */
          setEditing(order);
          setOpenId(null);
          setCreating(true);
        }}
      />

      <NewOrderDrawer
        open={creating}
        order={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
          const next = new URLSearchParams(params);
          next.delete('new');
          setParams(next, { replace: true });
        }}
        onCreated={(id) => {
          const wasEdit = Boolean(editing);
          setCreating(false);
          setEditing(null);
          reload();
          openOrder(id);
          toast.success(
            wasEdit ? 'Order updated' : 'Order raised',
            wasEdit ? undefined : 'It is in your drafts until you send it for approval.',
          );
        }}
      />
    </div>
  );
}
