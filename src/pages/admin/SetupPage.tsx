/**
 * Setup: the whole thing, in order, on one screen.
 *
 * The home-screen checklist says what is left; this says how, and it exists
 * because the four steps have a strict dependency order that is not obvious. A
 * product with no depot cannot hold stock. A distributor with no tier cannot be
 * ordered for. An order with no approval threshold approves itself. Somebody
 * setting this up on a Monday morning should not have to discover that by
 * hitting the wall.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { cn } from '@/lib/cn';
import { count } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';

export default function SetupPage() {
  const { user } = useAuth();
  const { settings, products, distributors, warehouses } = useOrg();
  const root = user ? PORTAL_ROOT[user.role] : '/';

  const steps = [
    {
      id: 'company',
      title: 'Name your company',
      body: 'Your name, address and tax ID go on every invoice and statement. The brand colour reaches printed documents only. The app itself stays one design.',
      to: `${root}/settings`,
      done: Boolean(settings?.name),
      state: settings?.name ?? 'Not set',
    },
    {
      id: 'depots',
      title: 'Add your depots',
      body: 'Stock is held per depot, and an order is fulfilled from one. Nothing can be received or shipped until at least one exists. This is the step everything else waits on.',
      to: `${root}/warehouses`,
      done: warehouses.length > 0,
      state: `${count(warehouses.length)} depot${warehouses.length === 1 ? '' : 's'}`,
    },
    {
      id: 'products',
      title: 'Load your products',
      body: 'Each product carries a price for each of the three tiers. A tier you leave blank simply cannot order that product, which is usually what you want for a line only one channel carries.',
      to: `${root}/products`,
      done: products.length > 0,
      state: `${count(products.length)} product${products.length === 1 ? '' : 's'}`,
    },
    {
      id: 'distributors',
      title: 'Add your distributors',
      body: 'Their tier decides which of the three prices they ever see. Their credit limit is checked while an order is being built, not after it is submitted.',
      to: `${root}/distributors`,
      done: distributors.length > 0,
      state: `${count(distributors.length)} distributor${distributors.length === 1 ? '' : 's'}`,
    },
    {
      id: 'people',
      title: 'Add your team',
      body: 'Reps raise orders, the warehouse fulfils them, finance takes the money. Each role sees a different home screen, built from what that job actually does.',
      to: `${root}/invite`,
      done: false,
      state: 'Any time',
    },
    {
      id: 'threshold',
      title: 'Set the approval threshold',
      body: 'The naira figure above which an order needs a signature. Zero means everything self-approves. That suits a small team, and is worth revisiting the moment more than a couple of people are raising orders.',
      to: `${root}/settings`,
      done: (settings?.approvalThreshold ?? 0) > 0,
      state: settings?.approvalThreshold ? 'Set' : 'Everything self-approves',
    },
  ];

  return (
    <div className="[&>*:not(.ab-panel)]:max-w-3xl">
      <PageHeader
        title="Setup"
        description="The whole setup in order. Each step depends on the one above it."
      />

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.id}>
            <Link
              to={step.to}
              className="flex gap-4 rounded-2xl border border-hairline surface-card p-5 shadow-card transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold',
                  step.done
                    ? 'bg-brand-600 text-white dark:bg-brand-400 dark:text-brand-950'
                    : 'border border-[var(--border-strong)] text-muted',
                )}
              >
                {step.done ? <Check size={15} strokeWidth={3} /> : index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-bold text-primary">{step.title}</h2>
                  <Badge tone={step.done ? 'good' : 'neutral'}>{step.state}</Badge>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{step.body}</p>
              </div>

              <ArrowRight size={17} className="mt-1 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
