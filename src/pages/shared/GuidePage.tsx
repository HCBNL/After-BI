/**
 * Help: "how do I…", answered from the app's own written guides.
 *
 * Three parts. A search that matches what somebody types against every guide
 * for their role (`searchGuides`, rules not AI, see `lib/guide.ts`). The
 * guides themselves, each a numbered list of exact steps with a button to the
 * screen. And what every role is for, the reader's own first, which is how a
 * new finance manager finds out what the job looks like inside AfterBI.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Compass, Lightbulb, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui';
import { RoleCards } from '@/components/guide/RoleCards';
import { useAuth } from '@/context/AuthContext';
import { useTour } from '@/context/TourContext';
import { guidesFor, searchGuides, type HowTo } from '@/lib/guide';
import { actionsForRole, PORTAL_ROOT } from '@/lib/tiles';
import { ROLE_LABEL, type Role } from '@/types';
import { cn } from '@/lib/cn';

/** The questions people ask first, as one-tap starting points. */
const STARTERS: Partial<Record<Role, string[]>> = {
  super_admin: ['set up the company', 'add a person', 'who signs big orders'],
  admin: ['add a person', 'credit limit', 'export to excel'],
  staff: ['raise an order', 'stock in', 'statement'],
  sales_rep: ['raise an order', 'record sell-out', 'my tasks'],
  distributor: ['raise an order', 'damaged goods', 'statement'],
  warehouse_manager: ['fulfil an order', 'stock in', 'receive a return'],
  operations_manager: ['approve an order', 'fulfil an order', 'stuck orders'],
  finance_manager: ['raise an invoice', 'record a payment', 'credit limit'],
  owner: ['write a proposal', 'founder photo', 'write a blog article'],
};

export default function GuidePage() {
  const { user } = useAuth();
  const { start } = useTour();
  const [question, setQuestion] = useState('');
  const role: Role = user?.role ?? 'staff';

  const all = useMemo(() => guidesFor(role), [role]);
  const results = useMemo(() => (question.trim() ? searchGuides(question, role) : []), [question, role]);
  const asking = question.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Help"
        description="How to do anything in AfterBI, step by step, and what every role is for."
        actions={
          <Button variant="outline" size="sm" icon={<Compass size={15} />} onClick={start}>
            Take the tour
          </Button>
        }
      />

      {/* ----------------------------------------------------------- ask */}
      <section className="rounded-2xl border border-hairline surface-card p-4 shadow-card sm:p-5">
        <label htmlFor="guide-q" className="text-[15px] font-bold text-primary">
          What do you want to do?
        </label>
        <div className="relative mt-2">
          <Search size={17} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="guide-q"
            type="search"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="For example: how do I record a payment"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-hairline surface-sunken pl-10 pr-4 text-[16px] text-primary outline-none transition-colors placeholder:text-muted focus:border-brand-500"
          />
        </div>
        {!asking && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(STARTERS[role] ?? []).map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => setQuestion(starter)}
                className="h-8 rounded-full surface-sunken px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:text-primary"
              >
                {starter}
              </button>
            ))}
          </div>
        )}

        {asking && (
          <div className="mt-4">
            {results.length === 0 ? (
              <p className="text-[13.5px] leading-relaxed text-secondary">
                No guide matches that yet. Try other words, such as the name of the screen (Orders, Invoices,
                Stock), or browse the guides below.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-[12.5px] text-muted">
                  {results.length === 1 ? 'This should help:' : `${results.length} guides match, best first:`}
                </p>
                {results.map((guide, index) => (
                  <GuideCard key={guide.id} guide={guide} role={role} open={index === 0} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- guides */}
      {!asking && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-primary">
            <Lightbulb size={17} className="text-brand-600 dark:text-brand-400" aria-hidden />
            Guides for {ROLE_LABEL[role].toLowerCase()}
          </h2>
          <div className="mt-3 space-y-2.5">
            {all.map((guide) => (
              <GuideCard key={guide.id} guide={guide} role={role} />
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- roles */}
      {role !== 'owner' && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-primary">
            <Users size={17} className="text-brand-600 dark:text-brand-400" aria-hidden />
            What every role does
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted">Yours is first and open. AfterBI shows each person only what their role needs.</p>
          <RoleCards mine={role} className="mt-3" />
        </section>
      )}
      {role === 'owner' && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-primary">
            <Users size={17} className="text-brand-600 dark:text-brand-400" aria-hidden />
            The roles your customers use
          </h2>
          <RoleCards className="mt-3" />
        </section>
      )}
    </div>
  );
}

/** One guide: the title, and when opened, numbered steps with a way to each screen. */
function GuideCard({ guide, role, open: startOpen = false }: { guide: HowTo; role: Role; open?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const root = PORTAL_ROOT[role];
  /* A step only links to a screen this person can actually open. */
  const reachable = useMemo(() => new Set(actionsForRole(role).map((a) => a.to.split('?')[0])), [role]);
  const linkFor = (to?: string) => {
    if (!to) return null;
    const leaf = to.split('?')[0];
    if (leaf !== 'profile' && !reachable.has(leaf)) return null;
    return `${root}/${to}`;
  };

  return (
    <article className="rounded-2xl border border-hairline surface-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-primary">{guide.title}</span>
        <span className="shrink-0 text-[12px] text-muted">{guide.steps.length} steps</span>
        <ChevronDown size={17} aria-hidden className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-hairline p-4">
          <ol className="space-y-3">
            {guide.steps.map((step, index) => {
              const href = linkFor(step.to);
              return (
                <li key={index} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white dark:bg-brand-500 dark:text-brand-950">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13.5px] leading-relaxed text-secondary">{step.text}</p>
                    {href && (
                      <Link
                        to={href}
                        className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
                      >
                        Take me there <ArrowRight size={13} aria-hidden />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {guide.tips && guide.tips.length > 0 && (
            <ul className="mt-4 space-y-1.5 rounded-xl surface-sunken p-3">
              {guide.tips.map((tip, index) => (
                <li key={index} className="flex gap-2 text-[12.5px] leading-snug text-secondary">
                  <Lightbulb size={14} className="mt-0.5 shrink-0 text-gold-500" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
