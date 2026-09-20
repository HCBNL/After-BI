/**
 * Depots — where stock is held.
 *
 * Small screen, load-bearing idea. Nothing in this app can hold stock until a
 * depot exists, because a `StockPosition` is keyed `{warehouseId}_{productId}`
 * — so this is the first thing in the setup checklist and the reason it is
 * there.
 *
 * A depot is never deleted from here. Its positions and its whole ledger hang
 * off its id, and removing it would orphan both while leaving the numbers
 * visible on every past order.
 */

import { useState } from 'react';
import { Factory, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, DataTable, Field, Input, Modal, Select, useToast, type Column } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { db } from '@/lib/firebase';
import { orgPath } from '@/lib/tenant';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import type { Warehouse } from '@/types';

export default function WarehousesPage() {
  const { warehouses, loading, reload } = useOrg();
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<Warehouse> | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing?.name?.trim()) {
      toast.warning('A depot needs a name');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: editing.name.trim(),
        location: editing.location?.trim() || null,
        kind: editing.kind ?? 'company',
      };
      if (editing.id) await updateDoc(doc(db, orgPath('warehouses'), editing.id), payload);
      else await addDoc(collection(db, orgPath('warehouses')), payload);
      setEditing(null);
      reload();
      toast.success('Depot saved');
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Warehouse>[] = [
    {
      key: 'name',
      header: 'Depot',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-primary">{row.name}</p>
          <p className="truncate text-[12px] text-muted">{row.location ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'Type',
      cell: (row) => (
        <Badge tone={row.kind === 'company' ? 'brand' : 'neutral'}>
          {row.kind === 'company' ? 'Ours' : 'Distributor'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Depots"
        description="Where stock is held. Nothing can be received or shipped until one exists."
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing({ kind: 'company' })}>
            New depot
          </Button>
        }
      />

      <DataTable
        rows={warehouses}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={(row) => setEditing(row)}
        loading={loading}
        emptyIcon={<Factory size={22} />}
        emptyTitle="No depots yet"
        emptyDescription="Add the warehouse your stock sits in. You can add more later."
      />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit depot' : 'New depot'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={busy}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              value={editing?.name ?? ''}
              onChange={(e) => setEditing((c) => ({ ...c, name: e.target.value }))}
              placeholder="Ikeja main warehouse"
            />
          </Field>
          <Field label="Location" hint="Optional">
            <Input
              value={editing?.location ?? ''}
              onChange={(e) => setEditing((c) => ({ ...c, location: e.target.value }))}
              placeholder="Lagos"
            />
          </Field>
          <Field label="Type">
            <Select
              value={editing?.kind ?? 'company'}
              onChange={(e) => setEditing((c) => ({ ...c, kind: e.target.value as Warehouse['kind'] }))}
            >
              <option value="company">Ours — stock we own</option>
              <option value="distributor">A distributor's — stock they hold</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
