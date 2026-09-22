/**
 * Leads: businesses you are working on.
 *
 * A board rather than a table, because a pipeline is read by shape: five
 * columns, and you can see at a glance that everything is stuck in Contacted
 * and nothing has reached Qualified in three weeks. A table sorted by stage
 * says the same thing and nobody sees it.
 */

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { listLeads, saveLead } from '@/lib/db';
import { isAdmin } from '@/lib/roles';
import { naira, nairaShort, formatDate } from '@/lib/format';
import { LEAD_STAGE_LABEL, type Lead, type LeadStage } from '@/types';

const STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

const STAGE_ACCENT: Record<LeadStage, string> = {
  new: 'bg-ink-400',
  contacted: 'bg-[var(--series-1)]',
  qualified: 'bg-[var(--series-5)]',
  won: 'bg-status-good',
  lost: 'bg-status-critical',
};

export default function LeadsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<Lead> | null>(null);

  /* An admin sees the whole pipeline; a rep sees their own. Not a permission,
     the rules allow both, but a rep's board full of other people's leads is
     not their board. */
  const mineOnly = user ? !isAdmin(user.role) : true;

  const { data, loading, reload } = useAsync(
    () => listLeads(mineOnly ? (user?.id ?? null) : null),
    [user?.id, mineOnly],
    { handleError: true },
  );

  const leads = data ?? [];

  const byStage = useMemo(() => {
    const map = new Map<LeadStage, Lead[]>(STAGES.map((s) => [s, []]));
    for (const lead of leads) map.get(lead.stage)?.push(lead);
    return map;
  }, [leads]);

  const pipeline = useMemo(
    () =>
      leads
        .filter((l) => l.stage !== 'won' && l.stage !== 'lost')
        .reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0),
    [leads],
  );

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`Businesses you are working on, by stage. ${nairaShort(pipeline)} in open pipeline.`}
        actions={
          <Button
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setEditing({ stage: 'new', ownerId: user?.id, ownerName: user ? `${user.firstName} ${user.lastName}` : '' })}
          >
            New lead
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((s) => (
            <div key={s} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="scrollbar-thin -mx-3 flex gap-3 overflow-x-auto px-3 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {STAGES.map((stage) => {
            const items = byStage.get(stage) ?? [];
            return (
              <section key={stage} className="w-[260px] shrink-0 lg:w-auto">
                <header className="mb-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STAGE_ACCENT[stage]}`} aria-hidden />
                  <h2 className="text-[11.5px] font-bold uppercase tracking-wide text-secondary">
                    {LEAD_STAGE_LABEL[stage]}
                  </h2>
                  <span className="tabular ml-auto text-[11.5px] font-bold text-muted">
                    {items.length}
                  </span>
                </header>

                <ul className="space-y-2">
                  {items.map((lead) => (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => setEditing(lead)}
                        className="w-full rounded-xl border border-hairline surface-card p-3 text-left shadow-card transition-colors hover:bg-[var(--surface-sunken)]"
                      >
                        <p className="truncate text-[13px] font-bold text-primary">{lead.company}</p>
                        <p className="truncate text-[12px] text-muted">{lead.contactName}</p>
                        {lead.estimatedValue ? (
                          <p className="tabular mt-1.5 text-[13px] font-bold text-primary">
                            {naira(lead.estimatedValue)}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-muted">
                          {lead.location ?? 'No location'} · {formatDate(lead.updatedAt ?? lead.createdAt)}
                        </p>
                      </button>
                    </li>
                  ))}

                  {items.length === 0 && (
                    <li className="rounded-xl border border-dashed border-[var(--border-hairline)] px-3 py-5 text-center text-[11.5px] text-muted">
                      Nothing here
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <LeadModal
        lead={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
          toast.success('Lead saved');
        }}
      />
    </div>
  );
}

function LeadModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Partial<Lead> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Partial<Lead>>(lead ?? {});
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState(lead?.id);

  if (lead && lead.id !== seed) {
    setSeed(lead.id);
    setDraft(lead);
  }
  if (!lead) return null;

  const set = <K extends keyof Lead>(key: K, value: Lead[K]) =>
    setDraft((c) => ({ ...c, [key]: value }));

  const save = async () => {
    if (!draft.company?.trim()) {
      toast.warning('A lead needs a company name');
      return;
    }
    setBusy(true);
    try {
      await saveLead({
        ...draft,
        company: draft.company.trim(),
        contactName: draft.contactName?.trim() ?? '',
      });
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
      title={draft.id ? draft.company || 'Lead' : 'New lead'}
      footer={
        <>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" required>
            <Input value={draft.company ?? ''} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label="Contact">
            <Input
              value={draft.contactName ?? ''}
              onChange={(e) => set('contactName', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <Input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={draft.location ?? ''} onChange={(e) => set('location', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stage" required>
            <Select
              value={draft.stage ?? 'new'}
              onChange={(e) => set('stage', e.target.value as LeadStage)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Value if it closes" hint="Optional">
            <Input
              type="number"
              min={0}
              value={draft.estimatedValue ?? ''}
              onChange={(e) =>
                set('estimatedValue', e.target.value === '' ? (undefined as never) : Number(e.target.value))
              }
              leading={<span className="text-[13px]">₦</span>}
            />
          </Field>
        </div>

        <Field label="Note" hint="Optional">
          <Textarea rows={3} value={draft.note ?? ''} onChange={(e) => set('note', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
