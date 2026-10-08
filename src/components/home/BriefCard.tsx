/**
 * "Your brief": the home screen's plain-words summary of the day.
 *
 * Built by `lib/brief.ts` from the same records as the reminders, with rules
 * rather than AI: a greeting, one or two sentences on what matters, the three
 * things to do first (each can be kept as a task with one tap), and where
 * orders are in their journey. Nothing here is a guess.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ListPlus, Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useReminders } from '@/context/RemindersContext';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { nairaShort, count } from '@/lib/format';
import type { FocusItem, Insight, Stage } from '@/lib/brief';
import type { Severity } from '@/lib/reminders';

const DOT: Record<Severity, string> = {
  critical: 'bg-status-critical',
  warning: 'bg-status-warning',
  later: 'bg-brand-500',
};

export function BriefCard({ root, className }: { root: string; className?: string }) {
  const { brief, loading, tasks } = useReminders();

  if (!brief) {
    if (!loading) return null;
    return (
      <section className={cn('rounded-[22px] border border-hairline surface-card p-4 shadow-card sm:p-5', className)}>
        <div className="skeleton h-4 w-40 rounded-full" />
        <div className="skeleton mt-3 h-3 w-full max-w-lg rounded-full" />
        <div className="skeleton mt-2 h-3 w-2/3 max-w-sm rounded-full" />
      </section>
    );
  }

  const kept = new Set(tasks.filter((t) => !t.done && t.source).map((t) => t.source));

  return (
    <section
      aria-labelledby="brief-heading"
      data-tour="brief"
      className={cn('rounded-[22px] border border-hairline surface-card p-4 shadow-card sm:p-5', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-brand-700 dark:text-brand-400">
            <Sparkles size={13} aria-hidden /> Your brief
          </p>
          <h2 id="brief-heading" className="mt-1 text-[17px] font-bold text-primary">
            {brief.greeting}
          </h2>
        </div>
        <Link
          to={`${root}/tasks`}
          className="shrink-0 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-brand-700 hover:bg-[var(--surface-sunken)] dark:text-brand-400"
        >
          My tasks
        </Link>
      </div>
      <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-secondary">{brief.summary}</p>

      {brief.focus.length > 0 && (
        <ol className="mt-4 space-y-2">
          {brief.focus.slice(0, 3).map((item, index) => (
            <FocusRow key={item.id} item={item} rank={index + 1} kept={kept.has(item.id)} />
          ))}
        </ol>
      )}

      {brief.pipeline.some((stage) => stage.count > 0) && (
        <div className="mt-5">
          <p className="text-[12.5px] font-bold text-primary">Where your orders are</p>
          <Pipeline stages={brief.pipeline} bottleneck={brief.bottleneck?.key} className="mt-2" />
        </div>
      )}

      {brief.insights.length > 0 && <Insights items={brief.insights} className="mt-4" />}

      <div className="mt-4 flex justify-end">
        <Link
          to={`${root}/reminders`}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          Everything that needs you <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/** One of the three things to do first, with a one-tap "keep as a task". */
function FocusRow({ item, rank, kept }: { item: FocusItem; rank?: number; kept: boolean }) {
  const { keepAsTask } = useReminders();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(kept);

  const keep = async () => {
    if (!item.reminder || saved) return;
    setBusy(true);
    try {
      await keepAsTask(item.reminder);
      setSaved(true);
      toast.success('Added to your tasks', 'Due today. Change the date in My tasks.');
    } catch {
      toast.error('Could not add it', 'Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-start gap-3 rounded-2xl surface-sunken p-3">
      {rank !== undefined ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12.5px] font-bold text-white dark:bg-brand-500 dark:text-brand-950">
          {rank}
        </span>
      ) : (
        <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', DOT[item.severity])} aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <Link to={item.to} className="block text-[14px] font-semibold leading-snug text-primary hover:underline">
          {item.title}
        </Link>
        <p className="mt-0.5 text-[12.5px] leading-snug text-secondary">{item.detail}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
          <span className={cn('h-1.5 w-1.5 rounded-full', DOT[item.severity])} aria-hidden />
          {item.reason}
        </p>
      </div>
      {item.reminder && item.reminder.key !== 'task-due' && (
        <button
          type="button"
          onClick={() => void keep()}
          disabled={busy || saved}
          title={saved ? 'Already on your tasks' : 'Keep this as a task, due today'}
          aria-label={saved ? 'Already on your tasks' : `Add to my tasks: ${item.title}`}
          className="tap flex shrink-0 items-center justify-center rounded-xl text-secondary transition-colors hover:bg-[var(--surface-card)] hover:text-primary disabled:opacity-60"
        >
          {saved ? <Check size={17} className="text-status-good" /> : <ListPlus size={18} />}
        </button>
      )}
    </li>
  );
}

/**
 * The order journey as a row of stages, draft to paid.
 *
 * Each stage shows how many orders are in it and what they are worth; a stage
 * with orders past their window is marked, and the one holding up the most is
 * outlined, so the eye goes to where the flow is blocked.
 */
export function Pipeline({ stages, bottleneck, className }: { stages: Stage[]; bottleneck?: string; className?: string }) {
  return (
    <ol className={cn('-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1', className)}>
      {stages.map((stage, index) => {
        const blocked = stage.key === bottleneck;
        const done = stage.key === 'paid';
        return (
          <li key={stage.key} className="flex shrink-0 snap-start items-center gap-2">
            <Link
              to={stage.to}
              className={cn(
                'block w-[9.5rem] rounded-2xl border p-3 transition-colors hover:border-[var(--border-strong)]',
                blocked
                  ? 'border-status-warning bg-gold-50 dark:bg-gold-400/10'
                  : 'border-hairline surface-card',
              )}
            >
              <p className="line-clamp-2 min-h-[2.4em] text-[11.5px] font-semibold leading-tight text-muted">{stage.label}</p>
              <p className={cn('mt-1 text-[20px] font-bold leading-none', done ? 'text-status-good' : 'text-primary')}>
                {count(stage.count)}
              </p>
              <p className="mt-1 truncate text-[12px] text-secondary">{stage.value ? nairaShort(stage.value) : 'Nothing here'}</p>
              {stage.stuck > 0 && !done && (
                <p className="mt-1.5 truncate text-[11.5px] font-semibold text-status-warning">
                  {stage.key === 'collect' ? `${count(stage.stuck)} past due` : `${count(stage.stuck)} past window`}
                </p>
              )}
            </Link>
            {index < stages.length - 1 && <ArrowRight size={14} className="shrink-0 text-muted" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

const INSIGHT_ICON = { good: TrendingUp, warning: TrendingDown, neutral: Minus } as const;
const INSIGHT_TONE = {
  good: 'text-status-good',
  warning: 'text-status-warning',
  neutral: 'text-muted',
} as const;

export function Insights({ items, className }: { items: Insight[]; className?: string }) {
  return (
    <ul className={cn('space-y-1.5', className)}>
      {items.map((insight) => {
        const Icon = INSIGHT_ICON[insight.tone];
        const body = (
          <>
            <Icon size={15} className={cn('mt-0.5 shrink-0', INSIGHT_TONE[insight.tone])} aria-hidden />
            <span>{insight.text}</span>
          </>
        );
        return (
          <li key={insight.id}>
            {insight.to ? (
              <Link to={insight.to} className="flex gap-2 text-[13px] leading-snug text-secondary hover:text-primary">
                {body}
              </Link>
            ) : (
              <p className="flex gap-2 text-[13px] leading-snug text-secondary">{body}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
