/**
 * The report's chart kit. Every chart draws itself when it comes into view,
 * then plays again every few seconds while it stays there, so the numbers
 * keep "reading out". Printing shows them finished.
 *
 *   ColumnsOnPhoto  colour columns standing on a newsprint photo, giant numerals cut at the foot
 *   Columns         tall touching columns with giant numerals at the base
 *   RankedBars      a sorted list of bars growing left to right, values counting at the tips
 *   SplitBar        one block split into two shares
 *   Seesaw          two sized circles on a tilting plank
 *   LineChart       a line (or steps) drawing itself, with a soft area
 *   Rings           a row of rings, each filling to its share
 *   HalfDonut       a half circle filling, with a picture in the hole
 *   Pictogram       a hundred icons, the share of them lit
 *   VsPairs         last time against this time, block pairs
 *   BubbleRow       circles sized by value, labels on dashed leaders
 *
 * Colour variants come from `PALETTES`; every chart also takes its own list.
 */
import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CountUp, pct, plain, useCycle, type Fmt } from "./kit";

export type Tone = "dark" | "light";

export const PALETTES = {
  vivid: [
    "var(--rp-blue)",
    "var(--rp-pink)",
    "var(--rp-green)",
    "var(--rp-purple)",
    "var(--rp-yellow)",
    "var(--rp-orange)",
    "var(--rp-sky)",
    "var(--rp-lime)",
  ],
  cool: [
    "var(--rp-brand)",
    "var(--rp-sky)",
    "var(--rp-soft)",
    "var(--rp-purple)",
    "var(--rp-lime)",
  ],
  warm: [
    "var(--rp-pink)",
    "var(--rp-orange)",
    "var(--rp-gold)",
    "var(--rp-magenta)",
    "var(--rp-yellow)",
  ],
  fresh: [
    "var(--rp-lime)",
    "var(--rp-green)",
    "var(--rp-sky)",
    "var(--rp-yellow)",
    "var(--rp-blue)",
  ],
  berry: [
    "var(--rp-purple)",
    "var(--rp-pink)",
    "var(--rp-magenta)",
    "var(--rp-soft)",
    "var(--rp-blue)",
  ],
} as const;

export interface Item {
  label: string;
  value: number;
}

const pick = (list: readonly string[], i: number) => list[i % list.length];
const ink = (tone: Tone) => (tone === "dark" ? "text-white" : "text-[#121826]");
const muted = (tone: Tone) =>
  tone === "dark" ? "text-white/70" : "text-[#121826]/65";

/* Giant numerals sized to the column they sit in. */
/** Roughly how many em wide a string is in the wide heavy numeral face. */
export function textEm(text: string): number {
  let em = 0;
  for (const ch of text)
    em += /[,.]/.test(ch)
      ? 0.34
      : ch === "%"
        ? 1.02
        : ch === "₦" || ch === "$"
          ? 0.86
          : /[a-z]/i.test(ch)
            ? 0.78
            : 0.8;
  return em;
}
function numeralSize(n: number, text: string, cap = 1): string {
  return `${Math.min(40 / n, (100 / n / Math.max(2.2, textEm(text))) * 0.9) * cap}cqw`;
}

/* ------------------------------------------------------------ columns on photo */

