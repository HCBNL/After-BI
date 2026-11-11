/**
 * `site/home`, the one document the landing page reads.
 *
 * WHY IT IS OUTSIDE EVERY TENANT
 *
 * Everything else in this database lives under `orgs/{orgId}`, because
 * everything else belongs to a customer. This does not. The landing page is
 * AfterBI's own shop window: one document, at the root, written by the
 * platform owner from Platform → Website and read by anybody at all, signed in
 * or not. `firestore.rules` says exactly that, public read, owner write, and
 * it is the only public-read document in the database.
 *
 * WHY THE WHOLE THING IS OPTIONAL
 *
 * A fresh deployment has no `site/home` at all, and the landing page has to be
 * perfect on that deployment: it is the one every evaluation starts from.
 * `getSiteHome` never throws and answers a missing document, a refused read
 * and a dropped connection with the same empty record, which the banner draws
 * as its designed fallback. A marketing page that shows an error instead of
 * itself because a picture could not be looked up is worse than one with no
 * pictures.
 *
 * The static copy, headlines, the FAQ, the plans, is NOT in here. It lives in
 * `lib/site.ts` and ships in the bundle, so the words paint on the first frame
 * with no read at all. Only the pictures are owner-published, because only the
 * pictures actually change between deployments.
 */

import { restGet } from './firestoreRest';
import type { CustomBuild, PartnerSettings } from './programme';

/** The SDK, fetched only by the owner's console when it writes. */
async function store() {
  const [firestore, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')]);
  return { ...firestore, db };
}

/** The root collection. One document in it, and that is by design. */
const SITE = 'site';

/**
 * One slide of the landing page's cover.
 *
 * Every field is always written, as an empty string rather than left out,
 * because Firestore refuses a document with an `undefined` anywhere in it.
 */
export interface SiteBanner {
  id: string;
  kind: 'image' | 'video';
  /** Laptops and desktops. 16:9, 1920 × 1080. A picture, or an .mp4 for video. */
  src: string;
  /** Phones. 9:16, 1080 × 1920. Optional: without it the wide one is cropped. */
  mobileSrc: string;
  /** Optional. The green rule is drawn under the last word for you. */
  title: string;
  subtitle: string;
  /** How far the picture is pushed back behind the words, 0 to 85. */
  dim: number;
  /** Draw "Book a walkthrough" and "See the product" on this slide. */
  buttons: boolean;
}

/**
 * What the landing page shows.
 *
 * Deliberately small. Every field here is a picture or a link to one; there is
 * no copy in this document, so a wrong click in the console cannot empty the
 * front page of its words.
 */
export interface SiteHome {
  /**
   * The cover, up to six slides. Empty draws the built-in one, words on the
   * drifting green light. See `components/marketing/Banner.tsx` for the sizes
   * it wants and why.
   */
  banners?: SiteBanner[];

  /**
   * One cover picture per module, keyed by the module's slug. 16:9, 1600 × 900.
   * A module with none draws its own glyph on an ink panel, which is a designed
   * state rather than a gap: see `ModuleGlyph`.
   */
  moduleImages?: Record<string, string>;

  /**
   * Every other picture on the public site, keyed by slot (see SITE_IMAGES in
   * lib/site.ts). Uploaded from Platform, Website. An empty or missing slot
   * draws its built in stand in.
   */
  images?: Record<string, string>;

  /** The picture on the About page, beside the story. 4:5, 1000 × 1250. */
  aboutImage?: string;

  /** The image a shared link shows. 1200 × 630. Falls back to /og.png. */
  shareImage?: string;

  /**
   * The founder's own photograph, beside his name on the About page. 4:5.
   * Optional: without it the section is words only, and the structured data
   * still names him as the founder.
   */
  aboutFounder?: string;

  /**
   * The founder's profiles elsewhere (LinkedIn, X, an article that cites him),
   * one address per line. They become the `sameAs` list of the Person record on
   * the About page, which is how a search engine ties those pages to the name.
   */
  founderLinks?: string;

  /**
   * Walkthrough videos on the front page, up to four. A YouTube or Vimeo link,
   * or a video uploaded here. An empty list draws no row at all.
   */
  videos?: SiteVideo[];

  /** Where "follow us" points. A channel with no address draws nothing. */
  social?: SiteSocial;

  /** The AfterBI Custom card on the Pricing page. Missing reads as the default. */
  customBuild?: Partial<CustomBuild>;

  /** The Partner Programme page: the reward, the packages and partners' words. */
  partners?: PartnerSettings;

  /** AfterBI's own ads, sliding on every customer's home screen. See `AppAd`. */
  appAds?: AppAd[];

  updatedAt?: string;
}

/**
 * One ad on the in-app home screen. The picture is the ad (16:7, 1600 × 700,
 * words baked in or written over it); tapping it opens `url` in the browser.
 */
export interface AppAd {
  id: string;
  image: string;
  /** Optional words over the picture. Empty draws the picture alone. */
  title: string;
  body: string;
  /** Where a tap goes. Empty makes the card a picture only. */
  url: string;
  /** The button's words. Empty reads "Learn more". */
  cta: string;
  /** Off keeps it in the console without showing it. */
  live: boolean;
}

export const MAX_APP_ADS = 6;

/**
 * An ad's address made safe to put in a link: http or https only. "afterbi.com/x"
 * is completed to https; anything else (javascript:, data:) reads as no link.
 */
export function adLink(url: string | undefined): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '';
  return /^[\w-]+(\.[\w-]+)+/.test(raw) ? `https://${raw}` : '';
}

