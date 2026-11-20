/**
 * The camera, full screen, looking for an AfterBI carton sticker.
 *
 * HOW A COUNTER USES IT
 *
 * Tap Scan, hold the phone over the sticker so the bars sit inside the box,
 * and it reads by itself: a buzz, a click, and the product opens. No button
 * to press at the moment of reading, because the other hand is on a carton.
 *
 * WHAT IT DOES NOT TRUST
 *
 * Every read goes to `resolve`, which the screen that opened the scanner
 * supplies. A barcode that is not an AfterBI sticker of this company, or one
 * no product carries, is said so on the screen and the camera keeps looking.
 * The same wrong sticker is not reported again for a few seconds, so a
 * counter is not shouted at while they move the phone off it.
 *
 * WHEN THE CAMERA CANNOT BE USED
 *
 * Permission refused, no camera, an old browser: the code printed under the
 * bars can be typed, and a photograph of the sticker can be read instead.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Flashlight, Keyboard, ScanLine, X, ZoomIn } from 'lucide-react';
import { Button, Input, Spinner } from '@/components/ui';
import { getReader, scanFeedback, type Reader } from '@/lib/scanner';
import { cn } from '@/lib/cn';

export type ScanVerdict = { ok: true } | { ok: false; message: string };

interface TorchCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step?: number };
}

export function BarcodeScanner({
  open,
  onClose,
  resolve,
  title = 'Scan a carton sticker',
}: {
  open: boolean;
  onClose: () => void;
  /** Decide what a read means. Return ok to stop scanning (the caller closes the scanner). */
  resolve: (text: string) => ScanVerdict;
  title?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const crop = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const reader = useRef<Reader | null>(null);
  const timer = useRef<number | null>(null);
  const done = useRef(false);
  const lastBad = useRef<{ text: string; at: number } | null>(null);
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  const [phase, setPhase] = useState<'starting' | 'live' | 'blocked'>('starting');
  const [problem, setProblem] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [torch, setTorch] = useState<boolean | null>(null);
  const [zoom, setZoom] = useState<{ value: number; max: number } | null>(null);
  const [reading, setReading] = useState(false);

  /* One place every read goes through: camera frame, photo or typed. */
  const handle = useCallback((text: string, fromCamera: boolean): boolean => {
    if (done.current) return true;
    const verdict = resolveRef.current(text);
    if (verdict.ok) {
      done.current = true;
      scanFeedback(true);
      return true;
    }
    const now = Date.now();
    if (fromCamera && lastBad.current && lastBad.current.text === text && now - lastBad.current.at < 3000) return false;
    lastBad.current = { text, at: now };
    scanFeedback(false);
    setMessage(verdict.message);
    return false;
  }, []);

  const stop = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    done.current = false;
    lastBad.current = null;
    setPhase('starting');
    setProblem(null);
    setMessage(null);
    setTyping(false);
    setTyped('');
    setTorch(null);
    setZoom(null);
    let cancelled = false;

    /* Only the middle band (the box on screen) is read: faster, and the maker's barcode beside it is ignored. */
    const frame = (): HTMLCanvasElement | HTMLVideoElement | null => {
      const v = video.current;
      if (!v || !v.videoWidth) return null;
      const c = crop.current ?? (crop.current = document.createElement('canvas'));
      const w = Math.round(v.videoWidth * 0.9);
      const h = Math.round(v.videoHeight * 0.5);
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return v;
      ctx.drawImage(v, (v.videoWidth - w) / 2, (v.videoHeight - h) / 2, w, h, 0, 0, w, h);
      return c;
    };

    const tick = async () => {
      if (cancelled || done.current) return;
      const r = reader.current;
      const source = frame();
      if (r && source) {
        try {
          const texts = await r.read(source);
          for (const text of texts) if (handle(text, true)) return;
        } catch {
          /* One bad frame is not worth stopping for. */
        }
      }
      if (!cancelled && !done.current) timer.current = window.setTimeout(() => void tick(), reader.current?.kind === 'native' ? 90 : 160);
    };

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setPhase('blocked');
        setProblem('This browser cannot open the camera here. Type the code under the bars, or read a photo of the sticker.');
        return;
      }
      try {
        const [media, r] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          }),
          getReader(),
        ]);
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = media;
        reader.current = r;
        const track = media.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as TorchCapabilities;
        if (caps.torch) setTorch(false);
        if (caps.zoom && caps.zoom.max >= 2) setZoom({ value: 1, max: Math.min(caps.zoom.max, 4) });
        try {
          await track?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] });
        } catch {
          /* Not every camera lets the page choose its focus. */
        }
        const v = video.current;
        if (v) {
          v.srcObject = media;
          v.setAttribute('playsinline', 'true');
          v.muted = true;
          await v.play().catch(() => undefined);
        }
        setPhase('live');
        void tick();
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        setPhase('blocked');
        setProblem(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'The camera was not allowed. Allow it for this site in your browser settings, then try again. Until then, type the code or read a photo.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'No camera was found on this device. Type the code under the bars, or read a photo of the sticker.'
              : 'The camera could not start. Close other apps using it and try again, or type the code.',
        );
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, handle, stop]);

  /* A message fades so the next read's message is noticed. */
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(t);
  }, [message]);

  /* Escape closes, as every other overlay in the app does. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const track = () => stream.current?.getVideoTracks()[0];

  const toggleTorch = async () => {
    const t = track();
    if (!t || torch === null) return;
    try {
      await t.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorch(null);
    }
  };

  const toggleZoom = async () => {
    const t = track();
    if (!t || !zoom) return;
    const next = zoom.value >= 2 ? 1 : 2;
    try {
      await t.applyConstraints({ advanced: [{ zoom: next } as MediaTrackConstraintSet] });
      setZoom({ ...zoom, value: next });
    } catch {
      setZoom(null);
    }
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    handle(typed, false);
  };

  const readPhoto = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      const r = reader.current ?? (await getReader());
      reader.current = r;
      const texts = await r.read(file);
      if (!texts.length) {
        scanFeedback(false);
        setMessage('No sticker barcode was found in that photo. Hold the phone closer and keep the bars straight.');
        return;
      }
      for (const text of texts) if (handle(text, false)) return;
    } catch {
      setMessage('That photo could not be read. Try again, or type the code.');
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={video} className="absolute inset-0 h-full w-full object-cover" playsInline muted />

        {/* The box: bars go inside it. The rest of the picture is dimmed. */}
        {phase !== 'blocked' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[38%] max-h-[260px] w-[88%] max-w-[640px] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {(['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl'] as const).map((corner) => (
                <span key={corner} className={cn('absolute h-9 w-9 border-white', corner)} />
              ))}
              {phase === 'live' && <span className="scan-line absolute inset-x-4 top-1/2 h-0.5 bg-[var(--color-brand-400)] opacity-90" />}
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-[max(env(safe-area-inset-top),14px)]">
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur" aria-label="Close the scanner">
            <X size={22} />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-body font-semibold">{title}</p>
          {torch !== null ? (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              className={cn('flex h-11 w-11 items-center justify-center rounded-full backdrop-blur', torch ? 'bg-white text-black' : 'bg-white/15')}
              aria-label={torch ? 'Torch off' : 'Torch on'}
            >
              <Flashlight size={20} />
            </button>
          ) : (
            <span className="h-11 w-11" />
          )}
        </div>

        {phase === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Spinner size={26} />
            <p className="text-label text-white/80">Opening the camera…</p>
          </div>
        )}

        {phase === 'blocked' && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm rounded-2xl bg-white/10 p-5 text-center backdrop-blur">
              <Camera size={28} className="mx-auto mb-3 opacity-80" />
              <p className="text-body leading-relaxed">{problem}</p>
            </div>
          </div>
        )}

        {message && (
          <div className="absolute inset-x-4 top-[calc(50%+min(19vh,130px)+14px)] mx-auto max-w-md rounded-xl bg-[#d03b3b] px-4 py-3 text-center text-label font-semibold shadow-lg">
            {message}
          </div>
        )}
      </div>

      <div className="space-y-3 bg-black px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4">
        {phase === 'live' && !typing && (
          <p className="flex items-center justify-center gap-2 text-center text-label text-white/80">
            <ScanLine size={16} aria-hidden />
            Hold the bars inside the box. It reads by itself.
          </p>
        )}

        {typing || phase === 'blocked' ? (
          <form onSubmit={submitTyped} className="mx-auto flex max-w-md gap-2">
            <Input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              placeholder="AB K7M2QX 4"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-label="Sticker code"
              className="notranslate font-mono tracking-[0.12em]"
            />
            <Button type="submit" disabled={!typed.trim()}>
              Find
            </Button>
          </form>
        ) : null}

        <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2">
          {phase !== 'blocked' && (
            <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" icon={<Keyboard size={15} />} onClick={() => setTyping((t) => !t)}>
              {typing ? 'Hide typing' : 'Type the code'}
            </Button>
          )}
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-white/30 px-3 text-label font-semibold hover:bg-white/10">
            {reading ? <Spinner size={15} /> : <Camera size={15} />}
            Read a photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void readPhoto(e.target.files?.[0])} />
          </label>
          {zoom && (
            <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" icon={<ZoomIn size={15} />} onClick={() => void toggleZoom()}>
              {zoom.value >= 2 ? 'Zoom 1×' : 'Zoom 2×'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