export function ColumnsOnPhoto({
  photo,
  alt,
  items,
  colors = PALETTES.vivid,
  format = pct,
  max,
  tone = "dark",
  ratio = "16 / 7.6",
}: {
  photo: string;
  alt: string;
  items: Item[];
  colors?: readonly string[];
  format?: Fmt;
  max?: number;
  tone?: Tone;
  ratio?: string;
}) {
  const { ref, cycle } = useCycle(9500);
  const top = max ?? Math.max(...items.map((i) => i.value)) * 1.12;
  const n = items.length;
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        className="relative overflow-hidden rounded-[4px] [container-type:inline-size]"
        style={{ aspectRatio: ratio }}
      >
        <div className="rp-halftone absolute inset-0">
          <img
            src={photo}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
        <div
          key={cycle}
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
        >
          {items.map((it, i) => (
            <div key={it.label} className="relative h-full">
              <div
                className="rp-grow-y absolute inset-x-0 bottom-0"
                style={{
                  height: `${(it.value / top) * 100}%`,
                  background: pick(colors, i),
                  mixBlendMode: "multiply",
                  ["--d" as string]: `${i * 140}ms`,
                }}
              />
              <div className="absolute inset-x-0 bottom-0 overflow-hidden">
                <p
                  className="rp-num rp-rise translate-y-[0.16em] whitespace-nowrap pl-[0.06em] text-white"
                  style={{
                    fontSize: numeralSize(n, format(it.value)),
                    ["--d" as string]: `${i * 140 + 200}ms`,
                  }}
                >
                  <CountUp
                    value={it.value}
                    format={format}
                    cycle={cycle}
                    delay={i * 140}
                  />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "mt-2 grid text-center text-[11px] font-semibold sm:text-[13px]",
          ink(tone),
        )}
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {items.map((it) => (
          <span key={it.label} className="px-1">
            {it.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ columns */

export function Columns({
  items,
  colors = PALETTES.vivid,
  format = pct,
  max,
  tone = "dark",
  height = "clamp(260px, 42vw, 440px)",
  gap = 0,
}: {
  items: Item[];
  colors?: readonly string[];
  format?: Fmt;
  max?: number;
  tone?: Tone;
  height?: string;
  gap?: number;
}) {
  const { ref, cycle } = useCycle(9000);
  const top = max ?? Math.max(...items.map((i) => i.value)) * 1.05;
  const n = items.length;
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className="grid items-end [container-type:inline-size]"
        style={{
          height,
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          columnGap: gap,
        }}
      >
        {items.map((it, i) => {
          const color = pick(colors, i);
          const light = /yellow|lime|gold/.test(color);
          return (
            <div key={it.label} className="relative h-full">
              <div
                className="rp-grow-y absolute inset-x-0 bottom-0 overflow-hidden"
                style={{
                  height: `${Math.max(6, (it.value / top) * 100)}%`,
                  background: color,
                  ["--d" as string]: `${i * 130}ms`,
                }}
              >
                <p
                  className={cn(
                    "rp-num absolute inset-x-0 bottom-0 translate-y-[0.14em] whitespace-nowrap pl-[0.05em]",
                    light ? "text-[#121826]" : "text-white",
                  )}
                  style={{ fontSize: numeralSize(n, format(it.value)) }}
                >
                  <CountUp
                    value={it.value}
                    format={format}
                    cycle={cycle}
                    delay={i * 130}
                  />
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div
        className={cn(
          "mt-2.5 grid text-center text-[11px] font-semibold leading-tight sm:text-[13px]",
          ink(tone),
        )}
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, columnGap: gap }}
      >
        {items.map((it) => (
          <span key={it.label} className="px-0.5">
            {it.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ ranked bars */

export function RankedBars({
  items,
  colors = PALETTES.vivid,
  format = pct,
  max,
  tone = "dark",
}: {
  items: Item[];
  colors?: readonly string[];
  format?: Fmt;
  max?: number;
  tone?: Tone;
}) {
  const { ref, cycle } = useCycle(9000);
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = max ?? sorted[0].value * 1.18;
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className={cn(
          "grid grid-cols-[minmax(84px,auto)_1fr] items-center gap-x-3 gap-y-2.5 sm:gap-x-4",
          ink(tone),
        )}
      >
        {sorted.map((it, i) => (
          <div key={it.label} className="contents">
            <span
              className={cn(
                "text-right text-[12px] font-semibold leading-tight sm:text-[13.5px]",
                muted(tone),
              )}
            >
              {it.label}
            </span>
            <div
              className={cn(
                "flex items-center gap-3 border-l-[3px] py-0.5 pl-0",
                tone === "dark" ? "border-white/80" : "border-[#121826]",
              )}
            >
              <div
                className="rp-grow-x h-[clamp(22px,4vw,32px)] rounded-r-[3px]"
                style={{
                  width: `${(it.value / top) * 100}%`,
                  background: pick(colors, i),
                  ["--d" as string]: `${i * 120}ms`,
                }}
              />
              <span
                className="rp-num rp-fade-up shrink-0 text-[clamp(1.1rem,2.6vw,1.75rem)]"
                style={{ ["--d" as string]: `${i * 120 + 300}ms` }}
              >
                <CountUp
                  value={it.value}
                  format={format}
                  cycle={cycle}
                  delay={i * 120}
                />
              </span>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ split bar */

export function SplitBar({
  a,
  b,
  colors = ["var(--rp-blue)", "var(--rp-cream)"],
  inks = ["#fff", "var(--rp-blue)"],
  format = pct,
  height = "clamp(150px, 22vw, 210px)",
}: {
  a: Item;
  b: Item;
  colors?: [string, string] | readonly string[];
  inks?: [string, string];
  format?: Fmt;
  height?: string;
}) {
  const { ref, cycle } = useCycle(9000);
  const total = a.value + b.value;
  const parts = [a, b];
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className="flex overflow-hidden rounded-[10px] [container-type:inline-size]"
        style={{ height }}
      >
        {parts.map((p, i) => (
          <div
            key={p.label}
            className={cn(
              "relative h-full overflow-hidden",
              i === 0 ? "rp-grow-x" : "",
            )}
            style={{
              width: `${(p.value / total) * 100}%`,
              background: colors[i],
              color: inks[i],
              ["--d" as string]: "0ms",
            }}
          >
            <p className="absolute right-4 top-4 max-w-[90%] text-right text-[12px] font-semibold leading-tight sm:right-6 sm:top-5 sm:text-[14px]">
              {p.label}
            </p>
            <p
              className="rp-num rp-rise absolute bottom-0 right-1 translate-y-[0.17em] whitespace-nowrap"
              style={{
                fontSize: `${Math.min(16, (((p.value / total) * 100) / textEm(format(p.value))) * 0.86)}cqw`,
                ["--d" as string]: `${300 + i * 150}ms`,
              }}
            >
              <CountUp
                value={p.value}
                format={format}
                cycle={cycle}
                delay={i * 150}
              />
            </p>
          </div>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ seesaw */

export function Seesaw({
  a,
  b,
  colors = ["var(--rp-lime)", "#d9fbe6"],
  inks = ["#0f2c22", "#0f2c22"],
  format = pct,
  tone = "dark",
}: {
  a: Item;
  b: Item;
  colors?: [string, string];
  inks?: [string, string];
  format?: Fmt;
  tone?: Tone;
}) {
  const { ref, cycle } = useCycle(10000);
  const heavyLeft = a.value >= b.value;
  const angle = Math.max(
    -12,
    Math.min(12, ((b.value - a.value) / (a.value + b.value)) * 18),
  );
  const size = (v: number) =>
    `${Math.max(16, Math.sqrt(v / Math.max(a.value, b.value)) * 34)}cqw`;
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className="relative mx-auto aspect-[16/8] w-full max-w-[640px] [container-type:inline-size]"
      >
        <div
          className="absolute inset-x-[6%] top-[58%] origin-center"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: "transform 1.4s cubic-bezier(.5,1.6,.4,1) .7s",
            animation: `rp-tilt 1.4s cubic-bezier(.5,1.6,.4,1) 0.6s both`,
          }}
        >
          <div
            className={cn(
              "h-[0.9cqw] min-h-[3px] rounded-full",
              tone === "dark" ? "bg-[#1aa37a]" : "bg-[#0d7a5a]",
            )}
          />
          {[a, b].map((p, i) => (
            <div
              key={p.label}
              className="rp-pop absolute bottom-full flex flex-col items-center justify-center rounded-full text-center"
              style={{
                width: size(p.value),
                height: size(p.value),
                background: colors[i],
                color: inks[i],
                [i === 0 ? "left" : "right"]: "4%",
                ["--d" as string]: `${i * 200}ms`,
              }}
            >
              <span className="text-[max(10px,1.6cqw)] font-semibold">
                {p.label}
              </span>
              <span
                className="rp-num mt-[0.15em]"
                style={{
                  fontSize: `${Math.max(3.4, (Math.sqrt(p.value / Math.max(a.value, b.value)) * 34) / 3.4)}cqw`,
                }}
              >
                <CountUp
                  value={p.value}
                  format={format}
                  cycle={cycle}
                  delay={i * 200}
                />
              </span>
            </div>
          ))}
        </div>
        <svg
          viewBox="0 0 100 60"
          className="absolute left-1/2 top-[59%] w-[12%] -translate-x-1/2"
          aria-hidden
        >
          <path
            d="M50 4 L94 56 Q96 59 92 59 H8 Q4 59 6 56 Z"
            fill="var(--rp-gold)"
            stroke="var(--rp-gold)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">
          {heavyLeft
            ? `${a.label} outweighs ${b.label}`
            : `${b.label} outweighs ${a.label}`}
        </span>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ line chart */

export function LineChart({
  items,
  color = "var(--rp-pink)",
  format = pct,
  tone = "dark",
  step = false,
  min,
  max,
  notes = [],
  height = "clamp(240px, 38vw, 380px)",
  show,
}: {
  items: Item[];
  color?: string;
  format?: Fmt;
  tone?: Tone;
  step?: boolean;
  min?: number;
  max?: number;
  notes?: { at: number; text: string }[];
  height?: string;
  /** Which points carry their value; all of them when left out. */
  show?: number[];
}) {
  const { ref, cycle } = useCycle(11000);
  const W = 1000;
  const H = 400;
  const pad = { l: 20, r: 20, t: 70, b: 20 };
  const vals = items.map((i) => i.value);
  const lo = min ?? Math.min(...vals) * 0.85;
  const hi = max ?? Math.max(...vals) * 1.05;
  const x = (i: number) =>
    pad.l + (i / (items.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) =>
    pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const path = useMemo(() => {
    let d = `M${x(0)} ${y(items[0].value)}`;
    items.slice(1).forEach((it, k) => {
      const i = k + 1;
      if (step) d += ` H${x(i)} V${y(it.value)}`;
      else {
        const cx = (x(i - 1) + x(i)) / 2;
        d += ` C${cx} ${y(items[i - 1].value)} ${cx} ${y(it.value)} ${x(i)} ${y(it.value)}`;
      }
    });
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, step, lo, hi]);
  const gid = useMemo(() => `rpg${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div key={cycle} className="relative w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.35" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={g}
              x1={pad.l}
              x2={W - pad.r}
              y1={pad.t + g * (H - pad.t - pad.b)}
              y2={pad.t + g * (H - pad.t - pad.b)}
              stroke="currentColor"
              strokeOpacity="0.1"
              vectorEffect="non-scaling-stroke"
              className={ink(tone)}
            />
          ))}
          <path
            d={`${path} V${H - pad.b} H${x(0)} Z`}
            fill={`url(#${gid})`}
            className="rp-fade-up"
            style={{ ["--d" as string]: "900ms" }}
          />
          <path
            d={path}
            pathLength={1}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="rp-draw"
          />
        </svg>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <div
              key={it.label}
              className="absolute"
              style={{
                left: `${(x(i) / W) * 100}%`,
                top: `${(y(it.value) / H) * 100}%`,
              }}
            >
              <span
                className="rp-pop absolute left-0 top-0 block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
                style={{
                  borderColor: color,
                  background: tone === "dark" ? "var(--rp-navy)" : "#fff",
                  ["--d" as string]: `${(i / items.length) * 1500}ms`,
                }}
              />
              {(!show || show.includes(i)) && (
                <span
                  className={cn(
                    "rp-num rp-fade-up absolute bottom-3 whitespace-nowrap",
                    i !== 0 && !last && "hidden sm:block",
                    i === 0
                      ? "-translate-x-[20%]"
                      : last
                        ? "-translate-x-[88%]"
                        : "-translate-x-1/2",
                    last
                      ? "text-[clamp(1.5rem,3.6vw,2.6rem)]"
                      : "text-[clamp(0.85rem,1.8vw,1.2rem)]",
                    ink(tone),
                  )}
                  style={{
                    ["--d" as string]: `${(i / items.length) * 1500 + 150}ms`,
                    color: last ? color : undefined,
                  }}
                >
                  {format(it.value)}
                </span>
              )}
            </div>
          );
        })}
        {notes.map((n) => (
          <div
            key={n.text}
            className="absolute top-0 h-full"
            style={{ left: `${((x(n.at - 1) + x(n.at)) / 2 / W) * 100}%` }}
          >
            <div
              className={cn(
                "h-full border-l border-dashed",
                tone === "dark" ? "border-white/30" : "border-black/30",
              )}
            />
            <span
              className={cn(
                "absolute left-2 top-0 w-28 text-[11px] font-semibold leading-tight",
                muted(tone),
              )}
            >
              {n.text}
            </span>
          </div>
        ))}
      </div>
      <div className="relative mt-3 h-5">
        {items.map((it, i) => (
          <span
            key={it.label}
            className={cn(
              "absolute -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold sm:text-[12.5px]",
              items.length > 6 &&
                i % 2 === 1 &&
                i !== items.length - 1 &&
                "hidden sm:block",
              muted(tone),
            )}
            style={{ left: `${(x(i) / W) * 100}%` }}
          >
            {it.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ rings */

export function Rings({
  items,
  colors = PALETTES.vivid,
  format = pct,
  tone = "dark",
}: {
  items: Item[];
  colors?: readonly string[];
  format?: Fmt;
  tone?: Tone;
}) {
  const { ref, cycle } = useCycle(9000);
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((it, i) => {
          const c = pick(colors, i);
          return (
            <div
              key={it.label}
              className="flex flex-col items-center text-center"
            >
              <div className="relative aspect-square w-full max-w-[200px] [container-type:inline-size]">
                <svg
                  viewBox="0 0 100 100"
                  className="h-full w-full -rotate-90"
                  aria-hidden
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.12"
                    strokeWidth="11"
                    className={ink(tone)}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={c}
                    strokeWidth="11"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={`${it.value} 100`}
                    className="rp-sweep"
                    style={{
                      ["--len" as string]: it.value,
                      ["--d" as string]: `${i * 180}ms`,
                    }}
                  />
                </svg>
                <p
                  className={cn(
                    "rp-num absolute inset-0 flex items-center justify-center text-[19cqw]",
                    ink(tone),
                  )}
                >
                  <CountUp
                    value={it.value}
                    format={format}
                    cycle={cycle}
                    delay={i * 180}
                  />
                </p>
              </div>
              <p
                className={cn(
                  "mt-3 text-[13px] font-semibold sm:text-[15px]",
                  muted(tone),
                )}
              >
                {it.label}
              </p>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ half donut */

export function HalfDonut({
  value,
  label,
  rest,
  colors = ["var(--rp-purple)", "var(--rp-pink)"],
  format = pct,
  tone = "light",
  children,
}: {
  value: number;
  label: string;
  rest: string;
  colors?: [string, string];
  format?: Fmt;
  tone?: Tone;
  children?: ReactNode;
}) {
  const { ref, cycle } = useCycle(10000);
  const arc = "M10 100 A90 90 0 0 1 190 100";
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className="relative mx-auto w-full max-w-[640px] [container-type:inline-size]"
      >
        <svg
          viewBox="0 0 200 104"
          className="w-full overflow-visible"
          aria-hidden
        >
          <path
            d={arc}
            fill="none"
            stroke={colors[1]}
            strokeWidth="34"
            pathLength={100}
          />
          <path
            d={arc}
            fill="none"
            stroke={colors[0]}
            strokeWidth="34"
            pathLength={100}
            strokeDasharray={`${value} 100`}
            className="rp-sweep"
            style={{ ["--len" as string]: value }}
          />
        </svg>
        <div className="absolute inset-x-[25%] bottom-0 flex items-end justify-center">
          {children}
        </div>
      </div>
      <div
        className={cn(
          "mx-auto mt-3 flex w-full max-w-[640px] items-start justify-between gap-6 [container-type:inline-size]",
          ink(tone),
        )}
      >
        <div>
          <p
            className="rp-num text-[clamp(2.4rem,9cqw,4rem)]"
            style={{ color: colors[0] }}
          >
            <CountUp value={value} format={format} cycle={cycle} />
          </p>
          <p className="mt-1 text-[13px] font-semibold">{label}</p>
        </div>
        <div className="text-right">
          <p
            className="rp-num text-[clamp(1.8rem,6cqw,2.8rem)]"
            style={{ color: colors[1] }}
          >
            <CountUp
              value={100 - value}
              format={format}
              cycle={cycle}
              delay={300}
            />
          </p>
          <p className="mt-1 text-[13px] font-semibold">{rest}</p>
        </div>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ pictogram */

function Person({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden>
      <circle cx="12" cy="7" r="6" fill={fill} />
      <path d="M2 31 C2 19 6 15 12 15 S22 19 22 31 Z" fill={fill} />
    </svg>
  );
}
function Shop({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 28 28" className="h-full w-full" aria-hidden>
      <path d="M3 10 L6 3 H22 L25 10 Z" fill={fill} />
      <rect x="4" y="11" width="20" height="15" rx="2" fill={fill} />
      <rect x="11" y="16" width="6" height="10" rx="1" fill="rgba(0,0,0,.28)" />
    </svg>
  );
}

export function Pictogram({
  lit,
  total = 100,
  color = "var(--rp-yellow)",
  icon = "person",
  tone = "dark",
  cols,
}: {
  lit: number;
  total?: number;
  color?: string;
  icon?: "person" | "shop";
  tone?: Tone;
  cols?: number;
}) {
  const { ref, cycle } = useCycle(10000);
  const off =
    tone === "dark" ? "rgba(255,255,255,0.16)" : "rgba(18,24,38,0.14)";
  const grid = cols
    ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
    : undefined;
  const Icon = icon === "person" ? Person : Shop;
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className={cn(
          "mx-auto grid max-w-[300px] gap-[clamp(3px,0.7vw,7px)] sm:max-w-none",
          !cols && "grid-cols-10 sm:grid-cols-[repeat(20,minmax(0,1fr))]",
        )}
        style={grid}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn("aspect-[3/4]", i < lit && "rp-pop")}
            style={{ ["--d" as string]: `${i * 22}ms` }}
          >
            <Icon fill={i < lit ? color : off} />
          </div>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ vs pairs */

export function VsArt({
  year,
  tone = "dark",
  color = "var(--rp-blue)",
}: {
  year: string;
  tone?: Tone;
  color?: string;
}) {
  const [a, b] = [year.slice(0, 1), year.slice(2)];
  return (
    <div
      className="rp-display text-[clamp(3rem,8vw,5.2rem)] leading-[0.86]"
      style={{ color }}
    >
      <div>vs.</div>
      <div className="flex items-center">
        {a}
        <svg
          viewBox="0 0 40 40"
          className="mx-[0.04em] h-[0.78em] w-[0.78em]"
          aria-hidden
        >
          <path
            d="M8 28 A14 14 0 1 1 22 34"
            fill="none"
            stroke={tone === "dark" ? "#fff" : "#121826"}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M3 22 L8 30 L15 24"
            fill="none"
            stroke={tone === "dark" ? "#fff" : "#121826"}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {[30, 35.5].map((cx, i) => (
            <circle
              key={i}
              cx={cx}
              cy={i ? 26 : 32}
              r="2.1"
              fill={tone === "dark" ? "#fff" : "#121826"}
              className="rp-pop"
              style={{ ["--d" as string]: `${i * 200}ms` }}
            />
          ))}
        </svg>
        {b}
      </div>
    </div>
  );
}

export function VsPairs({
  pairs,
  aLabel,
  bLabel,
  colors = ["var(--rp-blue)", "var(--rp-pink)"],
  format = pct,
  tone = "dark",
}: {
  pairs: { label: string; a: number; b: number }[];
  aLabel: string;
  bLabel: string;
  colors?: [string, string];
  format?: Fmt;
  tone?: Tone;
}) {
  const { ref, cycle } = useCycle(9500);
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className="grid gap-6 sm:gap-8"
        style={{
          gridTemplateColumns: `repeat(${pairs.length}, minmax(0, 1fr))`,
        }}
      >
        {pairs.map((p, pi) => {
          const top = Math.max(p.a, p.b);
          return (
            <div key={p.label}>
              <div className="flex h-[clamp(130px,18vw,190px)] items-end [container-type:inline-size]">
                {[p.a, p.b].map((v, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-1 flex-col justify-end"
                  >
                    <span
                      className={cn(
                        "mb-1 text-[11px] font-semibold",
                        i ? "text-right" : "",
                        muted(tone),
                      )}
                    >
                      {i ? bLabel : aLabel}
                    </span>
                    <div
                      className={cn(
                        "rp-grow-y relative overflow-hidden",
                        i === 0 ? "rounded-l-[6px]" : "rounded-r-[6px]",
                      )}
                      style={{
                        height: `${Math.max(32, (v / top) * 78)}%`,
                        background: colors[i],
                        ["--d" as string]: `${pi * 200 + i * 160}ms`,
                      }}
                    >
                      <p
                        className="rp-num absolute inset-x-0 bottom-0 translate-y-[0.12em] text-center text-white"
                        style={{ fontSize: numeralSize(2, format(v)) }}
                      >
                        <CountUp
                          value={v}
                          format={format}
                          cycle={cycle}
                          delay={pi * 200 + i * 160}
                        />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p
                className={cn(
                  "mt-3 text-center text-[13px] font-semibold",
                  ink(tone),
                )}
              >
                {p.label}
              </p>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ bubble row */

export function BubbleRow({
  items,
  colors = PALETTES.vivid,
  format = plain,
  unit = "",
  tone = "dark",
}: {
  items: Item[];
  colors?: readonly string[];
  format?: Fmt;
  unit?: string;
  tone?: Tone;
}) {
  const { ref, cycle } = useCycle(10000);
  const top = Math.max(...items.map((i) => i.value));
  return (
    <figure ref={ref} className={cn("rp-block", cycle === 0 && "rp-idle")}>
      <div
        key={cycle}
        className="flex items-center justify-center py-[clamp(70px,9vw,96px)] [container-type:inline-size]"
      >
        {items.map((it, i) => {
          const d = Math.sqrt(it.value / top) * 30;
          const up = i % 2 === 0;
          return (
            <div
              key={it.label}
              className="relative -mx-[1cqw] shrink-0"
              style={{
                width: `${d}cqw`,
                height: `${d}cqw`,
                zIndex: items.length - i,
              }}
            >
              <div
                className="rp-pop h-full w-full rounded-full"
                style={{
                  background: pick(colors, i),
                  ["--d" as string]: `${i * 220}ms`,
                }}
              />
              <div
                className={cn(
                  "rp-fade-up absolute left-1/2 flex flex-col items-center whitespace-nowrap text-center",
                  up ? "bottom-full mb-2" : "top-full mt-2",
                  ink(tone),
                )}
                style={{
                  ["--d" as string]: `${i * 220 + 300}ms`,
                  transform: "translateX(-50%)",
                }}
              >
                {!up && (
                  <span
                    className={cn(
                      "mb-1 h-5 border-l border-dashed",
                      tone === "dark" ? "border-white/50" : "border-black/50",
                    )}
                  />
                )}
                <span className="rp-num text-[clamp(1.2rem,3.6cqw,2.2rem)]">
                  <CountUp
                    value={it.value}
                    format={format}
                    cycle={cycle}
                    delay={i * 220}
                  />
                  {unit && <span className="ml-1 text-[0.45em]">{unit}</span>}
                </span>
                <span
                  className={cn("mt-1 text-[12px] font-semibold", muted(tone))}
                >
                  {it.label}
                </span>
                {up && (
                  <span
                    className={cn(
                      "mt-1 h-5 border-l border-dashed",
                      tone === "dark" ? "border-white/50" : "border-black/50",
                    )}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
