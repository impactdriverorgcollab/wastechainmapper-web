import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { InsightsView } from '@/components/analytics/InsightsView';

export const metadata: Metadata = { title: 'Analytics' };

export default function AnalyticsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="What has been reported and where it keeps coming back, where it sits in relation to rivers, drains, schools and flood zones, and where the data is thin. These show patterns and associations. They do not show causes."
      />
      <div className="space-y-12">
        <InsightsView />
        <section aria-labelledby="in-flows">
          <h2 id="in-flows" className="mb-4 text-lg font-semibold text-fg">Waste handling</h2>
          <AnalyticsView />
        </section>
      </div>
    </PageShell>
  );
}
