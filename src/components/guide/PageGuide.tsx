/**
 * The (i) at the top right of every page, and what it opens.
 *
 *   One card    a page with a single thing to know: its artwork, a title, the
 *               text and OK.
 *   A story     a page with more: full screen slides in the theme colour that
 *               play on their own, with a bar per slide at the top. Tap the
 *               right of the screen for the next, the left for the one before,
 *               hold anywhere to pause. Arrow keys, space and Esc on a laptop.
 *
 * It replaced the first-time tour, which walked people round the home screen
 * once and was never seen again. This is there on every page, whenever it is
 * wanted. The slides live in lib/pageGuides.ts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconArt } from '@/components/ui/IconArt';
import { Button } from '@/components/ui';
import { actionByLabel } from '@/lib/tiles';
import { guideSlides, type GuideSlide } from '@/lib/pageGuides';

/** A bold "i", drawn so it reads at a glance inside the round button. */
function InfoGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="5.6" r="2.1" fill="currentColor" />
      <path d="M9.4 10.2h3.6v8.2h1.9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GuideButton({ title, description, className, tone = 'panel' }: { title: string; description?: string; className?: string; tone?: 'panel' | 'plain' }) {
  const slides = useMemo(() => guideSlides(title, description), [title, description]);
  const [open, setOpen] = useState(false);
  if (!slides.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`About ${title}`}
        title={`About ${title}`}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full transition-colors',
          tone === 'panel'
            ? 'h-10 w-10 bg-white/[0.12] text-white ring-1 ring-inset ring-white/15 hover:bg-white/20 active:bg-white/25 lg:h-11 lg:w-11'
            : 'h-10 w-10 border border-hairline text-primary hover:bg-[var(--surface-sunken)]',
          className,
        )}
      >
        <InfoGlyph />
      </button>
      {open &&
        createPortal(
          slides.length > 1 ? <GuideStory title={title} slides={slides} onClose={() => setOpen(false)} /> : <GuideCard title={title} slide={slides[0]} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------ one card */

function useEscape(onClose: () => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', key);
      root.style.overflow = before;
    };
  }, [onClose]);
}

function GuideCard({ title, slide, onClose }: { title: string; slide: GuideSlide; onClose: () => void }) {
  useEscape(onClose);
  const action = actionByLabel(title);
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`About ${title}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] rounded-[32px] surface-card px-7 pb-7 pt-12 text-center shadow-pop animate-scale-in"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-primary transition-colors hover:bg-[var(--surface-sunken)]"
        >
          <X size={20} aria-hidden />
        </button>
        <div className="flex justify-center">
          <IconArt icon={action?.icon ?? Info} id={action?.id ?? title} size={68} halo={0.3} />
        </div>
        <h2 className="mt-5 font-display text-title font-extrabold tracking-[-0.02em] text-primary">{`About ${title}`}</h2>
        <p className="mt-3 text-body leading-relaxed text-secondary">{slide.body}</p>
        <Button className="mt-7 w-full rounded-full" size="lg" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the story */

/** About 1 second for every 4 words read, between 5 and 9 seconds a slide. */
const slideMs = (s: GuideSlide) => Math.min(9000, Math.max(5000, ((s.title + ' ' + s.body).split(/\s+/).length / 4) * 1000 + 1500));

function GuideStory({ title, slides, onClose }: { title: string; slides: GuideSlide[]; onClose: () => void }) {
  useEscape(onClose);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState(true);
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const last = index === slides.length - 1;
  const action = actionByLabel(title);

  const go = useCallback(
    (to: number) => {
      if (to < 0) {
        setProgress(0);
        return;
      }
      if (to >= slides.length) {
        onClose();
        return;
      }
      setIndex(to);
      setProgress(0);
    },
    [slides.length, onClose],
  );

  /* The clock: fills the current bar, then moves on. The last slide waits for "Got it". */
  useEffect(() => {
    if (paused) return;
    const total = slideMs(slides[index]);
    let raf = 0;
    let prev = performance.now();
    const tick = (t: number) => {
      const dt = t - prev;
      prev = t;
      setProgress((p) => {
        const next = Math.min(1, p + dt / total);
        if (next >= 1 && !last) window.setTimeout(() => go(index + 1), 0);
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, paused, slides, last, go]);

  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 2600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [go, index]);

  const down = () => {
    held.current = false;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setPaused(true);
    }, 220);
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    window.clearTimeout(holdTimer.current);
    if (held.current) {
      setPaused(false);
      return;
    }
    setHint(false);
    const box = e.currentTarget.getBoundingClientRect();
    if (e.clientX - box.left < box.width * 0.3) go(index - 1);
    else go(index + 1);
  };

  const slide = slides[index];
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in lg:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`About ${title}`}
        className="relative flex h-full w-full select-none flex-col overflow-hidden text-white lg:h-[min(86vh,780px)] lg:max-w-[440px] lg:rounded-[32px] lg:shadow-pop"
        style={{ background: 'linear-gradient(180deg, color-mix(in oklab, var(--hero) 92%, #ffffff) 0%, var(--hero) 45%, color-mix(in oklab, var(--hero) 78%, #000000) 100%)' }}
      >
        {/* the artwork, half off the bottom corner, turning slowly */}
        <div className="pointer-events-none absolute -bottom-24 -right-24 opacity-70">
          <IconArt id={action?.id ?? title} size={320} variant="glass" spin />
        </div>

        <div className="relative z-10 px-5 pt-[calc(var(--safe-top,0px)+14px)] lg:pt-5">
          <div className="flex gap-1.5" aria-hidden>
            {slides.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <span className="block h-full rounded-full bg-white" style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-caption font-semibold text-white/75">{title}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/15">
              <X size={26} aria-hidden />
            </button>
          </div>
        </div>

        {/* the slide; the whole area is the tap target */}
        <div className="relative z-0 flex-1 px-6 pt-2" onPointerDown={down} onPointerUp={up} onPointerLeave={() => window.clearTimeout(holdTimer.current)}>
          <div key={index} className="animate-fade-in">
            <p className="text-caption font-bold uppercase tracking-[0.14em] text-white/60">{`${index + 1} of ${slides.length}`}</p>
            <h2 className="mt-2 font-display text-[2.15rem] font-extrabold leading-[1.05] tracking-[-0.03em]">{slide.title}</h2>
            <p className="mt-4 text-[1.1rem] leading-relaxed text-white/85">{slide.body}</p>
          </div>
          {(hint || paused) && (
            <span className="pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/25 px-6 py-3.5 text-label font-medium text-white/85 backdrop-blur-sm">
              {paused ? 'Paused' : 'Tap to skip, hold to pause'}
            </span>
          )}
        </div>

        {last && (
          <div className="relative z-10 px-6 pb-[calc(var(--safe-bottom,0px)+24px)] lg:pb-7">
            <button type="button" onClick={onClose} className="h-[52px] w-full rounded-full bg-white text-body font-bold text-[color:var(--hero)] transition-opacity hover:opacity-90">
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
