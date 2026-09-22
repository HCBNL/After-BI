/**
 * Platform → Website → the landing page's cover.
 *
 * Slides are added, filled and put in order here, and published with the
 * page's one Publish button like everything else on it. The two frames at the
 * top draw the real banner component — a laptop and a phone — from the slides
 * as they are being typed, so a cover is seen by the person setting it before
 * anybody else sees it.
 *
 * WHY THE PREVIEW IS THE REAL COMPONENT AT ITS REAL SIZE
 *
 * A mock-up of a banner is a second implementation, and a second
 * implementation is one that will be wrong within a month. This draws
 * `BannerStage` itself at 1440 × 810 and scales the whole thing down with a
 * transform, which means the type, the veil, the dots and the crop are the
 * ones that will actually ship. The component sets its type from container
 * queries rather than screen widths precisely so that a shrunken laptop frame
 * still reads like a laptop.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react';
import { ImagePicker } from '@/components/ImagePicker';
import { Button, Field, Input, SegmentedControl, Switch, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { uploadVideo, videoUrl } from '@/lib/cloudinary';
import { bannerHasContent, newBanner, type SiteBanner } from '@/lib/siteDoc';
import { DEFAULT_BANNER } from '@/lib/site';
import { BannerStage, type BannerFit } from '@/components/marketing/Banner';
import { Wordmark } from '@/components/brand/Wordmark';

const MAX_SLIDES = 6;

export function BannerEditor({
  slides,
  onChange,
}: {
  slides: SiteBanner[];
  onChange: (next: SiteBanner[]) => void;
}) {
  const update = (id: string, patch: Partial<SiteBanner>) =>
    onChange(slides.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));

  const move = (from: number, step: -1 | 1) => {
    const to = from + step;
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const ready = slides.filter(bannerHasContent);

  return (
    <div>
      <BannerPreview slides={ready.length ? ready : DEFAULT_BANNER} />
      {ready.length === 0 && (
        <p className="mt-3 text-[13px] text-muted">
          No slides yet, so the landing page shows the built-in one above. Add a slide to replace it.
        </p>
      )}

      <ol className="mt-6 space-y-4">
        {slides.map((slide, index) => (
          <li key={slide.id}>
            <SlideEditor
              slide={slide}
              number={index + 1}
              first={index === 0}
              last={index === slides.length - 1}
              onChange={(patch) => update(slide.id, patch)}
              onMove={(step) => move(index, step)}
              onRemove={() => onChange(slides.filter((item) => item.id !== slide.id))}
            />
          </li>
        ))}
      </ol>

      {slides.length < MAX_SLIDES && (
        <div className="mt-4">
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => onChange([...slides, newBanner()])}>
            Add a slide
          </Button>
        </div>
      )}
    </div>
  );
}

function SlideEditor({
  slide,
  number,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  slide: SiteBanner;
  number: number;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<SiteBanner>) => void;
  onMove: (step: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-hairline p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-bold text-primary">Slide {number}</p>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" icon={<ArrowUp size={15} />} onClick={() => onMove(-1)} disabled={first}>
            Up
          </Button>
          <Button variant="ghost" size="sm" icon={<ArrowDown size={15} />} onClick={() => onMove(1)} disabled={last}>
            Down
          </Button>
          <Button variant="ghost" size="sm" icon={<Trash2 size={15} />} onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <SegmentedControl
          size="sm"
          value={slide.kind}
          onChange={(kind) => onChange({ kind, src: '', mobileSrc: '' })}
          options={[
            { value: 'image', label: 'Picture' },
            { value: 'video', label: 'Video' },
          ]}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        {slide.kind === 'image' ? (
          <>
            <ImagePicker
              label="Wide, for laptops"
              value={slide.src}
              onChange={(url) => onChange({ src: url })}
              kind="cover"
              size={256}
              height={144}
              hint="16:9. 1920 × 1080."
            />
            <ImagePicker
              label="Tall, for phones"
              value={slide.mobileSrc}
              onChange={(url) => onChange({ mobileSrc: url })}
              kind="cover"
              size={108}
              height={192}
              hint="9:16. 1080 × 1920. Optional — without it the wide one is cropped."
            />
          </>
        ) : (
          <>
            <VideoPicker
              label="Wide, for laptops"
              value={slide.src}
              onChange={(url) => onChange({ src: url })}
              width={256}
              height={144}
              hint="16:9. MP4, 8 to 15 seconds, under 10 MB."
            />
            <VideoPicker
              label="Tall, for phones"
              value={slide.mobileSrc}
              onChange={(url) => onChange({ mobileSrc: url })}
              width={108}
              height={192}
              hint="9:16. Optional."
            />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Headline" hint="Optional. The green full stop is added for you.">
          <Input
            value={slide.title}
            onChange={(event) => onChange({ title: event.target.value })}
            maxLength={70}
            placeholder="Know what your channel is actually holding"
          />
        </Field>
        <Field label="Line under it" hint="Optional.">
          <Input
            value={slide.subtitle}
            onChange={(event) => onChange({ subtitle: event.target.value })}
            maxLength={160}
            placeholder="Orders, stock, invoices and sell-out in one place."
          />
        </Field>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:items-center">
        <label className="block">
          <span className="flex items-center justify-between text-[13px] font-semibold text-primary">
            Push the picture back
            <span className="tabular text-muted">{slide.dim}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={85}
            step={5}
            value={slide.dim}
            onChange={(event) => onChange({ dim: Number(event.target.value) })}
            className="mt-2 w-full accent-[#059669]"
          />
          <span className="mt-1 block text-[12px] leading-snug text-muted">
            Higher makes the words easier to read. 0 shows the picture exactly as it is.
          </span>
        </label>
        <Switch
          checked={slide.buttons}
          onChange={(buttons) => onChange({ buttons })}
          label="Show the two buttons"
          description="Book a walkthrough, and See the product."
          hint="Turn them off for a slide that is purely a picture — a depot, a delivery, a trade fair — where the words and the buttons would be competing with the photograph rather than sitting on it."
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- the video */

