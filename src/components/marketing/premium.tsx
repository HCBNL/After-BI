/**
 * The Premium mark on the public pages.
 *
 * Gold, because the site is red and blue is already the verified tick on the
 * pricing page: a third colour that belongs to nothing else is read as a tier
 * at a glance. Which features wear it is the owner's choice in Owner → Pricing,
 * so it is read from the price list rather than typed into a page. Until that
 * one document has answered, the defaults in `plans.ts` stand in, which are
 * what the owner has chosen unless they have changed something.
 */

import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { resolveAccess, tierForFeature, type Access } from '@/lib/plans';

let settled: Access | null = null;

/** The tier of every tiered part of the product, as the owner has set it. */
export function useAccess(): Access {
  const [access, setAccess] = useState<Access>(() => settled ?? resolveAccess());
  useEffect(() => {
    if (settled) return;
    let live = true;
    /*
     * Imported on demand. `pricing.ts` brings the Firestore client with it,
     * and the front page must paint before any of that has downloaded: the
     * defaults draw the badges in the meantime, and they are almost always
     * already right.
     */
    import('@/lib/pricing')
      .then(({ getPricingOnce }) => getPricingOnce())
      .then((pricing) => {
        settled = resolveAccess(pricing.access);
        if (live) setAccess(settled);
      })
      .catch(() => {
        /* The defaults stay. A badge is never worth an error on a public page. */
      });
    return () => {
      live = false;
    };
  }, []);
  return access;
}

export function isPremium(slug: string, access: Access): boolean {
  return tierForFeature(slug, access) === 'premium';
}

export function PremiumBadge({ className, small }: { className?: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 font-bold uppercase tracking-[0.09em] text-[#3b2503] shadow-[0_6px_18px_-8px_rgba(245,158,11,0.7)]',
        small ? 'px-2 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-[10.5px]',
        className,
      )}
    >
      <Crown size={small ? 10 : 12} aria-hidden strokeWidth={2.4} />
      Premium
    </span>
  );
}
