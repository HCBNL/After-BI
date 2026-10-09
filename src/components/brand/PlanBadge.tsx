/**
 * The organisation's plan, as a verification seal beside its name.
 *
 * A badge, not a button: it does nothing when tapped. The colour says which
 * plan the organisation is on (slate Starter, orange Growth, blue Premium,
 * gold Enterprise), and the plan's name is the tooltip and accessible label.
 * The platform owner sets the plan in Platform (Organisations); every member
 * of the organisation sees the same seal.
 *
 * Drawn as thirteen circles (a middle and twelve lobes) rather than one
 * scalloped path, so it renders identically from 12px to 48px.
 */

import { cn } from '@/lib/cn';
import { PLANS, useEntitlements, type PlanId } from '@/lib/plans';

const LOBES = [
  [20.31, 14.23], [18.08, 18.08], [14.23, 20.31], [9.77, 20.31],
  [5.92, 18.08], [3.69, 14.23], [3.69, 9.77], [5.92, 5.92],
  [9.77, 3.69], [14.23, 3.69], [18.08, 5.92], [20.31, 9.77],
] as const;

export function PlanBadge({ plan, size = 18, className }: { plan: PlanId; size?: number; className?: string }) {
  const seal = PLANS[plan];
  const label = `${seal.label} plan`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn('inline-block shrink-0', className)} role="img" aria-label={label}>
      <title>{label}</title>
      <g fill={seal.fill}>
        <circle cx="12" cy="12" r="9.2" />
        {LOBES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.3" />
        ))}
      </g>
      <path d="M8.2 12.3 L10.8 14.9 L15.9 9.5" fill="none" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="11.2" fill="none" stroke={seal.ring} strokeWidth="0.9" />
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
