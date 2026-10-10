/**
 * The organisation's plan, as a verification seal beside its name.
 *
 * A badge, not a button: it does nothing when tapped. The colour says which
 * plan the organisation is on (slate Starter, orange Growth, blue Premium,
 * gold Enterprise), and the plan's name is the tooltip and accessible label.
 * The platform owner sets the plan in Platform (Organisations); every member
 * of the organisation sees the same seal.
 *
 * Drawn as one scalloped outline, twelve rounded lobes like a verified seal,
 * with the tick cut into it. One path, so it stays crisp from 12px to 48px.
 */

import { cn } from '@/lib/cn';
import { PLANS, useEntitlements, type PlanId } from '@/lib/plans';

const LOBES = 12;
const CENTRE = 12;
const VALLEY = 9.1; // where two lobes meet
const CREST = 11.9; // the outward control point: sets how round each lobe is

const at = (radius: number, angle: number) =>
  `${(CENTRE + radius * Math.cos(angle)).toFixed(3)} ${(CENTRE + radius * Math.sin(angle)).toFixed(3)}`;

/* One closed path: a valley, then a curved lobe out to the next valley, twelve times. */
const SEAL_PATH = (() => {
  const step = (Math.PI * 2) / LOBES;
  let d = `M ${at(VALLEY, -Math.PI / 2)}`;
  for (let i = 0; i < LOBES; i++) {
    const start = -Math.PI / 2 + i * step;
    d += ` Q ${at(CREST, start + step / 2)} ${at(VALLEY, start + step)}`;
  }
  return `${d} Z`;
})();

export function PlanBadge({ plan, size = 18, className }: { plan: PlanId; size?: number; className?: string }) {
  const seal = PLANS[plan];
  const label = `${seal.label} plan`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn('inline-block shrink-0', className)} role="img" aria-label={label}>
      <title>{label}</title>
      <path d={SEAL_PATH} fill={seal.fill} stroke={seal.fill} strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M8.2 12.3 L10.8 14.9 L15.9 9.5" fill="none" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The signed-in organisation's seal, or nothing when no plan is set. */
export function OrgPlanBadge({ size, className }: { size?: number; className?: string }) {
  const { plan } = useEntitlements();
  return plan ? <PlanBadge plan={plan} size={size} className={className} /> : null;
}

/** The seal with the plan's name beside it, for a profile or company page. */
export function PlanPill({ plan, className }: { plan: PlanId; className?: string }) {
  const seal = PLANS[plan];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[11.5px] font-bold text-primary', className)}
      style={{ background: `${seal.fill}24` }}
    >
      <PlanBadge plan={plan} size={18} />
      {seal.label}
    </span>
  );
}
