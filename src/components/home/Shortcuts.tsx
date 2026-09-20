/**
 * The shortcuts grid — what a person came here to do.
 *
 * Icons above labels, four to a phone row: the shape of the app drawer on every
 * Nigerian banking app, which is the interface this audience already knows how
 * to read. A depot storekeeper and a distributor's accounts clerk have both
 * used OPay; neither has used a CRM sidebar.
 *
 * It is rendered from the same `ACTIONS` catalogue the rail and the menu sheet
 * read, so it cannot drift from them — it is not a fourth copy of the
 * navigation, it is a fourth rendering of the one list.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { MoreSheet } from '@/components/home/MoreSheet';
import { actionsForRole, resolveTo } from '@/lib/tiles';
import type { Role } from '@/types';

/**
 * Two rows on a phone, and the eighth square is always "More".
 *
 * A distributor has six shortcuts and this constant never fires for them. A
 * super admin has twenty-four, and twenty-four tiles is six rows that push
 * everything else on the home screen below the fold and run the grid into the
 * bottom bar. The page padding already clears that bar; the problem was never
 * the padding, it was one card grown taller than the screen it sits on.
 *
 * Seven plus More rather than eight, so the row stays whole either way.
 */
const COLLAPSED = 7;

export function Shortcuts({ role }: { role: Role }) {
  const actions = actionsForRole(role);
  const [more, setMore] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!actions.length) return null;

  const overflows = actions.length > COLLAPSED;
  const shown = overflows && !expanded ? actions.slice(0, COLLAPSED) : actions;
  const hidden = actions.length - shown.length;

  return (
    <section aria-labelledby="shortcuts-heading" className="min-w-0">
      <h2
        id="shortcuts-heading"
        className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted"
      >
        Shortcuts
      </h2>

      <div className="surface-card rounded-2xl border border-hairline p-3 shadow-card sm:p-4">
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2">
          {shown.map((action) => {
            const Icon = action.icon;

            const face = (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-secondary transition-colors group-hover:bg-brand-50 group-hover:text-brand-700 dark:group-hover:bg-brand-900/50 dark:group-hover:text-brand-300">
                  <Icon size={19} />
                </span>
                {/*
                  Two lines, then clipped. A phone gives each tile about 80px and
                  "Credit limits" needs both of them; a third line would make the
                  rows different heights and the grid ragged.
                */}
                <span className="line-clamp-2 text-[11.5px] font-semibold leading-tight text-secondary">
                  {action.label}
                </span>
              </>
            );

            /*
              A `soon` action has no screen yet, so it must not be a link.
              It used to render as an ordinary tile with a "Soon" badge in the
              menu — and tapping it landed on the in-portal 404, which reads as a
              broken app rather than an unfinished feature. Dimmed and inert says
              the true thing.
            */
            if (action.soon) {
              return (
                <span
                  key={action.id}
                  title={`${action.description} (not built yet)`}
                  aria-disabled="true"
                  className="group flex min-w-0 cursor-not-allowed flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center opacity-45"
                >
                  {face}
                  <span className="sr-only">Not available yet</span>
                </span>
              );
            }

            return (
              <Link
                key={action.id}
                to={resolveTo(action, role)}
                title={action.description}
                className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition-colors hover:bg-[var(--surface-sunken)]"
              >
                {face}
              </Link>
            );
          })}

          {/*
            The last square, and the reason the row never has a hole in it. Same
            shape as every tile beside it on purpose: it is where a person
            already looks when hunting for something the grid does not name.
          */}
          <button
            type="button"
            onClick={() => setMore(true)}
            aria-haspopup="dialog"
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition-colors hover:bg-[var(--surface-sunken)]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-secondary transition-colors group-hover:bg-brand-50 group-hover:text-brand-700 dark:group-hover:bg-brand-900/50 dark:group-hover:text-brand-300">
              <MoreHorizontal size={19} />
            </span>
            <span className="line-clamp-2 text-[11.5px] font-semibold leading-tight text-secondary">
              More
            </span>
          </button>
        </div>

        {/*
          Only drawn when it has something to do, and it names the number it is
          hiding: "Show 17 more" is a promise, "Show all" is a guess.
        */}
        {overflows && (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border-t border-hairline pt-2.5 text-[11.5px] font-semibold text-brand-700 transition-colors hover:bg-[var(--surface-sunken)] dark:text-brand-300"
          >
            {expanded ? 'Show less' : `Show ${hidden} more`}
            <ChevronDown
              size={14}
              className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </button>
        )}
      </div>

      <MoreSheet role={role} open={more} onClose={() => setMore(false)} />
    </section>
  );
}
