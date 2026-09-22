/**
 * The platform owner's shell. The same frame as every tenant, rail, bottom
 * bar, menu, panels, without an `OrgProvider`, because an owner belongs to no
 * organisation and `requireOrg()` would throw on the first tenant read.
 */
import { Chrome } from '@/components/layout/Chrome';
import { PageHeadingProvider } from '@/components/layout/PageHeading';

export default function PlatformShell() {
  return <Chrome orgName="AfterBI platform" />;
}

export function PlatformShellWithProviders() {
  return (
    <PageHeadingProvider panels>
      <PlatformShell />
    </PageHeadingProvider>
  );
}
