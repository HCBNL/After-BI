/**
 * /blog/:slug: one article. Same bar and footer as the blog, the article in a
 * comfortable reading width, share buttons, and three more to read.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Link2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useAsync } from '@/hooks/useAsync';
import { useBootDone } from '@/lib/boot';
import { builtInPosts, getPost, listPosts, topicOf, type BlogPost } from '@/lib/blog';
import { SITE_URL } from '@/lib/siteMeta';
import { Author, BlogShell, Cover, PostCard, Prose, ReadTime, Tags, prettyDate } from './parts';

export default function BlogArticle() {
  const { slug = '' } = useParams();
  const builtIn = useMemo(() => builtInPosts().find((p) => p.slug === slug) ?? null, [slug]);
  const { data: fetched, loading } = useAsync(() => getPost(slug), [slug], { handleError: true });
  const { data: all } = useAsync(listPosts, [], { handleError: true, cache: 'blog-posts' });
  const post = fetched ?? builtIn;
  const posts = all ?? builtInPosts();
  useBootDone(Boolean(post) || !loading);

  const more = useMemo(() => {
    if (!post) return [];
    const same = posts.filter((p) => p.slug !== post.slug && p.topics.some((t) => post.topics.includes(t)));
    const others = posts.filter((p) => p.slug !== post.slug && !same.includes(p));
    return [...same, ...others].slice(0, 3);
  }, [posts, post]);

  if (!post) {
    return (
      <BlogShell posts={posts}>
        <Seo title="Article not found" description="This article could not be found." path={`/blog/${slug}`} noindex />
        <div className="mx-auto max-w-[640px] px-5 pt-28 text-center">
          {loading ? (
            <p className="text-[var(--bl-muted)]">Opening the article…</p>
          ) : (
            <>
              <h1 className="bl-head text-[2.2rem]">That article is not here</h1>
              <p className="mt-3 text-[var(--bl-muted)]">It may have moved. Every article is on the blog.</p>
              <Link to="/blog" className="mt-6 inline-flex h-11 items-center rounded-[10px] bg-[var(--bl-btn)] px-5 font-bold">
                Back to the blog
              </Link>
            </>
          )}
        </div>
      </BlogShell>
    );
  }

  return (
    <BlogShell posts={posts}>
      <ArticleSeo post={post} />
      <article className="pt-10 sm:pt-14">
        <div className="mx-auto w-full max-w-[760px] px-5">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[var(--bl-muted)] hover:text-[var(--bl-ink)]">
            <ArrowLeft size={15} aria-hidden /> All articles
          </Link>
          <Tags topics={post.topics} className="mt-6" links />
          <h1 className="bl-head mt-3 text-[clamp(2rem,5vw,3.3rem)]">{post.title}</h1>
          <p className="mt-5 text-[1.15rem] leading-relaxed text-[var(--bl-muted)]">{post.excerpt}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--bl-line)] pb-6">
            <Author name={post.author} />
            <time dateTime={post.date} className="text-[13px] font-semibold text-[var(--bl-muted)]">
              {prettyDate(post.date)}
            </time>
            <ReadTime minutes={post.minutes} />
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-[1000px] px-4 sm:px-5">
          <Cover post={post} className="aspect-[16/8] w-full rounded-[18px]" />
        </div>

        <div className="mx-auto mt-10 w-full max-w-[720px] px-5">
          <Prose body={post.body} />
          <Share post={post} />
        </div>
      </article>

      {more.length > 0 && (
        <section className="mx-auto mt-20 w-full max-w-[1200px] px-4 sm:px-6">
          <p className="bl-label">Keep reading</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
    </BlogShell>
  );
}

function ArticleSeo({ post }: { post: BlogPost }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return (
    <Seo
      title={post.title}
      description={post.excerpt.slice(0, 158)}
      path={`/blog/${post.slug}`}
      image={post.image}
      jsonLd={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            dateModified: post.date,
            mainEntityOfPage: url,
            url,
            image: post.image ?? `${SITE_URL}/og.png`,
            articleSection: topicOf(post.topics[0]).label,
            keywords: post.topics.map((t) => topicOf(t).label).join(', '),
            wordCount: post.body.split(/\s+/).length,
            author: { '@type': 'Organization', name: post.author, url: SITE_URL },
            publisher: { '@type': 'Organization', name: 'AfterBI', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png` } },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'AfterBI', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
              { '@type': 'ListItem', position: 3, name: post.title, item: url },
            ],
          },
        ],
      }}
    />
  );
}

function Share({ post }: { post: BlogPost }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/blog/${post.slug}`;
  const round = 'flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bl-btn)] hover:bg-[var(--bl-btn-hover)]';
  return (
    <div className="mt-12 flex flex-wrap items-center gap-2.5 border-t border-[var(--bl-line)] pt-6">
      <span className="mr-2 text-[14px] font-bold">Share this article</span>
      <button
        type="button"
        aria-label="Copy link"
        className={round}
        onClick={() =>
          void navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          })
        }
      >
        {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
      </button>
      <a aria-label="Share on WhatsApp" className={round} href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`} target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.7 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.8-.1 1.5Z" />
        </svg>
      </a>
      <a aria-label="Share on X" className={round} href={`https://x.com/intent/post?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.4l7.9-9L1 2h7l4.8 6.4L18.2 2Zm-1.2 18h1.9L7.1 3.9H5.1L17 20Z" />
        </svg>
      </a>
      <a aria-label="Share on LinkedIn" className={round} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.6 4.77 6v5.56h-4v-4.93c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62v5.01h-4v-11Z" />
        </svg>
      </a>
    </div>
  );
}
