/**
 * Stock adjustments: corrections to a stock balance, and their two signatures.
 *
 * Nothing on this screen moves stock until BOTH a finance signer and an
 * operations signer have approved. The second approval applies it, in the
 * same transaction that writes the movement to the ledger. A request can be
 * declined by either side, or taken back by whoever raised it, until then.
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileMinus2, FilePlus2, Plus, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, EmptyState, Field, Modal, SegmentedControl, Textarea, useToast } from '@/components/ui';
import { AdjustmentModal } from '@/components/stock/AdjustmentModal';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { cancelAdjustment, declineAdjustment, listAdjustments, signAdjustment } from '@/lib/db';
import { ADJUSTMENT_RAISERS, SIDE_LABEL, SIDES, sidesToSign, waitingLine } from '@/lib/adjustments';
import { packLabel, unitsToPieces } from '@/lib/packs';
import { formatDateTime } from '@/lib/format';
import { warehouseScope } from '@/lib/roles';
import { PORTAL_ROOT } from '@/lib/tiles';
import { cn } from '@/lib/cn';
import type { StockAdjustment } from '@/types';

const STATUS_LABEL: Record<StockAdjustment['status'], string> = {
  pending: 'Waiting',
  applied: 'Applied',
  declined: 'Declined',
  cancelled: 'Taken back',
};

export default function AdjustmentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [view, setView] = useState<'waiting' | 'all'>('waiting');
  const [raising, setRaising] = useState(false);
  const [open, setOpen] = useState<StockAdjustment | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useAsync(() => listAdjustments(300), [], { handleError: true });
  const allowed = warehouseScope(user);
  const mineOnly = useMemo(() => (data ?? []).filter((a) => !allowed || allowed.includes(a.warehouseId)), [data, allowed]);
  const waiting = mineOnly.filter((a) => a.status === 'pending');
  const rows = view === 'waiting' ? waiting : mineOnly;
  const canRaise = Boolean(user && ADJUSTMENT_RAISERS.includes(user.role) && (!allowed || allowed.length));
  const root = user ? PORTAL_ROOT[user.role] : '';

  const sign = async (adj: StockAdjustment) => {
    if (!user) return;
    setBusy(true);
    try {
      const outcome = await signAdjustment(adj.id, sidesToSign(adj, user.id, user.role), user);
      toast.success(outcome === 'applied' ? `${adj.number} applied` : `${adj.number} signed`, outcome === 'applied' ? 'Both sides approved. The stock balance has moved and the ledger has the movement.' : 'It now waits for the other side.');
      setOpen(null);
      reload();
    } catch (err) {
      toast.error('Not signed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!user || !open) return;
    setBusy(true);
    try {
      await declineAdjustment(open.id, reason, user);
      toast.success(`${open.number} declined`, 'Stock is unchanged.');
      setDeclining(false);
      setOpen(null);
      reload();
    } catch (err) {
      toast.error('Not declined', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const takeBack = async (adj: StockAdjustment) => {
    setBusy(true);
    try {
      await cancelAdjustment(adj.id);
      toast.success(`${adj.number} taken back`);
      setOpen(null);
      reload();
    } catch (err) {
      toast.error('Not changed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const amount = (a: StockAdjustment) => packLabel(unitsToPieces(a.quantity, a.piecesPerUnit), a.piecesPerUnit, a.unit);

  return (
    <div>
      <PageHeader
        title="Stock adjustments"
        description="Corrections to a stock balance. Each one needs a finance approval AND an operations approval; the second one moves the stock. Until then the balance is untouched."
        actions={
          canRaise && (
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setRaising(true)}>
              New request
            </Button>
          )
        }
      >
        <SegmentedControl
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'waiting', label: waiting.length ? `Waiting (${waiting.length})` : 'Waiting' },
            { value: 'all', label: 'Everything' },
          ]}
        />
      </PageHeader>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={22} />}
          title={view === 'waiting' ? 'Nothing waiting' : 'No adjustments yet'}
          description="A request appears here when someone asks for a stock balance to be corrected, for example after a stock count."
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((a) => {
            const mine = user ? sidesToSign(a, user.id, user.role) : [];
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setOpen(a)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-hairline surface-card p-4 text-left shadow-card transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      a.direction === 'out' ? 'bg-[#d03b3b]/10 text-[#a52929] dark:text-[#f08080]' : 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
                    )}
                  >
                    {a.direction === 'out' ? <FileMinus2 size={18} aria-hidden /> : <FilePlus2 size={18} aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="tabular text-body font-bold text-primary">{a.number}</p>
                      <p className="truncate text-label text-secondary">{`${a.productName} · ${a.warehouseName}`}</p>
                    </div>
                    <p className="mt-0.5 text-label text-primary">
                      <span className="font-semibold">{a.direction === 'out' ? 'Remove ' : 'Add '}</span>
                      <span className="tabular">{amount(a)}</span>
                      {a.countNumber ? <span className="text-muted">{` · from ${a.countNumber}`}</span> : null}
                    </p>
                    <p className="mt-0.5 truncate text-caption text-muted">{`${a.requestedByName}, ${formatDateTime(a.createdAt)}: ${a.reason}`}</p>
                    {a.status === 'pending' && <p className="mt-1 text-caption font-semibold text-secondary">{waitingLine(a)}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={a.status === 'applied' ? 'good' : a.status === 'pending' ? 'gold' : 'neutral'}>{STATUS_LABEL[a.status]}</Badge>
                    {mine.length > 0 && <p className="mt-1 text-caption font-semibold text-brand-700 dark:text-brand-300">Awaiting you</p>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(open) && !declining}
        onClose={() => setOpen(null)}
        title={open?.number}
        description={open ? `${open.productName} · ${open.warehouseName}` : undefined}
        footer={
          open && user ? (
            <>
              {open.status === 'pending' && open.requestedBy === user.id && (
                <Button variant="ghost" className="mr-auto" disabled={busy} onClick={() => void takeBack(open)}>
                  Take back
                </Button>
              )}
              <Button variant="ghost" onClick={() => setOpen(null)} disabled={busy}>
                Close
              </Button>
              {open.status === 'pending' && open.signerIds?.includes(user.id) && sidesToSign(open, user.id, user.role).length > 0 && (
                <>
                  <Button variant="outline" icon={<XCircle size={15} />} disabled={busy} onClick={() => { setReason(''); setDeclining(true); }}>
                    Decline
                  </Button>
                  <Button icon={<CheckCircle2 size={15} />} loading={busy} onClick={() => void sign(open)}>
                    {`Approve for ${sidesToSign(open, user.id, user.role).map((s) => SIDE_LABEL[s]).join(' and ')}`}
                  </Button>
                </>
              )}
            </>
          ) : null
        }
      >
        {open && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-hairline surface-sunken px-4 py-3">
              <div>
                <p className="text-caption text-muted">{open.direction === 'out' ? 'Remove from stock' : 'Add to stock'}</p>
                <p className="tabular text-lead font-bold text-primary">{amount(open)}</p>
              </div>
              <div>
                <p className="text-caption text-muted">Status</p>
                <p className="text-lead font-bold text-primary">{STATUS_LABEL[open.status]}</p>
                {open.status === 'applied' && typeof open.balanceAfter === 'number' && (
                  <p className="tabular text-caption text-muted">{`Balance after: ${packLabel(unitsToPieces(open.balanceAfter, open.piecesPerUnit), open.piecesPerUnit, open.unit)}`}</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-caption text-muted">Reason</p>
              <p className="whitespace-pre-line text-body text-primary">{open.reason}</p>
              <p className="mt-1 text-caption text-muted">{`Raised by ${open.requestedByName}, ${formatDateTime(open.createdAt)}`}</p>
              {open.countId && (
                <Link to={`${root}/stock-count?c=${open.countId}`} className="mt-1 inline-block text-caption font-semibold text-brand-700 underline dark:text-brand-300">
                  {`Open stock count ${open.countNumber ?? ''}`}
                </Link>
              )}
            </div>
            <ul className="divide-y divide-[var(--border-hairline)] rounded-xl border border-hairline">
              {SIDES.map((side) => {
                const sig = open.signatures?.[side];
                return (
                  <li key={side} className="flex items-start gap-3 px-4 py-3">
                    {sig ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#0a7a0a] dark:text-[#4ec54e]" /> : <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[var(--border-strong)]" />}
                    <div className="min-w-0">
                      <p className="text-label font-semibold text-primary">{SIDE_LABEL[side]}</p>
                      <p className="text-caption text-muted">
                        {sig
                          ? `Approved by ${sig.name}, ${formatDateTime(sig.at)}`
                          : open.status === 'pending'
                            ? `Waiting for ${(open.signers?.[side] ?? []).map((s) => s.name).join(' or ') || 'a signer'}`
                            : 'Not signed'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {open.status === 'declined' && (
              <p className="text-label text-status-critical">{`Declined by ${open.declinedByName ?? ''}: ${open.declineReason ?? ''}`}</p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={declining}
        onClose={() => setDeclining(false)}
        title={`Decline ${open?.number ?? ''}?`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeclining(false)} disabled={busy}>
              Back
            </Button>
            <Button variant="danger" loading={busy} disabled={!reason.trim()} onClick={() => void decline()}>
              Decline
            </Button>
          </>
        }
      >
        <Field label="Why" required>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Recount Row E first, figures do not agree with the waybill…" />
        </Field>
        <p className="mt-2 text-caption text-muted">Stock stays as it is. The person who raised it sees your reason.</p>
      </Modal>

      <AdjustmentModal
        open={raising}
        onClose={() => setRaising(false)}
        onDone={() => {
          setRaising(false);
          reload();
          toast.success('Sent for approval', 'Finance and operations both have to approve it before stock changes.');
        }}
      />
    </div>
  );
}
