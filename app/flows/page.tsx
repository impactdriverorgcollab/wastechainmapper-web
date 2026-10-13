import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { FlowsView } from '@/components/flows/FlowsView';

export const metadata: Metadata = { title: 'Waste flows' };

export default function FlowsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Waste flows"
        description="Waste that has been collected, moved or processed, from collection to its destination."
      />
      <FlowsView />
    </PageShell>
  );
}
