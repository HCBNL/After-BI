import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { lockedActionAt, PORTAL_ROOT } from '@/lib/tiles';
import { OrgPlanBadge } from '@/components/brand/PlanBadge';
import { BrandLoader } from '@/components/brand/Loader';
import { OrgProvider, useOrg } from '@/context/OrgContext';
import { useAuth } from '@/context/AuthContext';
import { DemoSetup } from '@/components/DemoSetup';
import { Chrome } from './Chrome';
import { PageHeadingProvider } from './PageHeading';

/**
 * A tenant's shell: the shared frame, with the organisation's products,
 * distributors and depots loaded once before any screen mounts.
 */
function OrgGate({ children }: { children: ReactNode }) {
  const { loading, error, reload, settings, products } = useOrg();
  const { user } = useAuth();
  const location = useLocation();

  if (loading) return <BrandLoader label="Getting your organisation ready" />;

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-[15px] font-bold text-primary">We could not reach your organisation</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">Check your internet connection and try again.</p>
        <Button className="mt-5" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  /* A demonstration organisation with nothing in it yet fills itself, once. */
  const fresh = Date.now() - new Date(settings?.demoSeeding ?? 0).getTime() < 15 * 60 * 1000;
  if (settings?.demo && !settings.demoSeededAt && !fresh && user?.role === 'super_admin' && products.length === 0) {
    return <DemoSetup onDone={reload} />;
  }

  /* A screen the plan has locked: say so, rather than show it or a blank page. */
  const locked = user ? lockedActionAt(location.pathname, user.role) : undefined;
  if (locked && user) return <LockedScreen label={locked.label} home={PORTAL_ROOT[user.role]} />;

  return <>{children}</>;
}

function LockedScreen({ label, home }: { label: string; home: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-sunken)] text-muted">
        <Lock size={24} aria-hidden />
      </span>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[16px] font-bold text-primary">
        {label} is not on your plan <OrgPlanBadge size={18} />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Your organisation&rsquo;s plan does not include this feature. Ask your administrator, or contact AfterBI to upgrade.
      </p>
      <Link to={home} className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-500 dark:text-brand-950">
        Go home
      </Link>
    </div>
  );
}

function TenantChrome() {
  const { settings } = useOrg();
  return <Chrome orgName={settings?.name || 'Your organisation'} Gate={OrgGate} />;
}

export default function AppShell() {
  return (
    <OrgProvider>
      <PageHeadingProvider panels>
        <TenantChrome />
      </PageHeadingProvider>
    </OrgProvider>
  );
}
