'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { getBenchmark, getPlatformSummary, getRecyclables } from '@/lib/api';
import { RIVERS_STATE_LGAS, WASTE_TYPE_LABELS } from '@/lib/constants';
import { NOT_RECORDED, formatNumber, formatPercent, formatTonnes } from '@/lib/format';
import { palette, dataColors } from '@/lib/palette';
import { SelectField } from '@/components/ui/Field';
import { StatGridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { StatCard, StatGrid } from '@/components/ui/StatCard';

const SWR_OPTIONS = { revalidateOnFocus: false };

/**
 * A bar whose length is the value itself, as a share of `max`. The number printed beside it
 * is the same value, so the bar and the label can never disagree.
 */
function BarRow({ label, share, valueLabel, color }: { label: string; share: number; valueLabel: string; color: string }) {
  const width = `${Math.round(Math.min(Math.max(share, 0), 1) * 100)}%`;
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-fg-muted sm:w-36" title={label}>{label}</span>
      <span className="h-2 flex-1 rounded-full bg-panel-3" aria-hidden="true">
        <span className="block h-full rounded-full" style={{ width, backgroundColor: color }} />
      </span>
      <span className="tabular w-16 shrink-0 text-right text-fg">{valueLabel}</span>
    </li>
  );
}

function rateColor(rate: number) {
  return rate > 0.7 ? palette.success : rate > 0.4 ? palette.warning : palette.danger;
}

