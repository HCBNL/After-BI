/**
 * The blog's own parts.
 *
 * READING MODES
 *
 * The public pages are dark, and the blog opens dark too. It is the one place
 * a reader may switch to light: long reading is easier for some people on a
 * white page. The choice is kept on the device (`gs.blog-theme`) and changes
 * only the reading area; the bar at the top and the footer stay the same navy
 * on every page. Light mode is the `.paper` token scope in index.css, so every
 * piece drawn with the theme tokens follows it without rules of its own.
 *
 * THE NETWORKS
 *
 * Sharing and following carry each network's own mark (`SocialIcon`), in the
 * network's colour, so a reader finds WhatsApp by its shape before its name.
 */

import { useCallback, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Link2, Moon, Send, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { imageUrl } from '@/lib/cloudinary';
import { postDate, readingTime, type Post, type SocialLink } from '@/lib/site';
import { SocialIcon, socialIconFor, type SocialName } from './SocialIcon';

/* ------------------------------------------------------------ the modes */

export type BlogTheme = 'dark' | 'light';
const THEME_KEY = 'gs.blog-theme';

export function useBlogTheme(): [BlogTheme, (next: BlogTheme) => void] {
  const [theme, setTheme] = useState<BlogTheme>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const choose = useCallback((next: BlogTheme) => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice lasts for this page */
    }
  }, []);
  return [theme, choose];
}

