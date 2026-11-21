/**
 * HR pieces shared by My pay and the HR manager's screen: the salary
 * countdown, the clock, the attendance strip and a counting number.
 * (Ported from GetSchool.)
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Ban, CalendarDays, Check, Clock3, Hourglass, LogIn, LogOut, PartyPopper, RotateCcw } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { SceneArt } from '@/components/brand/SceneArt';
import { cn } from '@/lib/cn';
import { fromIso, isOffDay, prettyIso, workingDays, daysBetween, type PayPeriod } from '@/lib/payroll';
import { clockIn, clockOut, getAttendance, hoursBetween, timeOf, type Attendance } from '@/lib/hr';
import { dateLocale } from '@/lib/locale';

/** Monday to Sunday, one letter or character each, in the chosen language. 1 Jan 2024 was a Monday. */
const WEEKDAY_INITIALS = Array.from({ length: 7 }, (_, i) =>
  new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(dateLocale('en-GB'), { weekday: 'narrow', timeZone: 'UTC' }),
);

/* ------------------------------------------------------------------ time */

export function useNow(every = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), every);
    return () => window.clearInterval(id);
  }, [every]);
  return now;
}

const two = (n: number) => String(Math.max(0, n)).padStart(2, '0');

/** A number that counts up to its value when it first appears or changes. */
export function CountUp({ value, format, duration = 1100 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = begin + (value - begin) * eased;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(shown)}</>;
}

/* ------------------------------------------------------------- countdown */

/** Each character re-mounts when it changes, so only the digits that move animate. */


/* Four shades off the current theme; the colours live in `.hr-cycle-confetti-*`. */
const CONFETTI_TONES = ['hr-cycle-confetti-1', 'hr-cycle-confetti-2', 'hr-cycle-confetti-3', 'hr-cycle-confetti-4'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i * 0.23) % 4,
        duration: 3.2 + ((i * 7) % 10) / 4,
        drift: ((i % 7) - 3) * 18,
        tone: CONFETTI_TONES[i % CONFETTI_TONES.length],
        w: 6 + (i % 3) * 2,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={cn('hr-confetti absolute top-0 rounded-[2px]', p.tone)}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 1.6,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--hr-drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The salary card. Calm on purpose: the pay date, a ring that fills as the
 * pay period passes with the days left in it, and a slim bar of working days.
 * Drawn in the organisation's colour on the page's own card, with the owner's
 * Secondary artwork (a calendar with its due date) beside it on wider
 * screens. No ticking seconds: a salary is counted in days. Confetti on the
 * day itself.
 */
