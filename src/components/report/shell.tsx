/**
 * Everything around a report's chapters:
 *
 *   Film        the opening: the big blue tile of shapes plays, shrinks and
 *               drops, then the introduction types itself out (with a soft
 *               keyboard sound once the visitor turns sound on). Plays on
 *               every visit; Skip ends it.
 *   Cover       the collage, with the tile and the shapes drifting over it as
 *               the pointer and the page move
 *   ReportBar   logo, Download report, Share
 *   ChapterTab  "You're viewing", pinned bottom right, and a jump list
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  Download,
  Link2,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/brand/Wordmark";
import { MARK_BARS, MARK_BAR_WIDTH } from "@/components/brand/logoPaths";
import { Art } from "@/components/marketing/art";
import { shareLink } from "./kit";

/* ------------------------------------------------------------ the tile */

/* The pop runs on an inner group, so it never replaces the outer group's placement. */
function TilePop({ d, at, children, animate }: { d: number; at: string; children: ReactNode; animate: boolean }) {
  return (
    <g transform={at}>
      <g className={animate ? 'rp-pop' : ''} style={{ ['--d' as string]: `${d}ms` }}>
        {children}
      </g>
    </g>
  );
}

/** The report's mark: the AfterBI badge and three of the owner's shapes, white on brand blue, with the year on a yellow flower. */
export function ReportTile({ year = '2026', className, animate = true }: { year?: string; className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <TilePop animate={animate} d={150} at="translate(0 0)">
        <circle cx="105" cy="105" r="82" fill="#fff" />
        <path d={MARK_BARS} transform="translate(23 23) scale(1.64)" stroke="var(--rp-brand, #003ffa)" strokeWidth={MARK_BAR_WIDTH} strokeLinecap="round" fill="none" />
      </TilePop>
      <TilePop animate={animate} d={320} at="translate(210 20) scale(1.7)">
        <path d="M50 13 L83 44 L50 87 L17 44 Z" fill="#fff" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
        <path d="M50 13 V87 M17 44 H83" stroke="var(--rp-brand, #003ffa)" strokeWidth="4" />
      </TilePop>
      <TilePop animate={animate} d={480} at="translate(22 205) scale(1.66)">
        <path d="M50 8 C70 30 88 43 88 62 A38 38 0 0 1 12 62 C12 43 30 30 50 8 Z" fill="#fff" />
      </TilePop>
      <TilePop animate={animate} d={640} at="translate(206 206) scale(1.72)">
        <g fill="#fff">
          <rect x="14" y="48" width="28" height="28" rx="5" />
          <rect x="36" y="30" width="28" height="46" rx="5" />
          <rect x="58" y="12" width="28" height="64" rx="5" />
        </g>
      </TilePop>
      <TilePop animate={animate} d={900} at="translate(272 168)">
        <g className={animate ? 'rp-spin' : ''} style={{ transformOrigin: '42px 42px' }}>
          <circle cx="42" cy="42" r="30" fill="var(--rp-yellow, #ffe01b)" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={i} cx={42 + 29 * Math.cos(a)} cy={42 + 29 * Math.sin(a)} r="14" fill="var(--rp-yellow, #ffe01b)" />;
          })}
        </g>
        <text x="42" y="40" textAnchor="middle" fontFamily="Archivo Variable, Archivo, sans-serif" fontWeight="900" fontSize="24" fill="#0b1324">
          {year.slice(0, 2)}
        </text>
        <text x="42" y="62" textAnchor="middle" fontFamily="Archivo Variable, Archivo, sans-serif" fontWeight="900" fontSize="24" fill="#0b1324">
          {year.slice(2)}
        </text>
      </TilePop>
    </svg>
  );
}

/* ------------------------------------------------------------ sound */

/** A soft mechanical key, made on the spot: a short band of noise and a low knock. */
function useKeySound() {
  const ctx = useRef<AudioContext | null>(null);
  const noise = useRef<AudioBuffer | null>(null);
  const enable = useCallback(() => {
    if (ctx.current) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const c = new AC();
      const buf = c.createBuffer(
        1,
        Math.floor(c.sampleRate * 0.05),
        c.sampleRate,
      );
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      ctx.current = c;
      noise.current = buf;
    } catch {
      /* no audio on this device */
    }
  }, []);
  const tap = useCallback(() => {
    const c = ctx.current;
    if (!c || !noise.current) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noise.current;
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1700 + Math.random() * 1800;
    band.Q.value = 0.9;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(band).connect(g).connect(c.destination);
    src.start(t);
    const o = c.createOscillator();
    const og = c.createGain();
    o.frequency.value = 110 + Math.random() * 40;
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.08, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(og).connect(c.destination);
    o.start(t);
    o.stop(t + 0.07);
  }, []);
  const close = useCallback(() => {
    void ctx.current?.close().catch(() => undefined);
    ctx.current = null;
  }, []);
  return { enable, tap, close };
}

/* ------------------------------------------------------------ the film */

