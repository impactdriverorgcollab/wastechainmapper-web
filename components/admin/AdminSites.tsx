'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { getAllSites } from '@/lib/api';
import { plural } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { SiteTable } from '@/components/sites/SiteTable';

export function AdminSites() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('sites-all', () => getAllSites(), {
    revalidateOnFocus: false,
  });
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((s) =>
      [s.communityName, s.ward, s.lga].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, search]);

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} retrying={isValidating} />;
  if (isLoading) return <TableSkeleton columns={7} />;

  if ((data ?? []).length === 0) {
    return (
      <EmptyState
        title="No dump sites yet"
        action={<Link href="/admin/queue" className="btn-primary">Open the review queue</Link>}
      >
        The scraper adds an unconfirmed site when a news story names a specific community. Reviewing a report upgrades that site.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <TextField
          label="Search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Community, ward or area"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nothing matches that search" action={<Button onClick={() => setSearch('')}>Clear search</Button>}>
          Check the spelling, or search for the ward or area instead.
        </EmptyState>
      ) : (
        <>
          <SiteTable sites={rows} showCoordinates />
          <p className="text-sm text-fg-muted">{plural(rows.length, 'site')}.</p>
        </>
      )}
    </div>
  );
}
