/**
 * The app's own dropdown. Never the browser's.
 *
 * Written exactly like a native one, so nothing that uses it had to change:
 *
 *   <Select value={tier} onChange={(e) => setTier(e.target.value)}>
 *     <option value="">Choose…</option>
 *     <optgroup label="South West"><option value="Lagos">Lagos</option></optgroup>
 *   </Select>
 *
 * The <option>s are read, not rendered. What is drawn instead:
 *
 *   • a trigger styled like every other field, the chosen option in it (an
 *     empty-valued first option reads as a placeholder, in muted text);
 *   • on a laptop, a list that opens under the field (above it when there is
 *     no room below), as wide as the field, scrolling past ten rows or so;
 *   • on a phone, a sheet from the bottom of the screen with big rows, the
 *     way native apps do it;
 *   • a search box when there are more than eight choices;
 *   • groups as small headings, the chosen option ticked, disabled ones dimmed.
 *
 * Keyboard: arrows, Home and End move, Enter or Space picks, Escape closes,
 * and typing a letter on the closed field jumps to the next option starting
 * with it, as a native dropdown does.
 *
 * `onChange` receives an object shaped like the native event (`e.target.value`,
 * `e.target.name`), which is all any screen reads from it.
 */
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { translateText } from '@/lib/i18n';

interface Item {
  kind: 'option';
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
}
interface Heading {
  kind: 'group';
  label: string;
}
type Row = Item | Heading;

/** An option's words, whatever shape its children took (`{a} ({b})` is an array). */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

/** The options and groups out of the children, in order, through fragments and arrays. */
function readRows(children: ReactNode, group?: string, out: Row[] = []): Row[] {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; value?: unknown; label?: string; disabled?: boolean }>(child)) return;
    if (child.type === Fragment) {
      readRows(child.props.children, group, out);
    } else if (child.type === 'optgroup') {
      out.push({ kind: 'group', label: String(child.props.label ?? '') });
      readRows(child.props.children, String(child.props.label ?? ''), out);
    } else if (child.type === 'option') {
      const label = textOf(child.props.children);
      out.push({
        kind: 'option',
        value: child.props.value === undefined ? label : String(child.props.value),
        label,
        disabled: Boolean(child.props.disabled),
        group,
      });
    }
  });
  return out;
}

const PHONE = '(max-width: 639px)';
const SEARCH_FROM = 9;

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

const LAYOUT = /^(?:[a-z0-9]+:)*-?(?:w|min-w|max-w|flex|basis|grow|shrink|m|mx|my|ml|mr|mt|mb|self|order|col|row|justify-self)(?:-|$)/;

