/**
 * The building blocks of the light public site.
 *
 *   Section      a full-width band in one of four tones
 *   SectionHead  eyebrow, title and lead, left or centred
 *   SiteImage    a picture slot that draws its own stand-in until a file exists
 *   Accordion    questions that open one at a time
 *   CheckList    ticked lines
 *   ModuleIcon   one icon per module
 */

import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  Apple,
  Baby,
  Boxes,
  Check,
  ChartPie,
  CreditCard,
  KeyRound,
  TrendingUp,
  Users,
  Workflow,
  ChevronDown,
  CupSoda,
  FileText,
  Hammer,
  HeartPulse,
  Home,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  Truck,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { IndustryIcon as IndustryKey, SiteImageKey } from '@/lib/site';
import { container, eyebrow, eyebrowBase } from './tokens';

/* ------------------------------------------------------------------ section */

const TONES = {
  white: 'bg-white text-navy-900',
  mist: 'bg-navy-50 text-navy-900',
  navy: 'bg-navy-900 text-white',
  green: 'bg-brand-700 text-white',
} as const;

export function Section({
  id,
  tone = 'white',
  className,
  inner,
  children,
}: {
  id?: string;
  tone?: keyof typeof TONES;
  className?: string;
  /** Extra classes on the inner container. */
  inner?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn('relative scroll-mt-28 py-16 sm:py-24', TONES[tone], className)}>
      <div className={cn(container, inner)}>{children}</div>
    </section>
  );
}

export function SectionHead({
  kicker,
  title,
  body,
  align = 'left',
  onDark = false,
  as: Tag = 'h2',
  className,
}: {
  kicker?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: 'left' | 'center';
  onDark?: boolean;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  const big = Tag === 'h1';
  return (
    <header className={cn(align === 'center' && 'mx-auto text-center', 'max-w-3xl', className)}>
      {kicker && <p className={onDark ? `${eyebrowBase} text-brand-300` : eyebrow}>{kicker}</p>}
      <Tag
        className={cn(
          'font-display font-extrabold tracking-[-0.035em] text-balance',
          big ? 'text-[2.4rem] leading-[1.05] sm:text-[3.6rem]' : 'text-[1.9rem] leading-[1.1] sm:text-[2.6rem]',
          kicker && 'mt-3',
          onDark ? 'text-white' : 'text-navy-900',
        )}
      >
        {title}
      </Tag>
      {body && (
        <p
          className={cn(
            'mt-4 text-[17px] leading-[1.65] sm:text-[18px]',
            align === 'center' && 'mx-auto',
            'max-w-2xl',
            onDark ? 'text-white/75' : 'text-navy-700/80',
          )}
        >
          {body}
        </p>
      )}
    </header>
  );
}

/* -------------------------------------------------------------- the picture */

const EXTENSIONS = ['webp', 'png', 'jpg'] as const;

/**
 * A picture slot.
 *
 * Looks for `/site/<slot>.webp`, then `.png`, then `.jpg`. If `override` is set
 * (an image published from Platform, Website) that is used first. If nothing
 * loads, `fallback` is drawn instead, so a slot without a file is a designed
 * picture rather than a broken one.
 */
export function SiteImage({
  slot,
  override,
  alt,
  className,
  imgClassName,
  fallback,
  eager = false,
}: {
  slot: SiteImageKey;
  override?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallback: ReactNode;
  eager?: boolean;
}) {
  const sources = [...(override ? [override] : []), ...EXTENSIONS.map((ext) => `/site/${slot}.${ext}`)];
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const key = sources.join('|');

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [key]);

  const failed = index >= sources.length;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!loaded && <div className="absolute inset-0">{fallback}</div>}
      {!failed && (
        <img
          key={sources[index]}
          src={sources[index]}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setIndex((value) => value + 1)}
          className={cn(
            'relative h-full w-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- accordion */

export function Accordion({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  return (
    <div className={cn('divide-y divide-navy-900/10 border-y border-navy-900/10', className)}>
      {items.map((item, index) => {
        const isOpen = open === index;
        const panel = `${base}-${index}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-bold text-navy-900 transition-colors hover:text-brand-700"
              >
                {item.q}
                <ChevronDown
                  size={20}
                  aria-hidden
                  className={cn('shrink-0 text-navy-400 transition-transform duration-200', isOpen && 'rotate-180 text-brand-700')}
                />
              </button>
            </h3>
            <div id={panel} hidden={!isOpen} className="pb-6 pr-10 text-[16px] leading-[1.7] text-navy-700/85">
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- checklist */

export function CheckList({ items, onDark = false, className }: { items: string[]; onDark?: boolean; className?: string }) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={item} className={cn('flex gap-3 text-[16px] leading-[1.55]', onDark ? 'text-white/85' : 'text-navy-800')}>
          <span
            className={cn(
              'mt-[0.15em] flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              onDark ? 'bg-brand-400/20 text-brand-300' : 'bg-brand-100 text-brand-700',
            )}
          >
            <Check size={13} strokeWidth={3} aria-hidden />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------- icons */

const MODULE_ICONS: Record<string, LucideIcon> = {
  leads: Users,
  orders: ShoppingCart,
  'sell-out': TrendingUp,
  analytics: ChartPie,
  automation: Workflow,
  access: KeyRound,
  stock: Boxes,
  invoices: FileText,
  credit: CreditCard,
  deliveries: Truck,
  targets: Target,
  'distributor-portal': Store,
};

export function ModuleIcon({ slug, size = 20, className }: { slug: string; size?: number; className?: string }) {
  const Icon = MODULE_ICONS[slug] ?? Sparkles;
  return <Icon size={size} aria-hidden className={className} />;
}

const INDUSTRY_ICONS: Record<IndustryKey, LucideIcon> = {
  food: Apple,
  drinks: CupSoda,
  care: Sparkles,
  home: Home,
  baby: Baby,
  agro: Wheat,
  pharma: HeartPulse,
  build: Hammer,
};

export function IndustryIcon({ icon, size = 26, className }: { icon: IndustryKey; size?: number; className?: string }) {
  const Icon = INDUSTRY_ICONS[icon];
  return <Icon size={size} aria-hidden className={className} />;
}