export function PayCountdown({
  period,
  holidays,
  today,
  footer,
  saturday,
}: {
  period: PayPeriod;
  holidays: Set<string>;
  today: string;
  footer?: ReactNode;
  saturday?: boolean;
}) {
  const now = useNow(60_000);
  const pay = fromIso(period.payDay);
  const target = new Date(pay.getFullYear(), pay.getMonth(), pay.getDate(), 0, 0, 0);
  const s = fromIso(period.start);
  const begin = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
  const isPayday = today === period.payDay;

  const left = Math.max(0, target.getTime() - now.getTime());
  const d = Math.ceil(left / 86_400_000);
  const pct = isPayday ? 1 : Math.min(1, Math.max(0, (now.getTime() - begin.getTime()) / (target.getTime() - begin.getTime())));

  const wd = workingDays(period.start, period.end, holidays, saturday);
  const done = Math.min(wd.filter((x) => x <= today).length, wd.length);

  const R = 42;
  const C = 2 * Math.PI * R;

  return (
    <section className="hr-pay relative isolate overflow-hidden rounded-[26px] border border-hairline surface-card p-5 shadow-card sm:p-6">
      {isPayday && <Confetti />}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-7">
        {/* the owner's calendar artwork, on a soft tile of the theme colour */}
        <div className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-[22px] bg-brand-50 md:flex dark:bg-brand-500/10">
          <SceneArt name="billing-calendar" className="h-32 w-32" />
        </div>

        <div className="hr-rise min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-micro font-bold uppercase tracking-[0.12em] text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            {isPayday ? <PartyPopper size={12} aria-hidden /> : <CalendarDays size={12} aria-hidden />}
            {isPayday ? 'Salary day' : 'Next salary'}
          </p>
          <h2 className="mt-2 font-display text-headline font-bold leading-tight tracking-[-0.03em] text-primary sm:text-display">
            {isPayday ? 'It’s salary day!' : prettyIso(period.payDay, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <p className="mt-1 text-label text-muted">
            {`${prettyIso(period.start, { day: 'numeric', month: 'short' })} to ${prettyIso(period.end, { day: 'numeric', month: 'short' })}`}
          </p>

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
              <div className="h-full rounded-full bg-brand-600 transition-[width] duration-1000 dark:bg-brand-400" style={{ width: `${wd.length ? (done / wd.length) * 100 : 0}%` }} />
            </div>
            <p className="mt-1.5 text-caption font-semibold text-secondary">{`Working day ${done} of ${wd.length}`}</p>
          </div>
        </div>

        {/* the ring: the pay period passing, the days left in the middle */}
        <div className="relative h-[112px] w-[112px] shrink-0 sm:h-[132px] sm:w-[132px]">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 text-brand-600 dark:text-brand-400" aria-hidden>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-sunken)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              className="transition-[stroke-dashoffset] duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center" role="timer" aria-label={isPayday ? 'Salary day' : `${d} days to salary day`}>
            {isPayday ? (
              <PartyPopper size={34} className="text-brand-600 dark:text-brand-400" aria-hidden />
            ) : (
              <>
                <span className="font-display text-[2rem] font-bold leading-none tracking-[-0.04em] text-primary sm:text-[2.5rem]">{d}</span>
                <span className="mt-0.5 max-w-[78%] text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-muted sm:text-micro sm:tracking-[0.1em]">{d === 1 ? 'day to go' : 'days to go'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {footer && <div className="mt-4 border-t border-hairline pt-3 text-label text-secondary">{footer}</div>}
    </section>
  );
}

/** Same component under its later name, so both imports work. */
export const PayCycle = PayCountdown;

/* ----------------------------------------------------------------- clock */

/**
 * Clock in and clock out. Times are the server's, not the phone's.
 */
export function ClockCard({
  uid,
  name,
  today,
  holidayName,
  onChanged,
  saturday,
}: {
  uid: string;
  name: string;
  today: string;
  holidayName?: string;
  onChanged?: () => void;
  saturday?: boolean;
}) {
  const toast = useToast();
  const now = useNow(1000);
  const [record, setRecord] = useState<Attendance | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = () =>
    void getAttendance(uid, today)
      .then(setRecord)
      .catch(() => setRecord(null));
  useEffect(load, [uid, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekend = isOffDay(today, saturday);
  const offDay = weekend || Boolean(holidayName);

  const act = async (kind: 'in' | 'out') => {
    setBusy(true);
    try {
      if (kind === 'in') await clockIn(uid, name, today);
      else await clockOut(uid, today);
      toast.success(kind === 'in' ? 'Clocked in' : 'Clocked out', kind === 'in' ? 'Have a good day.' : 'See you tomorrow.');
      load();
      onChanged?.();
    } catch (err) {
      toast.error('Could not do that', err instanceof Error ? err.message : 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const hh = two(now.getHours());
  const mm = two(now.getMinutes());
  const ss = two(now.getSeconds());
  const state = !record ? 'out' : record.absent ? 'absent' : record.outAt || record.manual ? 'done' : 'in';

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-hairline surface-card p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.1em] text-muted">
            <Clock3 size={14} aria-hidden /> Attendance
          </p>
          <p className="mt-0.5 text-label text-secondary">{prettyIso(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-micro font-bold uppercase tracking-wide',
            state === 'in'
              ? 'bg-[#0ca30c]/12 text-[#0a7a0a] dark:text-[#4ec54e]'
              : state === 'done'
                ? 'bg-[#2a78d6]/10 text-[#1c5cab] dark:text-[#7cb1f0]'
                : 'bg-[var(--surface-sunken)] text-muted',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full bg-current', state === 'in' && 'hr-blink')} />
          {state === 'in' ? 'On duty' : state === 'done' ? 'Done for today' : state === 'absent' ? 'Marked absent' : 'Not clocked in'}
        </span>
      </div>

      <p className="mt-4 font-display text-jumbo font-bold leading-none tracking-[-0.05em] text-primary tabular sm:text-jumbo">
        {hh}
        <span className="hr-blink text-brand-600">:</span>
        {mm}
        <span className="ml-1 text-headline font-bold text-muted sm:text-headline">{ss}</span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl surface-sunken px-3.5 py-3">
          <p className="text-micro font-bold uppercase tracking-wide text-muted">In</p>
          <p className="mt-0.5 text-title font-bold text-primary tabular">{record?.absent ? 'Absent' : record?.manual && !record.inAt ? 'Marked' : timeOf(record?.inAt)}</p>
        </div>
        <div className="rounded-2xl surface-sunken px-3.5 py-3">
          <p className="text-micro font-bold uppercase tracking-wide text-muted">Out</p>
          <p className="mt-0.5 text-title font-bold text-primary tabular">{timeOf(record?.outAt)}</p>
        </div>
      </div>

      <div className="mt-5">
        {record === undefined ? (
          <Button full size="lg" variant="outline" loading>
            Checking…
          </Button>
        ) : offDay && state === 'out' ? (
          <p className="rounded-2xl border border-dashed border-hairline px-4 py-3.5 text-center text-body text-secondary">
            {`${holidayName ? `${holidayName} (a holiday).` : 'Day off.'} No clock in needed today.`}</p>
        ) : state === 'out' ? (
          <Button full size="lg" icon={<LogIn size={18} />} loading={busy} onClick={() => void act('in')} className="hr-breathe !bg-[#0b8f0b] hover:!bg-[#0a7a0a]">
            Clock in
          </Button>
        ) : state === 'in' ? (
          <Button full size="lg" icon={<LogOut size={18} />} loading={busy} onClick={() => void act('out')} className="hr-breathe-red">
            Clock out
          </Button>
        ) : state === 'absent' ? (
          <p className="rounded-2xl bg-[#d03b3b]/10 px-4 py-3.5 text-center text-body font-semibold text-[#a52929] dark:text-[#f08080]">
            HR has marked you absent today. This day is not paid.
          </p>
        ) : (
          <p className="rounded-2xl bg-[#0ca30c]/10 px-4 py-3.5 text-center text-body font-semibold text-[#0a7a0a] dark:text-[#4ec54e]">
            {record?.manual ? 'Marked present for today.' : `You worked ${hoursBetween(record?.inAt, record?.outAt)} today. Well done.`}
          </p>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------- attendance strip */

export type DayState =
  | 'worked'
  | 'auto'
  | 'reissued'
  | 'pending'
  | 'off'
  | 'missed'
  | 'today'
  | 'future'
  | 'weekend'
  | 'holiday'
  | 'before';

export function dayState(
  date: string,
  opts: {
    today: string;
    holidays: Set<string>;
    attended: Set<string>;
    resumption?: string;
    autoUntil?: string;
    autoAll?: boolean;
    reissued?: Set<string>;
    requests?: Map<string, string>;
    absent?: Set<string>;
    saturday?: boolean;
  },
): DayState {
  if (isOffDay(date, opts.saturday)) return 'weekend';
  if (opts.holidays.has(date)) return 'holiday';
  if (opts.resumption && date < opts.resumption) return 'before';
  if (opts.absent?.has(date)) return 'off';
  if (opts.reissued?.has(date)) return 'reissued';
  if (opts.attended.has(date)) return 'worked';
  if (opts.autoUntil && date <= opts.autoUntil) return 'auto';
  if (opts.autoAll && date <= opts.today) return 'auto';
  if (opts.requests?.get(date) === 'pending') return 'pending';
  if (date === opts.today) return 'today';
  if (date < opts.today) return 'missed';
  return 'future';
}

const CELL: Record<DayState, string> = {
  worked: 'bg-[#0ca30c] text-white border-transparent',
  auto: 'bg-[#0ca30c]/75 text-white border-transparent',
  reissued: 'bg-[#2a78d6] text-white border-transparent',
  pending: 'border-[#fab219] bg-[#fab219]/15 text-[#8a6100] dark:text-[#fab219]',
  off: 'bg-[#d03b3b] text-white border-transparent',
  missed: 'border-[#d03b3b]/45 text-[#a52929] dark:text-[#f08080] bg-[#d03b3b]/[0.06]',
  today: 'border-brand-600 text-primary ring-2 ring-brand-600/25',
  future: 'border-hairline text-muted',
  weekend: 'border-transparent text-muted/50 opacity-45',
  holiday: 'border-transparent bg-gold-400/25 text-[#8a6100] dark:text-gold-300',
  before: 'border-dashed border-hairline text-muted/60 opacity-60',
};

const LABEL: Record<DayState, string> = {
  worked: 'present',
  auto: 'present (counted automatically)',
  reissued: 'present (reissued)',
  pending: 'reissue requested, waiting',
  off: 'marked absent by HR, not paid',
  missed: 'absent',
  today: 'today',
  future: 'to come',
  weekend: 'day off',
  holiday: 'holiday',
  before: 'before resumption',
};

function CellIcon({ st }: { st: DayState }) {
  const cls = 'mt-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5';
  if (st === 'worked' || st === 'auto') return <Check className={cls} strokeWidth={3} aria-hidden />;
  if (st === 'reissued') return <RotateCcw className={cls} strokeWidth={3} aria-hidden />;
  if (st === 'pending') return <Hourglass className={cls} strokeWidth={2.5} aria-hidden />;
  if (st === 'off') return <Ban className={cls} strokeWidth={2.6} aria-hidden />;
  return null;
}

/**
 * The pay period as a calendar. HR taps a day to mark it present or absent
 * (`onToggle`); staff tap a missed day to ask for a reissue (`onRequest`).
 */
export function AttendanceStrip({
  period,
  today,
  holidays,
  attended,
  resumption,
  autoUntil,
  autoAll,
  reissued,
  requests,
  absent,
  onToggle,
  onRequest,
  saturday,
}: {
  period: PayPeriod;
  today: string;
  holidays: Set<string>;
  attended: Set<string>;
  resumption?: string;
  autoUntil?: string;
  autoAll?: boolean;
  reissued?: Set<string>;
  requests?: Map<string, string>;
  absent?: Set<string>;
  onToggle?: (date: string, present: boolean) => void;
  onRequest?: (date: string) => void;
  saturday?: boolean;
}) {
  const days = daysBetween(period.start, period.end);
  const any = (st: DayState) => days.some((d) => dayState(d, { today, holidays, attended, resumption, autoUntil, autoAll, reissued, requests, absent, saturday }) === st);
  return (
    <div className="max-w-[460px]">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {/*
          The weekday initials come from the browser, in the chosen language:
          "M T W T F S S" cannot be translated letter by letter, because T is
          both Tuesday and Thursday and S both Saturday and Sunday. translate=
          "no" stops the page translator re-reading them as English letters.
 */}
        {WEEKDAY_INITIALS.map((w, i) => (
          <span key={i} translate="no" className="text-center text-micro font-semibold uppercase text-muted">
            {w}
          </span>
        ))}
        {Array.from({ length: (fromIso(days[0]).getDay() + 6) % 7 }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((date, i) => {
          const st = dayState(date, { today, holidays, attended, resumption, autoUntil, autoAll, reissued, requests, absent, saturday });
          /* HR may change any working day: present days (clocked, automatic or reissued) to absent, anything else to present. */
          const toggles = Boolean(onToggle) && !['weekend', 'holiday', 'before', 'future'].includes(st);
          const countsNow = st === 'worked' || st === 'auto' || st === 'reissued';
          const asks = Boolean(onRequest) && st === 'missed';
          const clickable = toggles || asks;
          return (
            <button
              key={date}
              type="button"
              disabled={!clickable}
              onClick={() => {
                if (toggles) onToggle?.(date, !countsNow);
                else if (asks) onRequest?.(date);
              }}
              title={`${prettyIso(date)}: ${asks ? 'absent, tap to request a reissue' : LABEL[st]}`}
              style={{ animationDelay: `${i * 18}ms` }}
              className={cn(
                'hr-rise relative flex aspect-square flex-col items-center justify-center rounded-xl border text-label font-bold leading-none tabular transition-transform',
                CELL[st],
                clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default',
                asks && 'hover:border-[#d03b3b] hover:bg-[#d03b3b]/10',
              )}
            >
              {fromIso(date).getDate()}
              <CellIcon st={st} />
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-caption text-muted">
        <Legend className="bg-[#0ca30c]">Present</Legend>
        {any('auto') && <Legend className="bg-[#0ca30c]/75">Counted present</Legend>}
        {any('reissued') && <Legend className="bg-[#2a78d6]">Reissued</Legend>}
        {any('pending') && <Legend className="border border-[#fab219] bg-[#fab219]/20">Reissue waiting</Legend>}
        {any('off') && <Legend className="bg-[#d03b3b]">Marked absent</Legend>}
        <Legend className="border border-[#d03b3b]/50 bg-[#d03b3b]/10">Absent</Legend>
        <Legend className="bg-gold-400/40">Holiday</Legend>
        <Legend className="border border-hairline">To come</Legend>
        {resumption && any('before') && <Legend className="border border-dashed border-hairline">Before resumption</Legend>}
      </div>
      {onRequest && any('missed') && (
        <p className="mt-2.5 text-caption text-secondary">Missed a day you worked? Tap the red day to request a reissue.</p>
      )}
    </div>
  );
}

function Legend({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-[4px]', className)} />
      {children}
    </span>
  );
}

export function PeriodNote({ period }: { period: PayPeriod }) {
  return (
    <p className="flex items-center gap-1.5 text-label text-muted">
      <CalendarDays size={13} aria-hidden />
      {`From ${prettyIso(period.start, { day: 'numeric', month: 'short' })} to ${prettyIso(period.end, { day: 'numeric', month: 'short', year: 'numeric' })}`}
    </p>
  );
}
