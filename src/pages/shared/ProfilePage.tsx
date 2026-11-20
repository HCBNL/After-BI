/**
 * Your profile.
 *
 * What you can change about yourself, and what only an administrator can.
 * Showing the second group as read-only rather than hiding it is deliberate: "I
 * am on the wrong price tier" needs somebody to be able to see what tier they
 * are on before they can say so.
 */

import { useRef, useState } from 'react';
import {
  Camera,
  KeyRound,
  LayoutGrid,
  Languages,
  Lock,
  LockOpen,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  Timer,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useShell } from '@/components/layout/ShellContext';
import {
  Avatar,
  Badge,
  Button,
  Hint,
  Select,
  SettingsCard,
  SettingsRow,
  Spinner,
  useToast,
} from '@/components/ui';
import { PinSetup } from '@/components/lock/PinSetup';
import { useLock } from '@/components/lock/useLock';
import { DEFAULT_MINUTES, LOCK_CHOICES, removePin, setLockMinutes } from '@/lib/pinLock';
import { getStoredTheme, setStoredTheme, type ThemeChoice } from '@/lib/theme';
import { LANGS, getLang, setLang, type Lang } from '@/lib/i18n';
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
import { PhotoViewer } from '@/components/PhotoViewer';
import { useEntitlements } from '@/lib/plans';

