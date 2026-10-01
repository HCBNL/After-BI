/**
 * Booking the walkthrough.
 *
 * Two screens, and the first one is a calendar because that is the question a
 * person actually has: not "may I have a demo" but "when". Pick a weekday,
 * pick an hour, then four boxes for who you are, and the hour is held.
 *
 * WHAT THIS DOES NOT PRETEND TO BE
 *
 * A diary. It offers the hours we keep for walkthroughs, in West Africa Time,
 * and the confirmation says in plain words that we will write back to confirm
 * and send the link. A calendar that claims to know who is free will double
 * book somebody in its first week, and the recovery from that costs more trust
 * than the booking was worth.
 *
 * The office and the visitor both get an email. See `/api/enquiry`.
 */

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Video,
} from 'lucide-react';
import { Sheet } from './Sheet';
import { cn } from '@/lib/cn';
import { SUPPORT_EMAIL } from '@/lib/constants';
import {
  DEMO_SLOTS,
  DEMO_TIMEZONE,
  clockLabel,
  isoDate,
  longDate,
  submitToOffice,
} from '@/lib/marketing';

/* ------------------------------------------------------------ the calendar */

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The cells of one month, starting on a Monday.
 *
 * Nulls for the days before the first, so the grid keeps its shape without a
 * previous month's numbers sitting in it greyed out. A visitor picking a date
 * on a phone does not need last month on the screen.
 */
function monthCells(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  /* getDay() is Sunday first; the grid is Monday first. */
  const lead = (first.getDay() + 6) % 7;

  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
  ];
}

const startOfToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** Weekdays only, today onward, and no more than three months ahead. */
function bookable(day: Date): boolean {
  const today = startOfToday();
  const horizon = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
  const weekday = day.getDay() !== 0 && day.getDay() !== 6;
  return weekday && day >= today && day <= horizon;
}

/* ======================================================================== */

type Stage = 'when' | 'who' | 'done';

