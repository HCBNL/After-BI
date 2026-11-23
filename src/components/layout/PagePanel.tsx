/**
 * The home screen's coloured panel, for every other page.
 *
 * While it is up it tells the shell to hide its white header (so the colour
 * runs from the top of the glass), tints the browser's own bar, and on a
 * laptop runs edge to edge of the content column (`.ab-panel` in index.css).
 * A page's buttons sit on it, redrawn for the panel by `.ab-on-panel`.
 */
import { useLayoutEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBrowserChrome } from '@/hooks/useBrowserChrome';
import { BrandBars } from '@/components/home/HomeArt';
import { cn } from '@/lib/cn';
import { GuideButton } from '@/components/guide/PageGuide';
import { usePageHeading } from './PageHeading';
import { useAuth } from '@/context/AuthContext';
import { PORTAL_ROOT } from '@/lib/tiles';

/*
 * What a page is for sits behind the (i) at the top right: a short story for
 * the pages with several things worth knowing, one card for the rest
 * (components/guide/PageGuide.tsx). It mirrors the back button on the left.
 */

export function PagePanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { setPanel } = usePageHeading();
  const navigate = useNavigate();
  const { user } = useAuth();
  /* Back to the screen before; opened straight from a link (nothing before it in this app), back to home instead. */
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(user ? PORTAL_ROOT[user.role] : '/', { replace: true });
  };

  useLayoutEffect(() => {
    setPanel(true);
    return () => setPanel(false);
  }, [setPanel]);
  useBrowserChrome();

  return (
    <section
      className={cn('ab-hero ab-panel ab-sheet-over relative isolate overflow-hidden pb-10 text-white lg:pb-16', className)}
    >
      <BrandBars className="pointer-events-none absolute -right-14 -top-8 -z-10 h-64 w-64 text-white/[0.05] lg:h-[24rem] lg:w-[24rem]" />

      <div aria-hidden style={{ height: 'var(--safe-top)' }} />

      <div className="mx-auto max-w-[1440px] px-4 pt-3 sm:px-5 sm:pt-4 lg:pt-7">
        <div className="relative flex h-11 items-center justify-center lg:hidden">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="absolute -left-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.12] text-white transition-colors hover:bg-white/20 active:bg-white/25"
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
          <h1 className="max-w-[68%] truncate text-title font-bold">{title}</h1>
          <GuideButton title={title} description={description} className="absolute -right-1" />
        </div>

        {/*
          On a laptop: the title on the left and the page's own buttons on the
          right, in ONE row, centred on each other. The language, balances and
          theme buttons that used to stack above them now live in the floating
          button (QuickDial), so the panel is only as tall as this row. On a
          phone the title is in the bar above and the page's buttons sit centred.
        */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-x-6">
          <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              title="Go back"
              className="mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/20 active:bg-white/25"
            >
              <ArrowLeft size={20} aria-hidden />
            </button>
            <h1 className="truncate font-display text-display font-extrabold leading-tight tracking-[-0.03em]">{title}</h1>
          </div>
          {actions && (
            <div className="ab-on-panel mt-1 flex flex-wrap items-center justify-center gap-2 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:justify-end">
              {actions}
              <GuideButton title={title} description={description} className="hidden lg:flex" />
            </div>
          )}
          {!actions && (
            <div className="hidden lg:col-start-2 lg:row-start-1 lg:flex lg:justify-end">
              <GuideButton title={title} description={description} />
            </div>
          )}
        </div>

        {children && <div className="mt-4 lg:mt-6">{children}</div>}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-t-[28px] surface-page shadow-[0_-14px_30px_-16px_rgba(0,0,0,0.5)] lg:h-9 lg:rounded-t-[36px]"
      />
    </section>
  );
}
