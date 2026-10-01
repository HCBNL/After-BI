/**
 * `/roles`: what every person in a distribution business does inside AfterBI.
 *
 * The same written role guides as the portal's Help screen, on the public
 * site, because a buyer's first question after "what does it do" is "what
 * will my finance manager actually do in it". It is also a page a search for
 * "distribution software roles" can land on.
 */
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { RoleCards } from '@/components/guide/RoleCards';
import { ROLE_GUIDES } from '@/lib/guide';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { SITE_URL } from '@/lib/siteMeta';

export default function RolesPage() {
  return (
    <PublicShell>
      <Seo
        title="Roles: who does what"
        description="Super admin, finance manager, operations manager, warehouse manager, sales rep and distributor: what each role does inside AfterBI, day by day."
        path="/roles"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': `${SITE_URL}/roles#page`,
              url: `${SITE_URL}/roles`,
              name: 'Roles in AfterBI',
              isPartOf: { '@id': `${SITE_URL}/#website` },
              about: ROLE_GUIDES.map((guide) => ({ '@type': 'Occupation', name: guide.name, description: guide.purpose })),
            },
            breadcrumbJsonLd('/roles', 'Roles'),
          ],
        }}
      />
      <Body />
    </PublicShell>
  );
}

function Body() {
  const { book } = useAsk();
  return (
    <>
      <section className="relative isolate overflow-hidden pb-10 pt-28 sm:pb-14 sm:pt-32">
        <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
        <div className={container}>
          <Reveal>
            <Headline as="h1" size="lg" className="max-w-4xl">
              Everyone sees their part of the business, and only that
            </Headline>
            <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-white/65">
              AfterBI is set up around the people in a distribution business. Each role opens to the screens its job
              needs, a brief of what to do first, and step by step help for everything else.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
          <RoleCards />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={book} className={btn.green}>
              Book a walkthrough
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
