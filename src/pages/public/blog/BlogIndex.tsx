/**
 * /blog: the AfterBI blog.
 *
 *   A  the bar, the "This week" pill, the headline, and a carousel of the
 *      featured articles (picture left, story right) with dots
 *   B  the latest articles two by two, with Spotlight and the report card
 *      down the right
 *   C  Explore topics (the owner's artworks on pale tiles), then a mosaic of
 *      guides: one tall card and four small ones
 *   D  the site's closing band and footer, the same as every public page
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, X } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { cn } from '@/lib/cn';
import { Art, type ArtName } from '@/components/marketing/art';
import { useAsync } from '@/hooks/useAsync';
import { useBootDone } from '@/lib/boot';
import { builtInPosts, listPosts, TOPICS, topicOf, type BlogPost, type BlogTopic } from '@/lib/blog';
import { SITE_URL } from '@/lib/siteMeta';
import { Author, BlogShell, Cover, PostCard, ReadTime, Tags, TOPIC_ICON, prettyDate } from './parts';

const wrap = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6';
const PAGE = 6;

export default function BlogIndex() {
  useBootDone();
  const { data } = useAsync(listPosts, [], { handleError: true, cache: 'blog-posts' });
  const posts = data ?? builtInPosts();
  const [params, setParams] = useSearchParams();
  const topic = (params.get('topic') as BlogTopic | null) ?? null;

  const featured = useMemo(() => posts.filter((p) => p.featured).slice(0, 3), [posts]);
  const rest = useMemo(() => {
    const base = topic ? posts.filter((p) => p.topics.includes(topic)) : posts.filter((p) => !featured.includes(p));
    return base;
  }, [posts, topic, featured]);

  return (
    <BlogShell posts={posts}>
      <Seo
        title="Blog: distribution, stock and money, explained"
        description="Practical guides and research for Nigerian distributors, brands and wholesalers: pricing, landed cost, credit limits, stock counts, sell-out and more."
        path="/blog"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'The AfterBI Blog',
          url: `${SITE_URL}/blog`,
          publisher: { '@type': 'Organization', name: 'AfterBI', url: SITE_URL },
          blogPost: posts.slice(0, 20).map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            datePublished: p.date,
            url: `${SITE_URL}/blog/${p.slug}`,
            author: { '@type': 'Organization', name: p.author },
          })),
        }}
      />

      {/* ------------------------------------------------------------ A */}
      <section className="pt-12 text-center sm:pt-16">
        <div className={wrap}>
          {posts[0] && (
            <Link to={`/blog/${posts[0].slug}`} className="bl-pill inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold">
              This week in distribution <ChevronRight size={13} aria-hidden />
            </Link>
          )}
          <h1 className="bl-head mx-auto mt-5 max-w-[15ch] text-[clamp(2.4rem,6vw,4.4rem)]">Distribution works when you know the numbers.</h1>
          <p className="mx-auto mt-5 max-w-[30rem] text-[clamp(1rem,1.6vw,1.15rem)] leading-relaxed text-[var(--bl-muted)]">
            Everything you need to price, stock, sell and get paid, minus the jargon.
          </p>
        </div>
        {featured.length > 0 && <Featured posts={featured} />}
      </section>

      {/* ------------------------------------------------------------ B */}
      <section id="latest" className="scroll-mt-28 pt-16">
        <div className={cn(wrap, 'grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]')}>
          <Latest posts={rest} topic={topic} onClear={() => setParams({}, { replace: true })} />
          <aside className="space-y-8">
            <div className="lg:sticky lg:top-24 lg:space-y-8">
              <Spotlight posts={posts.filter((p) => p.spotlight).slice(0, 3)} />
              <ReportCard />
            </div>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------------------ C */}
      <section className="pt-20">
        <div className={wrap}>
          <p className="bl-label">Explore topics</p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
            {TOPICS.filter((t) => t.id !== 'product').map((t, i) => {
              const Icon = TOPIC_ICON[t.id];
              return (
                <Link key={t.id} to={`/blog?topic=${t.id}#latest`} className="group">
                  <span className="flex aspect-square items-center justify-center rounded-[14px] transition-transform duration-300 group-hover:-translate-y-1" style={{ background: t.ground }}>
                    <Art name={t.art as ArtName} shift={i} className="h-[62%] w-[62%]" />
                  </span>
                  <span className="mt-2.5 flex items-center gap-1.5 text-[14px] font-bold">
                    <Icon size={14} className="text-[var(--bl-muted)]" aria-hidden /> {t.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <Mosaic posts={posts.filter((p) => p.topics.includes('guides') || p.topics.includes('operations')).slice(0, 5)} />
        </div>
      </section>
    </BlogShell>
  );
}

/* ------------------------------------------------------------ A: featured */

function Featured({ posts }: { posts: BlogPost[] }) {
  const [at, setAt] = useState(0);
  const [hold, setHold] = useState(false);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (hold || posts.length < 2) return;
    const id = window.setInterval(() => setAt((i) => (i + 1) % posts.length), 6500);
    return () => window.clearInterval(id);
  }, [hold, posts.length]);
  return (
    <div className="mt-12 sm:mt-14" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <div
          className="relative"
          onPointerDown={(e) => (start.current = e.clientX)}
          onPointerUp={(e) => {
            if (start.current === null) return;
            const dx = e.clientX - start.current;
            start.current = null;
            if (Math.abs(dx) > 40) setAt((i) => (i + (dx < 0 ? 1 : posts.length - 1)) % posts.length);
          }}
        >
          <div className="flex transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ transform: `translateX(calc(${-at * 100}% - ${at * 16}px))`, gap: 16 }}>
            {posts.map((p, i) => (
              <Link
                key={p.slug}
                to={`/blog/${p.slug}`}
                draggable={false}
                aria-hidden={i !== at}
                tabIndex={i === at ? 0 : -1}
                className={cn('bl-card grid w-full shrink-0 overflow-hidden rounded-[18px] text-left transition-opacity duration-500 md:grid-cols-[1.35fr_1fr]', i !== at && 'opacity-45')}
              >
                <Cover post={p} className="aspect-[16/10] w-full md:aspect-auto md:min-h-[440px]" />
                <div className="flex flex-col p-6 sm:p-9">
                  <Tags topics={p.topics} />
                  <h2 className="bl-title mt-3 text-[clamp(1.5rem,2.6vw,2.15rem)]">{p.title}</h2>
                  <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-[var(--bl-muted)]">{p.excerpt}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-10">
                    <Author name={p.author} />
                    <ReadTime minutes={p.minutes} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      {posts.length > 1 && (
        <div className="mt-5 flex justify-center gap-2.5">
          {posts.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setAt(i)}
              aria-label={`Show article ${i + 1}`}
              aria-current={i === at}
              className={cn('h-3 w-3 rounded-full border-2 transition-colors', i === at ? 'border-[#3b82f6] bg-[#3b82f6]/30' : 'border-[var(--bl-muted)]')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ B: the list */

function Latest({ posts, topic, onClear }: { posts: BlogPost[]; topic: BlogTopic | null; onClear: () => void }) {
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [topic]);
  return (
    <div>
      {topic && (
        <div className="mb-5 flex items-center gap-3">
          <p className="bl-label">{`Topic: ${topicOf(topic).label}`}</p>
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-full bg-[var(--bl-btn)] px-3 py-1 text-[12.5px] font-bold hover:bg-[var(--bl-btn-hover)]">
            <X size={13} aria-hidden /> Clear
          </button>
        </div>
      )}
      {posts.length === 0 ? (
        <p className="rounded-[14px] bg-[var(--bl-card)] p-8 text-center text-[var(--bl-muted)]">No articles on this topic yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.slice(0, shown).map((p) => (
            <PostCard key={p.slug} post={p} className="bl-fade" />
          ))}
        </div>
      )}
      {shown < posts.length && (
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="h-10 rounded-[10px] bg-[var(--bl-btn)] px-5 text-[13.5px] font-bold hover:bg-[var(--bl-btn-hover)]">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

function Spotlight({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <div>
      <p className="bl-label">Spotlight</p>
      <ul className="mt-3">
        {posts.map((p) => (
          <li key={p.slug} className="border-b border-[var(--bl-line)] py-4 first:pt-2">
            <Link to={`/blog/${p.slug}`} className="group flex items-start gap-4">
              <span className="min-w-0 flex-1">
                <Tags topics={p.topics} />
                <span className="bl-title mt-1.5 block text-[15.5px] group-hover:underline">{p.title}</span>
                <span className="mt-1.5 block text-[12.5px] font-semibold text-[var(--bl-muted)]">{prettyDate(p.date)}</span>
              </span>
              <Cover post={p} className="h-16 w-16 shrink-0 rounded-[10px]" small />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The promotion down the side: the SME Report, on a dark card with one of the owner's shapes. */
function ReportCard() {
  return (
    <Link to="/reports/sme-2026" className="group relative block overflow-hidden rounded-[16px] bg-[#0b1220] p-6 pt-40 text-white ring-1 ring-white/10">
      <Art name="spark" className="absolute -right-6 -top-8 h-48 w-48 opacity-90 transition-transform duration-700 group-hover:rotate-12" />
      <Art name="blocks" shift={2} className="absolute left-5 top-8 h-20 w-20 opacity-80" />
      <p className="bl-head relative text-[1.65rem]">The SME Report 2026 is out.</p>
      <p className="relative mt-2 text-[13.5px] leading-relaxed text-white/75">Inflation, the naira, diesel, power and people: what it now costs to run a business, in numbers.</p>
      <span className="relative mt-4 inline-flex items-center gap-1 rounded-[8px] bg-white/15 px-3 py-1.5 text-[13px] font-bold group-hover:bg-white/25">
        Read the report <ArrowUpRight size={14} aria-hidden />
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------ C: the mosaic */

function Mosaic({ posts }: { posts: BlogPost[] }) {
  if (posts.length < 3) return null;
  const [big, ...small] = posts;
  return (
    <div className="mt-14 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Link to={`/blog/${big.slug}`} className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[16px] lg:min-h-[560px]">
        <Cover post={big} className="absolute inset-0" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <span className="relative p-6 text-white sm:p-8">
          <span className="[&_*]:!text-white/90">
            <Tags topics={big.topics} />
          </span>
          <span className="bl-head mt-3 block text-[clamp(1.6rem,3vw,2.4rem)]">{big.title}</span>
          <Author name={big.author} className="mt-5" />
        </span>
      </Link>
      <div className="grid gap-4 sm:grid-cols-2">
        {small.slice(0, 4).map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} className="bl-card flex flex-col overflow-hidden rounded-[14px]">
            <Cover post={p} className="aspect-[16/10] w-full" />
            <div className="flex flex-1 flex-col p-5">
              <Tags topics={p.topics} />
              <span className="bl-title mt-2 text-[1.05rem]">{p.title}</span>
              <Author name={p.author} className="mt-auto pt-5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
