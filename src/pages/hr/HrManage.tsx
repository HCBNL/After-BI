/**
 * HR (for HR managers: super admin, admin, finance manager).
 *
 * Set each person's salary and resumption date, keep the holiday list, see who
 * clocked in today, approve reissue requests, add bonuses and deductions, keep
 * the running costs, and read the payroll for any month with the business's
 * total monthly cost beside it.
 *
 * Arithmetic: `src/lib/payroll.ts`. Data and rules: `src/lib/hr.ts`.
 * (The concept is GetSchool's HR, per organisation.)
 */

import { useMemo, useState, type FormEvent } from 'react';
import {
  Banknote,
  CalendarPlus,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Gift,
  MinusCircle,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, Select, StatTile, Switch, Tabs, useToast } from '@/components/ui';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { listMembers } from '@/lib/db';
import { downloadCsv } from '@/lib/download';
import { nairaShort } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useOrg } from '@/context/OrgContext';
import {
  addAdjustment,
  addHoliday,
  adjustmentTotals,
  COST_CATEGORIES,
  costsFor,
  decideReissue,
  DEFAULT_SETTINGS,
  getHrSettings,
  hhmm,
  hoursBetween,
  listAdjustments,
  listAttendance,
  listCosts,
  listHolidays,
  listHrStaff,
  listPendingReissues,
  markAllPresent,
  naira,
  nairaPrecise,
  onPayroll,
  removeAdjustment,
  removeCost,
  removeHoliday,
  saveCost,
  saveHrSettings,
  saveHrStaff,
  setPresent,
  setTimes,
  splitAttendance,
  timeOf,
  type Adjustment,
  type Attendance,
  type Cost,
  type HrSettings,
  type HrStaff,
  type Reissue,
} from '@/lib/hr';
import { computePay, currentPeriod, cycleWords, iso, isOffDay, ordinal, prettyIso, shiftPeriod, type PayPeriod } from '@/lib/payroll';
import { ROLE_LABEL, type Role } from '@/types';
import { AttendanceStrip, CountUp, PayCycle, PeriodNote } from './HrParts';

type Tab = 'payroll' | 'reissues' | 'today' | 'staff' | 'bonuses' | 'costs' | 'holidays' | 'settings';

interface Person {
  uid: string;
  name: string;
  role: Role;
  suspended: boolean;
  joined: string;
  hr: HrStaff | null;
}

