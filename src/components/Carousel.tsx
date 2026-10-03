/**
 * A swipeable strip of pictures.
 *
 * This is what sits at the foot of an article, the gallery that is not the
 * cover. It is built to be touched: it is a real horizontally-scrolling element
 * with scroll-snap, so a thumb flicks through it exactly as a phone's photo
 * roll does, and the arrows and dots are there for a mouse. Nothing here
 * animates a transform behind the scenes and then fights the browser's own
 * scrolling; the scroll position IS the state, read back to light the right
 * dot.
 *
 * WHY NOT A LIBRARY
 *
 * The same reason the markdown renderer is hand-written: this is a public page
 * a visitor may open once on a slow connection, and a carousel library is tens
 * of kilobytes to do what one scroll container and two buttons already do.
 *
 * One picture is not a carousel, it draws as a single framed image with no
 * arrows and no dots, because a control that can only sit still is noise.
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';

export function Carousel({ images, className }: { images: string[]; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const slides = images.filter(Boolean);

  /* The scroll position is the source of truth. This reads it back so the dots
     and the arrows agree with wherever a finger left the strip. */
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = el.clientWidth || 1;
        setActive(Math.round(el.scrollLeft / width));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (slides.length === 0) return null;

  const go = (index: number) => {
    const el = track.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  };

  /* A single picture is just a picture. */
  if (slides.length === 1) {
    return (
      <img
        src={imageUrl(slides[0], { width: 900 })}
        alt=""
        className={cn('w-full rounded-2xl border border-hairline object-cover', className)}
        style={{ aspectRatio: '16 / 9' }}
        loading="lazy"
      />
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={track}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-hairline [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {slides.map((url, index) => (
          <img
            key={`${url}-${index}`}
            src={imageUrl(url, { width: 900 })}
            alt=""
            className="w-full shrink-0 grow-0 basis-full snap-center object-cover"
            style={{ aspectRatio: '16 / 9' }}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>

      {/* ------------------------------------------------------------ arrows */}
      <button
        type="button"
        onClick={() => go(active - 1)}
        disabled={active === 0}
        aria-label="Previous picture"
        className="tap absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-[var(--surface-page)]/85 text-primary shadow-card backdrop-blur transition-opacity hover:bg-[var(--surface-page)] disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => go(active + 1)}
        disabled={active === slides.length - 1}
        aria-label="Next picture"
        className="tap absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-[var(--surface-page)]/85 text-primary shadow-card backdrop-blur transition-opacity hover:bg-[var(--surface-page)] disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronRight size={18} />
      </button>

      {/* -------------------------------------------------------------- dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => go(index)}
            aria-label={`Go to picture ${index + 1}`}
            aria-current={index === active}
            className={cn(
              'h-2 rounded-full transition-all',
              index === active ? 'w-6 bg-brand-700 dark:bg-brand-400' : 'w-2 bg-[var(--surface-sunken)]',
            )}
          />
        ))}
      </div>
    </div>
  );
}
