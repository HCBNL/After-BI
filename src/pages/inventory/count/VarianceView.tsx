/**
 * The variance: what the system held against what was counted, line by line.
 *
 * Problems are red and come first: short, over, not counted, counted but not
 * in the system. A product that moved in or out of the depot while the count
 * was running carries a note, because its variance may be the movement and
 * not a loss.
 *
 * It changes nothing. From a closed count a line can be turned into a stock
 * adjustment request, which still has to be approved by finance and
 * operations before any balance moves.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FilePlus2 } from 'lucide-react';
import { Badge, Button, EmptyState, SegmentedControl } from '@/components/ui';
import { LINE_LABEL, isIssue, type VarianceLine } from '@/lib/variance';
import { packLabel, piecesLabel } from '@/lib/packs';
import { count } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface Moved {
  inUnits: number;
  outUnits: number;
}

export function VarianceView({
  lines,
  moved,
  onAdjust,
  live,
}: {
  lines: VarianceLine[];
  moved: Map<string, Moved>;
  /** Present when the viewer may raise an adjustment from a line. */
  onAdjust?: (line: VarianceLine) => void;
  /** The count is still open: figures will change. */
  live: boolean;
}) {
  const [view, setView] = useState<'issues' | 'all'>('issues');
  const issues = lines.filter(isIssue);
  const shown = view === 'issues' ? issues : lines;

  const tiles = useMemo(
    () => [
      { label: 'Lines', value: lines.length, tone: 'neutral' as const },
      { label: 'Matched', value: lines.filter((l) => l.state === 'matched').length, tone: 'good' as const },
      { label: 'Short', value: lines.filter((l) => l.state === 'short').length, tone: 'bad' as const },
      { label: 'Over', value: lines.filter((l) => l.state === 'over').length, tone: 'bad' as const },
      { label: 'Not counted', value: lines.filter((l) => l.state === 'notCounted').length, tone: 'bad' as const },
      { label: 'Not in system', value: lines.filter((l) => l.state === 'notInSystem').length, tone: 'bad' as const },
    ],
    [lines],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={cn(
              'rounded-xl border px-3 py-2.5',
              t.tone === 'bad' && t.value > 0
                ? 'border-[#d03b3b]/35 bg-[#d03b3b]/8 text-[#a52929] dark:text-[#f08080]'
                : 'border-hairline surface-card text-primary',
            )}
          >
            <p className="text-caption opacity-80">{t.label}</p>
            <p className="tabular text-title font-bold">{count(t.value)}</p>
          </div>
        ))}
      </div>

      {live && (
        <p className="text-caption text-muted">
          The count is still open, so these figures change as counters save. Not counted means nobody has counted it yet.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'issues', label: issues.length ? `Variances (${issues.length})` : 'Variances' },
            { value: 'all', label: 'Every line' },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={22} />}
          title={lines.length ? 'Every line matches' : 'Nothing to compare yet'}
          description={lines.length ? 'What was counted is exactly what the system held.' : 'Scan and count a product and it appears here.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hairline surface-card shadow-card">
          <div className="hidden grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_minmax(0,1.35fr)] gap-3 border-b border-hairline px-4 py-2.5 text-caption font-semibold uppercase tracking-[0.06em] text-muted md:grid">
            <span>Product</span>
            <span className="text-right">System</span>
            <span className="text-right">Counted</span>
            <span className="text-right">Variance</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-[var(--border-hairline)]">
            {shown.map((l) => {
              const bad = isIssue(l);
              const m = moved.get(l.productId);
              return (
                <li
                  key={l.productId}
                  className={cn(
                    'grid grid-cols-2 gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_minmax(0,1.35fr)] md:items-center',
                    bad && 'bg-[#d03b3b]/[0.06]',
                  )}
                >
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <p className={cn('truncate text-body font-semibold', bad ? 'text-[#a52929] dark:text-[#f08080]' : 'text-primary')}>{l.productName}</p>
                    <p className="text-caption text-muted">
                      {l.places ? (l.places === 1 ? 'Counted in 1 place' : `Counted in ${l.places} places`) : 'Not counted'}
                      {m && (m.inUnits || m.outUnits) ? (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[#8a6100] dark:text-[#fab219]">
                          <AlertTriangle size={11} aria-hidden />
                          {`Moved during the count: ${count(m.inUnits)} in, ${count(m.outUnits)} out`}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <Figure label="System" value={packLabel(l.systemPieces, l.piecesPerUnit, l.unit)} sub={sub(l.systemPieces, l.piecesPerUnit)} />
                  <Figure label="Counted" value={l.state === 'notCounted' ? 'None' : packLabel(l.countedPieces, l.piecesPerUnit, l.unit)} sub={l.state !== 'notCounted' ? sub(l.countedPieces, l.piecesPerUnit) : undefined} />
                  <Figure
                    label="Variance"
                    strong
                    bad={bad}
                    value={l.variancePieces === 0 ? '0' : packLabel(l.variancePieces, l.piecesPerUnit, l.unit, true)}
                    sub={sub(l.variancePieces, l.piecesPerUnit, true)}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Badge tone={bad ? 'critical' : 'good'} className="whitespace-nowrap">{LINE_LABEL[l.state]}</Badge>
                    {onAdjust && bad && l.variancePieces !== 0 && (
                      <Button size="sm" variant="ghost" aria-label={`Raise an adjustment for ${l.productName}`} icon={<FilePlus2 size={14} />} onClick={() => onAdjust(l)}>
                        <span className="hidden lg:inline">Adjust</span>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The same figure in pieces, only when the main line shows cartons (otherwise it says the same thing twice). */
function sub(pieces: number, per: number, signed = false): string | undefined {
  return per > 1 && Math.abs(pieces) >= per ? piecesLabel(pieces, signed) : undefined;
}

function Figure({ label, value, sub, strong, bad }: { label: string; value: string; sub?: string; strong?: boolean; bad?: boolean }) {
  return (
    <div className="text-left md:text-right">
      <p className="text-caption text-muted md:hidden">{label}</p>
      <p className={cn('tabular text-label', strong ? 'font-bold' : 'font-semibold', bad ? 'text-[#a52929] dark:text-[#f08080]' : 'text-primary')}>{value}</p>
      {sub && <p className={cn('tabular text-caption', bad ? 'text-[#a52929]/80 dark:text-[#f08080]/80' : 'text-muted')}>{sub}</p>}
    </div>
  );
}
