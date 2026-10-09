/**
 * My tasks: a person's own to do list, beside what the app suggests.
 *
 * Two sources, one list. What somebody types in themselves, and the reminders
 * the app worked out from the records ("PO-0041 is approved but not
 * fulfilled"), which can be kept here with a date instead of snoozed and
 * forgotten. A kept reminder still ticks off by itself on the Reminders
 * screen when the work is done; the task is the person's note that they own
 * it.
 *
 * Personal on purpose: nobody else sees this list, and nobody assigns anybody
 * a task. See `lib/tasks.ts`.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, Flag, ListPlus, Plus, Sparkles, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, EmptyState, Input, SegmentedControl, useToast } from '@/components/ui';
import { QuietLoader } from '@/components/brand/Loader';
import { useReminders } from '@/context/RemindersContext';
import { dueLabel, taskTiming, type Task, type TaskPriority } from '@/lib/tasks';
import { todayISO } from '@/lib/format';
import { cn } from '@/lib/cn';

const VIEWS = [
  { value: 'open', label: 'To do' },
  { value: 'done', label: 'Done' },
];

/** Quick dates, because most tasks are today, tomorrow or next week. */
function quickDue(which: 'today' | 'tomorrow' | 'week' | 'none'): string {
  if (which === 'none') return '';
  const add = which === 'today' ? 0 : which === 'tomorrow' ? 1 : 7;
  return todayISO(new Date(Date.now() + add * 86_400_000));
}

const TIMING_TONE = {
  overdue: 'text-status-critical',
  today: 'text-status-warning',
  soon: 'text-secondary',
  none: 'text-muted',
} as const;

