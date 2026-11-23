/**
 * The pieces every report page is built from, apart from the charts:
 * the replay clock, counting numbers, torn paper, chapter heads, findings
 * with a share button, and the source line under every figure.
 */
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/archivo/wdth-italic.css";
import "./report.css";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Art, type ArtName } from "@/components/marketing/art";
import type { Source } from "@/pages/public/reports/sme2026";

/* ------------------------------------------------------------ the clock */

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Printing shows every chart finished, with its final numbers. */
let printing = false;
const printListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  const set = (v: boolean) => {
    printing = v;
    printListeners.forEach((l) => l());
  };
  window.addEventListener("beforeprint", () => set(true));
  window.addEventListener("afterprint", () => set(false));
}
export function usePrinting(): boolean {
  return useSyncExternalStore(
    (l) => {
      printListeners.add(l);
      return () => printListeners.delete(l);
    },
    () => printing,
    () => false,
  );
}

/**
 * A chart's replay clock. `cycle` is 0 until the chart is first seen (drawn
 * empty), then goes up by one each time it should play again: on arrival,
 * and every `loop` milliseconds while it stays on screen, so the figures keep
 * reading themselves out. Charts key their marks on it to restart.
 */
export function useCycle<T extends HTMLElement = HTMLDivElement>(loop = 9000) {
  const ref = useRef<T>(null);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      setCycle(1);
      return;
    }
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(timer);
        if (entry.isIntersecting) {
          setCycle((c) => c + 1);
          timer = window.setInterval(() => setCycle((c) => c + 1), loop);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [loop]);
  return { ref, cycle };
}

/* ------------------------------------------------------------ numbers */

export type Fmt = (v: number) => string;

function decimals(v: number): number {
  const s = String(v);
  return s.includes(".") ? s.split(".")[1].length : 0;
}
export const pct: Fmt = (v) =>
  `${v.toLocaleString("en-NG", { maximumFractionDigits: 2 })}%`;
