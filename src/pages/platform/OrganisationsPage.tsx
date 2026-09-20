/**
 * Every organisation on the platform — and where new ones are made.
 *
 * "New organisation" writes the tenant document and its settings, then
 * creates the first administrator's sign-in in the same form. After that the
 * administrator does everything else inside their own organisation.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { Building2, Plus, RefreshCw, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Credentials } from '@/components/Credentials';
import {
  Alert,
  Avatar,
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
import { db } from '@/lib/firebase';
import { listTenants } from '@/lib/db';
import { createAccount, suggestPassword } from '@/lib/accounts';
import { createTenant, listOrgMembers, ORG_ID_PATTERN, slugify } from '@/lib/platform';
import { TENANTS, type OrgTenant, type SubscriptionStatus } from '@/lib/tenant';
import { formatDate, naira } from '@/lib/format';
import { fullName } from '@/lib/roles';
import { ROLE_LABEL } from '@/types';

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: 'Trial',
  active: 'Active',
  'past-due': 'Past due',
  suspended: 'Suspended',
};

const TONE: Record<SubscriptionStatus, 'good' | 'gold' | 'critical' | 'neutral'> = {
  active: 'good',
  trial: 'gold',
  'past-due': 'critical',
  suspended: 'neutral',
};

const STATUSES: SubscriptionStatus[] = ['trial', 'active', 'past-due', 'suspended'];

export default function OrganisationsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<OrgTenant | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, loading, reload } = useAsync(() => listTenants(), [], { handleError: true });

  /* `?new=1` — from the home screen's "New organisation" — opens the form straight away. */
  useEffect(() => {
    if (params.get('new') !== '1') return;
    setCreating(true);
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter(
      (t) => !needle || t.name.toLowerCase().includes(needle) || t.id.toLowerCase().includes(needle),
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
          <p className="truncate text-[12px] text-muted">{row.id}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      cell: (row) => <Badge tone={TONE[row.status] ?? 'neutral'}>{STATUS_LABEL[row.status] ?? row.status}</Badge>,
    },
    {
      key: 'fee',
      header: 'Monthly fee',
      align: 'right',
      sortValue: (row) => row.subscriptionFee ?? 0,
      cell: (row) => (
        <span className="text-[13px] font-semibold text-primary tabular">
          {row.subscriptionFee ? naira(row.subscriptionFee) : '—'}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Since',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.createdAt ?? '',
      cell: (row) => <span className="text-[12px] text-muted">{formatDate(row.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Organisations"
        description="Every company on the platform: its status, what it pays, and who administers it."
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            New organisation
          </Button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Name or ID…" className="max-w-sm" />
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={setEditing}
        loading={loading}
        emptyIcon={<Building2 size={22} />}
        emptyTitle={search ? 'Nothing matches that' : 'No organisations yet'}
        emptyDescription="Create the first one with New organisation."
      />

      {creating && <NewOrgModal onClose={() => setCreating(false)} onCreated={reload} />}

      {editing && (
        <TenantModal
          key={editing.id}
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
            toast.success('Saved');
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------ a new organisation */

function NewOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('trial');
  const [fee, setFee] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => suggestPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Once the organisation exists, a retry only makes the account. */
  const [orgMade, setOrgMade] = useState(false);
  const [done, setDone] = useState<{ name: string; email: string; password: string } | null>(null);

  const slug = idTouched ? id : slugify(name);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Give the organisation a name.');
    if (!ORG_ID_PATTERN.test(slug)) {
      return setError('The ID must be lower case letters, numbers and hyphens, like "bella-foods".');
    }
    if (!firstName.trim() || !email.trim()) return setError('The administrator needs a first name and an email address.');
    if (password.length < 6) return setError('The password needs at least six characters.');

    setBusy(true);
    try {
      if (!orgMade) {
        await createTenant({ id: slug, name, status, subscriptionFee: Number(fee) || 0 });
        setOrgMade(true);
        onCreated();
      }
      await createAccount({ orgId: slug, role: 'super_admin', email, password, firstName, lastName });
      setDone({ name: `${firstName.trim()} ${lastName.trim()}`.trim(), email: email.trim().toLowerCase(), password });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(orgMade ? `The organisation was created, but its administrator was not: ${message}` : message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Modal
        open
        onClose={onClose}
        title={`${name.trim()} is ready`}
        description={`${done.name} is its super admin. They add everyone else from inside.`}
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <Credentials name={done.name} email={done.email} password={done.password} />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      closeOnBackdrop={false}
      title="New organisation"
      description="The company, and the first person who will run it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {orgMade ? 'Create the administrator' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert tone="critical" title="Not finished" defaultOpen>
            {error}
          </Alert>
        )}

        <Field label="Organisation name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={orgMade} placeholder="Bella Foods Ltd" />
        </Field>
        <Field label="Organisation ID" required hint="Permanent. Lower case letters, numbers and hyphens.">
          <Input
            value={slug}
            onChange={(e) => {
              setIdTouched(true);
              setId(e.target.value.toLowerCase());
            }}
            disabled={orgMade}
            placeholder="bella-foods"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)} disabled={orgMade}>
              {STATUSES.filter((s) => s !== 'suspended').map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Monthly fee (₦)">
            <Input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ''))} disabled={orgMade} />
          </Field>
        </div>

        <div className="border-t border-hairline pt-4">
          <p className="text-[14px] font-bold text-primary">First administrator</p>
          <p className="mt-0.5 text-[12.5px] text-muted">A super admin. They add everyone else.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <Field label="Email address" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Password" required>
          <div className="flex gap-2">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            <Button type="button" variant="outline" icon={<RefreshCw size={15} />} onClick={() => setPassword(suggestPassword())}>
              New
            </Button>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------- one organisation */

function TenantModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: OrgTenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<SubscriptionStatus>(tenant.status);
  const [fee, setFee] = useState(tenant.subscriptionFee ? String(tenant.subscriptionFee) : '');
  const [renewsAt, setRenewsAt] = useState(tenant.renewsAt?.slice(0, 10) ?? '');
  const [note, setNote] = useState(tenant.note ?? '');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const { data: people, loading: peopleLoading, reload: reloadPeople } = useAsync(
    () => listOrgMembers(tenant.id),
    [tenant.id],
    { handleError: true },
  );

  const save = async () => {
    setBusy(true);
    try {
      await updateDoc(doc(db, TENANTS, tenant.id), {
        status,
        subscriptionFee: Number(fee) || 0,
        renewsAt: renewsAt || null,
        note: note.trim(),
        ...(people ? { seats: people.length } : {}),
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
      description={`ID ${tenant.id}. On AfterBI since ${formatDate(tenant.createdAt)}.`}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" hint="Suspended signs everyone in it out.">
            <Select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Monthly fee (₦)">
            <Input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ''))} />
          </Field>
        </div>
        <Field label="Renews on">
          <Input type="date" value={renewsAt} onChange={(e) => setRenewsAt(e.target.value)} />
        </Field>
        <Field label="Note" hint="Only you see this.">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <div className="border-t border-hairline pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] font-bold text-primary">People</p>
            {!adding && (
              <Button variant="outline" size="sm" icon={<UserPlus size={15} />} onClick={() => setAdding(true)}>
                Add an administrator
              </Button>
            )}
          </div>

          {adding && (
            <AddAdmin
              orgId={tenant.id}
              onDone={() => {
                setAdding(false);
                reloadPeople();
              }}
            />
          )}

          <ul className="mt-3 divide-y divide-[var(--border-hairline)]">
            {peopleLoading && !people ? (
              <li className="py-3 text-[13px] text-muted">Loading…</li>
            ) : people?.length ? (
              people.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 py-2.5">
                  <Avatar name={`${p.firstName} ${p.lastName}`} src={p.photoURL} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-primary">{fullName(p)}</p>
                    <p className="truncate text-[12px] text-muted">{p.email}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-secondary">
                    {ROLE_LABEL[p.role] ?? p.role}
                    {p.active === false ? ', suspended' : ''}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-3 text-[13px] text-muted">Nobody yet. Add its first administrator.</li>
            )}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function AddAdmin({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin'>('super_admin');
  const [password, setPassword] = useState(() => suggestPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ name: string; email: string; password: string } | null>(null);

  const create = async () => {
    setError(null);
    if (!firstName.trim() || !email.trim()) return setError('A first name and an email address are needed.');
    if (password.length < 6) return setError('The password needs at least six characters.');
    setBusy(true);
    try {
      await createAccount({ orgId, role, email, password, firstName, lastName });
      setMade({ name: `${firstName.trim()} ${lastName.trim()}`.trim(), email: email.trim().toLowerCase(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that account.');
    } finally {
      setBusy(false);
    }
  };

  if (made) {
    return (
      <div className="mt-3 space-y-3">
        <Credentials name={made.name} email={made.email} password={made.password} />
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-hairline p-4">
      {error && (
        <Alert tone="critical" title="Not created" defaultOpen>
          {error}
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" required>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Last name">
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
        </Field>
      </div>
      <Field label="Email address" required>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as 'super_admin' | 'admin')}>
            <option value="super_admin">{ROLE_LABEL.super_admin}</option>
            <option value="admin">{ROLE_LABEL.admin}</option>
          </Select>
        </Field>
        <Field label="Password" required>
          <div className="flex gap-2">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            <Button type="button" variant="outline" size="sm" onClick={() => setPassword(suggestPassword())} aria-label="Suggest another password">
              <RefreshCw size={15} />
            </Button>
          </div>
        </Field>
      </div>
      <Button size="sm" loading={busy} icon={<UserPlus size={15} />} onClick={() => void create()}>
        Create sign-in
      </Button>
    </div>
  );
}
