/**
 * The header at the top of Features, Pricing, About and Partners.
 *
 * One design, drawn in code, the same on every page: the crumb trail and the
 * headline on the left, and on the right the mark, large and cropped, over a
 * dot grid. Nothing is uploaded for it and nothing
 * has to load, so it is there on the first frame and never changes shape.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { BRAND } from '@/lib/seo';
import { Mark } from '@/components/brand/Mark';
import { container } from './tokens';

export interface Crumb {
  label: string;
  to?: string;
}

/** The crumb trail, drawn as well as marked up. */
export function Crumbs({ trail }: { trail: Crumb[] }) {
  const items: Crumb[] = [{ label: BRAND, to: '/' }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
            {index > 0 && (
              <span aria-hidden className="text-white/35">
                /
              </span>
            )}
            {last || !item.to ? (
              <span aria-current={last ? 'page' : undefined} className="text-white">
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="text-white/60 transition-colors hover:text-white">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * The header's backdrop: night navy, a soft light behind the mark, a dot
 * grid fading out towards the words, and the mark itself, large and cropped
 * on the right. Nothing else. No frame and no red wash behind
 * the headline, so the words sit on clean navy. Drawn in code: nothing to
 * upload, nothing to load, identical on every page.
 */
function HeaderArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-night">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(40% 85% at 84% 50%, rgba(60,70,140,0.22), transparent 70%)',
        }}
      />
      {/* Dot grid, fading out to the left so the headline sits on plain navy. */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1.2px)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(90deg, transparent 0%, transparent 30%, #000 65%, #000 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, transparent 30%, #000 65%, #000 100%)',
        }}
      />
      {/* The mark, whole, inside the header and lined up with the page's right
          edge. Sized to the header's height so no screen ever cuts it off. */}
      <div className="absolute inset-0 mx-auto max-w-7xl">
        <div className="absolute right-3 top-1/2 aspect-square h-[62%] -translate-y-1/2 opacity-[0.12] sm:right-8 sm:h-[78%] sm:opacity-[0.11] lg:h-[86%]">
          <Mark size={320} className="h-full w-full text-white" />
        </div>
      </div>
      {/* A hairline under the header, so it ends cleanly into the page. */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/8" />
    </div>
  );
}

const headline =
  'font-display text-[2.5rem] font-extrabold leading-[1] tracking-[-0.05em] text-white sm:text-[3.6rem] lg:text-[4.2rem]';

/**
 * Every public page's opening, the same on all of them: the crumb trail, the
 * headline on the left, the designed backdrop with the mark on the right.
 * `children` sits under the words (the pricing calculator, the partner
 * buttons).
 */
export function PageCover({
  title,
  heading,
  lead,
  trail,
  children,
  className,
  tight,
}: {
  /** The page's headline, as plain text. A red full stop is added. */
  title: string;
  /** Drawn in place of `title` when the headline needs styling of its own. */
  heading?: ReactNode;
  /** One short line under the headline. */
  lead?: ReactNode;
  trail: Crumb[];
  children?: ReactNode;
  className?: string;
  /** Less room underneath, when what follows belongs with what is above. */
  tight?: boolean;
}) {
  return (
    <section className={cn('relative isolate overflow-hidden', className)}>
      <HeaderArt />
      <div className={cn(container, 'pt-8 sm:pt-12', tight ? 'pb-6 sm:pb-8' : 'pb-14 sm:pb-20')}>
        <Crumbs trail={trail} />
        <div className="max-w-[40rem] animate-fade-up">
          <h1 className={cn(headline, 'mt-8 sm:mt-10')}>
            {heading ?? (
              <>
                {title}
                <span className="text-brand-500">.</span>
              </>
            )}
          </h1>
          {lead && <p className="mt-5 max-w-[34rem] text-[16.5px] leading-[1.6] text-white/72 sm:text-[18px]">{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
