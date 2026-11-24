/**
 * Recent activity: the last five things this person did, newest on top.
 *
 * Read from the audit log (lib/audit), filtered to the signed in person: an
 * order raised, an approval given, an invoice issued, a payment recorded, a
 * stock count closed. As new lines come in the oldest of the five drops off.
 * Laid out like a bank app's transaction list: a round icon, what it was and
 * its reference, and on the right the amount over the day, or the day over
 * the time. Tapping a line opens its summary: the person's own black box,
 * which nobody can edit or delete (firestore.rules).
 */
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  Copy,
  Lock,
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
import { ROLE_LABEL, type Role } from '@/types';

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
  'adjustment.signed': { title: 'Stock adjustment signed', icon: Check, tone: 'green' },
  'adjustment.applied': { title: 'Stock adjustment approved', icon: Check, tone: 'green' },
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
  const forWhom = forWhomOf(entry);
  if (entry.ref && forWhom) return `${entry.ref} · ${forWhom}`;
  return entry.ref ?? entry.summary;
}

/** Today, Yesterday, a weekday within the week, then a date. */
function dayOf(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

function timeOf(iso: string): string {
  return iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
}

function fullDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · ${timeOf(iso)}`;
}

function forWhomOf(entry: AuditEntry): string | undefined {
  return /\b(?:for|to) ([^:,]+)$/.exec(entry.summary)?.[1];
}

/** The decisions shown on Approvals: what this person approved, signed or turned down. */
export const DECISIONS = ['order.approved', 'order.rejected', 'adjustment.signed', 'adjustment.applied', 'adjustment.declined'];

export function RecentActivity({
  uid,
  role,
  root,
  className,
  title = 'Recent activity',
  actions,
  empty,
}: {
  uid: string;
  role: Role;
  root: string;
  className?: string;
  /** Another heading, for a narrower list (Recent approvals). */
  title?: string;
  /** Only these kinds of line. Read from the person's last 80, so no extra index is needed. */
  actions?: string[];
  empty?: string;
}) {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<AuditEntry | null>(null);

  useEffect(() => {
    let live = true;
    listMyAudit(uid, actions ? 80 : SHOWN)
      .then((got) => live && setRows(actions ? got.filter((e) => actions.includes(e.action)).slice(0, SHOWN) : got))
      .catch(() => {
        if (!live) return;
        setRows([]);
        setFailed(true);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, actions?.join()]);

  const more = isAdmin(role) ? `${root}/audit` : null;

  return (
    <section aria-labelledby="recent-activity" className={cn('rounded-[22px] border border-hairline surface-card px-4 pb-1 pt-3.5 shadow-card sm:px-5', className)}>
      <div className="flex items-center justify-between pb-1">
        <h2 id="recent-activity" className="text-body font-semibold text-secondary">
          {title}
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
            : (empty ?? 'Nothing yet. Orders you raise, approvals you give, invoices and payments you record will show here, newest first.')}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-hairline)]">
          {rows.map((entry) => {
            const kind = kindOf(entry);
            const Icon = kind.icon;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setOpen(entry)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3.5 rounded-2xl px-2 py-3.5 text-left transition-colors hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)]"
                >
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', TONE[kind.tone])}>
                    <Icon size={20} strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-bold text-primary">{kind.title}</span>
                    <span className="mt-0.5 block truncate text-label text-muted">{detailOf(entry)}</span>
                  </span>
                  <span className="max-w-[45%] shrink-0 text-right">
                    <span className="block truncate text-body font-bold tabular-nums text-primary">
                      {entry.amount !== undefined ? naira(entry.amount) : dayOf(entry.at)}
                    </span>
                    <span className="mt-0.5 block truncate text-label text-muted">
                      {entry.amount !== undefined ? dayOf(entry.at) : timeOf(entry.at)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ActivitySummary entry={open} onClose={() => setOpen(null)} />
    </section>
  );
}

/** One line of the person's black box, in full. Read only: nothing here edits or deletes it. */
function ActivitySummary({ entry, onClose }: { entry: AuditEntry | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [entry]);
  if (!entry) return null;

  const kind = kindOf(entry);
  const Icon = kind.icon;
  const forWhom = forWhomOf(entry);
  const rows: [string, string][] = [
    ['Activity', kind.title],
    ...(entry.ref ? ([['Reference', entry.ref]] as [string, string][]) : []),
    ...(forWhom ? ([['Customer', forWhom]] as [string, string][]) : []),
    ['Done by', entry.byName || 'You'],
    ...(entry.byCode ? ([['Employee code', entry.byCode]] as [string, string][]) : []),
    ...(entry.role ? ([['Role', ROLE_LABEL[entry.role] ?? entry.role]] as [string, string][]) : []),
    ['Recorded on', fullDate(entry.at)],
    ...(entry.reason ? ([['Reason', entry.reason]] as [string, string][]) : []),
  ];

  const copy = async () => {
    const text = [
      entry.amount !== undefined ? naira(entry.amount, true) : kind.title,
      fullDate(entry.at),
      ...rows.map(([k, v]) => `${k}: ${v}`),
      `Details: ${entry.summary}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* no clipboard: nothing to do */
    }
  };

  return (
    <Modal open onClose={onClose} size="sm" title="Activity summary">
      <div className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em] text-primary tabular-nums">
              {entry.amount !== undefined ? naira(entry.amount, true) : kind.title}
            </p>
            <p className="mt-1 text-label text-muted">{fullDate(entry.at)}</p>
          </div>
          <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-full', TONE[kind.tone])}>
            <Icon size={26} strokeWidth={2.1} aria-hidden />
          </span>
        </div>

        <dl className="mt-4 divide-y divide-[var(--border-hairline)] border-y border-hairline">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-3.5">
              <dt className="shrink-0 text-body text-muted">{label}</dt>
              <dd className="min-w-0 break-words text-right text-body font-semibold text-primary">{value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 py-3.5">
            <dt className="text-body text-muted">Status</dt>
            <dd>
              <span className="rounded-md bg-[#16a34a] px-2 py-1 text-caption font-bold uppercase tracking-wide text-white">Recorded</span>
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-label leading-relaxed text-secondary">{entry.summary}</p>

        <p className="mt-4 flex items-center gap-2 text-caption text-muted">
          <Lock size={13} aria-hidden /> Kept on your record. It cannot be edited or deleted.
        </p>

        <button
          type="button"
          onClick={() => void copy()}
          className="mx-auto mt-5 flex items-center gap-2 rounded-full px-4 py-2 text-body font-semibold text-brand-700 transition-colors hover:bg-[var(--surface-sunken)] dark:text-brand-400"
        >
          <Copy size={16} aria-hidden /> {copied ? 'Summary copied' : 'Copy summary'}
        </button>
      </div>
    </Modal>
  );
}
