/**
 * Booking a walkthrough.
 *
 * WHAT A WALKTHROUGH IS, AND WHY IT IS NOT A "DEMO"
 *
 * Nobody in this trade wants a demo. A demo is forty minutes of somebody
 * else's slides. What a sales director actually wants is to watch their own
 * month happen in the software: their price list, their distributors, their
 * credit terms. So the form asks the two questions that let the office prepare
 * that — how many depots, and what the person does — and then gets out of the
 * way.
 *
 * WHY THE DATE IS PICKED HERE RATHER THAN IN A CALENDAR WIDGET
 *
 * Ten working days as chips is the whole calendar this needs. A date picker on
 * a phone opens the operating system's own wheel, which on Android is four taps
 * and a scroll to land on next Tuesday — for a choice between ten days. The
 * chips are one tap, they show the day name, and they cannot produce a Sunday.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { Calendar, Check, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/overlay';
import { Button, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import {
  DEMO_SLOTS,
  DEMO_TIMEZONE,
  DEPOT_BANDS,
  SUPPORT_EMAIL,
  bookableDays,
  bookingMailto,
  clockLabel,
  longDate,
} from '@/lib/site';

/** "2026-09-24" as the two lines a chip shows: "Thu" over "24 Sep". */
function chipLabel(iso: string): { day: string; date: string } {
  const date = new Date(`${iso}T12:00:00`);
  return {
    day: date.toLocaleDateString('en-NG', { weekday: 'short' }),
    date: date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
  };
}

export function BookDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const days = useMemo(() => bookableDays(10), []);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [depots, setDepots] = useState(DEPOT_BANDS[1]);
  const [date, setDate] = useState(days[0]);
  const [time, setTime] = useState<string>(DEMO_SLOTS[1]);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    window.location.href = bookingMailto({ name, company, email, phone, depots, date, time, note });
    setSent(true);
  };

  const close = () => {
    onClose();
    /* Left long enough that the sheet has finished closing before it changes
       back underneath the person watching it. */
    window.setTimeout(() => setSent(false), 400);
  };

  if (sent) {
    return (
      <Modal open={open} onClose={close} size="md" title="Your walkthrough request is ready to send">
        <div className="py-2">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <Check size={24} />
          </span>
          <p className="text-[15px] leading-relaxed text-secondary">
            Your mail app should have opened with the details filled in. Send it and the office will confirm{' '}
            <strong className="font-semibold text-primary">
              {longDate(date)} at {clockLabel(time)}
            </strong>{' '}
            — usually within a working day.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-muted">
            If nothing opened, write to{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-brand-700 underline underline-offset-4 dark:text-brand-400"
            >
              {SUPPORT_EMAIL}
            </a>{' '}
            and say when suits you. That reaches the same people.
          </p>
          <Button className="mt-6" variant="outline" onClick={close}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Book a walkthrough"
      description="Forty minutes, on your own numbers. No slides."
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Adaeze Okonkwo" />
          </Field>
          <Field label="Company" required>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              autoComplete="organization"
              placeholder="Sunrise Foods Ltd"
            />
          </Field>
          <Field label="Work email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
            />
          </Field>
          <Field label="Phone" required hint="A number that reaches you on WhatsApp is best — that is how most of these get confirmed.">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              placeholder="0803 000 0000"
            />
          </Field>
          <Field
            label="Depots"
            hint="It decides what the office sets up beforehand: a one-depot walkthrough and a twenty-depot one are not the same conversation."
          >
            <Select value={depots} onChange={(e) => setDepots(e.target.value)}>
              {DEPOT_BANDS.map((item: string) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-secondary">
            <Calendar size={15} aria-hidden />
            Pick a day
          </p>
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((iso) => {
              const { day, date: label } = chipLabel(iso);
              const active = iso === date;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDate(iso)}
                  aria-pressed={active}
                  className={cn(
                    'flex w-[4.5rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 transition-colors',
                    active
                      ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-brand-950'
                      : 'border-hairline surface-card text-primary hover:bg-[var(--surface-sunken)]',
                  )}
                >
                  <span className={cn('text-[11px] font-bold uppercase tracking-wider', active ? 'text-white/70 dark:text-brand-950/60' : 'text-muted')}>
                    {day}
                  </span>
                  <span className="mt-0.5 whitespace-nowrap text-[13px] font-bold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-secondary">
            <Clock size={15} aria-hidden />
            And a time <span className="font-normal text-muted">({DEMO_TIMEZONE.split('/')[1]})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_SLOTS.map((slot) => {
              const active = slot === time;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  aria-pressed={active}
                  className={cn(
                    'tabular rounded-xl border px-3.5 py-2 text-[13.5px] font-bold transition-colors',
                    active
                      ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-brand-950'
                      : 'border-hairline surface-card text-primary hover:bg-[var(--surface-sunken)]',
                  )}
                >
                  {clockLabel(slot)}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Anything you want to see specifically" hint="Optional, and the most useful box on this form.">
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="We run 6 depots and our problem is reconciling returns against the original invoice."
          />
        </Field>

        <div className="flex flex-col gap-3 border-t border-hairline pt-5 sm:flex-row-reverse sm:items-center">
          <Button type="submit" size="lg" className="sm:min-w-[14rem]">
            Request {longDate(date).split(' ').slice(1).join(' ')}, {clockLabel(time)}
          </Button>
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
