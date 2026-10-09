/**
 * Platform → Bank profiles. The banks every organisation picks from when it
 * adds its accounts: name, logo and colour, kept here once. An organisation
 * then only chooses the bank and types its account number.
 */

import { useState } from 'react';
import { Landmark, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Switch, useToast } from '@/components/ui';
import { ImagePicker } from '@/components/ImagePicker';
import { BankLogo } from '@/components/brand/BankLogo';
import { useAsync } from '@/hooks/useAsync';
import { bankIdFor, COMMON_BANKS, listBankProfiles, removeBankProfile, saveBankProfile, type BankProfile } from '@/lib/bankProfiles';

export default function BanksPage() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => listBankProfiles(), [], { handleError: true });
  const [editing, setEditing] = useState<Partial<BankProfile> | null>(null);
  const [seeding, setSeeding] = useState(false);
  const banks = data ?? [];

  const addCommon = async () => {
    setSeeding(true);
    try {
      const have = new Set(banks.map((b) => b.id));
      const list = COMMON_BANKS.filter((n) => !have.has(bankIdFor(n)));
      for (const name of list) await saveBankProfile({ name, logoUrl: '', color: '', active: true });
      toast.success(list.length ? `${list.length} banks added` : 'All there already', 'Now add each bank’s logo.');
      reload();
    } catch (err) {
      toast.error('Could not add them', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Bank profiles"
        description="The banks organisations choose from. Set the name and logo once; they only type their account number."
        actions={
          <>
            <Button variant="outline" icon={<Wand2 size={16} />} loading={seeding} onClick={() => void addCommon()}>
              Add Nigerian banks
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => setEditing({ active: true })}>
              New bank
            </Button>
          </>
        }
      />

      {loading && !data ? (
        <Card>
          <p className="text-[13px] text-muted">Loading…</p>
        </Card>
      ) : banks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Landmark size={22} />}
            title="No banks yet"
            description="Add the Nigerian banks in one tap, then upload each logo."
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {banks.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-2xl border border-hairline surface-card p-4 shadow-card">
              <BankLogo bank={b} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-primary">{b.name}</p>
                <p className="text-[12px] text-muted">{b.logoUrl ? 'Logo set' : 'No logo yet'}</p>
              </div>
              {!b.active && <Badge tone="neutral">Hidden</Badge>}
              <Button size="sm" variant="ghost" aria-label={`Edit ${b.name}`} onClick={() => setEditing(b)}>
                <Pencil size={15} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <BankModal
          bank={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function BankModal({ bank, onClose, onSaved }: { bank: Partial<BankProfile>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(bank.name ?? '');
  const [logoUrl, setLogoUrl] = useState(bank.logoUrl ?? '');
  const [color, setColor] = useState(bank.color || '#0f1f36');
  const [active, setActive] = useState(bank.active ?? true);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('Type the bank’s name');
    setBusy(true);
    try {
      await saveBankProfile({ id: bank.id, name, logoUrl, color, active });
      toast.success('Saved');
      onSaved();
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!bank.id) return;
    setBusy(true);
    try {
      await removeBankProfile(bank.id);
      onSaved();
    } catch (err) {
      toast.error('Not removed', err instanceof Error ? err.message : undefined);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={bank.id ? bank.name : 'New bank'}
      footer={
        <>
          {bank.id && (
            <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => void remove()} disabled={busy} className="mr-auto">
              Remove
            </Button>
          )}
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
        <Field label="Bank name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zenith Bank" maxLength={60} />
        </Field>
        <ImagePicker kind="logo" label="Logo" hint="A clear logo on a white or transparent background." value={logoUrl} onChange={setLogoUrl} size={120} />
        <Field label="Colour" hint="Used behind the initials when there is no logo.">
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-hairline bg-transparent" aria-label="Colour" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="max-w-[140px]" />
          </div>
        </Field>
        <Switch checked={active} onChange={setActive} label="Show to organisations" description={active ? 'They can pick it' : 'Hidden from the list'} />
        <div className="flex items-center gap-3 rounded-xl surface-sunken p-3">
          <BankLogo bank={{ name: name || 'Bank', logoUrl, color }} />
          <span className="text-[13px] text-secondary">How it will look</span>
        </div>
      </div>
    </Modal>
  );
}
