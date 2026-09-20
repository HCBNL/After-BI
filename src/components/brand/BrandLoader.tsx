import { MarkLoading } from './Mark';

/** One mark turning in the middle of the page while a screen's data arrives. */
export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[55dvh] flex-col items-center justify-center gap-3" aria-live="polite">
      <MarkLoading size={40} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
