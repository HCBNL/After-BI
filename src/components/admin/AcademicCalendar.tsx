import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Archive, CalendarCheck2, CalendarPlus, CheckCircle2, Clock, Lock, Play, Save, SkipForward, Trash2, Undo2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, useToast } from '@/components/ui';
import { FoldRow, Group } from '@/components/ui/SettingsRows';
import { HintFooter, Hint } from '@/components/ui/Hint';
import { useSchool } from '@/context/SchoolContext';
import { useAuth } from '@/context/AuthContext';
import {
  advanceTerm,
  closeFinishedTerms,
  closeSession,
  createSession,
  deleteSession,
  MAX_TERM_WEEKS,
  MIN_TERM_WEEKS,
  mondayOf,
  reopenSession,
  reopenTerm,
  startSession,
  TERM_WEEKS,
  termWeeks,
  updateTermDates,
  weeksSpanned,
  wipeSession,
  type TermDates,
} from '@/lib/db';
import { nextTerm, openSession, sessionViews, suggestSessionName, termStatus, type SessionView, type TermStatus } from '@/lib/calendar';
import { needsClosing } from '@/lib/sealed';
import type { Term, TermName } from '@/types';

/**
 * The school's academic calendar, run as a line rather than a list.
 *
 * ONE SESSION AT A TIME
 *
 *   1. The office creates a session and types its three terms' dates.
 *   2. It starts the session when the year begins: First Term becomes current.
 *   3. At the end of each term, one button closes it and opens the next.
 *   4. After Third Term, the office closes the session.
 *   5. Only then can the next session be created.
 *
 * Nothing is offered for "next year" until this year is closed, and a closed
 * session moves to Past sessions, where it can be reopened to correct
 * something or deleted. The rules live in `src/lib/calendar.ts`, and `db.ts`
 * enforces them, so the screen cannot be talked into a second running year.
 *
 * DELETING
 *
 * An empty session deletes straight away. One holding marks, registers or
 * report cards is refused by the browser's security rules, on purpose; for
 * clearing out test data the super administrator can delete it WITH its
 * records by typing the session's name, which is done by the server
 * (`api/session-delete.ts`). Pupils, staff and classes are never touched.
 */

const TERM_NAMES: TermName[] = ['First Term', 'Second Term', 'Third Term'];

/** "7 Sep to 11 Dec 2026" — the year once, unless the term crosses one. */
function dateRange(start: string, end: string): string {
  const valid = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso);
  if (!valid(start) || !valid(end)) return 'Dates not set';
  const day = (iso: string, withYear: boolean) =>
    new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' as const } : {}) }).format(
      new Date(`${iso}T12:00:00`),
    );
  return `${day(start, start.slice(0, 4) !== end.slice(0, 4))} to ${day(end, true)}`;
}

function shiftYear(iso: string, by: number): string {
  return /^\d{4}-/.test(iso) ? `${Number(iso.slice(0, 4)) + by}${iso.slice(4)}` : '';
}

/** The new session's terms: last session's dates a year on, or a Nigerian school year. */
function draftTerms(previous: Term[], sessionName: string): (TermDates & { name: TermName })[] {
  const first = Number(sessionName.slice(0, 4)) || new Date().getFullYear();
  const fallback: TermDates[] = [
    { startDate: `${first}-09-08`, endDate: `${first}-12-11`, daysOpen: 62 },
    { startDate: `${first + 1}-01-05`, endDate: `${first + 1}-04-02`, daysOpen: 60 },
    { startDate: `${first + 1}-04-26`, endDate: `${first + 1}-07-23`, daysOpen: 58 },
  ];
  return TERM_NAMES.map((name, i) => {
    const old = previous.find((t) => t.name === name);
    return old && old.startDate
      ? { name, startDate: shiftYear(old.startDate, 1), endDate: shiftYear(old.endDate, 1), daysOpen: old.daysOpen || fallback[i].daysOpen, weeks: termWeeks(old) }
      : { name, ...fallback[i], weeks: TERM_WEEKS };
  });
}