export function BookDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('when');
  /* Whether a confirmation and a calendar invite are actually on their way.
   * The booking is filed either way; the email is the part that can fail. */
  const [emailed, setEmailed] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [contactName, setContactName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const cells = useMemo(() => monthCells(month), [month]);
  const today = startOfToday();
  const atStart = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  const reset = () => {
    setStage('when');
    setDate('');
    setTime('');
    setContactName('');
    setSchoolName('');
    setEmail('');
    setPhone('');
    setNote('');
    setError(null);
  };

  const close = () => {
    onClose();
    /* Cleared after the sheet has gone, so the last frame is not the form
       emptying itself in front of somebody. */
    window.setTimeout(reset, 400);
  };

  const send = async () => {
    if (contactName.trim().length < 2) return setError('Tell us your name.');
    if (schoolName.trim().length < 2) return setError('Which school are you booking for?');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      return setError('That email address does not look complete.');
    }
    if (phone.replace(/\D/g, '').length < 7) return setError('That phone number looks too short.');

    setSending(true);
    setError(null);
    try {
      const outcome = await submitToOffice({
        kind: 'demo',
        contactName: contactName.trim(),
        schoolName: schoolName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        date,
        time,
        timezone: DEMO_TIMEZONE,
        note: note.trim(),
      });
      setEmailed(outcome.emailed);
      setStage('done');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not send. Please try once more.');
    } finally {
      setSending(false);
    }
  };

  const field =
    'h-12 w-full rounded-xl border border-hairline bg-[var(--surface-card)] px-4 text-[16px] text-primary outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

  return (
    <Sheet open={open} onClose={close} label="Book a walkthrough of GetSchool" wide>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* The wordmark in the middle, what is being booked under it, and the slot once one is picked. */}
        <header
          className="shrink-0 px-12 pb-3 pt-5 text-center sm:px-14"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
        >
          <span className="font-display text-[1.45rem] font-extrabold leading-none tracking-[-0.05em] text-white">
            GetSchool<span className="text-brand-500">.</span>
          </span>
          <h2 className="mt-4 font-display text-[1.7rem] font-extrabold leading-tight tracking-[-0.035em] text-white sm:text-[2rem]">
            Book a walkthrough
          </h2>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] font-semibold text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-brand-400" aria-hidden />
              60 minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Video size={14} className="text-brand-400" aria-hidden />
              Online
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe size={14} className="text-brand-400" aria-hidden />
              West Africa Time
            </span>
          </p>
          {date && time && stage !== 'done' && (
            <p className="mt-4 inline-flex rounded-full bg-brand-600/15 px-3.5 py-1.5 text-[13px] font-bold text-white ring-1 ring-inset ring-brand-500/40">
              {longDate(date)} · {clockLabel(time)}
            </p>
          )}
        </header>

        {/* -------------------------------------------------------- the pick */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-3 sm:px-8">
          {stage === 'done' ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#34d399]/15">
                <CheckCircle2 size={32} className="text-[#34d399]" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-[1.5rem] font-extrabold tracking-tight text-primary">
                That hour is yours
              </h3>
              <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-secondary">
                {longDate(date)} at {clockLabel(time)}, West Africa Time.{' '}
                {emailed
                  ? 'The confirmation is in your inbox, and the meeting link follows before we start.'
                  : 'The hour is held. Our mail is playing up just now, so the confirmation and the meeting link will follow as soon as it is back.'}
              </p>
              <p className="mt-4 text-[13px] text-muted">
                Need to move it? Write to{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand-400 underline">
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
              <button
                type="button"
                onClick={close}
                className="tap mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 text-[15px] font-bold text-white transition-colors hover:bg-brand-700"
              >
                Done
              </button>
            </div>
          ) : stage === 'who' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <button
                type="button"
                onClick={() => setStage('when')}
                className="tap -ml-2 inline-flex items-center gap-1.5 rounded-xl px-2 text-[13.5px] font-bold text-secondary transition-colors hover:text-primary"
              >
                <ArrowLeft size={15} aria-hidden />
                Change the time
              </button>

              <h3 className="mt-3 text-center font-display text-[1.4rem] font-extrabold leading-tight tracking-tight text-primary">
                Who should we expect?
              </h3>
              <p className="mt-2 text-center text-[14px] text-secondary">
                Four things, and the hour is held for you.
              </p>

              <div className="mt-5 grid gap-3.5">
                <input
                  className={field}
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Your name"
                  aria-label="Your name"
                  autoComplete="name"
                  maxLength={120}
                  autoFocus
                />
                <input
                  className={field}
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  placeholder="School name"
                  aria-label="School name"
                  autoComplete="organization"
                  maxLength={160}
                />
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <input
                    className={field}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    aria-label="Email address"
                    autoComplete="email"
                    maxLength={160}
                  />
                  <input
                    className={field}
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Phone or WhatsApp"
                    aria-label="Phone number"
                    autoComplete="tel"
                    maxLength={40}
                  />
                </div>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-hairline bg-[var(--surface-card)] px-4 py-3 text-[16px] leading-relaxed text-primary outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Anything you want us to cover? Optional."
                  aria-label="Anything you want us to cover"
                  maxLength={1000}
                />
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-[#d03b3b]/8 px-4 py-3 text-[13.5px] font-semibold text-[#f08080]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="tap mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-[15px] font-bold text-white transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60 sm:w-auto"
              >
                {sending ? 'Booking' : 'Confirm the booking'}
                {!sending && <ArrowRight size={16} aria-hidden />}
              </button>

              <p className="mt-3 text-[12.5px] text-muted">
                We will email you to confirm and send the link. Nothing is charged and nothing is
                installed.
              </p>
            </form>
          ) : (
            <>
              <h3 className="text-center font-display text-[1.25rem] font-extrabold leading-tight tracking-tight text-primary">
                Pick a date and a time
              </h3>

              <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_11rem]">
                {/* ------------------------------------------- the month */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={atStart}
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                      aria-label="Previous month"
                      className="tap inline-flex items-center justify-center rounded-xl text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <p className="text-[15px] font-bold text-primary">
                      {month.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
                    </p>
                    <button
                      type="button"
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                      aria-label="Next month"
                      className="tap inline-flex items-center justify-center rounded-xl text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-7 gap-1">
                    {WEEK.map((day) => (
                      <span
                        key={day}
                        className="pb-1 text-center text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted"
                      >
                        {day}
                      </span>
                    ))}

                    {cells.map((day, index) => {
                      if (!day) return <span key={`pad-${index}`} />;
                      const iso = isoDate(day);
                      const open = bookable(day);
                      const chosen = iso === date;
                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={!open}
                          onClick={() => {
                            setDate(iso);
                            setTime('');
                          }}
                          aria-label={longDate(iso)}
                          aria-pressed={chosen}
                          className={cn(
                            'flex aspect-square items-center justify-center rounded-xl text-[13.5px] font-bold tabular transition-all',
                            !open && 'cursor-not-allowed text-white/25',
                            open && !chosen && 'bg-brand-600/15 text-brand-300 hover:bg-brand-600/25',
                            chosen && 'bg-brand-600 text-white shadow-card',
                          )}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-4 flex items-center gap-2 text-[12.5px] font-semibold text-muted">
                    <Globe size={14} aria-hidden />
                    {DEMO_TIMEZONE}, weekdays only
                  </p>
                </div>

                {/* -------------------------------------------- the hours */}
                <div className="min-w-0">
                  {date ? (
                    <>
                      <p className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-muted">
                        {new Date(`${date}T00:00:00`).toLocaleDateString('en-NG', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                      <div className="scrollbar-thin mt-3 grid max-h-[16rem] grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-1">
                        {DEMO_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              setTime(slot);
                              setStage('who');
                            }}
                            className={cn(
                              'tap rounded-xl border px-3 text-[14px] font-bold tabular transition-all',
                              time === slot
                                ? 'border-brand-500 bg-brand-600/15 text-white'
                                : 'border-hairline text-secondary hover:border-brand-400 hover:text-primary',
                            )}
                          >
                            {clockLabel(slot)}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full min-h-[10rem] flex-col items-center justify-center rounded-2xl border border-dashed border-hairline px-4 text-center">
                      <CalendarDays size={22} className="text-muted" aria-hidden />
                      <p className="mt-2 text-[13px] font-semibold text-muted">
                        Pick a day to see the hours we have open.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
