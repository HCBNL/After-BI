/**
 * People: who has an account.
 *
 * SUSPENDING RATHER THAN DELETING
 *
 * Every account here is on orders, movements and returns by uid. Deleting one
 * leaves a ledger full of `createdBy` values pointing at nothing, and a record
 * trail that cannot name who did anything. `active: false` ends the session
 * immediately, `AuthContext` watches the profile live and signs them out
 * within a second of the flag flipping, and leaves the history whole.
 */

import { useMemo, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { setIdCardActive } from '@/lib/idCards';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  Field,
  Input,
  LinkButton,
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
import { cn } from '@/lib/cn';
import { LockButton, useEditLock } from '@/components/lock/EditLock';
import { LocationSelect } from '@/components/people/LocationSelect';
import { clearDistributorLink, listMembers, setRepDistributors, updateProfile } from '@/lib/db';
import { assertCodeFree, needsEmployeeCode, nextEmployeeCode, normaliseEmployeeCode, withRoleSuffix } from '@/lib/accounts';
import { fullName, partnerScope } from '@/lib/roles';
import { Checklist } from '@/components/Checklist';
import { NIGERIAN_STATES } from '@/data/states';
import { PORTAL_ROOT } from '@/lib/tiles';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL, ROLE_SHORT, ROLES, type Role, type UserProfile } from '@/types';

/** Roles an administrator may assign. `owner` is the platform's, never a tenant's. */
const ASSIGNABLE: Role[] = ROLES.filter((r) => r !== 'owner' && r !== 'agent');

/** The accounts a person works on, as shown in the list: a distributor's own, a rep's assigned. */
function accountsOf(member: UserProfile | null): string[] {
  return member && (member.role === 'sales_rep' || member.role === 'distributor') ? [...(partnerScope(member) ?? [])] : [];
}

