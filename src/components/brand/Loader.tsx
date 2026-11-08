import { cn } from '@/lib/cn';

/**
 * Waiting, drawn as the shape of what is coming.
 *
 * Every loading state in this app is a skeleton rather than a spinner. The
 * reason is not fashion: a spinner tells you nothing about what is arriving,
 * so a slow screen and a broken screen look identical, and people reload,
 * which on a bad connection makes it slower. A skeleton that matches the real
 * layout means the page does not jump when data lands, which is the other
 * half of the effect.
 *
 * WHERE THE LOGO IS ALLOWED, WHICH IS ALMOST NOWHERE
 *
 * The mark belongs to arrival, not to navigation. It is drawn on the boot
 * splash, before the app exists at all, and on the home screen, which is the
 * one place a person lands rather than clicks into. Everywhere else, opening
 * a screen shows the screen.
 *
 * It used to show on every route change, and that is a worse experience than
 * nothing: the logo flashing between two pages makes a 90ms navigation feel
 * like a page load, and after the fourth or fifth time in a session it reads
 * as the app being slow rather than as the app being branded. Chunks are
 * small and usually cached, so the honest answer for a route is to show
 * nothing for the moment it takes and let the screen appear.
 */

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
function SignalMark({ size = 88 }: { size?: number }) {
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
function BootSplash({ label = 'Loading AfterBI' }: { label?: string }) {
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
 * WHY THIS IS NEITHER `fixed inset-0` NOR A HEIGHT IN THE FLOW
 *
 * Both have been tried and each missed one axis.
 *
 * `fixed inset-0` centres on the viewport, and the viewport includes the
 * navigation rail: with a 365px rail on a 1920px screen the content starts at
 * 365 and its true centre is near 1142, while the mark sat at 960. Off
 * horizontally, and it drifted again every time the rail was collapsed.
 *
 * Centring in the flow with `min-h-[60vh]` fixed that axis and broke the
 * other. A box 60vh tall, opening below `main`'s top padding, has its middle
 * around a third of the way down the screen, so the mark sat high: correct
 * left to right, visibly above centre top to bottom.
 *
 * So the loader is absolute against `main`, which is the one element that
 * already knows both the rail's width and the header's height, and `flex-1`
 * so it owns whatever vertical space is left. `inset-0` on it lands the mark
 * dead centre on both axes at every rail width and breakpoint, with nothing
 * measured and no variable to keep in step. The bottom is pulled in by the
 * mobile bar's own height, because `inset` is measured against the padding
 * box and that padding exists to keep content out from behind the bar.
 *
 * `fullscreen` is for the one caller that genuinely has no shell around it
 * yet, the organisation gate, which runs before the rail is drawn. There the
 * viewport IS the section, so centring on it is correct.
 *
 * There was an `inline` variant too, for a loader sitting under a page's own
 * heading. Those screens draw `Loading` skeletons now, so it had no callers
 * left and has gone with them.
 */
export function QuietLoader({
  label = 'Loading',
  fullscreen = false,
}: {
  label?: string;
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
      /* Absolute against `main` (which is `relative`): see the note above. The
         bottom inset is the mobile bar's own padding, so the mark centres on
         the space a page would actually occupy rather than behind the bar. */
      className="ab-quiet absolute inset-x-0 top-0 bottom-[calc(var(--bottom-bar-h)+var(--safe-bottom))] flex items-center justify-center lg:bottom-0"
    >
      {mark}
      <span className="sr-only">{label}</span>
    </div>
  );
}
