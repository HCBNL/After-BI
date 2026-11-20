/**
 * The app's own calendar and time picker. Never the browser's.
 *
 * The browser's date box looked different on every phone and laptop, could
 * not be styled, and often opened UPWARDS over the form. These are drawn by
 * AfterBI in the theme's colours, the same in every browser, and behave like
 * the app's own dropdown (Select.tsx):
 *
 *   • on a laptop a panel opens UNDER the field. If the page has no room
 *     under it, the page first scrolls the field up to make room; only when
 *     that is impossible (a field at the very bottom of a short window) does
 *     it open above;
 *   • on a phone a sheet rises from the bottom of the screen, big enough to
 *     tap with a thumb.
 *
 * `<Input type="date">` and `<Input type="time">` draw these automatically,
 * so no screen had to change. The value is the same string the browser used
 * (`2026-11-20`, `08:30`) and `onChange` receives an object shaped like the
 * native event (`e.target.value`), which is all any screen reads.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { dateLocale, twentyFourHour } from '@/lib/locale';

/* shared: where the panel sits */

const PHONE = '(max-width: 639px)';

function usePhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches);
  useEffect(() => {
    const query = window.matchMedia(PHONE);
    const on = () => setPhone(query.matches);
    query.addEventListener('change', on);
    return () => query.removeEventListener('change', on);
  }, []);
  return phone;
}

/** The nearest box that scrolls (a dialog's body, a drawer), else the page. */
function scrollParent(el: HTMLElement | null): { scrollBy: (o: ScrollToOptions) => void } {
  for (let node = el?.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return window;
}

interface Place {
  left: number;
  top?: number;
  bottom?: number;
}

/**
 * Open, close and place a panel under a trigger. Under, always, unless the
 * window itself is too short: then the field is scrolled up first.
 */
function usePopover(panelHeight: number, panelWidth: number) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const phone = usePhone();

  const measure = useCallback(() => {
    const box = trigger.current?.getBoundingClientRect();
    if (!box) return;
    const gap = 6;
    const margin = 12;
    const below = window.innerHeight - box.bottom - gap - margin;
    const above = box.top - gap - margin;
    const up = below < panelHeight && above >= panelHeight;
    const left = Math.min(Math.max(box.left, margin), window.innerWidth - panelWidth - margin);
    setPlace(up ? { left, bottom: window.innerHeight - box.top + gap } : { left, top: box.bottom + gap });
  }, [panelHeight, panelWidth]);

  const show = useCallback(() => {
    const box = trigger.current?.getBoundingClientRect();
    /* Not enough room below: move the field up the page (or up the dialog it
       is in) by exactly what the panel needs, rather than open upwards. */
    const need = box ? panelHeight + 24 - (window.innerHeight - box.bottom) : 0;
    if (box && !phone && need > 0) {
      const room = Math.max(0, box.top - 72);
      scrollParent(trigger.current).scrollBy({ top: Math.min(need, room) });
    }
    setOpen(true);
  }, [phone, panelHeight]);

  const hide = useCallback((refocus = true) => {
    setOpen(false);
    setPlace(null);
    if (refocus) trigger.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!open || phone) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, phone, measure]);

  /* A tap anywhere else closes it. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const at = e.target as Node;
      if (panel.current?.contains(at) || trigger.current?.contains(at)) return;
      hide(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, hide]);

  /* No page scrolling under the phone sheet. */
  useEffect(() => {
    if (!open || !phone) return;
    const was = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = was;
    };
  }, [open, phone]);

  return { open, show, hide, place, trigger, panel, phone };
}

