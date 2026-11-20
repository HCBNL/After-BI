/**
 * Home's one picture of the business: six months of sales, as two lines.
 *
 * The blue line is what was invoiced each month, the green line how much of it
 * has been paid. The amber gap between them is what is still owed: the wider
 * the gap, the more is outstanding. Three figures above the chart double as
 * its key. Hover (or tap) a month for its numbers.
 *
 * It replaces the old brief and order trail: no paragraphs, no stops, no
 * "X is at 866% of its limit". A reader who knows the business reads the lines.
 * A laptop also gets three short chips that put the chart into words; a phone
 * gets just the chart, because a phone screen is for looking, not reading.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Clock, Percent, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { nairaShort } from '@/lib/format';
import { dateLocale } from '@/lib/locale';
import type { MonthTrend } from '@/lib/db';

const PAD = { top: 12, right: 6, bottom: 26, left: 46 };
const TIP_W = 168;

function monthName(key: string, style: 'short' | 'long' = 'short'): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(dateLocale('en-GB'), { month: style });
}

/** A round top for the axis: 1, 2 or 5 times a power of ten. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= value) return step * power;
  return 10 * power;
}

export function SalesTrend({
  trend,
  overdue,
  className,
}: {
  trend: MonthTrend[];
  overdue: number;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const totals = useMemo(() => {
    const sold = trend.reduce((s, r) => s + r.sold, 0);
    const collected = trend.reduce((s, r) => s + r.collected, 0);
    const best = trend.reduce<MonthTrend | null>((top, r) => (r.sold > (top?.sold ?? 0) ? r : top), null);
    return { sold, collected, owed: Math.max(0, sold - collected), best };
  }, [trend]);

  const height = width >= 640 ? 230 : 190;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const top = niceMax(Math.max(...trend.map((r) => r.sold), 0));
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const band = trend.length ? plotW / trend.length : 0;
  const empty = totals.sold === 0;
  const shown = active !== null ? trend[active] : null;

  return (
    <section
      data-tour="brief"
      aria-labelledby="sales-trend-title"
      className={cn('rounded-[22px] border border-hairline surface-card p-4 shadow-card sm:p-6', className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="sales-trend-title" className="text-lead font-bold tracking-[-0.01em] text-primary">
            Sales
          </h2>
          <p className="text-label text-muted">Last 6 months</p>
        </div>

        {/* The key, with the totals in it. */}
        <dl className="grid w-full grid-cols-3 gap-3 sm:w-auto sm:gap-8">
          <Figure label="Sold" value={totals.sold} swatch="var(--chart-sold)" line />
          <Figure label="Collected" value={totals.collected} swatch="var(--chart-paid)" line />
          <Figure label="Still owed" value={totals.owed} swatch="var(--chart-owed)" />
        </dl>
      </div>

      <div ref={box} className="relative mt-5" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Sales by month: sold and collected" className="block overflow-visible">
            {/* three quiet gridlines: zero, half, top */}
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(top * f)}
                  y2={y(top * f)}
                  stroke={f === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
                  strokeDasharray={f === 0 ? undefined : '3 4'}
                />
                {!empty && (
                  <text x={PAD.left - 8} y={y(top * f)} dy="0.32em" textAnchor="end" className="tabular" fontSize="11" fill="var(--chart-ink-muted)">
                    {f === 0 ? '0' : nairaShort(top * f)}
                  </text>
                )}
              </g>
            ))}

            {(() => {
              const xs = trend.map((_, i) => PAD.left + band * i + band / 2);
              const soldPts = trend.map((r, i) => [xs[i], y(r.sold)] as const);
              const paidPts = trend.map((r, i) => [xs[i], y(Math.min(r.collected, r.sold))] as const);
              const line = (pts: readonly (readonly [number, number])[]) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join('');
              /* What is still owed: the gap between the two lines, tinted. */
              const gapArea = `${line(soldPts)}${[...paidPts].reverse().map(([px, py]) => `L${px},${py}`).join('')}Z`;
              const base = PAD.top + plotH;
              const soldArea = `${line(soldPts)}L${xs[xs.length - 1]},${base}L${xs[0]},${base}Z`;
              return (
                <g>
                  <defs>
                    <linearGradient id="sales-fade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-sold)" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="var(--chart-sold)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {!empty && <path d={soldArea} fill="url(#sales-fade)" />}
                  {!empty && <path d={gapArea} fill="var(--chart-owed)" fillOpacity="0.22" />}

                  {/* crosshair on the month in focus */}
                  {active !== null && (
                    <line x1={xs[active]} x2={xs[active]} y1={PAD.top} y2={base} stroke="var(--chart-axis)" strokeDasharray="3 3" />
                  )}

                  <path d={line(paidPts)} fill="none" stroke="var(--chart-paid)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  <path d={line(soldPts)} fill="none" stroke="var(--chart-sold)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

                  {trend.map((row, i) => {
                    const on = active === i;
                    return (
                      <g key={row.month}>
                        {[
                          { cy: paidPts[i][1], color: 'var(--chart-paid)' },
                          { cy: soldPts[i][1], color: 'var(--chart-sold)' },
                        ].map((dot, k) => (
                          <circle
                            key={k}
                            cx={xs[i]}
                            cy={dot.cy}
                            r={on ? 5.5 : 3.5}
                            fill={on ? dot.color : 'var(--chart-surface)'}
                            stroke={on ? 'var(--chart-surface)' : dot.color}
                            strokeWidth={on ? 2 : 2}
                            style={{ transition: 'r 150ms' }}
                          />
                        ))}
                        <text
                          x={xs[i]}
                          y={height - 6}
                          textAnchor="middle"
                          fontSize="11.5"
                          fontWeight={on ? 700 : 500}
                          fill={on ? 'var(--chart-ink)' : 'var(--chart-ink-muted)'}
                        >
                          {monthName(row.month)}
                        </text>
                        {/* the hit target: the whole column, much bigger than the dots */}
                        <rect
                          x={PAD.left + band * i}
                          y={PAD.top}
                          width={band}
                          height={plotH + PAD.bottom}
                          fill="transparent"
                          tabIndex={0}
                          aria-label={`${monthName(row.month, 'long')}: sold ${nairaShort(row.sold)}, collected ${nairaShort(row.collected)}`}
                          onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
                          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
                          onClick={() => setActive((now) => (now === i ? null : i))}
                          /* Keyboard focus only: a tap focuses too, and its click would toggle straight back. */
                          onFocus={(e) => e.currentTarget.matches(':focus-visible') && setActive(i)}
                          onBlur={() => setActive(null)}
                          className="cursor-pointer outline-none"
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        )}

        {empty && width > 0 && (
          <p className="absolute inset-x-0 top-1/3 text-center text-label text-muted">No invoices in the last 6 months</p>
        )}

        {shown && active !== null && (
          <Tooltip
            /* Beside the point, never over it: right of it, or left when near the edge. */
            left={(() => {
              const cx = PAD.left + band * active + band / 2;
              const right = cx + 14;
              return right + TIP_W <= width ? right : Math.max(0, cx - 14 - TIP_W);
            })()}
            /* In the half of the chart away from the point, so it never sits on the lines there. */
            top={y(shown.sold) < PAD.top + plotH / 2 ? Math.max(0, PAD.top + plotH - 96) : 0}
            row={shown}
          />
        )}
      </div>

      {/* The chart in words, laptop only: three short chips, never a paragraph. */}
      {!empty && (
        <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
          <Chip icon={<Percent size={13} aria-hidden />}>
            {`${Math.round((totals.collected / totals.sold) * 100)}% collected`}
          </Chip>
          {totals.best && (
            <Chip icon={<Trophy size={13} aria-hidden />}>
              {`Best month: ${monthName(totals.best.month, 'long')}, ${nairaShort(totals.best.sold)}`}
            </Chip>
          )}
          {totals.owed > 0 && (
            <Chip icon={<Clock size={13} aria-hidden />} owed>
              {overdue > 0
                ? `${nairaShort(totals.owed)} owed, ${nairaShort(overdue)} overdue`
                : `${nairaShort(totals.owed)} owed`}
            </Chip>
          )}
        </div>
      )}
    </section>
  );
}

function Figure({ label, value, swatch, line }: { label: string; value: number; swatch?: string; line?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-caption font-semibold text-muted">
        {swatch && (
          <span
            className={line ? 'h-[3px] w-3.5 shrink-0 rounded-full' : 'h-2.5 w-2.5 shrink-0 rounded-[3px] opacity-60'}
            style={{ background: swatch }}
            aria-hidden
          />
        )}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="tabular mt-0.5 truncate text-lead font-bold text-primary sm:text-title">{nairaShort(value)}</dd>
    </div>
  );
}

function Tooltip({ left, top, row }: { left: number; top: number; row: MonthTrend }) {
  const owed = Math.max(0, row.sold - row.collected);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-[168px] rounded-2xl border border-hairline surface-raised px-3.5 py-3 shadow-pop"
      style={{ left, top }}
    >
      <p className="text-label font-bold text-primary">{monthName(row.month, 'long')}</p>
      <TipRow label="Sold" value={row.sold} swatch="var(--chart-sold)" />
      <TipRow label="Collected" value={row.collected} swatch="var(--chart-paid)" />
      <TipRow label="Still owed" value={owed} swatch="var(--chart-owed)" />
    </div>
  );
}

function TipRow({ label, value, swatch }: { label: string; value: number; swatch?: string }) {
  return (
    <p className="mt-1 flex items-center justify-between gap-3 text-caption">
      <span className="flex items-center gap-1.5 text-secondary">
        {swatch && <span className="h-2 w-2 rounded-[2px]" style={{ background: swatch }} aria-hidden />}
        {label}
      </span>
      <span className="tabular font-semibold text-primary">{nairaShort(value)}</span>
    </p>
  );
}

function Chip({ icon, owed, children }: { icon: ReactNode; owed?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label font-semibold',
        /* Owed is pending, and pending is red: red on black, so it is the first thing seen. */
        owed ? 'bg-[#111214] text-[#ff5a52] ring-1 ring-white/10 dark:bg-black' : 'surface-sunken text-secondary',
      )}
    >
      {icon}
      {children}
    </span>
  );
}
