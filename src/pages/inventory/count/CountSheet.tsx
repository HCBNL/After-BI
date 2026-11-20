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
import { Badge, Button, Field, Input, Modal, Select, useToast } from '@/components/ui';
import { locationLabel, parseLocation, rowsTo, sectionsOf } from '@/lib/locations';
import { ProductShot } from '@/components/catalogue/ProductShot';
import { useAuth } from '@/context/AuthContext';
import { addCountEntry, updateCountEntry, voidCountEntry } from '@/lib/db';
import { displayCode } from '@/lib/countCode';
import { countUnit, packLabel, piecesLabel, piecesOf, unitSingular, unitTitle, unitWord } from '@/lib/packs';
import { entryPieces } from '@/lib/variance';
import { count, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { CountEntry, Product, StockCount, Warehouse } from '@/types';

export function CountSheet({
  count: stockCount,
  warehouse,
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
  /** The depot being counted: its sections and rows are what the counter picks from. */
  warehouse?: Warehouse;
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
  /* Always cartons and loose pieces, whatever the product's stock is kept in. */
  const cu = product ? countUnit(product) : 'Per carton';

  const mine = useMemo(() => entries.filter((e) => product && e.productId === product.id), [entries, product]);
  const live = mine.filter((e) => !e.void);
  const totalPieces = live.reduce((n, e) => n + entryPieces(e), 0);

  const sections = useMemo(() => sectionsOf(warehouse), [warehouse]);

  const [editing, setEditing] = useState<CountEntry | null>(null);
  /* Section number and row letter, as strings for the dropdowns; '' until chosen. */
  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const placeFrom = (label: string) => {
    const p = parseLocation(label);
    const ok = p && p.section <= sections.length && rowsTo(sections[p.section - 1]).includes(p.row);
    setSection(ok ? String(p!.section) : '');
    setRow(ok ? p!.row : '');
  };
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
    placeFrom(lastLocation);
    setLines('');
    setPerLine('');
    setExtra('');
    setLoose('');
    window.setTimeout(() => firstField.current?.focus({ preventScroll: true }), 120);
  }, [productId, lastLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) return null;

  const n = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const formPieces = (n(lines) * n(perLine) + n(extra)) * per + (per > 1 ? n(loose) : 0);
  const typedSomething = [lines, perLine, extra, loose].some((v) => v.trim() !== '');
  const halfLine = (lines.trim() !== '') !== (perLine.trim() !== '');

  const startEdit = (e: CountEntry) => {
    setEditing(e);
    placeFrom(e.location);
    setLines(e.lines ? String(e.lines) : '');
    setPerLine(e.perLine ? String(e.perLine) : '');
    setExtra(e.extra ? String(e.extra) : '');
    setLoose(e.loose ? String(e.loose) : '');
  };

  const save = async (next: boolean) => {
    if (!user) return;
    if (!section || !row) {
      toast.warning('Where is it?', 'Choose the section, then the row this stack is in.');
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
      location: locationLabel(Number(section), row),
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
      toast.success(editing ? 'Stack corrected' : `${input.location}: ${packLabel(formPieces, per, cu)}`);
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
  const big = unitTitle(cu);

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={product.name}
      description={product.packSize || (per > 1 ? `${count(per)} units per ${unitSingular(cu)}` : undefined)}
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
            <p className="tabular text-headline font-bold text-primary">{packLabel(totalPieces, per, cu)}</p>
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
                      <span className="ml-2 font-normal text-muted">{formula(e, cu)}</span>
                    </p>
                    <p className="text-caption text-muted">
                      {e.void ? `Struck out by ${e.voidedBy ?? 'someone'}` : `${e.countedByName} · ${formatDateTime(e.createdAt)}`}
                    </p>
                  </div>
                  <span className={cn('tabular shrink-0 text-label font-bold text-primary', e.void && 'line-through')}>{packLabel(p, e.piecesPerUnit, cu)}</span>
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
                <Button size="sm" variant="ghost" icon={<Undo2 size={14} />} onClick={() => { setEditing(null); setLines(''); setPerLine(''); setExtra(''); setLoose(''); placeFrom(lastLocation); }}>
                  Stop correcting
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Section" required>
                <Select
                  value={section}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSection(next);
                    /* A row the new section does not have is cleared, not kept. */
                    if (next && row && !rowsTo(sections[Number(next) - 1]).includes(row)) setRow('');
                  }}
                  aria-label="Section"
                >
                  <option value="">Choose…</option>
                  {sections.map((_, i) => (
                    <option key={i} value={String(i + 1)}>
                      {`Section ${i + 1}`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Row" required>
                <Select value={row} onChange={(e) => setRow(e.target.value)} disabled={!section} aria-label="Row">
                  <option value="">{section ? 'Choose…' : 'Section first'}</option>
                  {(section ? rowsTo(sections[Number(section) - 1]) : []).map((l) => (
                    <option key={l} value={l}>
                      {`Row ${l}`}
                    </option>
                  ))}
                </Select>
              </Field>
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
              <Field label="Loose units" hint={per > 1 ? `${count(per)} make one carton` : 'Units per carton not set on the product'}>
                <Input type="number" inputMode="numeric" min={0} value={loose} onChange={(e) => setLoose(e.target.value)} placeholder="0" disabled={per <= 1} />
              </Field>
            </div>

            {per > 1 && (
              <p className="text-caption text-muted">
                {`A part carton on its own? Leave lines and ${big.toLowerCase()} empty and type only the loose units (for example 95).`}
              </p>
            )}

            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-[var(--surface-card)] px-3 py-2">
              <span className="text-caption text-muted">
                {formula({ lines: n(lines), perLine: n(perLine), extra: n(extra), loose: per > 1 ? n(loose) : 0, piecesPerUnit: per }, cu) || 'This stack'}
              </span>
              <span className="tabular text-body font-bold text-primary">
                {packLabel(formPieces, per, cu)}
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
  if (e.loose) out += `${out ? ', ' : ''}${count(e.loose)} ${e.loose === 1 ? 'unit' : 'units'}`;
  if (!out) out = `0 ${unitWord(unit)}`;
  return out;
}
