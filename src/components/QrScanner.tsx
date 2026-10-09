/**
 * A QR scanner in the page: the phone's back camera, read frame by frame.
 *
 * Uses the browser's own BarcodeDetector where there is one (Chrome on
 * Android), and the small `jsqr` library everywhere else (iPhone Safari), so
 * nobody needs a separate scanner app. Nothing is recorded or uploaded: each
 * frame is read in memory and dropped.
 */

import { useEffect, useRef, useState } from 'react';
import { CameraOff, X } from 'lucide-react';

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let done = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot open the camera. Type the number printed on the card instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch {
        setError('The camera was not allowed. Allow it in your browser settings, or type the number printed on the card.');
        return;
      }
      const el = video.current;
      if (!el || done) return;
      el.srcObject = stream;
      await el.play().catch(() => undefined);

      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      const native = Native ? new Native({ formats: ['qr_code'] }) : null;
      const jsQR = native ? null : (await import('jsqr')).default;

      const tick = async () => {
        if (done) return;
        if (el.readyState >= 2 && el.videoWidth) {
          let text = '';
          if (native) {
            const found = await native.detect(el).catch(() => []);
            text = found[0]?.rawValue ?? '';
          } else if (jsQR && ctx) {
            const w = Math.min(640, el.videoWidth);
            const h = Math.round((el.videoHeight / el.videoWidth) * w);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(el, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? '';
          }
          if (text) {
            done = true;
            navigator.vibrate?.(60);
            onResult(text);
            return;
          }
        }
        raf = requestAnimationFrame(() => void tick());
      };
      void tick();
    };
    void start();

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label="Scan a QR code">
      <div className="flex items-center justify-between px-4 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <p className="text-[14px] font-semibold">Point the camera at the QR square</p>
        <button type="button" onClick={onClose} aria-label="Close the scanner" className="tap inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <X size={20} />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="max-w-xs px-6 text-center text-white">
            <CameraOff size={30} className="mx-auto mb-3 text-white/70" aria-hidden />
            <p className="text-[14px] leading-relaxed">{error}</p>
            <button type="button" onClick={onClose} className="tap mt-5 rounded-xl bg-white px-5 text-[14px] font-bold text-black">
              Type it instead
            </button>
          </div>
        ) : (
          <>
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
            <div className="relative h-64 w-64 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {['left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl'].map((c) => (
                <span key={c} className={`absolute h-10 w-10 border-white ${c}`} />
              ))}
              <span className="verify-scanline absolute inset-x-4 h-0.5 rounded bg-[#ee3644] shadow-[0_0_12px_#ee3644]" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
