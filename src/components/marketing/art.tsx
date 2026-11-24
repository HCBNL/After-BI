/**
 * The owner's own artwork: seventeen shapes, drawn in code.
 *
 * Every shape here is the owner's (the Contoric art set), kept to his exact
 * geometry on a 100 × 100 box. They are inline SVG rather than image files so
 * they cost nothing to load and can be coloured and moved by CSS.
 *
 * HOW THEY BEHAVE (the house style, see `.art-*` in index.css)
 *
 *   colour   the main colour walks through the palette, holding each for
 *            about seven and a half seconds: blue, pink, gold, soft blue, pink
 *            blue. `shift` starts a shape at a different point of the walk so
 *            two shapes side by side are never the same colour.
 *   motion   spin (a slow fan), spin back, float, sway, twinkle, orbit (the
 *            satellite goes round), rise (blocks and dots in turn), draw (a
 *            line drawing itself again).
 *
 * Nothing moves for a visitor who has asked for less motion.
 */

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ArtName =
  | 'bloom'
  | 'fourfold'
  | 'pinwheel'
  | 'daisy'
  | 'dots'
  | 'kite'
  | 'droplet'
  | 'loop'
  | 'ripple'
  | 'leaf'
  | 'blocks'
  | 'spark'
  | 'waves'
  | 'orbit'
  | 'ribbon'
  | 'petals'
  | 'cloud';

export type ArtMotion = 'spin' | 'spin-back' | 'float' | 'sway' | 'twinkle' | 'orbit' | 'rise' | 'draw' | 'none';

/* Each shape's natural way of moving, when the caller does not choose. */
const NATURAL: Record<ArtName, ArtMotion> = {
  bloom: 'spin',
  fourfold: 'spin-back',
  pinwheel: 'spin',
  daisy: 'spin',
  dots: 'rise',
  kite: 'float',
  droplet: 'float',
  loop: 'draw',
  ripple: 'draw',
  leaf: 'sway',
  blocks: 'rise',
  spark: 'twinkle',
  waves: 'float',
  orbit: 'orbit',
  ribbon: 'draw',
  petals: 'sway',
  cloud: 'float',
};

