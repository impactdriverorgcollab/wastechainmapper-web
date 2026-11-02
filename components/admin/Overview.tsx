'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { getCoverage, getDataQuality, getHotspots, getSummaryV1 } from '@/lib/api';
import { useAuthedSWR } from '@/lib/auth';
import { formatDate, formatNumber } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { CoverageTable } from '@/components/analytics/CoverageTable';

export function Overview() {
  const quality = useAuthedSWR('data-quality', (t) => getDataQuality(t));
  const summary = useSWR('summary-v1', getSummaryV1, { revalidateOnFocus: false });
  const coverage = useSWR('coverage', getCoverage, { revalidateOnFocus: false });
  const hotspots = useSWR('hotspots-top', () => getHotspots({ minSites: 2 }), { revalidateOnFocus: false });

  const items = quality.data?.items ?? [];
  const open = items.filter((i) => i.count > 0);

  return (
    <div className="space-y-8">
      <section aria-labelledby="ov-totals">
        <h2 id="ov-totals" className="mb-3 text-lg font-semibold text-fg">The map today</h2>
        {summary.error ? <ErrorState message={summary.error.message} onRetry={() => summary.mutate()} /> : !summary.data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <StatGrid>
            <StatCard label="Sites on the map" value={formatNumber(summary.data.sites.total)} />
            <StatCard label="Reported, not yet checked" value={formatNumber(summary.data.sites.reported)} />
            <StatCard label="Corroborated" value={formatNumber(summary.data.sites.corroborated)} />
            <StatCard label="Field-verified" value={formatNumber(summary.data.sites.fieldVerified)} />
          </StatGrid>
        )}
      </section>

      <section aria-labelledby="ov-quality">
        <h2 id="ov-quality" className="mb-1 text-lg font-semibold text-fg">Needs attention</h2>
        <p className="mb-3 text-sm text-fg-muted">Data-quality checks. Each count links to where it is fixed.</p>
        {quality.error && quality.error.status !== 401 ? (
          <ErrorState message={quality.error.message} onRetry={() => quality.mutate()} />
        ) : !quality.data ? (
          <Skeleton className="h-40 w-full" />
        ) : open.length === 0 ? (
          <p className="rounded-lg bg-success-soft px-4 py-4 text-sm text-success">Nothing needs attention. Every check passed.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg bg-panel">
            {items.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 hover:bg-panel-2">
                  <span className={i.count > 0 ? 'text-fg' : 'text-fg-muted'}>{i.label}</span>
                  <span className="tabular shrink-0"><Badge tone={i.count > 0 ? 'warning' : 'success'}>{formatNumber(i.count)}</Badge></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ov-coverage">
        <h2 id="ov-coverage" className="mb-1 text-lg font-semibold text-fg">Coverage by local government area</h2>
        <p className="mb-3 text-sm text-fg-muted">Where the platform knows something, and where it knows very little.</p>
        {coverage.error ? <ErrorState message={coverage.error.message} onRetry={() => coverage.mutate()} /> : !coverage.data ? <TableSkeleton /> : (
          <CoverageTable rows={coverage.data.data} unplaced={coverage.data.meta.unplacedAwaitingReview} />
        )}
      </section>

      <section aria-labelledby="ov-hot">
        <h2 id="ov-hot" className="mb-3 text-lg font-semibold text-fg">Hotspots to look at</h2>
        {hotspots.error ? <ErrorState message={hotspots.error.message} onRetry={() => hotspots.mutate()} /> : !hotspots.data ? <Skeleton className="h-32 w-full" /> : hotspots.data.data.length === 0 ? (
          <p className="rounded-lg bg-panel px-4 py-4 text-sm text-fg-muted">No group of two or more sites is close enough to count as a hotspot yet.</p>
        ) : (
          <ol className="space-y-2">
            {hotspots.data.data.slice(0, 5).map((h) => (
              <li key={h.rank} className="rounded-lg bg-panel p-4">
                <p className="text-base font-semibold text-fg">
                  {h.communities[0] ?? 'Unnamed area'}{h.lga ? `, ${h.lga}` : ''}
                </p>
                <p className="text-sm text-fg-muted">
                  {h.siteCount} sites ({h.verifiedSiteCount} checked), {h.observationDays} days with records, last {formatDate(h.lastObservedAt)}
                </p>
                <p className="mt-1 flex flex-wrap gap-2">
                  {h.recurring && <Badge tone="warning">Keeps coming back</Badge>}
                  {h.hazardous && <Badge tone="danger">Hazardous waste</Badge>}
                  {h.waterContact && <Badge tone="warning">Near or in water</Badge>}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
