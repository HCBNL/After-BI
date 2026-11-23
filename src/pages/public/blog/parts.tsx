/**
 * The blog's furniture: the floating bar, covers, cards, tags, the author
 * chip, the search and the small article renderer. Pages are in BlogIndex and
 * BlogArticle; the closing band and footer are the site's own (SiteEnd).
 */
import './blog.css';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Clock,
  Coins,
  Menu,
  Moon,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/components/brand/Wordmark';
import { MARK_BARS, MARK_BAR_WIDTH } from '@/components/brand/logoPaths';
import { Scene, type SceneName } from '@/components/marketing/scenes';
import { SiteEnd } from '@/components/marketing/kit';
import { TOPICS, topicOf, type BlogPost, type BlogTopic } from '@/lib/blog';

export const TOPIC_ICON: Record<BlogTopic, LucideIcon> = {
  guides: BookOpen,
  operations: Package,
  sales: ShoppingBag,
  finance: Coins,
  research: BarChart3,
  people: Users,
  product: Sparkles,
};

/* ------------------------------------------------------------ the theme */

const MODE_KEY = 'ab.blogMode';
function readMode(): 'dark' | 'light' {
  try {
    return localStorage.getItem(MODE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** The page around a blog screen: its own bar and mode, the site's closing band and footer. */
export function BlogShell({ posts, children }: { posts: BlogPost[]; children: ReactNode }) {
  const [mode, setMode] = useState(readMode);
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();
  // A new page opens at its top; a topic link lands on the list it names.
  useEffect(() => {
    if (navType === 'POP') return;
    if (hash) {
      const id = hash.slice(1);
      const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search, hash, navType]);
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* remembered for this visit only */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = meta?.getAttribute('content');
    meta?.setAttribute('content', mode === 'dark' ? '#141414' : '#f3f3f1');
    return () => {
      if (meta && before) meta.setAttribute('content', before);
    };
  }, [mode]);
  return (
    <div className="bl min-h-dvh" data-mode={mode}>
      <BlogBar posts={posts} mode={mode} onMode={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))} />
      <main>{children}</main>
      <div className="mt-24">
        <SiteEnd />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the bar */

const BAR_TOPICS: BlogTopic[] = ['guides', 'operations', 'sales', 'finance', 'research'];

function BlogBar({ posts, mode, onMode }: { posts: BlogPost[]; mode: 'dark' | 'light'; onMode: () => void }) {
  const [open, setOpen] = useState<BlogTopic | null>(null);
  const [searching, setSearching] = useState(false);
  const [sheet, setSheet] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const hover = (t: BlogTopic | null) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(t), t ? 60 : 160);
  };

  return (
    <>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          className="relative mx-auto flex h-14 max-w-[1280px] items-center gap-3 rounded-[16px] bg-[var(--bl-nav)] px-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)] ring-1 ring-[var(--bl-line)] sm:h-16 sm:px-6"
          onMouseLeave={() => hover(null)}
        >
          <Link to="/blog" aria-label="AfterBI blog" className="flex shrink-0 items-center gap-2">
            <Wordmark className={cn('text-[1.35rem] sm:text-[1.5rem]', mode === 'dark' ? '!text-white' : '!text-[#111214]')} />
            <span className="hidden rounded-md bg-[var(--bl-btn)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--bl-muted)] sm:inline">Blog</span>
          </Link>

          <nav aria-label="Topics" className="mx-auto hidden items-center gap-1 lg:flex">
            {BAR_TOPICS.map((id) => {
              const t = topicOf(id);
              const isOpen = open === id;
              return (
                <div key={id} className="relative" onMouseEnter={() => hover(id)}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : id)}
                    aria-expanded={isOpen}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-[14px] font-bold text-[var(--bl-ink)] hover:bg-[var(--bl-btn)]"
                  >
                    {t.label}
                    <ChevronDown size={14} aria-hidden className={cn('transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && <TopicMenu topic={id} posts={posts} onPick={() => setOpen(null)} />}
                </div>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <button type="button" onClick={() => setSearching(true)} aria-label="Search the blog" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--bl-btn)]">
              <Search size={18} aria-hidden />
            </button>
            <span aria-hidden className="h-5 w-px bg-[var(--bl-line)]" />
            <button type="button" onClick={onMode} aria-label={mode === 'dark' ? 'Light mode' : 'Dark mode'} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--bl-btn)]">
              {mode === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            </button>
            <Link to="/?demo=1" className="ml-1.5 hidden h-10 items-center rounded-[10px] bg-[var(--bl-btn)] px-4 text-[14px] font-bold hover:bg-[var(--bl-btn-hover)] sm:inline-flex">
              Create account
            </Link>
            <button type="button" onClick={() => setSheet((v) => !v)} aria-label="Topics" aria-expanded={sheet} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--bl-btn)] lg:hidden">
              {sheet ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>

          {sheet && (
            <div className="absolute inset-x-0 top-full mt-2 rounded-[16px] bg-[var(--bl-nav)] p-3 shadow-xl ring-1 ring-[var(--bl-line)] lg:hidden">
              {TOPICS.map((t) => {
                const Icon = TOPIC_ICON[t.id];
                return (
                  <Link key={t.id} to={`/blog?topic=${t.id}#latest`} onClick={() => setSheet(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-bold hover:bg-[var(--bl-btn)]">
                    <Icon size={17} className="text-[var(--bl-tag)]" aria-hidden /> {t.label}
                  </Link>
                );
              })}
              <Link to="/reports/sme-2026" onClick={() => setSheet(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-bold hover:bg-[var(--bl-btn)]">
                <BarChart3 size={17} className="text-[var(--bl-tag)]" aria-hidden /> SME Report 2026
              </Link>
              <Link to="/?demo=1" className="mt-2 flex h-11 items-center justify-center rounded-xl bg-[var(--bl-btn)] text-[14px] font-bold">
                Create account
              </Link>
            </div>
          )}
        </div>
      </header>
      {searching && <SearchSheet posts={posts} onClose={() => setSearching(false)} />}
    </>
  );
}

function TopicMenu({ topic, posts, onPick }: { topic: BlogTopic; posts: BlogPost[]; onPick: () => void }) {
  const t = topicOf(topic);
  const list = posts.filter((p) => p.topics.includes(topic)).slice(0, 4);
  return (
    <div className="absolute left-1/2 top-full z-50 w-[420px] -translate-x-1/2 pt-3">
      <div className="bl-fade rounded-[18px] bg-[var(--bl-nav)] p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ring-1 ring-[var(--bl-line)]">
        <p className="px-3 pb-2 pt-1 text-[13px] text-[var(--bl-muted)]">{t.blurb}</p>
        {list.map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} onClick={onPick} className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--bl-btn)]">
            <Cover post={p} className="h-12 w-12 shrink-0 rounded-lg" small />
            <span className="line-clamp-2 text-[13.5px] font-bold leading-snug">{p.title}</span>
          </Link>
        ))}
        {topic === 'research' && (
          <Link to="/reports/sme-2026" onClick={onPick} className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--bl-btn)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#003ffa] text-white">
              <BarChart3 size={20} aria-hidden />
            </span>
            <span className="text-[13.5px] font-bold leading-snug">The SME Report 2026, the full interactive report</span>
          </Link>
        )}
        <Link to={`/blog?topic=${topic}#latest`} onClick={onPick} className="mt-1 block rounded-xl px-3 py-2.5 text-[13px] font-bold text-[var(--bl-tag)] hover:bg-[var(--bl-btn)]">
          {`All ${t.label.toLowerCase()} articles`}
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ search */

