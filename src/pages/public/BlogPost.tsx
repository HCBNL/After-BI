/**
 * `/blog/:slug`, one article.
 *
 * The cover is the banner, behind the title, the category and who wrote it.
 * Under it the article sits on its own card with a narrow column beside it
 * that follows the page down: updates by email, sharing, following, and more
 * to read. On a phone the column comes after the article, and sharing and
 * following are in the article itself.
 *
 * The reading area can be switched to light (`useBlogTheme`); it opens dark,
 * like every public page. The banner stays dark in both.
 */

import { Link, useParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { SITE_URL } from '@/lib/siteMeta';
import { FOUNDER_ID } from '@/lib/siteJsonLd';
import { FOUNDER } from '@/lib/site';
import { Prose } from '@/components/Prose';
import { Carousel } from '@/components/Carousel';
import { VideoBlock } from '@/components/VideoBlock';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { imageUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';
import { getPost, listPublishedPosts, postDate, readingTime, type Post } from '@/lib/blog';
import { getSiteHome } from '@/lib/siteDoc';
import { socialLinks, type SocialLink } from '@/lib/social';
import { PublicShell } from '@/components/marketing/kit';
import { Stop } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import {
  BlogSurface,
  CoverBanner,
  FollowList,
  RelatedList,
  ShareButtons,
  SideCard,
  SubscribeInline,
  ThemeSwitch,
  useBlogTheme,
} from '@/components/marketing/blog';

interface Loaded {
  post: Post | null;
  related: Post[];
  social: SocialLink[];
}

async function loadArticle(slug: string): Promise<Loaded> {
  const [post, all, home] = await Promise.all([getPost(slug), listPublishedPosts(), getSiteHome()]);
  const others = all.filter((p) => p.id !== slug);
  // Same category first; if that comes up short, fill from the newest others.
  const sameCategory = post?.category ? others.filter((p) => p.category === post.category) : [];
  const related = [...sameCategory, ...others.filter((p) => !sameCategory.includes(p))].slice(0, 3);
  return { post, related, social: socialLinks(home.social) };
}

export default function BlogPost() {
  const { slug = '' } = useParams();
  /* Keyed on the slug: following a link from one article to another otherwise
     rendered the previous post's body, title and share card under the new
     URL, which is the version a search engine would have crawled. */
  const { data, loading } = useAsync(() => loadArticle(slug), [slug], {
    key: slug,
    handleError: true,
  });
  const waiting = loading && !data;
  const post = data?.post ?? null;

  return (
    <PublicShell>
      {waiting ? (
        <div className={cn(container, 'py-16')}>
          <Loading label="Fetching the article" />
        </div>
      ) : !post ? (
        <div className={cn(container, 'py-20')}>
          <Seo title="Article not found" description="That article is not on the AfterBI blog." path={`/blog/${slug}`} noindex />
          <h1 className="font-display text-[2rem] font-extrabold tracking-[-0.04em] text-white sm:text-[2.6rem]">
            That article is not here
            <Stop />
          </h1>
          <p className="mt-3 max-w-[32rem] text-[16px] leading-relaxed text-white/70">
            It may have been taken down, or the link has a typing mistake in it.
          </p>
          <Link to="/blog" className={cn(btn.line, 'mt-7')}>
            All articles
          </Link>
        </div>
      ) : (
        <ArticleView post={post} related={data?.related ?? []} social={data?.social ?? []} />
      )}
    </PublicShell>
  );
}

export function ArticleView({ post, related, social }: { post: Post; related: Post[]; social: SocialLink[] }) {
  const [theme, setTheme] = useBlogTheme();
  const url = `${SITE_URL}/blog/${post.id}`;
  const author = post.author?.trim() || 'AfterBI';
  const meta = [postDate(post.publishedAt), readingTime(post.body)].filter(Boolean).join(' · ');

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt || `${post.title}, on the AfterBI blog.`}
        path={`/blog/${post.id}`}
        image={post.cover ? imageUrl(post.cover, { width: 600 }) : undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          ...(post.excerpt ? { description: post.excerpt } : {}),
          ...(post.cover ? { image: imageUrl(post.cover, { width: 600 }) } : {}),
          datePublished: post.publishedAt,
          author: author === FOUNDER.name ? { '@id': FOUNDER_ID } : { '@type': 'Organization', name: author },
          dateModified: post.updatedAt || post.publishedAt,
          publisher: { '@id': `${SITE_URL}/#organization` },
          mainEntityOfPage: url,
        }}
      />

      {/* ------------------------------------------------------ the banner */}
      <CoverBanner cover={post.cover}>
        <div className={cn(container, 'pb-10 pt-7 sm:pb-14 sm:pt-9')}>
          <div className="flex items-center justify-between gap-4">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-white/70">
              <Link to="/blog" className="transition-colors hover:text-white">
                Blog
              </Link>
              {post.category && (
                <>
                  <span aria-hidden className="text-white/35">
                    /
                  </span>
                  <span className="truncate text-white">{post.category}</span>
                </>
              )}
            </nav>
            <ThemeSwitch theme={theme} onChange={setTheme} />
          </div>

          {post.category && (
            <span className="mt-6 inline-block rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
              {post.category}
            </span>
          )}
          <h1 className="mt-4 max-w-[24ch] font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-[-0.045em] text-white sm:text-[2.9rem] lg:text-[3.3rem]">
            {post.title}
          </h1>

          <div className="mt-6 flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display text-[15px] font-bold text-white"
            >
              {author.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-semibold text-white">{author}</p>
              {meta && <p className="text-[13px] text-white/60">{meta}</p>}
            </div>
          </div>
        </div>
      </CoverBanner>

      {/* -------------------------------------------------------- the body */}
      <BlogSurface theme={theme}>
        <div className={cn(container, 'grid gap-6 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start')}>
          <article className="min-w-0 rounded-2xl surface-card p-5 shadow-card ring-1 ring-inset ring-[var(--border-hairline)] sm:p-8">
            {post.excerpt && (
              <p className="border-l-[3px] border-brand-600 pl-4 text-[17px] leading-[1.65] text-primary">{post.excerpt}</p>
            )}

            <Prose body={post.body} className={post.excerpt ? 'mt-7' : undefined} />

            {post.gallery.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-[13px] font-bold text-primary">In pictures</h2>
                <Carousel images={post.gallery} />
              </section>
            )}

            {post.video && (
              <section className="mt-10">
                <h2 className="mb-4 text-[13px] font-bold text-primary">Watch</h2>
                <VideoBlock url={post.video} />
              </section>
            )}

            <div className="mt-10 border-t border-hairline pt-6">
              <h2 className="text-[13.5px] font-bold text-primary">Share this article</h2>
              <ShareButtons url={url} title={post.title} className="mt-3" />
            </div>

            {/*
              The "Follow AfterBI" panel and the sidebar's "Share article"
              list both came out of here.

              Each was the second copy of something already on the page: the
              sidebar carries Follow us, and the article carries Share this
              article directly above where the panel used to sit. So a reader
              who finished a piece met five share buttons, then five follow
              buttons, then five more of each in the margin, twenty links to
              somewhere else, stacked under the last paragraph.

              A thing offered twice is not offered twice as convincingly. One
              share row in the article, one follow list in the margin, and the
              next article is the loudest thing left on the screen, which is
              what the page is for.
            */}
            <Link to="/blog" className={cn(btn.line, 'mt-8 h-11 px-5 text-[14px]')}>
              Back to the blog
            </Link>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <SideCard title="Get updates by email">
              <SubscribeInline />
            </SideCard>
            {social.length > 0 && (
              <SideCard title="Follow us" className="hidden lg:block">
                <FollowList social={social} />
              </SideCard>
            )}
            {related.length > 0 && (
              <SideCard title="Related articles">
                <RelatedList related={related} />
              </SideCard>
            )}
          </aside>
        </div>
      </BlogSurface>
    </>
  );
}
