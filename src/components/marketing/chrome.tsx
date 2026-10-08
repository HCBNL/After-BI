/**
 * The bar at the top and the block at the bottom of every public page.
 *
 * THE HEADER
 *
 * A thin promo strip, then the bar: the name, five destinations, and on the
 * right the door ("Sign in", or "Dashboard" when signed in) and the one ask.
 * Products, Solutions and Support open a full-width menu panel on a laptop;
 * on a phone everything folds into one sheet with sections that open.
 *
 * THE PHONE MENU IS PORTALLED
 *
 * The bar blurs what is behind it, and a blurred element becomes the containing
 * block for anything fixed inside it. Rendering the sheet into `document.body`
 * keeps it the full screen it is meant to be.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, LifeBuoy, Mail, MessageCircle, Menu, PlayCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/components/brand/Wordmark';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useAuth, HOME_FOR_ROLE } from '@/context/AuthContext';
import {
  COMPANY,
  COMPANY_URL,
  INDUSTRIES,
  MODULES,
  NAV,
  PRODUCT_GROUPS,
  PROMO,
  SOCIAL,
  SOLUTIONS,
  SUPPORT_EMAIL,
  WHATSAPP_URL,
  type SocialKey,
} from '@/lib/site';
import { btn, container } from './tokens';
import { ModuleIcon } from './site-ui';

type MenuKey = 'products' | 'solutions' | 'support';

function useDoor(): { label: string; to: string } {
  const { user, loading } = useAuth();
  if (loading || !user) return { label: 'Sign in', to: '/login' };
  return { label: 'Dashboard', to: HOME_FOR_ROLE[user.role] };
}

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------- the header */

