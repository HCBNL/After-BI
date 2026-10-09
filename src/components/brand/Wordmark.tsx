/**
 * The whole brand, in one file.
 *
 * "AfterBI.", the display face, and a green full stop. That is the logo.
 * There is no icon, no monogram and no four-bar glyph any more, and removing
 * them is the point rather than a simplification:
 *
 *   A mark and a wordmark side by side is two logos, and every surface then
 *   has to decide which it is showing. The rail showed the glyph collapsed and
 *   both expanded, the sign-in screen showed both, the footer showed both, the
 *   loader animated the glyph alone, four answers to one question. One
 *   wordmark, drawn at whatever size the surface needs, is a brand somebody
 *   recognises at a glance instead of a kit somebody assembles.
 *
 * THE FULL STOP IS THE WHOLE DEVICE
 *
 * It is the only place the brand green appears on the bar, which is what keeps
 * it meaning something further down the page. It is also the only thing that
 * has to be coloured for the logo to read as the logo, so the wordmark works
 * in one colour anywhere it has to, a print, a favicon, a watermark.
 */

import { cn } from '@/lib/cn';

/** The AfterBI logo mark (the four rising bars), from public/brand. */
export function Mark({ className }: { className?: string }) {
  return <img src="/brand/afterbi-mark-128.png" alt="" aria-hidden width={128} height={128} className={cn('shrink-0 object-contain', className)} />;
}

export function Wordmark({
  className,
  onInk,
}: {
  className?: string;
  /** White on the dark pages; the theme's own ink everywhere else. */
  onInk?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[0.32em] whitespace-nowrap font-display font-extrabold leading-none tracking-[-0.04em]',
        onInk ? 'text-white' : 'text-primary',
        className,
      )}
    >
      <Mark className="h-[1.15em] w-[1.15em]" />
      AfterBI
    </span>
  );
}

/**
 * Waiting, with the brand held still.
 *
 * The wordmark and a line running under it. The logo itself never animates , 
 * see the note at the top of this file, so what moves is the progress.
 */
export function WordmarkLoading({
  label = 'Loading',
  className,
  onInk,
}: {
  label?: string;
  className?: string;
  onInk?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)} role="status" aria-label={label}>
      <Wordmark onInk={onInk} className="text-[1.6rem]" />
      <span className="boot-line" aria-hidden />
    </div>
  );
}
