import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';

export const metadata: Metadata = { title: 'Analytics' };

export default function AnalyticsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Totals across the platform, and how much recorded waste reaches processing in each area."
      />
      <AnalyticsView />
    </PageShell>
  );
}
