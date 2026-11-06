/**
 * The finance screens' building blocks, on one colour rule: 60 / 30 / 10.
 *
 *   60  the quiet surface: page and cards (white in light, navy in dark)
 *   30  the ink: titles, figures and the dark buttons (the theme's deep shade)
 *   10  one bright card per screen in the organisation's own colour
 *       (`--swatch`), kept for the figure that needs action: what is owed
 *
 * Everything sizes itself with utility classes and inline styles, so a card
 * still draws correctly before the stylesheet has caught up.
 */

import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/* the 60: a quiet card */

export function QuietCard({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('surface-card relative overflow-hidden rounded-3xl border border-hairline p-5 shadow-card sm:p-6', className)}>{children}</section>;
}

/** Icon chip and title, with something on the right (a chip, a figure, a button). */
export function CardHead({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-secondary">{icon}</span>
      <h3 className="min-w-0 flex-1 truncate text-lead font-semibold text-primary">{title}</h3>
      {right}
    </div>
  );
}

/** A small outlined pill, like a period or a count. */
export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('tabular inline-flex items-center gap-1 rounded-full border border-hairline px-3 py-1 text-caption font-semibold text-secondary', className)}>
      {children}
    </span>
  );
}

/** Up or down against the previous period; nothing when there is nothing to compare. */
export function Change({ value, label, onAccent = false }: { value: number | null; label: string; onAccent?: boolean }) {
  if (value === null) return <span className={cn('text-caption', onAccent ? 'opacity-75' : 'text-muted')}>Nothing to compare with {label}</span>;
  const up = value >= 0;
  return (
    <span className="inline-flex items-center gap-1.5 text-caption">
      <span
        className={cn(
          'tabular rounded-full px-2 py-0.5 font-semibold',
          onAccent ? 'bg-white/90 text-[color:var(--hero)]' : up ? 'bg-status-good/12 text-status-good' : 'bg-status-critical/12 text-status-critical',
        )}
      >
        {up ? '+' : ''}
        {value}%
      </span>
      <span className={onAccent ? 'opacity-80' : 'text-muted'}>vs {label}</span>
    </span>
  );
}

/* the 30: dark buttons */

export function InkLink({ to, icon, children }: { to: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-label font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      style={{ backgroundColor: 'var(--hero)' }}
    >
      {icon}
      {children}
    </Link>
  );
}

export function OutlineLink({ to, icon, children }: { to: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-label font-semibold text-primary transition-colors hover:bg-[var(--surface-sunken)]"
    >
      {icon}
      {children}
    </Link>
  );
}

/** The round accent button in the corner of the main card. */
export function AccentArrow({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-sm transition-transform hover:-translate-y-0.5 sm:h-16 sm:w-16"
      style={{ backgroundColor: 'var(--swatch)', color: 'var(--swatch-ink)' }}
    >
      <ArrowUpRight size={26} strokeWidth={1.8} aria-hidden />
    </Link>
  );
}

/* the 10: the one bright card */

function Bars({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="176" height="176" fill="currentColor" aria-hidden focusable="false" className={className}>
      <rect x="2" y="18" width="5.5" height="12" rx="2" />
      <rect x="10" y="13" width="5.5" height="17" rx="2" />
      <rect x="18" y="8" width="5.5" height="22" rx="2" />
      <rect x="26" y="2" width="4" height="28" rx="2" opacity="0.55" />
    </svg>
  );
}

export function AccentCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn('relative isolate overflow-hidden rounded-3xl p-5 shadow-card sm:p-6', className)}
      style={{ backgroundColor: 'var(--swatch)', color: 'var(--swatch-ink)' }}
    >
      {/* The AfterBI bars, faint, in the card's own ink. */}
      <Bars className="pointer-events-none absolute -right-6 -top-4 -z-10 h-44 w-44 rotate-6 opacity-[0.13]" />
      {children}
    </section>
  );
}

/** A dark label pill on the bright card. */
export function AccentBadge({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full py-1 pl-3.5 pr-1 text-micro font-semibold uppercase tracking-[0.08em] text-white" style={{ backgroundColor: 'var(--hero)' }}>
      {children}
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">{icon}</span>
    </span>
  );
}

/** A glassy box inside the bright card. */
export function AccentTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'color-mix(in srgb, var(--swatch-ink) 12%, transparent)' }}>
      <p className="text-caption font-medium opacity-80">{label}</p>
      <p className="tabular mt-1 text-title font-bold">{value}</p>
      {hint && <p className="text-caption opacity-75">{hint}</p>}
    </div>
  );
}

/* charts, drawn plainly */

/**
 * A ring in segments, like a gauge. `parts` are drawn clockwise from the top
 * in the order given; the rest of the ring is the quiet track.
 */
export function Ring({
  parts,
  total,
  size = 168,
  stroke = 16,
  children,
}: {
  parts: { value: number; color: string; label: string }[];
  total: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 0 ? 6 : 0;
  let offset = 0;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={parts.map((p) => p.label).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={stroke} />
        {total > 0 &&
          parts.map((p) => {
            const len = Math.max(0, (p.value / total) * c - (p.value > 0 ? gap : 0));
            const el = (
              <circle
                key={p.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={p.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${len} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += (p.value / total) * c;
            return p.value > 0 ? el : null;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** A labelled bar: the quiet track, the accent fill, an optional pill on the fill. */
export function MeterRow({ label, value, share, strong = false, pill }: { label: string; value: string; share: number; strong?: boolean; pill?: string }) {
  const width = Math.max(share > 0 ? 3 : 0, Math.min(100, share));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-label">
        <span className={strong ? 'font-semibold text-primary' : 'text-secondary'}>{label}</span>
        <span className={cn('tabular', strong ? 'font-semibold text-primary' : 'text-muted')}>{value}</span>
      </div>
      <div className="relative h-2.5 rounded-full surface-sunken">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${width}%`, backgroundColor: strong ? 'var(--swatch)' : 'color-mix(in srgb, var(--text-muted) 45%, transparent)' }}
        />
        {pill && share > 0 && (
          <span
            className="tabular absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-micro font-semibold text-white"
            style={{ left: `${Math.min(92, Math.max(8, width))}%`, backgroundColor: 'var(--hero)' }}
          >
            {pill}
          </span>
        )}
      </div>
    </div>
  );
}
