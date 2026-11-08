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
import { AlarmClock, BellRing, Check, ChevronDown, ListPlus, RefreshCw } from 'lucide-react';
import { Insights, Pipeline, Sentences } from '@/components/home/BriefCard';
import { useToast } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, LinkButton, SegmentedControl, Switch } from '@/components/ui';
import { QuietLoader } from '@/components/brand/Loader';
import { useReminders } from '@/context/RemindersContext';
import { cn } from '@/lib/cn';
import type { Severity } from '@/lib/reminders';
import { dateLocale } from '@/lib/locale';

const VIEWS = [
  { value: 'action', label: 'Needs action' },
  { value: 'later', label: 'Worth knowing' },
  { value: 'all', label: 'Everything' },
];

const TONE: Record<Severity, { dot: string; word: string }> = {
  /* "Urgent", not "Now": "Now" is also the month picker's badge for the
     current month, and the dictionary has one translation per English word. */
  critical: { dot: 'bg-status-critical', word: 'Urgent' },
  warning: { dot: 'bg-status-warning', word: 'Soon' },
  later: { dot: 'bg-brand-500', word: 'Later' },
};

/** The headline over the list, as one sentence for each case. */
function countsLine(action: number, later: number): string {
  if (!action && !later) return 'Nothing is waiting';
  if (!action) return later === 1 ? '1 thing worth knowing' : `${later} things worth knowing`;
  const head = action === 1 ? '1 thing needs action' : `${action} things need action`;
  if (!later) return head;
  return action === 1
    ? later === 1
      ? '1 thing needs action, 1 worth knowing'
      : `1 thing needs action, ${later} worth knowing`
    : later === 1
      ? `${action} things need action, 1 worth knowing`
      : `${action} things need action, ${later} worth knowing`;
}

export default function RemindersPage() {
  const { reminders, counts, loading, checkedAt, reload, snooze, notify, setNotify, brief, tasks, keepAsTask } = useReminders();
  const [view, setView] = useState('action');
  const toast = useToast();
  const kept = useMemo(() => new Set(tasks.filter((t) => !t.done && t.source).map((t) => t.source)), [tasks]);

  const keep = async (id: string) => {
    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return;
    try {
      await keepAsTask(reminder);
      toast.success('Added to your tasks', 'Due today. Change the date in My tasks.');
    } catch {
      toast.error('Could not add it', 'Check the connection and try again.');
    }
  };

  const shown = useMemo(() => {
    if (view === 'action') return reminders.filter((r) => r.severity !== 'later');
    if (view === 'later') return reminders.filter((r) => r.severity === 'later');
    return reminders;
  }, [reminders, view]);


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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline surface-card px-4 py-3 shadow-card">
        {/*
          Each line is built as one whole string before it reaches the page.
          "Checked {time}" used to be the word and the time as two pieces of
          text, and the counts two pieces with a comma glued to the second,
          and neither shape is something a translation can be written for.
 */}
        <p className="min-w-0 text-body font-semibold text-primary">
          <span>{countsLine(counts.action, counts.later)}</span>
          {checkedAt && (
            <span className="ml-2 text-caption font-normal text-muted">
              {`Checked ${checkedAt.toLocaleTimeString(dateLocale('en-NG'), { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          )}
        </p>
        <Switch
          checked={notify}
          onChange={(next) => void setNotify(next)}
          label="Tell me on this device"
          hint="Raises a browser notification when something new appears while you are working elsewhere. It checks itself every 15 minutes while open."
        />
      </div>

      {brief && <SummaryBar summary={brief.summary} insights={brief.insights} />}

      {brief && brief.pipeline.some((stage) => stage.count > 0) && (
        <Pipeline stages={brief.pipeline} bottleneck={brief.bottleneck?.key} className="mb-4" />
      )}

      {loading && !checkedAt ? (
        <QuietLoader inline label="Reading your records" />
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-hairline surface-card p-10 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Check size={22} aria-hidden />
          </span>
          <p className="mt-3 text-lead font-semibold text-primary">All clear</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              title={reminder.title}
              detail={reminder.detail}
              when={TONE[reminder.severity].word}
              dot={TONE[reminder.severity].dot}
              to={reminder.to}
              canKeep={reminder.key !== 'task-due'}
              kept={kept.has(reminder.id)}
              onKeep={() => void keep(reminder.id)}
              onSnooze={() => snooze(reminder.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The day's summary as one notification line. Tap it and it opens to the full
 * sentence and anything worth knowing; tap again and it folds away.
 */
function SummaryBar({ summary, insights }: { summary: string[]; insights: Parameters<typeof Insights>[0]['items'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-hairline surface-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          <BellRing size={17} aria-hidden />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-status-critical ring-2 ring-[var(--surface-card)]" />
        </span>
        <span className={cn('min-w-0 flex-1 text-body font-semibold text-primary', !open && 'truncate')}>
          {open ? 'Today' : <Sentences items={summary} />}
        </span>
        <ChevronDown size={17} aria-hidden className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-hairline px-4 pb-4 pt-3">
          <p className="text-body leading-relaxed text-secondary">
            <Sentences items={summary} />
          </p>
          {insights.length > 0 && <Insights items={insights} className="mt-3" />}
        </div>
      )}
    </div>
  );
}

/** One reminder, folded to a single line; tap to see the detail and what to do. */
function ReminderRow({
  title,
  detail,
  when,
  dot,
  to,
  canKeep,
  kept,
  onKeep,
  onSnooze,
}: {
  title: string;
  detail: string;
  when: string;
  dot: string;
  to: string;
  canKeep: boolean;
  kept: boolean;
  onKeep: () => void;
  onSnooze: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="overflow-hidden rounded-2xl border border-hairline surface-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
      >
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dot)} aria-hidden />
        <span className={cn('min-w-0 flex-1 text-body font-semibold text-primary', !open && 'truncate')}>{title}</span>
        <span className="shrink-0 text-micro font-semibold uppercase tracking-[0.08em] text-muted">{when}</span>
        <ChevronDown size={17} aria-hidden className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-hairline px-4 pb-3 pt-3">
          <p className="text-label leading-snug text-secondary">{detail}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LinkButton to={to} size="sm">
              Open
            </LinkButton>
            {canKeep && (
              <Button variant="ghost" size="sm" icon={kept ? <Check size={15} /> : <ListPlus size={15} />} disabled={kept} onClick={onKeep} title="Keep this as a task, due today">
                {kept ? 'On my tasks' : 'Task'}
              </Button>
            )}
            <Button variant="ghost" size="sm" icon={<AlarmClock size={15} />} onClick={onSnooze} title="Hide this until tomorrow">
              Snooze
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
