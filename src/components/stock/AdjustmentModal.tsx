/**
 * Ask for a stock balance to be corrected.
 *
 * Opened from the Stock screen (reason: Adjustment) and from a line of a
 * closed stock count's variance. Either way it only RAISES a request: the
 * balance does not move until a finance signer and an operations signer have
 * both approved it on the Stock adjustments screen. The dialog names who
 * those people are before it is sent, so nobody raises one into a void.
 */

import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { Alert, Button, Field, Input, Modal, SegmentedControl, Select, Textarea, useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { listMembers, listStock, raiseAdjustment } from '@/lib/db';
import { pickSigners, SIDE_LABEL, SIDES } from '@/lib/adjustments';
import { balanceLabel, packLabel, piecesOf, unitsToPieces, unitTitle } from '@/lib/packs';
import { warehouseScope } from '@/lib/roles';
import type { StockCount, UserProfile } from '@/types';

export interface AdjustmentPreset {
  warehouseId?: string;
  productId?: string;
  direction?: 'in' | 'out';
  /** How much, in pieces. */
  pieces?: number;
  reason?: string;
  count?: Pick<StockCount, 'id' | 'number'> | null;
}

export function AdjustmentModal({
  open,
  preset,
  onClose,
  onDone,
}: {
  open: boolean;
  preset?: AdjustmentPreset | null;
  onClose: () => void;
  onDone: (number?: string) => void;
}) {
  const { user } = useAuth();
  const { products, warehouses, defaultWarehouse } = useOrg();
  const toast = useToast();
  const allowed = warehouseScope(user);

  const [depot, setDepot] = useState('');
  const [productId, setProductId] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [units, setUnits] = useState('');
  const [pieces, setPieces] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<UserProfile[] | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const [seed, setSeed] = useState<string | null>(null);

  const product = products.find((p) => p.id === productId);
  const per = piecesOf(product);

  /* Fill from the preset each time the dialog opens. */
  const seedKey = open ? JSON.stringify(preset ?? {}) : null;
  if (seedKey !== seed) {
    setSeed(seedKey);
    if (open) {
      const p = products.find((x) => x.id === preset?.productId);
      const perP = piecesOf(p);
      const amount = Math.abs(Math.round(preset?.pieces ?? 0));
      setDepot(preset?.warehouseId ?? defaultWarehouse?.id ?? '');
      setProductId(preset?.productId ?? '');
      setDirection(preset?.direction ?? 'out');
      setUnits(amount ? String(Math.floor(amount / perP)) : '');
      setPieces(amount && perP > 1 ? String(amount % perP) : '');
      setReason(preset?.reason ?? '');
    }
  }

  useEffect(() => {
    if (!open || members) return;
    listMembers().then(setMembers).catch(() => setMembers([]));
  }, [open, members]);

  useEffect(() => {
    if (!open || !depot || !productId) {
      setHeld(null);
      return;
    }
    let live = true;
    listStock(depot)
      .then((rows) => live && setHeld(rows.find((r) => r.productId === productId)?.quantity ?? 0))
      .catch(() => live && setHeld(null));
    return () => {
      live = false;
    };
  }, [open, depot, productId]);

  const signers = useMemo(() => (user && members ? pickSigners(members, user.id) : null), [members, user]);

  const totalPieces = Math.max(0, Math.round(Number(units) || 0)) * per + (per > 1 ? Math.max(0, Math.round(Number(pieces) || 0)) : 0);
  const heldPieces = held === null ? null : unitsToPieces(held, per);
  const afterPieces = heldPieces === null ? null : heldPieces + (direction === 'in' ? totalPieces : -totalPieces);

  const send = async () => {
    if (!user) return;
    const warehouse = warehouses.find((w) => w.id === depot);
    if (!warehouse || !product) {
      toast.warning('Missing something', 'Choose the depot and the product.');
      return;
    }
    if (totalPieces <= 0) {
      toast.warning('How much?', 'An adjustment needs a quantity.');
      return;
    }
    if (!reason.trim()) {
      toast.warning('Why?', 'Say why the stock needs adjusting. Both signers read it.');
      return;
    }
    if (!signers) return;
    setBusy(true);
    try {
      await raiseAdjustment({
        warehouse,
        product,
        direction,
        quantity: totalPieces / per,
        reason,
        count: preset?.count ?? null,
        signers,
        actor: user,
      });
      onDone();
    } catch (err) {
      toast.error('Not sent', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stock adjustment request"
      description={preset?.count ? `From stock count ${preset.count.number}` : undefined}
      note="Nothing changes in stock when you send this. It waits for a finance manager and an operations manager to both approve it, and only the second approval moves the balance. Every step is kept on the request and in the audit log."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void send()} loading={busy} icon={<Send size={15} />} disabled={!signers}>
            Send for approval
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Depot" required>
            <Select value={depot} onChange={(e) => setDepot(e.target.value)} disabled={Boolean(preset?.count)}>
              <option value="">Choose a depot…</option>
              {warehouses
                .filter((w) => !allowed || allowed.includes(w.id))
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Product" required>
            <Select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={Boolean(preset?.count)}>
              <option value="">Choose a product…</option>
              {products
                .filter((p) => !p.service && (p.status === 'active' || p.id === productId))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>

        <Field label="Direction" required>
          <SegmentedControl
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'out', label: 'Remove from stock' },
              { value: 'in', label: 'Add to stock' },
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={unitTitle(product?.unit)} required>
            <Input type="number" inputMode="numeric" min={0} value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Loose pieces" hint={per > 1 ? `${per} make one` : 'Set pieces per carton on the product'}>
            <Input type="number" inputMode="numeric" min={0} value={pieces} onChange={(e) => setPieces(e.target.value)} placeholder="0" disabled={per <= 1} />
          </Field>
        </div>

        {product && heldPieces !== null && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-hairline surface-sunken px-4 py-3 text-label">
            <div>
              <p className="text-caption text-muted">In the system now</p>
              <p className="tabular font-bold text-primary">{balanceLabel(held ?? 0, per)}</p>
            </div>
            <div>
              <p className="text-caption text-muted">After, once approved</p>
              <p className={`tabular font-bold ${afterPieces !== null && afterPieces < 0 ? 'text-status-critical' : 'text-primary'}`}>
                {afterPieces === null ? '' : afterPieces < 0 ? 'Below zero: not possible' : packLabel(afterPieces, per, product.unit)}
              </p>
            </div>
          </div>
        )}

        <Field label="Reason" required>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Damaged in the depot, found in the count, wrong carton booked in…"
          />
        </Field>

        {signers ? (
          <div className="rounded-xl border border-hairline px-4 py-3">
            <p className="mb-1.5 text-label font-semibold text-secondary">Needs both of these to approve</p>
            <ul className="space-y-1 text-label text-primary">
              {SIDES.map((side) => (
                <li key={side}>
                  <span className="font-semibold">{SIDE_LABEL[side]}:</span>{' '}
                  {signers[side].length ? signers[side].map((s) => s.name).join(' or ') : <span className="text-status-critical">nobody can sign this side</span>}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Alert tone="info">Looking up who signs…</Alert>
        )}
      </div>
    </Modal>
  );
}
