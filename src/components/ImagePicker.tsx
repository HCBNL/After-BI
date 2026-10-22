/**
 * Pick an image, upload it, hand back the URL.
 *
 * One component for every place a picture is set, because they are all the
 * same interaction, choose a file, watch it go, see it, be able to take it off
 * again, and writing it twice is how two of them drift apart.
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
import { Hint, Spinner, useToast } from '@/components/ui';
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
  /** Stretch to the column's width (height from `height`/`size`), so pickers side by side match. */
  fill?: boolean;
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
  fill = false,
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
      /* `uploadImage` throws sentences written for this moment, the file is
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
  const canUpload = cloudinaryConfigured && !disabled && !busy;

  return (
    <div className={fill ? 'w-full' : undefined}>
      {(label || hint) && (
        <div className="mb-2 flex items-center gap-1.5">
          {label && <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>}
          {/* The note sits behind the (i), like every other field's, not as prose under the box. */}
          {hint && <Hint label={label ? `About ${label.toLowerCase()}` : 'About this picture'}>{hint}</Hint>}
        </div>
      )}

      {/* The box IS the button: tap it to upload or change. */}
      <div className="group relative" style={fill ? { height: boxHeight } : { width: size, height: boxHeight }}>
        <button
          type="button"
          disabled={!canUpload}
          onClick={() => input.current?.click()}
          aria-label={value ? `Change ${label ?? 'the picture'}` : `Upload ${label ?? 'a picture'}`}
          className={cn(
            'relative flex h-full w-full items-center justify-center overflow-hidden border transition-colors',
            value ? 'border-hairline surface-sunken' : 'border-dashed border-[var(--border-strong)] hover:border-brand-500',
            canUpload && 'cursor-pointer',
            rounded,
          )}
        >
          {value ? (
            <img
              src={imageUrl(value, { width: fill ? 480 : size })}
              alt=""
              className={cn('h-full w-full p-2', height && !fill ? 'object-cover' : 'object-contain')}
              loading="lazy"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-[11.5px] font-medium leading-tight text-muted">
              {placeholder ?? <ImagePlus size={18} />}
              {!placeholder && <span>Tap to upload</span>}
            </span>
          )}

          {value && canUpload && (
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Upload size={11} aria-hidden /> Change
            </span>
          )}

          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-[var(--surface-page)]/75">
              <Spinner size={20} className="text-brand-600 dark:text-brand-400" />
            </span>
          )}
        </button>

        {value && !disabled && !busy && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`Remove ${label ?? 'the picture'}`}
            title="Remove"
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-muted shadow-sm ring-1 ring-black/5 transition-colors hover:text-status-critical dark:bg-black/60"
          >
            <Trash2 size={13} aria-hidden />
          </button>
        )}
      </div>

      {!cloudinaryConfigured && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
          Picture uploads are not set up on this deployment yet. Add{' '}
          <code className="break-all font-mono text-[11px]">VITE_CLOUDINARY_CLOUD_NAME</code> and{' '}
          <code className="break-all font-mono text-[11px]">VITE_CLOUDINARY_UPLOAD_PRESET</code>, then redeploy.
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
  );
}
