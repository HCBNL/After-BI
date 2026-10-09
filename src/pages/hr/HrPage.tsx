/**
 * My pay: the countdown to salary day, clock in and clock out, this month's
 * attendance, bonuses and deductions, and what the month has earned so far.
 *
 * HR's own screen is `HrManage.tsx`. Rules and arithmetic: `src/lib/hr.ts`
 * and `src/lib/payroll.ts`.
 */

import { useMemo, useState } from 'react';
import { Banknote, CalendarCheck2, Gift, Hourglass, Info, MinusCircle, RotateCcw, TrendingUp, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Badge, Button, Card, Field, Modal, Textarea, useToast } from '@/components/ui';
import { Hint } from '@/components/ui/Hint';
import { Loading } from '@/components/brand/Loader';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import {
  getHrSettings,
  getMyHr,
  listAdjustments,
  listAttendance,
  listHolidays,
  listMyReissues,
  naira,
  nairaPrecise,
  requestReissue,
  splitAttendance,
  type Adjustment,
  type Reissue,
} from '@/lib/hr';
import { computePay, currentPeriod, cycleWords, iso, ordinal, prettyIso, workingDays } from '@/lib/payroll';
import { AttendanceStrip, ClockCard, CountUp, PayCycle, PeriodNote } from './HrParts';

