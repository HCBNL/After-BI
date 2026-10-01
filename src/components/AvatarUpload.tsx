/**
 * The avatar *is* the button.
 *
 * This replaced a separate "Your photograph" card sitting under the profile —
 * a labelled box with a preview, a Change button, a Remove button and a line
 * of hint text. It worked, and it was wrong: it made a two-second job look
 * like a form, it duplicated a picture that was already on the screen directly
 * above it, and on a phone the whole card was wide enough to push the page
 * sideways.
 *
 * Every app anybody already uses does this the same way — tap your own face, a
 * small camera badge says you can. Nothing to read, nothing to scroll past.
 *
 * It saves the moment the upload finishes. There is no second Save button and
 * there should not be: a picture that visibly uploaded and then silently
 * needed confirming somewhere else is how people end up with no photograph and
 * no idea why.
 */

import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Avatar, Spinner, useToast } from '@/components/ui';
import { cloudinaryConfigured, deleteImage, imageUrl, uploadImage } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';

export function AvatarUpload({
  name,
  value,
  onChange,
  size = 96,
  className,
}: {
  name: string;
  value?: string;
  /** Called with the new URL, or '' when the picture is taken off. */
  onChange: (url: string) => Promise<void> | void;
  size?: number;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const previous = value;
    try {
      await onChange(await uploadImage(file, 'photo'));
      // The old picture is nobody's now. Off the account with it, after the
      // new one has saved, so a failure halfway leaves the old one in place.
      void deleteImage(previous);
    } catch (error) {
      // `uploadImage` throws sentences written for this moment — too big, not
      // an image, Cloudinary unreachable.
      toast.error('Could not upload it', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      // Clearing it means picking the *same* file again still fires `change`,
      // which it does not otherwise — the classic "it worked once" bug.
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    const previous = value;
    try {
      await onChange('');
      void deleteImage(previous);
    } catch (error) {
      toast.error('Could not remove it', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Nothing configured: show the face, and no controls that cannot work.
  if (!cloudinaryConfigured) {
    return <Avatar name={name} src={value} size="xl" className={className} />;
  }

  return (
    /*
     * `max-w-full` and the padded box are the fix for the page going sideways.
     *
     * The camera badge and the bin sat on the circle's outer edge, half of each
     * hanging past it. Inside a card with 16px of padding on a 360px phone that
     * is enough to make the whole page scroll horizontally, which is what broke
     * the profile the moment a photograph was added. The badges are inset now,
     * so nothing reaches past the circle at all.
     */
    <div
      className={cn('relative inline-block max-w-full shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={value ? 'Change your photograph' : 'Add a photograph'}
        className="group relative block h-full w-full overflow-hidden rounded-full border border-hairline bg-[var(--surface-sunken)] transition-opacity disabled:opacity-70"
      >
        {value ? (
          <img
            src={imageUrl(value, { width: size })}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-brand-100 text-[24px] font-bold text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">
            {name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join('')}
          </span>
        )}

        {/* Only on a mouse. A phone has no hover and would never show it. */}
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
          <Camera size={20} className="text-white" />
        </span>

        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--surface-page)]/75">
            <Spinner size={20} className="text-brand-600 dark:text-brand-400" />
          </span>
        )}
      </button>

      {/*
        The badge, which is the whole affordance on a phone.

        `pointer-events-none` so a tap anywhere on the avatar — badge included
        — opens the file picker, rather than the badge swallowing the tap and
        doing nothing.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-0.5 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface-card)] bg-brand-600 text-white shadow-sm dark:bg-brand-500"
      >
        <Camera size={15} />
      </span>

      {value && (
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          aria-label="Remove your photograph"
          title="Remove"
          className="absolute -bottom-0.5 left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface-card)] bg-[var(--surface-sunken)] text-muted shadow-sm transition-colors hover:text-[#b3261e] disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
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
