/**
 * Recent activity: the last five things this person did, newest on top.
 *
 * Read from the audit log (lib/audit), filtered to the signed in person: an
 * order raised, an approval given, an invoice issued, a payment recorded, a
 * stock count closed. As new lines come in the oldest of the five drops off.
 * Laid out like a bank app's transaction list: a round icon, what it was and
 * its reference, the amount and the date on the right.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  FileText,
  Package,
  Settings2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { listMyAudit, type AuditEntry } from '@/lib/audit';
import { naira } from '@/lib/format';
import { isAdmin } from '@/lib/roles';
import type { Role } from '@/types';

const SHOWN = 5;

type Tone = 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'gold' | 'slate';

const TONE: Record<Tone, string> = {
  blue: 'bg-[#1d4ef5]/12 text-[#1d4ef5] dark:bg-[#1d4ef5]/25 dark:text-[#8fb0ff]',
  green: 'bg-[#15803d]/12 text-[#15803d] dark:bg-[#22c55e]/20 dark:text-[#86efac]',
  red: 'bg-[#dc2626]/12 text-[#dc2626] dark:bg-[#ef4444]/20 dark:text-[#fca5a5]',
  purple: 'bg-[#7c3aed]/12 text-[#7c3aed] dark:bg-[#8b5cf6]/25 dark:text-[#c4b5fd]',
  teal: 'bg-[#0e7490]/12 text-[#0e7490] dark:bg-[#06b6d4]/20 dark:text-[#67e8f9]',
  gold: 'bg-[#b45309]/12 text-[#b45309] dark:bg-[#f59e0b]/20 dark:text-[#fcd34d]',
  slate: 'bg-[#475569]/12 text-[#475569] dark:bg-white/10 dark:text-white/80',
};

/** What each kind of line is called, and how it looks. Anything unlisted falls back to its area. */
const KIND: Record<string, { title: string; icon: LucideIcon; tone: Tone }> = {
  'order.raised': { title: 'Order raised', icon: ArrowUpRight, tone: 'blue' },
  'order.approved': { title: 'Order approved', icon: Check, tone: 'green' },
  'order.rejected': { title: 'Order rejected', icon: X, tone: 'red' },
  'order.cancelled': { title: 'Order cancelled', icon: X, tone: 'red' },
  'invoice.issued': { title: 'Invoice issued', icon: FileText, tone: 'teal' },
  'invoice.edited': { title: 'Invoice edited', icon: FileText, tone: 'teal' },
  'invoice.voided': { title: 'Invoice voided', icon: X, tone: 'red' },
  'credit-note.issued': { title: 'Credit note issued', icon: FileText, tone: 'teal' },
  'payment.recorded': { title: 'Payment recorded', icon: ArrowDownLeft, tone: 'purple' },
  'payment.corrected': { title: 'Payment corrected', icon: ArrowDownLeft, tone: 'purple' },
  'payment.reversed': { title: 'Payment reversed', icon: ArrowUpRight, tone: 'red' },
  'credit-limit.changed': { title: 'Credit limit changed', icon: Settings2, tone: 'slate' },
  'product.added': { title: 'Product added', icon: Package, tone: 'gold' },
  'product.repriced': { title: 'Product repriced', icon: Package, tone: 'gold' },
  'product.retired': { title: 'Product retired', icon: Package, tone: 'slate' },
  'adjustment.raised': { title: 'Stock adjustment raised', icon: Boxes, tone: 'gold' },
  'adjustment.declined': { title: 'Stock adjustment declined', icon: Boxes, tone: 'red' },
  'count.started': { title: 'Stock count started', icon: Boxes, tone: 'gold' },
  'count.closed': { title: 'Stock count closed', icon: Boxes, tone: 'green' },
  'count.cancelled': { title: 'Stock count cancelled', icon: Boxes, tone: 'red' },
  'lead.confirmed': { title: 'Lead confirmed', icon: Check, tone: 'green' },
  'lead.declined': { title: 'Lead declined', icon: X, tone: 'red' },
  'leave.approved': { title: 'Leave approved', icon: Check, tone: 'green' },
  'leave.declined': { title: 'Leave declined', icon: X, tone: 'red' },
  'leave.recorded': { title: 'Leave recorded', icon: UserRound, tone: 'slate' },
  'settings.changed': { title: 'Settings changed', icon: Settings2, tone: 'slate' },
};

