'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { getFlowStats, getWasteFlows } from '@/lib/api';
import {
  FLOW_STATUS_COLORS, FLOW_STATUS_LABELS, FLOW_STATUS_ORDER, WASTE_TYPE_LABELS,
} from '@/lib/constants';
import { NOT_RECORDED, formatDate, formatNumber, formatTonnes, plural } from '@/lib/format';
import type { FlowStatus, WasteType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { StatGridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { StatCard, StatGrid } from '@/components/ui/StatCard';

const TABLE_LIMIT = 200;

function StatusLabel({ status }: { status: FlowStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-fg">
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: FLOW_STATUS_COLORS[status] }} />
      {FLOW_STATUS_LABELS[status]}
    </span>
  );
}

export function FlowsView() {
  const [statusFilter, setStatusFilter] = useState<FlowStatus | ''>('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteType | ''>('');

  // Totals come from the aggregate endpoint, so they cover every record and not just the page
  // the table shows.
  const stats = useSWR('flow-stats', () => getFlowStats(), { revalidateOnFocus: false });
  const flows = useSWR(
    ['flows', statusFilter, wasteTypeFilter],
    () =>
      getWasteFlows({
        limit: String(TABLE_LIMIT),
        ...(statusFilter && { status: statusFilter }),
        ...(wasteTypeFilter && { wasteType: wasteTypeFilter }),
      }),
    { revalidateOnFocus: false },
  );

  const totals = useMemo(() => {
    const rows = (stats.data ?? []).filter((r) => !wasteTypeFilter || r.wasteType === wasteTypeFilter);
    const byStatus = Object.fromEntries(FLOW_STATUS_ORDER.map((s) => [s, 0])) as Record<FlowStatus, number>;
    let tonnage = 0;
    for (const r of rows) {
      byStatus[r.status] += r._count.id;
      tonnage += r._sum.estimatedTonnage ?? 0;
    }
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { byStatus, total, tonnage };
  }, [stats.data, wasteTypeFilter]);

  const matching = statusFilter ? totals.byStatus[statusFilter] : totals.total;
  const hasFilters = !!(statusFilter || wasteTypeFilter);

  return (
    <div className="space-y-6">
      {stats.error ? (
        <ErrorState message={stats.error.message} onRetry={() => stats.mutate()} retrying={stats.isValidating} />
      ) : stats.isLoading ? (
        <StatGridSkeleton />
      ) : (
        <>
          <StatGrid>
            <StatCard label="Waste flows recorded" value={formatNumber(totals.total)} />
            <StatCard label="In transit" value={formatNumber(totals.byStatus.IN_TRANSIT)} />
            <StatCard label="Processed" value={formatNumber(totals.byStatus.PROCESSED)} />
            <StatCard label="Tonnage recorded" value={totals.tonnage > 0 ? formatTonnes(totals.tonnage) : NOT_RECORDED} />
          </StatGrid>

          <section aria-labelledby="pipeline-heading">
            <h2 id="pipeline-heading" className="mb-2 text-base font-semibold">Where recorded waste is now</h2>
            <p className="mb-3 max-w-prose text-sm text-fg-muted">
              Each record moves from collected to processed. Select a stage to filter the table.
            </p>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {FLOW_STATUS_ORDER.map((status, i) => {
                const pressed = statusFilter === status;
                return (
                  <li key={status}>
                    <button
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => setStatusFilter(pressed ? '' : status)}
                      className={`flex min-h-11 w-full flex-col items-start rounded-lg p-4 text-left transition-colors duration-150 ${
                        pressed ? 'bg-accent-soft' : 'bg-panel hover:bg-panel-2'
                      }`}
                    >
                      <span className="tabular text-xl font-semibold text-fg">{formatNumber(totals.byStatus[status])}</span>
                      <span className="mt-1 text-sm text-fg-muted">{i + 1}. <StatusLabel status={status} /></span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}

      <form className="grid gap-3 sm:grid-cols-3 sm:items-end" onSubmit={(e) => e.preventDefault()} aria-label="Filter flows">
        <SelectField label="Stage" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FlowStatus | '')}>
          <option value="">All stages</option>
          {FLOW_STATUS_ORDER.map((s) => <option key={s} value={s}>{FLOW_STATUS_LABELS[s]}</option>)}
        </SelectField>
        <SelectField label="Waste type" value={wasteTypeFilter} onChange={(e) => setWasteTypeFilter(e.target.value as WasteType | '')}>
          <option value="">All types</option>
          {Object.entries(WASTE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </SelectField>
        {hasFilters && (
          <Button variant="ghost" onClick={() => { setStatusFilter(''); setWasteTypeFilter(''); }}>Clear filters</Button>
        )}
      </form>

      {flows.error ? (
        <ErrorState message={flows.error.message} onRetry={() => flows.mutate()} retrying={flows.isValidating} />
      ) : flows.isLoading ? (
        <TableSkeleton columns={6} />
      ) : (flows.data ?? []).length === 0 ? (
        <EmptyState title={hasFilters ? 'No flows match these filters' : 'No waste flows recorded yet'}>
          {hasFilters
            ? 'Try a different stage or waste type.'
            : 'Flows are recorded when a news report describes waste being collected, or when a field verifier adds one.'}
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Waste flows, newest first">
            <table className="data-table">
              <caption className="sr-only">Waste flows, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Stage</th>
                  <th scope="col">Waste type</th>
                  <th scope="col" className="num">Tonnage</th>
                  <th scope="col">LGA</th>
                  <th scope="col">Destination</th>
                  <th scope="col">Recorded</th>
                  <th scope="col">Processed</th>
                </tr>
              </thead>
              <tbody>
                {flows.data!.map((flow) => (
                  <tr key={flow.id}>
                    <td><StatusLabel status={flow.status} /></td>
                    <td>{WASTE_TYPE_LABELS[flow.wasteType]}</td>
                    <td className="num">{formatTonnes(flow.estimatedTonnage)}</td>
                    <td>{flow.lga ?? NOT_RECORDED}</td>
                    <td>{flow.destinationFacility?.name ?? NOT_RECORDED}</td>
                    <td>{formatDate(flow.createdAt, false)}</td>
                    <td>{formatDate(flow.processedAt, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-fg-muted">
            Showing {plural(flows.data!.length, 'flow')} of {formatNumber(matching)}, newest first.
            {matching > flows.data!.length && ' Use the filters to narrow the list.'}
          </p>
        </>
      )}
    </div>
  );
}
