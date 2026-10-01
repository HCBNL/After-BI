/**
 * The bar at the top and the block at the bottom, rebranded.
 *
 * THE HEADER
 *
 * Four destinations, named the way a visitor says them: Home, About, Features
 * and Pricing. The footer, the sitemap and the JSON-LD graph use the same four
 * names, because the label under a sitelink is drawn from a site's own anchor
 * text and one page with three names is a page with none.
 *
 * Log in is on the bar at every width. Most people who arrive here are a
 * parent after a result or a teacher after the register, not a buyer, and
 * making them hunt for the door is how a front page annoys the people who use
 * it most.
 *
 * Every public page is dark, and the bar is the same navy on all of them. Only
 * over the front page's banner does it start transparent, and the banner's
 * veil keeps that top edge the same navy, so it reads as one bar everywhere.
 *
 * THE PHONE MENU IS PORTALLED
 *
 * The bar blurs what is behind it once the page has scrolled, and a blurred
 * element becomes the containing block for anything fixed inside it. A menu
 * drawn inside the bar would then be clipped to the bar's own sixty pixels.
 * Rendering it into `document.body` keeps it the full screen it is meant to be.
 *
 * THE FOOTER
 *
 * What GetSchool is in two lines, the email address, the networks as their
 * marks, and a short list of pages. One size of type throughout.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Mark } from '@/components/brand/Mark';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { NAV, SOCIAL_DEFAULTS, type SocialKey } from '@/lib/marketing';
import type { SocialLink } from '@/lib/site';
import { featureBySlug, featurePath } from '@/lib/features';
import { SocialIcon, socialIconFor } from './SocialIcon';
import { btn } from './tokens';

/* ------------------------------------------------------------ the wordmark */

/**
 * The mark and the name. On a phone the bar shows the mark alone: it is the
 * logo, it reads at that size, and it leaves room for Log in and Get started.
 */
export function SiteWordmark({
  onNight,
  className,
  iconOnly,
}: {
  onNight?: boolean;
  className?: string;
  /** Hide the name below 640px, where the bar is tight. */
  iconOnly?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Mark size={30} className={onNight ? 'text-white' : 'text-primary'} />
      <span
        className={cn(
          'font-display text-[1.3rem] font-extrabold leading-none tracking-[-0.05em] sm:text-[1.45rem]',
          onNight ? 'text-white' : 'text-primary',
          iconOnly && 'hidden sm:inline',
        )}
      >
        GetSchool<span className="text-brand-500">.</span>
      </span>
    </span>
  );
}

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* --------------------------------------------------------------- the header */

