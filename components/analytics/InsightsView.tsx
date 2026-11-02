'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { getCoverage, getHotspots, getProximitySummary, getSummaryV1 } from '@/lib/api';
import {
  FLOOD_RISK_LABELS, PROXIMITY_NOTICE, REFERENCE_KIND_LABELS, RIVERS_STATE_LGAS, SETTING_LABELS, WASTE_CATEGORY_INFO,
} from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/format';
import { dataColors } from '@/lib/palette';
import { Badge } from '@/components/ui/Badge';
import { SelectField } from '@/components/ui/Field';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { CoverageTable } from './CoverageTable';
import { RainfallView } from './RainfallView';

const SWR = { revalidateOnFocus: false };

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-2/5 shrink-0 truncate text-fg-muted" title={r.label}>{r.label}</span>
          <span className="h-2 min-w-6 flex-1 rounded-full bg-panel-3" aria-hidden="true">
            <span className="block h-full rounded-full" style={{ width: `${Math.round((r.value / max) * 100)}%`, backgroundColor: dataColors.heat[1] }} />
          </span>
          <span className="tabular w-10 shrink-0 text-right text-fg">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function InsightsView() {
  const [lga, setLga] = useState('');
  const summary = useSWR('summary-v1', getSummaryV1, SWR);
  const hotspots = useSWR('hotspots', () => getHotspots({ minSites: 2 }), SWR);
  const coverage = useSWR('coverage', getCoverage, SWR);
  const proximity = useSWR(['proximity', lga], () => getProximitySummary(lga || undefined), SWR);

  return (
    <div className="space-y-10">
      <section aria-labelledby="in-mix">
        <h2 id="in-mix" className="mb-1 text-lg font-semibold text-fg">What has been reported</h2>
        <p className="mb-4 text-sm text-fg-muted">
          Counts of sites on the map. A site is counted whether it is only reported or has been checked. See the map for which is which.
        </p>
        {summary.error ? <ErrorState message={summary.error.message} onRetry={() => summary.mutate()} /> : !summary.data ? <Skeleton className="h-48 w-full" /> : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-panel p-4">
              <h3 className="mb-3 text-base font-semibold text-fg">By kind of waste</h3>
              <Bars rows={summary.data.byCategory.map((c) => ({ label: WASTE_CATEGORY_INFO[c.category].label, value: c.sites }))} />
            </div>
            <div className="rounded-lg bg-panel p-4">
              <h3 className="mb-3 text-base font-semibold text-fg">By where it is</h3>
              <Bars rows={summary.data.bySetting.map((s) => ({ label: SETTING_LABELS[s.setting], value: s.sites }))} />
            </div>
            <div className="rounded-lg bg-panel p-4">
              <h3 className="mb-3 text-base font-semibold text-fg">Estimated volume</h3>
              <p className="tabular text-2xl font-semibold text-fg">
                {summary.data.estimatedVolume.totalM3 != null ? `${formatNumber(summary.data.estimatedVolume.totalM3)} m³` : 'Not enough data'}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                From {summary.data.estimatedVolume.sitesWithEstimate} sites that have an estimate. {summary.data.estimatedVolume.note}
              </p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="in-hot">
        <h2 id="in-hot" className="mb-1 text-lg font-semibold text-fg">Hotspots</h2>
        <p className="mb-4 max-w-prose text-sm text-fg-muted">
          Groups of sites close together, ranked for attention. &quot;Keeps coming back&quot; means records on at least three different days over at least two weeks.
          {hotspots.data && ` ${hotspots.data.meta.method}`}
        </p>
        {hotspots.error ? <ErrorState message={hotspots.error.message} onRetry={() => hotspots.mutate()} /> : !hotspots.data ? <TableSkeleton /> : hotspots.data.data.length === 0 ? (
          <p className="rounded-lg bg-panel px-4 py-4 text-sm text-fg-muted">No group of two or more sites is close enough to count as a hotspot yet.</p>
        ) : (
          <div className="table-wrap" tabIndex={0}>
            <table className="data-table">
              <caption className="sr-only">Hotspots, highest ranked first</caption>
              <thead><tr><th scope="col" className="num">Rank</th><th scope="col">Where</th><th scope="col" className="num">Sites</th><th scope="col" className="num">Days with records</th><th scope="col">Flags</th><th scope="col">Last record</th><th scope="col"><span className="sr-only">Map</span></th></tr></thead>
              <tbody>
                {hotspots.data.data.slice(0, 15).map((h) => (
                  <tr key={h.rank}>
                    <td className="num">{h.rank}</td>
                    <td className="primary">{h.communities.join(', ') || 'Unnamed area'}<span className="block text-xs font-normal text-fg-muted">{h.lga ?? 'Area not known'}</span></td>
                    <td className="num">{h.siteCount} ({h.verifiedSiteCount} checked)</td>
                    <td className="num">{h.observationDays}</td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        {h.recurring && <Badge tone="warning">Keeps coming back</Badge>}
                        {h.hazardous && <Badge tone="danger">Hazardous</Badge>}
                        {h.waterContact && <Badge tone="warning">Near water</Badge>}
                        {!h.recurring && !h.hazardous && !h.waterContact && <span className="text-fg-subtle">None</span>}
                      </span>
                    </td>
                    <td>{formatDate(h.lastObservedAt)}</td>
                    <td><Link href={`/map?lat=${h.centre.latitude}&lng=${h.centre.longitude}`} className="inline-flex min-h-11 items-center text-accent hover:text-accent-hover">Map<span className="sr-only"> hotspot {h.rank}</span></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="in-near">
        <h2 id="in-near" className="mb-1 text-lg font-semibold text-fg">Reported waste near other things</h2>
        <div role="note" className="mb-4 rounded-lg bg-warning-soft p-4 text-sm text-fg">
          <p className="font-semibold">Read this first</p>
          <p className="mt-1 text-fg-muted">{PROXIMITY_NOTICE}</p>
        </div>
        <div className="mb-4 max-w-xs">
          <SelectField label="Local government area" optional value={lga} onChange={(e) => setLga(e.target.value)}>
            <option value="">All 23</option>
            {RIVERS_STATE_LGAS.map((l) => <option key={l} value={l}>{l}</option>)}
          </SelectField>
        </div>
        {proximity.error ? <ErrorState message={proximity.error.message} onRetry={() => proximity.mutate()} /> : !proximity.data ? <TableSkeleton /> : (
          <>
            <div className="table-wrap" tabIndex={0}>
              <table className="data-table">
                <caption className="sr-only">Number of sites within set distances of each kind of feature</caption>
                <thead><tr><th scope="col">Feature</th><th scope="col" className="num">On the map</th><th scope="col" className="num">Within 250 m</th><th scope="col" className="num">Within 500 m</th><th scope="col" className="num">Within 1 km</th></tr></thead>
                <tbody>
                  {Object.entries(proximity.data.byKind).map(([kind, v]) => (
                    <tr key={kind}>
                      <td className="primary">{REFERENCE_KIND_LABELS[kind as keyof typeof REFERENCE_KIND_LABELS] ?? kind}</td>
                      <td className="num">{formatNumber(v.featuresLoaded)}</td>
                      {v.featuresLoaded === 0
                        ? <td className="num !whitespace-normal text-fg-subtle" colSpan={3}>No data loaded</td>
                        : <><td className="num">{v.within250}</td><td className="num">{v.within500}</td><td className="num">{v.within1000}</td></>}
                    </tr>
                  ))}
                  <tr>
                    <td className="primary">Flood-risk zone</td>
                    <td className="num">{proximity.data.floodZones.zonesLoaded}</td>
                    {proximity.data.floodZones.zonesLoaded === 0
                      ? <td className="num !whitespace-normal text-fg-subtle" colSpan={3}>No boundaries loaded</td>
                      : <td className="num !whitespace-normal" colSpan={3}>{proximity.data.floodZones.sitesInside.length === 0 ? 'No sites inside a zone' : proximity.data.floodZones.sitesInside.map((z) => `${z.sites} inside ${FLOOD_RISK_LABELS[z.risk as keyof typeof FLOOD_RISK_LABELS]?.toLowerCase() ?? z.risk} zones`).join(', ')}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-fg-muted">
              Out of {formatNumber(proximity.data.totalSites)} sites. Drains and some rivers are only on the map where volunteers drew them, so the counts for drains in particular are low.
              Waterways, drains, schools and health facilities come from OpenStreetMap contributors.
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="in-rain">
        <h2 id="in-rain" className="mb-1 text-lg font-semibold text-fg">Rainfall and new reports</h2>
        <p className="mb-4 max-w-prose text-sm text-fg-muted">Whether more sites are reported in wetter months. Look at the shape over time and do not read it as cause and effect.</p>
        <RainfallView />
      </section>

      <section aria-labelledby="in-cov">
        <h2 id="in-cov" className="mb-1 text-lg font-semibold text-fg">Where there is too little data</h2>
        {coverage.error ? <ErrorState message={coverage.error.message} onRetry={() => coverage.mutate()} /> : !coverage.data ? <TableSkeleton /> : (
          <CoverageTable rows={coverage.data.data} unplaced={coverage.data.meta.unplacedAwaitingReview} />
        )}
      </section>
    </div>
  );
}