export const naira: Fmt = (v) =>
  `₦${v.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
export const nairaWhole: Fmt = (v) =>
  `₦${Math.round(v).toLocaleString("en-NG")}`;
export const plain: Fmt = (v) =>
  v.toLocaleString("en-NG", { maximumFractionDigits: 2 });
export const mw: Fmt = (v) => `${Math.round(v).toLocaleString("en-NG")}`;
export const millions: Fmt = (v) => `${(v / 1_000_000).toFixed(2)}m`;

/** A number that counts up from nothing each time its chart replays. */
export function CountUp({
  value,
  format = plain,
  cycle,
  delay = 0,
  duration = 1200,
}: {
  value: number;
  format?: Fmt;
  cycle: number;
  delay?: number;
  duration?: number;
}) {
  const isPrinting = usePrinting();
  const [shown, setShown] = useState(cycle === 0 ? 0 : value);
  const places = decimals(value);
  useEffect(() => {
    if (cycle === 0) return;
    if (reduced()) {
      setShown(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const k = Math.min(1, Math.max(0, (t - start - delay) / duration));
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Number((value * eased).toFixed(places)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cycle, value, delay, duration, places]);
  return <>{format(isPrinting ? value : shown)}</>;
}

/* ------------------------------------------------------------ paper */

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

/** A clip path with torn top and bottom edges (and slightly ragged sides). */
function tornPath(seed: string, depth = 7): string {
  const r = seeded(seed);
  const top: string[] = [];
  const bottom: string[] = [];
  for (let x = 0; x <= 100; x += 2.5 + r() * 3)
    top.push(`${Math.min(100, x).toFixed(1)}% ${(r() * depth).toFixed(1)}%`);
  top.push(`100% ${(r() * depth).toFixed(1)}%`);
  for (let x = 100; x >= 0; x -= 2.5 + r() * 3)
    bottom.push(
      `${Math.max(0, x).toFixed(1)}% ${(100 - r() * depth).toFixed(1)}%`,
    );
  bottom.push(`0% ${(100 - r() * depth).toFixed(1)}%`);
  return `polygon(${[...top, `${(100 - r() * 1.5).toFixed(1)}% 50%`, ...bottom, `${(r() * 1.5).toFixed(1)}% 50%`].join(",")})`;
}

/** The question or headline printed on a torn strip of newsprint. */
export function TornNote({
  children,
  tilt = -2,
  className,
  seed,
  small,
}: {
  children: ReactNode;
  tilt?: number;
  className?: string;
  seed?: string;
  small?: boolean;
}) {
  const clip = useMemo(
    () => tornPath(seed ?? String(children).slice(0, 24)),
    [seed, children],
  );
  return (
    <div
      className={cn("relative inline-block", className)}
      style={{
        transform: `rotate(${tilt}deg)`,
        filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.3))",
      }}
    >
      <div
        className={cn(
          "rp-paper rp-note-font",
          small
            ? "px-5 py-4 text-[clamp(1.05rem,2vw,1.35rem)]"
            : "px-6 py-5 text-[clamp(1.35rem,3.2vw,2.15rem)] sm:px-8 sm:py-6",
        )}
        style={{ clipPath: clip }}
      >
        {children}
      </div>
    </div>
  );
}

/** The ragged top edge of a chapter sheet. */
export function TornEdge({
  color,
  seed = "edge",
  flip,
}: {
  color: string;
  seed?: string;
  flip?: boolean;
}) {
  const d = useMemo(() => {
    const r = seeded(seed);
    let p = "M0 40 ";
    for (let x = 0; x <= 1000; x += 18 + r() * 40)
      p += `L${x.toFixed(0)} ${(8 + r() * 26).toFixed(0)} `;
    return `${p}L1000 ${(10 + r() * 20).toFixed(0)} L1000 40 Z`;
  }, [seed]);
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 40"
      preserveAspectRatio="none"
      className={cn("block h-[18px] w-full sm:h-[26px]", flip && "rotate-180")}
    >
      <path d={d} fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------ heads */

export function ChapterHead({
  n,
  title,
  color,
  art,
  id,
}: {
  n: string;
  title: string;
  color: string;
  art: ArtName;
  id: string;
}) {
  return (
    <header id={id} className="scroll-mt-24">
      <p className="text-[14px] font-semibold opacity-80">Chapter {n}</p>
      <h2
        className="rp-display mt-2 flex items-center gap-3 text-[clamp(2.4rem,7vw,4.6rem)]"
        style={{ color }}
      >
        <Art
          name={art}
          className="h-[0.8em] w-[0.8em] shrink-0"
          shift={Number(n.length)}
        />
        {title}
      </h2>
    </header>
  );
}

/** "We looked at:" and the question, above a chart. */
export function Asked({
  children,
  label = "We asked the numbers:",
  tilt,
  className,
  seed,
}: {
  children: ReactNode;
  label?: string;
  tilt?: number;
  className?: string;
  seed?: string;
}) {
  return (
    <div className={cn("relative z-10", className)}>
      <p className="mb-2 text-[14px] font-bold">{label}</p>
      <TornNote tilt={tilt} seed={seed}>
        {children}
      </TornNote>
    </div>
  );
}

/** An arrowed lead line in the chapter colour: "We also looked at …". */
export function Lead({
  children,
  color,
}: {
  children: ReactNode;
  color: string;
}) {
  return (
    <p
      className="flex items-start gap-3 text-[15px] font-bold sm:text-[17px]"
      style={{ color }}
    >
      <svg
        viewBox="0 0 28 16"
        className="mt-1 h-4 w-7 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M1 8h25M19 1l7 7-7 7" />
      </svg>
      {children}
    </p>
  );
}

/* ------------------------------------------------------------ findings */

export function SourceLine({
  sources,
  className,
}: {
  sources: Source[];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mt-3 block text-[11.5px] leading-snug opacity-60",
        className,
      )}
    >
      Source:{" "}
      {sources.map((s, i) => (
        <span key={s.id}>
          {i > 0 && "; "}
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted underline-offset-2 hover:opacity-100"
          >
            {s.publisher}
          </a>
        </span>
      ))}
      .
    </span>
  );
}

export async function shareLink(
  url: string,
  text: string,
): Promise<"shared" | "copied" | "none"> {
  try {
    if (navigator.share) {
      await navigator.share({ title: text, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return "none";
  }
}

/** One finding between two thin rules, with a button that shares just it. */
export function Finding({
  id,
  children,
  tone = "dark",
}: {
  id: string;
  children: string;
  tone?: "dark" | "light";
}) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    const r = await shareLink(url, children);
    if (r !== "none") {
      setDone(true);
      window.setTimeout(() => setDone(false), 2200);
    }
  };
  return (
    <div
      id={id}
      className={cn(
        "rp-block flex scroll-mt-24 flex-col gap-4 border-y py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-10",
        tone === "dark" ? "border-white/15" : "border-black/15",
      )}
    >
      <p className="max-w-[34rem] text-[clamp(1rem,1.8vw,1.15rem)] leading-snug">
        {children}
      </p>
      <button
        type="button"
        onClick={() => void share()}
        className={cn(
          "rp-noprint inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full px-6 text-[14px] font-bold transition-[filter] hover:brightness-110 sm:self-auto",
          tone === "dark"
            ? "bg-[var(--rp-blue)] text-white"
            : "bg-[var(--rp-blue)] text-white",
        )}
      >
        {done ? (
          <Check size={16} aria-hidden />
        ) : (
          <Share2 size={16} aria-hidden />
        )}
        {done ? "Link ready" : "Share this"}
      </button>
    </div>
  );
}

/** A giant figure with a short line under it. */
export function BigStat({
  value,
  label,
  color,
  cycle,
  format = plain,
  className,
}: {
  value: number;
  label: ReactNode;
  color: string;
  cycle: number;
  format?: Fmt;
  className?: string;
}) {
  let em = 0;
  for (const ch of format(value))
    em += /[,.]/.test(ch) ? 0.34 : ch === "%" ? 1.02 : 0.8;
  return (
    <div className={cn("[container-type:inline-size]", className)}>
      <p
        className="rp-num"
        style={{
          color,
          fontSize: `min(7.5rem, ${(100 / Math.max(2.6, em)) * 0.92}cqw)`,
        }}
      >
        <CountUp value={value} format={format} cycle={cycle} />
      </p>
      <div className="mt-3 max-w-[22rem] text-[15px] leading-snug opacity-85">
        {label}
      </div>
    </div>
  );
}

/** A cut out picture with its white sticker edge, floating slowly. */
export function Cutout({
  src,
  alt,
  className,
  style,
  bob = true,
  sticker = true,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  bob?: boolean;
  sticker?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "pointer-events-none select-none",
        sticker && "rp-sticker",
        bob && "rp-bob",
        className,
      )}
      style={style}
    />
  );
}
