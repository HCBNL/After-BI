/**
 * Movements — the ledger.
 *
 * Append-only, and the security rules enforce that rather than this screen: no
 * role, including super admin, may update or delete a row here. That is the
 * only property that makes the ledger worth keeping, because a ledger anybody
 * can edit is a note.
 *
 * `balanceAfter` is what makes it reconcilable. Replaying every movement for a
 * product must land on the number in Stock; if it does not, something wrote a
 * balance outside a transaction and that is a real bug rather than a rounding
 * difference. It is shown on every row for exactly that reason.
 */

import { useMemo, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, DataTable, SearchInput, Select, type Column } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { listMovements } from '@/lib/db';
import { warehouseScope } from '@/lib/roles';
import { count, formatDateTime } from '@/lib/format';
import { MOVEMENT_LABEL, type StockMovement } from '@/types';

export default function MovementsPage() {
  const { user } = useAuth();
  const { warehouses, defaultWarehouse } = useOrg();
  const allowed = warehouseScope(user);

  const [depot, setDepot] = useState(defaultWarehouse?.id ?? '');
  const [search, setSearch] = useState('');

  const { data, loading } = useAsync(
    () => listMovements(depot || undefined, 300),
    [depot],
    { handleError: true },
  );

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter(
      (row) =>
        !needle ||
        row.productName.toLowerCase().includes(needle) ||
        row.createdByName.toLowerCase().includes(needle) ||
        (row.note ?? '').toLowerCase().includes(needle),
    );
  }, [data, search]);

  const columns: Column<StockMovement>[] = [
    {
      key: 'when',
      header: 'When',
      sortValue: (row) => row.createdAt,
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-primary">{formatDateTime(row.createdAt)}</p>
          <p className="truncate text-[11.5px] text-muted">{row.createdByName}</p>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      sortValue: (row) => row.productName,
      cell: (row) => (
        <span className="truncate text-[13px] font-semibold text-primary">{row.productName}</span>
      ),
    },
    {
      key: 'type',
      header: 'Reason',
      hideOnMobile: true,
      cell: (row) => (
        <Badge tone={row.direction === 'in' ? 'good' : 'neutral'}>{MOVEMENT_LABEL[row.type]}</Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      sortValue: (row) => (row.direction === 'in' ? row.quantity : -row.quantity),
      cell: (row) => (
        /*
          The sign is drawn here and stored nowhere. `quantity` in the database
          is always positive and `direction` carries the meaning — see
          `moveStock`. Rendering the sign from the direction means the two can
          never disagree.
        */
        <span
          className={
            row.direction === 'in'
              ? 'tabular text-[13.5px] font-bold text-status-good'
              : 'tabular text-[13.5px] font-bold text-secondary'
          }
        >
          {row.direction === 'in' ? '+' : '−'}
          {count(row.quantity)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance after',
      align: 'right',
      hideOnMobile: true,
      cell: (row) => <span className="tabular text-[13px] text-muted">{count(row.balanceAfter)}</span>,
    },
    {
      key: 'note',
      header: 'Note',
      hideOnMobile: true,
      cell: (row) => <span className="text-[12px] text-muted">{row.note ?? '—'}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Movements"
        description="Every unit in and out, who moved it and what the balance was after. Nothing here can be edited."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={depot} onChange={(e) => setDepot(e.target.value)} className="max-w-[240px]">
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
            placeholder="Product, person or note…"
            className="max-w-xs"
          />
        </div>
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        dense
        emptyIcon={<FileSpreadsheet size={22} />}
        emptyTitle="Nothing has moved yet"
        emptyDescription="Movements appear here the moment stock goes in or out."
      />
    </div>
  );
}