function SearchSheet({ posts, onClose }: { posts: BlogPost[]; onClose: () => void }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (!words.length) return posts.slice(0, 5);
    return posts
      .map((p) => {
        const hay = `${p.title} ${p.excerpt} ${p.topics.join(' ')} ${p.body}`.toLowerCase();
        const head = `${p.title} ${p.excerpt}`.toLowerCase();
        const score = words.reduce((s, w) => s + (head.includes(w) ? 3 : 0) + (hay.includes(w) ? 1 : 0), 0);
        return { p, score, all: words.every((w) => hay.includes(w)) };
      })
      .filter((r) => r.all)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.p)
      .slice(0, 8);
  }, [q, posts]);
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-label="Search the blog" onClick={(e) => e.stopPropagation()} className="bl-fade w-full max-w-[620px] overflow-hidden rounded-[20px] bg-[var(--bl-nav)] ring-1 ring-[var(--bl-line)]">
        <div className="flex items-center gap-3 border-b border-[var(--bl-line)] px-5">
          <Search size={18} className="text-[var(--bl-muted)]" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles: credit limits, stock count, pricing…"
            className="h-14 flex-1 bg-transparent text-[16px] text-[var(--bl-ink)] outline-none placeholder:text-[var(--bl-muted)]"
            onKeyDown={(e) => e.key === 'Enter' && results[0] && (navigate(`/blog/${results[0].slug}`), onClose())}
          />
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--bl-btn)]">
            <X size={18} aria-hidden />
          </button>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-4 py-6 text-center text-[14px] text-[var(--bl-muted)]">Nothing matches that yet.</li>}
          {results.map((p) => (
            <li key={p.slug}>
              <Link to={`/blog/${p.slug}`} onClick={onClose} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[var(--bl-btn)]">
                <Cover post={p} className="h-12 w-12 shrink-0 rounded-lg" small />
                <span className="min-w-0">
                  <span className="line-clamp-1 text-[14px] font-bold">{p.title}</span>
                  <span className="line-clamp-1 text-[12.5px] text-[var(--bl-muted)]">{p.excerpt}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ pieces */

/** An article's picture: an uploaded photo, or one of the owner's artworks on its pale ground. */
export function Cover({ post, className, small, align = 'center' }: { post: BlogPost; className?: string; small?: boolean; align?: 'center' | 'bottom' }) {
  if (post.image)
    return (
      <div className={cn('overflow-hidden', className)}>
        <img src={post.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>
    );
  return (
    <div className={cn('bl-cover flex justify-center', align === 'bottom' ? 'items-end' : 'items-center', className)} style={{ background: post.ground ?? topicOf(post.topics[0]).ground }}>
      <Scene name={(post.scene ?? 'data-analytics') as SceneName} still className={small ? 'h-[92%] w-[92%]' : 'h-[82%] w-[82%]'} />
    </div>
  );
}

export function Tags({ topics, className, links }: { topics: BlogTopic[]; className?: string; links?: boolean }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] font-bold text-[var(--bl-tag)]', className)}>
      {topics.slice(0, 2).map((id, i) => {
        const Icon = TOPIC_ICON[id];
        return (
          <Fragment key={id}>
            {i > 0 && <span aria-hidden className="h-3 w-px bg-[var(--bl-line)]" />}
            {links ? (
              <Link to={`/blog?topic=${id}#latest`} className="inline-flex items-center gap-1 hover:underline">
                <Icon size={12.5} aria-hidden /> {topicOf(id).label}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Icon size={12.5} aria-hidden /> {topicOf(id).label}
              </span>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}

/** The author's badge: the AfterBI bars on a blue square, and the name. */
export function Author({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-[13.5px] font-bold', className)}>
      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#003ffa]">
        <svg viewBox="14 26 72 48" className="h-3.5 w-5">
          <path d={MARK_BARS} stroke="#fff" strokeWidth={MARK_BAR_WIDTH} strokeLinecap="round" fill="none" />
        </svg>
      </span>
      {name}
    </span>
  );
}

export function prettyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ReadTime({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--bl-muted)]">
      <Clock size={13} aria-hidden /> {`${minutes} min read`}
    </span>
  );
}

/** The everyday card: picture on top, tags, title, author and date. */
export function PostCard({ post, className }: { post: BlogPost; className?: string }) {
  return (
    <Link to={`/blog/${post.slug}`} className={cn('bl-card group flex flex-col overflow-hidden rounded-[14px]', className)}>
      <Cover post={post} className="aspect-[16/9] w-full" />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <Tags topics={post.topics} />
        <h3 className="bl-title mt-2.5 text-[1.2rem]">{post.title}</h3>
        <div className="mt-auto flex items-center justify-between gap-3 pt-7">
          <Author name={post.author} />
          <span className="text-[12.5px] font-semibold text-[var(--bl-muted)]">{prettyDate(post.date)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------ the article text */

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else {
      const href = m[3];
      out.push(
        /^https?:/.test(href) ? (
          <a key={k++} href={href} target="_blank" rel="noopener">
            {m[2]}
          </a>
        ) : (
          <Link key={k++} to={href}>
            {m[2]}
          </Link>
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The small article format (see lib/blogPosts.ts), as HTML. */
export function Prose({ body }: { body: string }) {
  const blocks: ReactNode[] = [];
  const lines = body.replace(/\r/g, '').split('\n');
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(<h2 key={k++}>{inline(line.slice(3))}</h2>);
      i++;
    } else if (line.startsWith('> ')) {
      blocks.push(<blockquote key={k++}>{inline(line.slice(2))}</blockquote>);
      i++;
    } else if (/^- /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i].trim()) : /^- /.test(lines[i].trim()))) {
        items.push(lines[i].trim().replace(ordered ? /^\d+\. / : /^- /, ''));
        i++;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={k++}>
          {items.map((t, j) => (
            <li key={j}>{inline(t)}</li>
          ))}
        </List>,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(## |> |- |\d+\. )/.test(lines[i].trim())) {
        para.push(lines[i].trim());
        i++;
      }
      blocks.push(<p key={k++}>{inline(para.join(' '))}</p>);
    }
  }
  return <div className="bl-prose">{blocks}</div>;
}
