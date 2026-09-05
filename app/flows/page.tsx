'use client';

import { useEffect, useState } from 'react';
import { getWasteFlows, getFlowStats } from '@/lib/api';
import type { WasteFlow, FlowStatus, WasteType } from '@/lib/types';
import { WASTE_TYPE_LABELS } from '@/lib/constants';

const FLOW_STATUS_LABELS: Record<FlowStatus, string> = {
  PENDING: 'Pending',
  COLLECTED: 'Collected',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  PROCESSED: 'Processed',
};

const FLOW_STATUS_COLORS: Record<FlowStatus, string> = {
  PENDING: '#6b7280',
  COLLECTED: '#22c55e',
  IN_TRANSIT: '#f59e0b',
  DELIVERED: '#3b82f6',
  PROCESSED: '#8b5cf6',
};

export default function FlowsPage() {
  const [flows, setFlows] = useState<WasteFlow[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FlowStatus | ''>('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteType | ''>('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (wasteTypeFilter) params.wasteType = wasteTypeFilter;

    Promise.allSettled([
      getWasteFlows(params),
      getFlowStats(),
    ]).then(([f, s]) => {
      if (f.status === 'fulfilled') setFlows(f.value);
      if (s.status === 'fulfilled') setStats(s.value);
    }).finally(() => setLoading(false));
  }, [statusFilter, wasteTypeFilter]);

  // Aggregate stats
  const totalTonnage = flows.reduce((sum, f) => sum + (f.estimatedTonnage ?? 0), 0);
  const processed = flows.filter((f) => f.status === 'PROCESSED').length;
  const inTransit = flows.filter((f) => f.status === 'IN_TRANSIT').length;

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-text">DELTAFLOW ATLAS</span>
          <span className="text-2xs text-text-dim uppercase tracking-widest">Waste flows</span>
        </div>
        <nav className="flex items-center gap-4 text-xs text-text-secondary">
          <a href="/map" className="hover:text-text">Map</a>
          <a href="/water" className="hover:text-text">Water</a>
          <a href="/stakeholder" className="hover:text-text">Stakeholder</a>
          <a href="/analytics" className="hover:text-text">Analytics</a>
          <a href="/admin" className="hover:text-text">Admin</a>
        </nav>
      </header>

      <main className="p-4 max-w-6xl mx-auto">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Total flows" value={flows.length} color="#e2e8f0" />
          <StatCard label="In transit" value={inTransit} color={FLOW_STATUS_COLORS.IN_TRANSIT} />
          <StatCard label="Processed" value={processed} color={FLOW_STATUS_COLORS.PROCESSED} />
          <StatCard label="Total tonnage" value={totalTonnage > 0 ? `${totalTonnage.toFixed(1)} t` : '—'} color="#22c55e" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-surface-1 border border-border px-2 py-1.5 text-xs text-text focus:outline-none"
          >
            <option value="">All statuses</option>
            {(Object.keys(FLOW_STATUS_LABELS) as FlowStatus[]).map((s) => (
              <option key={s} value={s}>{FLOW_STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select
            value={wasteTypeFilter}
            onChange={(e) => setWasteTypeFilter(e.target.value as any)}
            className="bg-surface-1 border border-border px-2 py-1.5 text-xs text-text focus:outline-none"
          >
            <option value="">All waste types</option>
            {Object.entries(WASTE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Flow pipeline diagram — status breakdown */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto">
          {(Object.keys(FLOW_STATUS_LABELS) as FlowStatus[]).map((status, i) => {
            const count = flows.filter((f) => f.status === status).length;
            return (
              <div key={status} className="flex items-center gap-1">
                <div className="bg-surface-1 border border-border px-3 py-2 text-center min-w-[90px]">
                  <p className="text-base font-semibold" style={{ color: FLOW_STATUS_COLORS[status] }}>{count}</p>
                  <p className="text-2xs text-text-dim">{FLOW_STATUS_LABELS[status]}</p>
                </div>
                {i < 4 && <span className="text-text-dim text-xs shrink-0">→</span>}
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-2 text-text-dim">
              <tr>
                {['Status', 'Waste type', 'Tonnage', 'LGA', 'Destination', 'Created', 'Processed'].map((h) => (
                  <th key={h} className="data-cell text-left font-medium uppercase tracking-wider text-2xs py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="data-cell text-center text-text-dim py-6">Loading…</td></tr>
              ) : flows.length === 0 ? (
                <tr><td colSpan={7} className="data-cell text-center text-text-dim py-6">No flows recorded yet.</td></tr>
              ) : flows.map((flow) => (
                <tr key={flow.id} className="hover:bg-surface-2 transition-colors">
                  <td className="data-cell">
                    <span className="font-medium" style={{ color: FLOW_STATUS_COLORS[flow.status] }}>
                      {FLOW_STATUS_LABELS[flow.status]}
                    </span>
                  </td>
                  <td className="data-cell text-text-secondary">{WASTE_TYPE_LABELS[flow.wasteType]}</td>
                  <td className="data-cell text-text-secondary">
                    {flow.estimatedTonnage != null ? `${flow.estimatedTonnage} t` : '—'}
                  </td>
                  <td className="data-cell text-text-secondary">{flow.lga ?? '—'}</td>
                  <td className="data-cell text-text-secondary">
                    {flow.destinationFacility?.name ?? '—'}
                  </td>
                  <td className="data-cell text-text-dim font-mono">
                    {new Date(flow.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="data-cell text-text-dim font-mono">
                    {flow.processedAt
                      ? new Date(flow.processedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && flows.length > 0 && (
          <p className="text-2xs text-text-dim mt-2">
            Showing {flows.length} flow{flows.length !== 1 ? 's' : ''}.
            Source→collection→transfer→processing→disposal tracked per record.
          </p>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface-1 border border-border px-3 py-3">
      <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
      <p className="text-xs text-text-dim mt-0.5">{label}</p>
    </div>
  );
}
