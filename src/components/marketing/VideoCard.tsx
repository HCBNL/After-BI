/**
 * The walkthrough, as a card on the front door.
 *
 * WHY IT IS A PICTURE AND A BUTTON RATHER THAN A PLAYER
 *
 * An embedded YouTube player is not a video, it is an application: around half
 * a megabyte of script and a set of cookies, fetched whether or not anybody
 * presses play. On the page that has to load fastest, for the visitor least
 * likely to watch, that is the wrong trade twice over.
 *
 * So the card is a still and a play button, and the player is fetched on the
 * press. The cost until then is one image. The still comes from YouTube's own
 * thumbnail when the link is a YouTube one, so the owner does not have to
 * upload a picture of a video they have already uploaded, and a poster set in
 * the console overrules it.
 *
 * `youtube-nocookie.com` is used deliberately: it sets nothing until the video
 * is played, which is the difference between a marketing page and a marketing
 * page that needs a cookie banner.
 *
 * Nothing draws at all when no link is set. An empty black rectangle with a
 * dead play button on it is worse than no video.
 */

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { imageUrl } from '@/lib/cloudinary';
import { parseVideo, youtubePoster } from '@/lib/video';
import { cn } from '@/lib/cn';

export function VideoCard({
  url,
  poster,
  title,
  className,
}: {
  url: string | undefined;
  poster?: string;
  title?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [stillFailed, setStillFailed] = useState(false);
  const file = useRef<HTMLVideoElement | null>(null);

  const video = parseVideo(url);
  if (!video) return null;

  /* The console's own poster wins; otherwise YouTube's, if there is one. */
  const still = poster ? imageUrl(poster, { width: 900 }) : youtubePoster(url);
  const label = (title ?? '').trim() || 'Watch the demo';

  /* Autoplay only ever follows a press, never a page load. */
  const src =
    video.kind === 'youtube'
      ? `${video.src.replace('www.youtube.com', 'www.youtube-nocookie.com')}?autoplay=1&rel=0`
      : video.kind === 'vimeo'
        ? `${video.src}${video.src.includes('?') ? '&' : '?'}autoplay=1`
        : video.src;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[1.4rem] border border-hairline bg-[#0a0c10] shadow-card',
        className,
      )}
      style={{ aspectRatio: '16 / 9' }}
    >
      {playing ? (
        video.kind === 'file' ? (
          /*
           * `playsInline` IS THE WHOLE FIX FOR "IT OPENS A BIGGER WINDOW".
           *
           * Without it, iOS Safari refuses to play a video where it sits and
           * throws its own full-screen player over the page instead. That is
           * not a styling choice this card was making, it is the platform
           * default for any `<video>` that does not say otherwise, and it is
           * why the walkthrough leapt out of the shelf on a phone and stayed
           * inline on a laptop. One attribute, and it plays in the card at
           * every width, exactly as it looks like it should.
           *
           * `poster` and `preload` are the other half. The element used to be
           * created empty and told to play in the same breath, so the first
           * second was a black box while it fetched, the stutter that reads
           * as the video crashing and starting over. It now shows the still it
           * was already showing and has the opening metadata in hand before
           * the press, so the picture never leaves the screen.
           */
          <video
            ref={file}
            src={src}
            controls
            autoPlay
            playsInline
            preload="metadata"
            poster={still && !stillFailed ? still : undefined}
            className="h-full w-full bg-black object-cover"
          />
        ) : (
          <iframe
            src={src}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            /*
             * Some browsers ignore `autoPlay` on an element that has only just
             * been mounted. Asking once more on the next frame costs nothing
             * when autoplay already worked and rescues the press when it did
             * not; a rejected promise here simply means the browser wants a
             * second gesture, which the controls provide.
             */
            requestAnimationFrame(() => void file.current?.play().catch(() => {}));
          }}
          aria-label={label}
          className="absolute inset-0 h-full w-full text-left"
        >
          {still && !stillFailed ? (
            <img
              src={still}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setStillFailed(true)}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            /* No still, and nothing pretending to be one. */
            <span
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(70% 60% at 30% 20%, rgba(216,30,43,.45), transparent 65%), linear-gradient(140deg, #14171c, #0a0c10)',
              }}
              aria-hidden
            />
          )}

          {/* A wash under the words, so a bright still never eats them. */}
          <span
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10"
            aria-hidden
          />

          <span className="absolute inset-0 flex items-center justify-center">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[#0a0c10] shadow-pop transition-transform duration-300 group-hover:scale-110">
              <span
                className="absolute inset-0 rounded-full bg-white/60"
                style={{ animation: 'ab-pulse-ring 2.8s ease-out infinite' }}
                aria-hidden
              />
              <Play size={22} className="relative ml-0.5" fill="currentColor" aria-hidden />
            </span>
          </span>

          <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <span className="min-w-0">
              <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/60">
                AfterBI
              </span>
              <span className="mt-0.5 block truncate text-[15px] font-bold text-white">{label}</span>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
