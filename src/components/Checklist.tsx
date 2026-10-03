import { cn } from '@/lib/cn';

/** Tick any number from a short list: depots, accounts, reps, roles. */
export function Checklist({
  items,
  value,
  onChange,
  disabled,
  empty,
}: {
  items: { id: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  empty: string;
}) {
  if (!items.length) return empty ? <p className="text-[13px] text-muted">{empty}</p> : null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const on = value.includes(item.id);
        return (
          <label
            key={item.id}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13.5px] text-primary transition-colors',
              on ? 'border-brand-500/50 bg-brand-50/60 dark:bg-brand-500/10' : 'border-hairline',
              disabled ? 'opacity-60' : 'cursor-pointer',
            )}
          >
            <input
              type="checkbox"
              checked={on}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id))}
              className="h-4 w-4 shrink-0 accent-[var(--color-brand-600)]"
            />
            <span className="min-w-0 truncate">{item.label}</span>
          </label>
        );
      })}
    </div>
  );
}
