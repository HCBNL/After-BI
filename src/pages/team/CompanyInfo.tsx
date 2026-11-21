/**
 * Company info: the organisation's bank accounts and details, each a tap to
 * copy. Seen by everybody in the organisation, distributors included: the
 * account to pay into is not a secret, and a customer who can see the real one
 * in the app is a customer who will not pay a fake one sent to them.
 *
 * Drawn in the organisation's own colour (the theme ground, `.ab-banner`), with
 * the owner's Primary artwork turning in the bank card's corner and a Secondary
 * artwork beside the "pay only here" note, so it matches HR and the figure
 * cards whatever colour a company picks. The picture a customer is sent is a
 * plain black card drawn on a canvas (lib/bankImage), the same for every
 * company. Everything comes from Settings (Company); nothing is typed here.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Check, Copy, Download, FileBadge, Globe, Landmark, Mail, MapPin, Phone, ShieldCheck, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardArt, IconArt, useToast } from '@/components/ui';
import { OrgPlanBadge, PlanPill } from '@/components/brand/PlanBadge';
import { SecurePaymentArt } from '@/components/brand/SceneArt';
import { Slider } from '@/components/home/Slider';
import { useOrg } from '@/context/OrgContext';
import { useAuth } from '@/context/AuthContext';
import { useEntitlements } from '@/lib/plans';
import { PORTAL_ROOT } from '@/lib/tiles';
import { saveFile } from '@/lib/download';
import { bankImage } from '@/lib/bankImage';
import { cn } from '@/lib/cn';
import type { BankAccount } from '@/types';
import { useAsync } from '@/hooks/useAsync';
import { listBankProfiles, type BankProfile } from '@/lib/bankProfiles';
import { BankLogo } from '@/components/brand/BankLogo';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  }
}

function useCopy() {
  const toast = useToast();
  const [done, setDone] = useState<string | null>(null);
  const copy = async (key: string, text: string, label: string) => {
    if (await copyText(text)) {
      setDone(key);
      toast.success(`${label} copied`);
      window.setTimeout(() => setDone((k) => (k === key ? null : k)), 1800);
    } else {
      toast.error('Could not copy', 'Press and hold to copy it instead.');
    }
  };
  return { done, copy };
}

const spaced = (n: string) => n.replace(/\s+/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');

export default function CompanyInfo() {
  const { settings } = useOrg();
  const { user } = useAuth();
  const { plan } = useEntitlements();
  const { done, copy } = useCopy();
  /* The live logos, so a logo the platform updates shows here at once. */
  const profiles = useAsync(() => listBankProfiles().catch(() => [] as BankProfile[]), [], { handleError: true });
  const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));

  const name = settings?.name || 'Your organisation';
  const banks = (settings?.banks ?? []).filter((b) => b.accountNumber && b.bankName);
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const settingsLink = user ? `${PORTAL_ROOT[user.role]}/settings` : '#';
  const site = settings?.website?.replace(/^https?:\/\//, '') ?? '';
  const phone = settings?.phone || undefined;

  const cards = banks.map((b, i) => (
    <BankCard
      key={b.id || i}
      bank={b}
      profile={b.bankId ? byId.get(b.bankId) : undefined}
      company={name}
      phone={phone}
      index={i}
      done={done}
      copy={copy}
    />
  ));

  return (
    <div className="space-y-5">
      <PageHeader title="Company info" description={`${name}'s account details and contacts. Tap anything to copy it.`} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-5">
          {banks.length === 0 ? (
            <Card>
              <div className="flex items-start gap-3">
                <IconArt icon={Landmark} id="company-bank" variant="tint" size={44} />
                <div className="min-w-0">
                  <p className="text-lead font-semibold text-primary">No bank account added yet</p>
                  <p className="mt-1 text-label text-muted">
                    {isAdmin ? (
                      <>
                        Add the company&rsquo;s accounts in{' '}
                        <Link to={settingsLink} className="font-bold text-brand-700 underline dark:text-brand-300">
                          Settings
                        </Link>{' '}
                        and everyone in the company, customers included, will see them here.
                      </>
                    ) : (
                      'Your administrator has not added the company’s bank details yet.'
                    )}
                  </p>
                </div>
              </div>
            </Card>
          ) : banks.length === 1 ? (
            cards
          ) : (
            <Slider label="Bank accounts">{cards}</Slider>
          )}

          {banks.length > 0 && (
            <section className="flex items-center gap-4 overflow-hidden rounded-[22px] border border-hairline surface-card p-4 shadow-card sm:p-5">
              <SecurePaymentArt className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-body font-bold text-primary">
                  <ShieldCheck size={16} className="shrink-0 text-brand-700 dark:text-brand-300" aria-hidden />
                  Pay only into these accounts
                </p>
                <p className="mt-1 text-label leading-snug text-secondary">
                  {`${name} does not recognise payment into any other account, whoever asks. If someone sends different details, check here first.`}
                </p>
              </div>
            </section>
          )}
        </div>

        <section className="min-w-0 overflow-hidden rounded-[22px] border border-hairline surface-card shadow-card">
          <div className="ab-banner relative isolate overflow-hidden p-5 text-white">
            <CardArt index={2} />
            <div className="flex min-w-0 items-center gap-3">
              {settings?.logoUrl ? (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-card">
                  <img src={settings.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                </span>
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Building2 size={24} aria-hidden />
                </span>
              )}
              <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1.5 text-title font-bold">
                  <span className="truncate">{name}</span>
                  <OrgPlanBadge size={18} />
                </p>
                {settings?.rcNumber && <p className="text-label font-semibold text-white/75">{`RC ${settings.rcNumber}`}</p>}
                {plan && <PlanPill plan={plan} className="mt-1" />}
              </div>
            </div>
          </div>

          <ul className="divide-y divide-[var(--border-hairline)] px-2 py-1 sm:px-3">
            {settings?.address && <Row icon={MapPin} id="company-address" label="Address" value={settings.address} done={done === 'addr'} onCopy={() => void copy('addr', settings.address!, 'Address')} />}
            {phone && <Row icon={Phone} id="company-phone" label="Phone" value={phone} done={done === 'phone'} onCopy={() => void copy('phone', phone, 'Phone number')} />}
            {settings?.email && <Row icon={Mail} id="company-email" label="Email" value={settings.email} done={done === 'email'} onCopy={() => void copy('email', settings.email!, 'Email')} />}
            {site && <Row icon={Globe} id="company-web" label="Website" value={site} done={done === 'web'} onCopy={() => void copy('web', `https://${site}`, 'Website')} />}
            {settings?.rcNumber && <Row icon={Building2} id="company-rc" label="Registration" value={settings.rcNumber} done={done === 'rc'} onCopy={() => void copy('rc', settings.rcNumber!, 'RC number')} />}
            {settings?.taxId && <Row icon={FileBadge} id="company-tax" label="Tax ID" value={settings.taxId} done={done === 'tax'} onCopy={() => void copy('tax', settings.taxId!, 'Tax ID')} />}
          </ul>
          {!settings?.address && !phone && !settings?.email && (
            <p className="px-5 pb-5 text-label text-muted">{isAdmin ? 'Add the address, phone and email in Settings.' : 'No contact details added yet.'}</p>
          )}
        </section>
      </div>
    </div>
  );
}

/* one bank account, as a card in the organisation's colour */

function BankCard({
  bank,
  profile,
  company,
  phone,
  index,
  done,
  copy,
}: {
  bank: BankAccount;
  profile?: BankProfile;
  company: string;
  phone?: string;
  index: number;
  done: string | null;
  copy: (key: string, text: string, label: string) => Promise<void>;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const k = (s: string) => `${s}${index}`;
  const bankName = profile?.name || bank.bankName;
  const all = [
    `Account number: ${bank.accountNumber}`,
    `Account name: ${bank.accountName}`,
    `Bank: ${bankName}`,
    ...(phone ? [`To confirm, call: ${phone}`] : []),
  ].join('\n');

  const download = async () => {
    setSaving(true);
    try {
      const blob = await bankImage({ company, bankName, accountNumber: bank.accountNumber, accountName: bank.accountName, phone });
      await saveFile(`${company.replace(/[^a-z0-9]+/gi, '_')}_${bankName.replace(/[^a-z0-9]+/gi, '_')}.png`, blob);
    } catch (err) {
      toast.error('Could not make the image', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ab-banner relative isolate w-full min-w-0 overflow-hidden rounded-[26px] p-5 text-white shadow-card sm:p-6">
      <CardArt index={index} className="!h-44 !w-44 !-bottom-20 !-right-16 sm:!h-52 sm:!w-52 sm:!-bottom-24 sm:!-right-20" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white py-1.5 pl-1.5 pr-3.5 text-[#0a0a0b] shadow-card">
          <BankLogo size={36} bank={{ name: bank.bankName, logoUrl: profile?.logoUrl || bank.logoUrl, color: profile?.color }} />
          <span className="truncate text-label font-bold uppercase tracking-wide">{bankName}</span>
        </div>
        <button
          type="button"
          onClick={() => void download()}
          disabled={saving}
          aria-label="Download as a picture"
          title="Download as a picture"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/25 disabled:opacity-60"
        >
          <Download size={18} aria-hidden className={cn(saving && 'animate-pulse')} />
        </button>
      </div>

      <p className="mt-6 text-micro font-semibold uppercase tracking-[0.16em] text-white/70">Account number</p>
      <button
        type="button"
        onClick={() => void copy(k('number'), bank.accountNumber, 'Account number')}
        className="group mt-1 flex w-full min-w-0 items-center justify-between gap-3 text-left"
        aria-label={`Copy account number ${bank.accountNumber}`}
      >
        <span className="min-w-0 truncate font-display text-[2rem] font-bold leading-none tracking-[0.03em] tabular sm:text-display">
          {spaced(bank.accountNumber)}
        </span>
        <CopyMark done={done === k('number')} />
      </button>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-2.5">
        <CardLine label="Account name" value={bank.accountName} done={done === k('name')} onCopy={() => void copy(k('name'), bank.accountName, 'Account name')} />
        {phone ? (
          <CardLine label="To confirm, call" value={phone} done={done === k('phone')} onCopy={() => void copy(k('phone'), phone, 'Phone number')} />
        ) : (
          <CardLine label="Bank" value={bankName} done={done === k('bank')} onCopy={() => void copy(k('bank'), bankName, 'Bank name')} />
        )}
      </div>

      <button
        type="button"
        onClick={() => void copy(k('all'), all, 'Account details')}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-white px-3.5 text-label font-bold text-[#0a0a0b] transition-transform hover:-translate-y-0.5"
      >
        {done === k('all') ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
        {done === k('all') ? 'Copied' : 'Copy all'}
      </button>
    </section>
  );
}

function CopyMark({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-all group-hover:bg-white/25',
        done && '!bg-white !text-[#0a7a0a] scale-110',
      )}
    >
      {done ? <Check size={16} aria-hidden /> : <Copy size={15} aria-hidden />}
    </span>
  );
}

function CardLine({ label, value, done, onCopy }: { label: string; value: string; done: boolean; onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-white/[0.12] px-3.5 py-2.5 text-left ring-1 ring-inset ring-white/15 backdrop-blur-sm"
    >
      <span className="min-w-0">
        <span className="block text-micro font-semibold uppercase tracking-[0.14em] text-white/70">{label}</span>
        <span className="mt-0.5 block break-words text-body font-semibold">{value}</span>
      </span>
      <CopyMark done={done} />
    </button>
  );
}

function Row({ icon, id, label, value, done, onCopy }: { icon: LucideIcon; id: string; label: string; value: string; done: boolean; onCopy: () => void }) {
  return (
    <li>
      <button type="button" onClick={onCopy} className="group flex w-full min-w-0 items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]">
        <IconArt icon={icon} id={id} variant="tint" size={40} />
        <span className="min-w-0 flex-1">
          <span className="block text-micro font-semibold uppercase tracking-wide text-muted">{label}</span>
          <span className="block truncate text-body font-semibold text-primary">{value}</span>
        </span>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-secondary transition-all group-hover:text-primary',
            done && '!bg-brand-600 !text-white scale-110',
          )}
        >
          {done ? <Check size={16} aria-hidden /> : <Copy size={15} aria-hidden />}
        </span>
      </button>
    </li>
  );
}
