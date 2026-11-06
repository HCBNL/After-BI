/**
 * A screen's sections as one drop down, instead of a long row of tabs.
 *
 * The button shows the section you are on (icon, name, count); tap it and a
 * panel lists every section with its count, the current one ticked. It holds
 * three sections or thirty in the same space, so a screen can keep growing
 * without its menu running off the edge. `Tabs` switches to this by itself
 * once there are more than five sections.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SectionItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  /** One short line under the name in the list. */
  hint?: string;
}

export function SectionMenu({
  items,
  active,
  onChange,
  className,
  label = 'Section',
}: {
  items: SectionItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const current = items.find((i) => i.id === active) ?? items[0];

  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      const width = Math.max(r.width, 336);
      setPos({
        top: r.bottom + 6,
        left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8),
        width,
        maxHeight: Math.max(220, Math.min(460, window.innerHeight - r.bottom - 16)),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setFocus(Math.max(0, items.findIndex((i) => i.id === active)));
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus((i) => Math.max(0, i - 1));
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) panel.current?.querySelectorAll<HTMLButtonElement>('[role=menuitemradio]')[focus]?.focus();
  }, [open, focus, pos]);

  const pick = (id: string) => {
    setOpen(false);
    onChange(id);
    button.current?.focus();
  };

  const count = (n: number | undefined, on: boolean) =>
    n === undefined ? null : (
      <span
        className={cn(
          'tabular shrink-0 rounded-full px-1.5 py-0.5 text-micro font-bold',
          on ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200' : 'bg-[var(--surface-sunken)] text-muted',
        )}
      >
        {n}
      </span>
    );

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? ''}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'surface-card inline-flex h-11 min-w-[13rem] items-center gap-2.5 rounded-xl border border-hairline pl-3 pr-2.5 text-left shadow-card transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          open && 'border-brand-500',
          className,
        )}
      >
        {current?.icon && <span className="shrink-0 text-brand-700 dark:text-brand-300 [&>svg]:h-4 [&>svg]:w-4">{current.icon}</span>}
        <span className="min-w-0 flex-1 truncate text-body font-semibold text-primary">{current?.label}</span>
        {count(current?.count, true)}
        <ChevronDown size={16} aria-hidden className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            aria-label={label}
            className="surface-card scrollbar-thin fixed z-[80] overflow-y-auto rounded-2xl border border-hairline p-1.5 shadow-pop animate-fade-in"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
          >
            {items.map((item, index) => {
              const on = item.id === current?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => pick(item.id)}
                  onMouseEnter={() => setFocus(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none',
                    index === focus ? 'bg-[var(--surface-sunken)]' : '',
                  )}
                >
                  {item.icon && (
                    <span className={cn('shrink-0 [&>svg]:h-4 [&>svg]:w-4', on ? 'text-brand-700 dark:text-brand-300' : 'text-muted')}>{item.icon}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-body', on ? 'font-semibold text-primary' : 'font-medium text-secondary')}>{item.label}</span>
                    {item.hint && <span className="block truncate text-caption text-muted">{item.hint}</span>}
                  </span>
                  {count(item.count, on)}
                  <Check size={15} aria-hidden className={cn('shrink-0 text-brand-600 dark:text-brand-400', on ? 'opacity-100' : 'opacity-0')} />
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
