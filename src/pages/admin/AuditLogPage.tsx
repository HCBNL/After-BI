/**
 * Audit log: who made each major decision, when, and what it was. Super
 * admins and admins only. Fifty at a time, newest first, by area. See
 * `lib/audit` for what is logged and why only that.
 */
import { useEffect, useState } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { Banknote, Boxes, Package, Settings, ShieldCheck, ShoppingCart, Users, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, EmptyState, Select, useToast } from '@/components/ui';
import { AUDIT_AREA_LABEL, listAudit, type AuditArea, type AuditEntry } from '@/lib/audit';
import { formatDateTime, naira } from '@/lib/format';
import { ROLE_LABEL, type Role } from '@/types';

const AREAS: AuditArea[] = ['finance', 'sales', 'catalogue', 'stock', 'people', 'settings'];
const AREA_ICON: Record<AuditArea, LucideIcon> = {
  finance: Banknote,
  sales: ShoppingCart,
  catalogue: Package,
  stock: Boxes,
  people: Users,
  settings: Settings,
};

export default function AuditLogPage() {
  const toast = useToast();
  const [area, setArea] = useState<AuditArea | 'all'>('all');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [next, setNext] = useState<QueryDocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listAudit(area === 'all' ? undefined : area)
      .then((page) => {
        if (!alive) return;
        setEntries(page.entries);
        setNext(page.next);
      })
      .catch((err) => alive && toast.error('Could not load the audit log', err instanceof Error ? err.message : undefined))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [area, toast]);

  const loadMore = async () => {
    if (!next) return;
    setMore(true);
    try {
      const page = await listAudit(area === 'all' ? undefined : area, next);
      setEntries((current) => [...current, ...page.entries]);
      setNext(page.next);
    } catch (err) {
      toast.error('Could not load more', err instanceof Error ? err.message : undefined);
    } finally {
      setMore(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Who made each major decision, and when: payments corrected or reversed, invoices edited or voided, credit notes, approvals and rejections, returns, credit limits, roles, products and prices, leave, and leads confirmed as customers. Nothing here can be edited or deleted."
      />

      <Select value={area} onChange={(e) => setArea(e.target.value as typeof area)} className="w-full sm:w-auto sm:min-w-[13rem]" aria-label="Filter by area">
        {(['all', ...AREAS] as const).map((a) => (
          <option key={a} value={a}>
            {a === 'all' ? 'All areas' : AUDIT_AREA_LABEL[a]}
          </option>
        ))}
      </Select>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={24} />}
            title="Nothing logged yet"
            description="Major decisions appear here as they are made, from now on."
          />
        ) : (
          <>
            <ul className="divide-y divide-[var(--border-hairline)] overflow-hidden rounded-2xl border border-hairline surface-card">
              {entries.map((e) => {
                const Icon = AREA_ICON[e.area] ?? ShieldCheck;
                return (
                  <li key={e.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-secondary" aria-hidden>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <p className="min-w-0 flex-1 text-label font-semibold text-primary">{e.summary}</p>
                        {e.amount !== undefined && (
                          <span className="tabular shrink-0 text-label font-semibold text-primary">{naira(e.amount, true)}</span>
                        )}
                      </div>
                      {e.reason && <p className="mt-0.5 text-caption italic text-secondary">{`“${e.reason}”`}</p>}
                      <p className="mt-1 text-caption text-muted">
                        <span className="font-semibold text-secondary">{e.byName}</span>
                        {e.byCode && (
                          <span className="ml-1.5 rounded-md surface-sunken px-1.5 py-px font-mono text-micro font-semibold text-primary">
                            {e.byCode}
                          </span>
                        )}
                        {e.role ? ` · ${ROLE_LABEL[e.role as Role] ?? e.role}` : ''}
                        {` · ${formatDateTime(e.at)}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {next && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" loading={more} onClick={() => void loadMore()}>
                  Load older
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
