/**
 * A notice, as a one-line tag that opens a pop-up.
 *
 * Notices used to be coloured boxes laid into the page, three or four lines
 * each, with their buttons inside. On a busy screen they pushed the work down
 * and every screen had a different stack of them. Now a notice takes one short
 * line: its headline with an icon. Tapping it opens a pop-up with the details
 * and any buttons that came with it.
 *
 * Errors (`critical`) open their pop-up by themselves when they appear, because
 * an error is the answer to "why did that not work" and must not wait to be
 * found. The tag stays afterwards, so it can be read again.
 *
 * The props are the ones every screen already passes; nothing calling this had
 * to change. `defaultOpen` is accepted and ignored.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './primitives';
import { Modal } from './overlay';

type Tone = 'info' | 'good' | 'warning' | 'critical';

const TONES: Record<Tone, string> = {
  info: 'bg-[#2a78d6]/8 text-[#1c5cab] ring-[#2a78d6]/25 dark:text-[#7cb1f0]',
  good: 'bg-[#0ca30c]/8 text-[#0a7a0a] ring-[#0ca30c]/25 dark:text-[#4ec54e]',
  warning: 'bg-[#fab219]/12 text-[#8a6100] ring-[#fab219]/35 dark:text-[#fab219]',
  critical: 'bg-[#d03b3b]/8 text-[#a52929] ring-[#d03b3b]/25 dark:text-[#f08080]',
};

const ICONS: Record<Tone, ReactNode> = {
  info: <Info size={14} />,
  good: <CheckCircle2 size={14} />,
  warning: <AlertTriangle size={14} />,
  critical: <XCircle size={14} />,
};

const FALLBACK_TITLE: Record<Tone, string> = {
  info: 'Good to know',
  good: 'Done',
  warning: 'Needs attention',
  critical: 'Something went wrong',
};

export function Alert({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Kept so existing screens compile; a notice's details are always in its pop-up. */
  defaultOpen?: boolean;
}) {
  const hasBody = children !== undefined && children !== null && children !== false && children !== '';
  const short = title === undefined && typeof children === 'string' && children.length <= 70;
  const label = title ?? (short ? (children as string) : FALLBACK_TITLE[tone]);
  /* A short note with no title IS its headline. An error always opens. */
  const opens = hasBody && (tone === 'critical' || !short);
  const [open, setOpen] = useState(false);
  /* An error pops up when it appears, and again whenever its message changes. */
  const message = typeof children === 'string' ? children : label;
  useEffect(() => {
    if (tone === 'critical' && opens) setOpen(true);
  }, [tone, opens, message]);

  const inner = (
    <>
      <span className="shrink-0" aria-hidden>
        {icon ? <span className="inline-flex [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span> : ICONS[tone]}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {opens && <ChevronRight size={14} className="shrink-0 opacity-70" aria-hidden />}
    </>
  );
  const pill = cn(
    'inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-inset',
    TONES[tone],
    className,
  );

  return (
    <>
      {opens ? (
        <button type="button" role="status" onClick={() => setOpen(true)} className={cn(pill, 'text-left transition-opacity hover:opacity-85')}>
          {inner}
        </button>
      ) : (
        <p role="status" className={pill}>
          {inner}
        </p>
      )}
      {opens && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          size="sm"
          title={
            <span className={cn('inline-flex items-center gap-2', TONES[tone].split(' ').filter((c) => c.startsWith('text-') || c.startsWith('dark:text-')).join(' '))}>
              {ICONS[tone]}
              <span className="text-primary">{title ?? (tone === 'critical' || !short ? FALLBACK_TITLE[tone] : label)}</span>
            </span>
          }
          footer={
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                OK
              </Button>
            </div>
          }
        >
          <div className="text-[14px] leading-relaxed text-secondary">{children}</div>
        </Modal>
      )}
    </>
  );
}
