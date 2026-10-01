/**
 * Class and subject, as two dropdowns on one line.
 *
 * WHY THIS EXISTS ALONGSIDE `ClassPicker`
 *
 * `ClassPicker` lays classes out as tiles, and for choosing where to go that is
 * the right shape — a head teacher scanning the whole school wants to see the
 * whole school. But on the score sheet the picker is not the screen. The marks
 * are the screen, and a teacher who takes three classes for two subjects was
 * losing half a phone to a field of chips before reaching a single mark. In the
 * demo school that is eight subject tiles wrapping to three rows above the
 * table they came to fill in.
 *
 * Two dropdowns cost two lines whatever the school's size, which is the whole
 * point: a school with fourteen classes and twenty subjects gets the same
 * compact header as a school with three and eight.
 *
 * NATIVE `<select>`, NOT A CUSTOM MENU
 *
 * On a phone a native select opens the operating system's own picker — a
 * spinning wheel on iOS, a full-height list on Android — which is bigger,
 * faster to scroll with a thumb, and already familiar. A custom dropdown would
 * be a smaller list rendered inside the page, which is worse on the device most
 * of these teachers use. It is also keyboard- and screen-reader-correct for
 * free.
 */

import type { SchoolClass, Subject } from '@/types';
import { classLabel } from '@/lib/classLabel';
import { cn } from '@/lib/cn';

export function ClassSubjectBar({
  classes,
  classId,
  onClassChange,
  subjects,
  subjectId,
  onSubjectChange,
  className,
}: {
  classes: SchoolClass[];
  classId: string;
  onClassChange: (id: string) => void;
  /** Omit to show the class dropdown on its own. */
  subjects?: Subject[];
  subjectId?: string;
  onSubjectChange?: (id: string) => void;
  className?: string;
}) {
  const showSubjects = Boolean(subjects && onSubjectChange);

  const field =
    'h-11 w-full min-w-0 rounded-xl border border-hairline bg-[var(--surface-card)] px-3 text-[14px] font-bold text-primary outline-none transition-colors focus:border-brand-500';

  return (
    /*
     * Side by side from the smallest phone up.
     *
     * Two half-width selects at 320px is about 140px each, which comfortably
     * holds "Grade 4" and truncates "Christian Religious Studies" — and a
     * truncated label in a closed dropdown costs nothing, because opening it
     * shows the full name. Stacking them would spend a second line to avoid a
     * problem that is not one.
     */
    <div className={cn('grid grid-cols-2 gap-2.5', !showSubjects && 'grid-cols-1', className)}>
      <label className="min-w-0">
        <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
          Class
        </span>
        <select
          value={classId}
          onChange={(e) => onClassChange(e.target.value)}
          className={field}
          aria-label="Class"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {classLabel(cls)}
            </option>
          ))}
        </select>
      </label>

      {showSubjects && (
        <label className="min-w-0">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
            Subject
          </span>
          <select
            value={subjectId ?? ''}
            onChange={(e) => onSubjectChange!(e.target.value)}
            className={field}
            aria-label="Subject"
          >
            {subjects!.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
