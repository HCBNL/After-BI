/**
 * The school's own logo — the real one, or nothing at all.
 *
 * This is deliberately not `Crest`. `Crest` used to *draw* a shield with
 * invented initials and an invented year for any school that had not uploaded
 * anything, which is every school on its first day, and it went onto the
 * report card PDF where a parent would take it for their child's school badge.
 * A placeholder that looks like real content is worse than an obvious gap.
 *
 * So this renders a school's uploaded logo and, when there is none, renders
 * nothing. The school's name is already beside it in words, which is what a
 * parent actually reads and what nobody can get wrong.
 *
 * `Crest`/`Mark` stays what it is: GetSchool's own mark, for GetSchool's own
 * surfaces — the product page and the sign-in screen.
 */

import { imageUrl } from '@/lib/cloudinary';
import type { SchoolSettings } from '@/types';

export function SchoolLogo({
  school,
  size = 44,
  className,
}: {
  school: SchoolSettings;
  size?: number;
  className?: string;
}) {
  if (!school.logoURL) return null;

  return (
    <img
      src={imageUrl(school.logoURL, { width: size })}
      alt={`${school.name} logo`}
      width={size}
      height={size}
      // `contain`, never `cover`: a school's logo is usually wider than it is
      // tall and cropping one is how you cut the top off a crest.
      className={className ?? 'shrink-0 object-contain'}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
