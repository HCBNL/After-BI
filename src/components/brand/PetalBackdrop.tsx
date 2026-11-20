/**
 * The owner's petals as a backdrop: four petals top right, a large daisy
 * bottom left, and on a laptop a scalloped flower top left and four round
 * petals bottom right, each turning very slowly. First drawn for the PIN lock
 * screen; also behind the sign-in and password reset screens.
 *
 * It paints in `currentColor` at low opacity, so the caller sets the tint:
 * `text-white` on a coloured panel, the ink colour on a light page.
 */
import { cn } from '@/lib/cn';

export function PetalBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-0 overflow-hidden', className)}>
      {/* four petals, top right */}
      <svg viewBox="0 0 100 100" className="lock-art lock-spin absolute -right-[9vmin] -top-[7vmin] h-[34vmin] w-[34vmin] min-h-[170px] min-w-[170px] lg:-right-[4vmin] lg:-top-[6vmin] lg:h-[46vmin] lg:w-[46vmin]" fill="currentColor">
        {[0, 90, 180, 270].map((r) => (
          <path key={r} d="M50 50 Q22 18 50 4 Q78 18 50 50 Z" transform={`rotate(${r} 50 50)`} opacity="0.1" />
        ))}
      </svg>
      {/* daisy, bottom left */}
      <svg viewBox="0 0 100 100" className="lock-art lock-spin-back absolute -bottom-[10vmin] -left-[12vmin] h-[48vmin] w-[48vmin] min-h-[230px] min-w-[230px] lg:-bottom-[12vmin] lg:-left-[6vmin] lg:h-[58vmin] lg:w-[58vmin]" fill="currentColor" opacity="0.08">
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <ellipse key={r} cx="50" cy="26" rx="14" ry="24" transform={`rotate(${r} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="22" />
      </svg>
      {/* laptop only: scalloped flower, top left */}
      <svg viewBox="0 0 100 100" className="lock-art lock-spin-back absolute left-[7vw] top-[12dvh] hidden h-[22vmin] w-[22vmin] lg:block" fill="currentColor" opacity="0.07">
        <circle cx="50" cy="50" r="36" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={i} cx={50 + 33 * Math.cos(a)} cy={50 + 33 * Math.sin(a)} r="15" />;
        })}
      </svg>
      {/* laptop only: four round petals, bottom right */}
      <svg viewBox="0 0 100 100" className="lock-art lock-spin absolute bottom-[9dvh] right-[8vw] hidden h-[26vmin] w-[26vmin] lg:block" fill="currentColor" opacity="0.08">
        {[0, 90, 180, 270].map((r) => (
          <ellipse key={r} cx="50" cy="27" rx="18" ry="25" transform={`rotate(${r} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="22" />
      </svg>
      {/* one dashed ring, for a little movement in the eye */}
      <svg viewBox="0 0 100 100" className="lock-art absolute -right-[6vmin] top-[52%] h-[30vmin] w-[30vmin] min-h-[150px] min-w-[150px] lg:right-[22vw] lg:top-[8dvh] lg:h-[14vmin] lg:w-[14vmin]" fill="none">
        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.2" strokeDasharray="4 6" className="lock-spin" style={{ transformOrigin: '50px 50px' }} />
      </svg>
    </div>
  );
}
