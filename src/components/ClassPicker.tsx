/**
 * Picking a class, from a dropdown.
 *
 * WHY IT IS NO LONGER A GRID OF TILES
 *
 * It was one button per class, laid out as a grid. That was defensible when a
 * school ran a handful of year groups and indefensible the moment one ran the
 * full set: a Nigerian school with Toddler through SS 3 is eighteen-odd
 * buttons, which on a phone wraps to four or five rows and pushes the thing
 * the person actually came for — the roll, the marks, the results — below the
 * fold on every single screen that filters by class. The filter was taking
 * more of the screen than the data it filters.
 *
 * And it is everywhere, because filtering by class is most of what this app
 * does: Students, Results, and every screen that grows one next.
 *
 * A dropdown costs one line whatever the school's size. That is the whole
 * argument: a school with three classes and a school with eighteen get the
 * same compact header, and the second one stops being punished for being big.
 *
 * NATIVE `<select>`, NOT A CUSTOM MENU
 *
 * The same reasoning `ClassSubjectBar` already runs on, and this file now
 * matches it rather than contradicting it. On a phone a native select opens
 * the operating system's own picker — a wheel on iOS, a full-height list on
 * Android — which is bigger, faster to thumb through and already familiar. A
 * custom dropdown would be a smaller list rendered inside the page, which is
 * worse on the device most of these people use, and it would need keyboard and
 * screen-reader handling the browser gives away for nothing.
 *
 * `<optgroup>` carries the section headings the old grid drew by hand, so
 * Nursery, Grade and Secondary are still separated inside the list.
 *
 * WHAT THIS FILE STILL EXPORTS, AND WHY
 *
 * `ChoiceTile` and `ChoiceGrid` stay. The score sheet uses them for *terms* —
 * three of them, on one line, where a dropdown would be two taps to choose
 * between three things. The tile was never wrong; it was wrong for a list that
 * grows.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { Select } from '@/components/ui';
import type { SchoolClass, SchoolSection } from '@/types';
import { classLabel } from '@/lib/classLabel';

/* --------------------------------------------------------------- the value */

export interface ClassFilter {
  section?: SchoolSection;
  /** Set once a single class is chosen. */
  classId?: string;
}

export const NO_CLASS_FILTER: ClassFilter = {};

export const SECTION_ORDER: SchoolSection[] = [
  'Toddler',
  'Nursery',
  'Grade',
  'Junior',
  'Secondary',
];

/**
 * The five groups, as a teacher says them out loud.
 *
 * They are already short, so this is a straight echo of the section name —
 * kept because every heading in the app reads through it, and a future rename
 * should have one place to happen rather than nine.
 */
export const SECTION_SHORT: Record<SchoolSection, string> = {
  Toddler: 'Toddler',
  Nursery: 'Nursery',
  Grade: 'Grade',
  Junior: 'Junior',
  Secondary: 'Secondary',
};

/* ------------------------------------------------------------- the options */

/** Below this many classes, section headings inside the list are noise. */
const GROUP_ABOVE = 7;

interface Group {
  section: SchoolSection;
  rows: SchoolClass[];
}

/**
 * The option list, built once and shared by both components below.
 *
 * Sorted by `levelOrder` rather than by name, which is the only ordering a
 * school recognises: "Grade 10" sorts before "Grade 2" alphabetically, and a
 * head teacher scanning for Primary 4 should not have to hunt.
 */
function useClassOptions(classes: SchoolClass[]): { ordered: SchoolClass[]; groups: Group[] | null } {
  const ordered = useMemo(
    () => [...classes].sort((a, b) => a.levelOrder - b.levelOrder),
    [classes],
  );

  return useMemo(() => {
    if (ordered.length <= GROUP_ABOVE) return { ordered, groups: null };

    const groups: Group[] = SECTION_ORDER.map((section) => ({
      section,
      rows: ordered.filter((c) => c.section === section),
    })).filter((group) => group.rows.length > 0);

    /*
     * A class whose section is not one of the five would vanish from a grouped
     * list entirely — selectable in the data, invisible in the control. Old
     * records and hand-edited documents both produce that, so anything
     * unaccounted for gets a trailing group rather than disappearing.
     */
    const grouped = new Set(groups.flatMap((g) => g.rows.map((r) => r.id)));
    const rest = ordered.filter((c) => !grouped.has(c.id));
    if (rest.length) groups.push({ section: 'Other' as SchoolSection, rows: rest });

    return { ordered, groups };
  }, [ordered]);
}

function optionsFor(ordered: SchoolClass[], groups: Group[] | null, showCounts: boolean) {
  const one = (cls: SchoolClass) => (
    <option key={cls.id} value={cls.id}>
      {classLabel(cls)}
      {showCounts && typeof cls.studentCount === 'number' ? ` (${cls.studentCount})` : ''}
    </option>
  );

  if (!groups) return ordered.map(one);

  return groups.map((group) => (
    <optgroup key={group.section} label={SECTION_SHORT[group.section] ?? group.section}>
      {group.rows.map(one)}
    </optgroup>
  ));
}

/* -------------------------------------------------------------- the picker */

export interface ClassPickerProps {
  /** The classes this person is allowed to choose between. */
  classes: SchoolClass[];
  value: ClassFilter;
  onChange: (next: ClassFilter) => void;
  /** Offer a "whole school" choice — for list screens that can show everything. */
  allowAll?: boolean;
  allLabel?: string;
  /** Show the student count beside each class. Off where it means nothing. */
  showCounts?: boolean;
  /** Printed above the dropdown. Pass `null` to drop it. */
  label?: string | null;
  className?: string;
}

/** One dropdown. The whole class filter, on one line, at any school size. */
export function ClassPicker({
  classes,
  value,
  onChange,
  allowAll = false,
  allLabel = 'All classes',
  showCounts = false,
  label = 'Class',
  className,
}: ClassPickerProps) {
  const { ordered, groups } = useClassOptions(classes);

  /*
   * `''` is "nothing chosen".
   *
   * A screen that does not offer "all" can still have an empty filter on its
   * first render, before a default is picked. Without a placeholder option the
   * browser draws the first class in the list while the filter underneath says
   * nothing is selected — so the box and the rows disagree, and the person is
   * looking at Grade 1 under a heading that says Grade 4.
   */
  const current = value.classId ?? '';
  const unset = !value.classId;

  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
      )}
      <Select
        value={current}
        aria-label={label ?? 'Class'}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) {
            onChange(NO_CLASS_FILTER);
            return;
          }
          const cls = ordered.find((c) => c.id === id);
          onChange({ section: cls?.section, classId: id });
        }}
      >
        {allowAll ? (
          <option value="">{allLabel}</option>
        ) : (
          unset && (
            <option value="" disabled>
              Choose a class…
            </option>
          )
        )}
        {optionsFor(ordered, groups, showCounts)}
      </Select>
    </div>
  );
}

/**
 * The same control, kept under its old name.
 *
 * It used to be a summary button that unfolded the tile grid, which is why it
 * took `open` and `onToggle`. There is nothing left to unfold — the dropdown
 * IS the folded state — so both are optional and ignored. They stay in the
 * type so the screens passing them keep compiling, and so that tidying those
 * screens is a separate, reviewable change rather than a condition of this one.
 */
export function ClassPickerBar({
  open: _open,
  onToggle: _onToggle,
  ...props
}: ClassPickerProps & { open?: boolean; onToggle?: () => void }) {
  return <ClassPicker {...props} />;
}