const AREA_FALLBACK: Record<string, { title: string; icon: LucideIcon; tone: Tone }> = {
  finance: { title: 'Finance', icon: FileText, tone: 'teal' },
  sales: { title: 'Sales', icon: ArrowUpRight, tone: 'blue' },
  catalogue: { title: 'Products', icon: Package, tone: 'gold' },
  stock: { title: 'Stock', icon: Boxes, tone: 'gold' },
  people: { title: 'People', icon: UserRound, tone: 'slate' },
  settings: { title: 'Settings', icon: Settings2, tone: 'slate' },
};

function kindOf(entry: AuditEntry) {
  return KIND[entry.action] ?? AREA_FALLBACK[entry.area] ?? AREA_FALLBACK.settings;
}

/** The line under the title: the reference and who it was for, taken from the summary. */
function detailOf(entry: AuditEntry): string {
  const forWhom = /\b(?:for|to) ([^:,]+)$/.exec(entry.summary)?.[1];
  if (entry.ref && forWhom) return `${entry.ref} · ${forWhom}`;
  return entry.ref ?? entry.summary;
}

function when(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function RecentActivity({
  uid,
  role,
  root,
  className,
}: {
  uid: string;
  role: Role;
  root: string;
  className?: string;
}) {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    listMyAudit(uid, SHOWN)
      .then((got) => live && setRows(got))
      .catch(() => {
        if (!live) return;
        setRows([]);
        setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [uid]);

  const more = isAdmin(role) ? `${root}/audit` : null;

  return (
    <section aria-labelledby="recent-activity" className={cn('rounded-[22px] border border-hairline surface-card px-4 pb-1 pt-3.5 shadow-card sm:px-5', className)}>
      <div className="flex items-center justify-between pb-1">
        <h2 id="recent-activity" className="text-body font-semibold text-secondary">
          Recent activity
        </h2>
        {more && (
          <Link to={more} aria-label="See the full activity log" className="-mr-1.5 rounded-full p-1.5 text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary">
            <ChevronRight size={20} aria-hidden />
          </Link>
        )}
      </div>

      {rows === null ? (
        <ul aria-busy className="divide-y divide-[var(--border-hairline)]">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center gap-3.5 py-3.5">
              <span className="skeleton h-11 w-11 shrink-0 rounded-full" />
              <span className="flex-1 space-y-2">
                <span className="skeleton block h-3.5 w-36 rounded-full" />
                <span className="skeleton block h-3 w-24 rounded-full" />
              </span>
              <span className="skeleton h-3.5 w-20 rounded-full" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <p className="py-5 text-label leading-relaxed text-muted">
          {failed
            ? 'Your recent activity could not load just now. It will show next time you open home.'
            : 'Nothing yet. Orders you raise, approvals you give, invoices and payments you record will show here, newest first.'}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-hairline)]">
          {rows.map((entry) => {
            const kind = kindOf(entry);
            const Icon = kind.icon;
            return (
              <li key={entry.id} className="flex items-center gap-3.5 py-3.5">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', TONE[kind.tone])}>
                  <Icon size={20} strokeWidth={2.2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-bold text-primary">{kind.title}</span>
                  <span className="mt-0.5 block truncate text-label text-muted">{detailOf(entry)}</span>
                </span>
                <span className="shrink-0 text-right">
                  {entry.amount !== undefined && (
                    <span className="block text-body font-bold tabular-nums text-primary">{naira(entry.amount)}</span>
                  )}
                  <span className={cn('block text-label text-muted', entry.amount !== undefined && 'mt-0.5')}>{when(entry.at)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
