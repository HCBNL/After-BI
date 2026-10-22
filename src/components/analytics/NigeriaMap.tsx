/**
 * Nigeria, state by state, shaded by revenue. Click a state to filter.
 *
 * Inline SVG, no map library: 37 paths, one fill each. The shading is five
 * steps of the brand green, split at the quantiles of the states that sold
 * anything, so one very large state does not wash every other one out to the
 * palest step. A state with nothing is drawn in the neutral surface colour.
 *
 * Desktop only. On a phone the outlines are too small to tap with any
 * accuracy, so the screen shows the ranked list of states instead.
 */
import { useMemo, useState } from 'react';
import { NIGERIA_STATES_SVG, NIGERIA_VIEWBOX } from '@/data/nigeriaMap';
import { cn } from '@/lib/cn';

/* Five shades of the theme colour, light to full, so the map follows blue, green or yellow. */
const STEPS = [
  'color-mix(in srgb, var(--swatch) 25%, var(--surface-card))',
  'color-mix(in srgb, var(--swatch) 42%, var(--surface-card))',
  'color-mix(in srgb, var(--swatch) 60%, var(--surface-card))',
  'color-mix(in srgb, var(--swatch) 80%, var(--surface-card))',
  'var(--swatch)',
];

export default function NigeriaMap({
  values,
  selected,
  onSelect,
  format,
}: {
  values: Map<string, number>;
  selected: string;
  onSelect: (state: string) => void;
  format: (value: number) => string;
}) {
  const [hover, setHover] = useState<{ state: string; x: number; y: number } | null>(null);

  const total = useMemo(() => [...values.values()].reduce((a, b) => a + b, 0), [values]);

  /* Quantile breaks over the states with revenue. */
  const breaks = useMemo(() => {
    const sorted = [...values.values()].filter((v) => v > 0).sort((a, b) => a - b);
    if (!sorted.length) return [];
    return [0.2, 0.4, 0.6, 0.8].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);
  }, [values]);

  const fillFor = (value: number) => {
    if (!value) return 'color-mix(in srgb, var(--swatch) 9%, var(--surface-sunken))';
    let step = 0;
    while (step < breaks.length && value > breaks[step]) step += 1;
    return STEPS[Math.min(step, STEPS.length - 1)];
  };

  const hovered = hover ? values.get(hover.state) ?? 0 : 0;

  return (
    <div className="relative">
      <svg
        viewBox={NIGERIA_VIEWBOX}
        role="group"
        aria-label="Revenue by state. Select a state to filter the report."
        className="h-auto w-full"
        onMouseLeave={() => setHover(null)}
      >
        {NIGERIA_STATES_SVG.map(({ state, d }) => {
          const value = values.get(state) ?? 0;
          const active = selected === state;
          return (
            <path
              key={state}
              d={d}
              role="button"
              tabIndex={0}
              aria-label={`${state}: ${value ? format(value) : 'no revenue'}`}
              aria-pressed={active}
              onClick={() => onSelect(active ? '' : state)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(active ? '' : state);
                }
              }}
              onMouseMove={(event) => {
                const box = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({ state, x: event.clientX - box.left, y: event.clientY - box.top });
              }}
              fill={fillFor(value)}
              stroke={active ? 'var(--text-primary)' : 'color-mix(in srgb, var(--swatch) 55%, var(--surface-card))'}
              strokeWidth={active ? 2.2 : 1.1}
              className={cn(
                'cursor-pointer outline-none transition-[fill,opacity] duration-150 focus-visible:stroke-[var(--text-primary)]',
                selected && !active && 'opacity-45',
                'hover:opacity-100 hover:brightness-95',
              )}
            />
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 min-w-[10rem] -translate-x-1/2 -translate-y-[115%] rounded-xl border border-hairline surface-card px-3 py-2 shadow-pop"
          style={{ left: hover.x, top: hover.y }}
        >
          <p className="text-label font-semibold text-primary">{hover.state}</p>
          <p className="tabular text-label text-secondary">
            {hovered ? format(hovered) : 'No revenue'}
            {hovered && total ? ` · ${((hovered / total) * 100).toFixed(1)}%` : ''}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-caption text-muted">
          <span>Less</span>
          <span className="h-3 w-5 rounded-sm" style={{ background: 'var(--surface-sunken)' }} />
          {STEPS.map((color) => (
            <span key={color} className="h-3 w-5 rounded-sm" style={{ background: color }} />
          ))}
          <span>More</span>
        </div>
        <p className="text-micro text-muted">
          Map: svg-maps,{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">
            CC BY 4.0
          </a>
        </p>
      </div>
    </div>
  );
}
