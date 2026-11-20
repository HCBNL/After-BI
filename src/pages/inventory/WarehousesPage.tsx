/**
 * Depots: where stock is held.
 *
 * Small screen, load-bearing idea. Nothing in this app can hold stock until a
 * depot exists, because a `StockPosition` is keyed `{warehouseId}_{productId}`
 *: so this is the first thing in the setup checklist and the reason it is
 * there.
 *
 * A depot is never deleted from here. Its positions and its whole ledger hang
 * off its id, and removing it would orphan both while leaving the numbers
 * visible on every past order.
 */

import { useState } from 'react';
import { Factory, Minus, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, DataTable, Field, Input, Modal, Select, useToast, type Column } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { db } from '@/lib/firebase';
import { orgPath } from '@/lib/tenant';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import type { Warehouse } from '@/types';
import { MAX_SECTIONS, ROW_LETTERS, sectionsOf } from '@/lib/locations';
import { Hint } from '@/components/ui';

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
        sections: sectionsOf(editing),
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
          <p className="truncate text-body font-semibold text-primary">{row.name}</p>
          <p className="truncate text-caption text-muted">
            {`${row.location ?? 'No location'} · ${sectionsOf(row).length} sections`}
          </p>
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
              <option value="company">Ours (stock we own)</option>
              <option value="distributor">A distributor's (stock they hold)</option>
            </Select>
          </Field>

          <SectionsEditor value={sectionsOf(editing)} onChange={(sections) => setEditing((c) => ({ ...c, sections }))} />
        </div>
      </Modal>
    </div>
  );
}

/**
 * The floor plan a stock count picks from: numbered sections, each with
 * lettered rows from A to the letter chosen here.
 */
function SectionsEditor({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const add = () => value.length < MAX_SECTIONS && onChange([...value, value[value.length - 1] ?? 'Z']);
  const remove = () => value.length > 1 && onChange(value.slice(0, -1));
  return (
    <fieldset className="rounded-xl border border-hairline surface-sunken px-4 py-3.5">
      <legend className="flex items-center gap-1.5 px-1 text-label font-semibold text-secondary">
        Sections and rows
        <Hint label="About sections and rows">
          How this depot's floor is marked out. Each section has a number and its rows run from A to the letter you
          choose. A stock count asks for the section, then the row, so anyone can walk straight to where stock was
          counted.
        </Hint>
      </legend>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-label text-primary">{value.length === 1 ? '1 section' : `${value.length} sections`}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<Minus size={14} />} onClick={remove} disabled={value.length <= 1}>
            Remove last
          </Button>
          <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={add} disabled={value.length >= MAX_SECTIONS}>
            Add section
          </Button>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {value.map((last, i) => (
          <li key={i} className="flex items-center gap-3 rounded-lg bg-[var(--surface-card)] px-3 py-2">
            <span className="w-20 shrink-0 text-label font-semibold text-primary">{`Section ${i + 1}`}</span>
            <span className="text-caption text-muted">Rows A to</span>
            <Select
              value={last}
              onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
              aria-label={`Last row of section ${i + 1}`}
              className="h-9 w-20"
            >
              {ROW_LETTERS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