/** A file the page can play itself, as opposed to a YouTube or Vimeo page. */
function isFileVideo(url: string): boolean {
  return url.includes('/video/upload/') || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

/** Upload a video to Cloudinary, or paste a link to one hosted anywhere. */
export function VideoPicker({
  label,
  hint,
  value,
  onChange,
  width,
  height,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  width: number;
  height: number;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadVideo(file));
      toast.success('Video uploaded', 'Publish the website to put it live.');
    } catch (error) {
      toast.error('Could not upload it', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div style={{ width: Math.max(width, 210) }}>
      <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <div
        className={cn('mt-2 overflow-hidden rounded-xl ring-1 ring-[var(--border-hairline)]', !value && 'poster-glow')}
        style={{ width, height, background: value ? '#0a0c10' : undefined }}
      >
        {value && isFileVideo(value) ? (
          <video
            key={value}
            src={videoUrl(value, 640)}
            muted
            loop
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : value ? (
          <span className="flex h-full items-center justify-center px-2 text-center text-[12px] font-semibold text-white/70">
            Linked video
          </span>
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-[12px] text-white/55">
            No video
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload size={14} />}
          loading={busy}
          onClick={() => input.current?.click()}
        >
          {value ? 'Replace' : 'Upload'}
        </Button>
        {value && !busy && (
          <Button variant="ghost" size="sm" onClick={() => onChange('')}>
            Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value.trim())}
        placeholder="or paste a link to an .mp4"
        className="mt-2 font-mono text-[12px]"
      />
      {hint && <p className="mt-1.5 text-[12px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ the preview */

function BannerPreview({ slides }: { slides: SiteBanner[] }) {
  return (
    <div className="grid items-end gap-5 sm:grid-cols-[1fr_auto]">
      <PreviewFrame width={1440} height={810} fit="wide" slides={slides} label="Laptop" />
      <PreviewFrame
        width={390}
        height={726}
        fit="tall"
        slides={slides}
        label="Phone"
        className="mx-auto w-[150px] sm:w-[170px]"
      />
    </div>
  );
}

/**
 * The real banner at its real size, shrunk to fit. Its type is set by container
 * queries, so the shrunken laptop reads exactly like a laptop.
 */
function PreviewFrame({
  width,
  height,
  fit,
  slides,
  label,
  className,
}: {
  width: number;
  height: number;
  fit: BannerFit;
  slides: SiteBanner[];
  label: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth / width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  return (
    <figure className={className}>
      <div
        ref={box}
        className="relative w-full overflow-hidden rounded-xl bg-[#0a0c10] shadow-card ring-1 ring-black/10"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {scale > 0 && (
          <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
            <BannerStage slides={slides} fit={fit} headingLevel="h2" />
            <PreviewHeader tall={fit === 'tall'} />
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-center text-[12px] font-semibold text-muted">{label}</figcaption>
    </figure>
  );
}

/** The header as it sits over the cover, so a slide is judged with it on. */
function PreviewHeader({ tall }: { tall: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-30 h-16 items-center text-white',
        tall ? 'flex gap-3' : 'grid grid-cols-[1fr_auto_1fr] gap-8',
      )}
      style={{ paddingInline: tall ? 16 : 32 }}
    >
      <Wordmark onInk className="text-[1.45rem]" />
      {!tall && (
        <div className="flex gap-7 text-[14.5px] font-semibold text-white/70">
          <span className="text-white">Home</span>
          <span>Product</span>
          <span>Pricing</span>
          <span>About</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-2 justify-self-end">
        <span className="whitespace-nowrap px-2 text-[14px] font-bold">Sign in</span>
        <span className="whitespace-nowrap rounded-lg bg-brand-600 px-3.5 py-2.5 text-[13.5px] font-bold">
          Book a walkthrough
        </span>
        {tall && (
          <span className="ml-1 flex flex-col gap-[5px] px-2">
            <span className="block h-[2px] w-5 rounded bg-white" />
            <span className="block h-[2px] w-5 rounded bg-white" />
            <span className="block h-[2px] w-5 rounded bg-white" />
          </span>
        )}
      </div>
    </div>
  );
}
