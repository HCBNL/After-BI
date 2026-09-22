/**
 * Image hosting.
 *
 * The landing page's cover images go to Cloudinary rather than Firebase
 * Storage. Two reasons, both practical: a new Firebase project cannot create a
 * Storage bucket without a billing card attached, and Cloudinary resizes and
 * re-encodes on delivery, so a 4 MB photograph of a depot still reaches a
 * distributor's phone as a 40 KB WebP. On a metered Nigerian connection that
 * is the difference between a front page that loads and one that does not.
 *
 * Uploads are **unsigned**. The browser posts straight to Cloudinary with an
 * upload preset name — a public identifier, not a key — so no secret is inlined
 * into the bundle. The preset is what constrains the upload: set it to images
 * only, cap the file size, and point it at a folder. Anyone who reads the
 * bundle can upload to that folder and nothing else, which is the same exposure
 * a public contact form has.
 *
 * Set up once, in Cloudinary → Settings → Upload → Upload presets:
 *   Signing mode      Unsigned
 *   Folder            afterbi
 *   Allowed formats   jpg, png, webp
 *   Max file size     2000000
 *
 * NOTHING HERE IS REQUIRED FOR THE APP TO RUN
 *
 * With no Cloudinary configured the product works exactly as it does now and
 * the landing page draws its designed fallback banner. Only the cover-image
 * controls in the console change: they say so, plainly, instead of failing when
 * a file is chosen.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/** True when uploads are possible. */
export const cloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/** 2 MB. Above this is a photograph nobody meant to upload. */
export const MAX_UPLOAD_BYTES = 2_000_000;

/** 100 MB for a video: far above an image, far below what knocks a phone over. */
export const MAX_VIDEO_BYTES = 100_000_000;

/** Where in the account a file lands. Grouped so they are easy to find and purge. */
export type UploadKind = 'cover' | 'logo' | 'product' | 'site';

interface CloudinaryResponse {
  secure_url?: string;
  error?: { message?: string };
}

/**
 * Send one image to Cloudinary and get back the URL to store.
 *
 * The returned URL is a plain delivery URL. Ask for a sized version with
 * `imageUrl()` at the point of display rather than storing a transformed one:
 * the same cover is a 1920-pixel banner, a 256-pixel preview in the console and
 * a 96-pixel thumbnail, and only the caller knows which.
 */
export async function uploadImage(file: File, kind: UploadKind): Promise<string> {
  if (!cloudinaryConfigured) {
    throw new Error(
      'Image uploads are not set up. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET, then redeploy.',
    );
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('That is not an image. Use a PNG, JPG or WebP file.');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `That file is ${(file.size / 1_000_000).toFixed(1)} MB. Please use one under 2 MB — a cover image rarely needs more once it has been exported for the web.`,
    );
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET!);
  form.append('folder', `afterbi/${kind}`);

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error('Could not reach Cloudinary. Check the connection and try again.');
  }

  const body = (await response.json().catch(() => ({}))) as CloudinaryResponse;

  if (!response.ok || !body.secure_url) {
    /* Cloudinary's own message is specific and worth passing through —
       "Upload preset not found" tells you exactly what to fix. */
    throw new Error(body.error?.message ?? `Cloudinary refused the upload (${response.status}).`);
  }

  return body.secure_url;
}

/**
 * Send one video to Cloudinary and get back the URL to store.
 *
 * The same unsigned preset, posted to the `video/upload` endpoint. Whether it
 * succeeds depends on the preset: the setup described above allows images only,
 * so an account that wants to publish a video cover adds `mp4` and a larger max
 * file size to the preset first. When the preset refuses, Cloudinary's own
 * message is passed straight through, which names exactly what to change.
 */
export async function uploadVideo(file: File): Promise<string> {
  if (!cloudinaryConfigured) {
    throw new Error(
      'Uploads are not set up. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET, then redeploy.',
    );
  }

  if (!file.type.startsWith('video/')) {
    throw new Error('That is not a video. Use an MP4, or paste a link to one hosted elsewhere.');
  }

  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `That file is ${(file.size / 1_000_000).toFixed(0)} MB. Please use one under 100 MB, or paste a link instead.`,
    );
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET!);
  form.append('folder', 'afterbi/video');

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error('Could not reach Cloudinary. Check the connection and try again.');
  }

  const body = (await response.json().catch(() => ({}))) as CloudinaryResponse;

  if (!response.ok || !body.secure_url) {
    throw new Error(
      body.error?.message ??
        `Cloudinary refused the upload (${response.status}). The upload preset may not allow video.`,
    );
  }

  return body.secure_url;
}

/**
 * A delivery URL sized for where it is going.
 *
 * Cloudinary transformations are path segments, so this rewrites the URL rather
 * than calling anything. `f_auto` picks WebP or AVIF per browser and `q_auto`
 * picks a quality that still looks right; together they are usually an order of
 * magnitude off the original.
 *
 * A URL that is not Cloudinary's is returned untouched, so a cover pasted from
 * somewhere else still works.
 */
export function imageUrl(url: string | undefined, options?: { width?: number; height?: number }): string {
  if (!url || !url.includes('/upload/')) return url ?? '';

  const parts = ['f_auto', 'q_auto'];
  if (options?.width) parts.push(`w_${Math.round(options.width * 2)}`); // 2× for retina
  if (options?.height) parts.push(`h_${Math.round(options.height * 2)}`);
  if (options?.width || options?.height) parts.push('c_limit');

  return url.replace('/upload/', `/upload/${parts.join(',')}/`);
}

/** A delivery URL for a video, sized for where it plays. */
export function videoUrl(url: string | undefined, width: number): string {
  if (!url || !url.includes('/video/upload/')) return url ?? '';
  return url.replace('/video/upload/', `/video/upload/q_auto,vc_auto,w_${width},c_limit/`);
}

/**
 * The first frame of a Cloudinary video, as a picture: what shows before the
 * video starts, and instead of it for a visitor who asked for less motion.
 * Empty for any other kind of link, which has no still to ask for.
 */
export function videoStill(url: string | undefined, width: number): string {
  if (!url || !url.includes('/video/upload/')) return '';
  return url
    .replace('/video/upload/', `/video/upload/so_0,q_auto,w_${width},c_limit/`)
    .replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg');
}
