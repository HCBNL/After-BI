/**
 * Whatever video link the owner pasted, made playable.
 *
 * The owner is never asked to know the difference between a YouTube watch
 * link, a share link and an embed link: all three are recognised and turned
 * into the one an iframe needs. Vimeo the same. Anything else that is a web
 * address is treated as a file and played in a `<video>`. A blank or unsafe
 * string returns null and nothing draws.
 */

export interface VideoEmbed {
  /** `youtube` and `vimeo` go in an iframe; `file` plays in a `<video>`. */
  kind: 'youtube' | 'vimeo' | 'file';
  src: string;
}

export function parseVideo(url: string | undefined): VideoEmbed | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;

  const ytPath = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|live\/))([\w-]{6,})/i.exec(raw);
  const ytQuery = /youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,})/i.exec(raw);
  const youtubeId = ytPath?.[1] ?? ytQuery?.[1];
  if (youtubeId) return { kind: 'youtube', src: `https://www.youtube.com/embed/${youtubeId}` };

  const vimeo = /vimeo\.com\/(?:video\/)?(\d{5,})(?:\/(\w+))?/i.exec(raw);
  if (vimeo) {
    const hash = vimeo[2] ? `?h=${vimeo[2]}` : '';
    return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vimeo[1]}${hash}` };
  }

  /* Only http(s): a `javascript:` address must never reach a src attribute. */
  if (/^https?:\/\//i.test(raw)) return { kind: 'file', src: raw };
  return null;
}

/** The still YouTube already holds for a video, so nobody uploads a poster. */
export function youtubePoster(url: string | undefined): string | null {
  const video = parseVideo(url);
  if (!video || video.kind !== 'youtube') return null;
  const id = video.src.split('/').pop();
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
