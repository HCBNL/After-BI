/**
 * The landing page's cover — the owner's own slides.
 *
 * WHAT IT IS
 *
 * Up to six slides, set in Platform → Website (`site/home.banners`). Each is a
 * picture or a silent video, pushed back behind the words by as much as the
 * owner chooses, with an optional headline (its full stop always drawn in the
 * brand green) and an optional line under it. Pictures drift slowly left and
 * right; video plays muted, with a small Unmute beside the dots. With nothing
 * uploaded it draws `DEFAULT_BANNER`: the words on the drifting green light.
 *
 * THE TOP OF IT IS ALWAYS DARK
 *
 * The header sits over the cover, and a picture must never compete with the
 * menu. The veil darkens the top of every slide whatever is in it, and the
 * words start below the header's height, so nothing can collide with it.
 *
 * WHY IT SIZES ITSELF FROM ITS CONTAINER
 *
 * The console draws this same component inside a laptop frame and a phone
 * frame, so a slide can be tried before it is published. Its type is set with
 * container queries rather than screen widths, which is what lets a
 * 1440-pixel frame shrunk to a third look exactly like a 1440-pixel screen.
 *
 * THE SIZES TO UPLOAD
 *
 *   Wide, for laptops and desktops   16:9, 1920 × 1080
 *   Tall, for phones                 9:16, 1080 × 1920 (optional)
 *   Video                            MP4, 8 to 15 seconds, under 10 MB
 *
 * Keep faces and any lettering inside the middle 70%: a very wide screen trims
 * the top and bottom, and a phone without its own tall version trims the sides.
 */

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { cn } from '@/lib/cn';
import { imageUrl, videoStill, videoUrl } from '@/lib/cloudinary';
import type { SiteBanner } from '@/lib/siteDoc';
import { btn } from './tokens';

/** `auto` follows the screen; the console's frames force one or the other. */
export type BannerFit = 'auto' | 'wide' | 'tall';

const IMAGE_MS = 7000;
/** A video that never reports its end still gives way after this long. */
const VIDEO_CAP_MS = 60000;
const PHONE = '(max-width: 767px)';
const CALM = '(prefers-reduced-motion: reduce)';

function useMedia(query: string, enabled = true): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    if (!enabled) return;
    const list = window.matchMedia(query);
    const update = () => setMatch(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query, enabled]);
  return match;
}

export function BannerStage({
  slides,
  fit = 'auto',
  onBook,
  onProduct,
  headingLevel = 'h1',
  className,
}: {
  slides: SiteBanner[];
  fit?: BannerFit;
  onBook?: () => void;
  onProduct?: () => void;
  /** The landing page's first headline is its `h1`; the console's frames use `h2`. */
  headingLevel?: 'h1' | 'h2';
  className?: string;
}) {
  const phone = useMedia(PHONE, fit === 'auto');
  const calm = useMedia(CALM);
  const tall = fit === 'auto' ? phone : fit === 'tall';

  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});
  const touchX = useRef<number | null>(null);

  const current = count > 0 ? Math.min(index, count - 1) : 0;
  const slide = count > 0 ? slides[current] : undefined;
  const playing = Boolean(slide && slide.kind === 'video' && slide.src.trim() && !calm && !blocked[slide.id]);

  const go = useCallback(
    (next: number) => {
      if (count > 0) setIndex(((next % count) + count) % count);
    },
    [count],
  );

  /*
   * It moves on by itself, and a video slide waits for its video to finish.
   * It holds while pointed at or focused, stops for good once somebody picks a
   * slide, never moves for a visitor who asked for less motion, and waits while
   * the sound is on: somebody listening is somebody watching.
   */
  const rotating = count > 1 && !chosen && !held && !calm && muted;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => go(current + 1), playing ? VIDEO_CAP_MS : IMAGE_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, playing, current, go]);

  const swipeStart = (event: TouchEvent) => {
    touchX.current = event.touches[0]?.clientX ?? null;
  };
  const swipeEnd = (event: TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start === null || count < 2) return;
    const distance = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(distance) < 48) return;
    setChosen(true);
    go(current + (distance < 0 ? 1 : -1));
  };

  const title = slide?.title?.trim() ?? '';
  const subtitle = slide?.subtitle?.trim() ?? '';
  const buttons = slide ? slide.buttons !== false : false;
  const Heading = headingLevel === 'h1' && current === 0 ? 'h1' : 'h2';

  return (
    <section
      aria-roledescription="carousel"
      aria-label="AfterBI"
      className={cn('@container relative isolate h-full w-full overflow-hidden bg-[#0a0c10] text-white', className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      onTouchStart={swipeStart}
      onTouchEnd={swipeEnd}
    >
      <div aria-hidden className={cn('banner-glow absolute -inset-[8%]', !calm && 'banner-drift')} />

      {slides.map((item, i) => (
        <Slide
          key={item.id}
          slide={item}
          active={i === current}
          first={i === 0}
          tall={tall}
          calm={calm}
          muted={muted}
          loop={!rotating}
          onEnded={() => {
            if (rotating) go(i + 1);
          }}
          onBlocked={() => setBlocked((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }))}
        />
      ))}

      <div aria-hidden className="banner-veil pointer-events-none absolute inset-0" />

      {/* A page always has one h1, even when the first slide is a picture with
          no words on it at all. */}
      {headingLevel === 'h1' && !(current === 0 && title) && (
        <h1 className="sr-only">
          AfterBI, distribution management for fast-moving consumer goods: orders, stock, invoices, credit and sell-out
        </h1>
      )}

      {slide && (title || subtitle || buttons) && (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 pb-16 pt-24 text-center @2xl:px-10 @2xl:pb-20">
          <div key={slide.id} className="flex w-full max-w-4xl animate-fade-up flex-col items-center">
            {title && (
              <Heading className="max-w-[17ch] text-balance font-display text-[2.2rem] font-extrabold leading-[1.03] tracking-[-0.045em] @xl:text-[3rem] @4xl:text-[3.9rem] @6xl:text-[4.5rem]">
                <Dotted text={title} />
              </Heading>
            )}
            {subtitle && (
              <p
                className={cn(
                  'max-w-[36rem] text-balance text-[15.5px] leading-[1.6] text-white/85 @xl:text-[18px] @4xl:text-[20px]',
                  title && 'mt-4 @xl:mt-5',
                )}
              >
                {subtitle}
              </p>
            )}
            {buttons && (
              <div className={cn('flex w-full flex-col gap-3 @md:w-auto @md:flex-row', (title || subtitle) && 'mt-8')}>
                <button type="button" onClick={onBook} className={btn.green}>
                  Book a walkthrough
                </button>
                <button type="button" onClick={onProduct} className={btn.glass}>
                  See the product
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Small, and inside the picture. */}
      {count > 1 && (
        <div
          role="group"
          aria-label="Choose a slide"
          className="absolute inset-x-0 bottom-3 z-20 flex justify-center @2xl:bottom-5"
        >
          {slides.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setChosen(true);
                go(i);
              }}
              aria-label={`Slide ${i + 1} of ${count}`}
              aria-current={i === current ? 'true' : undefined}
              className="group flex h-6 w-6 items-center justify-center"
            >
              <span
                className={cn(
                  'block h-[5px] rounded-full transition-all duration-500',
                  i === current ? 'w-4 bg-brand-500' : 'w-[5px] bg-white/45 group-hover:bg-white/80',
                )}
              />
            </button>
          ))}
        </div>
      )}

      {playing && (
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={!muted}
          className="absolute bottom-3 right-4 z-20 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur transition-colors hover:bg-black/55 @2xl:bottom-5 @2xl:right-6"
        >
          {muted ? 'Unmute' : 'Mute'}
        </button>
      )}
    </section>
  );
}

