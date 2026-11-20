/**
 * One product, opened by a scan: what has been counted for it and where, and
 * the form for the stack in front of the counter.
 *
 * HOW A STACK IS WRITTEN DOWN
 *
 *   Row E   6 lines × 25 cartons   + 2 cartons   + 12 loose pieces
 *
 * which is how it is counted on the floor: count the lines across the row,
 * the cartons in one line, then whatever is left over. AfterBI does the
 * multiplication and rolls loose pieces that make a full carton into cartons.
 * A row with nothing in it can be saved as zero: "counted, none here" is a
 * different fact from "not counted".
 *
 * BLIND, ON PURPOSE
 *
 * The figure the system holds is not shown to the counter. A counter who
 * knows the answer finds it; one who does not, counts. The variance is for
 * the managers and, once the count is closed, for everybody.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, ScanLine, Trash2, Undo2 } from 'lucide-react';
import { Badge, Button, Field, Input, Modal, useToast } from '@/components/ui';
import { ProductShot } from '@/components/catalogue/ProductShot';
import { useAuth } from '@/context/AuthContext';
import { addCountEntry, updateCountEntry, voidCountEntry } from '@/lib/db';
import { displayCode } from '@/lib/countCode';
import { packLabel, piecesLabel, piecesOf, unitSingular, unitTitle, unitWord } from '@/lib/packs';
import { entryPieces } from '@/lib/variance';
import { count, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { CountEntry, Product, StockCount } from '@/types';

const QUICK_ROWS = ['Row A', 'Row B', 'Row C', 'Row D', 'Row E', 'Row F', 'Row G', 'Row H'];

export function CountSheet({
  count: stockCount,
  product,
  entries,
  canCount,
  canManage,
  lastLocation,
  onLocation,
  onClose,
  onScanNext,
}: {
  count: StockCount;
  product: Product | null;
  entries: CountEntry[];
  canCount: boolean;
  canManage: boolean;
  lastLocation: string;
  onLocation: (location: string) => void;
  onClose: () => void;
  onScanNext: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const open = stockCount.status === 'open';
  const per = product ? piecesOf(product) : 1;

  const mine = useMemo(() => entries.filter((e) => product && e.productId === product.id), [entries, product]);
  const live = mine.filter((e) => !e.void);
  const totalPieces = live.reduce((n, e) => n + entryPieces(e), 0);

  /* Places already used in this count, most recent first: the next stack is usually in one of them. */
  const places = useMemo(() => {
    const seen: string[] = [];
    for (const e of [...entries].reverse()) if (!seen.includes(e.location)) seen.push(e.location);
    return seen.slice(0, 8);
  }, [entries]);

  const [editing, setEditing] = useState<CountEntry | null>(null);
  const [location, setLocation] = useState('');
  const [lines, setLines] = useState('');
  const [perLine, setPerLine] = useState('');
  const [extra, setExtra] = useState('');
  const [loose, setLoose] = useState('');
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  /* A fresh form each time a product opens, in the place the counter was last in. */
  const productId = product?.id;
  useEffect(() => {
    if (!productId) return;
    setEditing(null);
    setLocation(lastLocation);
    setLines('');
    setPerLine('');
    setExtra('');
    setLoose('');
    window.setTimeout(() => firstField.current?.focus({ preventScroll: true }), 120);
  }, [productId, lastLocation]);

  if (!product) return null;

  const n = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const formPieces = (n(lines) * n(perLine) + n(extra)) * per + (per > 1 ? n(loose) : 0);
  const typedSomething = [lines, perLine, extra, loose].some((v) => v.trim() !== '');
  const halfLine = (lines.trim() !== '') !== (perLine.trim() !== '');

  const startEdit = (e: CountEntry) => {
    setEditing(e);
    setLocation(e.location);
    setLines(e.lines ? String(e.lines) : '');
    setPerLine(e.perLine ? String(e.perLine) : '');
    setExtra(e.extra ? String(e.extra) : '');
    setLoose(e.loose ? String(e.loose) : '');
  };

  const save = async (next: boolean) => {
    if (!user) return;
    if (!location.trim()) {
      toast.warning('Where is it?', 'Say which row or place this stack is in.');
      return;
    }
    if (halfLine) {
      toast.warning('Lines and cartons go together', 'Fill both: how many lines, and how many cartons in each line.');
      return;
    }
    if (!typedSomething) {
      toast.warning('Nothing counted', 'Type what you counted. If this place is empty, type 0 in extra cartons.');
      return;
    }
    const input = {
      productId: product.id,
      productName: product.name,
      location: location.trim(),
      lines: n(lines),
      perLine: n(perLine),
      extra: n(extra),
      loose: per > 1 ? n(loose) : 0,
      piecesPerUnit: per,
    };
    setBusy(true);
    try {
      if (editing) await updateCountEntry(stockCount.id, editing.id, input);
      else await addCountEntry(stockCount.id, input, user);
      onLocation(input.location);
      toast.success(editing ? 'Stack corrected' : `${input.location}: ${packLabel(formPieces, per, product.unit)}`);
      setEditing(null);
      setLines('');
      setPerLine('');
      setExtra('');
      setLoose('');
      if (next) onScanNext();
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const strike = async (e: CountEntry) => {
    if (!user) return;
    try {
      await voidCountEntry(stockCount.id, e.id, user);
      toast.success('Stack struck out', 'It no longer counts towards the total.');
    } catch (err) {
      toast.error('Not changed', err instanceof Error ? err.message : undefined);
    }
  };

  const mayChange = (e: CountEntry) => open && !e.void && (canManage || e.countedBy === user?.id);
  const big = unitTitle(product.unit);

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={product.name}
      description={[product.packSize, per > 1 ? `${count(per)} pcs per ${unitSingular(product.unit)}` : null].filter(Boolean).join(' · ') || undefined}
      footer={
        open && canCount ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Done
            </Button>
            <Button variant="outline" onClick={() => void save(false)} loading={busy && !editing}>
              {editing ? 'Save correction' : 'Save'}
            </Button>
            {!editing && (
              <Button onClick={() => void save(true)} loading={busy} icon={<ScanLine size={15} />}>
                Save, scan next
              </Button>
            )}
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductShot src={product.imageUrl} alt="" width={56} className="h-14 w-14 shrink-0 border border-hairline" rounded="rounded-xl" imgClassName="p-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-caption text-muted">Counted so far, every row</p>
            <p className="tabular text-headline font-bold text-primary">{packLabel(totalPieces, per, product.unit)}</p>
            {per > 1 && <p className="tabular text-caption text-muted">{piecesLabel(totalPieces)}</p>}
          </div>
          {product.countCode && (
            <span className="notranslate hidden font-mono text-caption tracking-[0.1em] text-muted sm:block" translate="no">
              {displayCode(product.countCode)}
            </span>
          )}
        </div>

        {mine.length > 0 && (
          <ul className="divide-y divide-[var(--border-hairline)] rounded-xl border border-hairline">
            {mine.map((e) => {
              const p = entryPieces(e);
              return (
                <li key={e.id} className={cn('flex items-center gap-3 px-3 py-2.5', e.void && 'opacity-55')}>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-label font-semibold text-primary', e.void && 'line-through')}>
                      {e.location}
                      <span className="ml-2 font-normal text-muted">{formula(e, product.unit)}</span>
                    </p>
                    <p className="text-caption text-muted">
                      {e.void ? `Struck out by ${e.voidedBy ?? 'someone'}` : `${e.countedByName} · ${formatDateTime(e.createdAt)}`}
                    </p>
                  </div>
                  <span className={cn('tabular shrink-0 text-label font-bold text-primary', e.void && 'line-through')}>{packLabel(p, e.piecesPerUnit, product.unit)}</span>
                  {mayChange(e) && (
                    <div className="flex shrink-0">
                      <Button size="sm" variant="ghost" aria-label="Correct this stack" onClick={() => startEdit(e)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label="Strike out this stack" onClick={() => void strike(e)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {open && canCount ? (
          <div className="space-y-3 rounded-xl border border-hairline surface-sunken p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label font-semibold text-secondary">{editing ? `Correcting ${editing.location}` : 'Add a stack'}</p>
              {editing && (
                <Button size="sm" variant="ghost" icon={<Undo2 size={14} />} onClick={() => { setEditing(null); setLines(''); setPerLine(''); setExtra(''); setLoose(''); setLocation(lastLocation); }}>
                  Stop correcting
                </Button>
              )}
            </div>

            <Field label="Row or place" required>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Row E" autoCapitalize="words" />
            </Field>
            <div className="-mt-1 flex flex-wrap gap-1.5">
              {[...places, ...QUICK_ROWS.filter((r) => !places.includes(r))].slice(0, 10).map((place) => (
                <button
                  key={place}
                  type="button"
                  onClick={() => setLocation(place)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-caption font-semibold',
                    place === location ? 'border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-900/40 dark:text-brand-100' : 'border-hairline text-secondary',
                  )}
                >
                  {place}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Lines (stacks)">
                <Input ref={firstField} type="number" inputMode="numeric" min={0} value={lines} onChange={(e) => setLines(e.target.value)} placeholder="6" />
              </Field>
              <Field label={`${big} per line`}>
                <Input type="number" inputMode="numeric" min={0} value={perLine} onChange={(e) => setPerLine(e.target.value)} placeholder="25" />
              </Field>
              <Field label={`Extra ${big.toLowerCase()}`} hint="Part line, on top">
                <Input type="number" inputMode="numeric" min={0} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Loose pieces" hint={per > 1 ? `${count(per)} make one` : 'Pieces per carton not set'}>
                <Input type="number" inputMode="numeric" min={0} value={loose} onChange={(e) => setLoose(e.target.value)} placeholder="0" disabled={per <= 1} />
              </Field>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-[var(--surface-card)] px-3 py-2">
              <span className="text-caption text-muted">
                {formula({ lines: n(lines), perLine: n(perLine), extra: n(extra), loose: per > 1 ? n(loose) : 0, piecesPerUnit: per }, product.unit) || 'This stack'}
              </span>
              <span className="tabular text-body font-bold text-primary">
                {packLabel(formPieces, per, product.unit)}
                {per > 1 && <span className="ml-2 text-caption font-normal text-muted">{piecesLabel(formPieces)}</span>}
              </span>
            </div>
          </div>
        ) : (
          <Badge tone="neutral">{open ? 'You can look but not count in this depot' : 'This count is closed. Nothing in it can change.'}</Badge>
        )}
      </div>
    </Modal>
  );
}

/** "6 × 25 + 2 ctn, 12 pcs": how a stack was made up. */
export function formula(e: Pick<CountEntry, 'lines' | 'perLine' | 'extra' | 'loose' | 'piecesPerUnit'>, unit?: string): string {
  const parts: string[] = [];
  if (e.lines || e.perLine) parts.push(`${count(e.lines)} × ${count(e.perLine)}`);
  if (e.extra) parts.push(parts.length ? `+ ${count(e.extra)}` : count(e.extra));
  let out = parts.length ? `${parts.join(' ')} ${unitWord(unit)}` : '';
  if (e.loose) out += `${out ? ', ' : ''}${count(e.loose)} pcs`;
  if (!out) out = `0 ${unitWord(unit)}`;
  return out;
}
