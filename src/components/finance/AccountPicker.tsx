/**
 * Choose a customer account: a button showing the account, and a panel with a
 * search box and the list under it. Replaces the browser's own drop down,
 * which looks different on every computer, shows one plain blue line, and
 * gives no way to find one account among two hundred.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AccountOption {
  id: string;
  name: string;
  detail?: string;
}

export function AccountPicker({
  value,
  options,
  onChange,
  className,
  label = 'Customer account',
}: {
  value: string;
  options: AccountOption[];
  onChange: (id: string) => void;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const chosen = options.find((o) => o.id === value);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.name} ${o.detail ?? ''}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      const width = Math.max(r.width, 280);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      const below = window.innerHeight - r.bottom - 16;
      setPos({ top: r.bottom + 6, left, width, maxHeight: Math.max(220, Math.min(420, below)) });
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
    setQuery('');
    setActive(Math.max(0, options.findIndex((o) => o.id === value)));
    const t = window.setTimeout(() => input.current?.focus(), 30);
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    button.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && shown[active]) {
      e.preventDefault();
      pick(shown[active].id);
    }
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${chosen?.name ?? 'none chosen'}`}
        className={cn(
          'surface-card flex h-12 w-full items-center gap-3 rounded-2xl border border-hairline pl-3 pr-3.5 text-left shadow-card transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          className,
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full surface-sunken text-secondary">
          <Building2 size={16} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold text-primary">{chosen?.name ?? 'Choose an account'}</span>
          {chosen?.detail && <span className="block truncate text-caption text-muted">{chosen.detail}</span>}
        </span>
        <ChevronDown size={17} aria-hidden className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panel}
            className="surface-card fixed z-[80] flex flex-col overflow-hidden rounded-2xl border border-hairline shadow-pop animate-fade-in"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            onKeyDown={onKey}
          >
            <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
              <Search size={16} aria-hidden className="shrink-0 text-muted" />
              <input
                ref={input}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder={`Search ${options.length} accounts`}
                aria-label="Search accounts"
                className="h-8 min-w-0 flex-1 bg-transparent text-body text-primary placeholder:text-muted focus:outline-none"
              />
            </div>
            <ul role="listbox" aria-label={label} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5">
              {shown.length === 0 && <li className="px-3 py-4 text-center text-label text-muted">No account matches that.</li>}
              {shown.map((o, i) => {
                const on = o.id === value;
                return (
                  <li key={o.id} role="option" aria-selected={on}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(o.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        i === active ? 'bg-[var(--surface-sunken)]' : '',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-body', on ? 'font-semibold text-primary' : 'text-secondary')}>{o.name}</span>
                        {o.detail && <span className="block truncate text-caption text-muted">{o.detail}</span>}
                      </span>
                      {on && <Check size={16} aria-hidden className="shrink-0" style={{ color: 'var(--swatch)' }} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