export default function TasksPage() {
  const { tasks, tasksLoading, tasksError, createTask, toggleTask, deleteTask, editTask, brief, keepAsTask } = useReminders();
  const toast = useToast();
  const [view, setView] = useState('open');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(quickDue('today'));
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [busy, setBusy] = useState(false);

  const open = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const late = open.filter((t) => taskTiming(t) === 'overdue').length;
  const today = open.filter((t) => taskTiming(t) === 'today').length;
  const shown = view === 'open' ? open : done;

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createTask({ title, due: due || undefined, priority });
      setTitle('');
      setPriority('normal');
    } catch {
      toast.error('Could not add it', 'Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const suggestions = brief?.suggestions ?? [];

  return (
    <div>
      <PageHeader
        title="My tasks"
        description={
          open.length
            ? `${open.length} to do${late ? `, ${late} late` : ''}${today ? `, ${today} due today` : ''}.`
            : 'Nothing on your list. Add something, or keep one of the suggestions below.'
        }
      >
        <SegmentedControl size="sm" value={view} onChange={setView} options={VIEWS} />
      </PageHeader>

      {tasksError && (
        <Alert tone="critical" title="Your tasks could not be read" defaultOpen>
          {/permission/i.test(tasksError.message)
            ? 'The database refused it. The security rules in Firebase are older than this version of AfterBI. Publish the current firestore.rules and reload.'
            : 'Check the connection and reload the page.'}
        </Alert>
      )}

      {/* ------------------------------------------------------------ add */}
      <form
        onSubmit={(event) => void add(event)}
        data-tour="task-add"
        className="mb-5 rounded-2xl border border-hairline surface-card p-4 shadow-card"
      >
        <label htmlFor="task-title" className="text-[13px] font-semibold text-primary">
          Add a task
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="task-title"
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Call Sunrise Foods about the overdue invoice"
            className="flex-1"
          />
          <Button type="submit" icon={<Plus size={16} />} loading={busy} disabled={!title.trim()}>
            Add
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(['today', 'tomorrow', 'week', 'none'] as const).map((which) => {
            const value = quickDue(which);
            const active = due === value;
            return (
              <button
                key={which}
                type="button"
                onClick={() => setDue(value)}
                aria-pressed={active}
                className={cn(
                  'h-8 rounded-full px-3 text-[12.5px] font-semibold transition-colors',
                  active
                    ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950'
                    : 'surface-sunken text-secondary hover:text-primary',
                )}
              >
                {which === 'today' ? 'Today' : which === 'tomorrow' ? 'Tomorrow' : which === 'week' ? 'In a week' : 'No date'}
              </button>
            );
          })}
          <label className="flex h-8 items-center gap-1.5 rounded-full surface-sunken px-3 text-[12.5px] text-secondary">
            <CalendarDays size={14} aria-hidden />
            <input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
              aria-label="Due date"
              className="bg-transparent text-[16px] text-primary outline-none sm:text-[12.5px]"
            />
          </label>
          <button
            type="button"
            onClick={() => setPriority(priority === 'high' ? 'normal' : 'high')}
            aria-pressed={priority === 'high'}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors',
              priority === 'high' ? 'bg-status-critical text-white' : 'surface-sunken text-secondary hover:text-primary',
            )}
          >
            <Flag size={13} aria-hidden /> Important
          </button>
        </div>
      </form>

      {/* ------------------------------------------------------------ list */}
      {tasksLoading && tasks.length === 0 ? (
        <QuietLoader label="Reading your tasks" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Check size={22} />}
          title={view === 'open' ? 'Nothing to do' : 'Nothing finished yet'}
          description={
            view === 'open'
              ? 'Your list is clear. The suggestions below come from your own records.'
              : 'Finished tasks stay here for 30 days, then clear themselves.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={(next) =>
                void toggleTask(task.id, next).catch(() => toast.error('Could not save that', 'Check the connection.'))
              }
              onDelete={() => void deleteTask(task.id).catch(() => toast.error('Could not delete it', 'Check the connection.'))}
              onMove={(next) => void editTask(task.id, { due: next }).catch(() => toast.error('Could not move it', 'Check the connection.'))}
            />
          ))}
        </ul>
      )}

      {/* ----------------------------------------------------- suggestions */}
      {view === 'open' && suggestions.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-primary">
            <Sparkles size={16} className="text-brand-600 dark:text-brand-400" aria-hidden />
            Suggested from your records
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Worked out from your orders, invoices and stock. Keep one as a task to give it a date.
          </p>
          <ul className="mt-3 space-y-2">
            {suggestions.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-start gap-3 rounded-2xl border border-hairline surface-card p-3.5 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <Link to={reminder.to} className="text-[14px] font-semibold text-primary hover:underline">
                    {reminder.title}
                  </Link>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-secondary">{reminder.detail}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<ListPlus size={15} />}
                  onClick={() =>
                    void keepAsTask(reminder)
                      .then(() => toast.success('Added to your tasks', 'Due today.'))
                      .catch(() => toast.error('Could not add it', 'Check the connection.'))
                  }
                >
                  Keep
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onMove,
}: {
  task: Task;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
  onMove: (due: string) => void;
}) {
  const timing = taskTiming(task);
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-hairline surface-card p-3.5 shadow-card">
      <button
        type="button"
        onClick={() => onToggle(!task.done)}
        aria-label={task.done ? `Mark not done: ${task.title}` : `Mark done: ${task.title}`}
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          task.done
            ? 'border-status-good bg-status-good text-white'
            : task.priority === 'high'
              ? 'border-status-critical hover:bg-status-critical/10'
              : 'border-[var(--border-strong)] hover:border-brand-500',
        )}
      >
        {task.done && <Check size={14} strokeWidth={3} aria-hidden />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('text-[14px] font-semibold leading-snug', task.done ? 'text-muted line-through' : 'text-primary')}>
          {task.to && !task.done ? (
            <Link to={task.to} className="hover:underline">
              {task.title}
            </Link>
          ) : (
            task.title
          )}
        </p>
        {task.note && <p className="mt-0.5 text-[12.5px] leading-snug text-secondary">{task.note}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
          {!task.done && (
            <span className={cn('font-semibold', TIMING_TONE[timing])}>{dueLabel(task.due)}</span>
          )}
          {task.priority === 'high' && !task.done && (
            <span className="inline-flex items-center gap-1 font-semibold text-status-critical">
              <Flag size={11} aria-hidden /> Important
            </span>
          )}
          {task.source && <span className="text-muted">From a reminder</span>}
          {!task.done && timing !== 'none' && timing !== 'soon' && (
            <button
              type="button"
              onClick={() => onMove(todayISO(new Date(Date.now() + 86_400_000)))}
              className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
            >
              Move to tomorrow
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete: ${task.title}`}
        className="tap flex shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-status-critical"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
