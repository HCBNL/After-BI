/**
 * Who signs a stock adjustment.
 *
 * TWO SIDES, BOTH NEEDED
 *
 * A stock adjustment changes what the company says it owns, so it needs the
 * person answerable for the money AND the person answerable for the goods:
 *
 *   finance      any finance manager
 *   operations   any operations manager
 *
 * If the organisation has nobody in one of those roles, the super admin signs
 * for that side, the same way the super admin signs orders when no approver
 * is set. Nobody signs their own request; the one exception is a super admin
 * who runs the company alone, who would otherwise never be able to correct a
 * count at all.
 *
 * One person signs one side. They sign the other side too only when nobody
 * else on the books can.
 */

import type { AdjustmentSide, Role, StockAdjustment, UserProfile } from '@/types';

export const SIDES: AdjustmentSide[] = ['operations', 'finance'];

export const SIDE_LABEL: Record<AdjustmentSide, string> = {
  operations: 'Operations',
  finance: 'Finance',
};

const SIDE_ROLE: Record<AdjustmentSide, Role> = {
  operations: 'operations_manager',
  finance: 'finance_manager',
};

/** May raise an adjustment request. Mirrors the rule on `stockAdjustments`. */
export const ADJUSTMENT_RAISERS: Role[] = ['super_admin', 'admin', 'operations_manager', 'warehouse_manager'];

/** May sign one. Mirrors the rule on `stockAdjustments`. */
export const ADJUSTMENT_SIGNERS: Role[] = ['super_admin', 'finance_manager', 'operations_manager'];

type Member = Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role'> & { active?: boolean };

const nameOf = (m: Member) => `${m.firstName} ${m.lastName}`.trim();

/** The people who may sign each side of a request raised by `raiserId`. */
export function pickSigners(members: Member[], raiserId: string): Record<AdjustmentSide, { uid: string; name: string }[]> {
  const live = members.filter((m) => m.active !== false);
  const others = live.filter((m) => m.id !== raiserId);
  const supers = others.filter((m) => m.role === 'super_admin');
  const raiser = live.find((m) => m.id === raiserId);
  const out = {} as Record<AdjustmentSide, { uid: string; name: string }[]>;
  for (const side of SIDES) {
    let chosen = others.filter((m) => m.role === SIDE_ROLE[side]);
    if (!chosen.length) chosen = supers;
    if (!chosen.length && raiser?.role === 'super_admin') chosen = [raiser];
    out[side] = chosen.slice(0, 25).map((m) => ({ uid: m.id, name: nameOf(m) }));
  }
  return out;
}

/**
 * The sides `uid` signs if they press Approve now: one side, plus the other
 * only when nobody else is listed for it. Empty when they cannot sign.
 */
export function sidesToSign(adj: Pick<StockAdjustment, 'status' | 'signers' | 'signatures'>, uid: string, role?: Role): AdjustmentSide[] {
  if (adj.status !== 'pending') return [];
  const signedByMe = SIDES.filter((s) => adj.signatures?.[s]?.uid === uid);
  const open = SIDES.filter((s) => !adj.signatures?.[s] && (adj.signers?.[s] ?? []).some((x) => x.uid === uid));
  if (!open.length) return [];
  const alone = (side: AdjustmentSide) => !(adj.signers?.[side] ?? []).some((x) => x.uid !== uid);
  /* Already signed one side: the other only if nobody else can. */
  if (signedByMe.length) return open.filter(alone);
  /* Their own role's side first. */
  const mine = open.find((s) => SIDE_ROLE[s] === role) ?? open[0];
  return [mine, ...open.filter((s) => s !== mine && alone(s))];
}

/** "Waiting for Finance (Ada Obi or Tunde Bello)". */
export function waitingLine(adj: Pick<StockAdjustment, 'signers' | 'signatures'>): string {
  const parts = SIDES.filter((s) => !adj.signatures?.[s]).map((s) => {
    const names = (adj.signers?.[s] ?? []).map((x) => x.name).filter(Boolean);
    return names.length ? `${SIDE_LABEL[s]} (${names.slice(0, 3).join(' or ')}${names.length > 3 ? ' or another' : ''})` : SIDE_LABEL[s];
  });
  return parts.length ? `Waiting for ${parts.join(' and ')}` : 'Both sides signed';
}
