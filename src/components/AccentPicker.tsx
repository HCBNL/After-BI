/**
 * The colour of your panels: the four brand colours, plus any other.
 *
 * The rainbow swatch opens a palette of fifteen more, and "Any colour" under
 * it opens the device's own colour picker. Green stays the primary colour for
 * buttons and links everywhere; this changes the coloured panels and banners,
 * for this person on this device. See `lib/theme.ts`.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENTS, getStoredAccent, isPreset, PALETTE, setStoredAccent, type Accent } from '@/lib/theme';

/** Dark tick on pale colours, white on the rest. */
function tickFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 170 ? '#1a1a1a' : '#ffffff';
}

const RAINBOW =
  'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)';

export function AccentPicker({ size = 34, className }: { size?: number; className?: string }) {
  const [accent, setAccent] = useState<Accent>(() => getStoredAccent());
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const custom = isPreset(accent) ? null : accent;

  const choose = (next: Accent) => {
    setStoredAccent(next);
    setAccent(next);
  };

  /* Close the palette on a tap outside it or on Escape. */
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const dot = (on: boolean) =>
    cn(
      'relative flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105',
      on ? 'outline-2 outline-offset-2 outline-[color:var(--text-primary)]' : 'ring-1 ring-inset ring-black/10 dark:ring-white/15',
    );

  return (
    <div ref={box} className={cn('relative', className)}>
      <div role="radiogroup" aria-label="Colour" className="flex items-center gap-2.5">
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
              onClick={() => choose(id)}
              className={dot(on)}
              style={{ backgroundColor: swatch, width: size, height: size }}
            >
              {on && <Check size={Math.round(size * 0.45)} strokeWidth={3} color={tickFor(swatch)} aria-hidden />}
            </button>
          );
        })}

        <button
          type="button"
          aria-label="More colours"
          aria-expanded={open}
          title="More colours"
          onClick={() => setOpen(!open)}
          className={dot(Boolean(custom))}
          style={{ background: custom ?? RAINBOW, width: size, height: size }}
        >
          {custom ? (
            <Check size={Math.round(size * 0.45)} strokeWidth={3} color={tickFor(custom)} aria-hidden />
          ) : (
            <Plus size={Math.round(size * 0.45)} strokeWidth={3} color="#ffffff" aria-hidden />
          )}
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="More colours"
          className="absolute bottom-full right-0 z-50 mb-3 w-[15.5rem] rounded-2xl border border-hairline surface-card p-3 shadow-pop"
        >
          <p className="mb-2 text-[12px] font-semibold text-muted">More colours</p>
          <div role="radiogroup" aria-label="More colours" className="grid grid-cols-5 gap-2.5">
            {PALETTE.map(({ label, hex }) => {
              const on = custom === hex;
              return (
                <button
                  key={hex}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={label}
                  title={label}
                  onClick={() => {
                    choose(hex as Accent);
                    setOpen(false);
                  }}
                  className={cn(dot(on), 'h-9 w-9')}
                  style={{ backgroundColor: hex }}
                >
                  {on && <Check size={15} strokeWidth={3} color={tickFor(hex)} aria-hidden />}
                </button>
              );
            })}
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-2 rounded-xl surface-sunken px-3 py-2 text-[13px] font-semibold text-primary">
            Any colour
            <span className="relative h-7 w-7 overflow-hidden rounded-full" style={{ background: custom ?? RAINBOW }}>
              <input
                type="color"
                aria-label="Pick any colour"
                value={custom ?? '#7c3aed'}
                onChange={(event) => choose(event.target.value.toLowerCase() as Accent)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
