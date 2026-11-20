/**
 * The brand signature, as scenery.
 *
 * Four rising bars, a bar chart and a signal-strength meter at once, which is
 * this whole product in a shape: what you sold, and how well it is going.
 * Drawn enormous and at a twentieth of the surface's contrast behind the
 * panels, the sign-in screen and the sheets, the way a bank lets its own shape
 * sit behind the balance.
 *
 * WHY THIS IS SCENERY AND NOT THE LOGO
 *
 * The logo is the wordmark, "AfterBI.", and only the wordmark, see
 * `brand/Wordmark.tsx`. This is the signature underneath it: an abstract shape
 * the brand owns, which is a different job. The distinction matters in
 * practice, because an abstract shape crops beautifully (half a bar at the
 * edge of a panel still reads as a bar) and a word does not, half a word
 * reads as text that has gone wrong. That is exactly why the wordmark was
 * tried here and taken out again.
 *
 * It paints in `currentColor` and carries none of the mark's old four colours:
 * a signature is one shape in one tint, and a full-colour logo tiled across a
 * background is a logo somebody has misused.
 */

import type { CSSProperties } from 'react';

/*
 * NOW: THE OWNER'S PETALS, NOT THE BARS.
 *
 * The name stays (twenty places call it), but what it draws changed: one of
 * the owner's flower shapes, in currentColor, turning very slowly, the same
 * scenery as the PIN lock screen. Which flower is chosen from the class it is
 * given, so the two corners of one panel never show the same shape.
 */
const PETAL_SHAPES = ['fourfold', 'daisy', 'scallop', 'bloom'] as const;

function pickShape(seed: string): (typeof PETAL_SHAPES)[number] {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PETAL_SHAPES[h % PETAL_SHAPES.length];
}

export function PetalShape({ shape }: { shape: (typeof PETAL_SHAPES)[number] }) {
  switch (shape) {
    case 'fourfold':
      return (
        <>
          {[0, 90, 180, 270].map((r) => (
            <path key={r} d="M50 50 Q22 18 50 4 Q78 18 50 50 Z" transform={`rotate(${r} 50 50)`} />
          ))}
        </>
      );
    case 'daisy':
      return (
        <>
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="50" cy="26" rx="14" ry="24" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="22" />
        </>
      );
    case 'scallop':
      return (
        <>
          <circle cx="50" cy="50" r="36" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={i} cx={50 + 33 * Math.cos(a)} cy={50 + 33 * Math.sin(a)} r="15" />;
          })}
        </>
      );
    default:
      return (
        <>
          {[0, 90, 180, 270].map((r) => (
            <ellipse key={r} cx="50" cy="27" rx="18" ry="25" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="22" />
        </>
      );
  }
}

export function BrandBars({
  className,
  style,
  shape,
}: {
  className?: string;
  style?: CSSProperties;
  shape?: (typeof PETAL_SHAPES)[number];
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="currentColor" aria-hidden focusable="false">
      <g className="petal-turn">
        <PetalShape shape={shape ?? pickShape(className ?? '')} />
      </g>
    </svg>
  );
}
