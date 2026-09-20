/**
 * Every organisation on the platform.
 *
 * The only screen in the app that reads `orgs/` as a collection rather than
 * addressing one document inside it — see `listTenants` in db.ts. The rules
 * refuse it to everybody but `owner`, and that single rule is what stops a
 * customer's administrator enumerating their competitors.
 */

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  DataTable,
  Field,
  Input,
  Modal,
  SearchInput,
  Select,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { listTenants } from '@/lib/db';
import { db } from '@/lib/firebase';
import { TENANTS, type OrgTenant, type SubscriptionStatus } from '@/lib/tenant';
import { doc, updateDoc } from 'firebase/firestore';
import { formatDate, naira, count } from '@/lib/format';

const TONE: Record<SubscriptionStatus, 'good' | 'gold' | 'critical' | 'neutral'> = {
  active: 'good',
  trial: 'gold',
  'past-due': 'critical',
  suspended: 'neutral',
};

export default function OrganisationsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<OrgTenant | null>(null);

  const { data, loading, reload } = useAsync(() => listTenants(), [], { handleError: true });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter(
      (org) => !needle || org.name.toLowerCase().includes(needle) || org.slug.includes(needle),
    );
  }, [data, search]);

  const columns: Column<OrgTenant>[] = [
    {
      key: 'name',
      header: 'Organisation',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-primary">{row.name}</p>
          <p className="truncate text-[12px] text-muted">/{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'seats',
      header: 'Seats',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.seats ?? 0,
      cell: (row) => <span className="tabular text-[13px]">{count(row.seats ?? 0)}</span>,
    },
    {
      key: 'fee',
      header: 'Pays',
      align: 'right',
      sortValue: (row) => row.subscriptionFee ?? 0,
      cell: (row) => (
        <span className="tabular text-[13.5px] font-bold text-primary">
          {row.subscriptionFee ? naira(row.subscriptionFee) : '—'}
        </span>
      ),
    },
    {
      key: 'renews',
      header: 'Renews',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.renewsAt ?? '',
      cell: (row) => <span className="text-[12px] text-muted">{formatDate(row.renewsAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      cell: (row) => <Badge tone={TONE[row.status]}>{row.status}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Organisations"
        description="Every business on the platform: seats, subscription and status."
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Name or slug…" className="max-w-sm" />
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={setEditing}
        loading={loading}
        emptyIcon={<Building2 size={22} />}
        emptyTitle="No organisations yet"
        emptyDescription="A business appears here the moment it is created."
      />

      <TenantModal
        tenant={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
          toast.success('Saved');
        }}
      />
    </div>
  );
}

function TenantModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: OrgTenant | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Partial<OrgTenant>>(tenant ?? {});
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState(tenant?.id);

  if (tenant && tenant.id !== seed) {
    setSeed(tenant.id);
    setDraft(tenant);
  }
  if (!tenant) return null;

  const save = async () => {
    setBusy(true);
    try {
      await updateDoc(doc(db, TENANTS, tenant.id), {
        status: draft.status ?? tenant.status,
        subscriptionFee: Number(draft.subscriptionFee) || 0,
        renewsAt: draft.renewsAt ?? null,
        note: draft.note ?? null,
      });
      onSaved();
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={tenant.name}
      description={`Created ${formatDate(tenant.createdAt)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Status" required>
          <Select
            value={draft.status ?? 'trial'}
            onChange={(e) => setDraft((c) => ({ ...c, status: e.target.value as SubscriptionStatus }))}
          >
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="past-due">Past due</option>
            <option value="suspended">Suspended</option>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="What they pay"
            hint="Per month"
          >
            <Input
              type="number"
              min={0}
              value={draft.subscriptionFee ?? ''}
              onChange={(e) => setDraft((c) => ({ ...c, subscriptionFee: Number(e.target.value) }))}
              leading={<span className="text-[13px]">₦</span>}
            />
          </Field>
          <Field label="Renews on">
            <Input
              type="date"
              value={draft.renewsAt?.slice(0, 10) ?? ''}
              onChange={(e) => setDraft((c) => ({ ...c, renewsAt: e.target.value }))}
            />
          </Field>
        </div>

        {/*
          The negotiated figure, not a plan rate.

          A distribution contract is negotiated — a three-depot regional and a
          national principal on the same platform do not pay the same, and
          neither pays the published rate. Typing it means the revenue figure on
          the home screen is money somebody actually owes.
        */}
        <Field label="Note" hint="Never shown inside their organisation">
          <Textarea
            rows={3}
            value={draft.note ?? ''}
            onChange={(e) => setDraft((c) => ({ ...c, note: e.target.value }))}
            placeholder="Who signed it, what was agreed, when to revisit"
          />
        </Field>
      </div>
    </Modal>
  );
}
