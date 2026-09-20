import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { OrgProvider, useOrg } from '@/context/OrgContext';
import { Chrome } from './Chrome';
import { PageHeadingProvider } from './PageHeading';

/**
 * A tenant's shell: the shared frame, with the organisation's products,
 * distributors and depots loaded once before any screen mounts.
 */
function OrgGate({ children }: { children: ReactNode }) {
  const { loading, error, reload } = useOrg();

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
