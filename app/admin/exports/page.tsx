import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { ExportsPanel } from '@/components/admin/ExportsPanel';

export const metadata: Metadata = { title: 'Exports' };

export default function ExportsPage() {
  return (
    <>
      <PageHeader title="Exports" description="Download the data as CSV or GeoJSON." />
      <ExportsPanel />
    </>
  );
}