export default function HrPage() {
  const { user } = useAuth();
  const uid = user?.id ?? '';
  const name = user ? `${user.firstName} ${user.lastName}`.trim() : '';
  const today = iso(new Date());
  const [tick, setTick] = useState(0);
  const [asking, setAsking] = useState<string | null>(null);

  const base = useAsync(
    async () => {
      const [settings, holidays, me] = await Promise.all([getHrSettings(), listHolidays(), getMyHr(uid)]);
      return { settings, holidays, me };
    },
    [uid],
    { handleError: true },
  );

  const holidaySet = useMemo(() => new Set((base.data?.holidays ?? []).map((h) => h.id)), [base.data]);
  const rules = useMemo(() => (base.data ? { ...base.data.settings, holidays: holidaySet } : null), [base.data, holidaySet]);
  const period = useMemo(() => (rules ? currentPeriod(today, rules) : null), [rules, today]);

  const reissues = useAsync(
    () => (period ? listMyReissues(uid, period.start, period.end) : Promise.resolve([] as Reissue[])),
    [uid, period?.start, period?.end, tick],
    { handleError: true },
  );
  const att = useAsync(() => (period ? listAttendance(uid, period.start, period.end) : Promise.resolve([])), [uid, period?.start, period?.end, tick], {
    handleError: true,
  });
  const adjustments = useAsync(() => (period ? listAdjustments(period.key, uid) : Promise.resolve([] as Adjustment[])), [uid, period?.key], {
    handleError: true,
  });

  if (base.error) {
    return (
      <>
        <PageHeader title="My pay" />
        <Alert tone="critical" title="Could not load your pay">
          {base.error.message}
        </Alert>
      </>
    );
  }
  if (!base.data || !period || !rules) return <Loading label="Opening your pay" />;

  const me = base.data.me;
  const saturday = rules.saturday;
  const { attended, absent, reissued } = splitAttendance(att.data ?? []);
  const requests = new Map((reissues.data ?? []).map((r) => [r.date, r.status]));
  const holidayToday = base.data.holidays.find((h) => h.id === today)?.name;
  const pay = me
    ? computePay({ salary: me.salary, resumption: me.resumption, period, holidays: holidaySet, saturday, attended, today, autoUntil: rules.autoUntil, autoAll: me.autoPresent, absent })
    : null;
  const ahead = me && !me.autoPresent
    ? workingDays(period.start, period.end, holidaySet, saturday).filter(
        (d) => d > today && d >= (me.resumption || '') && !absent.has(d) && !(rules.autoUntil && d <= rules.autoUntil),
      ).length
    : 0;
  const bonus = (adjustments.data ?? []).filter((a) => a.kind === 'bonus').reduce((s, a) => s + a.amount, 0);
  const deduction = (adjustments.data ?? []).filter((a) => a.kind === 'deduction').reduce((s, a) => s + a.amount, 0);
  const net = pay ? Math.max(0, pay.pay + bonus - deduction) : 0;
  const upcomingHolidays = base.data.holidays
    .filter((h) => h.id >= today)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <PageHeader
        title="My pay"
        actions={
          <Hint label="How your pay is worked out">
            Each month covers {cycleWords(base.data.settings.cycleStart)}, Monday to {saturday ? 'Saturday' : 'Friday'} only. Salary is paid on the{' '}
            {ordinal(base.data.settings.payDay)}, or the working day before if that is a day off or holiday. Your monthly salary divided by the
            working days is your daily rate; every day you clock in earns it. Bonuses are added and deductions taken off.
          </Hint>
        }
      />

      <PayCycle period={period} holidays={holidaySet} today={today} saturday={saturday} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {me?.autoPresent ? (
          <section className="rounded-[24px] border border-hairline surface-card p-5 shadow-card sm:p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">Attendance</p>
            <p className="mt-3 text-[14px] leading-relaxed text-secondary">
              You do not need to clock in. Every working day from your resumption date counts as present unless HR marks a day absent.
            </p>
          </section>
        ) : (
          <ClockCard uid={uid} name={name} today={today} holidayName={holidayToday} saturday={saturday} onChanged={() => setTick((n) => n + 1)} />
        )}

        <section className="rounded-[24px] border border-hairline surface-card p-5 shadow-card sm:p-6">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
            <Banknote size={14} aria-hidden /> Earned so far, {period.label}
          </p>
          {!me ? (
            <Alert tone="info" className="mt-4" title="Salary not set up yet" icon={<Info size={16} />}>
              HR has not added your salary yet. Your clock ins still count; HR will add your salary and resumption date.
            </Alert>
          ) : (
            <>
              <p className="mt-3 font-display text-[2.6rem] font-extrabold leading-none tracking-[-0.045em] text-primary tabular sm:text-[3.2rem]">
                <CountUp value={net} format={naira} />
              </p>
              <p className="mt-1.5 text-[13px] text-secondary">
                of {naira(me.salary)} monthly, {pay!.worked} of {pay!.eligible} working days
              </p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0b8f0b] to-[#4ec54e] transition-[width] duration-1000"
                  style={{ width: `${me.salary ? Math.min(100, (pay!.pay / me.salary) * 100) : 0}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <Stat label="Daily rate" value={nairaPrecise(pay!.daily)} />
                <Stat label="Working days" value={String(pay!.workingDays)} />
                <Stat label="Missed" value={String(pay!.missed)} tone={pay!.missed ? 'bad' : undefined} />
              </div>
              {(bonus > 0 || deduction > 0) && (
                <div className="mt-4 space-y-1.5 rounded-2xl surface-sunken px-3.5 py-3 text-[13px]">
                  <Line label="From days worked" value={naira(pay!.pay)} />
                  {bonus > 0 && <Line label="Bonuses" value={`+ ${naira(bonus)}`} good />}
                  {deduction > 0 && <Line label="Deductions" value={`minus ${naira(deduction)}`} bad />}
                  <div className="border-t border-hairline pt-1.5">
                    <Line label="To be paid" value={naira(net)} strong />
                  </div>
                </div>
              )}
              {ahead > 0 && (
                <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[#0ca30c]/[0.08] px-3.5 py-3 text-[13px] text-secondary">
                  <TrendingUp size={16} className="mt-0.5 shrink-0 text-[#0a7a0a] dark:text-[#4ec54e]" aria-hidden />
                  <span>
                    Clock in on the {ahead} working {ahead === 1 ? 'day' : 'days'} left and this month pays{' '}
                    <b className="text-primary">{naira(Math.max(0, pay!.pay + pay!.daily * ahead + bonus - deduction))}</b>.
                  </span>
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {(adjustments.data ?? []).length > 0 && (
        <Card>
          <p className="mb-3 text-[15px] font-bold text-primary">Bonuses and deductions this month</p>
          <ul className="space-y-2">
            {(adjustments.data ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl surface-sunken px-3.5 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  {a.kind === 'bonus' ? (
                    <Gift size={16} className="shrink-0 text-[#0a7a0a] dark:text-[#4ec54e]" aria-hidden />
                  ) : (
                    <MinusCircle size={16} className="shrink-0 text-status-critical" aria-hidden />
                  )}
                  <span className="truncate text-[13.5px] text-primary">{a.note || (a.kind === 'bonus' ? 'Bonus' : 'Deduction')}</span>
                </span>
                <span className={`shrink-0 text-[14px] font-bold tabular ${a.kind === 'bonus' ? 'text-[#0a7a0a] dark:text-[#4ec54e]' : 'text-status-critical'}`}>
                  {a.kind === 'bonus' ? '+' : 'minus'} {naira(a.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[15px] font-bold text-primary">
            <CalendarCheck2 size={17} aria-hidden /> This pay period
          </p>
          <PeriodNote period={period} />
        </div>
        {att.data ? (
          <AttendanceStrip
            period={period}
            today={today}
            holidays={holidaySet}
            attended={attended}
            resumption={me?.resumption}
            autoUntil={rules.autoUntil}
            autoAll={me?.autoPresent}
            reissued={reissued}
            requests={requests}
            absent={absent}
            saturday={saturday}
            onRequest={me?.autoPresent ? undefined : setAsking}
          />
        ) : (
          <Loading label="Fetching your days" rows={1} />
        )}
        {(reissues.data ?? []).length > 0 && (
          <div className="mt-5 border-t border-hairline pt-4">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Your reissue requests</p>
            <ul className="space-y-2">
              {[...(reissues.data ?? [])]
                .sort((a, b) => b.day - a.day)
                .map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 rounded-2xl surface-sunken px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-primary">{prettyIso(r.date, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                      {r.reason && <p className="mt-0.5 text-[12.5px] text-secondary">{r.reason}</p>}
                    </div>
                    <Badge
                      tone={r.status === 'approved' ? 'info' : r.status === 'declined' ? 'critical' : 'warning'}
                      icon={r.status === 'approved' ? <RotateCcw size={11} /> : r.status === 'declined' ? <XCircle size={11} /> : <Hourglass size={11} />}
                    >
                      {r.status === 'approved' ? 'Reissued' : r.status === 'declined' ? 'Declined' : 'Waiting'}
                    </Badge>
                  </li>
                ))}
            </ul>
          </div>
        )}
        {upcomingHolidays.length > 0 && (
          <div className="mt-5 border-t border-hairline pt-4">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Coming holidays</p>
            <ul className="flex flex-wrap gap-2">
              {upcomingHolidays.map((h) => (
                <li key={h.id} className="rounded-full bg-gold-400/20 px-3 py-1 text-[12.5px] font-semibold text-[#8a6100] dark:text-gold-300">
                  {h.name}, {prettyIso(h.id)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <ReissueDialog
        date={asking}
        uid={uid}
        name={name}
        declined={asking ? requests.get(asking) === 'declined' : false}
        onClose={() => setAsking(null)}
        onSent={() => {
          setAsking(null);
          setTick((n) => n + 1);
        }}
      />
    </div>
  );
}

function ReissueDialog({
  date,
  uid,
  name,
  declined,
  onClose,
  onSent,
}: {
  date: string | null;
  uid: string;
  name: string;
  declined: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!date) return null;
  const send = async () => {
    setBusy(true);
    try {
      await requestReissue(uid, name, date, reason);
      toast.success('Reissue requested', 'HR will review it. The day turns blue once approved.');
      setReason('');
      onSent();
    } catch (err) {
      toast.error('Could not send it', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Request a reissue"
      description={prettyIso(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<RotateCcw size={15} />} loading={busy} onClick={() => void send()}>
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[13.5px] leading-relaxed text-secondary">
          Worked this day but it shows as absent? Ask for it to be counted. Once HR approves, the day turns blue with the reissue mark and is paid.
        </p>
        {declined && <Alert tone="warning">Your last request for this day was declined. You can ask again.</Alert>}
        <Field label="Comment (optional)">
          <Textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="I forgot to clock in; I was at the depot from 9am." />
        </Field>
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'bad' }) {
  return (
    <div className="rounded-2xl surface-sunken px-3 py-2.5">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-0.5 whitespace-nowrap text-[13px] font-bold tabular sm:text-[15px] ${tone === 'bad' ? 'text-status-critical' : 'text-primary'}`}>{value}</p>
    </div>
  );
}

function Line({ label, value, good, bad, strong }: { label: string; value: string; good?: boolean; bad?: boolean; strong?: boolean }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className={strong ? 'font-bold text-primary' : 'text-secondary'}>{label}</span>
      <span
        className={`tabular font-bold ${good ? 'text-[#0a7a0a] dark:text-[#4ec54e]' : bad ? 'text-status-critical' : 'text-primary'} ${strong ? 'text-[15px]' : ''}`}
      >
        {value}
      </span>
    </p>
  );
}
