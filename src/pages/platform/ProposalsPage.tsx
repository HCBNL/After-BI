/**
 * Proposals: a tailored commercial proposal for a prospect, in a few minutes.
 *
 * A list of saved proposals, and an editor beside a live preview of the
 * printed page. The preview is the exact document that prints (an iframe of
 * `proposalHtml`), so what is seen here is what the prospect receives.
 * "Print or save as PDF" opens the browser's print dialog; choose Save as PDF
 * to email it.
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Handshake, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  Select,
  Switch,
  Textarea,
  useToast,
} from '@/components/ui';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { printHtml } from '@/lib/print';
import { MODULES, PLANS, naira, planByName } from '@/lib/site';
import { cn } from '@/lib/cn';
import {
  blankProposal,
  BUSINESS_TYPES,
  deleteProposal,
  figures,
  listProposals,
  PAINS,
  proposalHtml,
  proposalNumber,
  saveProposal,
  suggestPlan,
  SUPPORT_LEVELS,
  type BusinessType,
  type Pain,
  type ProposalEdition,
  type ProposalInput,
  type SupportLevel,
} from '@/lib/proposal';
import { getSiteHomeLive, type SiteHome } from '@/lib/siteDoc';
import { resolveCustom, resolvePartners } from '@/lib/programme';
import { blankPartner, partnerLetterHtml, partnerReference, type PartnerInput } from '@/lib/partnerLetter';

const STATUS_TONE = { draft: 'neutral', sent: 'info', won: 'good', lost: 'critical' } as const;
const STATUS_LABEL = { draft: 'Draft', sent: 'Sent', won: 'Won', lost: 'Lost' } as const;

const num = (value: string) => Math.max(0, Math.round(Number(value.replace(/[^\d.]/g, '')) || 0));

export default function ProposalsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('v') === 'partner' ? 'partner' : 'business';
  const site = useAsync(getSiteHomeLive, [], { handleError: true });

  const tabs = (
    <SegmentedControl
      className="mb-4"
      value={tab}
      onChange={(next) => setParams(next === 'partner' ? { v: 'partner' } : {}, { replace: true })}
      options={[
        { value: 'business', label: 'Business proposals', icon: <FileText size={14} /> },
        { value: 'partner', label: 'Partner letter', icon: <Handshake size={14} /> },
      ]}
    />
  );

  if (tab === 'partner') {
    return (
      <div>
        <PageHeader
          title="Partner letter"
          description="An invitation to the Partner Programme, for a consultant, accountant or association leader."
        />
        {tabs}
        <PartnerLetter home={site.data ?? undefined} />
      </div>
    );
  }
  return <Business tabs={tabs} home={site.data ?? undefined} />;
}

function Business({ tabs, home }: { tabs: React.ReactNode; home: SiteHome | undefined }) {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(listProposals, [], { handleError: true });
  const [editing, setEditing] = useState<ProposalInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<ProposalInput | null>(null);

  const proposals = data ?? [];

  const save = async (next = editing) => {
    if (!next) return;
    if (!next.company.trim()) {
      toast.warning('Name the business first', 'The proposal is addressed to it.');
      return;
    }
    setBusy(true);
    try {
      const saved = await saveProposal(next);
      setEditing(saved);
      reload();
      toast.success('Proposal saved', proposalNumber(saved));
    } catch (err) {
      toast.error(
        'Not saved',
        err instanceof Error && /permission/i.test(err.message)
          ? 'The database refused it. Publish the current firestore.rules, then try again.'
          : 'Check the connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteProposal(removing.id);
      if (editing?.id === removing.id) setEditing(null);
      setRemoving(null);
      reload();
    } catch {
      toast.error('Could not delete it', 'Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- list */
  if (!editing) {
    return (
      <div>
        <PageHeader
          title="Proposals"
          description="A tailored proposal for a prospect: features, pricing, support and why AfterBI fits their business."
          actions={
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setEditing(blankProposal())}>
              New proposal
            </Button>
          }
        />
        {tabs}
        {error && (
          <Alert tone="critical" title="Could not read the proposals">
            {/permission/i.test(error.message)
              ? 'The database refused it. Publish the current firestore.rules and reload.'
              : 'Check the connection and reload.'}
          </Alert>
        )}
        {loading && !data ? (
          <Loading label="Fetching the proposals" rows={3} />
        ) : proposals.length === 0 && !error ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="No proposals yet"
            description="Write one after a walkthrough call, while the prospect's numbers are fresh."
            action={<Button icon={<Plus size={16} />} onClick={() => setEditing(blankProposal())}>Write the first one</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {proposals.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button type="button" onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold text-primary">{p.company || 'Untitled'}</h3>
                      <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </div>
                    <p className="mt-1 text-[12.5px] text-secondary">
                      {proposalNumber(p)} · {p.plan} · {naira(figures(p).monthlyTotal)} a month
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(p)}>
                      Open
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setRemoving(p)}>
                      <span className="sr-only">Delete {p.company}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        <ConfirmDialog
          open={Boolean(removing)}
          onClose={() => setRemoving(null)}
          onConfirm={() => void remove()}
          title="Delete this proposal?"
          tone="danger"
          confirmLabel="Delete it"
          loading={busy}
          message={<>The proposal for <strong>{removing?.company}</strong> goes for good.</>}
        />
      </div>
    );
  }

  return (
    <Editor
      value={editing}
      onChange={setEditing}
      onBack={() => setEditing(null)}
      onSave={() => void save()}
      busy={busy}
      home={home}
    />
  );
}

