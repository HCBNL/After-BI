/**
 * Distributors — who we sell to.
 *
 * A distributor row carries three things that decide how the rest of the app
 * behaves for them, and all three are on this screen rather than buried in a
 * settings tab:
 *
 *   - the TIER, which chooses which of a product's three prices they ever see;
 *   - the CREDIT LIMIT, which the order screen checks before anybody builds a
 *     basket;
 *   - the STATUS, because a `pending` distributor has been created but has not
 *     registered, and cannot sign in or be ordered for.
 *
 * The outstanding balance beside each one is computed from their invoices, not
 * stored — see `creditPosition` in db.ts for why a stored balance is a number
 * that can be wrong in the one direction that costs money.
 */

import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Field,
  Input,
  Modal,
  SearchInput,
  Select,
  useToast,
  type Column,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useOrg } from '@/context/OrgContext';
import { creditPosition, listMembers, saveDistributor, setRepDistributors } from '@/lib/db';
import { fullName, isAdmin, partnerScope } from '@/lib/roles';
import { Checklist } from '@/components/Checklist';
import { distributorAccess } from '@/lib/amend';
import { useAuth } from '@/context/AuthContext';
import { naira } from '@/lib/format';
import { PRICE_TIERS, TIER_LABEL, type Distributor, type DistributorStatus, type UserProfile } from '@/types';

const STATUS_TONE: Record<DistributorStatus, 'good' | 'gold' | 'neutral'> = {
  active: 'good',
  pending: 'gold',
  inactive: 'neutral',
};

