/**
 * Company info: the organisation's bank accounts and details, each a tap to
 * copy. Seen by everybody in the organisation, distributors included: the
 * account to pay into is not a secret, and a customer who can see the real one
 * in the app is a customer who will not pay a fake one sent on WhatsApp.
 *
 * Everything here comes from Settings (Company); nothing is typed on this page.
 * (The concept is GetSchool's Company info, per organisation.)
 */

import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Check, Copy, Download, FileBadge, Globe, Landmark, Mail, MapPin, MessageCircle, Phone, Share2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Card, useToast } from '@/components/ui';
import { OrgPlanBadge, PlanPill } from '@/components/brand/PlanBadge';
import { useOrg } from '@/context/OrgContext';
import { useAuth } from '@/context/AuthContext';
import { whatsappNumber } from '@/lib/businessCard';
import { useEntitlements } from '@/lib/plans';
import { PORTAL_ROOT } from '@/lib/tiles';
import { saveFile } from '@/lib/download';
import { cn } from '@/lib/cn';
import type { BankAccount } from '@/types';

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

  const name = settings?.name || 'Your organisation';
  const banks = (settings?.banks ?? []).filter((b) => b.accountNumber && b.bankName);
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const settingsLink = user ? `${PORTAL_ROOT[user.role]}/settings` : '#';
  const wa = whatsappNumber(settings?.phone);
  const site = settings?.website?.replace(/^https?:\/\//, '') ?? '';

  return (
    <div className="space-y-5">
      <PageHeader title="Company info" description={`${name}'s account details and contacts. Tap anything to copy it.`} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {banks.length === 0 ? (
            <Card>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-muted">
                  <Landmark size={20} aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-bold text-primary">No bank account added yet</p>
                  <p className="mt-1 text-[13px] text-muted">
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
          ) : (
            banks.map((b, i) => <BankCard key={b.id || i} bank={b} company={name} index={i} done={done} copy={copy} />)
          )}
          {banks.length > 0 && (
            <Alert tone="info" title="Pay only into these accounts">
              {name} does not recognise payments into any other account, whoever asks for them. If someone sends different bank details, check here first.
            </Alert>
          )}
        </div>

        <Card className="hr-rise self-start" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-3">
            {settings?.logoUrl ? (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-white p-1.5">
                <img src={settings.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
              </span>
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <Building2 size={24} aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[16px] font-bold text-primary">
                <span className="truncate">{name}</span>
                <OrgPlanBadge size={18} />
              </p>
              {settings?.rcNumber && <p className="text-[12.5px] font-semibold text-muted">{settings.rcNumber}</p>}
              {plan && <PlanPill plan={plan} className="mt-1" />}
            </div>
          </div>
          <ul className="mt-4 space-y-1.5">
            {settings?.address && <Row icon={<MapPin size={15} />} label="Address" value={settings.address} done={done === 'addr'} onCopy={() => void copy('addr', settings.address!, 'Address')} />}
            {settings?.phone && <Row icon={<Phone size={15} />} label="Phone" value={settings.phone} done={done === 'phone'} onCopy={() => void copy('phone', settings.phone!, 'Phone number')} />}
            {settings?.email && <Row icon={<Mail size={15} />} label="Email" value={settings.email} done={done === 'email'} onCopy={() => void copy('email', settings.email!, 'Email')} />}
            {site && <Row icon={<Globe size={15} />} label="Website" value={site} done={done === 'web'} onCopy={() => void copy('web', `https://${site}`, 'Website')} />}
            {settings?.rcNumber && <Row icon={<Building2 size={15} />} label="Registration" value={settings.rcNumber} done={done === 'rc'} onCopy={() => void copy('rc', settings.rcNumber!, 'RC number')} />}
            {settings?.taxId && <Row icon={<FileBadge size={15} />} label="Tax ID" value={settings.taxId} done={done === 'tax'} onCopy={() => void copy('tax', settings.taxId!, 'Tax ID')} />}
          </ul>
          {!settings?.address && !settings?.phone && !settings?.email && (
            <p className="mt-3 text-[13px] text-muted">{isAdmin ? 'Add the address, phone and email in Settings.' : 'No contact details added yet.'}</p>
          )}
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#128C7E] hover:underline">
              <MessageCircle size={15} aria-hidden /> Message {name} on WhatsApp
            </a>
          )}
        </Card>
      </div>
    </div>
  );
}

/* one bank account, as a card */

function BankCard({
  bank,
  company,
  index,
  done,
  copy,
}: {
  bank: BankAccount;
  company: string;
  index: number;
  done: string | null;
  copy: (key: string, text: string, label: string) => Promise<void>;
}) {
  const toast = useToast();
  const ref = useRef<HTMLElement>(null);
  const [saving, setSaving] = useState(false);
  const k = (s: string) => `${s}${index}`;
  const all = `Account number: ${bank.accountNumber}\nAccount name: ${bank.accountName}\nBank: ${bank.bankName}`;
  const initials = bank.bankName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  /* The card as a PNG, at twice screen resolution, without the buttons. Loaded on demand. */
  const downloadImage = async () => {
    const node = ref.current;
    if (!node) return;
    setSaving(true);
    const actions = node.querySelector<HTMLElement>('[data-no-export-row]');
    try {
      const { toBlob } = await import('html-to-image');
      if (actions) actions.style.display = 'none';
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const blob = await toBlob(node, {
        pixelRatio: 2,
        cacheBust: true,
        filter: (el) => !(el instanceof HTMLElement && el.dataset.noExport !== undefined),
      });
      if (!blob) throw new Error('The image came out empty.');
      await saveFile(`${company.replace(/[^a-z0-9]+/gi, '_')}_account_details.png`, blob);
    } catch (err) {
      toast.error('Could not make the image', err instanceof Error ? err.message : 'Try again.');
    } finally {
      actions?.style.removeProperty('display');
      setSaving(false);
    }
  };

  return (
    <section ref={ref} className="relative isolate overflow-hidden rounded-[28px] bg-night p-5 text-white shadow-pop sm:p-7">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="hr-aurora absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold-400/25 blur-[80px]" />
        <div className="hr-aurora-slow absolute -bottom-28 -left-10 h-72 w-72 rounded-full bg-[#ee6a00]/30 blur-[90px]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)' }} />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white px-3 py-2 text-night shadow-card">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-night text-[12px] font-extrabold text-white">{initials}</span>
          <span className="truncate text-[14px] font-extrabold uppercase tracking-wide">{bank.bankName}</span>
        </div>
        <span aria-hidden className="relative mt-1 h-9 w-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 shadow-inner">
          <span className="absolute inset-x-0 top-1/2 h-px bg-gold-800/40" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-gold-800/40" />
          <span className="hr-sheen absolute inset-0" />
        </span>
      </div>

      <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">Account number</p>
      <button
        type="button"
        onClick={() => void copy(k('number'), bank.accountNumber, 'Account number')}
        className="group mt-1 flex w-full items-center justify-between gap-3 rounded-2xl text-left"
        aria-label={`Copy account number ${bank.accountNumber}`}
      >
        <span className="font-display text-[2.1rem] font-extrabold leading-none tracking-[0.04em] tabular sm:text-[2.8rem]">{spaced(bank.accountNumber)}</span>
        <CopyMark done={done === k('number')} dark />
      </button>

      <div className="mt-6 grid gap-3">
        <CardLine label="Account name" value={bank.accountName} done={done === k('name')} onCopy={() => void copy(k('name'), bank.accountName, 'Account name')} />
        <CardLine label="Bank" value={bank.bankName} done={done === k('bank')} onCopy={() => void copy(k('bank'), bank.bankName, 'Bank name')} />
      </div>

      <div data-no-export data-no-export-row className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy(k('all'), all, 'Account details')}
          className="tap inline-flex items-center gap-2 rounded-xl bg-white px-4 text-[13.5px] font-bold text-night transition-transform hover:-translate-y-0.5"
        >
          {done === k('all') ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {done === k('all') ? 'Copied' : 'Copy all details'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${company} payment details\n\n${all}`)}`}
          target="_blank"
          rel="noreferrer"
          className="tap inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13.5px] font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          <Share2 size={16} aria-hidden /> Share on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => void downloadImage()}
          disabled={saving}
          className="tap inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 text-[13.5px] font-bold text-white ring-1 ring-inset ring-white/20 transition-transform hover:-translate-y-0.5 hover:bg-white/15 disabled:opacity-60"
        >
          <Download size={16} aria-hidden /> {saving ? 'Making image…' : 'Download image'}
        </button>
      </div>
    </section>
  );
}

function CopyMark({ done, dark }: { done: boolean; dark?: boolean }) {
  return (
    <span
      data-no-export
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
        dark ? 'bg-white/10 text-white group-hover:bg-white/20' : 'surface-sunken text-secondary group-hover:text-primary',
        done && '!bg-[#0ca30c] !text-white scale-110',
      )}
    >
      {done ? <Check size={17} aria-hidden /> : <Copy size={16} aria-hidden />}
    </span>
  );
}

function CardLine({ label, value, done, onCopy }: { label: string; value: string; done: boolean; onCopy: () => void }) {
  return (
    <button type="button" onClick={onCopy} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3 text-left backdrop-blur-sm">
      <span className="min-w-0">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">{label}</span>
        <span className="mt-0.5 block truncate text-[14.5px] font-bold">{value}</span>
      </span>
      <CopyMark done={done} dark />
    </button>
  );
}

function Row({ icon, label, value, done, onCopy }: { icon: ReactNode; label: string; value: string; done: boolean; onCopy: () => void }) {
  return (
    <li>
      <button type="button" onClick={onCopy} className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-[var(--surface-sunken)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
          <span className="block truncate text-[14px] font-semibold text-primary">{value}</span>
        </span>
        <CopyMark done={done} />
      </button>
    </li>
  );
}
