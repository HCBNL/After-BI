/**
 * The bar at the top and the block at the bottom.
 *
 * THE HEADER
 *
 * Four destinations, named the way a visitor says them: Home, Product, Pricing
 * and About. The footer and the structured data use those same four names,
 * because the label under a search result's sitelink is drawn from a site's own
 * anchor text, and one page with three names is a page with none.
 *
 * Sign in is on the bar at every width, never folded into the menu. Most people
 * who arrive here are a rep about to key an order or a distributor chasing a
 * statement, not a buyer, and making the people who use the product every day
 * hunt for the door is how a front page annoys its best audience.
 *
 * It starts transparent over the front page's ink hero and turns into the
 * page's own bar as soon as anything is scrolled. Every other page gets the
 * solid bar from the first frame.
 *
 * THE PHONE MENU IS PORTALLED
 *
 * The bar blurs what is behind it once the page has scrolled, and a blurred
 * element becomes the containing block for anything fixed inside it. A menu
 * drawn inside the bar would then be clipped to the bar's own sixty pixels.
 * Rendering it into `document.body` keeps it the full screen it is meant to be.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/components/brand/Wordmark';
import { useAuth, HOME_FOR_ROLE } from '@/context/AuthContext';
import { MODULES, NAV, SOCIAL, SUPPORT_EMAIL, type SocialKey } from '@/lib/site';
import { btn } from './tokens';

/**
 * Where the door on the bar leads, and what it is called.
 *
 * A signed-in person reading the product page — which happens more than it
 * sounds like it does, because reps and distributors follow links from emails
 * and from their own colleagues — should not be offered "Sign in". They are
 * signed in. They get the way into their own portal instead, and it is one
 * tap rather than a sign-in screen that redirects them a moment later.
 */
function useDoor(): { label: string; to: string } {
  const { user, loading } = useAuth();
  if (loading || !user) return { label: 'Sign in', to: '/login' };
  return { label: 'Your portal', to: HOME_FOR_ROLE[user.role] };
}

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------- the header */

export function SiteHeader({ onBook, overlay = false }: { onBook: () => void; overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const { pathname } = useLocation();
  const door = useDoor();

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Over the hero and not yet scrolled: the bar is the hero. */
  const clear = overlay && !lifted;

  return (
    <header
      className={cn(
        'inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300',
        overlay ? 'fixed' : 'sticky',
        clear
          ? 'border-transparent bg-gradient-to-b from-[#0a0c10]/80 to-transparent'
          : 'border-hairline bg-[var(--surface-page)]/92 backdrop-blur-xl',
      )}
    >
      {/* The strip behind an installed phone's status bar. See AppShell. */}
      <div className="status-bar-fill" aria-hidden />

      {/* Three columns on a laptop, so the menu sits in the true middle whatever
          the widths of the name on the left and the buttons on the right. */}
      <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:h-[4.5rem] sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
        <Link to="/" aria-label="AfterBI home" className="justify-self-start">
          <Wordmark onInk={clear} className="text-[1.3rem] sm:text-[1.45rem]" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative rounded-md px-3.5 py-2 text-[14.5px] font-semibold transition-colors',
                  clear
                    ? active
                      ? 'text-white'
                      : 'text-white/70 hover:text-white'
                    : active
                      ? 'text-primary'
                      : 'text-secondary hover:text-primary',
                )}
              >
                {item.label}
                {active && (
                  <span aria-hidden className="absolute inset-x-3.5 -bottom-1 h-[3px] rounded-full bg-brand-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 justify-self-end sm:gap-2.5">
          <Link
            to={door.to}
            className={cn(
              'tap inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-2.5 text-[14px] font-bold transition-colors sm:px-3.5',
              clear ? 'text-white hover:bg-white/10' : 'text-primary hover:bg-[var(--surface-sunken)]',
            )}
          >
            {door.label}
          </Link>

          {/*
            Two labels, one button.

            "Book a walkthrough" is the right words and it does not fit: at
            390px the bar carried the name, "Sign in", this button and the
            menu, and the first thing to give way was the wordmark, which
            wrapped. Shortening the label on the phone keeps all four on one
            line and keeps the ask on the bar, which is better than dropping
            the ask — the hero's own button is a screen away by the time
            somebody has started reading.
          */}
          <button
            type="button"
            onClick={onBook}
            className="tap inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-brand-600 px-3.5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-700 sm:px-5 sm:text-[14.5px] dark:bg-brand-500 dark:text-brand-950 dark:hover:bg-brand-400"
          >
            <span className="sm:hidden">Book a demo</span>
            <span className="hidden sm:inline">Book a walkthrough</span>
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open the menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              'tap inline-flex flex-col items-center justify-center gap-[5px] rounded-lg transition-colors lg:hidden',
              clear ? 'text-white hover:bg-white/10' : 'text-primary hover:bg-[var(--surface-sunken)]',
            )}
          >
            <span className="block h-[2px] w-5 rounded-full bg-current" />
            <span className="block h-[2px] w-5 rounded-full bg-current" />
            <span className="block h-[2px] w-5 rounded-full bg-current" />
          </button>
        </div>
      </div>

      {open && <MenuSheet pathname={pathname} onClose={() => setOpen(false)} onBook={onBook} />}
    </header>
  );
}

