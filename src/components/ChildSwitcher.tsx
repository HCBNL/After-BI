import { Avatar, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Student } from '@/types';
import { classLabelFor } from '@/lib/classLabel';
import { useSchool } from '@/context/SchoolContext';

export function ChildSwitcher({
  children,
  selectedId,
  onSelect,
  loading,
}: {
  children: Student[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}) {
  /*
   * The class list, only so a parent sees the word the school actually uses.
   *
   * A pupil record stores the canonical level — "Grade 5" — and stores it
   * deliberately, so that a school renaming a class does not rewrite records
   * already filed. The nickname lives on the class document and is applied
   * here, at the moment of display.
   */
  const { classes } = useSchool();

  if (loading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] w-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline surface-card px-5 py-4 text-[13.5px] text-muted">
        No children linked yet. Ask the school office.
      </div>
    );
  }

  if (children.length === 1) {
    const child = children[0];
    return (
      <div className="inline-flex items-center gap-3 rounded-2xl border border-hairline surface-card px-4 py-3 shadow-card">
        <Avatar name={`${child.firstName} ${child.lastName}`} src={child.photoURL} size="md" />
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-bold text-primary">
            {child.firstName} {child.lastName}
          </p>
          <p className="truncate text-[12px] text-muted">
            {classLabelFor(child.className, classes)} · {child.admissionNo}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="scrollbar-thin flex gap-3 overflow-x-auto pb-1"
      role="radiogroup"
      aria-label="Choose a child"
    >
      {children.map((child) => {
        const active = child.id === selectedId;
        return (
          <button
            key={child.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(child.id)}
            className={cn(
              'flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
              active
                ? 'border-brand-600 surface-card shadow-card ring-2 ring-brand-500/20'
                : 'border-hairline surface-card opacity-70 hover:opacity-100',
            )}
          >
            <Avatar
              name={`${child.firstName} ${child.lastName}`}
              src={child.photoURL}
              size="md"
              ring={active}
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-primary">
                {child.firstName} {child.lastName}
              </p>
              <p className="truncate text-[11.5px] text-muted">
                {classLabelFor(child.className, classes)} · {child.admissionNo}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
