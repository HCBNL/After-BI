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
          <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.1em] text-brand-700 dark:text-brand-400">
            <Sparkles size={13} aria-hidden /> Your brief
          </p>
          <h2 id="brief-heading" className="mt-1 text-title font-semibold text-primary">
            {brief.greeting}
          </h2>
        </div>
        <Link
          to={`${root}/tasks`}
          className="shrink-0 rounded-lg px-2 py-1 text-label font-semibold text-brand-700 hover:bg-[var(--surface-sunken)] dark:text-brand-400"
        >
          My tasks
        </Link>
      </div>
      <p className="mt-1.5 max-w-3xl text-body leading-relaxed text-secondary">{brief.summary}</p>

      {brief.focus.length > 0 && (
        <ol className="mt-4 space-y-2">
          {brief.focus.slice(0, 3).map((item, index) => (
            <FocusRow key={item.id} item={item} rank={index + 1} kept={kept.has(item.id)} />
          ))}
        </ol>
      )}

      {brief.pipeline.some((stage) => stage.count > 0) && (
        <Pipeline stages={brief.pipeline} bottleneck={brief.bottleneck?.key} className="mt-5" />
      )}

      {brief.insights.length > 0 && <Insights items={brief.insights} className="mt-4" />}

      <div className="mt-4 flex justify-end">
        <Link
          to={`${root}/reminders`}
          className="inline-flex items-center gap-1 text-label font-semibold text-brand-700 hover:underline dark:text-brand-400"
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
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-label font-semibold text-white dark:bg-brand-500 dark:text-brand-950">
          {rank}
        </span>
      ) : (
        <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', DOT[item.severity])} aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <Link to={item.to} className="block text-body font-semibold leading-snug text-primary hover:underline">
          {item.title}
        </Link>
        <p className="mt-0.5 text-label leading-snug text-secondary">{item.detail}</p>
        <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
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
  /* Paid is the end of the road, not something waiting, so it never lights the trail red. */
  const litIdx = stages.map((s, i) => (s.count > 0 && s.key !== 'paid' ? i : -1)).filter((i) => i >= 0);
  const from = litIdx.length ? litIdx[0] : -1;
  const to = litIdx.length ? litIdx[litIdx.length - 1] : -1;
  const seg = (i: number) => ({ left: i > from && i <= to, right: i >= from && i < to });

  return (
    <div className={cn('ab-hero @container relative isolate overflow-hidden rounded-[22px] p-5 text-white shadow-card sm:p-6', className)}>
      {/* The AfterBI bars, in their own colours, faint behind the trail. */}
      <SignatureBars className="pointer-events-none absolute -right-12 -top-16 -z-10 h-56 w-56 opacity-[0.14]" />
      <SignatureBars className="pointer-events-none absolute -bottom-12 left-[38%] -z-10 h-32 w-32 opacity-[0.08]" />

      <p className="text-micro font-bold uppercase tracking-[0.14em] text-white/60">Order trail</p>
      <div className="mb-5 mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-body font-semibold text-white/80">
          <span className="tabular text-headline font-bold text-white">{count(totalCount)}</span> order{totalCount === 1 ? '' : 's'} on the way
        </p>
        {totalValue > 0 && <p className="tabular text-body font-semibold text-white/60">worth {nairaShort(totalValue)}</p>}
        <span className="ml-auto flex items-center gap-3 text-caption font-semibold text-white/70">
          <span className="flex items-center gap-1.5"><span className="ab-trail-active h-2.5 w-2.5 rounded-full" />Pending</span>
          <span className="flex items-center gap-1.5"><span className="ab-trail-clear h-2.5 w-2.5 rounded-full" />Clear</span>
          <span className="flex items-center gap-1.5"><span className="ab-trail-pending h-2.5 w-2.5 rounded-full ring-1 ring-white/40" />Not yet</span>
        </span>
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

/** The AfterBI four bars in their own colours, for decoration. */
function SignatureBars({ className }: { className?: string }) {
  return (
    <svg viewBox="-8 -14 146 146" className={className} aria-hidden focusable="false">
      <g transform="skewX(-9) translate(14 0)">
        <rect x="3" y="78" width="25" height="36" rx="12.5" fill="#f2332b" />
        <rect x="35" y="55" width="25" height="59" rx="12.5" fill="#f5a400" />
        <rect x="67" y="37" width="25" height="77" rx="12.5" fill="#02a05c" />
        <rect x="99" y="20" width="25" height="94" rx="12.5" fill="#0e6dfd" />
      </g>
    </svg>
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
  const done = stage.key === 'paid';
  /* Pending: orders waiting at this stop. Paid is never pending; it is reached or not yet. */
  const lit = stage.count > 0 && !done;
  const reached = done && stage.count > 0;
  const late = stage.stuck > 0 && !done;

  const node = (
    <span className="relative z-10 flex items-center justify-center">
      {/* Pending stops pulse like a notification. */}
      {lit && <span aria-hidden className="ab-trail-ping absolute h-14 w-14 rounded-full" />}
      <span
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors',
          lit
            ? 'ab-trail-active border-white/90 text-white'
            : done && !reached
              ? /* the last stop, not reached yet: solid grey, so the line stops at its edge */ 'ab-trail-pending border-white/50 text-white/80'
              : 'ab-trail-clear border-white/90',
          /* the stop holding up the most gets a halo as well */
          blocked && lit && 'ring-4 ring-white/25',
        )}
      >
        <Icon size={18} strokeWidth={2} aria-hidden />
        {(lit || reached) && (
          <span className="tabular absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-micro font-bold text-[#0f1f36] shadow">
            {stage.count > 99 ? '99+' : stage.count}
          </span>
        )}
      </span>
    </span>
  );

  const text = (
    <>
      <p className={cn('text-label font-semibold leading-tight', lit || reached ? 'text-white' : done ? 'text-white/55' : 'text-white/75')}>{TRAIL_LABEL[stage.key] ?? stage.label}</p>
      {(lit || reached) && <p className="tabular mt-1.5 text-title font-bold leading-none text-white">{nairaShort(stage.value)}</p>}
      <span className="sr-only">{lit ? `${stage.count} pending` : 'Nothing waiting'}</span>
      {late && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#fab219]/20 px-2 py-0.5 text-micro font-semibold text-[#ffd77a]">
          <Clock size={11} aria-hidden />
          {stage.key === 'collect' ? `${count(stage.stuck)} past due` : `${count(stage.stuck)} waiting too long`}
        </span>
      )}
    </>
  );

  const line = (on: boolean) => (on ? 'ab-trail-line-on' : 'bg-white/20');

  if (layout === 'across') {
    return (
      <li className="relative">
        {/* the track runs edge to edge behind the node, so the trail is one unbroken line */}
        {!first && <span aria-hidden className={cn('absolute left-0 right-1/2 top-[26px] h-[3px] -translate-y-1/2', line(seg.left))} />}
        {!last && <span aria-hidden className={cn('absolute left-1/2 right-0 top-[26px] h-[3px] -translate-y-1/2', line(seg.right))} />}
        <Link to={stage.to} className="group relative mx-1 flex flex-col items-center rounded-2xl px-1 pb-3 pt-1 text-center transition-colors hover:bg-white/[0.06]">
          {node}
          <div className="mt-3 flex flex-col items-center">{text}</div>
        </Link>
      </li>
    );
  }

  return (
    <li className="relative">
      <Link to={stage.to} className="group flex gap-3.5 rounded-2xl py-1.5 pr-2 transition-colors hover:bg-white/[0.06]">
        <div className="relative flex w-11 shrink-0 justify-center">
          {!first && <span aria-hidden className={cn('absolute bottom-1/2 top-[-6px] w-[3px]', line(seg.left))} />}
          {!last && <span aria-hidden className={cn('absolute bottom-[-6px] top-1/2 w-[3px]', line(seg.right))} />}
          {node}
        </div>
        <div className="min-w-0 flex-1 py-1.5">{text}</div>
        <ChevronRight size={16} aria-hidden className="mt-3 shrink-0 text-white/60 opacity-0 transition-opacity group-hover:opacity-100" />
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
              <Link to={insight.to} className="flex gap-2 text-label leading-snug text-secondary hover:text-primary">
                {body}
              </Link>
            ) : (
              <p className="flex gap-2 text-label leading-snug text-secondary">{body}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
