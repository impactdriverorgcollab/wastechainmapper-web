'use client';

import useSWR from 'swr';
import { getWatchList } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';

/** Experimental: zones where new records are arriving fastest. Labelled as a suggestion, never as a fact. */
export function WatchList() {
  const { data, error, mutate } = useSWR('watch-list', () => getWatchList(), { revalidateOnFocus: false });

  return (
    <section aria-labelledby="watch" className="border-t border-line pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="watch" className="text-lg font-semibold text-fg">Areas to watch</h2>
        <Badge tone="warning">Experimental</Badge>
      </div>
      <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">
        Zones where new records have been arriving fastest. It suggests where to look next. It is not a forecast, and nobody has checked it.
      </p>
      {error ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : !data ? <Skeleton className="h-32 w-full" />
        : data.data.length === 0 ? (
          <p className="text-sm text-fg-muted">Nothing stands out: no zone has had new records in the last 30 days.</p>
        ) : (
          <ol className="divide-y divide-line border-y border-line">
            {data.data.map((w) => (
              <li key={w.rank} className="grid gap-1 py-3 sm:grid-cols-12 sm:gap-4">
                <p className="tabular font-mono text-sm text-fg-subtle sm:col-span-1">{w.rank}</p>
                <p className="text-base font-semibold text-fg sm:col-span-4">{w.communities[0] ?? 'Unnamed area'}<span className="block text-sm font-normal text-fg-muted">{w.lga ?? 'Rivers State'}</span></p>
                <p className="text-sm text-fg-muted sm:col-span-7">{w.reasons.join('; ')}.</p>
              </li>
            ))}
          </ol>
        )}
      {data && <p className="mt-2 max-w-prose text-xs text-fg-subtle">{data.meta.method}</p>}
    </section>
  );
}
