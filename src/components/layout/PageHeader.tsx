import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Hint } from '@/components/ui/Hint';
import { usePageHeading } from './PageHeading';
import { PagePanel } from './PagePanel';

/**
 * The top of a portal page.
 *
 * Inside a shell every screen opens on the coloured panel, title, one line of
 * description and the page's buttons on it, anything else (`children`) under
 * it, so moving from home into any screen never means moving from a designed
 * page to a plain one. The quiet header below is for anywhere without a shell.
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
          <p className="min-w-0 max-w-2xl text-[13.5px] leading-relaxed text-secondary">{description}</p>
        ) : (
          <span />
        )}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="flex items-center gap-1.5">
        <h3 className="text-[16px] font-bold text-primary">{title}</h3>
        {description && <Hint label={`About ${title}`}>{description}</Hint>}
      </div>
      {action}
    </div>
  );
}
