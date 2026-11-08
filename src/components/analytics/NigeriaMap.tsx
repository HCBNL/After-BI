/**
 * Nigeria, state by state, shaded by revenue. Click a state to filter.
 *
 * Inline SVG, no map library: 37 paths, one fill each. A state that sold
 * nothing is drawn in the neutral surface colour; the rest are filled in the
 * theme colour, denser the more they sold relative to everywhere else.
 *
 * Desktop only. On a phone the outlines are too small to tap with any
 * accuracy, so the screen shows the ranked list of states instead.
 *
 * WHY THE BORDER IS DRAWN THE WAY IT IS
 *
 * The 37 paths do not share a single edge. Not "mostly" — checking all 5,743
 * of them finds zero that appear in two states: every state in this dataset
 * was traced on its own, so a border between two states exists twice, as two
 * lines a fraction of a unit apart.
 *
 * Stroke each state and you therefore draw every internal border twice, and
 * at any stroke worth seeing the two copies separate into a visible double
 * line, which is what was on screen. So the border is drawn in two passes:
 *
 *   1. ONE path holding all 37 subpaths, filled, with a thick stroke and
 *      `paint-order: stroke`. Painting the stroke first and the fill over it
 *      means the fill covers the inner half of that stroke and every
 *      internal subpath edge with it, leaving only the outer half, which is
 *      the national outline: one bold line, no duplicates, no union geometry
 *      to compute.
 *   2. The states on top, each with a hairline border. `non-scaling-stroke`
 *      pins it to one device pixel at any size, so the two traces of a shared
 *      border land within that pixel and read as the single thin line they
 *      are meant to be.
 */
import { useMemo, useState } from 'react';
import { NIGERIA_STATES_SVG, NIGERIA_VIEWBOX } from '@/data/nigeriaMap';
import { cn } from '@/lib/cn';

/* Five shades of the theme colour, light to full, so the map follows blue, green or yellow. */
const STEPS = [
  'color-mix(in srgb, var(--swatch) 28%, var(--surface-card))',
  'color-mix(in srgb, var(--swatch) 46%, var(--surface-card))',
  'color-mix(in srgb, var(--swatch) 64%, var(--surface-card))',
  'color-mix(in srgb, var(--swatch) 82%, var(--surface-card))',
  'var(--swatch)',
];

/** A state that sold nothing: the panel, barely lifted. */
const EMPTY = 'color-mix(in srgb, var(--swatch) 7%, var(--surface-sunken))';

/**
 * Every state's outline in one path, so the national edge can be drawn once.
 *
 * The leading `m` of each state has to become an absolute `M` first. Every
 * path in the dataset opens with a *relative* moveto, which is measured from
 * the current point, and the current point at the start of a path is wherever
 * the previous one happened to stop. Concatenated as-is, each state is
 * therefore offset by the sum of every state before it: the combined path
 * measures about 10,000 units square against a 744 x 600 viewBox, so nearly
 * all of it lands outside the canvas and the outline silently draws nothing.
 *
 * Only the first moveto is rewritten, and an explicit `l` goes in behind it.
 * That `l` is not tidiness, it is the whole correctness of this line: the
 * pairs following a moveto are implicit linetos which inherit its case, so
 * turning `m` into `M` would silently turn every one of them absolute too
 * and redraw the state as a scribble near the origin. Naming the lineto
 * keeps them relative, which is what they were.
 *
 * Later `m` commands inside a state (the ones that start its islands and
 * enclaves) are relative to a point inside that same path and stay as they
 * are.
 */
const ALL_STATES_D = NIGERIA_STATES_SVG.map(({ d }) =>
  d.replace(/^\s*m\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/, 'M $1,$2 l'),
).join(' ');

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

  /**
   * Which of the five shades a state's revenue earns, relative to the rest.
   *
   * Two scales, because one does not cover both ends. Quantiles are right
   * once there are enough states to rank: they stop a single very large
   * state washing every other one out to the palest shade.
   *
   * Below that they invert and break. With one state selling, every quantile
   * break IS that state's own number, nothing is strictly greater than it,
   * and the only state on the map with revenue came out the palest of the
   * five: the whole country's sales rendered as almost nothing. Two and
   * three states selling never reached the densest shade either.
   *
   * So a handful of states are shared out against the largest instead, which
   * guarantees what a reader assumes without being told: the biggest seller
   * is the densest thing on the map.
   */
  const stepFor = useMemo(() => {
    const sorted = [...values.values()].filter((v) => v > 0).sort((a, b) => a - b);
    if (!sorted.length) return () => -1;

    if (sorted.length >= STEPS.length) {
      const breaks = [1, 2, 3, 4].map((i) => sorted[Math.floor((i * sorted.length) / STEPS.length)]);
      return (value: number) => {
        let step = 0;
        while (step < breaks.length && value >= breaks[step]) step += 1;
        return Math.min(step, STEPS.length - 1);
      };
    }

    const max = sorted[sorted.length - 1];
    return (value: number) => Math.round((value / max) * (STEPS.length - 1));
  }, [values]);

  const fillFor = (value: number) => {
    if (!value) return EMPTY;
    return STEPS[Math.max(0, Math.min(stepFor(value), STEPS.length - 1))];
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
        {/*
          Pass one: the national outline. Stroke painted first, fill over it,
          so what survives is the outer half of the stroke and nothing else.
          Every internal edge in this path is covered by its own fill. See the
          note at the top of the file.
        */}
        <path
          d={ALL_STATES_D}
          fill={EMPTY}
          stroke="color-mix(in srgb, var(--swatch) 85%, var(--surface-card))"
          /* Half of this survives the fill, so the national edge lands about
             three times the weight of a state border: bold, still crisp. */
          strokeWidth={6}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ paintOrder: 'stroke' }}
          pointerEvents="none"
        />

        {/* Pass two: the states, filled by revenue, hairline borders between. */}
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
              stroke={active ? 'var(--text-primary)' : 'color-mix(in srgb, var(--swatch) 38%, var(--surface-card))'}
              /* One device pixel, at any size: wide enough to see, narrow
                 enough that a border's two traces stay inside it. */
              strokeWidth={active ? 2.5 : 1}
              vectorEffect="non-scaling-stroke"
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
          <span className="h-3 w-5 rounded-sm ring-1 ring-[var(--border-hairline)]" style={{ background: EMPTY }} />
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
