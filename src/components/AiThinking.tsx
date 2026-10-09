/**
 * "GetSchool AI is thinking…" — one moving sign, used wherever the AI works.
 *
 * A locked button alone reads as a frozen screen. This spins the GetSchool AI
 * sparkle, pulses a ring behind it and walks three dots, so nobody wonders
 * whether anything is happening. Motion stops for people who ask for less.
 */

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

export function AiThinking({
  label = 'GetSchool AI is thinking',
  hint,
  compact = false,
  className,
}: {
  label?: string;
  /** A second, quieter line — e.g. "About twenty seconds." */
  hint?: string;
  /** A slim bar instead of a card-sized block. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-brand-700/15 bg-brand-700/[0.05] dark:border-brand-400/20 dark:bg-brand-400/[0.07]',
        compact ? 'px-3 py-2' : 'px-4 py-4',
        className,
      )}
    >
      <span className={cn('ai-orb relative flex shrink-0 items-center justify-center', compact ? 'h-7 w-7' : 'h-10 w-10')}>
        <span className="ai-orb-ring absolute inset-0 rounded-full bg-brand-600/25 dark:bg-brand-400/25" aria-hidden />
        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-brand-700 text-white dark:bg-brand-500">
          <Sparkles size={compact ? 14 : 18} className="ai-orb-spark" aria-hidden />
        </span>
      </span>
      <span className="min-w-0">
        <span className={cn('flex items-baseline font-semibold text-primary', compact ? 'text-[13px]' : 'text-[14.5px]')}>
          {label}
          <span className="ai-dots ml-0.5" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </span>
        {hint && <span className="mt-0.5 block text-[12.5px] text-muted">{hint}</span>}
      </span>
    </div>
  );
}
