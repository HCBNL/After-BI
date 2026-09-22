/**
 * What a search engine and a pasted link see.
 *
 * React 19 hoists `<title>`, `<meta>` and `<link>` rendered anywhere in the
 * tree into `<head>`, so a page declares its own metadata beside its own
 * content rather than a separate component reaching across the app to mutate
 * the document. Rendering the next page unmounts the previous page's tags,
 * which is what makes this correct on a client-routed site: the old
 * description does not linger on the new page.
 *
 * Only the public pages use this. The portal is `noindex` by definition — it
 * is somebody's orders — and says so via `noindex` on the sign-in screen.
 */

/* `siteMeta`, never `site`: this module is reached from the eager sign-in
   screen, and `site.ts` is thirty kilobytes of marketing copy. */
import { BRAND, SITE_URL } from '@/lib/siteMeta';

export interface SeoProps {
  /** The page's own title, without the brand. That is appended. */
  title: string;
  description: string;
  /** Path only, e.g. "/pricing". */
  path: string;
  /** Absolute URL of a share image. */
  image?: string;
  /** Set on anything that should not be indexed: sign in, the portal. */
  noindex?: boolean;
  /** Extra structured data for this page. */
  jsonLd?: Record<string, unknown>;
}

export function Seo({ title, description, path, image, noindex, jsonLd }: SeoProps) {
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`;

  /*
   * Brand first on the front door, subject first everywhere else.
   *
   * "AfterBI — distribution management" is what should come back for somebody
   * typing the name. "Pricing · AfterBI" is what should come back for somebody
   * searching a topic: the words they searched are at the front of the result,
   * which is where a person scanning ten blue links actually reads.
   */
  const fullTitle = path === '/' ? title : `${title} · ${BRAND}`;
  const share = image ?? `${SITE_URL}/og.png`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/*
        One language, no single country.

        Declaring `en-NG` tells a crawler the site is meant for Nigeria and to
        rank it accordingly everywhere else. The product is built for the way
        distribution works across West Africa and sold beyond one market, so
        the language is declared and the country is not.
      */}
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={BRAND} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en" />
      <meta property="og:image" content={share} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={share} />

      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}