export function SiteHeader({ onBook }: { onBook: () => void; overlay?: boolean }) {
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [lifted, setLifted] = useState(false);
  const { pathname } = useLocation();
  const door = useDoor();
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* A new page closes any open panel. */
  useEffect(() => setMenu(null), [pathname]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenu(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);

  const openSoon = (key: MenuKey) => {
    window.clearTimeout(closeTimer.current);
    setMenu(key);
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenu(null), 160);
  };

  return (
    <header className="sticky top-0 z-50" onMouseLeave={closeSoon}>
      <div className="status-bar-fill" aria-hidden />

      {/* The promo strip, with the language flags at the very top. */}
      <div className="bg-navy-900 text-white">
        <div className={cn(container, 'flex h-11 items-center justify-between gap-3 text-[13px]')}>
          <p className="hidden min-w-0 truncate sm:block">
            <span className="font-semibold">{PROMO.text}</span>{' '}
            <Link to={PROMO.link.href} className="hidden font-bold text-brand-300 underline-offset-4 hover:underline md:inline">
              {PROMO.link.label}
            </Link>
          </p>
          <div className="flex shrink-0 items-center gap-5 max-sm:w-full max-sm:justify-center">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hidden text-white/75 hover:text-white xl:inline">
              {SUPPORT_EMAIL}
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer noopener" className="hidden whitespace-nowrap text-white/75 hover:text-white lg:inline">
              WhatsApp us
            </a>
            <LanguageSwitch flags />
          </div>
        </div>
      </div>

      {/* The bar. */}
      <div
        className={cn(
          'border-b bg-white/95 backdrop-blur-xl transition-shadow',
          lifted || menu ? 'border-navy-900/10 shadow-[0_6px_24px_-16px_rgba(15,31,54,0.4)]' : 'border-transparent',
        )}
      >
        <div className={cn(container, 'flex h-16 items-center gap-6 sm:h-[4.5rem] lg:grid lg:grid-cols-[1fr_auto_1fr]')}>
          <Link to="/" aria-label="AfterBI home" className="shrink-0 lg:justify-self-start">
            <Wordmark className="text-[1.35rem] !text-navy-900 sm:text-[1.5rem]" />
          </Link>

          <nav aria-label="Main" className="hidden items-center justify-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = isActive(item.href, pathname);
              if (item.menu) {
                const key = item.menu;
                const open = menu === key;
                return (
                  <button
                    key={item.label}
                    type="button"
                    aria-expanded={open}
                    onMouseEnter={() => openSoon(key)}
                    onFocus={() => openSoon(key)}
                    onClick={() => setMenu(open ? null : key)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors',
                      open || active ? 'bg-navy-50 text-navy-900' : 'text-navy-700 hover:bg-navy-50 hover:text-navy-900',
                    )}
                  >
                    {item.label}
                    <ChevronDown size={15} aria-hidden className={cn('transition-transform', open && 'rotate-180')} />
                  </button>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onMouseEnter={() => setMenu(null)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors',
                    active ? 'bg-navy-50 text-navy-900' : 'text-navy-700 hover:bg-navy-50 hover:text-navy-900',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5 lg:ml-0 lg:justify-self-end">
            <Link
              to={door.to}
              className="tap inline-flex items-center whitespace-nowrap rounded-full px-3 text-[14.5px] font-bold text-navy-900 hover:bg-navy-50 sm:px-4"
            >
              {door.label}
            </Link>
            <button
              type="button"
              onClick={onBook}
              className="tap hidden items-center whitespace-nowrap rounded-full bg-brand-600 px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
            >
              Book a demo
            </button>
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-label="Open the menu"
              aria-expanded={sheet}
              aria-haspopup="dialog"
              className="tap inline-flex items-center justify-center rounded-full px-2.5 text-navy-900 hover:bg-navy-50 lg:hidden"
            >
              <Menu size={24} aria-hidden />
            </button>
          </div>
        </div>

        {/* The menu panel, laptops only. */}
        {menu && (
          <div
            className="absolute inset-x-0 top-full hidden border-b border-navy-900/10 bg-white shadow-[0_24px_48px_-24px_rgba(15,31,54,0.35)] lg:block"
            onMouseEnter={() => openSoon(menu)}
          >
            <div className={cn(container, 'py-8')}>
              {menu === 'products' && <ProductsPanel onBook={onBook} />}
              {menu === 'solutions' && <SolutionsPanel />}
              {menu === 'support' && <SupportPanel onBook={onBook} />}
            </div>
          </div>
        )}
      </div>

      {sheet && <MenuSheet onClose={() => setSheet(false)} onBook={onBook} />}
    </header>
  );
}

/* -------------------------------------------------------------- the panels */

function PanelLink({ to, title, body, icon }: { to: string; title: string; body?: string; icon?: ReactNode }) {
  return (
    <Link to={to} className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-navy-50">
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
          {icon}
        </span>
      )}
      <span>
        <span className="block text-[15px] font-bold text-navy-900">{title}</span>
        {body && <span className="mt-0.5 block text-[13.5px] leading-snug text-navy-600">{body}</span>}
      </span>
    </Link>
  );
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-navy-400">{children}</p>;
}

function ProductsPanel({ onBook }: { onBook: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_17rem] gap-6">
      {PRODUCT_GROUPS.map((group) => (
        <div key={group.title}>
          <PanelTitle>{group.title}</PanelTitle>
          {group.slugs.map((slug) => {
            const item = MODULES.find((m) => m.slug === slug);
            if (!item) return null;
            return (
              <PanelLink
                key={slug}
                to={`/features/${slug}`}
                title={item.name}
                body={item.blurb}
                icon={<ModuleIcon slug={slug} size={19} />}
              />
            );
          })}
        </div>
      ))}
      <PromoCard
        title="Explore the platform"
        body="Twelve capabilities, six role based workspaces, one secure cloud. See it with your own data in a guided demo."
        link={{ to: '/features', label: 'Platform overview' }}
        onBook={onBook}
      />
    </div>
  );
}