export default function HrManage() {
  const toast = useToast();
  const { settings: org } = useOrg();
  const today = iso(new Date());
  const [tab, setTab] = useState<Tab>('payroll');
  const [offset, setOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<Person | null>(null);
  const [bulk, setBulk] = useState(false);

  const base = useAsync(
    async () => {
      const [settings, holidays, users, hr, costs] = await Promise.all([getHrSettings(), listHolidays(), listMembers(), listHrStaff(), listCosts()]);
      return { settings, holidays, users, hr, costs };
    },
    [tick],
    { handleError: true },
  );

  const holidaySet = useMemo(() => new Set((base.data?.holidays ?? []).map((h) => h.id)), [base.data]);
  const rules = useMemo(() => ({ ...(base.data?.settings ?? DEFAULT_SETTINGS), holidays: holidaySet }), [base.data, holidaySet]);
  const current = useMemo(() => currentPeriod(today, rules), [today, rules]);
  const period = useMemo(() => shiftPeriod(current, offset, rules), [current, offset, rules]);

  const att = useAsync(() => listAttendance(null, period.start, period.end), [period.start, period.end, tick], { handleError: true });
  const pending = useAsync(() => listPendingReissues(), [tick], { handleError: true });
  const todayAtt = useAsync(() => listAttendance(null, today, today), [today, tick], { handleError: true });
  const adjustments = useAsync(() => listAdjustments(period.key), [period.key, tick], { handleError: true });

  const people: Person[] = useMemo(() => {
    if (!base.data) return [];
    const hrBy = new Map(base.data.hr.map((h) => [h.id, h]));
    return base.data.users
      .filter(onPayroll)
      .map((u) => ({
        uid: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        role: u.role,
        suspended: u.active === false,
        joined: (u.createdAt || '').slice(0, 10),
        hr: hrBy.get(u.id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [base.data]);

  const byPerson = useMemo(() => {
    const m = new Map<string, Attendance[]>();
    for (const a of att.data ?? []) m.set(a.uid, [...(m.get(a.uid) ?? []), a]);
    return m;
  }, [att.data]);

  const adj = useMemo(() => adjustmentTotals(adjustments.data ?? []), [adjustments.data]);

  const rows = people
    .filter((p) => p.hr && p.hr.active)
    .map((p) => {
      const { attended, absent } = splitAttendance(byPerson.get(p.uid) ?? []);
      const r = computePay({
        salary: p.hr!.salary,
        resumption: p.hr!.resumption,
        period,
        holidays: holidaySet,
        saturday: rules.saturday,
        attended,
        absent,
        today,
        autoUntil: rules.autoUntil,
        autoAll: p.hr!.autoPresent,
      });
      const t = adj.get(p.uid) ?? { bonus: 0, deduction: 0 };
      return { p, r, bonus: t.bonus, deduction: t.deduction, net: Math.max(0, r.pay + t.bonus - t.deduction) };
    });
  const totalEarned = rows.reduce((s, x) => s + x.r.pay, 0);
  const totalNet = rows.reduce((s, x) => s + x.net, 0);
  const totalBonus = rows.reduce((s, x) => s + x.bonus, 0);
  const totalDeduction = rows.reduce((s, x) => s + x.deduction, 0);
  const fullPayroll = rows.reduce((s, x) => s + x.p.hr!.salary, 0);
  const monthCosts = costsFor(period.key, base.data?.costs ?? []);
  const costTotal = monthCosts.reduce((s, c) => s + c.amount, 0);
  const unset = people.filter((p) => !p.hr && !p.suspended);
  const orgName = org?.name || 'AfterBI';

  const exportCsv = () =>
    void downloadCsv(`payroll ${period.label}.csv`.replace(/\s+/g, '_'), [
      [`${orgName} payroll`, period.label, `${period.start} to ${period.end}`, `Paid ${period.payDay}`],
      [],
      ['Name', 'Position', 'Monthly salary', 'Working days', 'Daily rate', 'Eligible days', 'Days worked', 'Earned', 'Bonus', 'Deduction', 'Net pay'],
      ...rows.map(({ p, r, bonus, deduction, net }) => [p.name, p.hr!.position ?? '', p.hr!.salary, r.workingDays, r.daily, r.eligible, r.worked, r.pay, bonus, deduction, net]),
      [],
      ['Total', '', fullPayroll, '', '', '', '', totalEarned, totalBonus, totalDeduction, totalNet],
      [],
      ['Running costs', period.label],
      ...monthCosts.map((c) => [c.name, c.category, c.amount, c.frequency === 'monthly' ? 'Every month' : 'Once']),
      ['Costs total', '', costTotal],
      [],
      ['Total cost of the month (net pay + running costs)', '', totalNet + costTotal],
    ]);

  if (base.error) {
    return (
      <>
        <PageHeader title="HR" />
        <Alert tone="critical" title="Could not load HR">
          {base.error.message}
        </Alert>
      </>
    );
  }
  if (!base.data) return <Loading label="Opening HR" />;

  const clockedToday = new Map((todayAtt.data ?? []).map((a) => [a.uid, a]));

  const markEveryone = async () => {
    setBulk(true);
    try {
      const list = people.filter((p) => !p.suspended && p.hr?.active).map((p) => ({ uid: p.uid, name: p.name }));
      const n = await markAllPresent(list, today, new Set(clockedToday.keys()));
      toast.success(n ? `${n} marked present` : 'Everyone is already in');
      setTick((x) => x + 1);
    } catch (err) {
      toast.error('Could not mark them', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBulk(false);
    }
  };

  const reload = () => setTick((n) => n + 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="HR"
        description="Salaries, attendance, bonuses and running costs. Pay is the monthly salary divided by the working days, times the days actually worked."
        actions={
          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={reload} loading={att.loading}>
            Refresh
          </Button>
        }
      />

      <PayCycle
        period={current}
        holidays={holidaySet}
        today={today}
        saturday={rules.saturday}
        footer={
          <p className="text-[13px] text-white/65">
            {current.label} payroll so far: <b className="text-white">{offset === 0 ? naira(totalNet) : 'open this month in Payroll'}</b>, {clockedToday.size} of{' '}
            {people.filter((p) => !p.suspended).length} clocked in today
            {(pending.data?.length ?? 0) > 0 && (
              <button type="button" onClick={() => setTab('reissues')} className="font-bold text-gold-300 underline-offset-2 hover:underline">
                , {pending.data!.length} reissue {pending.data!.length === 1 ? 'request' : 'requests'} waiting
              </button>
            )}
          </p>
        }
      />

      <Tabs
        items={[
          { id: 'payroll', label: 'Payroll' },
          { id: 'reissues', label: 'Reissues', count: pending.data?.length ?? 0 },
          { id: 'today', label: 'Today', count: clockedToday.size },
          { id: 'staff', label: 'Staff and salaries', count: people.length },
          { id: 'bonuses', label: 'Bonuses and deductions', count: adjustments.data?.length ?? 0 },
          { id: 'costs', label: 'Running costs', count: base.data.costs.length },
          { id: 'holidays', label: 'Holidays', count: base.data.holidays.length },
          { id: 'settings', label: 'Salary day' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {(tab === 'payroll' || tab === 'bonuses' || tab === 'costs') && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" aria-label="Previous month" onClick={() => setOffset((n) => n - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <div className="min-w-[10rem] text-center">
              <p className="text-[16px] font-bold text-primary">{period.label}</p>
              <PeriodNote period={period} />
            </div>
            <Button variant="outline" size="sm" aria-label="Next month" onClick={() => setOffset((n) => n + 1)} disabled={offset >= 1}>
              <ChevronRight size={16} />
            </Button>
            {offset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
                This month
              </Button>
            )}
          </div>
          {tab === 'payroll' && (
            <Button variant="outline" icon={<Download size={16} />} onClick={exportCsv} disabled={!rows.length}>
              Download CSV
            </Button>
          )}
        </div>
      )}

      {tab === 'payroll' && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Net payroll" value={nairaShort(totalNet)} icon={<Banknote size={16} />} tone="good" hint={`Full salaries ${nairaShort(fullPayroll)}`} />
            <StatTile label="Running costs" value={nairaShort(costTotal)} icon={<Receipt size={16} />} tone="warning" hint={`${monthCosts.length} cost${monthCosts.length === 1 ? '' : 's'} this month`} />
            <StatTile label="Total monthly cost" value={nairaShort(totalNet + costTotal)} tone="brand" hint="Net payroll plus running costs" />
            <StatTile
              label="Per person"
              value={rows.length ? nairaShort((totalNet + costTotal) / rows.length) : '₦0'}
              icon={<Users size={16} />}
              tone="info"
              hint={`${rows.length} on the payroll`}
            />
          </div>

          {unset.length > 0 && (
            <Alert tone="warning" title={`${unset.length} ${unset.length === 1 ? 'person' : 'people'} without a salary`}>
              {unset.map((p) => p.name).join(', ')}. Set their salary and resumption date under Staff and salaries.
            </Alert>
          )}

          {!att.data ? (
            <Loading label="Working out the payroll" />
          ) : rows.length === 0 ? (
            <Card>
              <EmptyState icon={<Users size={22} />} title="Nobody on the payroll yet" description="Set a salary under Staff and salaries." />
            </Card>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-hairline surface-card shadow-card">
              <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.1fr] gap-3 border-b border-hairline surface-sunken px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-wide text-muted md:grid">
                <span>Staff</span>
                <span>Salary</span>
                <span>Days worked</span>
                <span>Earned</span>
                <span>Bonus / deduction</span>
                <span className="text-right">Net pay</span>
              </div>
              <ul className="divide-y divide-[var(--border-hairline)]">
                {rows.map(({ p, r, bonus, deduction, net }) => (
                  <li key={p.uid}>
                    <button
                      type="button"
                      onClick={() => setOpen(p)}
                      className="grid w-full grid-cols-2 gap-x-3 gap-y-1 px-4 py-3.5 text-left text-[13.5px] hover:bg-[var(--surface-sunken)] md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.1fr] md:items-center"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-primary">{p.name}</span>
                        <span className="block truncate text-[11.5px] text-muted">
                          {p.hr!.position || ROLE_LABEL[p.role]}
                          {r.missed > 0 && <span className="ml-1.5 font-semibold text-status-critical">{r.missed} missed</span>}
                        </span>
                      </span>
                      <span className="text-right font-display text-[16px] font-extrabold text-primary md:order-last">{naira(net)}</span>
                      <span className="text-secondary">
                        <span className="md:hidden">Salary </span>
                        {naira(p.hr!.salary)}
                      </span>
                      <span className="text-secondary">
                        <span className="md:hidden">Worked </span>
                        <b className="text-primary">{r.worked}</b> / {r.eligible}
                        {p.hr!.autoPresent && <span className="text-muted"> (auto)</span>}
                      </span>
                      <span className="text-secondary">
                        <span className="md:hidden">Earned </span>
                        {naira(r.pay)}
                        <span className="block text-[11px] text-muted">{nairaPrecise(r.daily)} a day</span>
                      </span>
                      <span className="text-[12.5px]">
                        {bonus > 0 && <span className="block font-semibold text-[#0a7a0a] dark:text-[#4ec54e]">+ {naira(bonus)}</span>}
                        {deduction > 0 && <span className="block font-semibold text-status-critical">minus {naira(deduction)}</span>}
                        {!bonus && !deduction && <span className="text-muted">None</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-night px-4 py-4 text-white">
                <span className="text-[13px] font-semibold text-white/70">Net total, paid {prettyIso(period.payDay, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="font-display text-[1.5rem] font-extrabold tracking-[-0.03em]">
                  <CountUp value={totalNet} format={naira} />
                </span>
              </div>
            </div>
          )}
          <p className="text-[12px] text-muted">Tap a name to see their days and mark a day present or absent by hand.</p>
        </section>
      )}

      {tab === 'reissues' && <Reissues list={pending.data} onChanged={reload} />}

      {tab === 'today' && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-secondary">{prettyIso(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            {!isOffDay(today, rules.saturday) && (
              <Button size="sm" variant="outline" icon={<CheckCheck size={15} />} loading={bulk} onClick={() => void markEveryone()}>
                Mark everyone present
              </Button>
            )}
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {people
              .filter((p) => !p.suspended)
              .map((p) => {
                const a = clockedToday.get(p.uid);
                return (
                  <li key={p.uid} className="flex items-center justify-between gap-3 rounded-2xl border border-hairline surface-card p-4 shadow-card">
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-bold text-primary">{p.name}</p>
                      <p className="text-[12.5px] text-muted">
                        {a
                          ? a.absent
                            ? 'Marked absent'
                            : a.manual
                              ? 'Marked present'
                              : `In ${timeOf(a.inAt)}, out ${timeOf(a.outAt)}`
                          : p.hr?.autoPresent
                            ? 'No clock in needed'
                            : isOffDay(today, rules.saturday)
                              ? 'Day off'
                              : 'Not clocked in'}
                        {a?.outAt && `, ${hoursBetween(a.inAt, a.outAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={a && !a.absent ? (a.outAt ? 'info' : 'good') : 'neutral'} dot>
                        {a && !a.absent ? (a.outAt ? 'Done' : 'On duty') : 'Absent'}
                      </Badge>
                      {p.hr && (
                        <button type="button" onClick={() => setOpen(p)} className="text-[12px] font-bold text-brand-700 hover:underline dark:text-brand-300">
                          {a ? 'Correct' : 'Mark or correct'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {tab === 'staff' && (
        <StaffSetup
          people={people}
          onSaved={() => {
            toast.success('Saved');
            reload();
          }}
        />
      )}

      {tab === 'bonuses' && <Bonuses period={period} people={people} list={adjustments.data} onChanged={reload} />}

      {tab === 'costs' && <Costs period={period} all={base.data.costs} onChanged={reload} />}

      {tab === 'holidays' && <Holidays holidays={base.data.holidays} today={today} saturday={rules.saturday} onChanged={reload} />}

      {tab === 'settings' && <PaySettings value={base.data.settings} onSaved={reload} />}

      <PersonDays
        person={open}
        period={period}
        today={today}
        holidays={holidaySet}
        rules={rules}
        records={open ? byPerson.get(open.uid) ?? [] : []}
        onClose={() => setOpen(null)}
        onChanged={reload}
      />
    </div>
  );
}

/* one person's days */

function PersonDays({
  person,
  period,
  today,
  holidays,
  rules,
  records,
  onClose,
  onChanged,
}: {
  person: Person | null;
  period: PayPeriod;
  today: string;
  holidays: Set<string>;
  rules: HrSettings;
  records: Attendance[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Attendance | null>(null);
  if (!person?.hr) return null;
  const { attended, absent, reissued } = splitAttendance(records);
  const r = computePay({
    salary: person.hr.salary,
    resumption: person.hr.resumption,
    period,
    holidays,
    saturday: rules.saturday,
    attended,
    absent,
    today,
    autoUntil: rules.autoUntil,
    autoAll: person.hr.autoPresent,
  });

  const toggle = async (date: string, present: boolean) => {
    setBusy(date);
    try {
      await setPresent(person.uid, person.name, date, present);
      toast.success(present ? 'Marked present' : 'Marked absent', `${prettyIso(date)}, ${present ? 'paid' : 'not paid'}`);
      onChanged();
    } catch (err) {
      toast.error('Could not change that day', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={person.name}
      description={`${period.label}, resumed ${prettyIso(person.hr.resumption, { day: 'numeric', month: 'short', year: 'numeric' })}`}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Mini label="Earned" value={naira(r.pay)} strong />
          <Mini label="Worked" value={`${r.worked} / ${r.eligible}`} />
          <Mini label="Daily rate" value={nairaPrecise(r.daily)} />
          <Mini label="Missed" value={String(r.missed)} />
        </div>
        <div className={cn(busy && 'pointer-events-none opacity-70')}>
          <AttendanceStrip
            period={period}
            today={today}
            holidays={holidays}
            attended={attended}
            resumption={person.hr.resumption}
            autoUntil={rules.autoUntil}
            autoAll={person.hr.autoPresent}
            reissued={reissued}
            absent={absent}
            saturday={rules.saturday}
            onToggle={(d, present) => void toggle(d, present)}
          />
        </div>
        <p className="text-[12.5px] text-muted">
          <b className="text-primary">Tap any day to change it.</b> A green or blue day becomes <b className="text-[#a52929] dark:text-[#f08080]">marked absent</b> (not
          paid, even if they clocked in). Tap it again to make it present. To fix clock in times instead, use Edit below.
        </p>
        <TimeEditor
          key={editing?.date ?? 'new'}
          person={person}
          period={period}
          today={today}
          saturday={rules.saturday}
          record={editing}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
        {records.length > 0 && (
          <ul className="divide-y divide-[var(--border-hairline)] rounded-2xl border border-hairline text-[13px]">
            {[...records]
              .sort((a, b) => b.day - a.day)
              .map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3.5 py-2">
                  <span className="font-semibold text-primary">{prettyIso(a.date)}</span>
                  <span className="flex items-center gap-2 text-secondary tabular">
                    <span>
                      {a.absent ? 'Marked absent' : a.reissue ? 'Reissued' : a.manual ? 'Marked present' : `${timeOf(a.inAt)} to ${timeOf(a.outAt)}`}
                      {a.outAt && <span className="text-muted">, {hoursBetween(a.inAt, a.outAt)}</span>}
                      {a.edited && <span className="ml-1.5 text-[11px] font-semibold text-[#8a6100] dark:text-gold-300">corrected</span>}
                    </span>
                    <Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={() => setEditing(a)}>
                      Edit
                    </Button>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function TimeEditor({
  person,
  period,
  today,
  saturday,
  record,
  onSaved,
}: {
  person: Person;
  period: PayPeriod;
  today: string;
  saturday: boolean;
  record: Attendance | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState(record?.date ?? (today <= period.end ? today : period.end));
  const [inT, setInT] = useState(hhmm(record?.inAt) || '08:00');
  const [outT, setOutT] = useState(hhmm(record?.outAt) || '17:00');
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (isOffDay(date, saturday)) {
      toast.error('That is a day off', 'Only working days count.');
      return;
    }
    setBusy(true);
    try {
      await setTimes(person.uid, person.name, date, inT, outT);
      toast.success('Times saved', `${person.name}, ${prettyIso(date)}`);
      onSaved();
    } catch (err) {
      toast.error('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={(e) => void save(e)} className={cn('rounded-2xl border p-4', record ? 'border-brand-500/40' : 'border-hairline')}>
      <p className="mb-3 text-[13.5px] font-bold text-primary">{record ? `Correct ${prettyIso(record.date)}` : 'Correct times'}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-end">
        <Field label="Day" className="col-span-2 sm:col-span-1">
          <Input type="date" value={date} min={period.start} max={today < period.end ? today : period.end} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Clock in">
          <Input type="time" value={inT} onChange={(e) => setInT(e.target.value)} required />
        </Field>
        <Field label="Clock out">
          <Input type="time" value={outT} onChange={(e) => setOutT(e.target.value)} />
        </Field>
        <Button type="submit" loading={busy} icon={<Save size={15} />} className="col-span-2 sm:col-span-1">
          Save
        </Button>
      </div>
    </form>
  );
}

function Mini({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-2xl px-3 py-2.5', strong ? 'bg-night text-white' : 'surface-sunken')}>
      <p className={cn('text-[10.5px] font-bold uppercase tracking-wide', strong ? 'text-white/60' : 'text-muted')}>{label}</p>
      <p className={cn('mt-0.5 text-[16px] font-extrabold tabular', strong ? 'text-white' : 'text-primary')}>{value}</p>
    </div>
  );
}

/* reissues */

function Reissues({ list, onChanged }: { list: Reissue[] | undefined; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (!list) return <Loading label="Fetching requests" />;
  if (list.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<RotateCcw size={22} />}
          title="No reissue requests waiting"
          description="When someone misses a day they worked, they tap it on their My pay calendar and ask for a reissue. Requests land here."
        />
      </Card>
    );
  }
  const decide = async (r: Reissue, approve: boolean) => {
    setBusy(r.id + (approve ? '+' : '-'));
    try {
      await decideReissue(r, approve);
      toast.success(approve ? 'Reissued' : 'Declined', `${r.name}, ${prettyIso(r.date)}`);
      onChanged();
    } catch (err) {
      toast.error('Could not save that', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {list.map((r) => (
        <li key={r.id} className="flex flex-col rounded-2xl border border-[#fab219]/50 surface-card p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-primary">{r.name}</p>
              <p className="text-[13px] text-secondary">{prettyIso(r.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <Badge tone="warning">Waiting</Badge>
          </div>
          <p className={cn('mt-3 rounded-xl surface-sunken px-3 py-2.5 text-[13.5px] leading-relaxed', r.reason ? 'text-primary' : 'italic text-muted')}>
            {r.reason || 'No comment left.'}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" icon={<Check size={15} />} loading={busy === r.id + '+'} disabled={Boolean(busy)} onClick={() => void decide(r, true)} className="flex-1">
              Approve
            </Button>
            <Button size="sm" variant="outline" icon={<X size={15} />} loading={busy === r.id + '-'} disabled={Boolean(busy)} onClick={() => void decide(r, false)} className="flex-1">
              Decline
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* staff and salaries */

function StaffSetup({ people, onSaved }: { people: Person[]; onSaved: () => void }) {
  if (people.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Users size={22} />} title="Nobody yet" description="Add people under Company, Add person, then set their salary here." />
      </Card>
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {people.map((p) => (
        <StaffRow key={p.uid} person={p} onSaved={onSaved} />
      ))}
    </div>
  );
}

function StaffRow({ person, onSaved }: { person: Person; onSaved: () => void }) {
  const toast = useToast();
  const [salary, setSalary] = useState(person.hr ? String(person.hr.salary) : '');
  const [position, setPosition] = useState(person.hr?.position ?? '');
  const [resumption, setResumption] = useState(person.hr?.resumption ?? (person.joined || iso(new Date())));
  const [active, setActive] = useState(person.hr?.active ?? true);
  const [autoPresent, setAutoPresent] = useState(person.hr?.autoPresent ?? false);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(salary.replace(/[^\d.]/g, ''));
    if (!n || n <= 0) {
      toast.error('Type a salary', 'The monthly amount in naira.');
      return;
    }
    setBusy(true);
    try {
      await saveHrStaff({ id: person.uid, name: person.name, salary: n, resumption, active, autoPresent, position });
      onSaved();
    } catch (err) {
      toast.error('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void save(e)} className="rounded-2xl border border-hairline surface-card p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-primary">{person.name}</p>
          <p className="truncate text-[12px] text-muted">{ROLE_LABEL[person.role]}</p>
        </div>
        {person.suspended ? <Badge tone="critical">Suspended</Badge> : !person.hr ? <Badge tone="warning">Not set</Badge> : <Badge tone="good">On payroll</Badge>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Monthly salary (₦)" required>
          <Input inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="150000" leading={<span className="text-[13px] font-bold">₦</span>} />
        </Field>
        <Field label="Resumption date" required hint="The day they started. Days before it are not paid.">
          <Input type="date" value={resumption} onChange={(e) => setResumption(e.target.value)} required />
        </Field>
        <Field label="Position" className="sm:col-span-2">
          <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Sales supervisor" maxLength={60} />
        </Field>
      </div>
      <div className="mt-3 space-y-2.5">
        <Switch checked={active} onChange={setActive} label="On the payroll" />
        <Switch
          checked={autoPresent}
          onChange={setAutoPresent}
          label="No clock in needed"
          hint="Every working day from resumption counts as present unless you mark a day absent. For drivers, field reps or anyone who cannot clock in."
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" icon={<Save size={14} />} loading={busy}>
          Save
        </Button>
      </div>
    </form>
  );
}

/* bonuses and deductions */

function Bonuses({ period, people, list, onChanged }: { period: PayPeriod; people: Person[]; list: Adjustment[] | undefined; onChanged: () => void }) {
  const toast = useToast();
  const paid = people.filter((p) => p.hr && !p.suspended);
  const [uid, setUid] = useState('');
  const [kind, setKind] = useState<'bonus' | 'deduction'>('bonus');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const person = paid.find((p) => p.uid === uid);
    const n = Number(amount.replace(/[^\d.]/g, ''));
    if (!person) return toast.error('Choose a person');
    if (!n || n <= 0) return toast.error('Type an amount');
    setBusy(true);
    try {
      await addAdjustment({ uid: person.uid, name: person.name, month: period.key, kind, amount: n, note });
      toast.success(kind === 'bonus' ? 'Bonus added' : 'Deduction added', `${person.name}, ${period.label}`);
      setAmount('');
      setNote('');
      onChanged();
    } catch (err) {
      toast.error('Could not add it', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: Adjustment) => {
    try {
      await removeAdjustment(a.id);
      onChanged();
    } catch (err) {
      toast.error('Could not remove it', err instanceof Error ? err.message : 'Try again.');
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card>
        <form onSubmit={(e) => void add(e)} className="space-y-4">
          <p className="text-[15px] font-bold text-primary">Add to {period.label}</p>
          <Field label="Person" required>
            <Select value={uid} onChange={(e) => setUid(e.target.value)}>
              <option value="">Choose…</option>
              {paid.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {(['bonus', 'deduction'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13.5px] font-semibold',
                  kind === k ? 'border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-100' : 'border-hairline text-secondary',
                )}
              >
                {k === 'bonus' ? <Gift size={15} /> : <MinusCircle size={15} />}
                {k === 'bonus' ? 'Bonus' : 'Deduction'}
              </button>
            ))}
          </div>
          <Field label="Amount (₦)" required>
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20000" />
          </Field>
          <Field label="Note" hint="Shown to the person on their My pay screen.">
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder={kind === 'bonus' ? 'Target hit for the month' : 'Salary advance'} />
          </Field>
          <Button type="submit" icon={<Plus size={16} />} loading={busy} full>
            Add
          </Button>
        </form>
      </Card>
      <Card padded={false}>
        {!list ? (
          <Loading label="Fetching" rows={2} className="p-4" />
        ) : list.length === 0 ? (
          <EmptyState icon={<Gift size={22} />} title={`Nothing for ${period.label}`} description="Bonuses and commissions are added to that month's pay; deductions (advances, loans, lateness) come off it." />
        ) : (
          <ul className="divide-y divide-[var(--border-hairline)]">
            {list.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-primary">{a.name}</p>
                  <p className="truncate text-[12.5px] text-muted">{a.note || (a.kind === 'bonus' ? 'Bonus' : 'Deduction')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn('text-[14px] font-bold tabular', a.kind === 'bonus' ? 'text-[#0a7a0a] dark:text-[#4ec54e]' : 'text-status-critical')}>
                    {a.kind === 'bonus' ? '+' : 'minus'} {naira(a.amount)}
                  </span>
                  <Button size="sm" variant="ghost" aria-label="Remove" onClick={() => void remove(a)}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* running costs */

function Costs({ period, all, onChanged }: { period: PayPeriod; all: Cost[]; onChanged: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(COST_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'once'>('monthly');
  const [busy, setBusy] = useState(false);
  const month = costsFor(period.key, all);
  const total = month.reduce((s, c) => s + c.amount, 0);
  const byCategory = [...month.reduce((m, c) => m.set(c.category, (m.get(c.category) ?? 0) + c.amount), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(/[^\d.]/g, ''));
    if (!name.trim()) return toast.error('Name the cost');
    if (!n || n <= 0) return toast.error('Type an amount');
    setBusy(true);
    try {
      await saveCost({ name, category, amount: n, frequency, month: period.key, until: '' });
      toast.success('Cost added', frequency === 'monthly' ? `Every month from ${period.label}` : `Once, in ${period.label}`);
      setName('');
      setAmount('');
      onChanged();
    } catch (err) {
      toast.error('Could not add it', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const stop = async (c: Cost) => {
    try {
      if (c.frequency === 'monthly' && c.month < period.key) {
        /* Ends it last month, so past months keep their figures. */
        const d = new Date(period.year, period.month0 - 1, 1);
        await saveCost({ ...c, until: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
      } else {
        await removeCost(c.id);
      }
      onChanged();
    } catch (err) {
      toast.error('Could not remove it', err instanceof Error ? err.message : 'Try again.');
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="space-y-5">
        <Card>
          <form onSubmit={(e) => void add(e)} className="space-y-4">
            <p className="text-[15px] font-bold text-primary">Add a running cost</p>
            <Field label="What it is" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Office rent" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {COST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount (₦)" required>
                <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250000" />
              </Field>
            </div>
            <Field label="How often">
              <Select value={frequency} onChange={(e) => setFrequency(e.target.value as 'monthly' | 'once')}>
                <option value="monthly">Every month, from {period.label}</option>
                <option value="once">Once, in {period.label}</option>
              </Select>
            </Field>
            <Button type="submit" icon={<Plus size={16} />} loading={busy} full>
              Add cost
            </Button>
          </form>
        </Card>
        {byCategory.length > 0 && (
          <Card>
            <p className="mb-3 text-[15px] font-bold text-primary">By category, {period.label}</p>
            <ul className="space-y-2.5">
              {byCategory.map(([cat, amt]) => (
                <li key={cat}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-secondary">{cat}</span>
                    <span className="font-bold tabular text-primary">{naira(amt)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${total ? (amt / total) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <Card padded={false}>
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <p className="text-[14px] font-bold text-primary">{period.label}</p>
          <p className="text-[15px] font-extrabold tabular text-primary">{naira(total)}</p>
        </div>
        {month.length === 0 ? (
          <EmptyState icon={<Receipt size={22} />} title="No running costs this month" description="Rent, diesel, internet, vehicle repairs: anything the business pays besides salaries. The Payroll tab adds them to the month's total cost." />
        ) : (
          <ul className="divide-y divide-[var(--border-hairline)]">
            {month.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-primary">{c.name}</p>
                  <p className="truncate text-[12.5px] text-muted">
                    {c.category}, {c.frequency === 'monthly' ? 'every month' : 'once'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[14px] font-bold tabular text-primary">{naira(c.amount)}</span>
                  <Button size="sm" variant="ghost" aria-label={c.frequency === 'monthly' ? 'Stop this cost' : 'Remove'} title={c.frequency === 'monthly' ? 'Stop from this month' : 'Remove'} onClick={() => void stop(c)}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* holidays */

/** Western Easter Sunday (Anonymous Gregorian algorithm). */
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

function fixedHolidays(year: number): { date: string; name: string }[] {
  const e = easter(year);
  const gf = new Date(e);
  gf.setDate(e.getDate() - 2);
  const em = new Date(e);
  em.setDate(e.getDate() + 1);
  return [
    { date: `${year}-01-01`, name: 'New Year’s Day' },
    { date: iso(gf), name: 'Good Friday' },
    { date: iso(em), name: 'Easter Monday' },
    { date: `${year}-05-01`, name: 'Workers’ Day' },
    { date: `${year}-06-12`, name: 'Democracy Day' },
    { date: `${year}-10-01`, name: 'Independence Day' },
    { date: `${year}-12-25`, name: 'Christmas Day' },
    { date: `${year}-12-26`, name: 'Boxing Day' },
  ];
}

function Holidays({ holidays, today, saturday, onChanged }: { holidays: { id: string; name: string }[]; today: string; saturday: boolean; onChanged: () => void }) {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const year = Number(today.slice(0, 4));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    try {
      await addHoliday(date, name);
      setDate('');
      setName('');
      onChanged();
    } catch (err) {
      toast.error('Could not add it', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const addCommon = async (y: number) => {
    setBusy(true);
    try {
      const have = new Set(holidays.map((h) => h.id));
      const list = fixedHolidays(y).filter((h) => !have.has(h.date));
      for (const h of list) await addHoliday(h.date, h.name);
      toast.success(list.length ? `${list.length} holidays added` : 'Already there', 'Add Eid and any declared holidays yourself; their dates are announced each year.');
      onChanged();
    } catch (err) {
      toast.error('Could not add them', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await removeHoliday(id);
      onChanged();
    } catch (err) {
      toast.error('Could not remove it', err instanceof Error ? err.message : 'Try again.');
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card>
        <form onSubmit={(e) => void add(e)} className="space-y-4">
          <p className="text-[15px] font-bold text-primary">Add a holiday</p>
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Eid el Fitr" />
          </Field>
          <Button type="submit" icon={<CalendarPlus size={16} />} loading={busy} full>
            Add holiday
          </Button>
        </form>
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="mb-2 text-[13px] text-secondary">Add Nigeria&rsquo;s fixed public holidays (and Easter) in one go:</p>
          <div className="flex flex-wrap gap-2">
            {[year, year + 1].map((y) => (
              <Button key={y} type="button" size="sm" variant="outline" icon={<Wand2 size={14} />} onClick={() => void addCommon(y)} disabled={busy}>
                {y}
              </Button>
            ))}
          </div>
        </div>
      </Card>
      <Card padded={false}>
        {holidays.length === 0 ? (
          <EmptyState icon={<CalendarPlus size={22} />} title="No holidays yet" description="Holidays are left out of the working days, so the daily rate goes up." />
        ) : (
          <ul className="divide-y divide-[var(--border-hairline)]">
            {holidays.map((h) => (
              <li key={h.id} className={cn('flex items-center justify-between gap-3 px-4 py-3', h.id < today && 'opacity-55')}>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-primary">{h.name}</p>
                  <p className="text-[12.5px] text-muted">
                    {prettyIso(h.id, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {isOffDay(h.id, saturday) && ', a day off anyway'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" aria-label={`Remove ${h.name}`} onClick={() => void remove(h.id)}>
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* salary day */

function PaySettings({ value, onSaved }: { value: HrSettings; onSaved: () => void }) {
  const toast = useToast();
  const [payDay, setPayDay] = useState(String(value.payDay));
  const [cycleStart, setCycleStart] = useState(String(value.cycleStart));
  const [autoUntil, setAutoUntil] = useState(value.autoUntil);
  const [saturday, setSaturday] = useState(value.saturday);
  const [overrides, setOverrides] = useState<Record<string, string>>(value.overrides);
  const [oneOff, setOneOff] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const p = Number(payDay);
    const c = Number(cycleStart);
    if (!(p >= 1 && p <= 31) || !(c >= 1 && c <= 28)) {
      toast.error('Check the days', 'Salary day 1 to 31, cycle start 1 to 28.');
      return;
    }
    setBusy(true);
    try {
      await saveHrSettings({ payDay: p, cycleStart: c, autoUntil, overrides, saturday });
      toast.success('Saved', `Each month covers ${cycleWords(c)}, paid on the ${ordinal(p)}.`);
      onSaved();
    } catch (err) {
      toast.error('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const addOneOff = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(oneOff)) return;
    setOverrides((o) => ({ ...o, [oneOff.slice(0, 7)]: oneOff }));
    setOneOff('');
  };

  const c = Number(cycleStart) || 24;
  return (
    <Card className="max-w-2xl">
      <form onSubmit={(e) => void save(e)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Salary day of the month" hint="If it lands on a day off or holiday, pay moves to the working day before.">
            <Input type="number" min={1} max={31} value={payDay} onChange={(e) => setPayDay(e.target.value)} />
          </Field>
          <Field label="Cycle starts on day" hint="1 means the calendar month. 24 means the 24th of last month to the 23rd of this month, so no day is counted twice.">
            <Input type="number" min={1} max={28} value={cycleStart} onChange={(e) => setCycleStart(e.target.value)} />
          </Field>
        </div>
        <p className="rounded-2xl surface-sunken px-4 py-3 text-[13px] text-secondary">
          A month&rsquo;s salary covers <b className="text-primary">{cycleWords(c)}</b>, paid on the <b className="text-primary">{ordinal(Number(payDay) || 25)}</b>.
        </p>

        <Switch
          checked={saturday}
          onChange={setSaturday}
          label="Saturdays are working days"
          description={saturday ? 'Monday to Saturday' : 'Monday to Friday'}
        />

        <Field
          label="Count everyone present up to"
          hint="For the time before clocking in started: every working day up to this date counts as present, from each person's resumption date. Clear it to switch it off."
        >
          <Input type="date" value={autoUntil} onChange={(e) => setAutoUntil(e.target.value)} />
        </Field>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-secondary">One off salary days</p>
          <div className="flex gap-2">
            <Input type="date" value={oneOff} onChange={(e) => setOneOff(e.target.value)} aria-label="One off salary day" />
            <Button type="button" variant="outline" onClick={addOneOff} icon={<CalendarPlus size={15} />}>
              Add
            </Button>
          </div>
          {Object.keys(overrides).length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {Object.entries(overrides)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, date]) => (
                  <li key={month} className="inline-flex items-center gap-1.5 rounded-full bg-gold-400/20 py-1 pl-3 pr-1 text-[12.5px] font-semibold text-[#8a6100] dark:text-gold-300">
                    {prettyIso(date, { month: 'long', year: 'numeric' })} salary on {prettyIso(date, { weekday: 'short', day: 'numeric', month: 'short' })}
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== month)))}
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <Button type="submit" icon={<Save size={16} />} loading={busy}>
          Save
        </Button>
      </form>
    </Card>
  );
}