export function ThemeSwitch({ theme, onChange, className }: { theme: BlogTheme; onChange: (next: BlogTheme) => void; className?: string }) {
  const light = theme === 'light';
  return (
    <button
      type="button"
      onClick={() => onChange(light ? 'dark' : 'light')}
      aria-label={light ? 'Read in dark mode' : 'Read in light mode'}
      title={light ? 'Dark mode' : 'Light mode'}
      className={cn(
        'tap inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur transition-colors hover:bg-white/20',
        className,
      )}
    >
      {light ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
      {light ? 'Dark' : 'Light'}
    </button>
  );
}

/** The reading area, in whichever mode the reader chose. */
export function BlogSurface({ theme, children }: { theme: BlogTheme; children: ReactNode }) {
  return <div className={theme === 'light' ? 'paper' : 'bg-night'}>{children}</div>;
}

/* ------------------------------------------------------------ the banner */

/**
 * A cover photograph as the page's banner, pushed back behind the words the
 * same way the front page's slides are, and drifting the same slow way. With
 * no cover it is the red light alone.
 */
export function CoverBanner({ cover, className, children }: { cover?: string; className?: string; children: ReactNode }) {
  const url = cover?.trim() ? imageUrl(cover, { width: 960 }) : '';
  const [loaded, setLoaded] = useState('');

  return (
    <section className={cn('relative isolate overflow-hidden bg-night text-white', className)}>
      <div aria-hidden className="banner-glow banner-drift absolute -inset-[8%] -z-20" />
      {url && (
        <img
          src={url}
          alt=""
          decoding="async"
          fetchPriority="high"
          onLoad={() => setLoaded(url)}
          className={cn(
            'banner-drift absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-700',
            loaded === url ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
      {url && <div aria-hidden className="absolute inset-0 -z-10 bg-night/60" />}
      <div aria-hidden className="banner-veil absolute inset-0 -z-10" />
      {children}
    </section>
  );
}

/* ------------------------------------------------------------- the cards */

export function SideCard({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-2xl surface-card p-4 shadow-card ring-1 ring-inset ring-[var(--border-hairline)]', className)}>
      <h2 className="mb-3 text-[13.5px] font-bold text-primary">{title}</h2>
      {children}
    </section>
  );
}

/**
 * "Get new articles by email": the address is filed for the office through
 * `/api/enquiry`, and the form says so on the spot. It used to open the
 * visitor's mail app with a message half-written, which is a strange thing to
 * do to somebody who typed their address into a box and pressed a button.
 */
export function SubscribeInline({ className }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const valid = /.+@.+\..+/.test(email.trim());

  const subscribe = async () => {
    if (!valid || state === 'sending') return;
    setState('sending');
    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'subscribe', email: email.trim() }),
      });
      setState(response.ok ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
  };

  if (state === 'done') {
    return (
      <p className={cn('flex items-center gap-2 text-[14.5px] font-semibold text-primary', className)}>
        <Check size={17} aria-hidden className="text-emerald-500" />
        You are on the list. We will write when there is something to read.
      </p>
    );
  }

  return (
    <form
      className={cn('flex flex-col gap-2', className)}
      onSubmit={(event) => {
        event.preventDefault();
        void subscribe();
      }}
    >
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email"
          aria-label="Your email address"
          className="h-10 min-w-0 flex-1 rounded-lg border border-hairline bg-[var(--surface-sunken)] px-3 text-[14px] text-primary outline-none transition-colors placeholder:text-muted focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={!valid || state === 'sending'}
          aria-label="Subscribe"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <Send size={16} aria-hidden />
        </button>
      </div>
      {state === 'failed' && (
        <p className="text-[13px] font-semibold text-[#f08080]">That did not send. Try again in a moment.</p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------- sharing */

function shareTargets(url: string, title: string): { key: SocialName; label: string; href: string }[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
  ];
}

function useCopy(text: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {
        /* clipboard blocked: the share links still work */
      });
  };
  return [copied, copy];
}

const listRow =
  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-[14px] font-medium text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary';

/** Under the article: the same targets as outlined buttons. */
export function ShareButtons({ url, title, className }: { url: string; title: string; className?: string }) {
  const [copied, copy] = useCopy(url);
  const pill =
    'inline-flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 text-[13px] font-semibold text-primary transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)]';
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {shareTargets(url, title).map((target) => (
        <a key={target.key} href={target.href} target="_blank" rel="noreferrer noopener" className={pill}>
          <SocialIcon name={target.key} size={15} className={`si-${target.key}`} />
          {target.label}
        </a>
      ))}
      <button type="button" onClick={copy} className={pill}>
        {copied ? <Check size={15} aria-hidden className="text-emerald-500" /> : <Link2 size={15} aria-hidden />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- following */

/** The sidebar's list of the school's own channels. */
export function FollowList({ social }: { social: SocialLink[] }) {
  return (
    <ul className="-mx-2 space-y-0.5">
      {social.map((link) => {
        const icon = socialIconFor(link.key);
        return (
          <li key={link.key}>
            <a href={link.href} target="_blank" rel="noreferrer noopener" className={listRow}>
              {icon && <SocialIcon name={icon} size={16} className={`si-${icon}`} />}
              {link.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Round marks only: the footer's and the blog band's row. */
export function FollowIcons({ social, className }: { social: SocialLink[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-2.5', className)} aria-label="GetSchool on social media">
      {social.map((link) => {
        const icon = socialIconFor(link.key);
        if (!icon) return null;
        return (
          <li key={link.key}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={link.label}
              title={link.label}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-primary ring-1 ring-inset ring-[var(--border-hairline)] transition-colors hover:ring-[var(--border-strong)]"
            >
              <SocialIcon name={icon} size={17} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------- posts */

/** A card on a shelf or in the grid. */
export function PostTile({ post, className }: { post: Post; className?: string }) {
  return (
    <Link to={`/blog/${post.id}`} className={cn('group flex flex-col', className)}>
      {post.cover ? (
        <div className="aspect-video overflow-hidden rounded-md bg-[var(--surface-sunken)] ring-1 ring-inset ring-[var(--border-hairline)]">
          <img
            src={imageUrl(post.cover, { width: 380 })}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div className="flex aspect-video flex-col rounded-md surface-card p-4 ring-1 ring-inset ring-[var(--border-hairline)] transition-colors group-hover:ring-[var(--border-strong)]">
          <span aria-hidden className="block h-[3px] w-7 rounded-full bg-brand-500" />
          <span className="mt-auto font-display text-[1.35rem] font-extrabold leading-tight tracking-[-0.03em] text-primary">
            {post.category || 'GetSchool blog'}
            <span className="text-brand-500">.</span>
          </span>
        </div>
      )}
      {post.category && (
        <p className="mt-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--accent-text)]">{post.category}</p>
      )}
      <h3
        className={cn(
          'font-display text-[1.05rem] font-bold leading-snug tracking-[-0.02em] text-primary decoration-brand-500 decoration-2 underline-offset-4 group-hover:underline',
          post.category ? 'mt-1' : 'mt-3',
        )}
      >
        {post.title}
      </h3>
      <p className="mt-1 text-[12.5px] text-muted">
        {[postDate(post.publishedAt), readingTime(post.body)].filter(Boolean).join(' · ')}
      </p>
    </Link>
  );
}

/** Small: a thumbnail, the category and the title. */
export function RelatedList({ related }: { related: Post[] }) {
  return (
    <ul className="space-y-3">
      {related.map((post) => (
        <li key={post.id}>
          <Link to={`/blog/${post.id}`} className="group flex items-center gap-3">
            {post.cover ? (
              <img
                src={imageUrl(post.cover, { width: 72 })}
                alt=""
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-inset ring-[var(--border-hairline)]"
              />
            ) : (
              <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-sunken)]">
                <span className="h-[3px] w-6 rounded-full bg-brand-500" />
              </span>
            )}
            <span className="min-w-0">
              {post.category && (
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent-text)]">
                  {post.category}
                </span>
              )}
              <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-primary group-hover:underline">
                {post.title}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
