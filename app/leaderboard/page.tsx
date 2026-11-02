import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { Leaderboard } from '@/components/account/Leaderboard';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Ambassadors and public reporters ranked on waste reports that a reviewer has approved.',
};

export default function LeaderboardPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Leaderboard" description="Ambassadors and public reporters, ranked on the reports a reviewer has approved. Open any name to see that person's checked record." />
        <Leaderboard />
      </div>
    </PageShell>
  );
}
