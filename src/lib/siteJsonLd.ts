/**
 * Structured data for the public pages.
 *
 * WHY IT IS NOT IN `Seo.tsx`
 *
 * The same reason `siteMeta.ts` exists. `Seo` is reached from the eager
 * sign-in screen, so anything living beside it is downloaded by every rep
 * opening the app in a depot — and a description of AfterBI as a
 * `SoftwareApplication` with a price on it is of no use whatsoever to somebody
 * who already pays for it and is trying to key an order.
 *
 * `Seo` takes the graph as a prop. These build it, and only the public pages
 * import them, so the bundler keeps them in the public site's own chunk.
 */

import { BRAND, SITE_URL } from './siteMeta';

/**
 * The front page's graph: the organisation, the site and the product.
 *
 * One graph with `@id` references between the three rather than three separate
 * scripts, because that is what tells a crawler the SoftwareApplication and
 * the Organization are the same business rather than two things that happen to
 * share a name.
 */
export function homeJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: BRAND,
        url: SITE_URL,
        description:
          'Distribution management software for fast-moving consumer goods: orders, stock, invoices, credit and sell-out.',
        areaServed: 'NG',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: BRAND,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#app`,
        name: BRAND,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers: {
          '@type': 'Offer',
          price: '180000',
          priceCurrency: 'NGN',
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  };
}

/**
 * The questions on a page, marked up as the questions they are.
 *
 * Returned without `@context`, because it is only ever added to a graph that
 * already declares one. A nested context is legal and parses, but it reads as
 * two documents stapled together and there is no reason to ship one.
 *
 * Only the page that actually renders these questions may claim them: marking
 * up an FAQ that is not on the page is the kind of thing that gets rich
 * results turned off for a whole domain.
 */
export function faqJsonLd(items: { q: string; a: string }[]): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
