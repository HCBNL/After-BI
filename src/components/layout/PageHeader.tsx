import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { usePageHeading } from './PageHeading';
import { PagePanel } from './PagePanel';
import { useBootDone } from '@/lib/boot';
import { Hint } from '@/components/ui/Hint';

/**
 * The top of a portal page.
 *
 * Inside a shell every screen opens on the coloured panel, the title and the
 * page's buttons on it, anything else (`children`) under it, so moving from
 * home into any screen never means moving from a designed page to a plain
 * one. The quiet header below is for anywhere without a shell.
 *
 * `description` is never printed under the title any more: it sits behind an
 * (i) beside it. Pages keep passing it, so the sentence is written once and
 * still there for anyone who taps. See `About` in PagePanel.
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
  useBootDone();

  useEffect(() => {
    setHeading(title);
    return () => setHeading(null);
  }, [title, setHeading]);

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
        {description ? (
          <Hint label={`About ${title}`}>{description}</Hint>
        ) : (
          <span />
        )}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

