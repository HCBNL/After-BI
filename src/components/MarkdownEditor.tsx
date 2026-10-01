/**
 * A textarea with seven buttons over it.
 *
 * Deliberately not a rich-text editor. A `contenteditable` surface with a
 * document model, undo stack and paste sanitising is thousands of lines and a
 * class of bug that only shows up on somebody else's phone — and the thing
 * underneath is markdown either way, because that is what the model writes and
 * what `noteMarkdown.ts` parses.
 *
 * So the buttons do the one thing a toolbar is actually for: wrap or prefix the
 * selection so nobody has to remember what `##` means. Everything else is a
 * plain `<textarea>`, which every browser already gets right — including
 * autocorrect, dictation, undo, and the Android selection handles.
 *
 * Preview renders the same markdown through `LessonNoteView`, so what a teacher
 * checks is what the PDF will contain.
 */

import { useRef, type ReactNode } from 'react';
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Table2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Action {
  label: string;
  icon: ReactNode;
  /** Wraps the selection: `**` gives `**selected**`. */
  wrap?: string;
  /** Prefixes each selected line: `## `, `- `, `1. `. */
  prefix?: string;
  /** Dropped in whole at the cursor. */
  insert?: string;
}

const ACTIONS: Action[] = [
  { label: 'Bold', icon: <Bold size={15} />, wrap: '**' },
  { label: 'Italic', icon: <Italic size={15} />, wrap: '*' },
  { label: 'Heading', icon: <Heading1 size={15} />, prefix: '## ' },
  { label: 'Sub-heading', icon: <Heading2 size={15} />, prefix: '### ' },
  { label: 'Bulleted list', icon: <List size={15} />, prefix: '- ' },
  { label: 'Numbered list', icon: <ListOrdered size={15} />, prefix: '1. ' },
  {
    label: 'Table',
    icon: <Table2 size={15} />,
    // The Presentation table, pre-shaped. Typing this by hand on a phone is
    // the single most fiddly thing in a lesson note.
    insert:
      '\n| Step | Teacher\'s Activity | Pupils\' Activity |\n| --- | --- | --- |\n| Step I |  |  |\n| Step II |  |  |\n| Step III |  |  |\n',
  },
];

export function MarkdownEditor({
  value,
  onChange,
  rows = 18,
  placeholder,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (action: Action) => {
    const area = ref.current;
    if (!area) return;

    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = value.slice(start, end);

    let next: string;
    let cursor: number;

    if (action.insert) {
      next = value.slice(0, start) + action.insert + value.slice(end);
      cursor = start + action.insert.length;
    } else if (action.prefix) {
      // Prefix every line in the selection, or the line the cursor sits on.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = end + (value.slice(end).indexOf('\n') === -1 ? 0 : value.slice(end).indexOf('\n'));
      const block = value.slice(lineStart, Math.max(lineEnd, end));
      const prefixed = block
        .split('\n')
        .map((line, index) =>
          // A numbered list counts; everything else repeats the same marker.
          action.prefix === '1. ' ? `${index + 1}. ${line}` : `${action.prefix}${line}`,
        )
        .join('\n');
      next = value.slice(0, lineStart) + prefixed + value.slice(Math.max(lineEnd, end));
      cursor = lineStart + prefixed.length;
    } else {
      const mark = action.wrap ?? '';
      next = `${value.slice(0, start)}${mark}${selected}${mark}${value.slice(end)}`;
      // With nothing selected, park the cursor between the markers so typing
      // lands inside them.
      cursor = selected ? end + mark.length * 2 : start + mark.length;
    }

    onChange(next);
    window.setTimeout(() => {
      area.focus();
      area.setSelectionRange(cursor, cursor);
    }, 0);
  };

  return (
    <div className={cn('min-w-0 overflow-hidden rounded-xl border border-hairline', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-hairline surface-sunken px-1.5 py-1.5">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={disabled}
            onClick={() => apply(action)}
            title={action.label}
            aria-label={action.label}
            className="tap flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-card)] hover:text-primary disabled:opacity-40"
          >
            {action.icon}
          </button>
        ))}
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        // 16px, because anything smaller makes iOS Safari zoom the page on
        // focus and the teacher then cannot get it square again.
        className="block w-full resize-y bg-[var(--surface-page)] px-3.5 py-3 text-[16px] leading-relaxed text-primary outline-none placeholder:text-muted"
      />
    </div>
  );
}
