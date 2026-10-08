/**
 * Platform → AfterBI staff. Create the people who sell AfterBI.
 *
 * A staff account (role `agent`) belongs to no organisation. When it signs in
 * it gets `/portal/staff`: its own ID card (signed by the CEO), business card
 * and the proposal maker. It can read nothing of any customer.
 */

import { useState, type FormEvent } from 'react';
import { Copy, KeyRound, MapPin, Phone, Plus, RefreshCw, UserCheck, UserX } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, useToast } from '@/components/ui';
import { Hint } from '@/components/ui/Hint';
import { Loading } from '@/components/brand/Loader';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { createAccount, suggestPassword } from '@/lib/accounts';
import { listStaff, publishStaffCard, setStaffActive, staffNumber } from '@/lib/staff';
import { whatsappLink, whatsappNumber } from '@/lib/businessCard';
import type { UserProfile } from '@/types';

export default function StaffPage() {
  const toast = useToast();
  const { resetPassword } = useAuth();
  const { data, loading, reload } = useAsync(listStaff, [], { handleError: true });
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(() => suggestPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [made, setMade] = useState<{ name: string; email: string; password: string; phone: string } | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    setBusy(true);
    setError('');
    try {
      const { uid } = await createAccount({
        role: 'agent',
        email: text('email'),
        password,
        firstName: text('firstName'),
        lastName: text('lastName'),
        phone: text('phone') || undefined,
        position: text('position') || undefined,
        location: text('location') || undefined,
      });
      await publishStaffCard({
        id: uid,
        firstName: text('firstName'),
        lastName: text('lastName'),
        position: text('position'),
        location: text('location'),
        active: true,
      }).catch(() => undefined);
      setMade({ name: `${text('firstName')} ${text('lastName')}`, email: text('email').toLowerCase(), password, phone: text('phone') });
      setOpen(false);
      setPassword(suggestPassword());
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that account.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (person: UserProfile) => {
    setWorking(person.id);
    try {
      await setStaffActive(person, person.active === false);
      reload();
    } catch (err) {
      toast.error('Could not change that', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setWorking(null);
    }
  };

  const sendReset = async (person: UserProfile) => {
    try {
      await resetPassword(person.email);
      toast.success('Reset email sent', `A link to choose a new password went to ${person.email}.`);
    } catch (err) {
      toast.error('Could not send it', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const loginNote = made
    ? `Hello ${made.name.split(' ')[0]}, your AfterBI staff login:\n\nSite: https://afterbi.com/login\nEmail: ${made.email}\nPassword: ${made.password}\n\nPlease keep it private.`
    : '';

  const staff = data ?? [];

  return (
    <>
      <PageHeader
        title="AfterBI staff"
        actions={
          <div className="flex items-center gap-2">
            <Hint label="About AfterBI staff">
              The people who sell AfterBI for you. They sign in at afterbi.com/login and get their own staff space: an
              ID card signed by the CEO, a digital business card and the proposal maker. They cannot see any customer.
            </Hint>
            <Button variant="outline" icon={<RefreshCw size={16} />} onClick={reload} loading={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      {made && (
        <Alert tone="good" className="mb-4" title={`${made.name} can sign in now`}>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-black/5 p-3 font-mono text-[12.5px] dark:bg-white/5">{loginNote}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={<Copy size={14} />}
              onClick={() => void navigator.clipboard?.writeText(loginNote).then(() => toast.success('Copied'))}
            >
              Copy login details
            </Button>
            {whatsappNumber(made.phone) && (
              <a
                href={whatsappLink(whatsappNumber(made.phone), loginNote)}
                target="_blank"
                rel="noreferrer"
                className="tap inline-flex items-center rounded-lg bg-[#25D366] px-3 text-[13px] font-bold text-white"
              >
                Send on WhatsApp
              </a>
            )}
            <Button size="sm" variant="ghost" onClick={() => setMade(null)}>
              Done
            </Button>
          </div>
        </Alert>
      )}

      {open ? (
        <Card className="mb-5">
          <h2 className="text-[15px] font-bold text-primary">New staff member</h2>
          <form onSubmit={(e) => void create(e)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <Input name="firstName" required maxLength={40} />
            </Field>
            <Field label="Last name" required>
              <Input name="lastName" required maxLength={40} />
            </Field>
            <Field label="Email" required hint="They sign in with this.">
              <Input name="email" type="email" required autoComplete="off" />
            </Field>
            <Field label="Phone">
              <Input name="phone" type="tel" placeholder="0803 000 0000" />
            </Field>
            <Field label="Position">
              <Input name="position" placeholder="Business Development Executive" maxLength={40} />
            </Field>
            <Field label="Location">
              <Input name="location" placeholder="City" maxLength={40} />
            </Field>
            <Field label="Password" hint="Suggested for you. Change it if you like (at least 6 characters).">
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setPassword(suggestPassword())} aria-label="Suggest another">
                  <RefreshCw size={15} />
                </Button>
              </div>
            </Field>
            {error && (
              <Alert tone="critical" className="sm:col-span-2">
                {error}
              </Alert>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={busy} icon={<Plus size={16} />}>
                Create account
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="mb-4 flex justify-end">
          <Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            New staff member
          </Button>
        </div>
      )}

      {loading && !data ? (
        <Loading label="Fetching your staff" />
      ) : staff.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserCheck size={22} />}
            title="No staff yet"
            description="Create an account for someone who sells AfterBI for you. They get their ID card, business card and proposals when they sign in."
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((person) => (
            <Card key={person.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-primary">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="truncate text-[12.5px] text-muted">{person.email}</p>
                  <p className="text-[12px] font-semibold text-muted">{staffNumber(person.id)}</p>
                </div>
                <Badge tone={person.active === false ? 'critical' : 'good'}>
                  {person.active === false ? 'Suspended' : 'Active'}
                </Badge>
              </div>
              <div className="mt-2 space-y-0.5 text-[13px] text-secondary">
                {person.position && <p className="font-semibold text-primary">{person.position}</p>}
                {person.location && (
                  <p className="flex items-center gap-1">
                    <MapPin size={13} aria-hidden /> {person.location}
                  </p>
                )}
                {person.phone && (
                  <p className="flex items-center gap-1">
                    <Phone size={13} aria-hidden /> {person.phone}
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-3">
                <Button
                  size="sm"
                  variant={person.active === false ? 'primary' : 'outline'}
                  icon={person.active === false ? <UserCheck size={14} /> : <UserX size={14} />}
                  loading={working === person.id}
                  onClick={() => void toggle(person)}
                >
                  {person.active === false ? 'Reactivate' : 'Suspend'}
                </Button>
                <Button size="sm" variant="ghost" icon={<KeyRound size={14} />} onClick={() => void sendReset(person)}>
                  Reset password
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
