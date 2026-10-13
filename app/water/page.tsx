import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { WaterView } from '@/components/water/WaterView';

export const metadata: Metadata = { title: 'Water monitoring' };

export default function WaterPage() {
  return (
    <PageShell>
      <PageHeader
        title="Water monitoring"
        description="Water sources, recent readings and reported problems such as leaks, illegal extraction and contamination."
      />
      <WaterView />
    </PageShell>
  );
}
