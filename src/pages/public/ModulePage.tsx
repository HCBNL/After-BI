/**
 * `/features/:slug`, one module, on its own address, told as a story (see
 * FeatureStory.tsx and lib/featureStories.ts). An unknown slug renders the 404.
 */

import { useParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { PublicShell } from '@/components/marketing/kit';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { moduleBySlug } from '@/lib/site';
import { featureStory } from '@/lib/featureStories';
import { FeatureStoryBody } from './FeatureStory';
import NotFoundPage from './NotFoundPage';

export default function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const item = moduleBySlug(slug);
  const story = featureStory(item?.slug);

  if (!item || !story) return <NotFoundPage />;

  return (
    <>
      <Seo
        title={item.name}
        description={item.blurb}
        path={`/features/${item.slug}`}
        jsonLd={{ '@context': 'https://schema.org', '@graph': [breadcrumbJsonLd(`/features/${item.slug}`, item.name)] }}
      />
      <PublicShell>
        <FeatureStoryBody story={story} />
      </PublicShell>
    </>
  );
}