function SolutionsPanel() {
  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-8">
      <div>
        <PanelTitle>By business</PanelTitle>
        <div className="grid grid-cols-2">
          {SOLUTIONS.map((item) => (
            <PanelLink key={item.slug} to={`/solutions#${item.slug}`} title={item.name} body={item.blurb} />
          ))}
        </div>
      </div>
      <div>
        <PanelTitle>By category</PanelTitle>
        <ul className="grid grid-cols-2 gap-x-4 px-3">
          {INDUSTRIES.map((item) => (
            <li key={item.name}>
              <Link to="/solutions#industries" className="block py-2 text-[14.5px] font-semibold text-navy-700 hover:text-brand-700">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/solutions" className="mt-4 inline-flex items-center gap-1.5 px-3 text-[14.5px] font-bold text-brand-700 hover:underline">
          All solutions <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function SupportPanel({ onBook }: { onBook: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_20rem] gap-8">
      <div>
        <PanelTitle>Get help</PanelTitle>
        <PanelLink to="/help/sign-in" title="Sign in help" body="Reset a password or find your workspace." icon={<LifeBuoy size={19} />} />
        <PanelLink to="/demo" title="Book a demo" body="A guided tour, configured around your business." icon={<PlayCircle size={19} />} />
      </div>
      <div>
        <PanelTitle>Talk to us</PanelTitle>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer noopener" className="group flex gap-3 rounded-xl p-3 hover:bg-navy-50">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
            <MessageCircle size={19} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-navy-900">WhatsApp</span>
            <span className="mt-0.5 block text-[13.5px] text-navy-600">Chat with our team directly.</span>
          </span>
        </a>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="group flex gap-3 rounded-xl p-3 hover:bg-navy-50">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
            <Mail size={19} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-navy-900">Email</span>
            <span className="mt-0.5 block text-[13.5px] text-navy-600">{SUPPORT_EMAIL}</span>
          </span>
        </a>
      </div>
      <PromoCard
        title="Already a customer?"
        body="Sign in to your workspace. Every team and partner lands on their own dashboard."
        link={{ to: '/login', label: 'Sign in' }}
        onBook={onBook}
      />
    </div>
  );
}

function PromoCard({
  title,
  body,
  link,
  onBook,
}: {
  title: string;
  body: string;
  link: { to: string; label: string };
  onBook: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 text-white">
      <div aria-hidden className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-500/25 blur-2xl" />
      <p className="relative font-display text-[1.25rem] font-extrabold tracking-[-0.03em]">{title}</p>
      <p className="relative mt-2 text-[14px] leading-relaxed text-white/70">{body}</p>
      <div className="relative mt-5 flex flex-col gap-2">
        <button type="button" onClick={onBook} className={cn(btn.green, 'h-11')}>
          Book a demo
        </button>
        <Link to={link.to} className="inline-flex items-center justify-center gap-1.5 py-2 text-[14px] font-bold text-brand-300 hover:text-white">
          {link.label} <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- the phone menu */

function MenuSheet({ onClose, onBook }: { onClose: () => void; onBook: () => void }) {
  const door = useDoor();
  const [open, setOpen] = useState<MenuKey | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  const sub = (key: MenuKey): { label: string; to: string; external?: boolean }[] => {
    if (key === 'products')
      return [...MODULES.map((m) => ({ label: m.name, to: `/features/${m.slug}` })), { label: 'Platform overview', to: '/features' }];
    if (key === 'solutions')
      return [...SOLUTIONS.map((s) => ({ label: s.name, to: `/solutions#${s.slug}` })), { label: 'All solutions', to: '/solutions' }];
    return [
      { label: 'Sign in help', to: '/help/sign-in' },
      { label: 'Book a demo', to: '/demo' },
      { label: 'WhatsApp us', to: WHATSAPP_URL, external: true },
      { label: SUPPORT_EMAIL, to: `mailto:${SUPPORT_EMAIL}`, external: true },
    ];
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Menu" className="site fixed inset-0 z-[60] flex animate-fade-in flex-col overflow-y-auto lg:hidden">
      <div className="status-bar-fill" aria-hidden />
      <div className={cn(container, 'flex h-16 items-center justify-between border-b border-navy-900/10')}>
        <Wordmark className="text-[1.35rem] !text-navy-900" />
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="Close the menu"
          className="tap inline-flex items-center justify-center rounded-full px-2.5 text-navy-900 hover:bg-navy-50"
        >
          <X size={24} aria-hidden />
        </button>
      </div>

      <nav aria-label="Main" className={cn(container, 'mt-2')}>
        {NAV.map((item) => {
          if (!item.menu) {
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={onClose}
                className="flex items-center justify-between border-b border-navy-900/8 py-4 text-[1.2rem] font-bold text-navy-900"
              >
                {item.label}
              </Link>
            );
          }
          const key = item.menu;
          const isOpen = open === key;
          return (
            <div key={item.label} className="border-b border-navy-900/8">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : key)}
                className="flex w-full items-center justify-between py-4 text-left text-[1.2rem] font-bold text-navy-900"
              >
                {item.label}
                <ChevronDown size={20} aria-hidden className={cn('text-navy-400 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <ul className="pb-3">
                  {sub(key).map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a href={link.to} target="_blank" rel="noreferrer noopener" className="block py-2 pl-3 text-[15.5px] font-semibold text-navy-600">
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.to} onClick={onClose} className="block py-2 pl-3 text-[15.5px] font-semibold text-navy-600">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className={cn(container, 'pb-safe-6 mt-auto grid gap-3 pt-8')}>
        <button
          type="button"
          onClick={() => {
            onClose();
            onBook();
          }}
          className={btn.green}
        >
          Book a demo
        </button>
        <Link to={door.to} onClick={onClose} className={btn.outline}>
          {door.label}
        </Link>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------- the footer */

export function SiteFooter() {
  const year = new Date().getFullYear();

  const products = MODULES.map((m) => ({ label: m.name, to: `/features/${m.slug}` }));
  const solutions = [
    ...SOLUTIONS.map((s) => ({ label: s.name, to: `/solutions#${s.slug}` })),
    { label: 'All solutions', to: '/solutions' },
  ];

  return (
    <footer className="bg-navy-950 text-white">
      <div className={cn(container, 'pb-safe-6 pt-16 sm:pb-10')}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-[1.5fr_2fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" aria-label="AfterBI home">
              <Wordmark onInk className="text-[1.5rem]" />
            </Link>
            <p className="mt-5 max-w-[22rem] text-[15px] leading-[1.65] text-white/60">
              The sales and distribution platform for consumer goods companies.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="AfterBI elsewhere">
              {SOCIAL.map((channel) => (
                <li key={channel.key}>
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={channel.label}
                    title={channel.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.07] text-white/80 transition-colors hover:bg-brand-600 hover:text-white"
                  >
                    <SocialIcon name={channel.key} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform runs in two columns so every column is about the same height. */}
          <div className="col-span-2 lg:col-span-1">
            <p className="text-[14px] font-bold uppercase tracking-[0.12em] text-white">Platform</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {products.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[14.5px] text-white/60 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <FooterColumn title="Solutions" items={solutions} />
          <FooterColumn
            title="Company"
            items={[
              { label: 'Platform overview', to: '/features' },
              { label: 'Pricing', to: '/pricing' },
              { label: 'Book a demo', to: '/demo' },
              { label: 'Sign in', to: '/login' },
            ]}
          />
        </div>

        {/* Legal, policy and support, small, under the columns. */}
        <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-[13px] text-white/50">
          {[
            { label: 'Terms of Service', to: '/terms' },
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Sign in help', to: '/help/sign-in' },
            { label: 'WhatsApp support', to: WHATSAPP_URL, external: true },
            { label: SUPPORT_EMAIL, to: `mailto:${SUPPORT_EMAIL}`, external: true },
          ].map((item) => (
            <li key={item.label}>
              {item.external ? (
                <a href={item.to} target={item.to.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener" className="hover:text-white">
                  {item.label}
                </a>
              ) : (
                <Link to={item.to} className="hover:text-white">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2 text-[13px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year}{' '}
            <a href={COMPANY_URL} target="_blank" rel="noreferrer noopener" className="font-semibold text-white/70 hover:text-white">
              {COMPANY}
            </a>
            . All rights reserved.
          </p>
          <p>
            AfterBI is a{' '}
            <a href={COMPANY_URL} target="_blank" rel="noreferrer noopener" className="font-semibold text-white/70 hover:text-white">
              {COMPANY}
            </a>{' '}
            product.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: { label: string; to: string; external?: boolean }[] }) {
  return (
    <div>
      <p className="text-[14px] font-bold uppercase tracking-[0.12em] text-white">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            {item.external ? (
              <a
                href={item.to}
                target={item.to.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer noopener"
                className="break-words text-[14.5px] text-white/60 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ) : (
              <Link to={item.to} className="text-[14.5px] text-white/60 transition-colors hover:text-white">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Three marks, drawn rather than imported. */
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
