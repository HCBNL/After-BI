/**
 * `site/home` — the one document the landing page reads.
 *
 * WHY IT IS OUTSIDE EVERY TENANT
 *
 * Everything else in this database lives under `orgs/{orgId}`, because
 * everything else belongs to a customer. This does not. The landing page is
 * AfterBI's own shop window: one document, at the root, written by the
 * platform owner from Platform → Website and read by anybody at all, signed in
 * or not. `firestore.rules` says exactly that — public read, owner write — and
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
 * The static copy — headlines, the FAQ, the plans — is NOT in here. It lives in
 * `lib/site.ts` and ships in the bundle, so the words paint on the first frame
 * with no read at all. Only the pictures are owner-published, because only the
 * pictures actually change between deployments.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

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
   * The cover, up to six slides. Empty draws the built-in one — words on the
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

  /** The picture on the About page, beside the story. 4:5, 1000 × 1250. */
  aboutImage?: string;

  /** The image a shared link shows. 1200 × 630. Falls back to /og.png. */
  shareImage?: string;

  updatedAt?: string;
}

export const EMPTY_HOME: SiteHome = {
  banners: [],
  moduleImages: {},
  aboutImage: '',
  shareImage: '',
};

/** A slide with neither a picture nor words is not a slide yet. */
export function bannerHasContent(slide: Partial<SiteBanner> | undefined): boolean {
  return Boolean(slide && (slide.src?.trim() || slide.title?.trim() || slide.subtitle?.trim()));
}

/** A new, empty slide, with the defaults a first-time slide wants. */
export function newBanner(): SiteBanner {
  return {
    id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    kind: 'image',
    src: '',
    mobileSrc: '',
    title: '',
    subtitle: '',
    /* 55 rather than 0: the overwhelmingly common first upload is a bright
       photograph of a depot or a truck, and white words on it are unreadable
       until it is pushed back. Somebody who wants the picture exactly as shot
       can drag it to 0; somebody who does not know the control exists still
       gets a legible banner. */
    dim: 55,
    buttons: true,
  };
}

/**
 * What the landing page should show. Never throws — see the note at the top.
 */
export async function getSiteHome(): Promise<SiteHome> {
  try {
    const snap = await getDoc(doc(db, SITE, 'home'));
    return snap.exists() ? { ...EMPTY_HOME, ...(snap.data() as Partial<SiteHome>) } : EMPTY_HOME;
  } catch {
    return EMPTY_HOME;
  }
}

/** Publish. Merged, so a field this build does not know about is not wiped. */
export async function saveSiteHome(patch: Partial<SiteHome>): Promise<void> {
  await setDoc(doc(db, SITE, 'home'), { ...patch, updatedAt: new Date().toISOString() }, { merge: true });
}