/** The floating panel (laptop) or bottom sheet (phone). */
function Floating({
  pop,
  width,
  label,
  onKeyDown,
  children,
}: {
  pop: ReturnType<typeof usePopover>;
  width: number;
  label?: string;
  onKeyDown?: (e: ReactKeyboardEvent) => void;
  children: ReactNode;
}) {
  if (!pop.open) return null;
  return createPortal(
    pop.phone ? (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end" onKeyDown={onKeyDown}>
        <div className="absolute inset-0 animate-fade-in bg-black/50" aria-hidden onClick={() => pop.hide()} />
        <div
          ref={pop.panel}
          role="dialog"
          aria-label={label}
          className="relative max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-3xl border-t border-hairline bg-[var(--surface-card)] pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.45)]"
        >
          <span aria-hidden className="mx-auto mb-1 mt-2.5 block h-1 w-10 rounded-full bg-[var(--border-strong)]" />
          {label && <p className="px-5 pt-1 text-label font-semibold text-primary">{label}</p>}
          <div className="px-3 pt-1">{children}</div>
        </div>
      </div>
    ) : pop.place ? (
      <div
        ref={pop.panel}
        role="dialog"
        aria-label={label}
        onKeyDown={onKeyDown}
        style={{ left: pop.place.left, top: pop.place.top, bottom: pop.place.bottom, width }}
        className={cn(
          'fixed z-[100] animate-scale-in overflow-hidden rounded-2xl border border-hairline bg-[var(--surface-card)] p-2 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.4)]',
          pop.place.bottom !== undefined ? 'origin-bottom' : 'origin-top',
        )}
      >
        {children}
      </div>
    ) : null,
    document.body,
  );
}

/** What `onChange` hands back: shaped like the native event, which is all a screen reads. */
function changeEvent(value: string, name?: string): ChangeEvent<HTMLInputElement> {
  const target = { value, name: name ?? '' };
  return { target, currentTarget: target } as unknown as ChangeEvent<HTMLInputElement>;
}

const TRIGGER =
  'flex h-11 w-full items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-card)] pl-3.5 pr-2.5 text-left text-body transition-shadow ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60';

export interface PickerProps {
  value?: string | number | readonly string[];
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  name?: string;
  id?: string;
  className?: string;
  /** Sits in a line of chips (a pill) rather than filling its column. */
  inline?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
}

/* dates */

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parse(value: string): { y: number; m: number; d: number } | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!hit) return null;
  return { y: Number(hit[1]), m: Number(hit[2]) - 1, d: Number(hit[3]) };
}

function todayIso(): string {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
}

