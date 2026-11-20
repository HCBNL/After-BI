/**
 * Stock count: physical counts of a depot, scanned carton by carton.
 *
 * HOW IT RUNS
 *
 *   1. A manager starts a count for one depot. AfterBI notes what the system
 *      holds there at that moment: the figure the count is measured against.
 *   2. Counters scan the AfterBI sticker on a carton (Stickers prints them).
 *      The product opens; they type the stack: row, lines, cartons per line,
 *      extra cartons, loose pieces. Several counters can work at once.
 *   3. The manager closes the count. The variance shows every line: matched,
 *      short, over, not counted, not in the system. Problems are red.
 *
 * A COUNT NEVER CHANGES STOCK. It is a report. A correction is a stock
 * adjustment, which a finance manager and an operations manager must both
 * approve before any balance moves.
 *
 * `?c=<count id>` opens one count; without it, the list.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Play, RefreshCw } from 'lucide-react';
import { QuietLoader } from '@/components/brand/Loader';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Badge, Button, EmptyState, Field, Modal, Select, Textarea, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { listCounts, startCount } from '@/lib/db';
import { warehouseScope } from '@/lib/roles';
import { count, formatDateTime } from '@/lib/format';
import { CountSession, COUNT_MANAGERS } from './count/CountSession';

export default function StockCountPage() {
  const [params, setParams] = useSearchParams();
  const countId = params.get('c');

  if (countId) {
    return (
      <CountSession
        countId={countId}
        onBack={() => {
          const next = new URLSearchParams(params);
          next.delete('c');
          setParams(next);
        }}
      />
    );
  }
  return <CountList onOpen={(id) => setParams({ c: id })} />;
}

function CountList({ onOpen }: { onOpen: (id: string) => void }) {
  const { user } = useAuth();
  const { warehouses, defaultWarehouse, products } = useOrg();
  const toast = useToast();
  const allowed = warehouseScope(user);
  const [depot, setDepot] = useState('');
  const [starting, setStarting] = useState(false);
  const [startDepot, setStartDepot] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const canStart = Boolean(user && COUNT_MANAGERS.includes(user.role) && (!allowed || allowed.length > 0));
  const myDepots = warehouses.filter((w) => !allowed || allowed.includes(w.id));

  const { data, loading, error, reload } = useAsync(() => listCounts(allowed), [allowed], { handleError: true });

  const rows = useMemo(() => (data ?? []).filter((c) => !depot || c.warehouseId === depot), [data, depot]);

  const start = async () => {
    if (!user) return;
    const warehouse = warehouses.find((w) => w.id === startDepot);
    if (!warehouse) {
      toast.warning('Which depot?', 'Choose the depot you are counting.');
      return;
    }
    setBusy(true);
    try {
      const id = await startCount({ warehouse, note, actor: user, products });
      setStarting(false);
      onOpen(id);
    } catch (err) {
      toast.error('Not started', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock count"
        description="Count a depot by scanning the AfterBI sticker on each carton. A count is a report: it never changes stock. Its variance shows what the system held against what was found."
        actions={
          canStart && (
            <Button
              size="sm"
              icon={<Play size={15} />}
              onClick={() => {
                setStartDepot(myDepots.length === 1 ? myDepots[0].id : (defaultWarehouse && myDepots.some((w) => w.id === defaultWarehouse.id) ? defaultWarehouse.id : ''));
                setNote('');
                setStarting(true);
              }}
            >
              Start a count
            </Button>
          )
        }
      >
        {myDepots.length > 1 && (
          <Select value={depot} onChange={(e) => setDepot(e.target.value)} className="max-w-[240px]" aria-label="Depot">
            <option value="">Every depot</option>
            {myDepots.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        )}
      </PageHeader>

      {loading && !data ? (
        <QuietLoader inline label="Loading stock counts" />
      ) : error && !data ? (
        <Alert tone="warning" title="Stock counts could not be loaded" defaultOpen>
          <p>{error.message}</p>
          <Button size="sm" variant="secondary" className="mt-3" icon={<RefreshCw size={14} />} onClick={reload}>
            Try again
          </Button>
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={22} />}
          title="No counts yet"
          description={canStart ? 'Start a count, then scan the stickers on the cartons. Print stickers first under Stickers.' : 'Counts started by a manager appear here.'}
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((c) => {
            const s = c.summary;
            const issues = s ? s.short + s.over + s.notCounted + s.notInSystem : 0;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-hairline surface-card p-4 text-left shadow-card transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                    <ClipboardList size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="tabular text-body font-bold text-primary">{c.number}</p>
                      <p className="truncate text-label text-secondary">{c.warehouseName}</p>
                    </div>
                    <p className="mt-0.5 text-label text-muted">
                      {`Started by ${c.startedByName}, ${formatDateTime(c.startedAt)}`}
                      {c.closedAt ? ` · closed ${formatDateTime(c.closedAt)}` : ''}
                    </p>
                    {s && (
                      <p className="mt-1 text-caption text-muted">
                        {`${count(s.lines)} lines, ${count(s.matched)} matched`}
                        {issues > 0 && <span className="font-semibold text-status-critical">{`, ${count(issues)} with a variance`}</span>}
                      </p>
                    )}
                  </div>
                  <Badge tone={c.status === 'open' ? 'info' : c.status === 'closed' ? (issues ? 'critical' : 'good') : 'neutral'}>
                    {c.status === 'open' ? 'Counting' : c.status === 'closed' ? 'Closed' : 'Cancelled'}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={starting}
        onClose={() => setStarting(false)}
        title="Start a stock count"
        size="sm"
        note="AfterBI notes what the system holds in this depot right now; the count is measured against that. Counters will not see the system's figures while they count. Only one count can be open in a depot at a time."
        footer={
          <>
            <Button variant="ghost" onClick={() => setStarting(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void start()} loading={busy} icon={<Play size={15} />}>
              Start
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Depot" required>
            <Select value={startDepot} onChange={(e) => setStartDepot(e.target.value)}>
              <option value="">Choose a depot…</option>
              {myDepots.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note" hint="Optional">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Month end count, Rows A to H" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
