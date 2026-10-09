/**
 * HR pieces shared by My pay and the HR manager's screen: the salary
 * countdown, the clock, the attendance strip and a counting number.
 * (Ported from GetSchool.)
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Ban, CalendarDays, Check, Clock3, Hourglass, LogIn, LogOut, PartyPopper, RotateCcw, Sparkles } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { fromIso, isOffDay, prettyIso, workingDays, daysBetween, type PayPeriod } from '@/lib/payroll';
import { clockIn, clockOut, getAttendance, hoursBetween, timeOf, type Attendance } from '@/lib/hr';

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
function Digits({ value }: { value: string }) {
  return (
    <span className="inline-flex overflow-hidden">
      {value.split('').map((ch, i) => (
        <span key={`${i}-${ch}`} className="hr-digit inline-block tabular">
          {ch}
        </span>
      ))}
    </span>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] px-1 pb-2.5 pt-3 backdrop-blur-sm sm:pb-3 sm:pt-4">
      <span aria-hidden className="absolute inset-x-3 top-1/2 h-px bg-white/[0.07]" />
      <span className="font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.04em] text-white sm:text-[2.6rem]">
        <Digits value={value} />
      </span>
      <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45 sm:text-[11px]">{label}</span>
    </div>
  );
}

const CONFETTI_COLOURS = ['#fbbf24', '#ee6a00', '#ffffff', '#4ec54e', '#7cb1f0', '#f472b6'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i * 0.23) % 4,
        duration: 3.2 + ((i * 7) % 10) / 4,
        drift: ((i % 7) - 3) * 18,
        colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
        w: 6 + (i % 3) * 2,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="hr-confetti absolute top-0 rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 1.6,
            background: p.colour,
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
 * The salary countdown. Navy, a slow aurora behind it, days, hours, minutes
 * and seconds ticking, a ring filling as the pay period passes, and confetti
 * on the day itself.
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
  const now = useNow(1000);
  const pay = fromIso(period.payDay);
  const target = new Date(pay.getFullYear(), pay.getMonth(), pay.getDate(), 0, 0, 0);
  const s = fromIso(period.start);
  const begin = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
  const isPayday = today === period.payDay;

  const left = Math.max(0, target.getTime() - now.getTime());
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  const pct = isPayday ? 1 : Math.min(1, Math.max(0, (now.getTime() - begin.getTime()) / (target.getTime() - begin.getTime())));

  const wd = workingDays(period.start, period.end, holidays, saturday);
  const done = wd.filter((x) => x <= today).length;

  const R = 84;
  const C = 2 * Math.PI * R;
  const angle = pct * 2 * Math.PI - Math.PI / 2;

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-night p-5 text-white shadow-pop sm:p-8">
      {/* the light behind it */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="hr-aurora absolute -left-24 -top-28 h-80 w-80 rounded-full bg-brand-600/35 blur-[90px]" />
        <div className="hr-aurora-slow absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-gold-400/20 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>
      {isPayday && <Confetti />}

      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto] md:gap-10">
        <div className="hr-rise min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-300">
            {isPayday ? <PartyPopper size={13} aria-hidden /> : <Sparkles size={13} aria-hidden />}
            {isPayday ? 'Salary day' : 'Next salary'}
          </p>
          <h2 className="mt-3 font-display text-[1.7rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[2.4rem]">
            {isPayday ? (
              <>
                It&rsquo;s salary day<span className="text-gold-400">!</span>
              </>
            ) : (
              <>
                {prettyIso(period.payDay, { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="text-brand-500">.</span>
              </>
            )}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-white/60">
            {period.label} salary, covers {prettyIso(period.start, { day: 'numeric', month: 'short' })} to{' '}
            {prettyIso(period.end, { day: 'numeric', month: 'short' })}
          </p>

          {!isPayday && (
            <div className="mt-5 flex gap-2 sm:gap-3" role="timer" aria-label={`${d} days ${h} hours ${m} minutes to salary day`}>
              <Unit value={two(d)} label={d === 1 ? 'Day' : 'Days'} />
              <Unit value={two(h)} label="Hours" />
              <Unit value={two(m)} label="Mins" />
              <Unit value={two(sec)} label="Secs" />
            </div>
          )}

          {/* the period, as a bar */}
          <div className="mt-5">
            <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-600 via-[#f0643b] to-gold-400 transition-[width] duration-1000"
                style={{ width: `${pct * 100}%` }}
              >
                <span className="hr-sheen absolute inset-0 rounded-full" />
              </div>
            </div>
            <div className="mt-2 flex justify-between gap-2 text-[11.5px] font-semibold text-white/50">
              <span>{prettyIso(period.start, { day: 'numeric', month: 'short' })}</span>
              <span className="text-white/75">
                Working day {Math.min(done, wd.length)} of {wd.length}
              </span>
              <span>{prettyIso(period.end, { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          {footer && <div className="mt-4">{footer}</div>}
        </div>

        {/* the ring */}
        <div className="relative mx-auto hidden h-[212px] w-[212px] shrink-0 sm:block">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="hr-ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ee6a00" />
                <stop offset="55%" stopColor="#f0643b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="url(#hr-ring-grad)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              className="hr-ring transition-[stroke-dashoffset] duration-1000"
              style={{ ['--hr-ring-full' as string]: C }}
            />
          </svg>
          {/* the bead at the tip of the ring */}
          <span
            aria-hidden
            className="absolute h-4 w-4 rounded-full bg-gold-300 shadow-[0_0_18px_6px_rgba(251,191,36,0.55)] transition-all duration-1000"
            style={{ left: `calc(50% + ${(R / 200) * 100 * Math.cos(angle)}% - 8px)`, top: `calc(50% + ${(R / 200) * 100 * Math.sin(angle)}% - 8px)` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {isPayday ? (
              <PartyPopper size={48} className="text-gold-300" aria-hidden />
            ) : (
              <>
                <span className="font-display text-[3.4rem] font-extrabold leading-none tracking-[-0.05em]">
                  <Digits value={String(d)} />
                </span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{d === 1 ? 'day to go' : 'days to go'}</span>
              </>
            )}
            <span className="mt-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold tabular text-white/70">{Math.round(pct * 100)}% of the month</span>
          </div>
        </div>
      </div>
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
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
            <Clock3 size={14} aria-hidden /> Attendance
          </p>
          <p className="mt-0.5 text-[13px] text-secondary">{prettyIso(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
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

      <p className="mt-4 font-display text-[3rem] font-extrabold leading-none tracking-[-0.05em] text-primary tabular sm:text-[3.6rem]">
        {hh}
        <span className="hr-blink text-brand-600">:</span>
        {mm}
        <span className="ml-1 text-[1.3rem] font-bold text-muted sm:text-[1.6rem]">{ss}</span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl surface-sunken px-3.5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">In</p>
          <p className="mt-0.5 text-[17px] font-bold text-primary tabular">{record?.absent ? 'Absent' : record?.manual && !record.inAt ? 'Marked' : timeOf(record?.inAt)}</p>
        </div>
        <div className="rounded-2xl surface-sunken px-3.5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Out</p>
          <p className="mt-0.5 text-[17px] font-bold text-primary tabular">{timeOf(record?.outAt)}</p>
        </div>
      </div>

      <div className="mt-5">
        {record === undefined ? (
          <Button full size="lg" variant="outline" loading>
            Checking…
          </Button>
        ) : offDay && state === 'out' ? (
          <p className="rounded-2xl border border-dashed border-hairline px-4 py-3.5 text-center text-[13.5px] text-secondary">
            {holidayName ? `${holidayName} (a holiday).` : 'Day off.'} No clock in needed today.
          </p>
        ) : state === 'out' ? (
          <Button full size="lg" icon={<LogIn size={18} />} loading={busy} onClick={() => void act('in')} className="hr-breathe !bg-[#0b8f0b] hover:!bg-[#0a7a0a]">
            Clock in
          </Button>
        ) : state === 'in' ? (
          <Button full size="lg" icon={<LogOut size={18} />} loading={busy} onClick={() => void act('out')} className="hr-breathe-red">
            Clock out
          </Button>
        ) : state === 'absent' ? (
          <p className="rounded-2xl bg-[#d03b3b]/10 px-4 py-3.5 text-center text-[14px] font-semibold text-[#a52929] dark:text-[#f08080]">
            HR has marked you absent today. This day is not paid.
          </p>
        ) : (
          <p className="rounded-2xl bg-[#0ca30c]/10 px-4 py-3.5 text-center text-[14px] font-semibold text-[#0a7a0a] dark:text-[#4ec54e]">
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
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
          <span key={i} className="text-center text-[10.5px] font-bold uppercase text-muted">
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
              title={`${prettyIso(date)}: ${LABEL[st]}${asks ? ', tap to request a reissue' : ''}`}
              style={{ animationDelay: `${i * 18}ms` }}
              className={cn(
                'hr-rise relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[12.5px] font-bold leading-none tabular transition-transform',
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
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-muted">
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
        <p className="mt-2.5 text-[12px] text-secondary">Missed a day you worked? Tap the red day to request a reissue.</p>
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
    <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
      <CalendarDays size={13} aria-hidden />
      {prettyIso(period.start, { day: 'numeric', month: 'short' })} to {prettyIso(period.end, { day: 'numeric', month: 'short', year: 'numeric' })}
    </p>
  );
}
