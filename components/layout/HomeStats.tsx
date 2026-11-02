'use client';

import useSWR from 'swr';
import { getSummaryV1 } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatGrid } from '@/components/ui/StatCard';

export function HomeStats() {
  const { data, error } = useSWR('home-summary', getSummaryV1, { revalidateOnFocus: false });
  if (error) return <p className="rounded-lg bg-panel px-4 py-4 text-sm text-fg-muted">The latest figures could not be loaded. The map and the reporting form still work.</p>;
  if (!data) return <Skeleton className="h-24 w-full" />;
  return (
    <div>
      <StatGrid>
        <StatCard label="Sites on the map" value={formatNumber(data.sites.total)} />
        <StatCard label="Checked by a reviewer" value={formatNumber(data.sites.corroborated + data.sites.fieldVerified)} note={`${formatNumber(data.sites.fieldVerified)} confirmed on the ground`} />
        <StatCard label="Reported, not yet checked" value={formatNumber(data.sites.reported)} />
        <StatCard label="Collection points" value={formatNumber(data.collectionPoints)} />
      </StatGrid>
      {data.lastUpdated && <p className="mt-2 text-sm text-fg-subtle">Last change {formatDate(data.lastUpdated)}.</p>}
    </div>
  );
}
