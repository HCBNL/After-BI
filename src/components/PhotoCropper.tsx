/**
 * Frame a face for an ID card: drag to move, slide (or pinch the slider) to
 * zoom, inside a fixed 3:4 window. Everything happens on this device; the
 * result is a JPEG data URL handed back through `onChange`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const VIEW_W = 240;
const VIEW_H = 320;
const OUT_W = 600;
const OUT_H = 800;

export function PhotoCropper({ src, onChange }: { src: string; onChange: (dataUrl: string) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  /* Load the picture and centre it, filling the frame. */
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setPos({ x: 0, y: 0 });
    };
    image.src = src;
  }, [src]);

  /* The scale at zoom 1: the picture just covers the frame. */
  const base = img ? Math.max(VIEW_W / img.naturalWidth, VIEW_H / img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : 0;
  const h = img ? img.naturalHeight * scale : 0;

  /* Keep the frame covered: never let an edge of the picture inside it. */
  const clamp = useCallback(
    (p: { x: number; y: number }) => ({
      x: Math.min((w - VIEW_W) / 2, Math.max(-(w - VIEW_W) / 2, p.x)),
      y: Math.min((h - VIEW_H) / 2, Math.max(-(h - VIEW_H) / 2, p.y)),
    }),
    [w, h],
  );

  /* Render the framed part at full size whenever it changes. */
  useEffect(() => {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const k = OUT_W / VIEW_W;
    const left = VIEW_W / 2 - w / 2 + pos.x;
    const top = VIEW_H / 2 - h / 2 + pos.y;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.drawImage(img, left * k, top * k, w * k, h * k);
    const timer = window.setTimeout(() => onChange(canvas.toDataURL('image/jpeg', 0.88)), 120);
    return () => window.clearTimeout(timer);
  }, [img, w, h, pos, onChange]);

  useEffect(() => setPos((p) => clamp(p)), [zoom, clamp]);

  const onDown = (event: React.PointerEvent) => {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: pos.x, oy: pos.y };
  };
  const onMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y }));
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative cursor-grab touch-none overflow-hidden rounded-xl bg-[var(--surface-sunken)] ring-2 ring-brand-600 active:cursor-grabbing"
        style={{ width: VIEW_W, height: VIEW_H }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {img && (
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none"
            style={{ width: w, height: h, left: VIEW_W / 2 - w / 2 + pos.x, top: VIEW_H / 2 - h / 2 + pos.y }}
          />
        )}
        {/* A face guide: the oval the face should fill. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[14%] h-[56%] w-[58%] -translate-x-1/2 rounded-[50%] border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]"
        />
      </div>
      <div className="flex w-full max-w-[240px] items-center gap-2">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.1))} className="tap rounded-lg p-1 text-secondary hover:text-primary">
          <Minus size={16} />
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full accent-brand-600"
        />
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="tap rounded-lg p-1 text-secondary hover:text-primary">
          <Plus size={16} />
        </button>
      </div>
      <p className="text-[12px] text-muted">Drag to move. Fit the face inside the oval.</p>
    </div>
  );
}
