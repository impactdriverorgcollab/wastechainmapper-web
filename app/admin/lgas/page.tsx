import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { LgaEngagement } from '@/components/admin/LgaEngagement';

export const metadata: Metadata = { title: 'Local governments' };

export default function LgaPage() {
  return (
    <>
      <PageHeader
        title="Local governments"
        description="Who has been contacted in each of the 23 areas, how far the talks have got, and which records each has shared: authorised collection points, disposal sites, routes and schedules, drainage and waste tonnage."
      />
      <LgaEngagement />
    </>
  );
}
