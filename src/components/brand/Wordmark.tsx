/**
 * The AfterBI logo, drawn in code (SVG), in one file.
 *
 *   Wordmark  three slanted bars, the tallest the height of the capital A,
 *             then "AfterBI" in heavy Archivo. One colour: the text colour.
 *   Mark      the same three bars, white, in a round badge. The browser icon,
 *             the app icon, ID cards.
 *
 * Both are outlined paths (see logoPaths.ts), so they never depend on a font
 * loading and look the same at every size. Size the wordmark with font size:
 * it is exactly 1em tall.
 */

import { cn } from '@/lib/cn';
import {
  MARK_BARS,
  MARK_BAR_WIDTH,
  WORDMARK_BARS,
  WORDMARK_BAR_WIDTH,
  WORDMARK_LETTERS,
  WORDMARK_RATIO,
  WORDMARK_VIEWBOX,
} from './logoPaths';

/** The round badge with the three bars. The circle takes the text colour (near black by default). */
export function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn('shrink-0 text-[#0a0a0b]', className)}
    >
      <circle cx="50" cy="50" r="47.7" fill="currentColor" />
      <path d={MARK_BARS} stroke="#fff" strokeWidth={MARK_BAR_WIDTH} strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** The three bars alone, in the text colour. */
export function MarkSolid({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -740 1250 750" aria-hidden focusable="false" className={cn('shrink-0', className)}>
      <path d={WORDMARK_BARS} stroke="currentColor" strokeWidth={WORDMARK_BAR_WIDTH} strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Wordmark({
  className,
  onInk,
}: {
  className?: string;
  /** White on the dark pages; the theme's own ink everywhere else. */
  onInk?: boolean;
  /** Kept for old callers: the logo is always one colour now. */
  mono?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="AfterBI"
      className={cn('inline-flex shrink-0 items-center leading-none', onInk ? 'text-white' : 'text-primary', className)}
    >
      <svg viewBox={WORDMARK_VIEWBOX} style={{ height: '1em', width: `${WORDMARK_RATIO}em` }} aria-hidden focusable="false">
        <path d={WORDMARK_BARS} stroke="currentColor" strokeWidth={WORDMARK_BAR_WIDTH} strokeLinecap="round" fill="none" />
        <g fill="currentColor">
          {WORDMARK_LETTERS.map(([x, d], i) => (
            <path key={i} transform={`translate(${x} 0)`} d={d} />
          ))}
        </g>
      </svg>
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
