/**
 * Settings — what the company is called, and the one number that changes how
 * orders flow.
 *
 * THE APPROVAL THRESHOLD IS THE LOAD-BEARING FIELD ON THIS SCREEN
 *
 * Set it to ₦0 and nothing needs a signature: every order a rep raises goes
 * straight to approved, which is right for a small operation and catastrophic
 * for one with forty reps. Set it too low and three administrators spend their
 * mornings clicking Approve on ₦40,000 orders until they stop reading them,
 * which is worse than no approval at all.
 *
 * So it is here, alone, with the sentence explaining the trade — not buried in
 * a tab called "Advanced".
 */

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button, Divider, Field, Hint, IconButton, Input, Select, Switch, Textarea, useToast,
} from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { saveOrgSettings } from '@/lib/db';
import { naira } from '@/lib/format';
import type { BankAccount, OrgSettings } from '@/types';

export default function SettingsPage() {
  const { settings, warehouses, reload } = useOrg();
  const toast = useToast();

  const [draft, setDraft] = useState<Partial<OrgSettings>>(settings ?? { currency: 'NGN' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const set = <K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const addBank = () =>
    setDraft((current) => ({
      ...current,
      banks: [
        ...(current.banks ?? []),
        /* `crypto.randomUUID` is not a key that leaves the browser — it only has
           to be stable while this list is on screen, so React can tell two
           half-typed rows apart. The array index cannot: removing the first row
           would hand its text to the second. */
        { id: crypto.randomUUID(), bankName: '', accountName: '', accountNumber: '' },
      ],
    }));

  const setBank = (index: number, patch: Partial<BankAccount>) =>
    setDraft((current) => ({
      ...current,
      banks: (current.banks ?? []).map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));

  const removeBank = (index: number) =>
    setDraft((current) => ({
      ...current,
      banks: (current.banks ?? []).filter((_, i) => i !== index),
    }));

  const save = async () => {
    if (!draft.name?.trim()) {
      toast.warning('Your company needs a name', 'It goes on every invoice.');
      return;
    }
    /*
     * A half-entered account is worse than none: it prints a bank name with no
     * number under a heading saying this is where to pay, and somebody rings
     * to ask. Blank rows are dropped; a partly-filled one stops the save.
     */
    const banks = (draft.banks ?? []).filter(
      (b) => b.bankName.trim() || b.accountName.trim() || b.accountNumber.trim(),
    );
    const incomplete = banks.find(
      (b) => !b.bankName.trim() || !b.accountName.trim() || !b.accountNumber.trim(),
    );
    if (incomplete) {
      toast.warning('Finish the bank account', 'A printed account needs a bank, a name and a number.');
      return;
    }

    setBusy(true);
    try {
      await saveOrgSettings({ ...draft, banks, name: draft.name.trim(), currency: 'NGN' });
      reload();
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="Company details, invoice footer, and the threshold above which an order needs a signature."
        actions={
          <Button size="sm" icon={<Save size={15} />} loading={busy} onClick={() => void save()}>
            Save
          </Button>
        }
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[15px] font-bold text-primary">Your company</h2>
            <Hint label="About your company details">
              This is what appears on invoices and statements, and at the top of the app.
            </Hint>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required>
                <Input value={draft.name ?? ''} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Short name" hint="For tight spaces">
                <Input value={draft.shortName ?? ''} onChange={(e) => set('shortName', e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <Input type="email" value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>

            <Field label="Address" hint="Printed on invoices">
              <Textarea rows={2} value={draft.address ?? ''} onChange={(e) => set('address', e.target.value)} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tax ID" hint="Required on Nigerian invoices">
                <Input value={draft.taxId ?? ''} onChange={(e) => set('taxId', e.target.value)} />
              </Field>
              <Field label="Logo URL" hint="Appears on printed documents">
                <Input value={draft.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value)} />
              </Field>
            </div>

            {/*
              Saying where it stops, because the expectation is always the
              opposite. See `lib/brand.ts` for the argument.
            */}
            <Field
              label="Brand colour"
              hint="This colours the header on your printed invoices and statements. It does not change the app itself — the interface stays one design, so that every contrast pair in it is one somebody has checked."
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={draft.brandColor ?? '#10b981'}
                  onChange={(e) => set('brandColor', e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-hairline bg-transparent"
                  aria-label="Brand colour"
                />
                <Input
                  value={draft.brandColor ?? ''}
                  onChange={(e) => set('brandColor', e.target.value)}
                  placeholder="#10b981"
                  className="max-w-[140px]"
                />
              </div>
            </Field>
          </div>
        </section>

        {/* ------------------------------------------------ bank accounts */}
        <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[15px] font-bold text-primary">Bank accounts</h2>
            <Hint label="About bank accounts">
              These are printed on every proforma, invoice and statement, under a line saying that
              money paid anywhere else is not recognised. Paying an account that turns out to belong
              to somebody else is the commonest fraud in this trade, and it works because the invoice
              is the only thing the payer checks. Nothing is printed unless you enter it here.
            </Hint>
          </div>

          <div className="mt-4 space-y-3">
            {(draft.banks ?? []).map((bank, index) => (
              <div key={bank.id} className="rounded-xl border border-hairline surface-sunken p-3.5">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                  <Field label={index === 0 ? 'Bank' : undefined}>
                    <Input
                      value={bank.bankName}
                      placeholder="Bank"
                      onChange={(e) => setBank(index, { bankName: e.target.value })}
                    />
                  </Field>
                  <Field label={index === 0 ? 'Account name' : undefined}>
                    <Input
                      value={bank.accountName}
                      placeholder="Account name"
                      onChange={(e) => setBank(index, { accountName: e.target.value })}
                    />
                  </Field>
                  <Field label={index === 0 ? 'Account number' : undefined}>
                    <Input
                      value={bank.accountNumber}
                      placeholder="0000000000"
                      inputMode="numeric"
                      className="tabular"
                      onChange={(e) => setBank(index, { accountNumber: e.target.value })}
                    />
                  </Field>
                  <div className="flex justify-end pb-0.5">
                    <IconButton label="Remove this account" onClick={() => removeBank(index)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" icon={<Plus size={15} />} onClick={addBank}>
              Add an account
            </Button>

            <Divider />

            <Field label="Invoice footer" hint="One line under the totals — payment terms, a thank you, a returns policy.">
              <Textarea
                rows={2}
                value={draft.invoiceFooter ?? ''}
                onChange={(e) => set('invoiceFooter', e.target.value)}
              />
            </Field>

            <Field label="Proforma validity" hint="How many days a quoted price is honoured for. Printed on the proforma.">
              <Input
                type="number"
                min={1}
                value={draft.proformaValidityDays ?? 7}
                onChange={(e) => set('proformaValidityDays', Number(e.target.value))}
                trailing={<span className="text-[13px] text-muted">days</span>}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
          <h2 className="text-[15px] font-bold text-primary">How orders flow</h2>

          <div className="mt-4 space-y-4">
            <Field
              label="Approval threshold"
              hint="Set this where it catches the orders worth reading. Too low and three administrators spend their mornings approving ₦40,000 orders until they stop reading them, which is worse than no approval at all. Zero means nothing needs a signature."
            >
              <Input
                type="number"
                min={0}
                value={draft.approvalThreshold ?? 0}
                onChange={(e) => set('approvalThreshold', Number(e.target.value))}
                leading={<span className="text-[13px]">₦</span>}
              />
              {/* The consequence of the figure currently typed — one line, and
                  it changes as you type, so it is feedback rather than prose. */}
              <p className="mt-2 text-[12px] leading-snug text-muted">
                {draft.approvalThreshold
                  ? `Over ${naira(draft.approvalThreshold)}, an order needs a signature.`
                  : 'Every order is approved the moment it is raised.'}
              </p>
            </Field>

            <Field label="Default depot" hint="Where an order is fulfilled from unless another is chosen">
              <Select
                value={draft.defaultWarehouseId ?? ''}
                onChange={(e) => set('defaultWarehouseId', e.target.value)}
              >
                <option value="">No default</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Divider />

            <Switch
              checked={draft.setupComplete ?? false}
              onChange={(next) => set('setupComplete', next)}
              label="Hide the setup checklist"
              hint="Switch this on once you are set up, or if you do things differently. It hides the list on every administrator's home screen."
            />
          </div>
        </section>

        <div className="lg:hidden">
          <Button full icon={<Save size={15} />} loading={busy} onClick={() => void save()}>
            Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}
