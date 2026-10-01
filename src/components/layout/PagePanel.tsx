/**
 * The home screen's red panel, for every other page.
 *
 * Every school screen now opens with it — through `PageHeader`, which draws
 * one of these whenever the page sits inside the school shell — so moving from
 * home into any screen no longer means moving from a designed page to a plain
 * one. The same surface as the home panel: `--hero`, the cubes, the curve.
 *
 * WHAT IT DOES TO THE SHELL
 *
 * While it is on screen it tells the shell (through `PageHeading`) to hide the
 * white header, as the shell already does on home, so the red runs from the
 * top of the glass. That is set in a layout effect, before the first paint, so
 * the white header never flashes. It also tints the browser's own bar
 * (`useBrowserChrome`) and, on a laptop, runs edge to edge of the content
 * column (`.gs-panel` in index.css).
 *
 * Because the white header is gone, the panel carries what it held: a back
 * button and the title on a phone; the title, notices, the theme switch and
 * the photograph on a laptop, where the rail already does the navigating.
 *
 * A page's own buttons (`actions`) sit on the panel too, redrawn for red by
 * `.gs-on-panel` in index.css: the main one solid white, the rest glass.
 */

import { useLayoutEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBrowserChrome } from '@/hooks/useBrowserChrome';
import { Squares } from '@/components/home/HomeArt';
import { HeroThemeButton } from '@/components/home/HomeDesk';
import { NoticesButton, ProfilePhoto } from '@/components/home/HomeHero';
import { Hint } from '@/components/ui/Hint';
import { cn } from '@/lib/cn';
import { usePageHeading } from './PageHeading';

export function PagePanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  /** One line under the title. */
  description?: string;
  /** The page's own buttons, drawn for the red panel. */
  actions?: ReactNode;
  /** Anything else that belongs on the panel, under the title. */
  children?: ReactNode;
  className?: string;
}) {
  const { setPanel } = usePageHeading();
  const { user } = useAuth();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    setPanel(true);
    return () => setPanel(false);
  }, [setPanel]);
  useBrowserChrome();

  return (
    <section className={cn('gs-hero gs-panel relative isolate overflow-hidden pb-12 text-white lg:pb-[4.5rem]', className)}>
      <Squares className="pointer-events-none absolute -right-20 -top-16 -z-10 h-72 w-72 rotate-[14deg] text-white/[0.05] lg:h-[28rem] lg:w-[28rem]" />
      <Squares className="pointer-events-none absolute -bottom-24 left-[40%] -z-10 hidden h-64 w-64 -rotate-12 text-white/[0.03] lg:block" />

      {/* The phone's status bar sits here, on the panel's own colour. */}
      <div aria-hidden className="app-top-inset" />

      {/* 1440 = the page's 1400px plus its padding, so the text lines up with the cards below. */}
      <div className="mx-auto max-w-[1440px] px-4 pt-2 sm:px-5 lg:pt-6">
        {/* Phone: back, and the title in the middle — the menu sheet's shape. */}
        <div className="relative flex h-11 items-center justify-center lg:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="tap absolute -left-1 flex items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={21} aria-hidden />
          </button>
          <span className="flex max-w-[72%] items-center gap-1.5">
            <h1 className="truncate text-[16px] font-bold">{title}</h1>
            {description && <Hint onDark align="right" label={`About ${title}`}>{description}</Hint>}
          </span>
        </div>

        {/* Laptop: the title on the left, the header's three controls on the right. */}
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <span className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-[30px] font-bold leading-tight tracking-[-0.025em]">{title}</h1>
            {description && <Hint onDark label={`About ${title}`}>{description}</Hint>}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {user && <NoticesButton role={user.role} />}
            <HeroThemeButton />
            {user && <ProfilePhoto user={user} />}
          </div>
        </div>

        {actions && (
          <div className="mt-1 flex flex-col items-center gap-4 text-center lg:mt-2 lg:flex-row lg:items-end lg:justify-between lg:text-left">
            {actions && (
              <div className="gs-on-panel flex flex-wrap items-center justify-center gap-2 lg:ml-auto lg:justify-end">
                {actions}
              </div>
            )}
          </div>
        )}

        {children && <div className="mt-4 lg:mt-6">{children}</div>}
      </div>

      {/* The curve: the page rising over the panel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-t-[28px] surface-page shadow-[0_-14px_30px_-16px_rgba(0,0,0,0.5)] lg:h-9 lg:rounded-t-[36px]"
      />
    </section>
  );
}
