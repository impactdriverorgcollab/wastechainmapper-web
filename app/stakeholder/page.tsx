import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { SiteRegister } from '@/components/sites/SiteRegister';

export const metadata: Metadata = { title: 'Dump site register' };

export default function StakeholderPage() {
  return (
    <PageShell>
      <PageHeader
        title="Dump site register"
        description="Every dump site, with how sure we are about each one, as a table you can filter and download. This is the same data as the map. Unconfirmed sites come from news stories that no reviewer has checked yet."
      />
      <SiteRegister />
    </PageShell>
  );
}