/** YYYY-MM-DD for a local date. */
function isoOf(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

/** The weeks a mid-term break can fall in: after the term's first week, before its last. */
function breakWeeks(startDate: string, endDate: string): { value: string; label: string }[] {
  const first = mondayOf(startDate);
  const last = mondayOf(endDate);
  if (!first || !last) return [];
  const short = (day: Date) => new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(day);
  const weeks: { value: string; label: string }[] = [];
  const day = new Date(`${first}T12:00:00`);
  day.setDate(day.getDate() + 7);
  while (isoOf(day) < last) {
    const friday = new Date(day);
    friday.setDate(friday.getDate() + 4);
    weeks.push({ value: isoOf(day), label: `${short(day)} to ${short(friday)}` });
    day.setDate(day.getDate() + 7);
  }
  return weeks;
}

/**
 * One term's form. The dates are held here so the list of weeks the break can
 * fall in follows them as they are typed, rather than after a save.
 */
function TermForm({
  term,
  saving,
  closing,
  onSubmit,
  onReopen,
}: {
  term: Term;
  saving: boolean;
  closing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReopen: () => void;
}) {
  const [start, setStart] = useState(term.startDate);
  const [end, setEnd] = useState(term.endDate);
  const options = useMemo(() => breakWeeks(start, end), [start, end]);
  const spanned = weeksSpanned(start, end);

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" required>
          <Input type="date" name="startDate" value={start} onChange={(event) => setStart(event.target.value)} required />
        </Field>
        <Field label="Ends" required>
          <Input type="date" name="endDate" value={end} onChange={(event) => setEnd(event.target.value)} required />
        </Field>
        <Field label="Days the school opens" required>
          <Input type="number" name="daysOpen" min={1} max={150} defaultValue={term.daysOpen || ''} required />
        </Field>
        <Field label="Next term begins">
          <Input type="date" name="nextTermBegins" defaultValue={term.nextTermBegins ?? ''} />
        </Field>
        <Field label="Weeks of teaching" required>
          <Input type="number" name="weeks" min={MIN_TERM_WEEKS} max={MAX_TERM_WEEKS} defaultValue={termWeeks(term)} required />
        </Field>
        <Field label="Mid-term break">
          <Select name="midTermBreak" defaultValue={term.midTermBreak ?? ''}>
            <option value="">No break set</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <HintFooter label="How these dates are used">
        The standard term is {TERM_WEEKS} weeks of teaching; set anything from {MIN_TERM_WEEKS} to {MAX_TERM_WEEKS}.
        {spanned !== null && ` These dates cover ${spanned} weeks, holidays included.`} The mid-term break is not a
        teaching week: the week counter, the term card and every scheme of work skip it, and nobody is asked for a
        register that week. Attendance is counted out of the days the school opens, and the date the next term begins
        is printed on report cards.
      </HintFooter>
      {/*
        Closing, and what it is actually for.

        Spelled out on the button's own row rather than hidden in a tooltip,
        because the person pressing it is doing the platform a favour they get
        nothing visible back from: every parent's portal gets faster and theirs
        looks identical. Somebody who does not know that will never press it.
      */}
      {term.closed && (
        <div className="mt-5 rounded-2xl border border-hairline surface-sunken p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
            This term is closed
            <Hint label="About closed terms">
              Its report cards are frozen and parents keep a saved copy. Reopen it only to correct something; the
              school stays in the term it is in now.
            </Hint>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            loading={closing}
            icon={<Undo2 size={15} />}
            onClick={onReopen}
          >
            Reopen this term
          </Button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="submit" loading={saving} icon={<Save size={16} />}>
          Save dates
        </Button>
      </div>
    </form>
  );
}


const STATUS_BADGE: Record<TermStatus, { label: string; tone: 'good' | 'neutral' | 'info' | 'warning'; icon: ReactNode }> = {
  current: { label: 'Current', tone: 'good', icon: <CheckCircle2 size={11} /> },
  closed: { label: 'Closed', tone: 'neutral', icon: <Lock size={11} /> },
  upcoming: { label: 'Next', tone: 'info', icon: <Clock size={11} /> },
  'not-started': { label: 'Not started', tone: 'warning', icon: <Clock size={11} /> },
};

type Removing = { view: SessionView; stage: 'ask' | 'wipe'; reason?: string };

export function AcademicCalendar() {
  const { terms, sessions, currentTerm, reload } = useSchool();
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [typed, setTyped] = useState('');
  const [creating, setCreating] = useState(false);
  /* Moving on and closing are asked once: neither is undone from this screen in one tap. */
  const [confirming, setConfirming] = useState<{ title: string; message: string; label: string; run: () => void } | null>(null);

  const views = useMemo(() => sessionViews(sessions, terms), [sessions, terms]);
  const running = useMemo(() => openSession(views), [views]);
  /* Left open by the older screen, which allowed several. Each can be closed. */
  const alsoOpen = views.filter((v) => !v.closed && v.id !== running?.id);
  const past = views.filter((v) => v.closed);
  const suggested = suggestSessionName(views[0]?.name);
  const draft = useMemo(() => draftTerms(views[0]?.terms ?? [], suggested), [views, suggested]);
  const superAdmin = user?.role === 'superadmin';

  const toggle = (key: string) => setOpen((current) => (current === key ? null : key));

  /** Run one calendar action with a busy key, a reload and a toast. */
  const act = async (key: string, work: () => Promise<unknown>, done: [string, string], failed: string) => {
    if (!user) return false;
    setBusy(key);
    try {
      await work();
      await reload();
      toast.success(done[0], done[1]);
      return true;
    } catch (error) {
      toast.error(failed, error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveDates = async (event: FormEvent<HTMLFormElement>, term: Term) => {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const dates: TermDates = {
      startDate: String(form.get('startDate') ?? ''),
      endDate: String(form.get('endDate') ?? ''),
      daysOpen: Number(form.get('daysOpen') ?? 0),
      nextTermBegins: String(form.get('nextTermBegins') ?? '') || undefined,
      weeks: Number(form.get('weeks') ?? TERM_WEEKS),
      midTermBreak: String(form.get('midTermBreak') ?? ''),
    };
    if (
      await act(term.id, () => updateTermDates(term.id, dates, user), ['Dates saved', `${term.name}, ${term.sessionName} is updated.`], 'Could not save the dates')
    )
      setOpen(null);
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('session') ?? '').trim();
    const newTerms = TERM_NAMES.map((termName, i) => ({
      name: termName,
      startDate: String(form.get(`start-${i}`) ?? ''),
      endDate: String(form.get(`end-${i}`) ?? ''),
      daysOpen: Number(form.get(`days-${i}`) ?? 0),
      weeks: Number(form.get(`weeks-${i}`) ?? TERM_WEEKS),
      nextTermBegins: i < TERM_NAMES.length - 1 ? String(form.get(`start-${i + 1}`) ?? '') || undefined : undefined,
    }));
    if (
      await act('new', () => createSession({ name, terms: newTerms }, user), [`${name} is created`, 'Check the dates, then start it when the first term begins.'], 'Could not create the session')
    )
      setCreating(false);
  };

  /*
   * Delete. Tried the gentle way first: an empty session goes straight away.
   * If it holds records the refusal comes back, and a super administrator is
   * offered the second stage, which deletes the records too.
   */
  const remove = async () => {
    if (!user || !removing) return;
    const { view, stage } = removing;
    setBusy(`delete-${view.id}`);
    try {
      if (stage === 'ask') {
        await deleteSession(view.id, user);
        toast.success('Session deleted', `${view.name} is gone.`);
      } else {
        const count = await wipeSession(view.id, typed);
        toast.success('Session deleted', `${view.name} and ${count.toLocaleString('en-NG')} records filed in it are gone.`);
      }
      await reload();
      setRemoving(null);
      setTyped('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      if (stage === 'ask' && /holds/.test(message)) setRemoving({ view, stage: 'wipe', reason: message });
      else toast.error('That session was not deleted', message);
    } finally {
      setBusy(null);
    }
  };

  const stale = useMemo(() => needsClosing(terms, currentTerm?.id ?? '').filter((t) => t.sessionId !== running?.id), [terms, currentTerm?.id, running?.id]);

  /* ---------------------------------------------------------------- views */

  const termRows = (view: SessionView) =>
    view.terms.map((term) => {
      const status = termStatus(term, view);
      const badge = STATUS_BADGE[status];
      return (
        <FoldRow
          key={term.id}
          icon={<CalendarCheck2 size={19} />}
          title={term.name}
          detail={`${termWeeks(term)} weeks, ${dateRange(term.startDate, term.endDate)}`}
          badge={
            <Badge tone={badge.tone} icon={badge.icon}>
              {badge.label}
            </Badge>
          }
          open={open === term.id}
          onToggle={() => toggle(term.id)}
        >
          <TermForm
            term={term}
            saving={busy === term.id}
            closing={busy === `reopen-${term.id}`}
            onSubmit={(event) => void saveDates(event, term)}
            onReopen={() =>
              void act(`reopen-${term.id}`, () => reopenTerm(term.id, user!), ['Term reopened', `${term.name} can be corrected.`], 'Could not reopen the term')
            }
          />
        </FoldRow>
      );
    });

  const deleteButton = (view: SessionView) => (
    <Button
      variant="ghost"
      size="sm"
      icon={<Trash2 size={15} />}
      onClick={() => {
        setTyped('');
        setRemoving({ view, stage: 'ask' });
      }}
    >
      Delete
    </Button>
  );

  /**
   * What the running session is waiting for: one button, no box. What the
   * button does is explained in the pop-up that asks before it does it.
   */
  const nextStep = (view: SessionView) => {
    const row = (line: string, button: ReactNode) => (
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-[13px] text-secondary">{line}</p>
        {button}
      </div>
    );
    if (!view.started) {
      const first = view.terms[0];
      return row(
        'Not started yet. The dates can still be changed.',
        <Button
          size="sm"
          icon={<Play size={15} />}
          loading={busy === `start-${view.id}`}
          onClick={() =>
            setConfirming({
              title: `Start ${view.name}?`,
              message: `${first?.name ?? 'The first term'} becomes the current term. Registers, marks and report cards are filed against it from now on.`,
              label: `Start ${view.name}`,
              run: () =>
                void act(`start-${view.id}`, () => startSession(view.id, user!), [`${view.name} has started`, `The school is now in ${first?.name}.`], 'Could not start the session'),
            })
          }
        >
          Start {view.name}
        </Button>,
      );
    }
    const current = view.current;
    const following = current ? nextTerm(view, current) : undefined;
    if (current && following) {
      return row(
        `The school is in ${current.name}.`,
        <Button
          size="sm"
          variant="outline"
          icon={<SkipForward size={15} />}
          loading={busy === 'advance'}
          onClick={() =>
            setConfirming({
              title: `Finish ${current.name}?`,
              message: `${current.name} is closed: its report cards are frozen and parents keep a saved copy. ${following.name} becomes the current term, and new registers and marks are filed there. Make sure ${current.name}'s results are compiled first.`,
              label: `Start ${following.name}`,
              run: () =>
                void act('advance', () => advanceTerm(user!), [`${following.name} has started`, `${current.name} is closed.`], 'Could not move on'),
            })
          }
        >
          Finish {current.name}, start {following.name}
        </Button>,
      );
    }
    return row(
      current ? `The school is in ${current.name}, the last term.` : `${view.name} is running.`,
      <Button
        size="sm"
        variant="outline"
        icon={<Lock size={15} />}
        loading={busy === `close-${view.id}`}
        onClick={() =>
          setConfirming({
            title: `Close ${view.name}?`,
            message: `Every pupil moves up one class; those marked to repeat or step down are handled that way, and the top class graduates. This happens once only.`,
            label: `Close ${view.name} and promote`,
            run: () =>
              void act(`close-${view.id}`, () => closeSession(view.id, user!, { promote: true }), [`${view.name} is closed`, 'Every pupil has moved to their new class. You can now create the next session.'], 'Could not close the session'),
          })
        }
      >
        Close {view.name}
      </Button>,
    );
  };

  return (
    <div className="space-y-6">
      {stale.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[13px] text-secondary">
            {stale.length} finished term{stale.length === 1 ? '' : 's'} from an earlier session still open.
          </p>
          <Button
            variant="outline"
            size="sm"
            loading={busy === 'close-all'}
            icon={<Lock size={15} />}
            onClick={() => void act('close-all', () => closeFinishedTerms(user!), ['Finished terms closed', 'Parents keep a saved copy of every report card in them.'], 'Could not close them')}
          >
            Close {stale.length === 1 ? 'it' : `all ${stale.length}`}
          </Button>
        </div>
      )}

      {/* ------------------------------------------------ the running session */}
      {running ? (
        <Group title={`This session, ${running.name}`} action={deleteButton(running)}>
          <div className="mb-3">{nextStep(running)}</div>
          {termRows(running)}
        </Group>
      ) : creating ? null : (
        <EmptyState
          icon={<CalendarPlus size={22} />}
          title={past.length ? 'No session is running' : 'Your calendar has not been set up yet'}
          description={
            past.length
              ? `${past[0].name} is closed. Create the next session with its three terms' dates, then start it when the year begins.`
              : 'Create a session with its three terms and your own dates. Registers, marks and report cards are all filed against the term they were done in, so this comes first.'
          }
          action={
            <Button icon={<CalendarPlus size={16} />} onClick={() => setCreating(true)}>
              Create a session
            </Button>
          }
        />
      )}

      {/* ----------------------------------------------------- creating one */}
      {!running && creating && (
        <Group title="New session">
          <form onSubmit={(event) => void create(event)} className="rounded-2xl border border-hairline p-4 sm:p-5">
            <Field label="Session" required hint="Two years, like 2026/2027.">
              <Input name="session" aria-label="Session name" defaultValue={suggested} placeholder="2026/2027" required />
            </Field>
            {draft.map((term, i) => (
              <fieldset key={term.name} className="mt-5 rounded-2xl border border-hairline p-4">
                <legend className="px-1 text-[13.5px] font-bold text-primary">{term.name}</legend>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Starts" required>
                    <Input type="date" name={`start-${i}`} aria-label={`${term.name} starts`} defaultValue={term.startDate} required />
                  </Field>
                  <Field label="Ends" required>
                    <Input type="date" name={`end-${i}`} aria-label={`${term.name} ends`} defaultValue={term.endDate} required />
                  </Field>
                  <Field label="Days open" required>
                    <Input type="number" name={`days-${i}`} min={1} max={150} defaultValue={term.daysOpen} required />
                  </Field>
                  <Field label="Weeks" required>
                    <Input type="number" name={`weeks-${i}`} min={MIN_TERM_WEEKS} max={MAX_TERM_WEEKS} defaultValue={term.weeks ?? TERM_WEEKS} required />
                  </Field>
                </div>
              </fieldset>
            ))}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy === 'new'} icon={<CalendarPlus size={16} />}>
                Create the session
              </Button>
            </div>
          </form>
        </Group>
      )}

      {/* ------------------------------------- left open by the older screen */}
      {alsoOpen.map((view) => (
        <Group key={view.id} title={`Still open, ${view.name}`} action={deleteButton(view)}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-[13px] text-secondary">Never closed. A school runs one session at a time.</p>
            <Button
              size="sm"
              variant="outline"
              icon={<Lock size={15} />}
              loading={busy === `close-${view.id}`}
              onClick={() => void act(`close-${view.id}`, () => closeSession(view.id, user!), [`${view.name} is closed`, 'It is now under Past sessions.'], 'Could not close the session')}
            >
              Close {view.name}
            </Button>
          </div>
          <div className="mt-3">{termRows(view)}</div>
        </Group>
      ))}

      {/* ----------------------------------------------------------- archive */}
      {past.length > 0 && (
        <Group title="Past sessions">
          {past.map((view) => (
            <FoldRow
              key={view.id}
              icon={<Archive size={19} />}
              title={view.name}
              detail={view.terms.length ? dateRange(view.terms[0].startDate, view.terms.at(-1)!.endDate) : 'No terms'}
              badge={
                <Badge tone="neutral" icon={<Lock size={11} />}>
                  Closed
                </Badge>
              }
              open={open === view.id}
              onToggle={() => toggle(view.id)}
            >
              <ul className="space-y-1.5 text-[13px] text-secondary">
                {view.terms.map((term) => (
                  <li key={term.id} className="flex justify-between gap-3">
                    <span>{term.name}</span>
                    <span className="text-muted">{dateRange(term.startDate, term.endDate)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {deleteButton(view)}
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Undo2 size={15} />}
                  disabled={Boolean(running)}
                  loading={busy === `reopen-${view.id}`}
                  onClick={() => void act(`reopen-${view.id}`, () => reopenSession(view.id, user!), [`${view.name} is open again`, `The school is back in ${view.terms.at(-1)?.name}.`], 'Could not reopen it')}
                >
                  Reopen
                </Button>
              </div>
            </FoldRow>
          ))}
        </Group>
      )}

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          confirming?.run();
          setConfirming(null);
        }}
        title={confirming?.title ?? ''}
        message={confirming?.message ?? ''}
        confirmLabel={confirming?.label}
      />

      {/* ------------------------------------------------------------ delete */}
      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={removing ? `Delete ${removing.view.name}?` : ''}
        footer={
          removing && (removing.stage === 'ask' || superAdmin) ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Keep it
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 size={16} />}
                loading={busy === `delete-${removing.view.id}`}
                disabled={removing.stage === 'wipe' && typed.replace(/\s+/g, '') !== removing.view.name.replace(/\s+/g, '')}
                onClick={() => void remove()}
              >
                {removing.stage === 'wipe' ? 'Delete it and its records' : 'Delete the session'}
              </Button>
            </div>
          ) : undefined
        }
      >
        {removing?.stage === 'ask' && (
          <p className="text-[14px] leading-relaxed text-secondary">
            The session and its three terms are removed. If anything has been filed in it, such as marks, registers or
            report cards, you will be told before anything else happens.
          </p>
        )}
        {removing?.stage === 'wipe' && (
          <div className="space-y-4">
            <p className="text-[14px] font-semibold leading-relaxed text-status-critical">{removing.reason}</p>
            {superAdmin ? (
              <>
                <p className="text-[14px] leading-relaxed text-secondary">
                  If this session was only for testing, it can be deleted <strong>with everything filed in it</strong>:
                  marks, report cards, registers, schemes of work, lesson notes, question papers, CBT exams, fees and
                  payments. Pupils, staff, families and classes are not touched. This cannot be undone.
                </p>
                <Field label={`Type ${removing.view.name} to confirm`}>
                  <Input
                    value={typed}
                    onChange={(event) => setTyped(event.target.value)}
                    placeholder={removing.view.name}
                    aria-label="Type the session name to confirm"
                    autoFocus
                  />
                </Field>
              </>
            ) : (
              <p className="text-[14px] leading-relaxed text-secondary">
                Only the school's super administrator can delete a session together with its records. Ask them, or close
                the session instead: nothing is lost and every report card stays readable.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
