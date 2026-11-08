import { cn } from '@/lib/cn';

/**
 * Waiting, drawn as the shape of what is coming.
 *
 * Every loading state in this app is a skeleton rather than a spinner, with one
 * exception (`BrandLoader`, where nothing below knows its shape yet). The
 * reason is not fashion:
 * a spinner tells you nothing about what is arriving, so a slow screen and a
 * broken screen look identical, and people reload: which on a bad connection
 * makes it slower. A skeleton that matches the real layout means the page does
 * not jump when data lands, which is the other half of the effect.
 */

/**
 * The brand, while a whole screen waits on something it cannot draw yet.
 *
 * Used where a skeleton would be a lie, the organisation has not resolved, so
 * nothing below knows its own shape. Everywhere else, draw the shape.
 */
export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return <BootSplash label={label} />;
}

export function Loading({
  label,
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} aria-busy>
      {label && <p className="sr-only">{label}</p>}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="surface-card rounded-2xl border border-hairline p-4 shadow-card">
          <div className="skeleton h-3 w-28 rounded-full" />
          <div className="skeleton mt-3 h-4 w-full max-w-sm rounded-full" />
          <div className="skeleton mt-2 h-4 w-2/3 max-w-xs rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A plain page. The fallback of last resort, for a route that is neither. */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="skeleton h-8 w-1/2 rounded-lg" />
      <div className="skeleton mt-4 h-4 w-full rounded-full" />
      <div className="skeleton mt-2 h-4 w-5/6 rounded-full" />
      <Loading className="mt-10" rows={2} />
    </div>
  );
}

/**
 * The public site, before its chunk has arrived.
 *
 * Every public page opens the same way, a dark bar, then an ink band with a
 * heading and two buttons in it, so that is what this draws. The point is the
 * same as everywhere else in this app: the first frame is the shape of what is
 * coming, so nothing jumps when it lands.
 *
 * It matters more here than in the portal, because this is the frame a
 * first-time visitor on a slow connection judges the product by. A white page
 * with a grey pill on it for a second and a half reads as broken; this reads
 * as loading.
 */
export function SiteSkeleton() {
  return <BootSplash />;
}

/**
 * The AfterBI mark, filling bar by bar like a network signal. The same drawing
 * and animation as the splash in index.html (the keyframes live there, in the
 * page head, so the very first frame already moves).
 */
export function SignalMark({ size = 88 }: { size?: number }) {
  return (
    <svg className="ab-signal" viewBox="-8 -14 146 146" width={size} height={size} overflow="visible" aria-hidden>
      <defs>
        <linearGradient id="abs1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7a1a" /><stop offset="1" stopColor="#f2332b" /></linearGradient>
        <linearGradient id="abs2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd21f" /><stop offset="1" stopColor="#f5a400" /></linearGradient>
        <linearGradient id="abs3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3ddc7a" /><stop offset="1" stopColor="#02a05c" /></linearGradient>
        <linearGradient id="abs4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#45b0ff" /><stop offset="1" stopColor="#0e6dfd" /></linearGradient>
      </defs>
      <g transform="skewX(-9) translate(14 0)">
        <rect className="b1" x="3" y="78" width="25" height="36" rx="12.5" fill="url(#abs1)" />
        <rect className="b2" x="35" y="55" width="25" height="59" rx="12.5" fill="url(#abs2)" />
        <rect className="b3" x="67" y="37" width="25" height="77" rx="12.5" fill="url(#abs3)" />
        <rect className="b4" x="99" y="20" width="25" height="94" rx="12.5" fill="url(#abs4)" />
      </g>
    </svg>
  );
}

/** The whole screen while the app (or the website) is on its way: the mark and the name. */
export function BootSplash({ label = 'Loading AfterBI' }: { label?: string }) {
  return (
    <div className="ab-splash fixed inset-0 z-[60] flex flex-col items-center justify-center gap-1.5" role="status" aria-label={label}>
      <SignalMark size={104} />
      <span className="font-display text-display font-bold leading-none tracking-[-0.04em] text-primary">AfterBI</span>
      <span className="ab-tag mt-1.5">Sales and distribution, connected</span>
    </div>
  );
}

export function ShellSkeleton() {
  return <BootSplash />;
}

/**
 * Inside the shell, while a screen's code or data loads: the AfterBI logo,
 * exactly as it is, centred on the space the screen is going to fill. Nothing
 * around it, no halo, no colour wash, no bar. It fades in after a beat, so a
 * screen that is ready at once never flashes it.
 *
 * WHY THIS IS NOT `fixed inset-0`
 *
 * It used to be, and on a desktop the logo sat visibly left of where it
 * belonged. `fixed inset-0` centres on the viewport, and the viewport includes
 * the navigation rail: with a 365px rail on a 1920px screen the content starts
 * at 365 and its true centre is near 1142, while the mark sat at 960. Far
 * enough off to read as a bug rather than a loading state, and it drifted
 * again every time the rail was collapsed or expanded.
 *
 * Centring in the ordinary flow instead means the content column does the
 * arithmetic: the loader is a child of `main`, so it is already inside the
 * rail's offset and lands dead centre at every rail width, on every breakpoint,
 * with no measuring and no variable to keep in step.
 *
 * `fullscreen` is for the one caller that genuinely has no shell around it yet,
 * the organisation gate, which runs before the rail is drawn. There the
 * viewport IS the section, so centring on it is correct.
 */
export function QuietLoader({
  label = 'Loading',
  inline = false,
  fullscreen = false,
}: {
  label?: string;
  /** Shorter: for a loader under a page's own panel, where the heading already fills the top. */
  inline?: boolean;
  /** Only before the shell exists. Inside it, this puts the mark off-centre. */
  fullscreen?: boolean;
}) {
  const mark = (
    <img
      src="/brand/afterbi-mark.png"
      alt=""
      width={64}
      height={64}
      className="h-16 w-16 select-none object-contain"
      draggable={false}
    />
  );

  if (fullscreen) {
    return (
      <div
        role="status"
        aria-label={label}
        className="ab-quiet fixed inset-0 z-30 flex items-center justify-center"
      >
        {mark}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'ab-quiet flex w-full items-center justify-center',
        inline ? 'min-h-[38vh] py-10' : 'min-h-[60vh]',
      )}
    >
      {mark}
      <span className="sr-only">{label}</span>
    </div>
  );
}
