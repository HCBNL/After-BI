/**
 * What a screen looks like before its data arrives.
 *
 * WHAT THIS REPLACED, AND WHY
 *
 * A brand mark whose four squares pulsed in sequence, held back 320ms so it
 * would not flash. It was the nicest thing in the app and it was the wrong
 * answer, for three reasons that only became obvious once the app was fast:
 *
 *   1. It says "wait" without saying what for. A logo breathing at somebody
 *      carries no information about what is coming or how much of it.
 *   2. It takes no room, or the wrong room. Every screen using it collapsed to
 *      a centred badge and then sprang open when the content landed, so the
 *      page moved twice on every load — which is most of what "the site feels
 *      slow" actually is. Movement reads as slowness even when the numbers say
 *      otherwise.
 *   3. The 320ms delay was a patch on the first two. A loader you have to hide
 *      for a third of a second to stop it being annoying is a loader that
 *      should not exist.
 *
 * A skeleton has none of those problems. It appears immediately, because it is
 * not an apology for a wait, it is the page arriving in two stages: the shape
 * first, the words second. Nothing moves when the second stage lands, which is
 * the whole trick.
 *
 * THE OBJECTION, ANSWERED
 *
 * The old comment here argued against skeletons: "a skeleton is a promise
 * about a shape, and every screen has a different shape, so the promise was
 * usually wrong." That is true of one generic skeleton used everywhere, and it
 * is why this one takes a `variant`. Four shapes cover every screen in the
 * app — a list of cards, a grid of cards, a table, a page of prose — and a
 * caller that picks the wrong one is a two-word fix rather than an argument
 * against the technique.
 *
 * `label` is still read out to a screen reader. It is simply no longer printed
 * on the page, because a person watching the shape of their own screen build
 * itself does not need to be told it is loading.
 */

import { cn } from '@/lib/cn';

/** "GetSchool." in the display face, the full stop in the pen's red. */
function Word({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-extrabold leading-none tracking-[-0.05em]', className)}>
      GetSchool<span className="text-brand-500">.</span>
    </span>
  );
}

/**
 * The start-up screen, and the same one the public pages open with: the
 * wordmark and a red line running under it, on navy in both themes.
 *
 * WHY THE MARK WENT
 *
 * It used to be the four-square mark filling itself in. The public site
 * opens on the wordmark instead, and a person who signs in from there should
 * not watch the brand change shape between one screen and the next. One
 * loader, everywhere: `index.html`'s boot screen, this, and `Loading`.
 */
export function SplashScreen({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="night fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <Word className="text-[30px] text-white" />
      <span className="boot-line" aria-hidden />
      <p className={label ? 'text-[12.5px] font-medium text-white/55' : 'sr-only'}>{label ?? 'Loading'}</p>
    </div>
  );
}

export function Loading({
  label = 'Loading',
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
  /** Kept so older call sites still compile. The loader has one shape now. */
  variant?: string;
  /** Kept so older call sites still compile. The loader has one shape now. */
  rows?: number;
}) {
  /* The start-up screen in miniature: the wordmark and the running line. */
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-6' : 'min-h-[220px] py-12',
        className,
      )}
    >
      {!compact && <Word className="text-[22px] text-primary" />}
      <span className="boot-line" aria-hidden />
      <p className="text-[12.5px] font-medium text-muted">{label}</p>
    </div>
  );
}

/**
 * A public page's code on its way.
 *
 * The wordmark on the site's navy, and nothing else moving.
 *
 * This used to be the full start-up screen, running line included, which meant
 * a visitor arriving at getschool.app was shown a progress bar before they had
 * agreed to wait for anything. On the marketing site a loader is a cost with
 * no benefit: the page is held until it is complete anyway (see `usePageGate`
 * in `marketing/kit.tsx`), so the indicator only advertises the delay it is
 * covering. The portal keeps its loader — somebody already signed in has
 * committed, and silence there reads as broken.
 */
export function PageSkeleton(_props: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="night fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
    >
      <Word className="text-[30px] text-white" />
      <p className="sr-only">Loading</p>
    </div>
  );
}

/** A portal screen's code, or the sign-in, on its way: the start-up screen. */
export function ShellSkeleton() {
  return <SplashScreen />;
}

/**
 * What a screen shows while the school is loading. The school gate in
 * `AppShell` and the home screen both use it, with the same words, so the
 * hand-over from one to the other is invisible.
 */
export function BrandLoader({ label = 'Getting your school ready' }: { label?: string }) {
  return <SplashScreen label={label} />;
}
