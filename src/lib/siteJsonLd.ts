/**
 * Structured data for the public pages.
 *
 * WHY IT IS NOT IN `Seo.tsx`
 *
 * The same reason `siteMeta.ts` exists. `Seo` is reached from the eager
 * sign-in screen, so anything living beside it is downloaded by every rep
 * opening the app in a depot, and a description of AfterBI as a
 * `SoftwareApplication` with a price on it is of no use whatsoever to somebody
 * who already pays for it and is trying to key an order.
 *
 * `Seo` takes the graph as a prop. These build it, and only the public pages
 * import them, so the bundler keeps them in the public site's own chunk.
 */

import { BRAND, SITE_URL } from './siteMeta';
import { FOUNDER, PROMISE } from './site';

/**
 * The founder's address in the graph: a real anchor on the About page.
 *
 * `/about#founder` is both the node's id and a link a citation can point at,
 * and it is the same id on every page, so the Organization on the front page
 * and the Person on the About page are one connected pair of entities.
 */
export const FOUNDER_ID = `${SITE_URL}/#founder`;

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
        description: PROMISE,
        /* By reference, not by value. The Person is a node of its own below,
           so the founder and the company are one linked pair of entities
           rather than a name repeated inside a company record, which is what
           lets a search for either one reinforce the other. */
        founder: { '@id': FOUNDER_ID },
        parentOrganization: { '@type': 'Organization', name: 'Contoric' },
      },
      founderNode(),
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
          price: '75000',
          priceCurrency: 'NGN',
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  };
}

/**
 * The founder, as an entity in his own right.
 *
 * `@id` is what makes this work: the Organization above points at this node by
 * that id rather than restating the name, so the two are a linked pair and a
 * citation of either can be tied to the other. `sameAs` does the same job
 * outwards, to profiles elsewhere.
 *
 * Exported as well as used in the home graph, because the About page, the
 * page a person searching the name will actually land on, declares it too.
 */
function founderNode(extra?: { image?: string; sameAs?: string[] }): Record<string, unknown> {
  const sameAs = (extra?.sameAs ?? []).filter((link) => /^https?:\/\//i.test(link));
  return {
    '@type': 'Person',
    '@id': FOUNDER_ID,
    name: FOUNDER.name,
    alternateName: [...FOUNDER.alternateName],
    jobTitle: FOUNDER.role,
    description: FOUNDER.bio,
    url: FOUNDER_ID,
    worksFor: { '@id': `${SITE_URL}/#organization` },
    knowsAbout: [...FOUNDER.knowsAbout],
    ...(extra?.image ? { image: extra.image } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/**
 * The trail a search result prints in place of the raw address:
 * "AfterBI › About" rather than a URL.
 */
export function breadcrumbJsonLd(path: string, name: string): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${SITE_URL}${path}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: BRAND, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
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
