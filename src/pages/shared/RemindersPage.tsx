/**
 * Everything that needs somebody, in one list: signatures waiting, orders
 * stuck between approved and delivered, deliveries never invoiced, money past
 * its due date, accounts against their ceiling, lines running out, claims
 * waiting on a decision, drafts going cold and accounts gone quiet.
 *
 * It is worked out from this organisation's own records every quarter of an
 * hour while the app is open. Nothing is sent to anybody.
 */
import { useMemo, useState } from 'react';
import { AlarmClock, BellRing, Check, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, LinkButton, SegmentedControl, Switch } from '@/components/ui';
import { BrandLoader } from '@/components/brand/Loader';
import { useReminders } from '@/context/RemindersContext';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/roles';
import { PORTAL_ROOT } from '@/lib/tiles';
import { cn } from '@/lib/cn';
import type { Severity } from '@/lib/reminders';

const VIEWS = [
  { value: 'action', label: 'Needs action' },
  { value: 'later', label: 'Worth knowing' },
  { value: 'all', label: 'Everything' },
];

const TONE: Record<Severity, { dot: string; word: string }> = {
  critical: { dot: 'bg-status-critical', word: 'Now' },
  warning: { dot: 'bg-status-warning', word: 'Soon' },
  later: { dot: 'bg-brand-500', word: 'Later' },
};

export default function RemindersPage() {
  const { user } = useAuth();
  const { reminders, counts, loading, checkedAt, reload, snooze, notify, setNotify } = useReminders();
  const [view, setView] = useState('action');

  const shown = useMemo(() => {
    if (view === 'action') return reminders.filter((r) => r.severity !== 'later');
    if (view === 'later') return reminders.filter((r) => r.severity === 'later');
    return reminders;
  }, [reminders, view]);

  const root = user ? PORTAL_ROOT[user.role] : '';

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="What is overdue, waiting or running out, worked out from your own records."
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={15} />} loading={loading} onClick={reload}>
            Check again
          </Button>
        }
      >
        <SegmentedControl size="sm" value={view} onChange={setView} options={VIEWS} />
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline surface-card p-4 shadow-card">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-primary">
            {counts.action ? `${counts.action} waiting on somebody` : 'Nothing is waiting'}
            {counts.later ? `, ${counts.later} worth knowing` : ''}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            {checkedAt
              ? `Last checked at ${checkedAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}. It checks itself every 15 minutes while this is open.`
              : 'Checking.'}
          </p>
        </div>
        <Switch
          checked={notify}
          onChange={(next) => void setNotify(next)}
          label="Tell me on this device"
          hint="Raises a browser notification when something new appears while you are working elsewhere."
        />
      </div>

      {loading && !checkedAt ? (
        <BrandLoader label="Reading your records" />
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-hairline surface-card p-10 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Check size={22} aria-hidden />
          </span>
          <p className="mt-3 text-[15px] font-bold text-primary">Nothing here</p>
          <p className="mt-1 text-[13px] text-muted">
            Everything is inside the windows your organisation set.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((reminder) => (
            <li
              key={reminder.id}
              className="flex flex-wrap items-start gap-3 rounded-2xl border border-hairline surface-card p-4 shadow-card"
            >
              <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', TONE[reminder.severity].dot)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-primary">{reminder.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-secondary">{reminder.detail}</p>
                <p className="mt-1 text-[11.5px] uppercase tracking-[0.08em] text-muted">
                  {TONE[reminder.severity].word}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <LinkButton to={reminder.to} size="sm">
                  Open
                </LinkButton>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<AlarmClock size={15} />}
                  onClick={() => snooze(reminder.id)}
                  title="Hide this until tomorrow"
                >
                  Snooze
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {user && isAdmin(user.role) && (
        <p className="mt-5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
          <BellRing size={14} aria-hidden />
          The windows behind these (how long an order may wait for a signature, and the rest) are in
          <LinkButton to={`${root}/settings`} variant="ghost" size="sm">
            Settings
          </LinkButton>
        </p>
      )}
    </div>
  );
}
