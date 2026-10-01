import { SchoolLogo } from '@/components/brand/SchoolLogo';
import { Badge } from '@/components/ui';
import { useSchoolBrand } from '@/context/BrandContext';
import {
  ASSESSMENT_COLUMNS,
  scaleForClass,
  showsOverallPosition,
  gradeGroupOf,
  gradingPolicy,
  ordinal,
  AFFECTIVE_TRAITS,
  PSYCHOMOTOR_SKILLS,
  RATING_LABEL,
} from '@/lib/grading';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Student, TermResult } from '@/types';

export function ReportCardView({
  result,
  student,
}: {
  result: TermResult;
  student: Student | null;
}) {
  const school = useSchoolBrand();
  /*
   * `Grade` was missing, and that is a real fault rather than tidiness.
   *
   * The year groups were renamed from "Primary 4" to "Grade 4", and this
   * regular expression was not, so every primary report card in the product
   * has been printing the WAEC secondary key — A1 to F9 — against a nine year
   * old's marks. `className` is always the canonical level and never the
   * school's own nickname for the class, precisely so that a rename cannot
   * reach this line.
   */
  /*
   * Superseded: the school now says which scale it uses, per section, in
   * Settings. The name test above was a guess, and it was wrong for any school
   * that calls its classes "Basic 4" rather than "Grade 4".
   *
   * `showPosition` governs the FAMILY's view only. Staff see position on the
   * broadsheet and results screen whatever this says, because the office needs
   * it to run the school.
   */
  const scale = scaleForClass(school, result);
  const showPosition = showsOverallPosition(school, result);
  const showClassFigures =
    gradingPolicy(school)[gradeGroupOf(result)].showClassFigures ?? false;

  return (
    <article className="surface-card overflow-hidden rounded-2xl border border-hairline shadow-card">
      {/* ------------------------------------------------------------ head */}
      <header className="relative overflow-hidden bg-brand-950 px-5 py-5 sm:px-7">
        <div className="texture-crest absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-4">
          {/*
            The school's own logo when it has uploaded one, and nothing at all
            when it has not. It used to be GetSchool's mark here, on the
            school's own report sheet, which is the wrong badge on the one
            document a parent keeps.
          */}
          <SchoolLogo school={school} size={48} className="shrink-0 rounded-lg bg-white/95 object-contain p-1" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold leading-tight text-white sm:text-xl">
              {school.name.toUpperCase()}
            </h2>
            <p className="mt-1 text-[11.5px] text-brand-200">
              {[school.address, school.city, school.state && `${school.state} State`].filter(Boolean).join(', ')}
              {school.phone[0] ? ` · ${school.phone[0]}` : ''}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-400">{school.motto}</p>
          </div>
        </div>
        <div className="relative mt-5 border-t border-white/12 pt-4 text-center">
          <p className="text-[13px] font-bold uppercase tracking-wide text-white">Student Terminal Report Sheet</p>
          <p className="mt-1 text-[11.5px] text-brand-200">
            {result.termName} · {result.sessionName} Academic Session
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------- identity */}
      <div className="grid gap-x-6 gap-y-3 border-b border-hairline surface-sunken px-5 py-4 sm:grid-cols-4 sm:px-7">
        {[
          ["Student's name", result.studentName],
          ['Admission no.', result.admissionNo],
          ['Class', result.className],
          ['Number in class', String(result.classSize)],
          ['Gender', student?.gender ?? '-'],
          ['House', student?.house ?? '-'],
          ['Days present', `${result.attendance.present} of ${result.attendance.daysOpen}`],
          ...(showPosition ? [['Position', ordinal(result.position)] as [string, string]] : []),
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-0.5 truncate text-[13.5px] font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* -------------------------------------------------------- summary */}
      {/*
        The same cells as the printed sheet. Screen and paper have to agree
        figure for figure — a parent who reads 68% here and prints a card
        saying something else has no reason to trust either.

        The class highest and class average were here and are deliberately
        gone. A parent reading "your child 68, class highest 94" reads the 94
        first, and a child reading over their shoulder learns their rank before
        they learn what they are good at. Position stays, because a Nigerian
        report is expected to carry it — but one comparison is enough.
      */}
      <div className="grid grid-cols-2 divide-x divide-white/10 bg-brand-900 sm:grid-cols-5">
        {[
          { label: 'Subjects', value: String(result.subjectCount) },
          { label: 'Total obtained', value: String(result.totalScore) },
          { label: 'Total obtainable', value: String(result.subjectCount * 100) },
          { label: 'Average', value: `${result.average.toFixed(1)}%` },
          ...(showPosition
            ? [{ label: 'Position', value: `${ordinal(result.position)} of ${result.classSize}` }]
            : []),
        ].map((cell) => (
          <div key={cell.label} className="px-3 py-3.5 text-center">
            <p className="text-[9.5px] font-bold uppercase tracking-wide text-brand-300">{cell.label}</p>
            <p className="mt-1 text-[17px] font-extrabold leading-none text-white">{cell.value}</p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------ cognitive */}
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead>
            <tr className="border-b border-hairline surface-sunken">
              <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-muted">
                Subject
              </th>
              {ASSESSMENT_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="px-2 py-2.5 text-center text-[10.5px] font-bold uppercase tracking-wide text-muted"
                >
                  {column.label}
                  <span className="block text-[9px] font-medium normal-case">({column.max})</span>
                </th>
              ))}
              <th className="px-2 py-2.5 text-center text-[10.5px] font-bold uppercase tracking-wide text-muted">
                Total
              </th>
              <th className="px-2 py-2.5 text-center text-[10.5px] font-bold uppercase tracking-wide text-muted">
                Grade
              </th>
              <th className="px-2 py-2.5 text-center text-[10.5px] font-bold uppercase tracking-wide text-muted">
                Pos.
              </th>
              {/*
                A COLUMN HEADER WITH NO CELL UNDER IT SHIFTS THE WHOLE ROW.
                
                "Class avg" kept its `<th>` after its `<td>` was removed, so
                every value to the right of it moved one column left: the
                remark landed under "Class avg" and the Remark column printed
                empty. It looked like remarks were missing; they were one
                column out.
                
                Header and cells are now driven by the same flag, so they
                cannot drift apart again.
              */}
              {showClassFigures && (
                <>
                  <th className="px-2 py-2.5 text-center text-[10.5px] font-bold uppercase tracking-wide text-muted">
                    Class avg
                  </th>
                  <th className="px-2 py-2.5 text-center text-[10.5px] font-bold uppercase tracking-wide text-muted">
                    Class high
                  </th>
                </>
              )}
              <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-muted">
                Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {result.subjects.map((line) => {
              // Same scale the key below prints, resolved once from the
              // school's policy rather than re-derived per row.
              // Falls back to the lowest band rather than `undefined`: a mark
              // outside every band is a data fault, and a report card with a
              // blank grade cell is a worse way to surface it than an F.
              const band =
                scale.find((b) => line.total >= b.min && line.total <= b.max) ?? scale[scale.length - 1];
              return (
                <tr key={line.subjectId} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2 font-semibold text-primary">{line.subjectName}</td>
                  <td className="px-2 py-2 text-center tabular text-secondary">{line.ca1}</td>
                  <td className="px-2 py-2 text-center tabular text-secondary">{line.ca2}</td>
                  <td className="px-2 py-2 text-center tabular text-secondary">{line.assignment}</td>
                  <td className="px-2 py-2 text-center tabular text-secondary">{line.exam}</td>
                  <td
                    className={cn(
                      'px-2 py-2 text-center font-bold tabular',
                      band.tone === 'fail' ? 'text-status-critical' : 'text-primary',
                    )}
                  >
                    {line.total}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Badge
                      tone={
                        band.tone === 'fail' ? 'critical'
                        : band.tone === 'pass' ? 'warning'
                        : band.tone === 'credit' ? 'info'
                        : 'good'
                      }
                    >
                      {line.grade}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-center tabular text-muted">{ordinal(line.position)}</td>
                  {showClassFigures && (
                    <>
                      <td className="px-2 py-2 text-center tabular text-muted">
                        {line.classAverage.toFixed(1)}
                      </td>
                      <td className="px-2 py-2 text-center tabular text-muted">{line.highest}</td>
                    </>
                  )}
                  <td className="px-4 py-2 text-secondary">{line.remark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------ key + domains */}
      <div className="space-y-5 border-t border-hairline p-5 sm:p-7">
        <div className="overflow-hidden rounded-xl border border-hairline">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[560px] text-[11.5px]">
              <thead>
                <tr className="surface-sunken">
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-muted">Grading key</th>
                  {scale.map((band) => (
                    <th key={band.grade} className="px-2 py-2 text-center font-bold text-primary">
                      {band.grade}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-hairline">
                  <td className="px-3 py-2 font-semibold text-secondary">Score range</td>
                  {scale.map((band) => (
                    <td key={band.grade} className="px-2 py-2 text-center tabular text-muted">
                      {band.min}–{band.max}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-hairline">
                  <td className="px-3 py-2 font-semibold text-secondary">Interpretation</td>
                  {scale.map((band) => (
                    <td key={band.grade} className="px-2 py-2 text-center text-muted">
                      {band.remark}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------- psychomotor and affective */}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'Psychomotor domain', traits: PSYCHOMOTOR_SKILLS, values: result.psychomotor ?? {} },
            { title: 'Affective domain', traits: AFFECTIVE_TRAITS, values: result.affective ?? {} },
          ].map((domain) => (
            <div key={domain.title} className="overflow-hidden rounded-xl border border-hairline">
              <p className="surface-sunken px-3 py-2 text-[10.5px] font-bold uppercase tracking-wide text-muted">
                {domain.title}
              </p>
              <ul className="divide-y divide-[var(--border-hairline)]">
                {domain.traits.map((trait) => {
                  const score = (domain.values as Record<string, 1 | 2 | 3 | 4 | 5>)[trait];
                  return (
                    <li key={trait} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[12.5px]">
                      <span className="text-secondary">{trait}</span>
                      <span className={cn('tabular font-semibold', score ? 'text-primary' : 'text-muted')}>
                        {score ? `${score} · ${RATING_LABEL[score]}` : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* ------------------------------------------------------- remarks */}
        <div className="space-y-4">
          {[
            { label: "Teacher's remark", text: result.teacherRemark, who: 'Class Teacher' },
            { label: "Principal's remark", text: result.principalRemark, who: school.principalName },
          ].map((remark) => (
            <div key={remark.label} className="rounded-xl border border-hairline p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{remark.label}</p>
              <p className="mt-2 text-[14px] italic leading-relaxed text-secondary">“{remark.text}”</p>
              <div className="mt-4 flex items-end justify-end">
                <div className="w-52 border-t border-[var(--border-strong)] pt-1.5 text-right">
                  <p className="text-[12px] font-bold text-primary">{remark.who}</p>
                  <p className="text-[10px] text-muted">Signature &amp; date</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- foot */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline surface-sunken px-5 py-3.5 sm:px-7">
        <p className="text-[12px] font-bold text-brand-800 dark:text-brand-300">
          {result.nextTermBegins ? `Next term begins: ${formatDate(result.nextTermBegins)}` : 'Next term date to be announced'}
        </p>
        <p className="font-mono text-[10.5px] text-muted">Ref {result.id.toUpperCase()}</p>
      </footer>
    </article>
  );
}
