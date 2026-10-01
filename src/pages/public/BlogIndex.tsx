/**
 * `/blog`, the articles, laid out like the front page.
 *
 * The newest article is the banner: its cover pushed back behind its title,
 * the way the front page's slides are. Under it, the articles sit on shelves,
 * the newest first and then one shelf per category, so the page reads like
 * the rest of the site. A search or a category turns the shelves into a grid
 * of just what matched.
 *
 * The reading area can be switched to light (`useBlogTheme`); it opens dark,
 * like every public page.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { BRAND, SITE_URL } from '@/lib/siteMeta';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { cachedPosts, listPublishedPosts, postDate, readingTime, rememberPosts, type Post } from '@/lib/blog';
import { getSiteHome } from '@/lib/siteDoc';
import { socialLinks, type SocialLink } from '@/lib/social';
import { cn } from '@/lib/cn';
import { PublicShell } from '@/components/marketing/kit';
import { Row, Stop } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import {
  BlogSurface,
  CoverBanner,
  FollowIcons,
  PostTile,
  SubscribeInline,
  ThemeSwitch,
  useBlogTheme,
} from '@/components/marketing/blog';

/** The blog list and the website's social links, fetched together. */
async function loadBlog(): Promise<{ posts: Post[]; social: SocialLink[] }> {
  const [posts, home] = await Promise.all([listPublishedPosts(), getSiteHome()]);
  return { posts, social: socialLinks(home.social) };
}

export default function BlogIndex() {
  const { data, loading } = useAsync(loadBlog, [], { handleError: true });
  /* What the front page fetched in the background, so this page has articles
     on its first frame and the fetch only refreshes them. */
  const [remembered] = useState(cachedPosts);
  const posts = data?.posts ?? remembered ?? [];
  const waiting = loading && !data && !remembered;

  useEffect(() => {
    if (data?.posts) rememberPosts(data.posts);
  }, [data]);

  return (
    <PublicShell>
      <Seo
        title="Blog"
        description="Notes on FMCG distribution in Nigeria: orders, stock, credit, sell-out and the people who move the cartons, from the team building AfterBI."
        path="/blog"
        /*
         * Without this the page has no og:image and a shared link renders as a
         * line of text instead of a card.
         */
        image={`${SITE_URL}/og.png`}
        /*
         * A `Blog` rather than a plain page, so the articles under it are
         * filed as posts belonging to one publication instead of as loose
         * pages that happen to share a path. The articles themselves are not
         * listed here: they live in Firestore and are published from the
         * console, so anything hardcoded would be wrong by the next one. The
         * crawler follows the links on the page for those.
         */
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Blog',
              '@id': `${SITE_URL}/blog#blog`,
              url: `${SITE_URL}/blog`,
              name: `${BRAND} blog`,
              description: 'Notes on FMCG distribution, from the team building AfterBI.',
              inLanguage: 'en',
              isPartOf: { '@id': `${SITE_URL}/#website` },
              publisher: { '@id': `${SITE_URL}/#organization` },
            },
            breadcrumbJsonLd('/blog', 'Blog'),
          ],
        }}
      />
      <BlogIndexView posts={posts} social={data?.social ?? []} loading={waiting} />
    </PublicShell>
  );
}

const shelfItem = 'w-[78vw] max-w-[22rem] shrink-0 sm:w-[20rem] lg:w-[23rem] lg:max-w-none';