/**
 * The brand's one device, applied to whatever the owner typed.
 *
 * A headline ends in a green full stop. If the owner typed one it is recoloured
 * in place; if they typed none it is added; if they ended on a question mark or
 * an ellipsis it is left alone, because those are already an ending and a dot
 * after them is a typo.
 *
 * It is done for them rather than asked for, because the console is a text box
 * and requiring somebody to type a marker to get a brand device is how a brand
 * device stops being used.
 */
function Dotted({ text }: { text: string }) {
  const trimmed = text.trimEnd();
  const last = trimmed.slice(-1);
  if (last === '.') {
    return (
      <>
        {trimmed.slice(0, -1)}
        <span className="text-brand-500">.</span>
      </>
    );
  }
  if (/[!?…:;,]/.test(last)) return <>{trimmed}</>;
  return (
    <>
      {trimmed}
      <span className="text-brand-500">.</span>
    </>
  );
}

function Slide({
  slide,
  active,
  first,
  tall,
  calm,
  muted,
  loop,
  onEnded,
  onBlocked,
}: {
  slide: SiteBanner;
  active: boolean;
  first: boolean;
  tall: boolean;
  calm: boolean;
  muted: boolean;
  loop: boolean;
  onEnded: () => void;
  onBlocked: () => void;
}) {
  const node = useRef<HTMLVideoElement>(null);
  const blockedRef = useRef(onBlocked);
  useEffect(() => {
    blockedRef.current = onBlocked;
  });

  const source = (tall && slide.mobileSrc?.trim() ? slide.mobileSrc : slide.src)?.trim() ?? '';
  const width = tall ? 1080 : 1920;
  const video = slide.kind === 'video';
  const dim = Math.max(0, Math.min(85, Number.isFinite(slide.dim) ? slide.dim : 55));

  /* Only the slide on screen plays, from the start, every time it comes round. */
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    if (active && !calm) {
      try {
        element.currentTime = 0;
      } catch {
        /* not seekable yet; it will start from the top anyway */
      }
      const attempt = element.play();
      if (attempt) attempt.catch(() => blockedRef.current());
    } else {
      element.pause();
    }
  }, [active, calm, source]);

  useEffect(() => {
    if (node.current) node.current.muted = muted;
  }, [muted]);

  return (
    <div
      aria-hidden={!active}
      className={cn('absolute inset-0 transition-opacity duration-1000 ease-out', active ? 'opacity-100' : 'opacity-0')}
    >
      {source &&
        (video ? (
          <video
            ref={node}
            src={videoUrl(source, width)}
            poster={videoStill(source, width) || undefined}
            muted={muted}
            playsInline
            loop={loop}
            preload={active || first ? 'auto' : 'metadata'}
            onEnded={onEnded}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img
            src={imageUrl(source, { width: tall ? 540 : 960 })}
            alt=""
            decoding="async"
            fetchPriority={first ? 'high' : 'low'}
            className={cn('absolute inset-0 h-full w-full object-cover', !calm && 'banner-drift')}
          />
        ))}
      {dim > 0 && <div className="absolute inset-0 bg-[#0a0c10]" style={{ opacity: dim / 100 }} />}
    </div>
  );
}
