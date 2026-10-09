import { useEffect, type ReactNode } from 'react';
import { Hint } from '@/components/ui/Hint';
import { cn } from '@/lib/cn';
import { usePageHeading } from './PageHeading';
import { PagePanel } from './PagePanel';

/**
 * The top of a portal page: what it is for, and what you can do to it.
 *
 * Notably *not* the page's title. The title is handed up to the shell's sticky
 * bar, which already had one — printing it here as well was the same word twice
 * in the top two inches of every screen. The heading element still exists for
 * screen readers and for the document outline; it is just not drawn.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const { setHeading, inShell } = usePageHeading();

  useEffect(() => {
    setHeading(title);
    // Hand the bar back to the navigation label when this page unmounts,
    // otherwise the next page briefly wears this one's name.
    return () => setHeading(null);
  }, [title, setHeading]);

  /*
   * Inside the school shell every screen opens on the red panel: title,
   * description and buttons on it, anything else (`children`) under it. The
   * quiet header below is for shells that cannot host a panel.
   */
  if (inShell) {
    return (
      <>
        <PagePanel title={title} description={description} actions={actions} className="mb-3" />
        {children && <div className={cn('mb-5', className)}>{children}</div>}
      </>
    );
  }

  const bare = !description && !actions && !children;
  if (bare) return <h2 className="sr-only">{title}</h2>;

  return (
    <div className={cn('mb-5', className)}>
      <h2 className="sr-only">{title}</h2>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        {description ? <Hint label={`About ${title}`}>{description}</Hint> : <span />}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