type Phase = "tile" | "drop" | "type" | "out";

export function Film({
  paragraphs,
  onDone,
}: {
  paragraphs: string[];
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("tile");
  const [cursor, setCursor] = useState(0);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  const keys = useKeySound();
  const words = useMemo(
    () => paragraphs.map((p) => p.split(/\s+/)),
    [paragraphs],
  );
  const total = words.reduce((n, w) => n + w.length, 0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase("out");
    window.setTimeout(() => {
      keys.close();
      onDone();
    }, 700);
  }, [onDone, keys]);

  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const a = window.setTimeout(() => setPhase("drop"), 1900);
    const b = window.setTimeout(() => setPhase("type"), 3300);
    return () => {
      root.style.overflow = before;
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    if (phase !== "type") return;
    const id = window.setInterval(() => {
      setCursor((c) => {
        if (c >= total) {
          window.clearInterval(id);
          window.setTimeout(finish, 1100);
          return c;
        }
        if (soundRef.current) {
          keys.tap();
          if (Math.random() > 0.45) window.setTimeout(keys.tap, 34);
        }
        return c + 1;
      });
    }, 82);
    return () => window.clearInterval(id);
  }, [phase, total, finish, keys]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [finish]);

  const toggleSound = () => {
    if (!soundRef.current) keys.enable();
    soundRef.current = !soundRef.current;
    setSound(soundRef.current);
  };

  let index = 0;
  return (
    <div
      className={cn("rp-film rp-noprint", phase === "out" && "is-out")}
      data-phase={phase}
      role="dialog"
      aria-label="Report opening"
    >
      <div className="rp-film-tile flex items-center justify-center overflow-hidden">
        <ReportTile className="h-[62%] w-[62%] max-w-[560px]" />
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-3 sm:right-10 sm:top-8">
        <button
          type="button"
          onClick={toggleSound}
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          {sound ? (
            <Volume2 size={24} aria-hidden />
          ) : (
            <VolumeX size={24} aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={finish}
          className="h-12 rounded-full border border-white/80 px-9 text-[16px] font-semibold text-white hover:bg-white hover:text-[var(--rp-navy)]"
        >
          Skip
        </button>
      </div>

      {(phase === "type" || phase === "out") && (
        <div className="rp-film-words absolute inset-x-0 top-[17vh] mx-auto max-w-[1180px] space-y-6 px-6 text-[clamp(1.05rem,2.05vw,1.75rem)] font-medium leading-[1.35] text-white sm:px-12">
          {words.map((ws, p) => {
            const start = index;
            index += ws.length;
            if (start > cursor + 2) return null;
            return (
              <p key={p}>
                {ws.map((w, i) => {
                  const k = start + i;
                  const ahead = k - cursor;
                  const o =
                    ahead <= 0
                      ? 1
                      : ahead > 14
                        ? 0
                        : Math.max(0.06, 0.55 - ahead * 0.04);
                  return (
                    <span key={i} style={{ opacity: o }}>
                      {w}{" "}
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ the cover */

export function Cover({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      raf = 0;
      const s = Math.min(1, window.scrollY / 700);
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      el.style.setProperty("--sy", s.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const scroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* depth: how far a layer drifts with the pointer and the page, in px */
  const layer = (d: number) => ({
    transform: `translate3d(calc(var(--px, 0) * ${d}px), calc(var(--py, 0) * ${d * 0.6}px + var(--sy, 0) * ${d * -3}px), 0)`,
    transition: "transform 0.6s cubic-bezier(.2,.8,.2,1)",
  });

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[1500px] px-2 pt-28 sm:pt-28"
    >
      <div className="relative">
        <div className="relative" style={layer(-10)}>
          <img
            src={src}
            alt={alt}
            fetchPriority="high"
            decoding="async"
            className="block w-full select-none"
            style={{
              WebkitMaskImage:
                "radial-gradient(120% 100% at 50% 45%, #000 62%, transparent 82%)",
              maskImage:
                "radial-gradient(120% 100% at 50% 45%, #000 62%, transparent 82%)",
            }}
          />
        </div>
        {/* the tile in the sky over the man's head */}
        <div
          className="absolute left-[43%] top-[2%] w-[11.5%] sm:top-[3%]"
          style={layer(22)}
        >
          <div className="aspect-square rounded-[16%] bg-[var(--rp-brand)] p-[8%] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
            <ReportTile />
          </div>
        </div>
        {/* the owner's shapes, drifting at their own depths */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-[58%] top-[14%] w-[5%]"
            style={layer(34)}
          >
            <Art name="spark" className="w-full" />
          </div>
          <div
            className="absolute left-[4%] top-[18%] w-[6%]"
            style={layer(28)}
          >
            <Art name="bloom" shift={1} className="w-full" />
          </div>
          <div
            className="absolute left-[26%] top-[54%] w-[5%]"
            style={layer(40)}
          >
            <Art name="kite" shift={2} className="w-full" />
          </div>
          <div
            className="absolute right-[5%] top-[52%] w-[6%]"
            style={layer(30)}
          >
            <Art name="orbit" shift={3} className="w-full" />
          </div>
          <div
            className="absolute right-[24%] top-[64%] w-[4.5%]"
            style={layer(46)}
          >
            <Art name="droplet" shift={4} className="w-full" />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ the bar */

export function ReportBar({ title }: { title: string }) {
  const [solid, setSolid] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const url =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}`;
  const text = `${title} by AfterBI`;
  const flash = (m: string) => {
    setNote(m);
    window.setTimeout(() => setNote(""), 2000);
  };
  const round =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";
  return (
    <header
      className={cn(
        "rp-noprint fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        solid ? "bg-[var(--rp-navy)]/92 backdrop-blur" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1340px] items-center justify-between gap-4 px-5 sm:h-20 sm:px-8">
        <div className="flex items-center gap-10">
          <Link
            to="/"
            aria-label="AfterBI home"
            className="text-[24px] sm:text-[28px]"
          >
            <Wordmark onInk />
          </Link>
          <span
            className={cn(
              "hidden items-center gap-1 text-[13px] font-semibold text-white/75 transition-opacity md:flex",
              solid && "opacity-0",
            )}
          >
            Scroll <ChevronDown size={14} aria-hidden />
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {note && (
            <span className="hidden text-[12px] font-semibold text-white/80 sm:inline">
              {note}
            </span>
          )}
          {/* Off for now: the download will come with sign up, once the PDF is finished. */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Download coming soon"
            className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-full bg-white/10 px-4 text-[13.5px] font-bold text-white/40 sm:px-5"
          >
            <Download size={16} aria-hidden className="sm:hidden" />
            <span className="hidden sm:inline">Download report</span>
          </button>
          <span className="ml-2 hidden text-[13px] font-bold text-white md:inline">
            Share
          </span>
          <button
            type="button"
            aria-label="Copy link"
            className={cn(round, "hidden md:flex")}
            onClick={() =>
              void navigator.clipboard.writeText(url).then(
                () => flash("Link copied"),
                () => undefined,
              )
            }
          >
            <Link2 size={16} aria-hidden />
          </button>
          <a
            aria-label="Share on WhatsApp"
            className={cn(round, "hidden md:flex")}
            href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.7 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.8-.1 1.5Z" />
            </svg>
          </a>
          <a
            aria-label="Share on X"
            className={cn(round, "hidden md:flex")}
            href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
              aria-hidden
            >
              <path d="M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.4l7.9-9L1 2h7l4.8 6.4L18.2 2Zm-1.2 18h1.9L7.1 3.9H5.1L17 20Z" />
            </svg>
          </a>
          <a
            aria-label="Share on LinkedIn"
            className={cn(round, "hidden md:flex")}
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
              aria-hidden
            >
              <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.6 4.77 6v5.56h-4v-4.93c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62v5.01h-4v-11Z" />
            </svg>
          </a>
          <button
            type="button"
            aria-label="Share"
            className={cn(round, "md:hidden")}
            onClick={() =>
              void shareLink(url, text).then(
                (r) => r === "copied" && flash("Link copied"),
              )
            }
          >
            <Share2 size={16} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------ chapter tab */

export function ChapterTab({
  chapters,
}: {
  chapters: { id: string; title: string }[];
}) {
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const els = chapters
      .map((c) => document.getElementById(`sec-${c.id}`))
      .filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setCurrent(vis[0].target.id.replace("sec-", ""));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [chapters]);
  /* Out of the way once the site's own footer comes up. */
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const end = document.getElementById('site-end');
    if (!end) return;
    const io = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting));
    io.observe(end);
    return () => io.disconnect();
  }, []);
  const now = chapters.find((c) => c.id === current);
  if (!now || atEnd) return null;
  return (
    <div className="rp-noprint fixed bottom-0 right-0 z-40 w-[160px] sm:right-4 sm:w-[210px]">
      {open && (
        <ul className="mb-1 overflow-hidden rounded-t-[10px] bg-[var(--rp-navy)] py-1 ring-1 ring-white/15">
          {chapters.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-4 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/10 hover:text-white",
                  c.id === current && "text-[var(--rp-yellow)]",
                )}
              >
                {c.title}
              </a>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="block w-full text-left"
      >
        <span className="flex items-center justify-between bg-[var(--rp-yellow)] px-3 py-1.5 text-[11px] font-semibold text-[#121826] sm:px-3.5 sm:py-2 sm:text-[12px]">
          You're viewing:
          <ChevronDown
            size={14}
            className={cn("transition-transform", !open && "rotate-180")}
            aria-hidden
          />
        </span>
        <span className="block bg-[var(--rp-blue)] px-3 py-2 text-[12px] font-bold text-white sm:px-3.5 sm:py-2.5 sm:text-[13px]">
          {now.title}
        </span>
      </button>
    </div>
  );
}
