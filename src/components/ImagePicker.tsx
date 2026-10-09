/**
 * Pick an image, upload it, hand back the URL.
 *
 * One component for the two places a picture is set: the school's logo, in
 * Settings, and a person's own photograph, on their profile. They are the same
 * interaction — choose a file, watch it go, see it, be able to take it off
 * again — and writing it twice is how the two drift apart.
 *
 * It uploads immediately rather than waiting for a form to be submitted. On a
 * Nigerian mobile connection a 2 MB photograph is a real wait, and a teacher
 * who presses Save and sits watching a frozen button assumes it has hung. This
 * way the wait has a spinner on the thing that is actually being waited for,
 * and by the time they reach Save the URL is already in hand.
 *
 * The upload goes to Cloudinary — see `src/lib/cloudinary.ts` for why that and
 * not a Firebase Storage bucket. Where nothing is configured, the control says
 * so plainly instead of failing when the file is chosen.
 */

import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { Spinner, useToast } from '@/components/ui';
import { Hint } from '@/components/ui/Hint';
import { cloudinaryConfigured, deleteImage, imageUrl, uploadImage, type UploadKind } from '@/lib/cloudinary';
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
   * A banner judged in a 96px square tells you nothing about how it will crop
   * across a card, so the preview is drawn at the shape the thing actually is.
   */
  height?: number;
  label?: string;
  hint?: string;
  /** Round for a face, square for a crest. */
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
    const previous = value;
    try {
      const url = await uploadImage(file, kind);
      onChange(url);
      // The replaced file is nobody's now. See `deleteImage` in cloudinary.ts:
      // it never throws, so a tidy-up failure cannot undo a successful upload.
      void deleteImage(previous);
      toast.success('Picture uploaded', 'Remember to save.');
    } catch (error) {
      // `uploadImage` throws sentences written for this moment — the file is
      // too big, it is not an image, Cloudinary is unreachable.
      toast.error('Could not upload it', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      // Clearing it means picking the *same* file again still fires `change`,
      // which it does not otherwise — the classic "it worked once" bug.
      if (input.current) input.current.value = '';
    }
  };

  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <div>
      {label && (
        <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
          {label}
          {hint && cloudinaryConfigured && <Hint label={`About ${label}`}>{hint}</Hint>}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center overflow-hidden border border-hairline surface-sunken',
            rounded,
          )}
          // Shrinks with a narrow screen rather than pushing it sideways, and
          // keeps its shape while it does.
          style={{ width: size, maxWidth: '100%', aspectRatio: `${size} / ${boxHeight}` }}
        >
          {value ? (
            <img
              src={imageUrl(value, { width: size })}
              alt=""
              // A crest is letterboxed so none of it is lost; a banner is
              // cropped, because cropping is exactly what it will do in place
              // and the preview should not flatter it.
              className={cn('h-full w-full', height ? 'object-cover' : 'object-contain')}
              loading="lazy"
            />
          ) : (
            <span className="px-2 text-center text-[11px] font-medium leading-tight text-muted">
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
                    onClick={() => {
                      // Off the record first, then off the account.
                      const going = value;
                      onChange('');
                      void deleteImage(going);
                    }}
                    className="tap inline-flex items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-muted transition-colors hover:text-[#b3261e] disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>

              {hint && !label && <p className="mt-2 text-[12px] leading-relaxed text-muted">{hint}</p>}
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-muted">
              Picture uploads are not set up on this deployment yet. Add{' '}
              {/* `break-all` — these are long unbreakable tokens, and without it
                  they are the widest thing on the page and push it sideways. */}
              <code className="break-all font-mono text-[11.5px]">VITE_CLOUDINARY_CLOUD_NAME</code> and{' '}
              <code className="break-all font-mono text-[11.5px]">VITE_CLOUDINARY_UPLOAD_PRESET</code>, then
              redeploy.
            </p>
          )}

          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => void choose(event.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}
