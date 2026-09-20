/**
 * Your profile.
 *
 * What you can change about yourself, and what only an administrator can.
 * Showing the second group as read-only rather than hiding it is deliberate: "I
 * am on the wrong price tier" needs somebody to be able to see what tier they
 * are on before they can say so.
 */

import { useEffect, useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useShell } from '@/components/layout/ShellContext';
import { Avatar, Badge, Button, Divider, Field, Hint, Input, useToast } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AccentPicker } from '@/components/AccentPicker';
import { useAuth } from '@/context/AuthContext';
import { useOptionalOrg } from '@/context/OrgContext';
import { updateProfile } from '@/lib/db';
import { useBrand } from '@/lib/brand';
import { fullName } from '@/lib/roles';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL, TIER_LABEL } from '@/types';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  /* Optional, because this screen is also the platform console's profile, and
     that shell mounts no OrgProvider. See `useOptionalOrg`. */
  const org = useOptionalOrg();
  const brand = useBrand();
  const toast = useToast();
  const navigate = useNavigate();
  const { openHomeChooser } = useShell();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [title, setTitle] = useState(user?.title ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone ?? '');
    setTitle(user.title ?? '');
  }, [user?.id]);

  if (!user) return null;

  const distributor = user.distributorId ? org?.distributorById(user.distributorId) : undefined;

  const save = async () => {
    setBusy(true);
    try {
      await updateProfile(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        title: title.trim(),
      });
      toast.success('Profile saved');
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="[&>*:not(.ab-panel)]:max-w-xl">
      <PageHeader title="Profile" />

      <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <Avatar name={`${user.firstName} ${user.lastName}`} src={user.photoURL} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold text-primary">{fullName(user)}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
              {distributor && <Badge tone="neutral">{distributor.company}</Badge>}
            </div>
          </div>
        </div>

        <Divider className="my-5" />

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[100px_1fr_1fr]">
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mr" />
            </Field>
            <Field label="First name" required>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>

          <Field label="Phone" hint="Visible to your administrators">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>

          <Button icon={<Save size={15} />} loading={busy} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-hairline surface-card p-5 shadow-card">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[15px] font-bold text-primary">Set by your administrator</h2>
          <Hint label="About these details">
            If any of this is wrong, ask them to change it — it decides what you can see.
          </Hint>
        </div>

        <dl className="mt-4 space-y-2.5">
          <Row label="Organisation" value={brand.name} />
          <Row label="Role" value={ROLE_LABEL[user.role]} />
          {distributor && (
            <>
              <Row label="Account" value={distributor.company} />
              <Row label="Price tier" value={`${distributor.category} — ${TIER_LABEL[distributor.category]}`} />
            </>
          )}
          <Row label="Account created" value={formatDate(user.createdAt)} />
        </dl>
      </section>

      <section className="mt-5 rounded-2xl border border-hairline surface-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-primary">Appearance</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Follows your device unless you choose otherwise.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <div>
            <p className="text-[14px] font-semibold text-primary">Colour</p>
            <p className="mt-0.5 text-[12.5px] text-muted">From the logo. Buttons stay green.</p>
          </div>
          <AccentPicker />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-hairline surface-card p-5 shadow-card">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>

            <h2 className="text-[15px] font-bold text-primary">Home screen</h2>

            <p className="mt-0.5 text-[12.5px] text-muted">Tiles or cards: what you see first on this device.</p>

          </div>

          <Button variant="outline" size="sm" onClick={openHomeChooser}>

            Change

          </Button>

        </div>

      </section>

      <Button
        className="mt-5"
        variant="outline"
        full
        icon={<LogOut size={15} />}
        onClick={async () => {
          await signOut();
          navigate('/login', { replace: true });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2.5 last:border-0">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="text-[13px] font-semibold text-primary">{value}</dd>
    </div>
  );
}
