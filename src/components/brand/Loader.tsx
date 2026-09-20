import { cn } from '@/lib/cn';
import { MarkLoading } from './Mark';

/**
 * Waiting, drawn as the shape of what is coming.
 *
 * Every loading state in this app is a skeleton rather than a spinner, with one
 * exception (`ShellSkeleton`'s mark, at cold boot). The reason is not fashion:
 * a spinner tells you nothing about what is arriving, so a slow screen and a
 * broken screen look identical, and people reload — which on a bad connection
 * makes it slower. A skeleton that matches the real layout means the page does
 * not jump when data lands, which is the other half of the effect.
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

/** A plain page, for the public routes. */
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
 * The app's own furniture, before the app exists.
 *
 * Drawn to match `AppShell` exactly — a rail on the left at lg, a header bar, a
 * card, a shortcut grid, a bottom bar — so that when React takes over there is
 * no moment where the layout changes. The static shell in `index.html` paints
 * the same shape from the first frame, which is what removes the white flash
 * entirely.
 */
export function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh surface-page" aria-busy>
      <aside className="hidden w-[232px] shrink-0 border-r border-hairline surface-card p-3 lg:block">
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-full rounded-xl" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-hairline surface-card">
          <div className="status-bar-fill" aria-hidden />
          <div className="flex h-14 items-center gap-3 px-3 sm:h-16 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="skeleton h-4 w-44 rounded-full" />
              <div className="skeleton mt-2 h-2.5 w-28 rounded-full" />
            </div>
            <div className="skeleton h-9 w-9 rounded-full" />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-5 sm:py-6">
          <div className="mx-auto max-w-[1400px]">
            <div className="min-h-[168px] rounded-[var(--radius-card)] border border-hairline surface-card p-4 shadow-card sm:min-h-[186px] sm:p-5 lg:max-w-[720px]">
              <div className="skeleton h-2.5 w-24 rounded-full" />
              <div className="skeleton mt-3 h-8 w-28 rounded-lg" />
              <div className="skeleton mt-3 h-3 w-full max-w-[15rem] rounded-full" />
            </div>

            <div className="surface-card mt-5 rounded-2xl border border-hairline p-3 shadow-card sm:p-4">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 py-2.5">
                    <div className="skeleton h-11 w-11 rounded-xl" />
                    <div className="skeleton h-2.5 w-10 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 flex h-[3.75rem] items-center justify-center border-t border-hairline surface-card lg:hidden">
        <MarkLoading size={26} />
      </div>
    </div>
  );
}
