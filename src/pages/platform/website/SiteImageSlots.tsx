/**
 * Platform, Website: every picture on the public site, one upload tile each.
 *
 * The slots come from SITE_IMAGES in lib/site.ts, grouped by where they show.
 * Each tile is drawn at the shape the site draws it, says what goes there
 * behind its (i), and uploads straight to Cloudinary. Nothing goes live until
 * Publish is pressed on the Website screen.
 */

import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { Badge, Hint, Spinner, useToast } from '@/components/ui';
import { cloudinaryConfigured, imageUrl, uploadImage } from '@/lib/cloudinary';
import { SITE_IMAGES, SLOT_GROUPS, type SiteSlot } from '@/lib/site';
import { cn } from '@/lib/cn';

export function SiteImageSlots({
  images,
  onChange,
}: {
  images: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const entries = Object.entries(SITE_IMAGES);
  const done = entries.filter(([key]) => images[key]).length;

  const set = (key: string, url: string) => {
    const next = { ...images };
    if (url) next[key] = url;
    else delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={done === entries.length ? 'good' : 'brand'}>
          {done} of {entries.length} pictures added
        </Badge>
        <Hint label="About website pictures">
          Every box below is one picture on the public website, drawn at the shape the site shows it. Tap the (i) on a box to
          see where it appears and what to put in it. Keep each file under 2 MB (JPG or WebP at the size given). An empty box
          shows a designed stand in, so the site never looks broken. Press Publish at the top when you are done.
        </Hint>
      </div>

      {!cloudinaryConfigured && (
        <p className="rounded-xl border border-hairline surface-sunken px-4 py-3 text-label text-secondary">
          Picture uploads are not set up on this deployment. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET
          in Vercel, then redeploy.
        </p>
      )}

      {SLOT_GROUPS.map((group) => {
        const slots = entries.filter(([, slot]) => slot.group === group);
        if (!slots.length) return null;
        const filled = slots.filter(([key]) => images[key]).length;
        return (
          <section key={group}>
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-hairline pb-2">
              <h3 className="text-body font-semibold text-primary">{group}</h3>
              <span className="text-caption font-semibold text-muted">
                {filled} of {slots.length}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {slots.map(([key, slot]) => (
                <SlotTile key={key} slotKey={key} slot={slot} value={images[key] ?? ''} onChange={(url) => set(key, url)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SlotTile({
  slotKey,
  slot,
  value,
  onChange,
}: {
  slotKey: string;
  slot: SiteSlot;
  value: string;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, 'site'));
      toast.success('Picture uploaded', `${slot.label}. Press Publish to put it live.`);
    } catch (error) {
      toast.error('Could not upload it', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-hairline surface-card p-3 shadow-card">
      <div className="mb-2 flex items-center gap-1.5">
        <p className="min-w-0 flex-1 truncate text-label font-semibold text-primary">{slot.label}</p>
        <Hint label={`About ${slot.label}`} align="right">
          {slot.what} Export at {slot.size} pixels. Slot name: {slotKey}.
        </Hint>
      </div>

      <button
        type="button"
        disabled={!cloudinaryConfigured || busy}
        onClick={() => input.current?.click()}
        aria-label={value ? `Change the ${slot.label} picture` : `Upload the ${slot.label} picture`}
        className={cn(
          'relative w-full overflow-hidden rounded-xl border border-dashed transition-colors',
          value ? 'border-transparent' : 'border-[var(--border-strong)] hover:border-brand-500 hover:bg-[var(--surface-sunken)]',
        )}
        style={{ aspectRatio: slot.ratio }}
      >
        {value ? (
          <img src={imageUrl(value, { width: 320 })} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
            <ImagePlus size={22} aria-hidden />
            <span className="text-caption font-semibold">{slot.size}</span>
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--surface-page)]/75">
            <Spinner size={20} className="text-brand-600 dark:text-brand-400" />
          </span>
        )}
      </button>

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          type="button"
          disabled={!cloudinaryConfigured || busy}
          onClick={() => input.current?.click()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-2.5 text-label font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary disabled:opacity-50"
        >
          <Upload size={13} aria-hidden />
          {value ? 'Change' : 'Upload'}
        </button>
        {value && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChange('')}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-label font-semibold text-muted transition-colors hover:text-status-critical disabled:opacity-50"
          >
            <Trash2 size={13} aria-hidden />
            Remove
          </button>
        )}
        {value && <span className="ml-auto h-2 w-2 rounded-full bg-status-good" aria-label="Added" />}
      </div>

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
