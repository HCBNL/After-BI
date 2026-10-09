/**
 * The interface colour picker: four colours, the school's, or any colour.
 *
 * Used twice. In the menu, for a person's own choice (`PersonalColourPicker`
 * below). In Settings → Appearance, for the school's default. Both repaint
 * the app live as the colour is chosen, so nobody has to save to find out
 * what it looks like.
 *
 * The custom dot opens the device's own colour chooser — a real `<input
 * type="color">` laid over the dot, so a tap on a phone opens the phone's
 * picker directly. Whatever colour comes back is made readable by
 * `paletteFrom` before it touches the screen.
 */

import { useRef } from 'react';
import { Building2, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { contrastRatio, DEFAULT_ACCENT, isPreset, paletteFor, PRESET_ORDER, PRESETS, type AccentChoice } from '@/lib/accent';
import { usePersonalAccent } from '@/hooks/useAccent';
import { useSchoolBrand } from '@/context/BrandContext';

const DOT = 'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none';

function tick(on: string) {
  // Black on the pale ones (yellow), white on the rest.
  return contrastRatio(on, '#ffffff') >= 2.2 ? '#ffffff' : '#1a1a1a';
}

function Ring({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute -inset-[3px] rounded-full border-2 transition-opacity',
        on ? 'border-[var(--text-primary)] opacity-100' : 'opacity-0',
      )}
    />
  );
}

export function ColourPicker({
  value,
  onChange,
  inherit,
  label = 'Colour',
  className,
}: {
  /** The current choice; `null` means "inherit". */
  value: AccentChoice | null;
  onChange: (next: AccentChoice | null) => void;
  /** Offer "use the school's colour" as the first dot. */
  inherit?: { label: string; colour: AccentChoice };
  label?: string | null;
  className?: string;
}) {
  const custom = value && !isPreset(value) ? value : null;
  const input = useRef<HTMLInputElement>(null);
  const selected = value ?? (inherit ? null : DEFAULT_ACCENT);

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {label && <span className="text-[13.5px] font-semibold text-secondary">{label}</span>}
      <div role="radiogroup" aria-label="Interface colour" className="flex items-center gap-2.5">
        {inherit && (
          <button
            type="button"
            role="radio"
            aria-checked={selected === null}
            aria-label={inherit.label}
            title={inherit.label}
            onClick={() => onChange(null)}
            className={DOT}
            style={{ background: paletteFor(inherit.colour).swatch }}
          >
            <Ring on={selected === null} />
            {selected === null ? (
              <Check size={15} strokeWidth={3} color={tick(paletteFor(inherit.colour).swatch)} />
            ) : (
              <Building2 size={14} color={tick(paletteFor(inherit.colour).swatch)} />
            )}
          </button>
        )}

        {PRESET_ORDER.map((id) => {
          const on = selected === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={PRESETS[id].name}
              title={PRESETS[id].name}
              onClick={() => onChange(id)}
              className={DOT}
              style={{ background: PRESETS[id].swatch }}
            >
              <Ring on={on} />
              {on && <Check size={15} strokeWidth={3} color={tick(PRESETS[id].swatch)} />}
            </button>
          );
        })}

        <span className={DOT} title="Any colour">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: custom ?? 'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)',
            }}
          />
          <Ring on={Boolean(custom)} />
          <span className="relative">
            {custom ? (
              <Check size={15} strokeWidth={3} color={tick(custom)} />
            ) : (
              <Plus size={15} strokeWidth={3} color="#ffffff" />
            )}
          </span>
          <input
            ref={input}
            type="color"
            aria-label="Pick any colour"
            value={custom ?? '#7b1e2b'}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
          />
        </span>
      </div>
    </div>
  );
}

/**
 * The menu's picker: this person's own colour.
 *
 * The school's colour is offered as the first dot when the school has set
 * one, so going back to it is one tap and not a hunt for which of the four it
 * was.
 */
export function PersonalColourPicker({ className }: { className?: string }) {
  const [choice, setChoice] = usePersonalAccent();
  const school = useSchoolBrand();
  const schoolColour = school.interfaceColour;

  return (
    <ColourPicker
      className={className}
      value={choice}
      inherit={schoolColour ? { label: 'Your school’s colour', colour: schoolColour } : undefined}
      onChange={setChoice}
    />
  );
}
