import { cn } from '@/lib/cn';

/**
 * The AfterBI mark: four bars, rising.
 *
 * Carried over from the loader the old app drew with an inline `<style>` block
 * inside a component — same shape, same four colours, now an SVG that scales,
 * inherits nothing it should not, and can be printed. The bars are a bar chart
 * and a signal strength meter at once, which is the whole product in a glyph:
 * what you sold, and how well it is going.
 *
 * The colours are fixed and are NOT the theme's. This is a logo; a logo that
 * repaints with the interface is not a logo.
 */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="AfterBI"
    >
      <rect x="2" y="18" width="5.5" height="12" rx="2" fill="#E8441A" />
      <rect x="10" y="13" width="5.5" height="17" rx="2" fill="#F5C518" />
      <rect x="18" y="8" width="5.5" height="22" rx="2" fill="#10B981" />
      <rect x="26" y="2" width="4" height="28" rx="2" fill="#29AEFF" />
    </svg>
  );
}

/**
 * The mark, animating, and the ONE place it is allowed to.
 *
 * This is what shows while the app itself is starting — the moment before React
 * has anything to draw. It is not what a *screen* shows while it waits for
 * data: those draw the shape of what is coming instead. A logo says "wait"; a
 * skeleton says "here is what is arriving", and on a slow connection the
 * difference is whether the app feels broken.
 */
export function MarkLoading({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="status" aria-label="Loading">
      <rect className="ab-tile" x="2" y="18" width="5.5" height="12" rx="2" fill="#E8441A" style={{ animationDelay: '0ms' }} />
      <rect className="ab-tile" x="10" y="13" width="5.5" height="17" rx="2" fill="#F5C518" style={{ animationDelay: '150ms' }} />
      <rect className="ab-tile" x="18" y="8" width="5.5" height="22" rx="2" fill="#10B981" style={{ animationDelay: '300ms' }} />
      <rect className="ab-tile" x="26" y="2" width="4" height="28" rx="2" fill="#29AEFF" style={{ animationDelay: '450ms' }} />
    </svg>
  );
}

/** The wordmark, for the sign-in screen and the rail's foot. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Mark size={22} />
      <span className="font-display text-[17px] font-extrabold tracking-tight text-primary">
        After<span className="text-brand-600 dark:text-brand-400">BI</span>
      </span>
    </span>
  );
}
