/**
 * Targets — the number you are carrying this month.
 *
 * Measured against sell-out, not sell-in. A rep who has pushed 4,000 cartons
 * into a distributor's warehouse has not sold them; the shops have to. Paying
 * commission on sell-in is how a territory ends up with nine months of stock
 * and a rep who has already been paid for it.
 */

import { useMemo, useState } from 'react';
import { Pencil, Plus, Target as TargetIcon, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  ProgressBar,
  SegmentedControl,
  Select,
  StatTile,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { listSales, listTargets, removeTarget, saveTarget } from '@/lib/db';
import { isAdmin, partnerScope } from '@/lib/roles';
import { useOrg } from '@/context/OrgContext';
import { listMembers } from '@/lib/db';
import { monthKey, naira, nairaShort, percent } from '@/lib/format';
import { useAsync as useAsyncMembers } from '@/hooks/useAsync';
import type { Target } from '@/types';

export default function TargetsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [period, setPeriod] = useState(monthKey());
  const [editing, setEditing] = useState<Partial<Target> | null>(null);
  const [removing, setRemoving] = useState<Target | null>(null);
  const scope = partnerScope(user);

  /* Only an administrator sets a target — see `firestore.rules`. Anybody else
     gets the same screen with no controls, which is correct: they are here to
     see the number they are carrying, not to change it. */
  const canSet = user ? isAdmin(user.role) : false;

  const { data, loading, reload } = useAsync(
    async () => {
      const from = `${period}-01`;
      const to = `${period}-31`;
      const [targets, sales] = await Promise.all([
        listTargets(period, scope ? [user?.id ?? '', ...scope] : null),
        listSales({ distributorId: scope, from, to, max: 1000 }),
      ]);
      return { targets, sales };
    },
    [period, scope],
    { handleError: true },
  );

  const rows = useMemo(() => {
    if (!data) return [];

    /* Achievement is summed per owner from the sell-out in the period, so the
       figure on this screen and the figure on Sell-out cannot disagree. */
    const achieved = new Map<string, number>();
    for (const sale of data.sales) {
      for (const key of [sale.capturedBy, sale.distributorId, sale.productId]) {
        achieved.set(key, (achieved.get(key) ?? 0) + sale.total);
      }
    }

    return data.targets
      .filter((target) => (isAdmin(user?.role ?? 'distributor') ? true : target.ownerId === user?.id || (scope ?? []).includes(target.ownerId)))
      .map((target) => ({
        ...target,
        achieved: achieved.get(target.ownerId) ?? 0,
        progress: target.value > 0 ? ((achieved.get(target.ownerId) ?? 0) / target.value) * 100 : 0,
      }))
      .sort((a, b) => b.progress - a.progress);
  }, [data, user]);

  const summary = useMemo(
    () => ({
      target: rows.reduce((sum, r) => sum + r.value, 0),
      achieved: rows.reduce((sum, r) => sum + r.achieved, 0),
    }),
    [rows],
  );

  /* The last six months, newest first. Anything older is a report, not a
     screen you check. */
  const periods = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i += 1) {
      out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    return out;
  }, []);

  return (
    <div>
      <PageHeader
        title="Targets"
        description="The number you are carrying, and how far through it you are. Measured on sell-out."
        actions={
          canSet && (
            <Button
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setEditing({ period, ownerType: 'distributor' })}
            >
              Set a target
            </Button>
          )
        }
      >
        <SegmentedControl
          size="sm"
          value={period}
          onChange={setPeriod}
          options={periods.slice(0, 4).map((p) => ({ value: p, label: p }))}
        />
      </PageHeader>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Target" value={nairaShort(summary.target)} icon={<TargetIcon size={16} />} />
        <StatTile
          label="Achieved"
          value={nairaShort(summary.achieved)}
          tone={summary.achieved >= summary.target ? 'good' : 'warning'}
        />
        <StatTile
          label="Attainment"
          value={summary.target ? percent((summary.achieved / summary.target) * 100) : '—'}
          tone={summary.target && summary.achieved / summary.target >= 1 ? 'good' : 'brand'}
        />
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<TargetIcon size={22} />}
          title="No target set for this period"
          description={
            canSet
              ? 'Set one per rep, per distributor or per product line, and it is measured against sell-out automatically.'
              : 'An administrator sets targets per rep, per distributor or per product line.'
          }
          action={
            canSet ? (
              <Button icon={<Plus size={16} />} onClick={() => setEditing({ period, ownerType: 'distributor' })}>
                Set a target
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-hairline surface-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-primary">{row.ownerName}</p>
                  <p className="text-[12px] capitalize text-muted">{row.ownerType}</p>
                </div>
                <Badge
                  tone={row.progress >= 100 ? 'good' : row.progress >= 75 ? 'gold' : 'critical'}
                >
                  {percent(row.progress)}
                </Badge>
              </div>

              <ProgressBar
                className="mt-3"
                value={Math.min(100, row.progress)}
                tone={row.progress >= 100 ? 'good' : row.progress >= 75 ? 'gold' : 'critical'}
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="tabular text-[12.5px] text-muted">
                  {naira(row.achieved)} of {naira(row.value)}
                </p>

                {canSet && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Pencil size={14} />}
                      onClick={() => setEditing(row)}
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      aria-label={`Remove ${row.ownerName}'s target`}
                      onClick={() => setRemoving(row)}
                      className="tap flex items-center justify-center rounded-lg text-muted transition-colors hover:text-status-critical"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <TargetModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
          toast.success('Target saved');
        }}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove this target?"
        message="A target is a plan rather than a record of something that happened, so removing it leaves nothing dangling — it simply stops appearing on scorecards."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={async () => {
          if (!removing || !user) return;
          await removeTarget(removing.id, user);
          setRemoving(null);
          reload();
          toast.success('Target removed');
        }}
      />
    </div>
  );
}

