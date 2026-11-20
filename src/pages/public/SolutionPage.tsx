/**
 * `/solutions/<slug>`: one kind of business, told as a story with the same
 * layout as a feature page (see FeatureStory.tsx). An unknown slug renders
 * the 404.
 */

import { useParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { PublicShell } from '@/components/marketing/kit';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { SOLUTIONS } from '@/lib/site';
import { solutionStory } from '@/lib/featureStories';
import { FeatureStoryBody } from './FeatureStory';
import NotFoundPage from './NotFoundPage';

export default function SolutionPage() {
  const { slug } = useParams<{ slug: string }>();
  const item = SOLUTIONS.find((s) => s.slug === slug);
  const story = solutionStory(slug);
  if (!item || !story) return <NotFoundPage />;

  return (
    <>
      <Seo
        title={item.name}
        description={item.blurb}
        path={`/solutions/${item.slug}`}
        jsonLd={{ '@context': 'https://schema.org', '@graph': [breadcrumbJsonLd(`/solutions/${item.slug}`, item.name)] }}
      />
      <PublicShell>
        <FeatureStoryBody story={story} />
      </PublicShell>
    </>
  );
}
