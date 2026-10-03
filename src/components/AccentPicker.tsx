/**
 * The colour of your panels: the four brand colours, plus any other.
 *
 * The rainbow swatch opens the device's own colour picker, so any colour
 * at all can be chosen. Green stays the primary colour for
 * buttons and links everywhere; this changes the coloured panels and banners,
 * for this person on this device. See `lib/theme.ts`.
 */
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENTS, getStoredAccent, isPreset, setStoredAccent, type Accent } from '@/lib/theme';

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
  const custom = isPreset(accent) ? null : accent;

  const choose = (next: Accent) => {
    setStoredAccent(next);
    setAccent(next);
  };

  const dot = (on: boolean) =>
    cn(
      'relative flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105',
      on ? 'outline-2 outline-offset-2 outline-[color:var(--text-primary)]' : 'ring-1 ring-inset ring-black/10 dark:ring-white/15',
    );

  return (
    <div className={cn('relative', className)}>
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

        {/*
          THE RAINBOW CIRCLE IS THE DEVICE'S OWN COLOUR PICKER.

          A transparent colour input laid over the circle, as in GetSchool:
          tapping it opens the phone's or computer's native picker (on an
          iPhone, the Grid, Spectrum and Sliders sheet), so any colour at all
          can be chosen with nothing extra to download.
        */}
        <span
          title="Any colour"
          className={dot(Boolean(custom))}
          style={{ background: custom ?? RAINBOW, width: size, height: size }}
        >
          {custom ? (
            <Check size={Math.round(size * 0.45)} strokeWidth={3} color={tickFor(custom)} aria-hidden />
          ) : (
            <Plus size={Math.round(size * 0.45)} strokeWidth={3} color="#ffffff" aria-hidden />
          )}
          <input
            type="color"
            aria-label="Pick any colour"
            value={custom ?? '#7b1e2b'}
            onChange={(event) => choose(event.target.value.toLowerCase() as Accent)}
            className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
          />
        </span>
      </div>
    </div>
  );
}
