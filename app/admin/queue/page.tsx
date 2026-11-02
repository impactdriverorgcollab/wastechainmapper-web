import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { VerificationQueue } from '@/components/admin/VerificationQueue';

export const metadata: Metadata = { title: 'Review queue' };

export default function QueuePage() {
  return (
    <>
      <PageHeader
        title="Review queue"
        description="Reports from the news scraper, the public form, email and field ambassadors. Check each against its source, its photos and the map position, then corroborate, mark field-verified, or reject. Photos stay private until you approve them. A story that names a community is already on the map as an unconfirmed site. Reviewing it upgrades that site, and rejecting every report on a site hides it."
      />
      <VerificationQueue />
    </>
  );
}
