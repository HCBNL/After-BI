/**
 * The blog: one document per article, at `posts/{slug}`.
 *
 * A root collection, not per organisation, because the blog is AfterBI's own
 * website. `firestore.rules` lets anybody read a published article and only
 * the platform owner write. A draft is refused by the database itself, not
 * merely hidden by the screen.
 *
 * Visitors read over plain HTTPS (`firestoreRest.ts`), so the blog never
 * downloads the database client. The owner's editor uses the SDK.
 *
 * No composite index: the list filters on `status` and is sorted here. A blog
 * is tens of articles, and a page that works the moment it is deployed beats
 * one that waits on a console step.
 */

import { restGet, restWhere } from './firestoreRest';

async function store() {
  const [firestore, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')]);
  return { ...firestore, db };
}

const POSTS = 'posts';
/** Enough for any blog this product will have, and a guard on a runaway read. */
const MAX_POSTS = 100;

export type PostStatus = 'draft' | 'published';

/** Offered in the editor; anything typed is accepted too. */
export const POST_CATEGORIES = ['News', 'Guides', 'Product', 'Distribution', 'Sell-out', 'Finance'] as const;

export interface Post {
  /** The slug, and the document id. `/blog/{id}` is one read, never a query. */
  id: string;
  title: string;
  /** One or two sentences, for the card and the share preview. */
  excerpt: string;
  /** Cover picture, 16:9. */
  cover: string;
  /** Markdown: headings, lists, links, pictures and quotes. */
  body: string;
  status: PostStatus;
  /** ISO date. What the list sorts on. */
  publishedAt: string;
  author: string;
  category: string;
  /** Photographs at the foot of the article, as a swipeable strip. */
  gallery: string[];
  /** A YouTube, Vimeo or uploaded video at the foot of the article. */
  video?: string;
  updatedAt?: string;
}

/** A title, as an address: `/blog/why-sell-in-lies` says what `/blog/aB3x` cannot. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

function hydrate(id: string, data: Record<string, unknown>): Post {
  const text = (key: string, fallback = ''): string => {
    const value = data[key];
    return typeof value === 'string' ? value : fallback;
  };
  const list = (key: string): string[] => {
    const value = data[key];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : [];
  };
  return {
    id,
    title: text('title', 'Untitled'),
    excerpt: text('excerpt'),
    cover: text('cover'),
    body: text('body'),
    status: data.status === 'published' ? 'published' : 'draft',
    publishedAt: text('publishedAt', text('updatedAt')),
    author: text('author', 'AfterBI'),
    category: text('category'),
    gallery: list('gallery'),
    video: text('video') || undefined,
    updatedAt: text('updatedAt') || undefined,
  };
}

const byNewest = (a: Post, b: Post) => (b.publishedAt || '').localeCompare(a.publishedAt || '');

/** Everything a visitor may read, newest first. Never throws. */
export async function listPublishedPosts(): Promise<Post[]> {
  try {
    const rows = await restWhere(POSTS, 'status', 'published', MAX_POSTS);
    return rows.map((row) => hydrate(row.id, row.data)).sort(byNewest);
  } catch {
    return [];
  }
}

/** One article, or null. A draft reads as missing to anybody but the owner. */
export async function getPost(slug: string): Promise<Post | null> {
  const id = slug.trim();
  if (!id) return null;
  try {
    const data = await restGet(`${POSTS}/${encodeURIComponent(id)}`);
    return data ? hydrate(id, data) : null;
  } catch {
    return null;
  }
}

/** Everything, drafts included. The rules refuse this to anybody but the owner. */
export async function listAllPosts(): Promise<Post[]> {
  const { getDocs, query, collection, limit, db } = await store();
  const snap = await getDocs(query(collection(db, POSTS), limit(MAX_POSTS)));
  return snap.docs.map((d) => hydrate(d.id, d.data())).sort(byNewest);
}

export async function savePost(post: Post): Promise<Post> {
  const id = post.id.trim() || slugifyTitle(post.title);
  if (!id) throw new Error('Give the article a title first. The address is made from it.');
  const row: Post = {
    ...post,
    id,
    title: post.title.trim(),
    excerpt: post.excerpt.trim(),
    category: post.category.trim(),
    gallery: (post.gallery ?? []).map((url) => url.trim()).filter(Boolean),
    video: post.video?.trim() || undefined,
    publishedAt: post.publishedAt || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
  const { setDoc, doc, db } = await store();
  await setDoc(doc(db, POSTS, id), row);
  return row;
}

export async function deletePost(slug: string): Promise<void> {
  const { deleteDoc, doc, db } = await store();
  await deleteDoc(doc(db, POSTS, slug));
}

/* ----------------------------------------------------------- for the page */

/** "12 March 2026": written out, because 12/03 is read two ways. */
export function postDate(iso: string): string {
  if (!iso) return '';
  const when = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(when.getTime())) return '';
  return when.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "4 min read", at 200 words a minute. */
export function readingTime(body: string): string {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

/* ------------------------------------------- kept on the device between visits */

const POSTS_CACHE = 'ab.blog-posts';

export function cachedPosts(): Post[] | undefined {
  try {
    const raw = localStorage.getItem(POSTS_CACHE);
    const posts = raw ? (JSON.parse(raw) as Post[]) : undefined;
    return posts && posts.length > 0 ? posts : undefined;
  } catch {
    return undefined;
  }
}

export function rememberPosts(posts: Post[]): void {
  if (posts.length === 0) return;
  try {
    localStorage.setItem(POSTS_CACHE, JSON.stringify(posts.slice(0, 30)));
  } catch {
    /* storage full or blocked: the next visit fetches */
  }
}