export default function UsersPage() {
  const { user } = useAuth();
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
        (member.employeeCode ?? '').toLowerCase().includes(needle) ||
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
            <p className="truncate text-body font-semibold text-primary">{fullName(row)}</p>
            <p className="truncate text-caption text-muted">
              {row.employeeCode ? `${row.employeeCode} · ${row.email}` : row.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (row) => row.role,
      cell: (row) => (
        <div className="min-w-0">
          <Badge tone="brand">{ROLE_SHORT[row.role]}</Badge>
          {(row.position || row.location) && (
            <p className="mt-1 truncate text-caption text-muted">{[row.position, row.location].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      hideOnMobile: true,
      cell: (row) => {
        const names = accountsOf(row).map((id) => distributors.find((d) => d.id === id)?.company).filter(Boolean);
        return (
          <span className="text-label text-muted">{names.length ? names.join(', ') : 'None'}</span>
        );
      },
    },
    {
      key: 'created',
      header: 'Added',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.createdAt ?? '',
      cell: (row) => <span className="text-caption text-muted">{formatDate(row.createdAt)}</span>,
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
          <LinkButton to={`${PORTAL_ROOT[user?.role ?? 'admin']}/invite`} size="sm" icon={<UserPlus size={16} />}>
            Add person
          </LinkButton>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Name, code, email or role…" className="max-w-sm" />
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={setEditing}
        loading={loading}
        emptyIcon={<Users size={22} />}
        emptyTitle={search ? 'Nobody matches that' : 'Just you so far'}
        emptyDescription="Add the rest of your team with Add person."
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
  const { distributors, warehouses } = useOrg();
  const toast = useToast();

  const [warehouseIds, setWarehouseIds] = useState<string[]>(() => [...(member?.warehouseIds ?? [])]);
  const [role, setRole] = useState<Role>(member?.role ?? 'staff');
  const [distributorId, setDistributorId] = useState(member?.distributorId ?? '');
  const [distributorIds, setDistributorIds] = useState<string[]>(() => (member?.role === 'sales_rep' ? accountsOf(member) : []));
  const [territories, setTerritories] = useState<string[]>(() => [...(member?.territories ?? [])]);
  const [active, setActive] = useState(member?.active !== false);
  const [firstName, setFirstName] = useState(member?.firstName ?? '');
  const [lastName, setLastName] = useState(member?.lastName ?? '');
  const [code, setCode] = useState(member?.employeeCode ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [position, setPosition] = useState(member?.position ?? '');
  const [location, setLocation] = useState(member?.location ?? '');
  const [busy, setBusy] = useState(false);
  /* Opens locked, like Settings: nothing about a person moves by a stray tap. */
  const { locked, toggle, lock } = useEditLock();
  const [seed, setSeed] = useState(member?.id);

  if (member && member.id !== seed) {
    setSeed(member.id);
    setRole(member.role);
    setDistributorId(member.distributorId ?? '');
    setDistributorIds(member.role === 'sales_rep' ? accountsOf(member) : []);
    setTerritories([...(member.territories ?? [])]);
    setWarehouseIds([...(member.warehouseIds ?? [])]);
    setActive(member.active !== false);
    setFirstName(member.firstName);
    setLastName(member.lastName);
    setCode(member.employeeCode ?? '');
    setPhone(member.phone ?? '');
    setPosition(member.position ?? '');
    setLocation(member.location ?? '');
    lock();
  }

  if (!member) return null;

  const self = user?.id === member.id;
  const needsDistributor = role === 'distributor';
  const superAdmin = user?.role === 'super_admin';
  /* Only a super admin may change a super admin, or make one. The rules say the same. */
  const canTouch = superAdmin || member.role !== 'super_admin';
  /*
   * Who a person is (name, code, role, position, phone, location) is set by
   * the super admin alone, for everybody. A super admin also sets their own
   * position, phone and location, never their own role. An admin can still
   * suspend people and change what they manage.
   */
  const canIdentity = superAdmin && !self;
  const canOwnCard = superAdmin && self;
  const roleOptions = ASSIGNABLE.filter(
    (r) => r !== 'super_admin' || user?.role === 'super_admin' || member.role === 'super_admin',
  );

  const save = async () => {
    if (needsDistributor && !distributorId) {
      toast.warning('Which account?', 'A distributor login has to be attached to its distributor.');
      return;
    }
    let employeeCode = normaliseEmployeeCode(code);
    if (!self && !firstName.trim()) {
      toast.warning('Name needed', 'A first name is needed.');
      return;
    }
    setBusy(true);
    try {
      /* Your own card line: position, phone and base. Nothing else about yourself. */
      if (canOwnCard) {
        await updateProfile(member.id, { position: position.trim(), phone: phone.trim(), location });
        onSaved();
        return;
      }
      /* Staff without a code get the next one, the same way a new account does. */
      if (canIdentity && needsEmployeeCode(role) && !employeeCode && member.orgId) {
        employeeCode = await nextEmployeeCode(member.orgId, role);
      }
      if (canIdentity && employeeCode && employeeCode !== (member.employeeCode ?? '') && member.orgId) {
        await assertCodeFree(member.orgId, employeeCode, member.id);
      }
      const distributor = distributors.find((d) => d.id === distributorId);
      await updateProfile(member.id, {
        active,
        /* Identity: set here by the super admin, never by the person (firestore.rules). */
        ...(canIdentity
          ? {
              role,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim(),
              position: position.trim(),
              location,
              ...(employeeCode ? { employeeCode } : {}),
            }
          : {}),
        distributorId: needsDistributor ? distributorId : undefined,
        /* The tier is snapshotted onto the profile so the catalogue needs no
           join: see `UserProfile.distributorCategory`. It has to be rewritten
           whenever the attachment changes or it goes stale. */
        distributorCategory: needsDistributor ? distributor?.category : undefined,
        territories: role === 'sales_rep' ? territories : undefined,
        /* Depots only mean something to a warehouse manager; any other role
           has them cleared, so a promotion does not carry a stale scope. */
        warehouseIds: role === 'warehouse_manager' ? warehouseIds : [],
      });
      /* A login that stops being a distributor must not keep that account,
         or it would still read it through the rules. */
      if (!needsDistributor && member.distributorId) await clearDistributorLink(member.id);
      if (role === 'sales_rep') await setRepDistributors(member.id, distributorIds);
      /* A suspended person's ID card stops verifying at once; restoring them brings it back. */
      if ((member.active !== false) !== active) await setIdCardActive(member.id, active);
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
          <Button onClick={() => void save()} loading={busy} disabled={!canTouch || locked}>
            Save
          </Button>
        </>
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-sunken)] px-4 py-3">
        <p className="text-label leading-snug text-secondary">
          {locked ? 'Locked. Unlock to change anything.' : 'Editing. Saving locks it again.'}
        </p>
        <LockButton surface locked={locked} onToggle={toggle} />
      </div>
      <fieldset disabled={locked} className={cn('m-0 min-w-0 space-y-4 border-0 p-0', locked && 'ab-locked')}>
        {(!self || canOwnCard) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {!self && (
              <>
                <Field label="First name" required>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!canIdentity} />
                </Field>
                <Field label="Last name">
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!canIdentity} />
                </Field>
                {needsEmployeeCode(role) && (
                  <Field label="Employee code" hint="Company letters, staff number, then the role (SA, FN, OP, WH, SR, HR, ST). Changing the role changes the ending.">
                    <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Assigned on save" maxLength={24} disabled={!canIdentity} />
                  </Field>
                )}
              </>
            )}
            <Field label="Position" hint="Printed on their ID and business card, e.g. Managing Director.">
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={ROLE_LABEL[role]} maxLength={40} disabled={!(canIdentity || canOwnCard)} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!(canIdentity || canOwnCard)} />
            </Field>
            <Field label="Location">
              <LocationSelect value={location} onChange={setLocation} disabled={!(canIdentity || canOwnCard)} />
            </Field>
          </div>
        )}
        <Field label="Role" required>
          <Select
            value={role}
            onChange={(e) => {
              const next = e.target.value as Role;
              setRole(next);
              if (code) setCode(withRoleSuffix(code, next));
            }}
            disabled={!canIdentity}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>

        {needsDistributor && (
          <Field label="Distributor" required hint="The distributor this login belongs to">
            <Select value={distributorId} onChange={(e) => setDistributorId(e.target.value)}>
              <option value="">Choose…</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.company} ({d.category})
                </option>
              ))}
            </Select>
          </Field>
        )}

        {role === 'sales_rep' && (
          <fieldset>
            <legend className="mb-1 text-label font-semibold text-primary">Distributors they manage</legend>
            <p className="mb-2 text-caption leading-snug text-muted">
              A distributor can have several reps. Untick an account to hand it to someone else.
            </p>
            <Checklist
              items={distributors.map((d) => ({ id: d.id, label: d.company }))}
              value={distributorIds}
              onChange={setDistributorIds}
              disabled={!canTouch}
              empty="No distributors yet."
            />
          </fieldset>
        )}

        {role === 'warehouse_manager' && (
          <fieldset>
            <legend className="mb-1 text-label font-semibold text-primary">Depots they manage</legend>
            <Checklist
              items={warehouses.map((w) => ({ id: w.id, label: w.name }))}
              value={warehouseIds}
              onChange={setWarehouseIds}
              disabled={!canTouch}
              empty="No depots yet. Add them under Depots first."
            />
          </fieldset>
        )}

        {role === 'sales_rep' && (
          <fieldset>
            <legend className="mb-1 text-label font-semibold text-primary">States they cover</legend>
            <p className="mb-2 text-caption leading-snug text-muted">
              Drawn on the coverage map in Analytics. Leave it empty for the whole country.
            </p>
            <div className="scrollbar-thin max-h-56 overflow-y-auto rounded-xl border border-hairline p-2">
              <Checklist
                items={NIGERIAN_STATES.map((state) => ({ id: state, label: state }))}
                value={territories}
                onChange={setTerritories}
                disabled={!canTouch}
                empty=""
              />
            </div>
          </fieldset>
        )}

        {!canTouch && (
          <p className="text-caption leading-snug text-muted">
            Only a super admin can change another super admin.
          </p>
        )}
        {canTouch && !superAdmin && (
          <p className="text-caption leading-snug text-muted">
            Name, role, position, phone and location are set by your super admin.
          </p>
        )}

        <div className="rounded-xl border border-hairline p-4">
          <Switch
            checked={active}
            onChange={setActive}
            disabled={self || !canTouch}
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

          Not paternalism: it is the one change that cannot be undone from
          inside the app. A super admin who removes their own role has no way
          back in, and on a single-admin organisation that is a support ticket
          and a manual Firestore edit.
 */}
        {self && (
          <p className="text-caption leading-snug text-muted">
            This is your own account. You can set your own position, phone and location, but not your own role, and you cannot suspend yourself.
          </p>
        )}
      </fieldset>
    </Modal>
  );
}