export function AnalyticsView() {
  const [lga, setLga] = useState('');

  const summary = useSWR('summary', getPlatformSummary, SWR_OPTIONS);
  const benchmark = useSWR('benchmark', getBenchmark, SWR_OPTIONS);
  const recyclables = useSWR(['recyclables', lga], () => getRecyclables(lga || undefined), SWR_OPTIONS);

  const totalRecyclables = useMemo(
    () => (recyclables.data ?? []).reduce((sum, r) => sum + (r._sum.estimatedTonnage ?? 0), 0),
    [recyclables.data],
  );
  const maxRecyclable = useMemo(
    () => Math.max(0, ...(recyclables.data ?? []).map((r) => r._sum.estimatedTonnage ?? 0)),
    [recyclables.data],
  );

  const s = summary.data;

  return (
    <div className="space-y-8">
      {summary.error ? (
        <ErrorState message={summary.error.message} onRetry={() => summary.mutate()} retrying={summary.isValidating} />
      ) : summary.isLoading ? (
        <StatGridSkeleton count={8} />
      ) : (
        <StatGrid>
          <StatCard label="Dump sites" value={formatNumber(s?.totalSites)} />
          <StatCard label="Waste flows recorded" value={formatNumber(s?.totalFlows)} />
          <StatCard label="Share processed" value={s ? formatPercent(s.processingRate) : NOT_RECORDED} />
          <StatCard label="Tonnage recorded" value={s ? formatTonnes(s.totalTonnageTracked) : NOT_RECORDED} />
          <StatCard label="Open water alerts" value={formatNumber(s?.openWaterAnomalies)} />
          <StatCard label="Active facilities" value={formatNumber(s?.activeFacilities)} />
          <StatCard label="Water sources" value={formatNumber(s?.activeWaterSources)} />
          <StatCard label="Active vehicles" value={formatNumber(s?.activeVehicles)} />
        </StatGrid>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="benchmark-heading">
          <h2 id="benchmark-heading" className="text-lg font-semibold">Share of waste processed, by area</h2>
          <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">
            The share of recorded waste flows that reached the processed stage. Areas with no location on the record are grouped as Unknown.
          </p>

          {benchmark.error ? (
            <ErrorState message={benchmark.error.message} onRetry={() => benchmark.mutate()} retrying={benchmark.isValidating} />
          ) : benchmark.isLoading ? (
            <TableSkeleton rows={5} columns={3} />
          ) : (benchmark.data ?? []).length === 0 ? (
            <EmptyState title="No flow data yet">Figures appear once waste flows have been recorded.</EmptyState>
          ) : (
            <>
              <ul className="space-y-3" aria-label="Share processed by area">
                {benchmark.data!.slice(0, 12).map((row) => (
                  <BarRow
                    key={row.lga}
                    label={row.lga}
                    share={row.rate}
                    valueLabel={formatPercent(row.rate)}
                    color={rateColor(row.rate)}
                  />
                ))}
              </ul>
              <div className="table-wrap mt-4" tabIndex={0} role="region" aria-label="Waste processing by local government area">
                <table className="data-table">
                  <caption className="sr-only">Waste processing by local government area</caption>
                  <thead>
                    <tr>
                      <th scope="col">Area</th>
                      <th scope="col" className="num">Flows</th>
                      <th scope="col" className="num">Processed</th>
                      <th scope="col" className="num">Tonnes</th>
                      <th scope="col" className="num">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmark.data!.map((row) => (
                      <tr key={row.lga}>
                        <td className="primary">{row.lga}</td>
                        <td className="num">{formatNumber(row.total)}</td>
                        <td className="num">{formatNumber(row.processed)}</td>
                        <td className="num">{formatNumber(row.tonnage, 1)}</td>
                        <td className="num">{formatPercent(row.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section aria-labelledby="recyclables-heading">
          <h2 id="recyclables-heading" className="text-lg font-semibold">Tonnage by material</h2>
          <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">
            Waste that has been delivered or processed, by material type.
          </p>
          <div className="mb-4 max-w-xs">
            <SelectField label="Local government area" value={lga} onChange={(e) => setLga(e.target.value)}>
              <option value="">All areas</option>
              {RIVERS_STATE_LGAS.map((l) => <option key={l} value={l}>{l}</option>)}
            </SelectField>
          </div>

          {recyclables.error ? (
            <ErrorState message={recyclables.error.message} onRetry={() => recyclables.mutate()} retrying={recyclables.isValidating} />
          ) : recyclables.isLoading ? (
            <TableSkeleton rows={4} columns={3} />
          ) : (recyclables.data ?? []).length === 0 ? (
            <EmptyState title="No delivered or processed waste yet">
              {lga ? 'Nothing has been recorded for this area. Try another area.' : 'Tonnage appears once waste reaches a facility.'}
            </EmptyState>
          ) : (
            <>
              <ul className="space-y-3" aria-label="Tonnes by material">
                {recyclables.data!.map((r) => {
                  const tonnes = r._sum.estimatedTonnage ?? 0;
                  return (
                    <BarRow
                      key={r.wasteType}
                      label={WASTE_TYPE_LABELS[r.wasteType] ?? r.wasteType}
                      share={maxRecyclable > 0 ? tonnes / maxRecyclable : 0}
                      valueLabel={`${formatNumber(tonnes, 1)} t`}
                      color={dataColors.flowStatus.DELIVERED}
                    />
                  );
                })}
              </ul>
              <div className="table-wrap mt-4" tabIndex={0} role="region" aria-label="Tonnage by material type">
                <table className="data-table">
                  <caption className="sr-only">Tonnage by material type</caption>
                  <thead>
                    <tr>
                      <th scope="col">Material</th>
                      <th scope="col" className="num">Flows</th>
                      <th scope="col" className="num">Tonnes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recyclables.data!.map((r) => (
                      <tr key={r.wasteType}>
                        <td className="primary">{WASTE_TYPE_LABELS[r.wasteType] ?? r.wasteType}</td>
                        <td className="num">{formatNumber(r._count.id)}</td>
                        <td className="num">{formatNumber(r._sum.estimatedTonnage ?? 0, 2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="primary">Total</td>
                      <td />
                      <td className="num primary">{formatNumber(totalRecyclables, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      <section aria-labelledby="about-heading" className="rounded-lg bg-panel p-4 sm:p-6">
        <h2 id="about-heading" className="text-base font-semibold">About these figures</h2>
        <p className="mt-2 max-w-prose text-sm text-fg-muted">
          They count only what has been recorded: waste flows taken from news reports about clean-ups and flows entered by field
          verifiers. They are not a full count of the waste produced in Rivers State. A low share processed can mean waste is
          not being processed, or that later stages have not been recorded yet.
        </p>
      </section>
    </div>
  );
}
