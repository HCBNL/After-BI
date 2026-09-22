/**
 * The drawings a module card falls back to.
 *
 * WHY THERE IS NOT A SINGLE STOCK PHOTOGRAPH ON THIS SITE
 *
 * Every picture on the public pages is the owner's, uploaded in Platform →
 * Website. Until one is, a module draws its own glyph on a dark panel rather
 * than a grey box with a broken-image icon in it — a designed state, not a
 * gap. That is what lets the console fill the eight covers one at a time
 * instead of all at once.
 *
 * The honest stock photograph for this product is a man in a hard hat pointing
 * at a pallet, and every visitor has seen it on four other websites this week.
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { imageUrl } from '@/lib/cloudinary';
import type { ModuleArt } from '@/lib/site';

/* =========================================================== the module tiles */

/**
 * A small drawing per module, for the cards on the shelf.
 *
 * Each one is the shape of the screen it stands for rather than an icon of a
 * noun: a card for Orders is a sheet with lines on it, not a picture of a
 * shopping trolley. Eight drawings sharing one grammar — a panel, a rule, a
 * green mark on the thing that matters — so a row of them reads as a set.
 */
export function ModuleGlyph({ art, className }: { art: ModuleArt; className?: string }) {
  const line = 'rgba(255,255,255,0.22)';
  const faint = 'rgba(255,255,255,0.1)';
  const green = '#10b981';

  const body = () => {
    switch (art) {
      case 'orders':
        return (
          <>
            <rect x="18" y="14" width="84" height="72" rx="6" fill={faint} />
            {[26, 38, 50, 62].map((y) => (
              <rect key={y} x="27" y={y} width={y === 62 ? 32 : 66} height="4" rx="2" fill={line} />
            ))}
            <rect x="27" y="72" width="48" height="5" rx="2.5" fill={green} />
          </>
        );
      case 'sellout':
        return (
          <>
            <rect x="14" y="52" width="14" height="34" rx="3" fill={line} />
            <rect x="34" y="42" width="14" height="44" rx="3" fill={line} />
            <rect x="54" y="30" width="14" height="56" rx="3" fill={line} />
            <rect x="74" y="20" width="14" height="66" rx="3" fill={green} />
            <path d="M14 40 L40 34 L64 22 L92 12" stroke={green} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55" />
          </>
        );
      case 'stock':
        return (
          <>
            {[
              [20, 52],
              [48, 52],
              [76, 52],
              [34, 24],
              [62, 24],
            ].map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="24" height="24" rx="3" fill={line} />
            ))}
            <rect x="20" y="80" width="80" height="5" rx="2.5" fill={green} />
          </>
        );
      case 'invoices':
        return (
          <>
            <path d="M22 12 h60 a4 4 0 0 1 4 4 v68 l-8-6 -8 6 -8-6 -8 6 -8-6 -8 6 v-68 a4 4 0 0 1 4-4 z" fill={faint} />
            {[26, 38, 50].map((y) => (
              <rect key={y} x="32" y={y} width="44" height="4" rx="2" fill={line} />
            ))}
            <rect x="32" y="62" width="30" height="5" rx="2.5" fill={green} />
          </>
        );
      case 'credit':
        return (
          <>
            <rect x="14" y="26" width="84" height="52" rx="7" fill={faint} />
            <rect x="14" y="38" width="84" height="9" fill={line} />
            <rect x="24" y="58" width="34" height="5" rx="2.5" fill={line} />
            <circle cx="82" cy="61" r="9" fill={green} opacity="0.85" />
          </>
        );
      case 'deliveries':
        return (
          <>
            <rect x="12" y="34" width="46" height="32" rx="4" fill={faint} />
            <path d="M60 44 h16 l12 12 v10 H60 z" fill={faint} />
            <circle cx="30" cy="72" r="8" fill={line} />
            <circle cx="76" cy="72" r="8" fill={line} />
            <rect x="12" y="78" width="88" height="4" rx="2" fill={green} />
          </>
        );
      case 'targets':
        return (
          <>
            <circle cx="56" cy="50" r="34" fill="none" stroke={faint} strokeWidth="10" />
            <circle
              cx="56"
              cy="50"
              r="34"
              fill="none"
              stroke={green}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="160 214"
              transform="rotate(-90 56 50)"
            />
            <circle cx="56" cy="50" r="10" fill={line} />
          </>
        );
      case 'partner':
        return (
          <>
            <rect x="16" y="20" width="36" height="66" rx="5" fill={faint} />
            <rect x="60" y="20" width="36" height="66" rx="5" fill={faint} />
            <rect x="24" y="32" width="20" height="4" rx="2" fill={line} />
            <rect x="24" y="42" width="14" height="4" rx="2" fill={line} />
            <rect x="68" y="32" width="20" height="4" rx="2" fill={line} />
            <rect x="68" y="42" width="14" height="4" rx="2" fill={line} />
            <rect x="24" y="70" width="20" height="5" rx="2.5" fill={green} />
            <rect x="68" y="70" width="20" height="5" rx="2.5" fill={green} />
          </>
        );
    }
  };

  return (
    <svg viewBox="0 0 112 100" className={className} aria-hidden focusable="false">
      {body()}
    </svg>
  );
}

/**
 * A module's cover: the owner's picture if there is one, the glyph if not.
 *
 * WHY THE GLYPH IS NOT A PLACEHOLDER
 *
 * The obvious build is a grey box with an icon in it, which reads as "a
 * photograph is missing" and makes a half-filled set look broken — so the
 * pictures then have to be filled in all at once or not at all. Drawn this way
 * the empty state is a designed panel: the module's own glyph on ink, with the
 * ruled ground behind it. A shelf of eight glyphs looks deliberate, a shelf of
 * eight photographs looks deliberate, and so does any mixture, which is what
 * lets the console fill them one at a time.
 *
 * A picture that 404s falls back to the same glyph rather than a broken image
 * icon: an owner who deletes a file in Cloudinary should cost the front page
 * nothing worse than a change of illustration.
 */
export function ModuleCover({
  art,
  image,
  width = 640,
  priority,
  className,
  glyphClassName,
}: {
  art: ModuleArt;
  image?: string;
  width?: number;
  priority?: boolean;
  className?: string;
  glyphClassName?: string;
}) {
  const url = image?.trim() ? imageUrl(image, { width }) : '';
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  const broken = Boolean(url) && failed === url;
  const showGlyph = !url || broken;

  return (
    <div className={cn('relative overflow-hidden bg-[#11151b]', className)}>
      {showGlyph ? (
        <>
          <div className="ink-rule pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <ModuleGlyph
            art={art}
            className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', glyphClassName)}
          />
        </>
      ) : (
        <img
          key={url}
          src={url}
          alt=""
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          onLoad={() => setLoaded(url)}
          onError={() => setFailed(url)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            loaded === url ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
