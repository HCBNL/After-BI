/**
 * A product's picture, in a frame that is the same shape everywhere.
 *
 * WHY ONE COMPONENT AND NOT THREE `<img>` TAGS
 *
 * A catalogue card, a catalogue row and the product sheet all draw the same
 * photograph at three sizes, and all three have to answer the same four
 * awkward questions: what a product with no picture looks like, what a picture
 * that has not arrived yet looks like, what happens when the URL is dead, and
 * how a 4 MB photograph is kept off a rep's data bundle. Answered once here,
 * they stay answered; answered three times, the card gets a placeholder and
 * the row gets a broken-image glyph.
 *
 * CONTAIN, NOT COVER
 *
 * Supplier photography is cut-outs on white with air round the edges. `cover`
 * fills the frame handsomely and crops that air away, which on a tall bottle
 * or a wide carton means cropping the product. A catalogue exists to show the
 * thing accurately, so the picture is contained and the frame is a sunken
 * ground rather than a hard white box: nothing is ever cut off, and a portrait
 * shot next to a landscape one still lines up.
 */

import { useState } from 'react';
import { ImageOff, Package } from 'lucide-react';
import { imageUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';

export function ProductShot({
  src,
  alt,
  /** Rendered width in CSS pixels. Only used to ask Cloudinary for a sane size. */
  width,
  className,
  imgClassName,
  rounded = 'rounded-xl',
}: {
  src?: string;
  alt: string;
  width: number;
  className?: string;
  imgClassName?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);

  /* A dead URL is not an empty product: it says "there is meant to be a
     picture here", which is the thing an administrator needs to see. */
  const missing = !src || failed;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden surface-sunken',
        rounded,
        className,
      )}
    >
      {missing ? (
        <span className="text-[var(--text-muted)] opacity-55" aria-hidden>
          {src ? <ImageOff size={Math.max(16, Math.round(width / 5))} /> : <Package size={Math.max(16, Math.round(width / 5))} />}
        </span>
      ) : (
        <img
          src={imageUrl(src, { width })}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-contain', imgClassName)}
        />
      )}
    </div>
  );
}