/* --------------------------------------------------------- the phone menu */

function MenuSheet({
  pathname,
  onClose,
  onBook,
}: {
  pathname: string;
  onClose: () => void;
  onBook: () => void;
}) {
  const door = useDoor();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="ink fixed inset-0 z-[60] flex animate-fade-in flex-col overflow-y-auto lg:hidden"
    >
      <div className="status-bar-fill" aria-hidden />

      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-[4.5rem] sm:px-8">
        <Wordmark onInk className="text-[1.3rem] sm:text-[1.45rem]" />
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="tap inline-flex items-center justify-center rounded-lg px-3 text-[14px] font-bold text-white transition-colors hover:bg-white/10"
        >
          Close
        </button>
      </div>

      <nav aria-label="Main" className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-8">
        {NAV.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-between border-b border-white/8 py-4 font-display text-[1.85rem] font-extrabold tracking-[-0.04em] transition-colors',
                active ? 'text-white' : 'text-white/55 hover:text-white',
              )}
            >
              {item.label}
              {active && <span aria-hidden className="h-[3px] w-6 rounded-full bg-brand-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="pb-safe-6 mx-auto mt-auto grid w-full max-w-7xl gap-3 px-4 pt-10 sm:px-8">
        <button
          type="button"
          onClick={() => {
            onClose();
            onBook();
          }}
          className={btn.green}
        >
          Book a walkthrough
        </button>
        <Link to={door.to} onClick={onClose} className={btn.glass}>
          {door.label}
        </Link>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------- the footer */

/** The five modules a visitor is most likely to have come looking for. */
const FOOTER_MODULES = ['orders', 'sell-out', 'stock', 'invoices', 'credit'];

export function SiteFooter() {
  const year = new Date().getFullYear();
  const text = 'text-[15px] leading-[1.6]';

  const modules = FOOTER_MODULES.flatMap((slug) => {
    const found = MODULES.find((item) => item.slug === slug);
    return found ? [{ label: found.name, to: `/product/${found.slug}` }] : [];
  });

  return (
    <footer className="ink border-t border-white/8">
      <div className="mx-auto w-full max-w-7xl px-5 pb-safe-6 pt-14 sm:px-8 sm:pb-12 sm:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[2fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" aria-label="AfterBI home">
              <Wordmark onInk className="text-[1.3rem] sm:text-[1.45rem]" />
            </Link>
            <p className={cn(text, 'mt-5 max-w-[27rem] text-white/60')}>
              Distribution management for fast-moving consumer goods.
              <br />
              Orders, stock, invoices, credit — and the sell-out figure behind them.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={cn(text, 'mt-4 inline-block font-semibold text-white transition-colors hover:text-brand-300')}
            >
              {SUPPORT_EMAIL}
            </a>

            <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="AfterBI elsewhere">
              {SOCIAL.map((channel) => (
                <li key={channel.key}>
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={channel.label}
                    title={channel.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/80 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.14] hover:text-white"
                  >
                    <SocialIcon name={channel.key} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <FooterColumn title="Product" items={modules} />

          <FooterColumn
            title="Company"
            items={[
              { label: 'Product', to: '/product' },
              { label: 'Pricing', to: '/pricing' },
              { label: 'About', to: '/about' },
              { label: 'Book a walkthrough', to: '/demo' },
              { label: 'Sign in', to: '/login' },
            ]}
          />
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className={cn(text, 'text-white/45')}>© {year} AfterBI Technologies Ltd. Lagos, Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}

/** One size of type for every line in the footer, titles included. */
function FooterColumn({ title, items }: { title: string; items: { label: string; to: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[15px] font-bold leading-[1.6] text-white">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            <Link to={item.to} className="text-[15px] leading-[1.6] text-white/65 transition-colors hover:text-white">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Three marks, drawn rather than imported.
 *
 * `lucide-react` carries no brand glyphs — correctly, they are trademarks with
 * their own usage rules — and pulling a whole icon package in for three shapes
 * on one footer is a download every visitor pays for.
 */
function SocialIcon({ name }: { name: SocialKey }) {
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', 'aria-hidden': true } as const;

  if (name === 'linkedin') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.5c0-1.31-.02-3-1.9-3-1.9 0-2.2 1.42-2.2 2.9V21H9z" />
      </svg>
    );
  }

  if (name === 'x') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M17.53 3h3.04l-6.64 7.59L21.75 21h-5.95l-4.66-6.09L5.8 21H2.76l7.1-8.12L2.25 3H8.3l4.21 5.57L17.53 3zm-1.07 16.2h1.69L7.62 4.72H5.8l10.66 14.48z" />
      </svg>
    );
  }

  return (
    <svg {...common} fill="currentColor">
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.19-1.36a9.93 9.93 0 0 0 4.85 1.24h.01c5.5 0 9.96-4.46 9.96-9.96 0-2.66-1.04-5.16-2.92-7.04A9.9 9.9 0 0 0 12.04 2zm5.83 14.06c-.25.7-1.44 1.33-2 1.42-.51.08-1.16.11-1.87-.12-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.9-4.27-5.05-4.47-.15-.2-1.21-1.6-1.21-3.06s.77-2.17 1.04-2.47c.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.07.91 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.3 2.36 1.45.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.07.13.07.73-.18 1.43z" />
    </svg>
  );
}