/** `a` is the walking colour; `b` a second walking colour a step behind; `c` the fixed centre. */
function shape(name: ArtName): ReactNode {
  switch (name) {
    case 'bloom':
      return (
        <>
          <g className="art-a">
            {[0, 90, 180, 270].map((r) => (
              <ellipse key={r} cx="50" cy="27" rx="18" ry="25" transform={`rotate(${r} 50 50)`} />
            ))}
          </g>
          <circle cx="50" cy="50" r="7" className="art-ink" />
        </>
      );
    case 'fourfold':
      return (
        <g className="art-a">
          {[0, 90, 180, 270].map((r) => (
            <path key={r} d="M50 50 Q25 20 50 10 Q75 20 50 50 Z" transform={`rotate(${r} 50 50)`} />
          ))}
        </g>
      );
    case 'pinwheel':
      return (
        <g className="art-a">
          {[0, 90, 180, 270].map((r) => (
            <path key={r} d="M50 50 L50 8 Q85 9 83 42 Z" transform={`rotate(${r} 50 50)`} />
          ))}
        </g>
      );
    case 'daisy':
      return (
        <>
          <g className="art-a">
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <ellipse key={r} cx="50" cy="28" rx="13" ry="23" transform={`rotate(${r} 50 50)`} />
            ))}
          </g>
          <circle cx="50" cy="50" r="10" className="art-b" />
        </>
      );
    case 'dots':
      return (
        <g className="art-a">
          {[
            [20, 5],
            [40, 8],
            [60, 11],
            [80, 14],
          ].map(([cx, r], i) => (
            <circle key={cx} cx={cx} cy="50" r={r} className="art-step" style={{ ['--i' as string]: i }} />
          ))}
        </g>
      );
    case 'kite':
      return (
        <>
          <path d="M50 13 L83 44 L50 87 L17 44 Z" className="art-a" />
          <path d="M50 13 V87 M17 44 H83" fill="none" stroke="#fff" strokeWidth="3" />
        </>
      );
    case 'droplet':
      return <path d="M50 8 C70 30 88 43 88 62 A38 38 0 0 1 12 62 C12 43 30 30 50 8 Z" className="art-a" />;
    case 'loop':
      return (
        <path
          d="M50 12 C85 14 88 48 50 50 C12 52 15 86 50 88 C85 86 88 52 50 50"
          className="art-stroke art-line"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
          pathLength={100}
        />
      );
    case 'ripple':
      return (
        <path d="M12 50 C24 12 38 88 50 50 S76 12 88 50" className="art-stroke art-line" strokeWidth="10" fill="none" strokeLinecap="round" pathLength={100} />
      );
    case 'leaf':
      return (
        <>
          <path d="M50 88 C-5 65 18 20 82 12 C88 58 77 83 50 88 Z" className="art-a" />
          <path d="M29 73 Q50 49 70 32" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case 'blocks':
      return (
        <g className="art-a">
          {[
            [14, 48],
            [36, 30],
            [58, 12],
          ].map(([x, y], i) => (
            <rect key={x} x={x} y={y} width="28" height="28" rx="4" className="art-step" style={{ ['--i' as string]: i }} />
          ))}
        </g>
      );
    case 'spark':
      return (
        <path
          className="art-a"
          fillRule="evenodd"
          d="M50 6 L61 38 L94 50 L61 61 L50 94 L39 61 L6 50 L39 38 Z M59 50 A9 9 0 1 0 41 50 A9 9 0 1 0 59 50 Z"
        />
      );
    case 'waves':
      return (
        <>
          <path d="M12 12 C47 12 47 46 12 46 Z" className="art-a" />
          <path d="M12 12 C47 12 47 46 12 46 Z" transform="translate(25 14)" className="art-b" />
          <path d="M12 12 C47 12 47 46 12 46 Z" transform="translate(50 28)" className="art-c" />
        </>
      );
    case 'orbit':
      return (
        <>
          <circle cx="50" cy="50" r="29" fill="none" strokeWidth="10" className="art-stroke" />
          <circle cx="50" cy="50" r="12" className="art-b" />
          <g className="art-satellite">
            <circle cx="77" cy="19" r="8" className="art-c" />
          </g>
        </>
      );
    case 'ribbon':
      return (
        <>
          <path d="M10 60 Q30 10 50 50 T90 35" strokeWidth="9" fill="none" strokeLinecap="round" className="art-stroke art-line" pathLength={100} />
          <circle cx="90" cy="35" r="8" className="art-b" />
        </>
      );
    case 'petals':
      return (
        <g className="art-a">
          {[12, 39, 66].map((x, i) => (
            <path key={x} d="M0 0 Q46 18 0 36 Z" transform={`translate(${x} 30)`} className="art-step" style={{ ['--i' as string]: i }} />
          ))}
        </g>
      );
    case 'cloud':
      return (
        <path
          d="M12 58 C-2 40 19 24 34 34 C38 6 70 10 72 34 C98 28 104 60 83 68 C82 91 48 94 42 76 C22 91 4 78 12 58Z"
          fill="#fff"
          strokeWidth="3"
          strokeLinejoin="round"
          className="art-stroke"
        />
      );
  }
}

export function Art({
  name,
  motion,
  shift = 0,
  speed = 1,
  className,
  style,
}: {
  name: ArtName;
  /** How it moves; each shape has its own natural motion. */
  motion?: ArtMotion;
  /** Where in the colour walk it starts, 0 to 4. */
  shift?: number;
  /** Slower than 1 is calmer, for the very large pieces. */
  speed?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const move = motion ?? NATURAL[name];
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      focusable="false"
      className={cn('art', `art-${move}`, className)}
      style={{ ['--shift' as string]: shift, ['--speed' as string]: speed, ...style }}
    >
      {shape(name)}
    </svg>
  );
}

/** Text running round a circle, turning: the badge in the trust strip. */
export function SpinBadge({ text, children, className }: { text: string; children?: ReactNode; className?: string }) {
  return (
    <span aria-hidden className={cn('relative inline-flex items-center justify-center', className)}>
      <svg viewBox="0 0 120 120" className="art-spin absolute inset-0 h-full w-full" style={{ ['--speed' as string]: 0.8 }}>
        <defs>
          <path id="art-badge-ring" d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" />
        </defs>
        <text className="fill-navy-900 text-[10.5px] font-semibold uppercase tracking-[0.32em]">
          {/* Stretched to the ring exactly, so the end meets the start with no overlap. */}
          <textPath href="#art-badge-ring" textLength="286" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="relative flex h-[46%] w-[46%] items-center justify-center rounded-full bg-navy-900">{children}</span>
    </span>
  );
}