export default function DistributorsPage() {
  const { distributors, loading, reload } = useOrg();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Distributor> | null>(null);
  const { data: members, reload: reloadMembers } = useAsync(() => listMembers(), []);

  /* Who manages each account: every active rep whose list includes it. */
  const repsByAccount = useMemo(() => {
    const map = new Map<string, UserProfile[]>();
    for (const m of members ?? []) {
      if (m.role !== 'sales_rep' || m.active === false) continue;
      for (const id of partnerScope(m) ?? []) map.set(id, [...(map.get(id) ?? []), m]);
    }
    return map;
  }, [members]);

  /*
   * One credit read per distributor, fired once when the list lands.
   *
   * Deliberately not inside the row renderer: a table that starts a query per
   * row re-fires all of them on every sort, every filter keystroke and every
   * re-render, which on a 60-distributor list is how a screen makes four
   * hundred reads doing nothing.
   */
  const { data: balances } = useAsync(
    async () => {
      const entries = await Promise.all(
        distributors.map(async (d) => [d.id, await creditPosition(d.id, d.creditLimit)] as const),
      );
      return Object.fromEntries(entries);
    },
    [distributors.map((d) => d.id).join('|')],
  );

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return distributors.filter(
      (d) =>
        !needle ||
        d.company.toLowerCase().includes(needle) ||
        d.contactName.toLowerCase().includes(needle) ||
        (d.location ?? '').toLowerCase().includes(needle),
    );
  }, [distributors, search]);

  const columns: Column<Distributor>[] = [
    {
      key: 'company',
      header: 'Distributor',
      sortValue: (row) => row.company,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-primary">{row.company}</p>
          <p className="truncate text-[12px] text-muted">
            {row.contactName}
            {row.location ? ` · ${row.location}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      sortValue: (row) => row.category,
      cell: (row) => <Badge tone="brand">{row.category}</Badge>,
    },
    {
      key: 'reps',
      header: 'Sales reps',
      hideOnMobile: true,
      cell: (row) => {
        const reps = repsByAccount.get(row.id) ?? [];
        return (
          <span className="text-[12.5px] text-muted">{reps.length ? reps.map((r) => r.firstName).join(', ') : '—'}</span>
        );
      },
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => balances?.[row.id]?.outstanding ?? 0,
      cell: (row) => {
        const position = balances?.[row.id];
        if (!position) return <span className="skeleton inline-block h-4 w-16 rounded" />;
        return (
          <div>
            <p className="tabular text-[13px] font-bold text-primary">
              {naira(position.outstanding)}
            </p>
            {position.overdue > 0 && (
              <p className="tabular text-[11.5px] font-semibold text-status-critical">
                {naira(position.overdue)} overdue
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'credit',
      header: 'Credit left',
      align: 'right',
      hideOnMobile: true,
      cell: (row) => {
        const position = balances?.[row.id];
        if (!position) return null;
        if (position.headroom === null)
          return <span className="text-[11.5px] text-muted">no limit</span>;
        return (
          <span
            className={
              position.headroom <= 0
                ? 'tabular text-[13px] font-bold text-status-critical'
                : 'tabular text-[13px] text-secondary'
            }
          >
            {naira(position.headroom)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      cell: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Distributors"
        description="Every trading partner: tier, territory, credit, and what they currently owe."
        actions={
          <Button
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setEditing({ category: 'OT', status: 'pending', paymentTermsDays: 30 })}
          >
            New distributor
          </Button>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Company, contact or location…"
          className="max-w-sm"
        />
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={(row) => setEditing(row)}
        loading={loading}
        emptyIcon={<Building2 size={22} />}
        emptyTitle={search ? 'Nothing matches that' : 'No distributors yet'}
        emptyDescription={
          search ? 'Try a different company name.' : 'Add the first one — an order needs somebody to be for.'
        }
      />

      <DistributorModal
        members={members ?? []}
        onAssigned={reloadMembers}
        distributor={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
          toast.success('Distributor saved');
        }}
      />
    </div>
  );
}

function DistributorModal({
  distributor,
  members,
  onClose,
  onSaved,
  onAssigned,
}: {
  distributor: Partial<Distributor> | null;
  members: UserProfile[];
  onClose: () => void;
  onSaved: () => void;
  onAssigned: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [draft, setDraft] = useState<Partial<Distributor>>(distributor ?? {});
  const [busy, setBusy] = useState(false);

  /* Contact details and commercial terms are two different permissions on one
     form. See `distributorAccess`. */
  const access = distributorAccess(user, distributor?.id);

  /* The reps who manage this account. Only an administrator can change them. */
  const reps = useMemo(() => members.filter((m) => m.role === 'sales_rep' && m.active !== false), [members]);
  const canAssign = Boolean(user && isAdmin(user.role));
  const [repIds, setRepIds] = useState<string[]>([]);
  useEffect(() => {
    const id = distributor?.id;
    setRepIds(id ? reps.filter((r) => (partnerScope(r) ?? []).includes(id)).map((r) => r.id) : []);
  }, [distributor?.id, reps]);

  useEffect(() => {
    if (distributor) setDraft(distributor);
  }, [distributor?.id]);

  if (!distributor) return null;

  const set = <K extends keyof Distributor>(key: K, value: Distributor[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!draft.company?.trim() || !draft.contactName?.trim()) {
      toast.warning('A distributor needs a company and a contact');
      return;
    }
    setBusy(true);
    try {
      const id = await saveDistributor({
        ...draft,
        company: draft.company.trim(),
        contactName: draft.contactName.trim(),
        email: draft.email?.trim() ?? '',
      });
      if (canAssign) {
        const changes = reps.filter((rep) => (partnerScope(rep) ?? []).includes(id) !== repIds.includes(rep.id));
        await Promise.all(
          changes.map((rep) => {
            const current = partnerScope(rep) ?? [];
            return setRepDistributors(rep.id, repIds.includes(rep.id) ? [...current, id] : current.filter((x) => x !== id));
          }),
        );
        if (changes.length) onAssigned();
      }
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
      title={draft.id ? draft.company || 'Distributor' : 'New distributor'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy} disabled={!access.canEditContact}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/*
          Say what is locked and why, rather than greying out four controls with
          no explanation. "Why can't I change this" was the second most common
          question about the old app, after "why can't I change anything".
        */}
        {!access.canEditTerms && access.reason && (
          <Alert tone="info" title="Some fields are locked">
            {access.reason}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" required>
            <Input value={draft.company ?? ''} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label="Contact" required>
            <Input
              value={draft.contactName ?? ''}
              onChange={(e) => set('contactName', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" hint="Their contact email">
            <Input type="email" value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <Input
              value={draft.location ?? ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Lagos"
            />
          </Field>
          <Field
            label="Price tier"
            required
            hint={access.canEditTerms ? 'Which price they see' : 'Administrators only'}
          >
            <Select
              value={draft.category ?? 'OT'}
              disabled={!access.canEditTerms}
              onChange={(e) => set('category', e.target.value as Distributor['category'])}
            >
              {PRICE_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier} — {TIER_LABEL[tier]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Credit limit"
            hint={access.canEditTerms ? 'Blank for none' : 'Administrators only'}
          >
            <Input
              type="number"
              min={0}
              disabled={!access.canEditTerms}
              value={draft.creditLimit ?? ''}
              onChange={(e) =>
                set('creditLimit', e.target.value === '' ? (undefined as never) : Number(e.target.value))
              }
              leading={<span className="text-[13px]">₦</span>}
              placeholder="No limit"
            />
          </Field>
          <Field label="Payment terms" hint="Days">
            <Input
              type="number"
              min={0}
              disabled={!access.canEditTerms}
              value={draft.paymentTermsDays ?? 30}
              onChange={(e) => set('paymentTermsDays', Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Status" hint={access.canEditTerms ? undefined : 'Administrators only'}>
          <Select
            value={draft.status ?? 'pending'}
            disabled={!access.canEditTerms}
            onChange={(e) => set('status', e.target.value as DistributorStatus)}
          >
            <option value="pending">Pending — not trading yet</option>
            <option value="active">Active — trading</option>
            <option value="inactive">Inactive — no new orders</option>
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold text-primary">Sales reps</legend>
          <p className="mb-2 text-[12px] leading-snug text-muted">
            {canAssign
              ? 'Tick everyone who manages this account. Several is fine, one per branch say. Untick to hand it to someone else.'
              : 'An administrator chooses who manages this account.'}
          </p>
          <Checklist
            items={reps.map((r) => ({ id: r.id, label: fullName(r) }))}
            value={repIds}
            onChange={setRepIds}
            disabled={!canAssign}
            empty="No sales reps yet. Add them under People, then Add person."
          />
        </fieldset>
      </div>
    </Modal>
  );
}
