/**
 * The school's plan, as a seal beside its name.
 *
 * WHAT IT IS FOR
 *
 * A school on the platform has a plan, and until now the only place that fact
 * appeared was the platform owner's pricing screen. The school itself could
 * not see it, and a school that cannot see what it is paying for has no reason
 * to feel it is getting anything. This is the smallest honest way to show it:
 * one mark, beside the school's own name, on the screen everybody opens first.
 *
 * WHY A SEAL AND NOT A WORD
 *
 * "Group plan" written next to a school's name reads as an invoice. A seal
 * reads as standing — the same reason every social network eventually draws
 * one — and it takes a fraction of the room on a phone, which is where this
 * header is tightest. The plan's name is on the tooltip and the accessible
 * label for anybody who wants the detail.
 *
 * WHAT IT IS NOT
 *
 * It is not a claim about the school. It says which plan they are on and
 * nothing else — not that they are endorsed, inspected or approved by anybody
 * — which is why the label reads "Group plan" rather than "Verified".
 *
 * THE SHAPE
 *
 * A solid middle with twelve lobes around it, drawn as thirteen circles rather
 * than as one scalloped path. The path version is a dozen Bézier curves whose
 * control points overshoot the box and have to be tuned by eye at every size;
 * the union of circles is exact arithmetic, renders identically at 14px and
 * 44px, and anybody can see what it is doing.
 */

import { cn } from '@/lib/cn';
import type { Tier } from '@/lib/plans';

/**
 * Which seal a tier gets.
 *
 * Keyed by tier (`src/lib/plans.ts`), not by plan id, so a plan the owner
 * renames or adds still gets the seal of the tier it belongs to. The colours
 * are the ones the three original plans had: slate for Starter, the brand red
 * for Standard, the blue of a verified mark for Premium.
 */
const SEALS: Record<Tier, { label: string; fill: string; ring: string }> = {
  starter: {
    label: 'Starter plan',
    /* Slate, and deliberately quiet: the entry plan is a real plan, not a
       lesser one, but it is not the one to dress up. */
    fill: '#3f4854',
    ring: 'rgba(255,255,255,0.22)',
  },
  standard: {
    label: 'Standard plan',
    fill: '#d81e2b',
    ring: 'rgba(255,255,255,0.28)',
  },
  premium: {
    label: 'Premium plan',
    fill: '#1d7ef0',
    ring: 'rgba(255,255,255,0.32)',
  },
};

/** The lobes, at twelve o'clock and every hour after it. Generated, not typed. */
const LOBES = [
  [20.31, 14.23], [18.08, 18.08], [14.23, 20.31], [9.77, 20.31],
  [5.92, 18.08], [3.69, 14.23], [3.69, 9.77], [5.92, 5.92],
  [9.77, 3.69], [14.23, 3.69], [18.08, 5.92], [20.31, 9.77],
] as const;

export function PlanBadge({
  tier,
  size = 18,
  className,
}: {
  tier: Tier;
  size?: number;
  className?: string;
}) {
  const seal = SEALS[tier] ?? SEALS.starter;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      role="img"
      aria-label={seal.label}
      /* The plan's name on hover, for a mouse; the aria-label for everything else. */
    >
      <title>{seal.label}</title>
      <g fill={seal.fill}>
        <circle cx="12" cy="12" r="9.2" />
        {LOBES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.3" />
        ))}
      </g>
      {/*
        The tick, drawn as a stroke rather than a filled path so its weight
        holds at every size. `round` joins because a hard corner inside a seal
        this small reads as a rendering fault.
      */}
      <path
        d="M8.2 12.3 L10.8 14.9 L15.9 9.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* A hairline so the seal separates from a ground of its own colour —
          the School seal on the red panel would otherwise disappear. */}
      <circle cx="12" cy="12" r="11.2" fill="none" stroke={seal.ring} strokeWidth="0.9" />
    </svg>
  );
}
