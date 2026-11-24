/**
 * The building blocks of the light public site.
 *
 *   Section      a full-width band in one of four tones
 *   SectionHead  eyebrow, title and lead, left or centred
 *   Accordion    questions that open one at a time
 *   CheckList    ticked lines
 *   ModuleIcon   one icon per module
 */

import { useId, useState, type ReactNode } from 'react';
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
  NotebookPen,
  Shirt,
  Smartphone,
  Wine,
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
import { IconArt } from '@/components/ui/IconArt';
import type { IndustryIcon as IndustryKey } from '@/lib/site';
import { container, eyebrow, eyebrowBase } from './tokens';

/* ------------------------------------------------------------------ section */

/*
 * A section's ground, and never its accent.
 *
 * A full-bleed band in the accent colour is the ten per cent spent on a
 * backdrop: the page goes loud for six hundred pixels and the button inside
 * the band has to be white to survive it, so the one colour that should mean
 * "press this" ends up meaning "this is a section". Both dark tones are the
 * structure colour at different depths; the accent stays on the button.
 */
const TONES = {
  white: 'bg-white text-navy-900',
  mist: 'bg-navy-50 text-navy-900',
  navy: 'bg-navy-900 text-white',
  /* Kept under its old name so callers need no edit: a deep structure band. */
  green: 'bg-navy-800 text-white',
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
    <section id={id} className={cn('relative scroll-mt-28 py-20 sm:py-28', TONES[tone], className)}>
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
      {kicker && <p className={onDark ? `${eyebrowBase} text-navy-200` : eyebrow}>{kicker}</p>}
      <Tag
        className={cn(
          'font-display font-semibold tracking-[-0.03em] text-balance',
          big ? 'text-[2.02rem] leading-[1.05] sm:text-[3.02rem]' : 'text-[1.6rem] leading-[1.1] sm:text-[2.18rem]',
          kicker && 'mt-3',
          onDark ? 'text-white' : 'text-navy-900',
        )}
      >
        {title}
      </Tag>
      {body && (
        <p
          className={cn(
            'mt-4 text-[15.5px] leading-[1.65] sm:text-[16px]',
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
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15.5px] font-semibold text-navy-900 transition-colors hover:text-navy-600"
              >
                {item.q}
                <ChevronDown
                  size={20}
                  aria-hidden
                  className={cn('shrink-0 text-navy-400 transition-transform duration-200', isOpen && 'rotate-180 text-navy-900')}
                />
              </button>
            </h3>
            <div id={panel} hidden={!isOpen} className="pb-6 pr-10 text-[15px] leading-[1.7] text-navy-700/85">
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
        <li key={item} className={cn('flex gap-3 text-[15px] leading-[1.55]', onDark ? 'text-white/85' : 'text-navy-800')}>
          {/* A tick is information, not an invitation: structure, not accent.
              Twelve accent ticks beside a single accent button is eleven
              false signals and one real one. */}
          <span
            className={cn(
              'mt-[0.15em] flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              onDark ? 'bg-white/15 text-white' : 'bg-navy-100 text-navy-700',
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
  electronics: Smartphone,
  spirits: Wine,
  stationery: NotebookPen,
  fashion: Shirt,
};

export function IndustryIcon({ icon, size = 26, className }: { icon: IndustryKey; size?: number; className?: string }) {
  const Icon = INDUSTRY_ICONS[icon];
  return <Icon size={size} aria-hidden className={className} />;
}

/* ------------------------------------------------------------- image cards */

/**
 * The small icon that sits top left on a picture card: minimal, on a soft
 * gradient glass chip, so the picture stays the content.
 */
export function IconBadge({ children, id = '', className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <IconArt id={id} size={46} halo={0.85} className={cn('absolute left-3 top-3 z-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)]', className)}>
      {children}
    </IconArt>
  );
}
