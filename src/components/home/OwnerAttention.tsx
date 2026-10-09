/**
 * What needs the platform owner today.
 *
 * WHY THIS SPACE WAS EMPTY, AND WHY A LIST BELONGS IN IT
 *
 * The owner's home is a flex column at least as tall as the screen, and the
 * summary row at the foot carries `mt-auto` so it sits on the bottom bar. With
 * the shortcuts on the panel there was nothing between the two, so the column
 * stretched and left a tall empty rectangle in the middle of the one screen
 * the platform owner opens every morning.
 *
 * The obvious fillers are all wrong. Another row of numbers repeats the three
 * already at the foot. A chart of schools over time is a thing to look at
 * rather than a thing to do. What an owner of a subscription business actually
 * opens a console for is the short list of accounts that need a decision
 * today — money owed, a trial about to lapse, a school locked out, a school
 * about to run out of what it pays for.
 *
 * IT COSTS NOTHING
 *
 * Every row is derived from the school list the screen has already fetched for
 * its numbers. No query, no index, no second read. A platform with nothing
 * wrong shows one quiet line rather than an empty box.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * New enquiries. They have their own banner at the top of this screen, and a
 * thing that appears in two places is a thing somebody acts on twice.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Sparkles, WalletMinimal } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SchoolTenant } from '@/lib/tenant';

/** A trial or a renewal this close is worth acting on before it lapses. */
const SOON_DAYS = 7;
/** Below this share of the period's allowance, a school is about to be stuck. */
const LOW_CREDIT = 0.1;

type Urgency = 'critical' | 'warning' | 'soon';

interface Item {
  id: string;
  school: string;
  reason: string;
  urgency: Urgency;
  icon: typeof AlertTriangle;
}

const TONE: Record<Urgency, { dot: string; text: string }> = {
  critical: { dot: 'bg-status-critical', text: 'text-status-critical' },
  warning: { dot: 'bg-gold-400', text: 'text-gold-600 dark:text-gold-300' },
  soon: { dot: 'bg-[var(--border-strong)]', text: 'text-secondary' },
};

/** Whole days from today, negative once the date has passed. */
function daysAway(iso: string | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const today = new Date();
  const ms = then.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

/**
 * The list, worst first.
 *
 * A school can qualify on more than one count — past due AND out of credits —
 * and appears once, under the most urgent of them. A console that lists the
 * same school three times is a console somebody stops reading.
 */
export function attentionFor(schools: SchoolTenant[]): Item[] {
  const items: Item[] = [];

  for (const school of schools) {
    const days = daysAway(school.renewsAt);
    const allowance = school.aiCreditsPerPeriod ?? 0;
    const left = school.aiCredits ?? 0;

    if (school.status === 'past-due') {
      items.push({
        id: school.id,
        school: school.name,
        reason: days !== null && days < 0 ? `Payment ${Math.abs(days)} days late` : 'Payment overdue',
        urgency: 'critical',
        icon: WalletMinimal,
      });
      continue;
    }

    if (school.status === 'suspended') {
      items.push({
        id: school.id,
        school: school.name,
        reason: 'Locked out — nobody at this school can sign in',
        urgency: 'critical',
        icon: AlertTriangle,
      });
      continue;
    }

    if (school.status === 'trial') {
      items.push({
        id: school.id,
        school: school.name,
        reason:
          days === null
            ? 'On trial, with no end date set'
            : days < 0
              ? `Trial ended ${Math.abs(days)} days ago`
              : days === 0
                ? 'Trial ends today'
                : `Trial ends in ${days} days`,
        urgency: days !== null && days <= SOON_DAYS ? 'warning' : 'soon',
        icon: Clock,
      });
      continue;
    }

    /* Paying, and about to run out of the thing they pay for. */
    if (allowance > 0 && left <= allowance * LOW_CREDIT) {
      items.push({
        id: school.id,
        school: school.name,
        reason: left <= 0 ? 'Out of GetSchool AI credits' : `${left} AI credits left of ${allowance}`,
        urgency: left <= 0 ? 'warning' : 'soon',
        icon: Sparkles,
      });
      continue;
    }

    if (days !== null && days >= 0 && days <= SOON_DAYS) {
      items.push({
        id: school.id,
        school: school.name,
        reason: days === 0 ? 'Renews today' : `Renews in ${days} days`,
        urgency: 'soon',
        icon: Clock,
      });
    }
  }

  const order: Record<Urgency, number> = { critical: 0, warning: 1, soon: 2 };
  return items.sort((a, b) => order[a.urgency] - order[b.urgency]);
}

/** How many to draw before the list becomes a page of its own. */
const SHOWN = 5;

export function OwnerAttention({ schools, className }: { schools: SchoolTenant[]; className?: string }) {
  const items = useMemo(() => attentionFor(schools), [schools]);

  return (
    <section
      aria-labelledby="attention-heading"
      className={cn('overflow-hidden rounded-[22px] border border-hairline surface-card shadow-card', className)}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 id="attention-heading" className="text-[15px] font-bold text-primary">
          Needs you
        </h2>
        {items.length > SHOWN && (
          <Link
            to="/portal/owner/schools"
            className="text-[12.5px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            All {items.length}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-good/12 text-status-good">
            <CheckCircle2 size={18} aria-hidden />
          </span>
          <p className="text-[13.5px] leading-snug text-secondary">
            Every school is paid up.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--border-hairline)]">
          {items.slice(0, SHOWN).map((item) => {
            const Icon = item.icon;
            const tone = TONE[item.urgency];
            return (
              <li key={`${item.id}-${item.reason}`}>
                <Link
                  to="/portal/owner/schools"
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-hidden />
                  <Icon size={16} aria-hidden className={cn('shrink-0', tone.text)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-primary">{item.school}</span>
                    <span className={cn('block truncate text-[12.5px]', tone.text)}>{item.reason}</span>
                  </span>
                  <ArrowRight size={15} aria-hidden className="shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