export default function ProfilePage() {
  const { user, signOut, resetPassword } = useAuth();
  /* Optional, because this screen is also the platform console's profile, and
     that shell mounts no OrgProvider. See `useOptionalOrg`. */
  const org = useOptionalOrg();
  const brand = useBrand();
  const toast = useToast();
  const navigate = useNavigate();
  const { openHomeChooser } = useShell();
  const { plan } = useEntitlements();

  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<ThemeChoice>(() => getStoredTheme());
  const [settingPin, setSettingPin] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const lock = useLock(user?.id);

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

  return (
    <div>
      <PageHeader title="Profile" />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">

      <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {/* The picture opens it larger; only the camera changes it. */}
            <button
              type="button"
              disabled={!user.photoURL}
              onClick={() => setViewing(true)}
              aria-label="View your picture"
              title={user.photoURL ? 'View your picture' : undefined}
              className="block rounded-full enabled:cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Avatar
                name={`${user.firstName} ${user.lastName}`}
                src={user.photoURL ? imageUrl(user.photoURL, { width: 160 }) : undefined}
                size="lg"
              />
            </button>
            <button
              type="button"
              disabled={uploading || !cloudinaryConfigured}
              onClick={() => photoInput.current?.click()}
              aria-label="Change your picture"
              title={cloudinaryConfigured ? 'Change your picture' : 'Picture uploads are not set up on this deployment'}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface-card)] bg-brand-600 text-white shadow-sm transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
            >
              {uploading ? <Spinner size={13} /> : <Camera size={14} aria-hidden />}
            </button>
            {viewing && user.photoURL && (
              <PhotoViewer
                src={imageUrl(user.photoURL, { width: 960 })}
                alt={`${user.firstName} ${user.lastName}`}
                onClose={() => setViewing(false)}
              />
            )}
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
                  {managed === 1 ? '1 distributor' : `${managed} distributors`}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/*
          Read only. Name, employee code and phone are set by an administrator
          and locked to the person (firestore.rules): the audit log names who
          did what by these, so nobody may rename themselves.
        */}
        <dl className="mt-4 border-t border-hairline">
          <Row label="Name" value={fullName(user)} />
          {user.role !== 'distributor' && <Row label="Employee code" value={user.employeeCode || 'Not set'} />}
          <Row label="Phone" value={user.phone || 'Not set'} />
        </dl>

      </section>

      <SettingsCard
        title="Security"
        description="Your password signs you in. Your PIN keeps the app locked when you step away."
      >
        <SettingsRow
          icon={lock.set ? Lock : LockOpen}
          art="security-pin"
          tone="purple"
          label="Personal PIN"
          hint={
            lock.set
              ? 'Six digits, asked for after the app sits idle or your screen locks.'
              : 'Not set. Add a second lock on top of your password.'
          }
          right={
            <Button size="sm" variant={lock.set ? 'outline' : 'primary'} onClick={() => setSettingPin(true)}>
              {lock.set ? 'Change' : 'Set up'}
            </Button>
          }
        />
        {lock.set && (
          <SettingsRow
            icon={Timer}
            art="security-timer"
            tone="orange"
            label="Lock after"
            hint="Idle this long, and AfterBI asks for your PIN."
            right={
              <Select
                aria-label="Lock after"
                className="w-36"
                value={String(lock.local.minutes ?? DEFAULT_MINUTES)}
                disabled={pinBusy}
                onChange={async (e) => {
                  setPinBusy(true);
                  try {
                    await setLockMinutes(user.id, Number(e.target.value));
                  } catch (err) {
                    toast.error('Not changed', err instanceof Error ? err.message : undefined);
                  } finally {
                    setPinBusy(false);
                  }
                }}
              >
                {LOCK_CHOICES.map((m) => (
                  <option key={m} value={String(m)}>
                    {m === 60 ? '1 hour' : `${m} minutes`}
                  </option>
                ))}
              </Select>
            }
          />
        )}
        <SettingsRow
          icon={KeyRound}
          art="security-password"
          tone="blue"
          label="Password"
          hint="We email you a link to choose a new one."
          right={
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await resetPassword(user.email);
                  toast.success('Check your email', `A link to change your password was sent to ${user.email}.`);
                } catch (err) {
                  toast.error('Not sent', err instanceof Error ? err.message : undefined);
                }
              }}
            >
              Change
            </Button>
          }
        />
        {lock.set && (
          <SettingsRow
            icon={Trash2}
            art="security-off"
            tone="pink"
            label="Turn off PIN"
            danger
            disabled={pinBusy}
            onClick={async () => {
              setPinBusy(true);
              try {
                await removePin(user.id);
                toast.success('PIN turned off');
              } catch (err) {
                toast.error('Not turned off', err instanceof Error ? err.message : undefined);
              } finally {
                setPinBusy(false);
              }
            }}
          />
        )}
      </SettingsCard>

      <PinSetup
        open={settingPin}
        uid={user.id}
        minutes={lock.local.minutes}
        changing={lock.set}
        onClose={() => setSettingPin(false)}
      />

      <SettingsCard
        title="Your account"
        aside={
          <Hint label="About these details">
            Set by your administrator. If any of this is wrong, ask them to change it. It decides what you can see.
          </Hint>
        }
      >
        <dl className="py-2">
          <Row label="Organisation" value={brand.name} />
          {plan && (
            <div className="flex items-center justify-between gap-4 border-b border-hairline py-3">
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
      </SettingsCard>

      </div>

      <div className="space-y-5">
      <SettingsCard title="Appearance" description="How AfterBI looks on this device.">
        {(
          [
            { value: 'system', label: 'Automatic', hint: 'Follows your device', icon: Monitor, tone: 'sky' },
            { value: 'light', label: 'Light', hint: 'Bright white cards', icon: Sun, tone: 'gold' },
            { value: 'dark', label: 'Dark', hint: 'Easy on the eyes at night', icon: Moon, tone: 'purple' },
          ] as const
        ).map((option) => (
          <SettingsRow
            key={option.value}
            icon={option.icon}
            art={`theme-${option.value}`}
            tone={option.tone}
            label={option.label}
            hint={option.hint}
            selected={theme === option.value}
            onClick={() => {
              setStoredTheme(option.value);
              setTheme(option.value);
            }}
          />
        ))}
      </SettingsCard>

      <SettingsCard title="Personalise">
        <SettingsRow
          icon={Palette}
          art="colour"
          tone="pink"
          label="Colour"
          hint="Blue, red, green, or any colour you pick. Buttons stay green."
          below={<AccentPicker />}
        />
        <SettingsRow
          icon={Languages}
          art="language"
          tone="teal"
          label="Language"
          hint="The whole app changes, including menus and messages."
          right={
            <Select
              aria-label="Language"
              className="w-36"
              value={getLang()}
              onChange={(e) => {
                const next = e.target.value as Lang;
                if (next !== getLang()) setLang(next);
              }}
            >
              {LANGS.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </Select>
          }
        />
        <SettingsRow
          icon={LayoutGrid}
          art="home-screen"
          tone="green"
          label="Home screen"
          hint="Tiles or cards: what you see first on this device."
          right={
            <Button variant="outline" size="sm" onClick={openHomeChooser}>
              Change
            </Button>
          }
        />
      </SettingsCard>

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
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-3 last:border-0">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="text-label font-semibold text-primary">{value}</dd>
    </div>
  );
}