export function BlogIndexView({ posts, social, loading }: { posts: Post[]; social: SocialLink[]; loading: boolean }) {
  const [theme, setTheme] = useBlogTheme();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  /* The categories that published articles actually carry, with how many each has. */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      if (post.category) counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  }, [posts]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (category && post.category !== category) return false;
      if (!needle) return true;
      return [post.title, post.excerpt, post.body, post.category, post.author].join(' ').toLowerCase().includes(needle);
    });
  }, [posts, category, search]);

  const filtering = Boolean(category || search.trim());
  const lead = posts[0];

  return (
    <>
      <h1 className="sr-only">The AfterBI blog</h1>

      {/* ------------------------------------------------------ the banner */}
      <CoverBanner cover={lead?.cover} className="flex min-h-[58svh] items-end lg:min-h-[68svh]">
        <div className={cn(container, 'w-full pb-12 pt-16 sm:pb-16')}>
          {lead ? (
            <div key={lead.id} className="max-w-[42rem] animate-fade-up">
              <p className="flex flex-wrap items-center gap-3 text-[13px] font-semibold text-white/70">
                {lead.category && (
                  <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                    {lead.category}
                  </span>
                )}
                {[postDate(lead.publishedAt), readingTime(lead.body)].filter(Boolean).join(' · ')}
              </p>
              <h2 className="mt-4 font-display text-[2.3rem] font-extrabold leading-[1.03] tracking-[-0.045em] text-white sm:text-[3.3rem] lg:text-[3.9rem]">
                {lead.title}
              </h2>
              {lead.excerpt && (
                <p className="mt-4 line-clamp-3 max-w-[36rem] text-[16.5px] leading-[1.6] text-white/80 sm:text-[18px]">
                  {lead.excerpt}
                </p>
              )}
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={`/blog/${lead.id}`} className={btn.green}>
                  Read the article
                </Link>
                <a href="#articles" className={btn.glass}>
                  All articles
                </a>
              </div>
            </div>
          ) : (
            !loading && (
              <div className="max-w-[40rem]">
                <h2 className="font-display text-[2.6rem] font-extrabold leading-[1] tracking-[-0.05em] text-white sm:text-[4rem]">
                  The blog
                  <Stop />
                </h2>
                <p className="mt-5 text-[17px] leading-[1.6] text-white/75">
                  Notes on distribution in Nigeria, and on the software we are building for it.
                </p>
              </div>
            )
          )}
        </div>
      </CoverBanner>

      {/* ------------------------------------------------------ the shelves */}
      <BlogSurface theme={theme}>
        <div id="articles" className="scroll-mt-24 pb-4">
          <div className={cn(container, 'flex flex-col gap-4 pt-8 lg:flex-row lg:items-center lg:justify-between')}>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
              <Chip label="All" active={!category} count={posts.length} onClick={() => setCategory('')} />
              {categories.map((item) => (
                <Chip
                  key={item.name}
                  label={item.name}
                  count={item.count}
                  active={category === item.name}
                  onClick={() => setCategory(category === item.name ? '' : item.name)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="relative block min-w-0 flex-1 lg:w-72 lg:flex-none">
                <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search the blog"
                  aria-label="Search the blog"
                  className="h-11 w-full rounded-full border border-hairline bg-[var(--surface-card)] pl-9 pr-4 text-[14px] text-primary outline-none transition-colors placeholder:text-muted focus:border-brand-500"
                />
              </label>
              <ThemeSwitch
                theme={theme}
                onChange={setTheme}
                className={theme === 'light' ? 'bg-night text-white ring-night hover:bg-night-3' : undefined}
              />
            </div>
          </div>

          {loading ? (
            <div className={cn(container, 'py-10')}>
              <Loading label="Fetching the articles" rows={2} />
            </div>
          ) : posts.length === 0 ? (
            <p className={cn(container, 'py-16 text-[15px] text-muted')}>Nothing has been published yet. Check back soon.</p>
          ) : filtering ? (
            filtered.length > 0 ? (
              <div className={cn(container, 'grid gap-x-6 gap-y-10 py-8 sm:grid-cols-2 lg:grid-cols-3')}>
                {filtered.map((post) => (
                  <PostTile key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <p className={cn(container, 'py-16 text-[15px] text-muted')}>
                Nothing matches that. Try another word, or{' '}
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategory('');
                  }}
                  className="font-semibold text-[var(--accent-text)] hover:underline"
                >
                  clear the filters
                </button>
                .
              </p>
            )
          ) : (
            <>
              <Row title="Latest">
                {posts.slice(0, 12).map((post) => (
                  <PostTile key={post.id} post={post} className={shelfItem} />
                ))}
              </Row>
              {categories.length > 1 &&
                categories.map((item) => (
                  <Row key={item.name} title={item.name}>
                    {posts
                      .filter((post) => post.category === item.name)
                      .map((post) => (
                        <PostTile key={post.id} post={post} className={shelfItem} />
                      ))}
                  </Row>
                ))}
            </>
          )}
        </div>

        {/* ------------------------------------------ subscribe and follow */}
        <section className={cn(container, 'pb-14 pt-6 sm:pb-20')}>
          <div className="grid gap-6 rounded-2xl surface-card p-6 shadow-card ring-1 ring-inset ring-[var(--border-hairline)] sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <h2 className="font-display text-[1.5rem] font-extrabold tracking-[-0.035em] text-primary sm:text-[1.8rem]">
                Get new articles by email
                <Stop />
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-secondary">A note when we publish something. No more than that.</p>
            </div>
            <div>
              <SubscribeInline />
              {social.length > 0 && <FollowIcons social={social} className="mt-5" />}
            </div>
          </div>
        </section>
      </BlogSurface>
    </>
  );
}

function Chip({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
        active
          ? 'bg-brand-600 text-white'
          : 'bg-[var(--surface-card)] text-secondary ring-1 ring-inset ring-[var(--border-hairline)] hover:text-primary hover:ring-[var(--border-strong)]',
      )}
    >
      {label}
      {count !== undefined && <span className={active ? 'text-white/75' : 'text-muted'}>{count}</span>}
    </button>
  );
}
