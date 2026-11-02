import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { Overview } from '@/components/admin/Overview';

export const metadata: Metadata = { title: 'Overview' };

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="What is on the map, what needs attention, and where the data is thin." />
      <Overview />
    </>
  );
}
