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
import { Hint } from '@/components/ui/Hint';
import { usePageHeading } from './PageHeading';
import { useAuth } from '@/context/AuthContext';
import { PORTAL_ROOT } from '@/lib/tiles';

/**
 * What a page is for, behind an (i) beside its title.
 *
 * Every page used to carry a sentence of description under the title. On a
 * phone that sentence wrapped to three lines and pushed the page's own
 * buttons, and the content, a third of a screen further down: on the
 * twentieth visit to Invoices nobody needs telling what Invoices is. The
 * title stands on its own; the sentence is one tap away for the first visit.
 */
function About({ title, text }: { title: string; text: string }) {
  return (
    <Hint label={`About ${title}`} className="shrink-0 [&>button]:text-white/70 [&>button:hover]:text-white">
      {text}
    </Hint>
  );
}

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
          <div className="flex max-w-[72%] items-center gap-1.5">
            <h1 className="truncate text-title font-bold">{title}</h1>
            {description && <About title={title} text={description} />}
          </div>
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
            {description && <About title={title} text={description} />}
          </div>
          {actions && (
            <div className="ab-on-panel mt-1 flex flex-wrap items-center justify-center gap-2 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:justify-end">
              {actions}
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
