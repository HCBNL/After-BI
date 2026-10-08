/** Upload a video to Cloudinary, or paste a YouTube, Vimeo or .mp4 link. */
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, Input, useToast } from '@/components/ui';
import { uploadVideo, videoUrl } from '@/lib/cloudinary';

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
      toast.success('Video uploaded', 'Save the website to publish it.');
    } catch (error) {
      toast.error('Could not upload it', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div style={{ width: Math.max(width, 210) }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">{label}</p>
      <div
        className="mt-2 overflow-hidden rounded-xl bg-[#0a0c10] ring-1 ring-[var(--border-hairline)]"
        style={{ width, height }}
      >
        {value && isFileVideo(value) ? (
          <video key={value} src={videoUrl(value, 640)} muted loop autoPlay playsInline className="h-full w-full object-cover" />
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
        <Button variant="secondary" size="sm" icon={<Upload size={14} />} loading={busy} onClick={() => input.current?.click()}>
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
        placeholder="or paste a YouTube, Vimeo or .mp4 link"
        className="mt-2 font-mono text-[12px]"
      />
      {hint && <p className="mt-1.5 text-[12px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}
