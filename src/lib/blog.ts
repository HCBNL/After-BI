/**
 * The blog: built in articles (lib/blogPosts.ts) and the owner's own
 * (Firestore `blogPosts`, written from the console), merged, newest first.
 *
 * Public reads go over plain HTTPS (firestoreRest.ts): only published
 * articles, which is all the rules allow. The console uses the SDK.
 */
import { restGet, restQuery } from './firestoreRest';
import { BUILT_IN_POSTS, type BlogPostData, type BlogTopic } from './blogPosts';

export type { BlogPostData, BlogTopic } from './blogPosts';

export interface BlogPost extends BlogPostData {
  /** Minutes to read, from the word count. */
  minutes: number;
  /** Written in the console (editable there), rather than built in. */
  own?: boolean;
  status?: 'draft' | 'published';
}

export const TOPICS: { id: BlogTopic; label: string; art: string; ground: string; blurb: string }[] = [
  { id: 'guides', label: 'Guides', art: 'bloom', ground: '#fff1b8', blurb: 'Step by step, from costing to collections.' },
  { id: 'operations', label: 'Operations', art: 'blocks', ground: '#ecd5f5', blurb: 'Depots, stock, transport and power.' },
  { id: 'sales', label: 'Sales', art: 'ribbon', ground: '#fde0d2', blurb: 'Channels, targets and sell-out.' },
  { id: 'finance', label: 'Finance', art: 'orbit', ground: '#dcf7e3', blurb: 'Prices, credit and cash.' },
  { id: 'research', label: 'Research', art: 'spark', ground: '#d7ecff', blurb: 'The numbers behind the business.' },
  { id: 'people', label: 'People', art: 'daisy', ground: '#fff6e5', blurb: 'Teams, reps and managers.' },
  { id: 'product', label: 'Product', art: 'kite', ground: '#ecd5f5', blurb: 'What is new in AfterBI.' },
];

export const topicOf = (id: BlogTopic) => TOPICS.find((t) => t.id === id) ?? TOPICS[0];

export function readMinutes(body: string): number {
  return Math.max(2, Math.round(body.split(/\s+/).length / 220));
}

function finish(p: BlogPostData, own = false): BlogPost {
  return { ...p, minutes: readMinutes(p.body), own };
}

const BUILT = BUILT_IN_POSTS.map((p) => finish(p));

function clean(raw: Record<string, unknown>): BlogPost | null {
  const slug = String(raw.slug ?? raw.id ?? '');
  const title = String(raw.title ?? '');
  const body = String(raw.body ?? '');
  if (!slug || !title || !body) return null;
  const topics = (Array.isArray(raw.topics) ? raw.topics : []).filter((t): t is BlogTopic => TOPICS.some((x) => x.id === t));
  const image = typeof raw.image === 'string' && /^https:\/\//.test(raw.image) ? raw.image : undefined;
  return finish(
    {
      slug,
      title,
      body,
      excerpt: String(raw.excerpt ?? ''),
      topics: topics.length ? topics : ['guides'],
      date: String(raw.date ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      author: String(raw.author ?? 'AfterBI'),
      scene: typeof raw.scene === 'string' ? raw.scene : undefined,
      image,
      ground: typeof raw.ground === 'string' && /^#[0-9a-f]{6}$/i.test(raw.ground) ? raw.ground : undefined,
      featured: raw.featured === true,
      spotlight: raw.spotlight === true,
    },
    true,
  );
}

/** Every published article, newest first. Never throws: falls back to the built in ones. */
export async function listPosts(): Promise<BlogPost[]> {
  let own: BlogPost[] = [];
  try {
    own = (await restQuery('blogPosts', 'status', 'published')).map(clean).filter((p): p is BlogPost => Boolean(p));
  } catch {
    /* offline or refused: the built in articles still show */
  }
  const slugs = new Set(own.map((p) => p.slug));
  return [...own, ...BUILT.filter((p) => !slugs.has(p.slug))].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const raw = await restGet(`blogPosts/${encodeURIComponent(slug)}`);
    if (raw && raw.status === 'published') {
      const p = clean({ ...raw, slug });
      if (p) return p;
    }
  } catch {
    /* fall through */
  }
  return BUILT.find((p) => p.slug === slug) ?? null;
}

export function builtInPosts(): BlogPost[] {
  return BUILT;
}

/* ------------------------------------------------------------ the console */

async function store() {
  const [firestore, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')]);
  return { ...firestore, db };
}

export interface OwnPost extends BlogPostData {
  status: 'draft' | 'published';
  updatedAt?: string;
}

export async function listOwnPosts(): Promise<OwnPost[]> {
  const { collection, getDocs, db } = await store();
  const snap = await getDocs(collection(db, 'blogPosts'));
  return snap.docs.map((d) => ({ ...(d.data() as OwnPost), slug: d.id })).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveOwnPost(post: OwnPost): Promise<void> {
  const { doc, setDoc, db } = await store();
  const { slug, ...rest } = post;
  const data = Object.fromEntries(Object.entries({ ...rest, slug, updatedAt: new Date().toISOString() }).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, 'blogPosts', slug), data);
}

export async function deleteOwnPost(slug: string): Promise<void> {
  const { doc, deleteDoc, db } = await store();
  await deleteDoc(doc(db, 'blogPosts', slug));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
