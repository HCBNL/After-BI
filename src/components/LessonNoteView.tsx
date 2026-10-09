/**
 * A lesson note, laid out the way it is submitted. And the lesson plan, which
 * is the same letterhead with a different word on it and a shorter body.
 *
 * This is the same component on screen, on paper and inside the PDF builder,
 * because two templates is how the printed note quietly stops matching the one
 * the teacher approved, and the printed one is the one that gets signed. The
 * print rules live in `@media print` in `src/index.css`; the PDF is built by
 * `src/lib/lessonNotePdf.ts` from the same parsed blocks.
 *
 * TWO HEADING WEIGHTS, WHICH IS WHAT MAKES IT READ AS A DOCUMENT
 *
 * `## Lesson Content` is a section of the note. `### Forms of Energy` is a
 * paragraph's title inside that section. Drawn at the same weight, as they
 * used to be, a note is a column of shouting capitals with no shape and the
 * eye has nothing to hold on to. Drawn differently, it reads like a page from
 * a textbook, which is what a teacher is copying onto a board.
 */

import { cn } from '@/lib/cn';
import { inlineRuns, parseNote } from '@/lib/noteMarkdown';

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineRuns(text).map((run, index) =>
        run.bold ? (
          <strong key={index} className="font-bold text-primary">
            {run.text}
          </strong>
        ) : (
          <span key={index}>{run.text}</span>
        ),
      )}
    </>
  );
}

export interface LessonNoteHeader {
  schoolName: string;
  /** The section the note is for — Primary, Junior. Not a class. */
  section: string;
  subjectName: string;
  termName: string;
  topic: string;
  subTopic?: string;
  duration: string;
  periods: string;
  teacherName: string;
  date?: string;
}

export function LessonNoteView({
  header,
  body,
  kind = 'note',
  className,
}: {
  header: LessonNoteHeader;
  body: string;
  /** Which of the two documents this is. Changes the line under the crest. */
  kind?: 'note' | 'plan';
  className?: string;
}) {
  const blocks = parseNote(body);

  const facts: [string, string][] = [
    ['Section', header.section],
    ['Subject', header.subjectName],
    ['Term', header.termName],
    ['Duration', header.duration],
    ['Periods', header.periods],
  ];

  return (
    <article className={cn('lesson-note surface-card', className)}>
      {/* ------------------------------------------------------ letterhead */}
      <header className="border-b-2 border-brand-900 pb-4 dark:border-brand-500">
        <p className="text-center text-[15px] font-extrabold uppercase tracking-[0.1em] text-primary">
          {header.schoolName}
        </p>
        <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-gold-600 dark:text-gold-400">
          {kind === 'plan' ? 'Lesson Plan' : 'Lesson Note'}
        </p>

        <h1 className="mt-4 text-[19px] font-extrabold leading-tight tracking-tight text-primary">
          {header.topic}
          {header.subTopic && <span className="block text-[14px] font-semibold text-secondary">{header.subTopic}</span>}
        </h1>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
              <dd className="truncate text-[13.5px] font-semibold text-primary">{value || '-'}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ------------------------------------------------------------ body */}
      <div className="mt-6 space-y-4">
        {blocks.map((block, index) => {
          if (block.kind === 'heading') {
            /*
             * A sub-heading is a title, not a section. Sentence case, no rule
             * under it, closer to the paragraph it introduces than to the one
             * above — which is the whole of what makes a run of sub-sections
             * read as prose rather than as a list of banners.
             */
            if (block.level === 3) {
              return (
                <h3
                  key={index}
                  className="mt-5 break-after-avoid text-[14.5px] font-extrabold leading-snug text-primary first:mt-0"
                >
                  {block.text}
                </h3>
              );
            }

            return (
              <h2
                key={index}
                className="mt-7 break-after-avoid border-b border-hairline pb-1.5 text-[12px] font-extrabold uppercase tracking-[0.13em] text-brand-800 first:mt-0 dark:text-brand-300"
              >
                {block.text}
              </h2>
            );
          }

          if (block.kind === 'list') {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List
                key={index}
                className={cn(
                  'space-y-1.5 pl-5 text-[14px] leading-relaxed text-secondary',
                  block.ordered ? 'list-decimal' : 'list-disc',
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="break-inside-avoid pl-1">
                    <Inline text={item} />
                  </li>
                ))}
              </List>
            );
          }

          if (block.kind === 'table') {
            return (
              // The presentation table is the one thing a head teacher looks
              // at first, and it is also the widest thing on the page — so it
              // scrolls on a phone rather than squeezing the columns to nothing.
              <div key={index} className="-mx-1 overflow-x-auto scrollbar-thin px-1">
                <table className="w-full min-w-[34rem] table-fixed border-collapse">
                  <thead>
                    <tr>
                      {block.head.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          className={cn(
                            'border border-strong bg-[var(--surface-sunken)] px-2.5 py-2 text-left align-top text-[11px] font-extrabold uppercase tracking-wide text-primary',
                            cellIndex === 0 && 'w-[16%]',
                          )}
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="break-inside-avoid">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={cn(
                              'border border-hairline px-2.5 py-2 align-top text-[13px] leading-relaxed text-secondary',
                              cellIndex === 0 && 'font-bold text-primary',
                            )}
                          >
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return (
            <p key={index} className="text-[14px] leading-relaxed text-secondary">
              <Inline text={block.text} />
            </p>
          );
        })}
      </div>

      {/* ------------------------------------------------------ signatures */}
      <footer className="mt-12 grid grid-cols-2 gap-8 break-inside-avoid">
        {[
          ['Teacher', header.teacherName],
          ['Head teacher / HOD', ''],
        ].map(([role, name]) => (
          <div key={role}>
            <div className="h-8 border-b border-strong" />
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{role}</p>
            {name && <p className="text-[12.5px] font-semibold text-primary">{name}</p>}
          </div>
        ))}
      </footer>
    </article>
  );
}