/* ------------------------------------------------------------------ editor */

function Editor({
  value: p,
  onChange,
  onBack,
  onSave,
  busy,
  home,
}: {
  value: ProposalInput;
  onChange: (next: ProposalInput) => void;
  onBack: () => void;
  onSave: () => void;
  busy: boolean;
  home: SiteHome | undefined;
}) {
  const set = <K extends keyof ProposalInput>(key: K, value: ProposalInput[K]) => onChange({ ...p, [key]: value });
  const custom = resolveCustom(home?.customBuild);
  const doc = useMemo(() => proposalHtml(p, home?.customBuild), [p, home?.customBuild]);
  const f = figures(p);
  const suggested = suggestPlan(p.depots, p.staff);

  const choosePlan = (name: string) => {
    const plan = planByName(name);
    onChange({ ...p, plan: name, monthly: plan?.price ?? p.monthly });
  };
  const toggle = <T extends string>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    <div>
      <PageHeader
        title={p.company ? `Proposal for ${p.company}` : 'New proposal'}
        description={`${proposalNumber(p)}. ${naira(f.monthlyTotal)} a month, ${naira(f.firstYear)} in the first year.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" icon={<Printer size={15} />} onClick={() => printHtml(doc.title, doc.html)}>
              Print or save as PDF
            </Button>
            <Button size="sm" icon={<Save size={15} />} loading={busy} onClick={onSave}>
              Save
            </Button>
          </div>
        }
      />
      <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={onBack} className="mb-3">
        All proposals
      </Button>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="How it reads" />
            <SegmentedControl<ProposalEdition>
              value={p.edition ?? 'price'}
              onChange={(edition) => set('edition', edition)}
              options={[
                { value: 'price', label: 'Price first' },
                { value: 'value', label: 'Value first' },
              ]}
            />
            <p className="mt-2 text-[12.5px] text-muted">
              {(p.edition ?? 'price') === 'price'
                ? 'Leads with the numbers, including the first year in full. For a buyer who asked for a quote.'
                : 'Leads with what changes for them. The price is one short table at the end, with no yearly total.'}
            </p>
            {custom.enabled && (
              <div className="mt-4">
                <Switch
                  checked={Boolean(p.includeCustom)}
                  onChange={(next) => set('includeCustom', next)}
                  label={`Include Option 2: ${custom.name}`}
                  description={custom.priceLine}
                  hint="Adds a built for you option under the subscription, using the words in Platform, Website."
                />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="The prospect" subtitle="Who the proposal is for." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" required className="sm:col-span-2">
                <Input value={p.company} maxLength={120} onChange={(e) => set('company', e.target.value)} placeholder="Sunrise Foods Ltd" />
              </Field>
              <Field label="Contact name">
                <Input value={p.contactName} maxLength={80} onChange={(e) => set('contactName', e.target.value)} placeholder="Adaeze Okonkwo" />
              </Field>
              <Field label="Their title">
                <Input value={p.contactTitle} maxLength={80} onChange={(e) => set('contactTitle', e.target.value)} placeholder="Managing Director" />
              </Field>
              <Field label="Email">
                <Input type="email" value={p.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={p.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
              </Field>
              <Field label="Kind of business" className="sm:col-span-2">
                <Select value={p.businessType} onChange={(e) => set('businessType', e.target.value as BusinessType)}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Depots">
                <Input inputMode="numeric" value={String(p.depots)} onChange={(e) => set('depots', num(e.target.value))} />
              </Field>
              <Field label="Distributors">
                <Input inputMode="numeric" value={String(p.distributors)} onChange={(e) => set('distributors', num(e.target.value))} />
              </Field>
              <Field label="Staff who will sign in">
                <Input inputMode="numeric" value={String(p.staff)} onChange={(e) => set('staff', num(e.target.value))} />
              </Field>
              <Field label="Status">
                <Select value={p.status} onChange={(e) => set('status', e.target.value as ProposalInput['status'])}>
                  {Object.entries(STATUS_LABEL).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="What hurts today" subtitle="Each one ticked adds a paragraph on why AfterBI fits, using their own numbers." />
            <div className="flex flex-wrap gap-2">
              {PAINS.map((pain) => (
                <Chip key={pain} active={p.pains.includes(pain)} onClick={() => set('pains', toggle<Pain>(p.pains, pain))}>
                  {pain}
                </Chip>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Features" subtitle="The modules to show. Untick any that do not matter to them." />
            <div className="flex flex-wrap gap-2">
              {MODULES.map((m) => (
                <Chip key={m.slug} active={p.modules.includes(m.slug)} onClick={() => set('modules', toggle(p.modules, m.slug))}>
                  {m.name}
                </Chip>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Pricing" subtitle={`For their size we suggest the ${suggested} plan.`} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plan">
                <Select value={p.plan} onChange={(e) => choosePlan(e.target.value)}>
                  {PLANS.map((plan) => (
                    <option key={plan.name} value={plan.name}>
                      {plan.name} {plan.price ? `(${naira(plan.price)} a month)` : '(priced for them)'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Monthly fee offered (₦)" hint="Starts at the plan's list price. Group has no list price; set it here.">
                <Input inputMode="numeric" value={String(p.monthly)} onChange={(e) => set('monthly', num(e.target.value))} />
              </Field>
              <Field label="Discount (%)">
                <Input inputMode="numeric" value={String(p.discount)} onChange={(e) => set('discount', Math.min(num(e.target.value), 100))} />
              </Field>
              <Field label="Setup and migration fee (₦)" hint="Zero prints as Included.">
                <Input inputMode="numeric" value={String(p.setupFee)} onChange={(e) => set('setupFee', num(e.target.value))} />
              </Field>
              <Field label="Support">
                <Select value={p.support} onChange={(e) => set('support', e.target.value as SupportLevel)}>
                  {(Object.keys(SUPPORT_LEVELS) as SupportLevel[]).map((key) => (
                    <option key={key} value={key}>
                      {SUPPORT_LEVELS[key].name} {SUPPORT_LEVELS[key].price ? `(${naira(SUPPORT_LEVELS[key].price)} a month)` : '(included)'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Valid for (days)">
                <Input inputMode="numeric" value={String(p.validDays)} onChange={(e) => set('validDays', Math.max(num(e.target.value), 1))} />
              </Field>
              <div className="sm:col-span-2">
                <Switch
                  checked={p.annual}
                  onChange={(next) => set('annual', next)}
                  label="Annual commitment"
                  hint="Two months free: the first year is billed as ten months."
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="A personal note" subtitle="Optional. Printed under the title, in your words." />
            <Textarea
              rows={3}
              maxLength={500}
              value={p.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Thank you for the time on Tuesday. As promised, here is how AfterBI would work for your depots in Aba and Onitsha."
            />
          </Card>
        </div>

        {/* The exact page that prints. */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <p className="mb-2 text-[12.5px] font-semibold text-muted">Preview: this is what prints</p>
          <iframe
            title="Proposal preview"
            srcDoc={doc.html}
            className="h-[75vh] w-full rounded-2xl border border-hairline bg-white shadow-card"
          />
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
        active ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950' : 'surface-sunken text-secondary hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ partner letter */

function PartnerLetter({ home }: { home: SiteHome | undefined }) {
  const defaults = resolvePartners(home?.partners);
  const [input, setInput] = useState<PartnerInput | null>(null);
  const p = input ?? blankPartner(defaults.reward, defaults.payDays);
  const set = <K extends keyof PartnerInput>(key: K, value: PartnerInput[K]) => setInput({ ...p, [key]: value });
  const doc = useMemo(() => partnerLetterHtml(p), [p]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Card>
          <CardHeader title="The partner" subtitle={`Reference ${partnerReference(p)}`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" hint="Empty prints Dear Partner, for a letter sent widely.">
              <Input value={p.partnerName} maxLength={80} onChange={(e) => set('partnerName', e.target.value)} placeholder="Mr Tunde Bakare" />
            </Field>
            <Field label="Firm or role">
              <Input value={p.partnerDetail} maxLength={120} onChange={(e) => set('partnerDetail', e.target.value)} placeholder="Bakare Sales Consulting" />
            </Field>
            <Field label="Reward per business (₦)">
              <Input inputMode="numeric" value={String(p.reward)} onChange={(e) => set('reward', num(e.target.value))} />
            </Field>
            <Field label="Paid within (working days)">
              <Input inputMode="numeric" value={String(p.payDays)} onChange={(e) => set('payDays', Math.max(num(e.target.value), 1))} />
            </Field>
            <Field label="Date">
              <Input type="date" value={p.date} onChange={(e) => set('date', e.target.value || p.date)} />
            </Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="A personal note" subtitle="Optional. Printed in the introduction." />
          <Textarea rows={3} maxLength={400} value={p.note} onChange={(e) => set('note', e.target.value)} />
        </Card>
        <Button icon={<Printer size={15} />} onClick={() => printHtml(doc.title, doc.html)}>
          Print or save as PDF
        </Button>
      </div>
      <div className="xl:sticky xl:top-4 xl:self-start">
        <p className="mb-2 text-[12.5px] font-semibold text-muted">Preview: this is what prints</p>
        <iframe title="Partner letter preview" srcDoc={doc.html} className="h-[75vh] w-full rounded-2xl border border-hairline bg-white shadow-card" />
      </div>
    </div>
  );
}
