import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { VerificationQueue } from '@/components/admin/VerificationQueue';

export const metadata: Metadata = { title: 'Review queue' };

export default function QueuePage() {
  return (
    <>
      <PageHeader
        title="Review queue"
        description="Reports found by the scraper or sent on WhatsApp. Check each against its source and the map position, then corroborate, mark field-verified, or reject. A story that names a community is already on the map as an unconfirmed site. Reviewing it upgrades that site, and rejecting every report on a site hides it."
      />
      <VerificationQueue />
    </>
  );
}
