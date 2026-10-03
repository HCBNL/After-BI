/**
 * Build the picture carousel that sits at the foot of an article.
 *
 * `ImagePicker` sets one picture; this sets an ordered list of them. Each is
 * uploaded to Cloudinary the moment it is chosen, the same reasoning as
 * `ImagePicker`, that a wait on a Nigerian connection wants a spinner on the
 * thing being waited for, and the order the pictures sit in here is the order
 * they will scroll in. A picture removed here is taken off Cloudinary too, so
 * the account does not silently fill with orphans.
 *
 * Several files can be chosen at once; they upload one after another rather
 * than all at once, which keeps a phone from trying to push six photographs up
 * a thin uplink in parallel and timing every one of them out.
 */

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react';
import { Spinner, useToast } from '@/components/ui';
import { cloudinaryConfigured, imageUrl, uploadImage } from '@/lib/cloudinary';

export function GalleryManager({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const add = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const added: string[] = [];
    try {
      // One at a time, on purpose, see the note at the top.
      for (const file of Array.from(files)) {
        added.push(await uploadImage(file, 'site'));
      }
      onChange([...value, ...added]);
      toast.success(
        added.length > 1 ? `${added.length} pictures added` : 'Picture added',
        'Remember to save the article.',
      );
    } catch (error) {
      // Keep whatever did upload before the failure.
      if (added.length) onChange([...value, ...added]);
      toast.error('Could not upload one of them', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  if (!cloudinaryConfigured) {
    return (
      <p className="text-[12.5px] leading-relaxed text-muted">
        Picture uploads are not set up on this deployment yet. Add{' '}
        <code className="break-all font-mono text-[11.5px]">VITE_CLOUDINARY_CLOUD_NAME</code> and{' '}
        <code className="break-all font-mono text-[11.5px]">VITE_CLOUDINARY_UPLOAD_PRESET</code>, then redeploy.
      </p>
    );
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative overflow-hidden rounded-xl border border-hairline surface-sunken"
              style={{ aspectRatio: '16 / 9' }}
            >
              <img
                src={imageUrl(url, { width: 320 })}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/45 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || busy}
                    aria-label="Move earlier"
                    className="rounded-md p-1 text-white/90 hover:bg-white/20 disabled:opacity-30"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1 || busy}
                    aria-label="Move later"
                    className="rounded-md p-1 text-white/90 hover:bg-white/20 disabled:opacity-30"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  disabled={busy}
                  aria-label="Remove picture"
                  className="rounded-md p-1 text-white/90 hover:bg-white/20 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="tap inline-flex items-center gap-1.5 rounded-xl border border-hairline px-3.5 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary disabled:opacity-50"
      >
        {busy ? <Spinner size={14} className="text-brand-600 dark:text-brand-400" /> : <ImagePlus size={15} />}
        {busy ? 'Uploading…' : value.length ? 'Add more' : 'Add pictures'}
      </button>

      <input
        ref={input}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => void add(event.target.files)}
      />
    </div>
  );
}