/** Move an ISO date by days, without a timezone ever shifting it a day. */
function addDays(value: string, days: number): string {
  const p = parse(value)!;
  const d = new Date(Date.UTC(p.y, p.m, p.d + days));
  return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function addMonths(value: string, months: number): string {
  const p = parse(value)!;
  const first = new Date(Date.UTC(p.y, p.m + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return iso(first.getUTCFullYear(), first.getUTCMonth(), Math.min(p.d, last));
}

const LOCALE = dateLocale('en-GB');
const SHOW_FMT = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const MONTH_FMT = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONTH_SHORT = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' });
const WEEKDAY = new Intl.DateTimeFormat(LOCALE, { weekday: 'narrow', timeZone: 'UTC' });
const FULL_FMT = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const utc = (value: string) => {
  const p = parse(value)!;
  return new Date(Date.UTC(p.y, p.m, p.d));
};

/* Monday first: how a working week is read. 2024-01-01 was a Monday. */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => WEEKDAY.format(new Date(Date.UTC(2024, 0, 1 + i))));

const DATE_PANEL_W = 304;
const DATE_PANEL_H = 372;

export function DateField({
  value,
  onChange,
  min,
  max,
  disabled,
  required,
  placeholder = 'Choose a date',
  name,
  id,
  className,
  inline,
  invalid,
  'aria-label': ariaLabel,
}: PickerProps) {
  const current = typeof value === 'string' && parse(value) ? value : '';
  const lo = typeof min === 'string' && parse(min) ? min : '';
  const hi = typeof max === 'string' && parse(max) ? max : '';
  const today = todayIso();
  const pop = usePopover(DATE_PANEL_H, DATE_PANEL_W);

  const [cursor, setCursor] = useState(current || today);
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const grid = useRef<HTMLDivElement>(null);

  const allowed = useCallback((d: string) => (!lo || d >= lo) && (!hi || d <= hi), [lo, hi]);

  const openPanel = () => {
    if (disabled) return;
    const start = current || (allowed(today) ? today : lo || hi || today);
    setCursor(start);
    setView('days');
    pop.show();
  };

  const commit = (next: string) => {
    if (next && !allowed(next)) return;
    if (next !== current) onChange?.(changeEvent(next, name));
    pop.hide();
  };

  /* Keep the keyboard on the highlighted day. */
  useEffect(() => {
    if (!pop.open || view !== 'days') return;
    const t = window.setTimeout(() => grid.current?.querySelector<HTMLButtonElement>(`[data-day="${cursor}"]`)?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(t);
  }, [cursor, pop.open, view]);

  const shown = parse(cursor)!;
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(shown.y, shown.m, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    const start = iso(shown.y, shown.m, 1);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i - lead));
  }, [shown.y, shown.m]);

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      pop.hide();
      return;
    }
    if (view !== 'days') return;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, -1),
      PageDown: () => addMonths(cursor, 1),
      Home: () => addDays(cursor, -((utc(cursor).getUTCDay() + 6) % 7)),
      End: () => addDays(cursor, 6 - ((utc(cursor).getUTCDay() + 6) % 7)),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setCursor(moves[e.key]());
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(cursor);
    } else if (e.key === 'Tab') {
      pop.hide(false);
    }
  };

  const monthStart = (y: number, m: number) => iso(y, m, 1);
  const monthAllowed = (y: number, m: number) =>
    (!lo || iso(y, m, new Date(Date.UTC(y, m + 1, 0)).getUTCDate()) >= lo) && (!hi || monthStart(y, m) <= hi);
  const yearBase = shown.y - ((shown.y % 12) + 12) % 12;

  const header = (label: string, onLabel: (() => void) | null, prev: () => void, next: () => void) => (
    <div className="mb-1.5 flex items-center gap-1">
      <button type="button" onClick={prev} aria-label="Previous" className="tap flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-[var(--surface-sunken)] hover:text-primary">
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={onLabel ?? undefined}
        disabled={!onLabel}
        className="notranslate h-9 flex-1 rounded-lg text-body font-semibold capitalize text-primary hover:bg-[var(--surface-sunken)] disabled:hover:bg-transparent"
        translate="no"
      >
        {label}
      </button>
      <button type="button" onClick={next} aria-label="Next" className="tap flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-[var(--surface-sunken)] hover:text-primary">
        <ChevronRight size={18} />
      </button>
    </div>
  );

  const body = (
    <div className={cn(pop.phone && 'pb-1')}>
      {view === 'days' && (
        <>
          {header(MONTH_FMT.format(utc(cursor)), () => setView('months'), () => setCursor(addMonths(cursor, -1)), () => setCursor(addMonths(cursor, 1)))}
          <div className="notranslate grid grid-cols-7 text-center text-micro font-semibold uppercase text-muted" translate="no">
            {WEEKDAYS.map((w, i) => (
              <span key={i} className="py-1.5">
                {w}
              </span>
            ))}
          </div>
          <div ref={grid} role="grid" className="notranslate grid grid-cols-7 gap-0.5" translate="no">
            {cells.map((d) => {
              const p = parse(d)!;
              const inMonth = p.m === shown.m;
              const ok = allowed(d);
              const picked = d === current;
              return (
                <button
                  key={d}
                  type="button"
                  data-day={d}
                  tabIndex={d === cursor ? 0 : -1}
                  disabled={!ok}
                  onClick={() => commit(d)}
                  aria-label={FULL_FMT.format(utc(d))}
                  aria-pressed={picked}
                  className={cn(
                    'tabular flex items-center justify-center rounded-lg text-label transition-colors focus:outline-none',
                    pop.phone ? 'h-11' : 'h-9',
                    inMonth ? 'text-primary' : 'text-muted opacity-60',
                    ok ? 'hover:bg-[var(--surface-sunken)]' : 'cursor-not-allowed opacity-30',
                    d === today && !picked && 'font-bold text-brand-700 ring-1 ring-inset ring-brand-500/60 dark:text-brand-300',
                    picked && 'bg-brand-600 font-bold text-white hover:bg-brand-600 dark:bg-brand-500 dark:text-brand-950',
                    d === cursor && !picked && 'bg-[var(--surface-sunken)] ring-2 ring-inset ring-brand-500/40',
                  )}
                >
                  {p.d}
                </button>
              );
            })}
          </div>
        </>
      )}

      {view === 'months' && (
        <>
          {header(String(shown.y), () => setView('years'), () => setCursor(addMonths(cursor, -12)), () => setCursor(addMonths(cursor, 12)))}
          <div className="notranslate grid grid-cols-3 gap-1.5" translate="no">
            {Array.from({ length: 12 }, (_, m) => (
              <button
                key={m}
                type="button"
                disabled={!monthAllowed(shown.y, m)}
                onClick={() => {
                  setCursor(iso(shown.y, m, Math.min(shown.d, new Date(Date.UTC(shown.y, m + 1, 0)).getUTCDate())));
                  setView('days');
                }}
                className={cn(
                  'h-12 rounded-xl text-label font-semibold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                  m === shown.m ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950' : 'text-primary hover:bg-[var(--surface-sunken)]',
                )}
              >
                {MONTH_SHORT.format(new Date(Date.UTC(2024, m, 1)))}
              </button>
            ))}
          </div>
        </>
      )}

      {view === 'years' && (
        <>
          {header(`${yearBase} to ${yearBase + 11}`, null, () => setCursor(addMonths(cursor, -144)), () => setCursor(addMonths(cursor, 144)))}
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => (
              <button
                key={y}
                type="button"
                disabled={(Boolean(lo) && `${y}-12-31` < lo) || (Boolean(hi) && `${y}-01-01` > hi)}
                onClick={() => {
                  setCursor(iso(y, shown.m, Math.min(shown.d, new Date(Date.UTC(y, shown.m + 1, 0)).getUTCDate())));
                  setView('months');
                }}
                className={cn(
                  'tabular h-12 rounded-xl text-label font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                  y === shown.y ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950' : 'text-primary hover:bg-[var(--surface-sunken)]',
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-hairline pt-2">
        <button
          type="button"
          disabled={!allowed(today)}
          onClick={() => commit(today)}
          className="h-9 rounded-lg px-3 text-label font-semibold text-brand-700 hover:bg-[var(--surface-sunken)] disabled:opacity-40 dark:text-brand-300"
        >
          Today
        </button>
        {!required && current && (
          <button type="button" onClick={() => commit('')} className="h-9 rounded-lg px-3 text-label font-semibold text-secondary hover:bg-[var(--surface-sunken)]">
            Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('relative', inline ? 'inline-flex' : 'w-full')}>
      <button
        ref={pop.trigger}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (pop.open ? pop.hide() : openPanel())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            openPanel();
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        aria-label={ariaLabel ? `${ariaLabel}${current ? `, ${FULL_FMT.format(utc(current))}` : ''}` : undefined}
        className={cn(
          TRIGGER,
          inline && 'w-auto',
          pop.open && 'border-brand-500 ring-2 ring-brand-500/25',
          invalid && 'border-status-critical',
          className,
        )}
      >
        <CalendarDays size={16} aria-hidden className="shrink-0 text-[var(--text-muted)]" />
        <span className={cn('min-w-0 flex-1 truncate', current ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
          {current ? SHOW_FMT.format(utc(current)) : placeholder}
        </span>
      </button>
      {/* Keeps a form's own "required" check working. */}
      {(name || required) && (
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          required={required}
          value={current}
          onChange={() => undefined}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}
      <Floating pop={pop} width={DATE_PANEL_W} label={ariaLabel} onKeyDown={onKey}>
        {body}
      </Floating>
    </div>
  );
}

/* times */

const TIME_PANEL_W = 236;
const TIME_PANEL_H = 300;
const TIME_FMT = new Intl.DateTimeFormat(dateLocale('en-NG'), { hour: 'numeric', minute: '2-digit', hour12: !twentyFourHour, timeZone: 'UTC' });

function parseTime(value: string): { h: number; m: number } | null {
  const hit = /^(\d{2}):(\d{2})/.exec(value);
  if (!hit) return null;
  const h = Number(hit[1]);
  const m = Number(hit[2]);
  return h < 24 && m < 60 ? { h, m } : null;
}

export function TimeField({
  value,
  onChange,
  disabled,
  required,
  placeholder = 'Choose a time',
  name,
  id,
  className,
  inline,
  invalid,
  'aria-label': ariaLabel,
}: PickerProps) {
  const current = typeof value === 'string' && parseTime(value) ? value.slice(0, 5) : '';
  const pop = usePopover(TIME_PANEL_H, TIME_PANEL_W);
  const [hour, setHour] = useState<number | null>(null);
  const hours = useRef<HTMLDivElement>(null);
  const minutesBox = useRef<HTMLDivElement>(null);

  const t = parseTime(current);
  const minutes = useMemo(() => {
    const list = Array.from({ length: 12 }, (_, i) => i * 5);
    if (t && !list.includes(t.m)) list.push(t.m);
    return list.sort((a, b) => a - b);
  }, [t?.m]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPanel = () => {
    if (disabled) return;
    setHour(t ? t.h : null);
    pop.show();
  };

  /* The chosen hour and minute scrolled into view as it opens. */
  useEffect(() => {
    if (!pop.open) return;
    const id = window.setTimeout(() => {
      hours.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ block: 'center' });
      minutesBox.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ block: 'center' });
    }, 30);
    return () => window.clearTimeout(id);
  }, [pop.open, pop.place]);

  const commit = (h: number, m: number) => {
    const next = `${pad(h)}:${pad(m)}`;
    if (next !== current) onChange?.(changeEvent(next, name));
    pop.hide();
  };

  const shownHour = hour ?? t?.h ?? null;
  const col = 'max-h-[232px] flex-1 overflow-y-auto overscroll-contain rounded-xl border border-hairline p-1';
  const cell = (on: boolean) =>
    cn(
      'tabular flex h-9 w-full items-center justify-center rounded-lg text-label transition-colors',
      on ? 'bg-brand-600 font-bold text-white dark:bg-brand-500 dark:text-brand-950' : 'text-primary hover:bg-[var(--surface-sunken)]',
    );

  const body = (
    <div onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), pop.hide())}>
      <div className="mb-1.5 grid grid-cols-2 gap-2 px-1 text-micro font-semibold uppercase tracking-[0.08em] text-muted">
        <span>Hour</span>
        <span>Minute</span>
      </div>
      <div className="flex gap-2">
        <div ref={hours} className={col}>
          {Array.from({ length: 24 }, (_, h) => (
            <button key={h} type="button" aria-pressed={h === shownHour} onClick={() => setHour(h)} className={cell(h === shownHour)}>
              {pad(h)}
            </button>
          ))}
        </div>
        <div ref={minutesBox} className={col}>
          {minutes.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={Boolean(t && t.m === m && shownHour === t.h)}
              onClick={() => commit(shownHour ?? 9, m)}
              className={cell(Boolean(t && t.m === m && shownHour === t.h))}
            >
              {pad(m)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-hairline pt-2">
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            commit(now.getHours(), now.getMinutes());
          }}
          className="h-9 rounded-lg px-3 text-label font-semibold text-brand-700 hover:bg-[var(--surface-sunken)] dark:text-brand-300"
        >
          Now
        </button>
        {!required && current && (
          <button
            type="button"
            onClick={() => {
              onChange?.(changeEvent('', name));
              pop.hide();
            }}
            className="flex h-9 items-center gap-1 rounded-lg px-3 text-label font-semibold text-secondary hover:bg-[var(--surface-sunken)]"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('relative', inline ? 'inline-flex' : 'w-full')}>
      <button
        ref={pop.trigger}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (pop.open ? pop.hide() : openPanel())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            openPanel();
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        aria-label={ariaLabel}
        className={cn(TRIGGER, inline && 'w-auto', pop.open && 'border-brand-500 ring-2 ring-brand-500/25', invalid && 'border-status-critical', className)}
      >
        <Clock size={16} aria-hidden className="shrink-0 text-[var(--text-muted)]" />
        <span className={cn('tabular min-w-0 flex-1 truncate', current ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
          {t ? TIME_FMT.format(new Date(Date.UTC(2024, 0, 1, t.h, t.m))) : placeholder}
        </span>
      </button>
      {(name || required) && (
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          required={required}
          value={current}
          onChange={() => undefined}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}
      <Floating pop={pop} width={TIME_PANEL_W} label={ariaLabel}>
        {body}
      </Floating>
    </div>
  );
}
