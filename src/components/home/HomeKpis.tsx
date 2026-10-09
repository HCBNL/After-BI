/**
 * The shape of one headline figure on a home screen: the number, what it
 * means, and where to go from it. Drawn by `HomeSlides`.
 */

import type { ReactNode } from 'react';

export interface Kpi {
  key: string;
  /** The small line above the number. */
  label: string;
  /** The number itself, already formatted. */
  value: string;
  /** One short line under it, saying what the number is. */
  caption: string;
  /** The primary action. */
  action?: { label: string; to: string };
  /** A second, quieter action. */
  secondary?: { label: string; to: string };
  icon?: ReactNode;
  /** Fills the bar underneath. Omit for a card with no proportion to show. */
  progress?: number;
  tone?: 'brand' | 'good' | 'warning';
}
