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
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Clock,
  FilePen,
  ListPlus,
  Minus,
  PackageCheck,
  PenLine,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
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
        <div className="mt-5 rounded-2xl border border-hairline surface-sunken p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Order trail</p>
          <Pipeline stages={brief.pipeline} bottleneck={brief.bottleneck?.key} className="mt-1" />
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
 * The order journey as a trail, draft to paid: the way a parcel tracker shows
 * a delivery. Each stop is a node on one line; a stop holding orders lights
 * up with its count and value, an empty one stays quiet, and the stop holding
 * up the most is ringed so the eye goes to where the flow is blocked.
 * Across on a laptop, down the page on a phone.
 */
/* Short names for the trail; the full ones stay in lib/brief.ts for the reminders. */
const TRAIL_LABEL: Record<Stage['key'], string> = {
  draft: 'Draft',
  signature: 'Awaiting signature',
  fulfil: 'Approved, to deliver',
  invoice: 'Delivered, to invoice',
  collect: 'Invoiced, unpaid',
  paid: 'Paid (30 days)',
};

const STAGE_ICON: Record<Stage['key'], LucideIcon> = {
  draft: FilePen,
  signature: PenLine,
  fulfil: PackageCheck,
  invoice: Truck,
  collect: Wallet,
  paid: BadgeCheck,
};

export function Pipeline({ stages, bottleneck, className }: { stages: Stage[]; bottleneck?: string; className?: string }) {
  const inFlight = stages.filter((s) => s.key !== 'paid');
  const totalCount = inFlight.reduce((sum, s) => sum + s.count, 0);
  const totalValue = inFlight.reduce((sum, s) => sum + s.value, 0);
  /* The lit stretch of the trail: from the first stop holding orders to the last. */
  const litIdx = stages.map((s, i) => (s.count > 0 ? i : -1)).filter((i) => i >= 0);
  const from = litIdx.length ? litIdx[0] : -1;
  const to = litIdx.length ? litIdx[litIdx.length - 1] : -1;
  const seg = (i: number) => ({ left: i > from && i <= to, right: i >= from && i < to });

  return (
    <div className={cn('@container', className)}>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[13px] font-semibold text-secondary">
          <span className="tabular text-[22px] font-bold text-primary">{count(totalCount)}</span> order{totalCount === 1 ? '' : 's'} on the way
        </p>
        {totalValue > 0 && <p className="tabular text-[13px] font-semibold text-muted">worth {nairaShort(totalValue)}</p>}
      </div>

      {/* across, when there is room */}
      <ol className="hidden grid-cols-6 @2xl:grid">
        {stages.map((stage, index) => (
          <TrailStop key={stage.key} stage={stage} first={index === 0} last={index === stages.length - 1} seg={seg(index)} blocked={stage.key === bottleneck} layout="across" />
        ))}
      </ol>

      {/* down, on a phone or a narrow card */}
      <ol className="@2xl:hidden">
        {stages.map((stage, index) => (
          <TrailStop key={stage.key} stage={stage} first={index === 0} last={index === stages.length - 1} seg={seg(index)} blocked={stage.key === bottleneck} layout="down" />
        ))}
      </ol>
    </div>
  );
}

function TrailStop({
  stage,
  first,
  last,
  seg,
  blocked,
  layout,
}: {
  stage: Stage;
  first: boolean;
  last: boolean;
  seg: { left: boolean; right: boolean };
  blocked: boolean;
  layout: 'across' | 'down';
}) {
  const Icon = STAGE_ICON[stage.key];
  const lit = stage.count > 0;
  const done = stage.key === 'paid';
  const late = stage.stuck > 0 && !done;

  const node = (
    <span className="relative z-10 flex items-center justify-center">
      {blocked && lit && <span aria-hidden className="absolute h-14 w-14 animate-ping rounded-full bg-status-warning/20" style={{ animationDuration: '2.4s' }} />}
      <span
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors',
          lit
            ? blocked
              ? 'border-status-warning bg-status-warning text-white shadow-[0_8px_20px_-8px_rgba(250,178,25,0.7)]'
              : 'border-brand-600 bg-brand-600 text-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.45)] dark:border-brand-500 dark:bg-brand-500'
            : 'border-[var(--border-strong)] surface-card text-muted',
        )}
      >
        <Icon size={18} strokeWidth={2} aria-hidden />
        {lit && (
          <span className="tabular absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--surface-card)] px-1 text-[10.5px] font-bold text-primary shadow ring-1 ring-[var(--border-hairline)]">
            {stage.count > 99 ? '99+' : stage.count}
          </span>
        )}
      </span>
    </span>
  );

  const text = (
    <>
      <p className={cn('text-[12.5px] font-semibold leading-tight', lit ? 'text-primary' : 'text-muted')}>{TRAIL_LABEL[stage.key] ?? stage.label}</p>
      <p className={cn('tabular mt-1 text-[15px] font-bold leading-none', lit ? (done ? 'text-status-good' : 'text-primary') : 'text-muted opacity-60')}>
        {lit ? nairaShort(stage.value) : 'Clear'}
      </p>
      {late && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-status-warning/12 px-2 py-0.5 text-[11px] font-semibold text-[#8a6100] dark:text-[#fab219]">
          <Clock size={11} aria-hidden />
          {stage.key === 'collect' ? `${count(stage.stuck)} past due` : `${count(stage.stuck)} waiting too long`}
        </span>
      )}
    </>
  );

  const line = (on: boolean) => (on ? 'bg-brand-600 dark:bg-brand-500' : 'bg-[var(--border-hairline)]');

  if (layout === 'across') {
    return (
      <li className="relative">
        {/* the track runs edge to edge behind the node, so the trail is one unbroken line */}
        {!first && <span aria-hidden className={cn('absolute left-0 right-1/2 top-[26px] h-[3px] -translate-y-1/2', line(seg.left))} />}
        {!last && <span aria-hidden className={cn('absolute left-1/2 right-0 top-[26px] h-[3px] -translate-y-1/2', line(seg.right))} />}
        <Link to={stage.to} className="group relative mx-1 flex flex-col items-center rounded-2xl px-1 pb-3 pt-1 text-center transition-colors hover:bg-[var(--surface-card)]">
          {node}
          <div className="mt-3 flex flex-col items-center">{text}</div>
        </Link>
      </li>
    );
  }

  return (
    <li className="relative">
      <Link to={stage.to} className="group flex gap-3.5 rounded-2xl py-1.5 pr-2 transition-colors hover:bg-[var(--surface-card)]">
        <div className="relative flex w-11 shrink-0 justify-center">
          {!first && <span aria-hidden className={cn('absolute bottom-1/2 top-[-6px] w-[3px]', line(seg.left))} />}
          {!last && <span aria-hidden className={cn('absolute bottom-[-6px] top-1/2 w-[3px]', line(seg.right))} />}
          {node}
        </div>
        <div className="min-w-0 flex-1 py-1.5">{text}</div>
        <ChevronRight size={16} aria-hidden className="mt-3 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
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
