/**
 * The front page's banner: one picture, shipped with the code.
 *
 * WHAT THIS USED TO BE, AND WHY IT IS NOT THAT ANY MORE
 *
 * A carousel. Up to six slides, each a picture or a silent video, uploaded in
 * Owner → Website, with optional words over them, dots to move between them
 * and a timer to move by itself. All of it drawn from `site/home` in Firestore.
 *
 * The cost of that was paid on the one screen that decides whether a visitor
 * stays. Nothing could be drawn until the database answered, so the first
 * thing anybody met was a holding colour; then a slide appeared; then its
 * picture arrived over the top of it. Three screens before the real one, on
 * the page the whole site is judged by, every single time.
 *
 * The banner is now two files in `public/` and a path in this file. There is
 * no fetch, no decision, and nothing to wait for. `index.html` starts the
 * download before React exists, and the blurred copy inlined in `index.css`
 * paints on the very first frame, so the picture is never absent — it only
 * sharpens.
 *
 * TO CHANGE THE PICTURE
 *
 *   1. Replace `public/banner-wide.{webp,jpg}` (16:9) and
 *      `public/banner-tall.{webp,jpg}` (9:16).
 *   2. Regenerate the two blurred copies in `src/index.css` — search for
 *      BANNER BLUR there; the note beside them says how.
 *   3. Deploy.
 *
 * There is deliberately no way to do it from the console. A picture that can
 * be changed at a distance is a picture the page has to ask about first, and
 * asking is the thing that made this slow.
 *
 * WHAT IS KEPT FROM THE OLD ONE
 *
 * The slow pan, so the banner is alive rather than a flat photograph, and the
 * veil over it, so the header reads across any part of the picture and the
 * banner runs into the page below instead of stopping at a hard edge. Both are
 * in `index.css`, as `.banner-pan` and `.banner-veil`. The pan stops for
 * anybody who has asked for less motion.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { btn } from './tokens';

/**
 * How much of the site's navy is laid over the picture.
 *
 * The picture is bright and busy — it is a wall of screenshots — and white
 * buttons sitting straight on it are hard to pick out. This is the one number
 * worth adjusting by eye after changing the picture: lower shows more of it,
 * higher makes what sits over it easier to read.
 */
const DIM = 0.42;

export function BannerStage({
  onCreate,
  onBook,
  className,
}: {
  onCreate?: () => void;
  onBook?: () => void;
  className?: string;
}) {
  /*
   * Whether the full picture has painted, so the blurred copy can give way.
   *
   * Checked against the element rather than waited for with `onLoad` alone:
   * the picture is preloaded in `index.html`, so on most visits it is already
   * in the browser's cache and finishes before React has attached a handler.
   * A handler on its own would then never fire and the blur would stay.
   */
  const photo = useRef<HTMLImageElement>(null);
  const [sharp, setSharp] = useState(false);

  useEffect(() => {
    const el = photo.current;
    if (el?.complete && el.naturalWidth > 0) setSharp(true);
  }, []);

  return (
    <section
      aria-label="GetSchool"
      className={cn('relative isolate h-full w-full overflow-hidden bg-night text-white', className)}
    >
      {/*
        The picture, and the blurred copy underneath it, drifting together.

        One element carries both so there is no seam: the blur is the wrapper's
        own background and the picture is the child on top, so when the picture
        fades in it is already in the same place and moving at the same rate.
      */}
      <div aria-hidden className="banner-photo banner-pan absolute inset-0">
        <picture>
          {/*
            Tall for phones, wide for everything else, WebP where it is
            understood and JPEG where it is not. The browser picks one and
            downloads only that — and `index.html` has already started it.
          */}
          <source media="(max-width: 767px)" type="image/webp" srcSet="/banner-tall.webp" />
          <source media="(max-width: 767px)" type="image/jpeg" srcSet="/banner-tall.jpg" />
          <source type="image/webp" srcSet="/banner-wide.webp" />
          <img
            ref={photo}
            src="/banner-wide.jpg"
            alt=""
            /* Never lazy, never low priority: this is the page. */
            fetchPriority="high"
            decoding="async"
            onLoad={() => setSharp(true)}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-500 ease-out',
              sharp ? 'opacity-100' : 'opacity-0',
            )}
          />
        </picture>
      </div>

      {/* The navy over the picture, so what sits on it can be read. */}
      <div aria-hidden className="absolute inset-0 bg-night" style={{ opacity: DIM }} />

      {/* Dark at the top for the header, dark at the foot so it runs into the page. */}
      <div aria-hidden className="banner-veil pointer-events-none absolute inset-0" />

      {/* The page's one h1, which the banner carries no words of its own for. */}
      <h1 className="sr-only">GetSchool, school management for nursery, primary and secondary schools</h1>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button type="button" onClick={onCreate} className={btn.red}>
            Create your school
          </button>
          <button type="button" onClick={onBook} className={btn.glass}>
            Book a walkthrough
          </button>
        </div>
      </div>
    </section>
  );
}
