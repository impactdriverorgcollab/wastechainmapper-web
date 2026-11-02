import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { ProfilesReview } from '@/components/admin/ProfilesReview';

export const metadata: Metadata = { title: 'Public profiles' };

export default function ProfilesPage() {
  return (
    <>
      <PageHeader title="Public profiles" description="People who have asked to show their record in public. Nothing appears on the leaderboard until you approve it." />
      <ProfilesReview />
    </>
  );
}
