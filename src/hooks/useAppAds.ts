/**
 * AfterBI's live ads for the home screen, read once per visit from the public
 * `site/home` document (plain HTTPS, no listener). Any failure reads as no ads,
 * and the carousel simply is not drawn.
 */
import { useEffect, useState } from 'react';
import { getSiteHome, liveAds, type AppAd } from '@/lib/siteDoc';

let cached: Promise<AppAd[]> | null = null;

export function useAppAds(): AppAd[] {
  const [ads, setAds] = useState<AppAd[]>([]);
  useEffect(() => {
    let alive = true;
    cached ??= getSiteHome().then(liveAds);
    void cached.then((list) => alive && setAds(list));
    return () => {
      alive = false;
    };
  }, []);
  return ads;
}
