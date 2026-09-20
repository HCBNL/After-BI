import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENTS, getStoredAccent, setStoredAccent, type Accent } from '@/lib/theme';

/** The logo's colours as swatches. Changes the panels; green stays the primary colour. */
export function AccentPicker({ size = 34, className }: { size?: number; className?: string }) {
  const [accent, setAccent] = useState<Accent>(() => getStoredAccent());

  return (
    <div role="radiogroup" aria-label="Colour" className={cn('flex items-center gap-2.5', className)}>
      {ACCENTS.map(({ id, label, swatch }) => {
        const on = accent === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => {
              setStoredAccent(id);
              setAccent(id);
            }}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105',
              on
                ? 'outline-2 outline-offset-2 outline-[color:var(--text-primary)]'
                : 'ring-1 ring-inset ring-black/10 dark:ring-white/15',
            )}
            style={{ backgroundColor: swatch, width: size, height: size }}
          >
            {on && (
              <Check
                size={Math.round(size * 0.45)}
                strokeWidth={3}
                className={id === 'gold' ? 'text-[#3f2d03]' : 'text-white'}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
