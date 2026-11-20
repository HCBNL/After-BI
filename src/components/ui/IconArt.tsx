/**
 * An icon set inside a piece of artwork, never in a plain circle or square.
 *
 * The way a banking app badges its savings plans: a scalloped flower, a bloom,
 * a pinwheel, in a vivid colour, the icon white in the middle. The shapes are
 * the owner's own (lib: components/marketing/art.tsx and /topics/contoric-art)
 * plus the scalloped flower, drawn on the same 100 × 100 box.
 *
 *   variant  color   the shape in a vivid colour, white icon (lists, grids)
 *            glass   the shape in translucent white (on a coloured panel)
 *            soft    the shape in the sunken grey, muted icon (a quiet rail)
 *
 * The shape turns a little when its row or tile is hovered (`group`), the icon
 * stays upright. Colour and shape are picked from `id` so the same screen
 * always wears the same badge everywhere it appears.
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ArtShape = 'scallop' | 'bloom' | 'daisy' | 'pinwheel' | 'fourfold' | 'trefoil' | 'fivefold';
export type ArtTone = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'gold' | 'sky' | 'teal';

/* Vivid and thick: the bright part of each colour, deep enough for white on it. */
const TONES: Record<ArtTone, { fill: string; ink: string }> = {
  blue: { fill: '#1d4ef5', ink: '#ffffff' },
  green: { fill: '#0b9f55', ink: '#ffffff' },
  orange: { fill: '#f0581a', ink: '#ffffff' },
  purple: { fill: '#7a36f0', ink: '#ffffff' },
  pink: { fill: '#e23d78', ink: '#ffffff' },
  gold: { fill: '#f5a30a', ink: '#3a2600' },
  sky: { fill: '#1593ee', ink: '#ffffff' },
  teal: { fill: '#079a8c', ink: '#ffffff' },
};
const TONE_ORDER: ArtTone[] = ['blue', 'green', 'orange', 'purple', 'sky', 'pink', 'teal', 'gold'];
const SHAPE_ORDER: ArtShape[] = ['scallop', 'bloom', 'scallop', 'daisy', 'scallop', 'pinwheel', 'scallop', 'fourfold'];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

export function toneFor(id: string): ArtTone {
  return TONE_ORDER[hash(id) % TONE_ORDER.length];
}

/*
 * The home menu's own set: every shape in the artwork, mixed, but all in ONE
 * colour, a lighter tint of whatever theme colour is chosen (variant "tint"),
 * with a faint white edge. One colour family is what keeps it calm and
 * professional; the mix of shapes is the touch of beauty.
 */
const MENU_SHAPES: ArtShape[] = ['scallop', 'bloom', 'pinwheel', 'daisy', 'fourfold', 'trefoil', 'fivefold'];

export function menuShape(id: string): ArtShape {
  return MENU_SHAPES[(hash(id) >>> 4) % MENU_SHAPES.length];
}

export function shapeFor(id: string): ArtShape {
  return SHAPE_ORDER[(hash(id) >>> 3) % SHAPE_ORDER.length];
}

/* The scalloped flower: a disc with eight round bumps. */
const SCALLOP = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { cx: 50 + 33 * Math.cos(a), cy: 50 + 33 * Math.sin(a) };
});

function Shape({ shape }: { shape: ArtShape }) {
  switch (shape) {
    case 'scallop':
      return (
        <>
          <circle cx="50" cy="50" r="36" />
          {SCALLOP.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r="15" />
          ))}
        </>
      );
    case 'bloom':
      return (
        <>
          {[0, 90, 180, 270].map((r) => (
            <ellipse key={r} cx="50" cy="27" rx="18" ry="25" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="22" />
        </>
      );
    case 'daisy':
      return (
        <>
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="50" cy="28" rx="13" ry="23" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="24" />
        </>
      );
    case 'pinwheel':
      return (
        <>
          {[0, 90, 180, 270].map((r) => (
            <path key={r} d="M50 50 L50 8 Q85 9 83 42 Z" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="24" />
        </>
      );
    case 'trefoil':
      return (
        <>
          {[0, 120, 240].map((r) => (
            <ellipse key={r} cx="50" cy="27" rx="21" ry="26" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="25" />
        </>
      );
    case 'fivefold':
      return (
        <>
          {[0, 72, 144, 216, 288].map((r) => (
            <path key={r} d="M50 50 Q27 24 50 6 Q73 24 50 50 Z" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="24" />
        </>
      );
    case 'fourfold':
      return (
        <>
          {[0, 90, 180, 270].map((r) => (
            <path key={r} d="M50 50 Q25 20 50 10 Q75 20 50 50 Z" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="24" />
        </>
      );
  }
}

export function IconArt({
  icon: Icon,
  children,
  id = '',
  size = 40,
  variant = 'color',
  tone,
  shape,
  spin = false,
  halo = false,
  className,
}: {
  /** A Lucide icon component, or pass the icon as `children`. */
  icon?: LucideIcon;
  children?: ReactNode;
  /** What this badge stands for: picks its colour and shape, the same everywhere. */
  id?: string;
  /** Pixels across. */
  size?: number;
  /** `tint`: a lighter shade of the theme colour (the panel's own), white icon. */
  variant?: 'color' | 'glass' | 'soft' | 'tint';
  tone?: ArtTone;
  shape?: ArtShape;
  /** The artwork turns slowly, all the time. Off unless asked for. */
  spin?: boolean;
  /**
   * A white edge around the artwork, the same shape a little larger behind it,
   * so a vivid badge stands out on any background: green, blue, gold or a
   * custom brand colour that happens to match the badge's own. A number is
   * the edge's opacity: a faint edge, just enough to separate shape and panel.
   */
  halo?: boolean | number;
  className?: string;
}) {
  const t = TONES[tone ?? toneFor(id)];
  const s = shape ?? shapeFor(id);
  const fill =
    variant === 'color'
      ? t.fill
      : variant === 'tint'
        ? 'color-mix(in oklab, var(--hero) 68%, #ffffff)'
        : variant === 'glass'
          ? 'rgba(255,255,255,0.16)'
          : 'var(--surface-sunken)';
  const ink = variant === 'color' ? t.ink : variant === 'glass' || variant === 'tint' ? '#ffffff' : 'var(--text-secondary)';
  const glyph = Math.round(size * 0.42);
  return (
    <span
      aria-hidden
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size, color: ink }}
    >
      {/* Each badge starts at its own point in the turn, so a grid never moves in step. */}
      <span
        className={cn('absolute inset-0', spin && 'art-petal-spin')}
        style={spin ? { animationDelay: `-${hash(id + s) % 28}s` } : undefined}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:rotate-[30deg]"
          fill={fill}
          overflow="visible"
        >
          {halo && (
            <g
              fill="#ffffff"
              fillOpacity={typeof halo === 'number' ? halo : 1}
              transform={`translate(50 50) scale(${typeof halo === 'number' ? 1.09 : 1.14}) translate(-50 -50)`}
            >
              <Shape shape={s} />
            </g>
          )}
          <Shape shape={s} />
        </svg>
      </span>
      <span className="relative flex items-center justify-center">
        {Icon ? <Icon size={glyph} strokeWidth={2} /> : children}
      </span>
    </span>
  );
}
