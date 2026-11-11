/**
 * Leads: businesses being followed up before they become customers.
 *
 * One list, most recent activity first. The chips on top are filters with
 * their counts, and a line under them gives the few figures that matter
 * (conversion, active this week, days to confirm). Tapping a lead opens its
 * side panel: details, the trail of what was done with comments on each entry,
 * and the request to confirm it as a customer, which a manager approves or
 * declines. See `lib/leads` for the model.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  Send,
  StickyNote,
  Trash2,
  User,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  SearchInput,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { isAdmin } from '@/lib/roles';
import { whatsappLink, whatsappNumber } from '@/lib/businessCard';
import { formatDate, formatDateTime, percent } from '@/lib/format';
import {
  LEAD_LIFETIME_DAYS,
  LOG_KINDS,
  LOG_LABEL,
  addLog,
  confirmLead,
  createLead,
  daysSince,
  declineLead,
  dueForRemoval,
  goneQuiet,
  leadFigures,
  listLeads,
  listLogs,
  removeLead,
  requestConfirmation,
  updateLead,
  withdrawRequest,
  type Person,
} from '@/lib/leads';
import { LEAD_STATUS_LABEL, PRICE_TIERS, TIER_LABEL, type Lead, type LeadLog, type LeadLogKind, type LeadStatus, type PriceTier } from '@/types';

type Filter = 'all' | LeadStatus | 'quiet' | 'due';

const STATUS_DOT: Record<LeadStatus, string> = {
  open: 'bg-[var(--series-1)]',
  pending: 'bg-[var(--series-5)]',
  confirmed: 'bg-status-good',
};

const LOG_ICON: Record<LeadLogKind, LucideIcon> = {
  visit: MapPin,
  call: PhoneCall,
  message: MessageSquare,
  meeting: Users,
  note: StickyNote,
  comment: MessageCircle,
  request: Send,
  confirmed: CheckCircle2,
  declined: XCircle,
};

function ago(when?: string): string {
  if (!when) return 'Never';
  const d = daysSince(when);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  return formatDate(when);
}

export default function LeadsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState<Lead | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [search, setSearch] = useState('');
  const [clearing, setClearing] = useState(false);

  /* A manager sees every lead and confirms them; a rep sees their own. */
  const manager = user ? isAdmin(user.role) : false;
  const me: Person | null = user ? { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() } : null;

  const { data, loading, reload } = useAsync(() => listLeads(manager ? null : (user?.id ?? null)), [user?.id, manager], {
    handleError: true,
  });
  const leads = useMemo(() => data ?? [], [data]);
  const figures = useMemo(() => leadFigures(leads), [leads]);

  /* A manager with requests waiting starts on them; everyone else on all. */
  const active: Filter = filter ?? (manager && figures.pending > 0 ? 'pending' : 'all');

  const counts: Record<Filter, number> = {
    all: figures.total,
    open: figures.open,
    pending: figures.pending,
    confirmed: figures.confirmed,
    quiet: figures.quiet,
    due: figures.due,
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      const inFilter =
        active === 'all' ||
        (active === 'quiet' ? goneQuiet(l) : active === 'due' ? dueForRemoval(l) : l.status === active);
      return (
        inFilter &&
        (!q || [l.company, l.contactName, l.location, l.phone, l.email, l.ownerName].some((v) => v?.toLowerCase().includes(q)))
      );
    });
  }, [leads, active, search]);

  const open = leads.find((l) => l.id === openId) ?? null;

  /* The chips that matter: the three states always, the warnings only when there is something to see. */
  const chips: Filter[] = ['all', 'open', 'pending', 'confirmed', ...(figures.quiet ? (['quiet'] as Filter[]) : []), ...(figures.due ? (['due'] as Filter[]) : [])];
  const chipLabel = (f: Filter) =>
    f === 'all' ? 'All' : f === 'quiet' ? 'Gone quiet' : f === 'due' ? 'Over a year' : LEAD_STATUS_LABEL[f];

  const clearOld = async () => {
    const old = leads.filter((l) => dueForRemoval(l));
    try {
      for (const lead of old) await removeLead(lead);
      toast.success(`${old.length} old ${old.length === 1 ? 'lead' : 'leads'} removed`);
      setFilter('all');
      reload();
    } catch (err) {
      toast.error('Could not remove them all', err instanceof Error ? err.message : undefined);
      reload();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`Businesses being followed up before they become customers. Log every visit, call and message on the lead's trail; when it is ready to buy, ask for it to be confirmed and a manager opens its customer account. A lead not confirmed within ${LEAD_LIFETIME_DAYS} days is due to be removed.`}
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing('new')}>
            New lead
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No leads yet"
          description="Add a business you are following up, then log each visit, call and message on its trail."
          action={
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing('new')}>
              New lead
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div role="tablist" aria-label="Filter leads" className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 sm:-mx-5 sm:px-5 lg:mx-0 lg:flex-1 lg:px-0">
              {chips.map((f) => {
                const on = f === active;
                const warn = f === 'quiet' || f === 'due';
                return (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-label font-semibold transition-colors',
                      on
                        ? 'bg-[var(--text-primary)] text-[var(--surface-page)]'
                        : 'border border-hairline text-secondary hover:text-primary',
                    )}
                  >
                    {f !== 'all' && !warn && <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[f as LeadStatus])} aria-hidden />}
                    {warn && <Clock size={14} aria-hidden className={on ? '' : 'text-status-warning'} />}
                    {chipLabel(f)}
                    <span className={cn('tabular text-caption', on ? 'opacity-70' : 'text-muted')}>{counts[f]}</span>
                  </button>
                );
              })}
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search leads" className="lg:w-72" />
          </div>

          <p className="mt-3 text-caption text-muted">
            {`${percent(figures.conversion * 100)} confirmed as customers · ${figures.activeThisWeek} active this week`}
            {figures.daysToConfirm !== null ? ` · ${figures.daysToConfirm} days on average to confirm` : ''}
          </p>

          {active === 'due' && manager && figures.due > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline px-4 py-3">
              <p className="text-label text-secondary">{`Not confirmed within a year. Remove them to keep the list to live leads.`}</p>
              <Button size="sm" variant="outline" icon={<Trash2 size={15} />} onClick={() => setClearing(true)}>
                {`Remove ${figures.due}`}
              </Button>
            </div>
          )}

          <div className="mt-3 overflow-hidden rounded-2xl border border-hairline surface-card">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_1.25rem] gap-4 border-b border-hairline px-5 py-2.5 text-caption font-semibold text-muted md:grid">
              <span>Lead</span>
              <span>Status</span>
              <span>Last activity</span>
              <span>{manager ? 'Rep' : 'Location'}</span>
              <span>Added</span>
              <span />
            </div>
            <ul className="divide-y divide-[var(--border-hairline)]">
              {shown.map((lead) => (
                <li key={lead.id}>
                  <LeadRow lead={lead} manager={manager} onOpen={() => setOpenId(lead.id)} />
                </li>
              ))}
            </ul>
            {shown.length === 0 && (
              <p className="px-5 py-12 text-center text-label text-muted">
                {search ? 'No leads match that search.' : 'Nothing here.'}
              </p>
            )}
          </div>
        </>
      )}

      {open && me && (
        <LeadPanel
          key={open.id}
          lead={open}
          me={me}
          manager={manager}
          onClose={() => setOpenId(null)}
          onEdit={() => setEditing(open)}
          onChanged={reload}
          onRemoved={() => {
            setOpenId(null);
            reload();
          }}
        />
      )}

      {editing && me && (
        <LeadForm
          lead={editing === 'new' ? null : editing}
          me={me}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            reload();
            toast.success('Lead saved');
            if (editing === 'new') setOpenId(id);
          }}
        />
      )}

      <ConfirmDialog
        open={clearing}
        title={`Remove ${figures.due} old ${figures.due === 1 ? 'lead' : 'leads'}?`}
        message="Each one and its trail are taken off for good. Leads that became customers are not touched."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => void clearOld()}
        onClose={() => setClearing(false)}
      />
    </div>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--surface-sunken)] px-2.5 py-1 text-caption font-semibold text-secondary">
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} aria-hidden />
      {LEAD_STATUS_LABEL[status]}
    </span>
  );
}

