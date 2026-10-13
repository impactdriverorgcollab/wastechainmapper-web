'use client';

import { useMemo, useState } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import { getWaterAnomalies, getWaterDashboard, getWaterSources } from '@/lib/api';
import {
  WATER_ANOMALY_COLORS, WATER_ANOMALY_LABELS,
} from '@/lib/constants';
import { NOT_RECORDED, formatDate, formatNumber } from '@/lib/format';
import type { WaterSource } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { SelectField } from '@/components/ui/Field';
import { StatGridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { StatCard, StatGrid } from '@/components/ui/StatCard';

const SWR_OPTIONS = { revalidateOnFocus: false };

function sentence(value: string | null) {
  if (!value) return NOT_RECORDED;
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const PAGE_SIZE = 50;
const ALL = 'all';

function ConditionBadge({ condition }: { condition: string | null | undefined }) {
  if (!condition) return <>{NOT_RECORDED}</>;
  const tone = condition === 'Working' ? 'success' : condition === 'Not working' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{condition}</Badge>;
}

function SourcesTable({ query }: { query: SWRResponse<WaterSource[], Error> }) {
  const [condition, setCondition] = useState(ALL);
  const [area, setArea] = useState(ALL);
  const [shown, setShown] = useState(PAGE_SIZE);

  const all = query.data ?? [];
  const conditions = useMemo(() => Array.from(new Set(all.map((s) => s.condition).filter((c): c is string => !!c))).sort(), [all]);
  const areas = useMemo(() => Array.from(new Set(all.map((s) => s.lga).filter((a): a is string => !!a))).sort(), [all]);
  const rows = useMemo(
    () => all.filter((s) => (condition === ALL || s.condition === condition) && (area === ALL || s.lga === area)),
    [all, condition, area],
  );

  if (query.error) return <ErrorState message={query.error.message} onRetry={() => query.mutate()} retrying={query.isValidating} />;
  if (query.isLoading) return <TableSkeleton columns={6} />;
  if (all.length === 0) {
    return (
      <EmptyState title="No water sources registered">
        Registered extraction, distribution and wastewater points are listed here.
      </EmptyState>
    );
  }

  const surveyed = all.some((s) => s.surveyedAt);
  return (
    <div className="space-y-4">
      {surveyed && (
        <p className="max-w-prose text-sm text-fg-muted">
          Most of these points come from public surveys (the Water Point Data Exchange) carried out in 2015 and 2018.
          The condition shown is how each point was found then, not today.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <SelectField label="Condition" value={condition} onChange={(e) => { setCondition(e.target.value); setShown(PAGE_SIZE); }}>
          <option value={ALL}>All conditions</option>
          {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <SelectField label="Local government area" value={area} onChange={(e) => { setArea(e.target.value); setShown(PAGE_SIZE); }}>
          <option value={ALL}>All areas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </SelectField>
      </div>
      <p role="status" className="text-sm text-fg-muted">
        Showing {formatNumber(Math.min(shown, rows.length))} of {formatNumber(rows.length)} water points
      </p>
      {rows.length === 0 ? (
        <EmptyState title="No water points match">Try a different condition or area.</EmptyState>
      ) : (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Water sources">
          <table className="data-table">
            <caption className="sr-only">Water sources</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Condition</th>
                <th scope="col">Technology</th>
                <th scope="col">Area</th>
                <th scope="col">Surveyed</th>
                <th scope="col" className="num">People within 1 km</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((s) => (
                <tr key={s.id}>
                  <td className="primary">{s.name}</td>
                  <td><ConditionBadge condition={s.condition} /></td>
                  <td>{s.technology ?? NOT_RECORDED}</td>
                  <td>{s.lga ?? NOT_RECORDED}</td>
                  <td>{s.surveyedAt ? formatDate(s.surveyedAt) : NOT_RECORDED}</td>
                  <td className="num">{formatNumber(s.populationServed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {shown < rows.length && (
        <button type="button" className="btn-secondary" onClick={() => setShown((n) => n + PAGE_SIZE)}>
          Show {formatNumber(Math.min(PAGE_SIZE, rows.length - shown))} more
        </button>
      )}
    </div>
  );
}

export function WaterView() {
  const dashboard = useSWR('water-dashboard', getWaterDashboard, SWR_OPTIONS);
  const anomalies = useSWR('water-anomalies', () => getWaterAnomalies(false), SWR_OPTIONS);
  const sources = useSWR('water-sources', () => getWaterSources(), SWR_OPTIONS);

  const open = (anomalies.data ?? []).filter((a) => !a.resolvedAt).length;
  const resolved = (anomalies.data ?? []).length - open;

  return (
    <div className="space-y-8">
      {dashboard.error ? (
        <ErrorState message={dashboard.error.message} onRetry={() => dashboard.mutate()} retrying={dashboard.isValidating} />
      ) : dashboard.isLoading ? (
        <StatGridSkeleton count={3} />
      ) : (
        <StatGrid columns={3}>
          <StatCard label="Active water sources" value={formatNumber(dashboard.data?.sourceCount)} />
          <StatCard label="Open anomalies" value={formatNumber(dashboard.data?.openAnomalies)} />
          <StatCard label="Resolved anomalies" value={anomalies.data ? formatNumber(resolved) : NOT_RECORDED} />
        </StatGrid>
      )}

      <Section id="anomalies-heading" title="Anomalies">
        {anomalies.error ? (
          <ErrorState message={anomalies.error.message} onRetry={() => anomalies.mutate()} retrying={anomalies.isValidating} />
        ) : anomalies.isLoading ? (
          <TableSkeleton columns={5} />
        ) : (anomalies.data ?? []).length === 0 ? (
          <EmptyState title="No anomalies on record">
            Leaks, illegal extraction and contamination hotspots show up here once they are reported.
          </EmptyState>
        ) : (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Water anomalies, newest first">
            <table className="data-table">
              <caption className="sr-only">Water anomalies, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Description</th>
                  <th scope="col">Detected</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.data!.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="inline-flex items-center gap-2 text-fg">
                        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: WATER_ANOMALY_COLORS[a.anomalyType] }} />
                        {WATER_ANOMALY_LABELS[a.anomalyType]}
                      </span>
                    </td>
                    <td>{sentence(a.severity)}</td>
                    <td className="max-w-xs whitespace-normal">{a.description ?? NOT_RECORDED}</td>
                    <td>{formatDate(a.detectedAt)}</td>
                    <td>{a.resolvedAt ? <Badge tone="success">Resolved</Badge> : <Badge tone="warning">Open</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="readings-heading" title="Latest readings">
        {dashboard.error ? null : dashboard.isLoading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : (dashboard.data?.recentReadings ?? []).length === 0 ? (
          <EmptyState title="No readings logged yet">
            Sensor pushes and manual entries appear here, newest first.
          </EmptyState>
        ) : (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="The ten most recent water readings">
            <table className="data-table">
              <caption className="sr-only">The ten most recent water readings</caption>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col" className="num">Volume (m³)</th>
                  <th scope="col" className="num">pH</th>
                  <th scope="col" className="num">Turbidity (NTU)</th>
                  <th scope="col">Recorded</th>
                  <th scope="col">Entry</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.data!.recentReadings.map((r) => (
                  <tr key={r.id}>
                    <td className="primary">{r.source?.name ?? NOT_RECORDED}</td>
                    <td className="num">{formatNumber(r.volumeM3, 1)}</td>
                    <td className="num">{formatNumber(r.ph, 1)}</td>
                    <td className="num">{formatNumber(r.turbidityNtu, 1)}</td>
                    <td>{formatDate(r.recordedAt)}</td>
                    <td>{r.isSensor ? 'Sensor' : 'Manual'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="sources-heading" title="Water sources and monitoring points">
        <SourcesTable query={sources} />
      </Section>
    </div>
  );
}
