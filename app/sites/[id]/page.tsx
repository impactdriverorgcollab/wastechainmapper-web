import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { SiteRecord } from '@/components/sites/SiteRecord';

export const metadata: Metadata = { title: 'Site record' };

export default function SitePage({ params }: { params: { id: string } }) {
  return (
    <PageShell>
      <SiteRecord id={params.id} />
    </PageShell>
  );
}
