import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
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

  return <>{children}</>;
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
