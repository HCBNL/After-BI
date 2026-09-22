/**
 * Pick an image, upload it, hand back the URL.
 *
 * One component for every place a picture is set, because they are all the
 * same interaction — choose a file, watch it go, see it, be able to take it off
 * again — and writing it twice is how two of them drift apart.
 *
 * It uploads immediately rather than waiting for the form to be submitted. On a
 * Nigerian connection a 2 MB photograph is a real wait, and somebody who
 * presses Save and sits watching a frozen button assumes it has hung. This way
 * the wait has a spinner on the thing actually being waited for, and by the
 * time they reach Save the URL is already in hand.
 *
 * Where nothing is configured the control says so plainly, rather than failing
 * at the moment a file is chosen.
 */

import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { Spinner, useToast } from '@/components/ui';
import { cloudinaryConfigured, imageUrl, uploadImage, type UploadKind } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';

interface Props {
  /** What is there now. Empty string or undefined for nothing. */
  value?: string;
  onChange: (url: string) => void;
  kind: UploadKind;
  /** Rendered width in px. The preview is square unless `height` says otherwise. */
  size?: number;
  /**
   * Preview height in px, for a picture that is not square.
   *
   * A 16:9 cover judged in a 96px square tells you nothing about how it will
   * crop, so the preview is drawn at the shape the thing actually is.
   */
  height?: number;
  label?: string;
  hint?: string;
  shape?: 'circle' | 'square';
  /** Shown in the empty state when there is no picture yet. */
  placeholder?: string;
  disabled?: boolean;
}

export function ImagePicker({
  value,
  onChange,
  kind,
  size = 96,
  height,
  label,
  hint,
  shape = 'square',
  placeholder,
  disabled = false,
}: Props) {
  const boxHeight = height ?? size;
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, kind));
      toast.success('Picture uploaded', 'Remember to publish.');
    } catch (error) {
      /* `uploadImage` throws sentences written for this moment — the file is
         too big, it is not an image, Cloudinary is unreachable. */
      toast.error('Could not upload it', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      /* Clearing it means picking the SAME file again still fires `change`,
         which it does not otherwise: the classic "it worked once" bug. */
      if (input.current) input.current.value = '';
    }
  };

  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <div>
      {label && <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center overflow-hidden border border-hairline',
            value ? 'surface-sunken' : 'poster-glow',
            rounded,
          )}
          style={{ width: size, height: boxHeight }}
        >
          {value ? (
            <img
              src={imageUrl(value, { width: size })}
              alt=""
              /* A logo is letterboxed so none of it is lost; a cover is cropped,
                 because cropping is exactly what it will do in place and the
                 preview should not flatter it. */
              className={cn('h-full w-full', height ? 'object-cover' : 'object-contain')}
              loading="lazy"
            />
          ) : (
            <span className="px-2 text-center text-[11px] font-medium leading-tight text-white/60">
              {placeholder ?? <ImagePlus size={20} className="mx-auto" />}
            </span>
          )}

          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-page)]/75">
              <Spinner size={20} className="text-brand-600 dark:text-brand-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 basis-48">
          {cloudinaryConfigured ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => input.current?.click()}
                  className="tap inline-flex items-center gap-1.5 rounded-xl border border-hairline px-3 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary disabled:opacity-50"
                >
                  <Upload size={14} />
                  {value ? 'Change' : 'Upload'}
                </button>

                {value && (
                  <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => onChange('')}
                    className="tap inline-flex items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-muted transition-colors hover:text-status-critical disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>

              {hint && <p className="mt-2 text-[12px] leading-relaxed text-muted">{hint}</p>}
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-muted">
              Picture uploads are not set up on this deployment yet. Add{' '}
              {/* `break-all` — these are long unbreakable tokens, and without it
                  they are the widest thing on the page and push it sideways. */}
              <code className="break-all font-mono text-[11.5px]">VITE_CLOUDINARY_CLOUD_NAME</code> and{' '}
              <code className="break-all font-mono text-[11.5px]">VITE_CLOUDINARY_UPLOAD_PRESET</code>, then redeploy.
              You can still paste a link to a picture hosted elsewhere.
            </p>
          )}

          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void choose(event.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}
