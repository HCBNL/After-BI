/**
 * What a search engine and a shared link see.
 *
 * React 19 hoists `<title>`, `<meta>` and `<link>` rendered anywhere in the
 * tree up into `<head>`, so a page can declare its own metadata next to its own
 * content instead of a separate component reaching across the app to mutate the
 * document. Rendering a second page unmounts the first one's tags, which is
 * what makes this correct on a client-routed site — the old description does
 * not linger on the new page.
 *
 * The school's real name comes from `settings/school`, so the same build gives
 * Bright Future International their own title without a rebuild.
 */

import { useSchoolBrand } from '@/context/BrandContext';
import { imageUrl } from '@/lib/cloudinary';

/** Canonical origin. Set VITE_SITE_URL in Vercel; falls back to the live domain. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://getschool.app').replace(/\/$/, '');

export interface SeoProps {
  /** Page title, without the school name — that is appended. */
  title: string;
  description: string;
  /** Path only, e.g. "/admissions". */
  path: string;
  /** Absolute URL of a share image. Defaults to the school's crest. */
  image?: string;
  /** Set on pages that should not be indexed — the portal, the login screen. */
  noindex?: boolean;
  /**
   * A favicon for this route only.
   *
   * The product page needs one: `BrandContext` points the site-wide icon at the
   * school's uploaded crest, which is right for the school's own pages and
   * wrong for GetSchool's, where the red mark is the whole point of a browser
   * tab. React hoists this link and removes it again on the next route.
   */
  icon?: string;
  /**
   * Override the site name in the title and og:site_name.
   *
   * The school's pages are titled "Admissions · Bright Future"; the product's
   * own pages belong to GetSchool, not to whichever school this deployment is
   * showing.
   */
  siteName?: string;
  /** Extra structured data for this page, merged into the graph. */
  jsonLd?: Record<string, unknown>;
}

export function Seo({ title, description, path, image, noindex, icon, siteName, jsonLd }: SeoProps) {
  const school = useSchoolBrand();

  const site = siteName ?? school.name;
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`;
  /*
   * Brand first on a front door, subject first everywhere else.
   *
   * "GetSchool — School Management…" is what should come back for somebody
   * typing the name. "Blog · GetSchool" is what should come back for somebody
   * searching a topic: the words they searched for are at the front of the
   * result, where a person scanning ten blue links actually reads.
   */
  const isFrontDoor = path === '/' || path === '/school';
  /*
   * An empty `siteName` means the title stands alone.
   *
   * The front door is titled with the brand and nothing else, so appending the
   * brand again produced "GetSchool · GetSchool". Every other page still gets
   * "Subject · GetSchool", which is what puts the searched words at the front
   * of the result.
   */
  const fullTitle = !site
    ? title
    : isFrontDoor
      ? `${site} · ${title}`
      : `${title} · ${site}`;
  const shareImage = image ?? (school.logoURL ? imageUrl(school.logoURL, { width: 600 }) : undefined);

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {icon && <link rel="icon" type={icon.endsWith('.svg') ? 'image/svg+xml' : undefined} href={icon} />}

      {/*
        One language, no single country.

        This used to declare `en-NG`, which tells a crawler the site is meant
        for Nigeria and to rank it accordingly everywhere else. The product is
        built for the way schools work across Africa, so the language is
        declared and the country is not; `x-default` points at the same page,
        which is the correct answer for a site with one language edition.
      */}
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={site} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en" />
      {shareImage && <meta property="og:image" content={shareImage} />}

      <meta name="twitter:card" content={shareImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {shareImage && <meta name="twitter:image" content={shareImage} />}

      {jsonLd && (
        <script
          type="application/ld+json"
          // `<` escaped so a blog title containing `</script>` cannot close
          // this tag and run as markup; JSON parsers read \u003c as `<`.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
    </>
  );
}

