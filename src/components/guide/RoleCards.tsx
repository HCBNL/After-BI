/**
 * What each role is for: purpose, responsibilities, a normal day, and what it
 * cannot do. Drawn with the theme tokens, so the same cards sit inside the
 * portal's Help screen and on the dark public `/roles` page.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROLE_GUIDES, type RoleGuide } from '@/lib/guide';
import type { Role } from '@/types';

function RoleCard({ guide, open: startOpen = false }: { guide: RoleGuide; open?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <article
      id={`role-${guide.role}`}
      className="scroll-mt-24 rounded-2xl border border-hairline surface-card shadow-card"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left sm:p-5"
      >
        <span aria-hidden className="mt-2 block h-[3px] w-6 shrink-0 rounded-full bg-brand-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold text-primary">{guide.name}</span>
          <span className="mt-0.5 block text-[13.5px] leading-snug text-secondary">{guide.purpose}</span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={cn('mt-1 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="grid gap-5 border-t border-hairline p-4 sm:grid-cols-2 sm:p-5">
          <Section title="What they are answerable for" items={guide.responsibilities} />
          <Section title="A normal day" items={guide.day} numbered />
          <Section title="What they cannot do" items={guide.cannot} className="sm:col-span-2" />
        </div>
      )}
    </article>
  );
}

function Section({
  title,
  items,
  numbered,
  className,
}: {
  title: string;
  items: string[];
  numbered?: boolean;
  className?: string;
}) {
  const List = numbered ? 'ol' : 'ul';
  return (
    <div className={className}>
      <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{title}</h3>
      <List className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2.5 text-[13.5px] leading-snug text-secondary">
            {numbered ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {index + 1}
              </span>
            ) : (
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </List>
    </div>
  );
}

/** Every role, the reader's own first and open. */
export function RoleCards({ mine, className }: { mine?: Role; className?: string }) {
  const ordered = mine
    ? [...ROLE_GUIDES.filter((g) => g.role === mine), ...ROLE_GUIDES.filter((g) => g.role !== mine)]
    : ROLE_GUIDES;
  return (
    <div className={cn('space-y-3', className)}>
      {ordered.map((guide) => (
        <RoleCard key={guide.role} guide={guide} open={guide.role === mine} />
      ))}
    </div>
  );
}
