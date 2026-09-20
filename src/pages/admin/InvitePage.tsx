/**
 * Adding a person: their sign-in and their role, made here and now.
 *
 * There is no server and no invitation email. The account is created with a
 * second Firebase app (`lib/accounts.ts`) so the administrator stays signed
 * in, the profile is written under the rules that say who may grant what, and
 * the screen hands back the details to pass on in person.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { RefreshCw, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Credentials } from '@/components/Credentials';
import { Alert, Button, Field, Input, LinkButton, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { createAccount, suggestPassword } from '@/lib/accounts';
import { saveDistributor } from '@/lib/db';
import { PORTAL_ROOT } from '@/lib/tiles';
import { ROLE_LABEL, type Role } from '@/types';

type TeamRole = Exclude<Role, 'owner'>;

const ORDER: TeamRole[] = [
  'sales_rep',
  'distributor',
  'staff',
  'warehouse_manager',
  'operations_manager',
  'finance_manager',
  'admin',
  'super_admin',
];

export default function InvitePage() {
  const { user } = useAuth();
  const { distributors, warehouses } = useOrg();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<TeamRole>('sales_rep');
  const [distributorId, setDistributorId] = useState('');
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [password, setPassword] = useState(() => suggestPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ name: string; email: string; password: string } | null>(null);

  /* Only a super admin can make another super admin; the rules say the same. */
  const roles = useMemo(() => ORDER.filter((r) => r !== 'super_admin' || user?.role === 'super_admin'), [user?.role]);
  const needsDistributor = role === 'distributor' || role === 'sales_rep';
  const needsDepots = role === 'warehouse_manager';
  const root = user ? PORTAL_ROOT[user.role] : '/';

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDistributorId('');
    setWarehouseIds([]);
    setPassword(suggestPassword());
    setError(null);
    setMade(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!firstName.trim() || !email.trim()) {
      setError('A first name and an email address are needed.');
      return;
    }
    if (password.length < 6) {
      setError('The password needs at least six characters.');
      return;
    }
    if (needsDistributor && !distributorId) {
      setError('Choose the distributor this person acts for.');
      return;
    }

    setBusy(true);
    try {
      const distributor = distributors.find((d) => d.id === distributorId);
      const { uid } = await createAccount({
        email,
        password,
        role,
        firstName,
        lastName,
        phone,
        distributorId: needsDistributor ? distributorId : undefined,
        distributorCategory: needsDistributor ? distributor?.category : undefined,
        warehouseIds: needsDepots ? warehouseIds : undefined,
      });
      /* The distributor's own login is remembered on its record. Not fatal if it fails. */
      if (role === 'distributor' && distributor && !distributor.userId) {
        await saveDistributor({ id: distributor.id, userId: uid }).catch(() => {});
      }
      setMade({ name: `${firstName.trim()} ${lastName.trim()}`.trim(), email: email.trim().toLowerCase(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add person"
        description="Create a sign-in for someone in your organisation. Nothing is emailed; you hand them the details."
        actions={
          <LinkButton to={`${root}/users`} variant="outline" size="sm" icon={<Users size={16} />}>
            Everyone
          </LinkButton>
        }
      />

      <div className="mx-auto max-w-xl">
        {made ? (
          <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
            <h2 className="text-[16px] font-bold text-primary">{made.name} can sign in now</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Hand these over yourself. The password is not shown again once you leave this screen.
            </p>
            <div className="mt-4">
              <Credentials name={made.name} email={made.email} password={made.password} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button icon={<UserPlus size={16} />} onClick={reset}>
                Add another
              </Button>
              <LinkButton to={`${root}/users`} variant="outline">
                See everyone
              </LinkButton>
            </div>
          </section>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="space-y-4 rounded-2xl border border-hairline surface-card p-5 shadow-card"
          >
            {error && (
              <Alert tone="critical" title="Not created" defaultOpen>
                {error}
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
              </Field>
            </div>

            <Field label="Email address" required hint="What they sign in with">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </Field>

            <Field label="Role" required>
              <Select value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
                {roles.map((r) => (
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

            {needsDepots && (
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-primary">Depots they manage</legend>
                {warehouses.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {warehouses.map((w) => (
                      <label
                        key={w.id}
                        className="flex items-center gap-2.5 rounded-xl border border-hairline px-3 py-2.5 text-[13.5px] text-primary"
                      >
                        <input
                          type="checkbox"
                          checked={warehouseIds.includes(w.id)}
                          onChange={(e) =>
                            setWarehouseIds((current) =>
                              e.target.checked ? [...current, w.id] : current.filter((id) => id !== w.id),
                            )
                          }
                          className="h-4 w-4 accent-[var(--color-brand-600)]"
                        />
                        {w.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">No depots yet. Add them under Warehouses first.</p>
                )}
              </fieldset>
            )}

            <Field label="Phone">
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
            </Field>

            <Field label="Password" required hint="At least six characters. They can change it later.">
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
                <Button
                  type="button"
                  variant="outline"
                  icon={<RefreshCw size={15} />}
                  onClick={() => setPassword(suggestPassword())}
                >
                  New
                </Button>
              </div>
            </Field>

            <Button type="submit" full loading={busy} icon={<UserPlus size={16} />}>
              Create account
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
