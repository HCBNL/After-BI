/**
 * Your profile.
 *
 * What you can change about yourself, and what only an administrator can.
 * Showing the second group as read-only rather than hiding it is deliberate: "I
 * am on the wrong price tier" needs somebody to be able to see what tier they
 * are on before they can say so.
 */

import { useEffect, useRef, useState } from 'react';
import { Camera, LogOut, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useShell } from '@/components/layout/ShellContext';
import { Avatar, Badge, Button, Divider, Field, Hint, Input, Spinner, useToast } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { AccentPicker } from '@/components/AccentPicker';
import { useAuth } from '@/context/AuthContext';
import { useOptionalOrg } from '@/context/OrgContext';
import { updateProfile } from '@/lib/db';
import { cloudinaryConfigured, imageUrl, shrinkImage, uploadImage } from '@/lib/cloudinary';
import { useBrand } from '@/lib/brand';
import { fullName, partnerScope } from '@/lib/roles';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL, TIER_LABEL } from '@/types';
import { OrgPlanBadge, PlanPill } from '@/components/brand/PlanBadge';
import { useEntitlements } from '@/lib/plans';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  /* Optional, because this screen is also the platform console's profile, and
     that shell mounts no OrgProvider. See `useOptionalOrg`. */
  const org = useOptionalOrg();
  const brand = useBrand();
  const toast = useToast();
  const navigate = useNavigate();
  const { openHomeChooser } = useShell();
  const { plan } = useEntitlements();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [title, setTitle] = useState(user?.title ?? '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone ?? '');
    setTitle(user.title ?? '');
  }, [user?.id]);

  if (!user) return null;

  const distributor =
    user.role === 'distributor' && user.distributorId ? org?.distributorById(user.distributorId) : undefined;
  const managed = user.role === 'sales_rep' ? (partnerScope(user) ?? []).length : 0;

  /* Tap the picture: choose a photo, it is shrunk, uploaded and saved at once. */
  const changePhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(await shrinkImage(file, 640), 'avatar');
      await updateProfile(user.id, { photoURL: url });
      toast.success('Picture updated');
    } catch (err) {
      toast.error('Picture not updated', err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = '';
    }
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      await updateProfile(user.id, { photoURL: '' });
      toast.success('Picture removed');
    } catch (err) {
      toast.error('Not removed', err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
    }
  };

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
    <div>
      <PageHeader title="Profile" />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">

      <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={uploading || !cloudinaryConfigured}
              onClick={() => photoInput.current?.click()}
              aria-label="Change your picture"
              title={cloudinaryConfigured ? 'Change your picture' : 'Picture uploads are not set up on this deployment'}
              className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Avatar
                name={`${user.firstName} ${user.lastName}`}
                src={user.photoURL ? imageUrl(user.photoURL, { width: 160 }) : undefined}
                size="lg"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? <Spinner size={18} /> : <Camera size={18} aria-hidden />}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--surface-card)] bg-brand-600 text-white">
                {uploading ? <Spinner size={11} /> : <Camera size={12} aria-hidden />}
              </span>
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void changePhoto(e.target.files?.[0])}
            />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-title font-semibold text-primary">
              <span className="truncate">{fullName(user)}</span>
              <OrgPlanBadge size={19} />
            </p>
            <p className="truncate text-label text-muted">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
              {distributor && <Badge tone="neutral">{distributor.company}</Badge>}
              {user.photoURL && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void removePhoto()}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium text-muted transition-colors hover:text-primary"
                >
                  <Trash2 size={12} aria-hidden /> Remove picture
                </button>
              )}
              {managed > 0 && (
                <Badge tone="neutral">
                  {managed} distributor{managed === 1 ? '' : 's'}
                </Badge>
              )}
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

      </div>

      <div className="space-y-5">
      <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
        <div className="flex items-center gap-1.5">
          <h2 className="text-lead font-semibold text-primary">Set by your administrator</h2>
          <Hint label="About these details">
            If any of this is wrong, ask them to change it. It decides what you can see.
          </Hint>
        </div>

        <dl className="mt-4 space-y-2.5">
          <Row label="Organisation" value={brand.name} />
          {plan && (
            <div className="flex items-center justify-between gap-4 border-b border-hairline pb-2.5">
              <dt className="text-label text-muted">Plan</dt>
              <dd>
                <PlanPill plan={plan} />
              </dd>
            </div>
          )}
          <Row label="Role" value={ROLE_LABEL[user.role]} />
          {distributor && (
            <>
              <Row label="Account" value={distributor.company} />
              <Row label="Price tier" value={`${distributor.category} (${TIER_LABEL[distributor.category]})`} />
            </>
          )}
          <Row label="Account created" value={formatDate(user.createdAt)} />
        </dl>
      </section>

      <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lead font-semibold text-primary">Appearance</h2>
            <p className="mt-0.5 text-label text-muted">
              Follows your device unless you choose otherwise.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <div>
            <h2 className="text-lead font-semibold text-primary">Language</h2>
            <p className="mt-0.5 text-label text-muted">The whole app changes, including menus and messages.</p>
          </div>
          <LanguageSwitch full />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <div>
            <p className="text-body font-semibold text-primary">Colour</p>
            <p className="mt-0.5 text-label text-muted">From the logo. Buttons stay green.</p>
          </div>
          <AccentPicker />
        </div>
      </section>

      <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>

            <h2 className="text-lead font-semibold text-primary">Home screen</h2>

            <p className="mt-0.5 text-label text-muted">Tiles or cards: what you see first on this device.</p>

          </div>

          <Button variant="outline" size="sm" onClick={openHomeChooser}>

            Change

          </Button>

        </div>

      </section>

      </div>
      </div>

      <Button
        className="mt-5 lg:w-auto"
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
      <dt className="text-label text-muted">{label}</dt>
      <dd className="text-label font-semibold text-primary">{value}</dd>
    </div>
  );
}