/** The ads worth drawing: live, with a picture, and a link that is safe to follow. */
export function liveAds(home: SiteHome | null | undefined): AppAd[] {
  return (home?.appAds ?? [])
    .filter((ad) => ad?.live && typeof ad.image === 'string' && /^https:\/\//i.test(ad.image))
    .slice(0, MAX_APP_ADS)
    .map((ad) => ({ ...ad, title: ad.title ?? '', body: ad.body ?? '', cta: ad.cta ?? '', url: adLink(ad.url) }));
}

/** One walkthrough on the front page. */
export interface SiteVideo {
  /** YouTube, Vimeo, or a direct video file: `parseVideo` decides which. */
  url: string;
  /** The line on the card. Empty reads "Watch the walkthrough". */
  title?: string;
}

export interface SiteSocial {
  whatsapp?: string;
  linkedin?: string;
  x?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export const MAX_HOME_VIDEOS = 4;

export const EMPTY_HOME: SiteHome = {
  banners: [],
  moduleImages: {},
  images: {},
  aboutImage: '',
  shareImage: '',
  aboutFounder: '',
  founderLinks: '',
  videos: [],
  social: {},
};

/** The videos worth drawing: entries with no address are dropped here. */
export function homeVideos(home: SiteHome | null | undefined): SiteVideo[] {
  return (home?.videos ?? []).filter((video) => video?.url?.trim()).slice(0, MAX_HOME_VIDEOS);
}

/**
 * What the public pages should show. Never throws.
 *
 * Read over plain HTTPS (`firestoreRest.ts`), so the front page never
 * downloads the database client.
 */
export async function getSiteHome(): Promise<SiteHome> {
  try {
    const data = await restGet('site/home');
    return data ? { ...EMPTY_HOME, ...(data as Partial<SiteHome>) } : EMPTY_HOME;
  } catch {
    return EMPTY_HOME;
  }
}

/**
 * The same document for the owner's console, through the SDK, because the
 * console needs what is there this second and is already signed in.
 */
export async function getSiteHomeLive(): Promise<SiteHome> {
  const { doc, getDoc, db } = await store();
  const snap = await getDoc(doc(db, SITE, 'home'));
  return snap.exists() ? { ...EMPTY_HOME, ...(snap.data() as Partial<SiteHome>) } : EMPTY_HOME;
}

/** Publish. Merged, so a field this build does not know about is not wiped. */
export async function saveSiteHome(patch: Partial<SiteHome>): Promise<void> {
  const { doc, setDoc, db } = await store();
  await setDoc(doc(db, SITE, 'home'), { ...patch, updatedAt: new Date().toISOString() }, { merge: true });
}
