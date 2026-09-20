import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Hint } from '@/components/ui/Hint';
import { usePageHeading } from './PageHeading';

/**
 * The top of a portal page: what you can do to it.
 *
 * Notably *not* the page's title. The title is handed up to the shell's sticky
 * bar, which already had one — printing it here as well was the same word twice
 * in the top two inches of every screen. The heading element still exists for
 * screen readers and for the document outline; it is just not drawn.
 *
 * WHY `description` IS NO LONGER PRINTED
 *
 * It used to render as a paragraph directly under the bar, on all thirty
 * screens. Individually each one is a good sentence. Collectively they meant
 * every screen in the product opened on a block of explanation, the first
 * table sat a hundred pixels lower than it needed to, and on a phone the
 * actual work was below the fold. The text is still worth having — it answers
 * "what is this screen for" for somebody seeing it the first time — so it is
 * handed to the sticky bar and folded behind the (i) next to the title.
 *
 * The prop keeps its name so that no call site had to change, and so that
 * writing a description is still the natural thing to do.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  /** One sentence on what the screen is for. Shown behind the (i) in the bar. */
  description?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const { setHeading } = usePageHeading();

  useEffect(() => {
    setHeading(title, description ?? null);
    // Hand the bar back to the navigation label when this page unmounts,
    // otherwise the next page briefly wears this one's name.
    return () => setHeading(null, null);
  }, [title, description, setHeading]);

  const bare = !actions && !children;
  if (bare) return <h2 className="sr-only">{title}</h2>;

  return (
    <div className={cn('mb-5', className)}>
      <h2 className="sr-only">{title}</h2>
      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2.5">
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      )}
      {children && <div className={actions ? 'mt-4' : undefined}>{children}</div>}
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