function LeadRow({ lead, manager, onOpen }: { lead: Lead; manager: boolean; onOpen: () => void }) {
  const quiet = goneQuiet(lead);
  const due = dueForRemoval(lead);
  const activity = lead.lastLogAt ? ago(lead.lastLogAt) : 'Nothing logged';
  const logs = lead.logCount ? ` · ${lead.logCount} ${lead.logCount === 1 ? 'entry' : 'entries'}` : '';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-sunken)] sm:px-5 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_1.25rem]"
    >
      <span className="min-w-0">
        <span className="block truncate text-label font-semibold text-primary">{lead.company}</span>
        <span className="block truncate text-caption text-muted">
          {[lead.contactName, lead.location].filter(Boolean).join(' · ') || 'No contact yet'}
        </span>
        <span className="mt-0.5 block truncate text-caption text-muted md:hidden">{`${activity}${logs}`}</span>
      </span>

      <span className="flex flex-col items-end gap-1 md:hidden">
        <StatusPill status={lead.status} />
        {(due || quiet) && <span className="text-caption font-semibold text-status-warning">{due ? 'Over a year' : 'Gone quiet'}</span>}
      </span>

      <span className="hidden items-center gap-2 md:flex">
        <StatusPill status={lead.status} />
      </span>
      <span className="hidden min-w-0 md:block">
        <span className={cn('block truncate text-label', quiet ? 'font-semibold text-status-warning' : 'text-secondary')}>{activity}</span>
        <span className="block truncate text-caption text-muted">{due ? 'Over a year old' : (lead.logCount ?? 0) > 0 ? `${lead.logCount} ${lead.logCount === 1 ? 'entry' : 'entries'}` : ''}</span>
      </span>
      <span className="hidden truncate text-label text-secondary md:block">{(manager ? lead.ownerName : lead.location) || '—'}</span>
      <span className="hidden text-label text-muted md:block">{formatDate(lead.createdAt)}</span>
      <ChevronRight size={16} aria-hidden className="hidden text-muted md:block" />
    </button>
  );
}

