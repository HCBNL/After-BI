/**
 * The comment picker — type a number, get the remark.
 *
 * The interaction this is built around is a specific one: a teacher who has
 * done this for six terms knows that 39 is the one about a quiet study time at
 * home, and wants to type `39` and move on. So the search box is focused on
 * open, a bare number matches exactly, and Enter takes the top result. The
 * scrolling list is for the other teacher, in their first term, who does not
 * know the numbers yet and needs to read them.
 *
 * The head's copy of this is the same component with `audience="principal"`
 * and the teacher's number passed as `excludeNo`. That entry is not greyed out
 * with a warning — it is not in the list at all, because a control that lets
 * you make the mistake and then tells you off is worse than one that does not
 * offer it. The head's numbers are 51–90 and the teacher's 1–50, so the two
 * ranges cannot collide anyway; `excludeNo` is the guard for a school that has
 * added its own entries and put them in both.
 *
 * Nothing here is compulsory. Every remark can still be typed by hand in the
 * box below the list, and a hand-written remark is stored without a number,
 * which is how the report card knows it was somebody's own words.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, Sparkles } from 'lucide-react';
import { Badge, Button, Modal, Textarea } from '@/components/ui';
import {
  BAND_LABEL,
  bandForAverage,
  renderComment,
  searchComments,
  suggestFor,
  type Comment,
  type CommentAudience,
} from '@/lib/comments';
import { cn } from '@/lib/cn';

export function CommentPicker({
  open,
  onClose,
  onPick,
  bank,
  audience,
  studentName,
  studentId,
  termId,
  average,
  current,
  currentNo,
  excludeNo,
  usedNumbers = [],
}: {
  open: boolean;
  onClose: () => void;
  /** `n` is undefined when the remark was typed rather than picked. */
  onPick: (text: string, n?: number) => void;
  bank: Comment[];
  audience: CommentAudience;
  studentName: string;
  studentId: string;
  termId: string;
  average: number;
  current: string;
  currentNo?: number;
  /** The other signatory's number, so the same sentence cannot go out twice. */
  excludeNo?: number;
  /** Numbers already used elsewhere in this class — shown, not blocked. */
  usedNumbers?: number[];
}) {
  const [term, setTerm] = useState('');
  const [draft, setDraft] = useState(current);
  const searchRef = useRef<HTMLInputElement>(null);

  const band = bandForAverage(average);
  const used = useMemo(() => new Set(usedNumbers), [usedNumbers]);

  // Reopening on a different child must not show the last child's edits.
  useEffect(() => {
    if (open) {
      setDraft(current);
      setTerm('');
    }
  }, [open, current]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const results = useMemo(
    () =>
      searchComments(bank, audience, term, {
        band,
        exclude: excludeNo ? [excludeNo] : [],
      }),
    [bank, audience, term, band, excludeNo],
  );

  function choose(comment: Comment) {
    onPick(renderComment(comment.text, studentName), comment.n);
    onClose();
  }

  function surprise() {
    const picked = suggestFor(
      bank,
      audience,
      { studentId, termId, average },
      excludeNo ? [excludeNo] : [],
    );
    if (picked) choose(picked);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`${audience === 'teacher' ? "Teacher's" : "Head's"} remark`}
      description={`${studentName} · average ${average.toFixed(1)} · ${BAND_LABEL[band]}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={surprise}>
            <Sparkles size={15} />
            Suggest one
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Typed over the suggestion, so the number no longer describes
                // it. Storing one anyway would tell the next screen this came
                // from the bank when it did not.
                onPick(draft.trim(), draft.trim() === current ? currentNo : undefined);
                onClose();
              }}
              disabled={!draft.trim()}
            >
              Use this remark
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ------------------------------------------------------- search */}
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            ref={searchRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                e.preventDefault();
                choose(results[0]);
              }
            }}
            placeholder="Type a number — 39 — or a word like homework"
            className="w-full rounded-xl border border-hairline bg-[var(--surface-sunken)] py-2.5 pl-9 pr-3 text-[14px] text-primary outline-none placeholder:text-muted focus:border-brand-400"
            inputMode="text"
            aria-label="Search the comment bank by number or word"
          />
        </div>

        {/* --------------------------------------------------------- list */}
        <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-1">
          {results.length === 0 && (
            <p className="px-1 py-6 text-center text-[13px] text-muted">
              Nothing matches “{term}”. Numbers for this list run{' '}
              {audience === 'teacher' ? '1 to 50' : '51 to 90'}.
            </p>
          )}

          {results.map((comment) => {
            const chosen = comment.n === currentNo;
            return (
              <button
                key={comment.n}
                type="button"
                onClick={() => choose(comment)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                  chosen
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/30'
                    : 'border-hairline hover:bg-[var(--surface-sunken)]',
                )}
              >
                <span
                  className={cn(
                    'tabular mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold',
                    chosen
                      ? 'bg-brand-600 text-white'
                      : 'bg-[var(--surface-sunken)] text-secondary',
                  )}
                >
                  {comment.n}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] leading-snug text-primary">
                    {renderComment(comment.text, studentName)}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={comment.band === band ? 'brand' : 'neutral'}>
                      {BAND_LABEL[comment.band]}
                    </Badge>
                    {/*
                      A hint, never a block. Two children in a class of forty
                      sharing a remark is fine; thirty is not, and the teacher
                      is the one who can tell which this is.
                    */}
                    {used.has(comment.n) && !chosen && (
                      <span className="text-[11px] text-muted">used in this class</span>
                    )}
                  </span>
                </span>

                {chosen && <Check size={16} className="mt-1 shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------ own words */}
        <div>
          <label
            htmlFor="remark-draft"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted"
          >
            Or write your own
          </label>
          <Textarea
            id="remark-draft"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Something about ${studentName.split(/\s+/).slice(-1)[0]} in your own words…`}
          />
        </div>
      </div>
    </Modal>
  );
}