/** Width and placement classes go on the wrapper; the rest (height, text) on the field. */
function splitLayout(className?: string): { outer: string; inner: string } {
  const outer: string[] = [];
  const inner: string[] = [];
  for (const token of (className ?? '').split(/\s+/).filter(Boolean)) (LAYOUT.test(token) ? outer : inner).push(token);
  return { outer: outer.join(' '), inner: inner.join(' ') };
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({
  value,
  defaultValue,
  onChange,
  children,
  disabled,
  className,
  name,
  id,
  title,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: SelectProps) {
  const rows = useMemo(() => readRows(children), [children]);
  const items = useMemo(() => rows.filter((r): r is Item => r.kind === 'option'), [rows]);

  /* Controlled as a rule; a `defaultValue` alone works too. */
  const [own, setOwn] = useState(() => String(defaultValue ?? items[0]?.value ?? ''));
  const current = value !== undefined && value !== null ? String(value) : own;
  const chosen = items.find((i) => i.value === current);
  const placeholder = chosen ? chosen.value === '' : true;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const phone = usePhone();
  const listId = useId();
  const optionId = (index: number) => `${listId}-o${index}`;

  const searchable = items.length >= SEARCH_FROM;

  /* What the list shows: every row, or the matches and their group headings. */
  const shown = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const hit = (i: Item) =>
      i.label.toLowerCase().includes(q) || (translateText(i.label) ?? '').toLowerCase().includes(q);
    const out: Row[] = [];
    let lastGroup: string | undefined;
    for (const row of rows) {
      if (row.kind !== 'option' || !hit(row)) continue;
      if (row.group && row.group !== lastGroup) out.push({ kind: 'group', label: row.group });
      lastGroup = row.group;
      out.push(row);
    }
    return out;
  }, [rows, query]);

  const pickable = useMemo(
    () => shown.map((r, i) => (r.kind === 'option' && !r.disabled ? i : -1)).filter((i) => i >= 0),
    [shown],
  );

  const commit = useCallback(
    (next: string) => {
      if (next !== current) {
        if (value === undefined) setOwn(next);
        const target = { value: next, name: name ?? '' };
        onChange?.({ target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement>);
      }
    },
    [current, value, name, onChange],
  );

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) trigger.current?.focus({ preventScroll: true });
  }, []);

  const openList = () => {
    if (disabled || !items.length) return;
    setOpen(true);
    const at = shown.findIndex((r) => r.kind === 'option' && r.value === current);
    setActive(at >= 0 ? at : (pickable[0] ?? -1));
  };

  /* When the query changes, the first match is the one Enter picks. */
  useEffect(() => {
    if (open && query) setActive(pickable[0] ?? -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /* Focus goes into the list (or its search box) on open. Not the search box on a
     phone: the keyboard would cover the very list it is filtering. */
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => (searchable && !phone ? searchBox.current : list.current)?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(t);
  }, [open, searchable, phone]);

  /* Keep the highlighted row in view. */
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  /* A tap anywhere else closes it. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const at = e.target as Node;
      if (panel.current?.contains(at) || trigger.current?.contains(at)) return;
      close(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, close]);

  /* Where the laptop list sits: under the field, or over it when the page runs out below. */
  const [place, setPlace] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const measure = useCallback(() => {
    const box = trigger.current?.getBoundingClientRect();
    if (!box) return;
    const gap = 6;
    const margin = 12;
    const below = window.innerHeight - box.bottom - gap - margin;
    const above = box.top - gap - margin;
    const want = Math.min(340, rows.length * 44 + (searchable ? 56 : 0) + 12);
    const up = below < Math.min(want, 220) && above > below;
    const width = Math.min(Math.max(box.width, 200), window.innerWidth - margin * 2);
    const left = Math.min(Math.max(box.left, margin), window.innerWidth - width - margin);
    setPlace({
      left,
      width,
      ...(up ? { bottom: window.innerHeight - box.top + gap } : { top: box.bottom + gap }),
      maxHeight: Math.max(160, Math.min(340, up ? above : below)),
    });
  }, [rows.length, searchable]);

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

  /* No page scrolling under the phone sheet. */
  useEffect(() => {
    if (!open || !phone) return;
    const was = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = was;
    };
  }, [open, phone]);

  const step = (by: number) => {
    if (!pickable.length) return;
    const at = pickable.indexOf(active);
    const next = at < 0 ? (by > 0 ? 0 : pickable.length - 1) : Math.min(Math.max(at + by, 0), pickable.length - 1);
    setActive(pickable[next]);
  };

  const pick = (index: number) => {
    const row = shown[index];
    if (!row || row.kind !== 'option' || row.disabled) return;
    commit(row.value);
    close();
  };

  /* Keys while the list is open (on the list or its search box). */
  const onListKey = (e: ReactKeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        step(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        step(-1);
        break;
      case 'Home':
        if (e.target === searchBox.current) return;
        e.preventDefault();
        setActive(pickable[0] ?? -1);
        break;
      case 'End':
        if (e.target === searchBox.current) return;
        e.preventDefault();
        setActive(pickable[pickable.length - 1] ?? -1);
        break;
      case 'Enter':
        e.preventDefault();
        pick(active);
        break;
      case ' ':
        if (e.target === searchBox.current) return;
        e.preventDefault();
        pick(active);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  /* Keys on the closed field: open it, or jump by first letter like a native one. */
  const typed = useRef({ text: '', at: 0 });
  const onTriggerKey = (e: ReactKeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
      const from = items.findIndex((i) => i.value === current);
      const ordered = [...items.slice(from + 1), ...items.slice(0, from + 1)];
      const hit = ordered.find((i) => !i.disabled && i.label.toLowerCase().startsWith(typed.current.text));
      if (hit) commit(hit.value);
    }
  };

  const { outer, inner } = splitLayout(className);

  const body = (
    <>
      {searchable && (
        <div className="border-b border-hairline p-2">
          <div className="relative">
            <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              ref={searchBox}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onListKey}
              placeholder="Search"
              aria-label="Search the choices"
              aria-controls={listId}
              aria-activedescendant={active >= 0 ? optionId(active) : undefined}
              className="h-10 w-full rounded-lg border border-hairline bg-[var(--surface-page)] pl-9 pr-3 [&::-webkit-search-cancel-button]:appearance-none text-label text-primary placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
          </div>
        </div>
      )}
      <div
        ref={list}
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        onKeyDown={onListKey}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 focus:outline-none"
      >
        {shown.map((row, index) =>
          row.kind === 'group' ? (
            <p
              key={`g-${row.label}-${index}`}
              role="presentation"
              className="px-3 pb-1 pt-3 text-micro font-semibold uppercase tracking-[0.08em] text-muted first:pt-1.5"
            >
              {row.label}
            </p>
          ) : (
            <div
              key={`o-${row.value}-${index}`}
              id={optionId(index)}
              role="option"
              aria-selected={row.value === current}
              aria-disabled={row.disabled || undefined}
              onPointerMove={() => !row.disabled && active !== index && setActive(index)}
              onClick={() => pick(index)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3 text-left transition-colors',
                phone ? 'min-h-12 py-3 text-body' : 'min-h-10 py-2 text-label',
                row.value === current ? 'font-semibold text-primary' : 'text-secondary',
                index === active && 'bg-[var(--surface-sunken)] text-primary',
                row.value === '' && row.value !== current && 'text-muted',
                row.disabled && 'cursor-not-allowed opacity-45',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {row.value === current && <Check size={16} aria-hidden className="shrink-0 text-brand-600 dark:text-brand-400" />}
            </div>
          ),
        )}
        {shown.length === 0 && <p className="px-3 py-6 text-center text-label text-muted">No matches</p>}
      </div>
    </>
  );

  return (
    <div className={cn('relative', outer)}>
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        title={title}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-card)] pl-3.5 pr-3 text-left text-body transition-shadow',
          'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25',
          'disabled:cursor-not-allowed disabled:opacity-60',
          open && 'border-brand-500 ring-2 ring-brand-500/25',
          inner,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', placeholder ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]')}>
          {chosen?.label ?? ''}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn('shrink-0 text-[var(--text-muted)] transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {name && <input type="hidden" name={name} value={current} />}

      {open &&
        createPortal(
          phone ? (
            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
              <div className="absolute inset-0 animate-fade-in bg-black/50" aria-hidden onClick={() => close()} />
              <div
                ref={panel}
                className="relative flex max-h-[72vh] animate-slide-up flex-col rounded-t-3xl border-t border-hairline bg-[var(--surface-card)] pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.45)]"
              >
                <span aria-hidden className="mx-auto mb-1 mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" />
                {ariaLabel && <p className="px-5 pb-1 pt-1 text-label font-semibold text-primary">{ariaLabel}</p>}
                {body}
              </div>
            </div>
          ) : (
            place && (
              <div
                ref={panel}
                style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
                className={cn(
                  'fixed z-[100] flex animate-scale-in flex-col overflow-hidden rounded-xl border border-hairline bg-[var(--surface-card)] shadow-[0_18px_44px_-14px_rgba(0,0,0,0.4)]',
                  place.bottom !== undefined ? 'origin-bottom' : 'origin-top',
                )}
              >
                {body}
              </div>
            )
          ),
          document.body,
        )}
    </div>
  );
}