/* ------------------------------------------------------------- the panel */

function LeadPanel({
  lead,
  me,
  manager,
  onClose,
  onEdit,
  onChanged,
  onRemoved,
}: {
  lead: Lead;
  me: Person;
  manager: boolean;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
  onRemoved: () => void;
}) {
  const toast = useToast();
  const mine = lead.ownerId === me.id;
  const { data: logs, loading, reload: reloadLogs } = useAsync(() => listLogs(lead.id), [lead.id, lead.logCount, lead.status], {
    handleError: true,
  });
  const [removing, setRemoving] = useState(false);

  const changed = () => {
    onChanged();
    reloadLogs();
  };

  const remove = async () => {
    try {
      await removeLead(lead);
      toast.success('Lead removed', lead.company);
      onRemoved();
    } catch (err) {
      toast.error('Not removed', err instanceof Error ? err.message : undefined);
    } finally {
      setRemoving(false);
    }
  };

  const wa = whatsappNumber(lead.phone);
  const action = 'inline-flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 text-label font-semibold text-primary hover:bg-[var(--surface-sunken)]';

  return (
    <Drawer open onClose={onClose} title={lead.company} width="max-w-lg">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusPill status={lead.status} />
          <span className="text-caption text-muted">{`Added ${formatDate(lead.createdAt)} · ${daysSince(lead.createdAt)} days`}</span>
        </div>

        {(lead.phone || lead.email) && (
          <div className="flex flex-wrap gap-2">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className={action}>
                <Phone size={15} aria-hidden /> Call
              </a>
            )}
            {wa && (
              <a href={whatsappLink(wa, '')} target="_blank" rel="noreferrer" className={action}>
                <MessageCircle size={15} aria-hidden /> WhatsApp
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className={action}>
                <Mail size={15} aria-hidden /> Email
              </a>
            )}
          </div>
        )}

        <dl className="divide-y divide-[var(--border-hairline)] rounded-2xl border border-hairline">
          <Detail icon={<User size={15} />} label="Contact" value={lead.contactName} />
          <Detail icon={<Phone size={15} />} label="Phone" value={lead.phone} />
          <Detail icon={<Mail size={15} />} label="Email" value={lead.email} />
          <Detail icon={<MapPin size={15} />} label="Location" value={lead.location} />
          <Detail icon={<Users size={15} />} label="Rep" value={lead.ownerName} />
        </dl>

        {lead.note && <p className="whitespace-pre-line rounded-2xl bg-[var(--surface-sunken)] px-4 py-3 text-body text-primary">{lead.note}</p>}

        <Confirmation lead={lead} me={me} mine={mine} manager={manager} onChanged={changed} />

        <Trail lead={lead} logs={logs ?? []} loading={loading} me={me} onLogged={changed} canLog={manager || mine} />

        <div className="flex gap-2 border-t border-hairline pt-5">
          {(manager || mine) && (
            <Button variant="outline" icon={<Pencil size={15} />} onClick={onEdit} className="flex-1">
              Edit details
            </Button>
          )}
          {manager && (
            <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setRemoving(true)}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={removing}
        title={`Remove ${lead.company}?`}
        message={lead.status === 'confirmed' ? 'The lead and its trail go; the customer account stays.' : 'The lead and its trail are taken off for good.'}
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => void remove()}
        onClose={() => setRemoving(false)}
      />
    </Drawer>
  );
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-muted" aria-hidden>
        {icon}
      </span>
      <dt className="w-20 shrink-0 text-caption text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-label font-medium text-primary">{value || '—'}</dd>
    </div>
  );
}

