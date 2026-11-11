/**
 * Platform, Website: the ads that slide on every customer's home screen.
 * One picture each, optional words over it, and the address a tap opens in
 * the browser. Nothing goes live until Publish is pressed on the Website screen.
 */
import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Spinner, Switch, useToast } from '@/components/ui';
import { cloudinaryConfigured, imageUrl, uploadImage } from '@/lib/cloudinary';
import { MAX_APP_ADS, type AppAd } from '@/lib/siteDoc';
import { cn } from '@/lib/cn';

const blank = (): AppAd => ({
  id: Math.random().toString(36).slice(2, 10),
  image: '',
  title: '',
  body: '',
  url: '',
  cta: '',
  live: true,
});

export function AdEditor({ ads, onChange }: { ads: AppAd[]; onChange: (next: AppAd[]) => void }) {
  const set = (i: number, patch: Partial<AppAd>) => onChange(ads.map((ad, j) => (j === i ? { ...ad, ...patch } : ad)));
  const move = (i: number, by: number) => {
    const next = [...ads];
    const [ad] = next.splice(i, 1);
    next.splice(i + by, 0, ad);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {ads.map((ad, i) => (
        <AdRow
          key={ad.id}
          ad={ad}
          first={i === 0}
          last={i === ads.length - 1}
          onChange={(patch) => set(i, patch)}
          onMove={(by) => move(i, by)}
          onRemove={() => onChange(ads.filter((_, j) => j !== i))}
        />
      ))}
      {ads.length < MAX_APP_ADS && (
        <Button variant="outline" size="sm" icon={<Plus size={15} />} onClick={() => onChange([...ads, blank()])}>
          Add an ad
        </Button>
      )}
    </div>
  );
}

function AdRow({
  ad,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  ad: AppAd;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<AppAd>) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange({ image: await uploadImage(file, 'site') });
    } catch (error) {
      toast.error('Could not upload it', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-hairline p-4 md:grid-cols-[minmax(0,18rem)_1fr]">
      <button
        type="button"
        disabled={!cloudinaryConfigured || busy}
        onClick={() => input.current?.click()}
        aria-label={ad.image ? 'Change the picture' : 'Upload the picture'}
        className={cn(
          'relative aspect-[16/7] w-full overflow-hidden rounded-xl border border-dashed',
          ad.image ? 'border-transparent' : 'border-[var(--border-strong)] hover:border-brand-500 hover:bg-[var(--surface-sunken)]',
        )}
      >
        {ad.image ? (
          <img src={imageUrl(ad.image, { width: 600 })} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
            <ImagePlus size={22} aria-hidden />
            <span className="text-caption font-semibold">1600 × 700</span>
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--surface-page)]/75">
            <Spinner size={20} />
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void choose(event.target.files?.[0])}
      />

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title (optional)">
            <Input value={ad.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Payroll is here" />
          </Field>
          <Field label="Button words (optional)">
            <Input value={ad.cta} onChange={(e) => onChange({ cta: e.target.value })} placeholder="Learn more" />
          </Field>
        </div>
        <Field label="Line under the title (optional)">
          <Input value={ad.body} onChange={(e) => onChange({ body: e.target.value })} placeholder="Pay staff by the days they worked." />
        </Field>
        <Field label="Opens">
          <Input
            value={ad.url}
            onChange={(e) => onChange({ url: e.target.value.trim() })}
            placeholder="https://afterbi.com/features/payroll"
            inputMode="url"
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Switch checked={ad.live} onChange={(live) => onChange({ live })} label="Showing" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" icon={<ArrowUp size={15} />} disabled={first} onClick={() => onMove(-1)} aria-label="Move up" />
            <Button variant="ghost" size="sm" icon={<ArrowDown size={15} />} disabled={last} onClick={() => onMove(1)} aria-label="Move down" />
            <Button variant="ghost" size="sm" icon={<Trash2 size={15} />} onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
