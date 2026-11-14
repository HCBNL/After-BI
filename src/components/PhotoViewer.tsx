/**
 * A picture on its own, enlarged over a dimmed page: nothing else in the box.
 * A tap outside it, or Escape, puts it away. Sized to the screen: most of a
 * phone's width, never taller than most of the window.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function PhotoViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
    >
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[82vh] w-auto max-w-[min(88vw,30rem)] animate-scale-in rounded-3xl object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
      />
    </div>,
    document.body,
  );
}