/**
 * Setting a target.
 *
 * The owner picker changes shape with the owner type, because "who carries this
 * number" is a rep, a distributor or a product line and those are three
 * different lists. Storing the name alongside the id is the usual snapshot: a
 * rep who leaves still has to appear on last quarter's scorecard.
 */
function TargetModal({
  target,
  onClose,
  onSaved,
}: {
  target: Partial<Target> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { distributors, products } = useOrg();
  const toast = useToast();

  const [ownerType, setOwnerType] = useState<Target['ownerType']>('distributor');
  const [ownerId, setOwnerId] = useState('');
  const [value, setValue] = useState('');
  const [period, setPeriod] = useState(monthKey());
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState<string | undefined>(undefined);

  const { data: members } = useAsyncMembers(
    () => (user && isAdmin(user.role) ? listMembers() : Promise.resolve([] as Awaited<ReturnType<typeof listMembers>>)),
    [user?.role],
  );

  if (target && target.id !== seed) {
    setSeed(target.id);
    setOwnerType(target.ownerType ?? 'distributor');
    setOwnerId(target.ownerId ?? '');
    setValue(target.value ? String(target.value) : '');
    setPeriod(target.period ?? monthKey());
  }

  if (!target) return null;

  const owners =
    ownerType === 'distributor'
      ? distributors.map((d) => ({ id: d.id, name: d.company }))
      : ownerType === 'rep'
        ? (members ?? [])
            .filter((m) => m.role === 'sales_rep' || m.role === 'staff')
            .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` }))
        : products.map((p) => ({ id: p.id, name: p.name }));

  const save = async () => {
    const amount = Number(value);
    const owner = owners.find((o) => o.id === ownerId);
    if (!user || !owner || !(amount > 0)) {
      toast.warning('Missing something', 'A target needs an owner and a figure above zero.');
      return;
    }
    setBusy(true);
    try {
      await saveTarget(
        { id: target.id, ownerType, ownerId: owner.id, ownerName: owner.name, period, value: amount },
        user,
      );
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
      title={target.id ? 'Edit target' : 'Set a target'}
      description="Measured against sell-out, not sell-in. Stock sitting in a distributor's warehouse has not been sold."
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
        <Field label="Who carries it" required>
          <Select
            value={ownerType}
            onChange={(e) => {
              setOwnerType(e.target.value as Target['ownerType']);
              /* The old id belongs to the old list. Keeping it would attach the
                 target to whatever happens to share that id. */
              setOwnerId('');
            }}
          >
            <option value="distributor">A distributor</option>
            <option value="rep">A sales rep</option>
            <option value="product">A product line</option>
          </Select>
        </Field>

        <Field label="Name" required>
          <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Choose…</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Period" required hint="YYYY-MM">
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" />
          </Field>
          <Field label="Target" required>
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              leading={<span className="text-[13px]">₦</span>}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
