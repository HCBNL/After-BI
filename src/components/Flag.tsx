/**
 * Small flags drawn in SVG, so they look the same on every phone and computer
 * (emoji flags show as two letters on Windows).
 *
 *   en  United Kingdom
 *   zh  China
 *   fr  France
 */

import { useId } from 'react';
import { cn } from '@/lib/cn';
import type { Lang } from '@/lib/i18n';

function star(cx: number, cy: number, r: number, turn = 0): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.382;
    const angle = -Math.PI / 2 + turn + (i * Math.PI) / 5;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(3)},${(cy + radius * Math.sin(angle)).toFixed(3)}`);
  }
  return points.join(' ');
}

/** A small star turned to point at the big one, as on the real flag. */
function pointing(cx: number, cy: number): string {
  return star(cx, cy, 1, Math.atan2(5 - cy, 5 - cx) + Math.PI / 2);
}

function UK() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <clipPath id={`${id}t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function China() {
  return (
    <svg viewBox="0 0 30 20" className="h-full w-full">
      <rect width="30" height="20" fill="#EE1C25" />
      <g fill="#FFFF00">
        <polygon points={star(5, 5, 3)} />
        <polygon points={pointing(10, 2)} />
        <polygon points={pointing(12, 4)} />
        <polygon points={pointing(12, 7)} />
        <polygon points={pointing(10, 9)} />
      </g>
    </svg>
  );
}

function France() {
  return (
    <svg viewBox="0 0 3 2" className="h-full w-full">
      <rect width="1" height="2" fill="#002654" />
      <rect x="1" width="1" height="2" fill="#FFFFFF" />
      <rect x="2" width="1" height="2" fill="#CE1126" />
    </svg>
  );
}

export function Flag({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-[14px] w-[21px] shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.15)]', className)}
    >
      {lang === 'en' ? <UK /> : lang === 'zh' ? <China /> : <France />}
    </span>
  );
}
