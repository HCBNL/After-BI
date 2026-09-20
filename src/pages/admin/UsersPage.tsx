/**
 * People — who has an account.
 *
 * SUSPENDING RATHER THAN DELETING
 *
 * Every account here is on orders, movements and returns by uid. Deleting one
 * leaves a ledger full of `createdBy` values pointing at nothing, and a record
 * trail that cannot name who did anything. `active: false` ends the session
 * immediately — `AuthContext` watches the profile live and signs them out
 * within a second of the flag flipping — and leaves the history whole.
 */

import { useMemo, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  Field,
  Modal,
  SearchInput,
  Select,
  Switch,
  useToast,
  type Column,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { listMembers, updateProfile } from '@/lib/db';
import { fullName } from '@/lib/roles';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL, ROLE_SHORT, ROLES, type Role, type UserProfile } from '@/types';

/** Roles an administrator may assign. `owner` is the platform's, never a tenant's. */
const ASSIGNABLE: Role[] = ROLES.filter((r) => r !== 'owner');

export default function UsersPage() {
  const { distributors } = useOrg();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<UserProfile | null>(null);

  const { data, loading, reload } = useAsync(() => listMembers(), [], { handleError: true });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter(
      (member) =>
        !needle ||
        fullName(member).toLowerCase().includes(needle) ||
        member.email.toLowerCase().includes(needle) ||
        ROLE_LABEL[member.role].toLowerCase().includes(needle),
    );
  }, [data, search]);

  const columns: Column<UserProfile>[] = [
    {
      key: 'name',
      header: 'Person',
      sortValue: (row) => row.lastName,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={`${row.firstName} ${row.lastName}`} src={row.photoURL} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-primary">{fullName(row)}</p>
            <p className="truncate text-[12px] text-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (row) => row.role,
      cell: (row) => <Badge tone="brand">{ROLE_SHORT[row.role]}</Badge>,
    },
    {
      key: 'account',
      header: 'Account',
      hideOnMobile: true,
      cell: (row) => {
        const distributor = distributors.find((d) => d.id === row.distributorId);
        return (
          <span className="text-[12.5px] text-muted">{distributor?.company ?? '—'}</span>
        );
      },
    },
    {
      key: 'created',
      header: 'Added',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.createdAt ?? '',
      cell: (row) => <span className="text-[12px] text-muted">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'status',
      header: '',
      cell: (row) => (row.active === false ? <Badge tone="critical">Suspended</Badge> : null),
    },
  ];

  return (
    <div>
      <PageHeader
        title="People"
        description="Who has an account, what they may open, and who has been suspended."
        actions={
          <Button size="sm" icon={<UserPlus size={16} />} onClick={() => toast.info('Use Invite', 'New accounts are created from the Invite screen.')}>
            Invite
          </Button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Name, email or role…" className="max-w-sm" />
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={setEditing}
        loading={loading}
        emptyIcon={<Users size={22} />}
        emptyTitle={search ? 'Nobody matches that' : 'Just you so far'}
        emptyDescription="Invite the rest of your team from the Invite screen."
      />

      <MemberModal
        member={editing}
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

function MemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: UserProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { distributors } = useOrg();
  const toast = useToast();

  const [role, setRole] = useState<Role>(member?.role ?? 'staff');
  const [distributorId, setDistributorId] = useState(member?.distributorId ?? '');
  const [active, setActive] = useState(member?.active !== false);
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState(member?.id);

  if (member && member.id !== seed) {
    setSeed(member.id);
    setRole(member.role);
    setDistributorId(member.distributorId ?? '');
    setActive(member.active !== false);
  }

  if (!member) return null;

  const self = user?.id === member.id;
  const needsDistributor = role === 'distributor' || role === 'sales_rep';

  const save = async () => {
    if (needsDistributor && !distributorId) {
      toast.warning('Which account?', 'A distributor or rep has to be attached to a distributor.');
      return;
    }
    setBusy(true);
    try {
      const distributor = distributors.find((d) => d.id === distributorId);
      await updateProfile(member.id, {
        role,
        active,
        distributorId: needsDistributor ? distributorId : undefined,
        /* The tier is snapshotted onto the profile so the catalogue needs no
           join — see `UserProfile.distributorCategory`. It has to be rewritten
           whenever the attachment changes or it goes stale. */
        distributorCategory: needsDistributor ? distributor?.category : undefined,
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
      title={fullName(member)}
      description={member.email}
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
        <Field label="Role" required>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={self}>
            {ASSIGNABLE.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>

        {needsDistributor && (
          <Field label="Distributor" required hint="Whose account they act for">
            <Select value={distributorId} onChange={(e) => setDistributorId(e.target.value)}>
              <option value="">Choose…</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.company} — {d.category}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="rounded-xl border border-hairline p-4">
          <Switch
            checked={active}
            onChange={setActive}
            disabled={self}
            label="Active"
            description={
              active
                ? 'They can sign in. Switch this off to end their session immediately.'
                : 'Signed out and locked out. Their history stays on every record they touched.'
            }
          />
        </div>

        {/*
          You cannot demote or suspend yourself.

          Not paternalism — it is the one change that cannot be undone from
          inside the app. A super admin who removes their own role has no way
          back in, and on a single-admin organisation that is a support ticket
          and a manual Firestore edit.
        */}
        {self && (
          <p className="text-[12px] leading-snug text-muted">
            This is your own account. You cannot change your own role or suspend yourself — ask
            another administrator.
          </p>
        )}
      </div>
    </Modal>
  );
}
