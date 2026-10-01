/**
 * The GetSchool mark: the G with the red square in its mouth.
 *
 * It is the official logo. The four squares it replaces belonged to the old
 * brand and are gone from the product, the icons and the share images.
 *
 * The G itself is drawn in `currentColor`, so it is white on the navy pages
 * and ink on a white one without a second file; only the square is fixed red.
 * `tile` adds the navy plate behind it, which is what an icon file needs and
 * what a bar that is already navy does not.
 */

import { cn } from '@/lib/cn';

export function Mark({
  size = 40,
  className,
  tile = false,
}: {
  size?: number;
  className?: string;
  /** The navy plate behind the mark, for an icon on an unknown background. */
  tile?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="GetSchool"
      focusable="false"
    >
      {tile && <rect width="64" height="64" rx="14" fill="#0a0f1e" />}
      {/* Drawn at the size a tile wants, and blown up to fill the box when
          there is no tile, so the mark is as bold inline as it is as an icon. */}
      <g transform={`translate(32 32) scale(${tile ? 1.22 : 1.6}) translate(-31.4 -31.6)`}>
      {/* The ring, cut at the top right, running into the stem at the bottom. */}
      <path
        d="M45.3 20.7 A17.2 17.2 0 1 0 40.1 45.1 L40.1 48.4 L48.6 48.4 L48.6 37.3 L39.4 37.3 A10.1 10.1 0 1 1 39.1 25.2 Z"
        fill="currentColor"
      />
      <rect x="40.1" y="27.1" width="8.5" height="8.1" rx="1.1" fill="#e8192b" />
      </g>
    </svg>
  );
}

/** The mark and the name together, as the bar and the footer draw it. */
export function Wordmark({ size = 32, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', tone === 'dark' ? 'text-white' : 'text-primary')}>
      <Mark size={size} className="text-current" />
      <span
        className="font-display font-extrabold leading-none tracking-[-0.05em]"
        style={{ fontSize: `${Math.round(size * 0.62)}px` }}
      >
        GetSchool<span className="text-brand-500">.</span>
      </span>
    </span>
  );
}