/* ---------------------------------------------------------- confirmation */

/**
 * The one decision a lead waits on. A rep asks, saying why (usually: it wants
 * to place an order); a manager opens the customer account or says not yet.
 * A manager can also confirm a lead outright.
 */
function Confirmation({
  lead,
  me,
  mine,
  manager,
  onChanged,
}: {
  lead: Lead;
  me: Person;
  mine: boolean;
  manager: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { reload: reloadOrg } = useOrg();
  const [mode, setMode] = useState<'ask' | 'decline' | 'confirm' | null>(null);
  const [text, setText] = useState('');
  const [tier, setTier] = useState<PriceTier>('OT');
  const [busy, setBusy] = useState(false);

  useEffect(() => setText(''), [mode]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(done, lead.company);
      setMode(null);
      onChanged();
    } catch (err) {
      toast.error('That did not go through', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const box = 'rounded-2xl border border-hairline p-4';

  if (lead.status === 'confirmed') {
    return (
      <div className={cn(box, 'flex items-start gap-3')}>
        <CheckCircle2 size={20} aria-hidden className="mt-0.5 shrink-0 text-status-good" />
        <div className="min-w-0">
          <p className="text-label font-semibold text-primary">Confirmed as a customer</p>
          <p className="text-caption text-muted">
            {lead.confirmedAt ? `${formatDate(lead.confirmedAt)}${lead.confirmedByName ? `, by ${lead.confirmedByName}` : ''}` : 'Before the trail was kept.'}
          </p>
          {lead.customerId && (
            <Link
              to={manager ? '../distributors' : '../orders'}
              className="mt-2 inline-flex items-center gap-1 text-label font-semibold text-primary underline underline-offset-4"
            >
              {manager ? 'Open customers' : 'Take an order'} <ChevronRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (lead.status === 'pending') {
    return (
      <div className={box}>
        <p className="flex items-center gap-2 text-label font-semibold text-primary">
          <CalendarClock size={17} aria-hidden className="text-[var(--series-5)]" />
          Awaiting confirmation
        </p>
        <p className="mt-1 text-caption text-muted">
          {`${lead.requestedByName ?? 'The rep'} asked ${lead.requestedAt ? ago(lead.requestedAt).toLowerCase() : ''}`}
        </p>
        {lead.requestNote && <p className="mt-2 whitespace-pre-line text-body text-primary">{lead.requestNote}</p>}

        {manager && mode === null && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" icon={<CheckCircle2 size={15} />} onClick={() => setMode('confirm')}>
              Confirm customer
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode('decline')}>
              Not yet
            </Button>
          </div>
        )}
        {!manager && mine && mode === null && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-caption text-muted">A manager will confirm it.</p>
            <Button size="sm" variant="ghost" loading={busy} onClick={() => void run(() => withdrawRequest(lead, me), 'Request withdrawn')}>
              Withdraw
            </Button>
          </div>
        )}
        {!manager && !mine && <p className="mt-3 text-caption text-muted">A manager will confirm it.</p>}

        {mode === 'confirm' && <ConfirmForm tier={tier} setTier={setTier} busy={busy} onCancel={() => setMode(null)} onConfirm={() => void run(async () => { await confirmLead(lead, tier, me); reloadOrg(); }, 'Customer confirmed')} />}
        {mode === 'decline' && (
          <div className="mt-4 space-y-3">
            <Field label="Why not yet">
              <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Waiting for their CAC documents." />
            </Field>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                Cancel
              </Button>
              <Button size="sm" disabled={!text.trim()} loading={busy} onClick={() => void run(() => declineLead(lead, text, me), 'Sent back to the rep')}>
                Send back
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* status: open */
  if (!mine && !manager) return null;
  return (
    <div className={box}>
      {mode === null && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label font-semibold text-primary">Ready to buy?</p>
            <p className="text-caption text-muted">{manager ? 'Open its customer account so orders can be taken.' : 'Ask a manager to confirm it as a customer.'}</p>
          </div>
          <Button size="sm" icon={<Send size={15} />} onClick={() => setMode(manager ? 'confirm' : 'ask')}>
            {manager ? 'Confirm customer' : 'Ask to confirm'}
          </Button>
        </div>
      )}
      {mode === 'ask' && (
        <div className="space-y-3">
          <Field label="What has happened">
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Wants to place a first order of 50 cartons this week." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!text.trim()} loading={busy} onClick={() => void run(() => requestConfirmation(lead, text, me), 'Sent for confirmation')}>
              Send for confirmation
            </Button>
          </div>
        </div>
      )}
      {mode === 'confirm' && <ConfirmForm tier={tier} setTier={setTier} busy={busy} onCancel={() => setMode(null)} onConfirm={() => void run(async () => { await confirmLead(lead, tier, me); reloadOrg(); }, 'Customer confirmed')} />}
    </div>
  );
}

function ConfirmForm({
  tier,
  setTier,
  busy,
  onCancel,
  onConfirm,
}: {
  tier: PriceTier;
  setTier: (t: PriceTier) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      <Field label="Price tier" hint="Credit limit and terms are set on the customer afterwards.">
        <Select value={tier} onChange={(e) => setTier(e.target.value as PriceTier)}>
          {PRICE_TIERS.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" icon={<CheckCircle2 size={15} />} loading={busy} onClick={onConfirm}>
          Open customer account
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- trail */

function Trail({
  lead,
  logs,
  loading,
  me,
  canLog,
  onLogged,
}: {
  lead: Lead;
  logs: LeadLog[];
  loading: boolean;
  me: Person;
  canLog: boolean;
  onLogged: () => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<LeadLogKind>('visit');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const entries = logs.filter((l) => !l.replyTo).reverse();
  const replies = (id: string) => logs.filter((l) => l.replyTo === id);

  const send = async (entry: { kind: LeadLogKind; text: string; replyTo?: string }) => {
    setBusy(true);
    try {
      await addLog(lead, entry, me);
      if (entry.replyTo) {
        setReply('');
        setReplyTo(null);
      } else setText('');
      onLogged();
    } catch (err) {
      toast.error('Not logged', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h3 className="text-label font-semibold text-primary">Trail</h3>

      {canLog && lead.status !== 'confirmed' && (
        <div className="mt-3 rounded-2xl border border-hairline p-3">
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
            {LOG_KINDS.map((k) => {
              const Icon = LOG_ICON[k.kind];
              const on = k.kind === kind;
              return (
                <button
                  key={k.kind}
                  type="button"
                  onClick={() => setKind(k.kind)}
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-caption font-semibold transition-colors',
                    on ? 'bg-[var(--text-primary)] text-[var(--surface-page)]' : 'text-secondary hover:bg-[var(--surface-sunken)]',
                  )}
                >
                  <Icon size={14} aria-hidden />
                  {k.label}
                </button>
              );
            })}
          </div>
          <Textarea
            rows={2}
            className="mt-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Met the buyer; they want samples of the 1L pack."
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" disabled={!text.trim()} loading={busy && !replyTo} onClick={() => void send({ kind, text })}>
              Log it
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-14 rounded-xl" />
        </div>
      ) : (
        <ol className="mt-4 space-y-4">
          {entries.map((entry) => {
            const Icon = LOG_ICON[entry.kind] ?? StickyNote;
            const answers = replies(entry.id);
            return (
              <li key={entry.id} className="flex gap-3">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    entry.kind === 'confirmed'
                      ? 'bg-status-good/15 text-status-good'
                      : entry.kind === 'declined'
                        ? 'bg-status-critical/15 text-status-critical'
                        : 'bg-[var(--surface-sunken)] text-secondary',
                  )}
                  aria-hidden
                >
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-caption text-muted">
                    <span className="font-semibold text-primary">{entry.byName}</span>
                    {` · ${LOG_LABEL[entry.kind]} · ${formatDateTime(entry.at)}`}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-body text-primary">{entry.text}</p>

                  {answers.length > 0 && (
                    <ul className="mt-2 space-y-2 border-l-2 border-hairline pl-3">
                      {answers.map((a) => (
                        <li key={a.id}>
                          <p className="text-caption text-muted">
                            <span className="font-semibold text-primary">{a.byName}</span>
                            {` · ${formatDateTime(a.at)}`}
                          </p>
                          <p className="whitespace-pre-line text-label text-primary">{a.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {replyTo === entry.id ? (
                    <div className="mt-2 flex items-end gap-2">
                      <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add a comment" autoFocus className="flex-1" />
                      <Button size="sm" disabled={!reply.trim()} loading={busy && replyTo === entry.id} onClick={() => void send({ kind: 'comment', text: reply, replyTo: entry.id })}>
                        Post
                      </Button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setReplyTo(entry.id); setReply(''); }} className="mt-1 text-caption font-semibold text-muted hover:text-primary">
                      Comment
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-secondary" aria-hidden>
              <Plus size={15} />
            </span>
            <p className="pt-1.5 text-caption text-muted">{`Added by ${lead.ownerName || 'the rep'} · ${formatDate(lead.createdAt)}`}</p>
          </li>
        </ol>
      )}
    </section>
  );
}

/* ------------------------------------------------------------- the form */

function LeadForm({
  lead,
  me,
  onClose,
  onSaved,
}: {
  lead: Lead | null;
  me: Person;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState({
    company: lead?.company ?? '',
    contactName: lead?.contactName ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    location: lead?.location ?? '',
    note: lead?.note ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof draft, value: string) => setDraft((c) => ({ ...c, [key]: value }));

  const save = async () => {
    if (!draft.company.trim()) {
      toast.warning('A lead needs a business name');
      return;
    }
    setBusy(true);
    try {
      if (lead) {
        await updateLead(lead.id, draft);
        onSaved(lead.id);
      } else {
        onSaved(await createLead(draft, me));
      }
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
      title={lead ? lead.company : 'New lead'}
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
          <Field label="Business" required>
            <Input value={draft.company} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label="Contact person">
            <Input value={draft.contactName} onChange={(e) => set('contactName', e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <Input type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Email" hint="Optional">
            <Input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
        </div>
        <Field label="Location">
          <Input value={draft.location} onChange={(e) => set('location', e.target.value)} placeholder="Ikeja, Lagos" />
        </Field>
        <Field label="About this lead" hint="Optional">
          <Textarea rows={3} value={draft.note} onChange={(e) => set('note', e.target.value)} placeholder="Supermarket with two branches; buys from a competitor today." />
        </Field>
      </div>
    </Modal>
  );
}
