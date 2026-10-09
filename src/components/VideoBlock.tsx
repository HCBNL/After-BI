/**
 * A video at the foot of an article.
 *
 * The owner pastes one link and does not have to know what kind it is , 
 * `parseVideo` sorts a YouTube or Vimeo link into an iframe and anything else
 * (a direct MP4, a Cloudinary video) into a `<video>` tag. An unrecognised or
 * empty string draws nothing, so a post with no video simply has no video.
 *
 * Both are held in a 16:9 frame so the layout never jumps while the player
 * loads, and both are lazy: the iframe carries `loading="lazy"` and the file
 * carries `preload="none"`, because a visitor who scrolled past should not have
 * paid to fetch a video they never started.
 */

import { parseVideo } from '@/lib/video';
import { cn } from '@/lib/cn';

export function VideoBlock({ url, className }: { url: string | undefined; className?: string }) {
  const video = parseVideo(url);
  if (!video) return null;

  return (
    <div
      className={cn('overflow-hidden rounded-2xl border border-hairline bg-black', className)}
      style={{ aspectRatio: '16 / 9' }}
    >
      {video.kind === 'file' ? (
        <video src={video.src} controls preload="none" className="h-full w-full" />
      ) : (
        <iframe
          src={video.src}
          title="Video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      )}
    </div>
  );
}