export function SiteHeader({
  onCreate,
  onBook,
  overlay = false,
}: {
  onCreate: () => void;
  onBook: () => void;
  /** Transparent at the top, over the front page's banner. Every other page gets the solid bar. */
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const clear = overlay && !lifted;

  return (
    <header
      className={cn(
        'inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300',
        overlay ? 'fixed' : 'sticky',
        clear
          ? 'border-transparent bg-gradient-to-b from-night/85 to-transparent'
          : 'border-white/8 bg-night/95 backdrop-blur-xl',
      )}
    >
      {/* The strip behind an installed iPhone's status bar. See AppShell. */}
      <div className="status-bar-fill" aria-hidden />

      {/* Three columns on a laptop so the menu sits in the true middle, whatever
          the widths of the name on the left and the buttons on the right. */}
      <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:h-[4.5rem] sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
        <Link to="/" aria-label="GetSchool home" className="justify-self-start">
          <SiteWordmark onNight iconOnly />
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
                  active ? 'text-white' : 'text-white/70 hover:text-white',
                )}
              >
                {item.label}
                {active && (
                  <span aria-hidden className="absolute inset-x-3.5 -bottom-1 h-[3px] rounded-full bg-brand-600" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 justify-self-end sm:gap-2.5">
          <Link
            to="/login"
            className="tap inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-2.5 text-[14px] font-bold text-white transition-colors hover:bg-white/10 sm:px-3.5"
          >
            Log in
          </Link>

          <button
            type="button"
            onClick={onCreate}
            className="tap inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-brand-600 px-3.5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-700 sm:px-5 sm:text-[14.5px]"
          >
            Get started
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open the menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            className="tap inline-flex flex-col items-center justify-center gap-[5px] rounded-lg text-white hover:bg-white/10 lg:hidden"
          >
            <span className="block h-[2px] w-5 rounded-full bg-current" />
            <span className="block h-[2px] w-5 rounded-full bg-current" />
            <span className="block h-[2px] w-5 rounded-full bg-current" />
          </button>
        </div>
      </div>

      {open && (
        <MenuSheet
          pathname={pathname}
          onClose={() => setOpen(false)}
          onCreate={onCreate}
          onBook={onBook}
        />
      )}
    </header>
  );
}

/* ---------------------------------------------------------- the phone menu */

function MenuSheet({
  pathname,
  onClose,
  onCreate,
  onBook,
}: {
  pathname: string;
  onClose: () => void;
  onCreate: () => void;
  onBook: () => void;
}) {
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

  const links = [...NAV, { label: 'Blog', href: '/blog' }];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="night fixed inset-0 z-[60] flex animate-fade-in flex-col overflow-y-auto lg:hidden"
    >
      <div className="status-bar-fill" aria-hidden />

      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-[4.5rem] sm:px-8">
        <SiteWordmark onNight />
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
        {links.map((item) => {
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
              {active && <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="pb-safe-6 mx-auto mt-auto grid w-full max-w-7xl gap-3 px-4 pt-10 sm:px-8">
        <button
          type="button"
          onClick={() => {
            onClose();
            onCreate();
          }}
          className={btn.red}
        >
          Get started
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onBook();
          }}
          className={btn.glass}
        >
          Book a walkthrough
        </button>
        <Link
          to="/login"
          onClick={onClose}
          className="tap inline-flex items-center justify-center text-[15px] font-bold text-white/75 transition-colors hover:text-white"
        >
          Log in
        </Link>
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------- the footer */

const FOOTER_FEATURES = [
  { slug: 'getschool-ai', label: 'GetSchool AI' },
  { slug: 'report-cards', label: 'Report cards' },
  { slug: 'attendance', label: 'Attendance' },
  { slug: 'lesson-notes', label: 'Lesson notes' },
  { slug: 'cbt-exams', label: 'CBT exams' },
  /* School fees and Communication still have their feature pages; they are
     left out here so the Features column is the same height as Company. */
];

export function SiteFooter({ social }: { social: SocialLink[] }) {
  const year = new Date().getFullYear();

  /*
   * The console's addresses win; a channel with no real address is left out
   * rather than drawn as a link that goes nowhere.
   *
   * WALKED FROM BOTH LISTS, NOT JUST THE DEFAULTS.
   *
   * This used to be `SOCIAL_DEFAULTS.map(...)`, which made that array the
   * gatekeeper: a channel the console had an address for but which nobody had
   * remembered to add to `SOCIAL_DEFAULTS` was never even looked at. WhatsApp
   * was exactly that — a field in Owner → Website that saved a real link, a
   * `socialLinks()` that returned it, an icon sitting ready in `SocialIcon`,
   * and a footer that walked past it every time.
   *
   * Starting from the union means the next channel added to one list and not
   * the other still shows up, rather than disappearing silently.
   */
  const configured = new Map(social.map((link) => [link.key as SocialKey, link.href]));
  const known = new Map(SOCIAL_DEFAULTS.map((item) => [item.key, item]));
  const order: SocialKey[] = [
    ...SOCIAL_DEFAULTS.map((item) => item.key),
    ...[...configured.keys()].filter((key) => !known.has(key)),
  ];
  const channels = order.flatMap((key) => {
    const href = (configured.get(key) ?? known.get(key)?.href ?? '').trim();
    if (!/^https?:\/\//i.test(href)) return [];
    return [{ key, label: known.get(key)?.label ?? key, href }];
  });

  /* Linked from the same list as the pages, the sitemap and the JSON-LD,
     under the footer's shorter names. `npm run check:seo` holds it to that. */
  const features = FOOTER_FEATURES.flatMap(({ slug, label }) => {
    const page = featureBySlug(slug);
    return page ? [{ label, to: featurePath(page) }] : [];
  });
  const text = 'text-[15px] leading-[1.6]';

  return (
    <footer className="night border-t border-white/8">
      <div className="mx-auto w-full max-w-7xl px-5 pb-safe-6 pt-14 sm:px-8 sm:pb-12 sm:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[2fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" aria-label="GetSchool home">
              <SiteWordmark onNight />
            </Link>
            <p className={cn(text, 'mt-4 max-w-[27rem] text-white/60')}>
              The operating system for modern schools.
              <br />
              One platform for academics, administration, communication and growth.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={cn(text, 'mt-4 inline-block font-semibold text-white transition-colors hover:text-brand-300')}
            >
              {SUPPORT_EMAIL}
            </a>

            {channels.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="GetSchool on social media">
                {channels.map((channel) => {
                  const icon = socialIconFor(channel.key);
                  return (
                    <li key={channel.key}>
                      <a
                        href={channel.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={channel.label}
                        title={channel.label}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/80 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.14] hover:text-white"
                      >
                        {icon ? <SocialIcon name={icon} size={17} /> : channel.label.slice(0, 2)}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <FooterColumn title="Features" items={features} />

          <FooterColumn
            title="Company"
            items={[
              { label: 'About', to: '/about' },
              { label: 'Pricing', to: '/pricing' },
              { label: 'Blog', to: '/blog' },
              { label: 'Book a demo', to: '/demo' },
              { label: 'Log in', to: '/login' },
            ]}
          />
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className={cn(text, 'text-white/45')}>© {year} GetSchool Technology Ltd.</p>
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
