/**
 * The Partner Programme invitation: a printable letter to someone the trade
 * already trusts, asking them to introduce AfterBI and paying a reward for
 * every business that subscribes.
 *
 * Same letterhead and print path as the proposals. The reward and payment
 * days start from Platform, Website, Partner Programme, so the letter and the
 * public Partners page say the same thing.
 */

import { naira } from './site';
import { BRAND, SITE_URL, SUPPORT_EMAIL, SALES_PHONE } from './siteMeta';
import { COMPANY, brandAsset } from './company';
import { esc, longDate, PROPOSAL_CSS } from './proposal';

export interface PartnerInput {
  /** "Mr Tunde Bakare", or empty for "Dear Partner". */
  partnerName: string;
  /** Optional line under the name: firm, association, role. */
  partnerDetail: string;
  reward: number;
  payDays: number;
  /** Optional personal line in the introduction. */
  note: string;
  date: string;
}

export function partnerReference(input: PartnerInput): string {
  const initials = input.partnerName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  return `AB-PP-${input.date.replace(/-/g, '').slice(2)}${initials ? `-${initials}` : ''}`;
}

const EXTRA = `
  .medal { display: flex; align-items: center; gap: 16px; background: #0b1410; color: #fff; border-radius: 14px; padding: 16px 18px; margin: 18px 0; }
  .medal .ring { flex: none; width: 116px; height: 116px; border-radius: 50%; border: 5px solid #10b981; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-weight: 800; font-size: 12.5pt; line-height: 1.15; }
  .medal .ring small { display: block; font-size: 7.5pt; font-weight: 600; color: #a7f3d0; }
  .steps td:first-child { width: 160px; }
  .medal p { margin: 0; color: #cbd5e1; }
  .medal b { color: #fff; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grid4 div { border: 1px solid #dfe3e8; border-radius: 8px; padding: 8px 10px; }
  .grid4 b { display: block; }
  .grid4 span { color: #5b6472; font-size: 9pt; }
`;

