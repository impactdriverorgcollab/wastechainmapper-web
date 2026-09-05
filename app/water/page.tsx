'use client';

import { useEffect, useState } from 'react';
import { getWaterDashboard, getWaterAnomalies, getWaterSources } from '@/lib/api';
import type { WaterSource, WaterAnomaly } from '@/lib/types';
import { WATER_SOURCE_LABELS, WATER_ANOMALY_LABELS, WATER_ANOMALY_COLORS } from '@/lib/constants';

export default function WaterMonitoringPage() {
  const [stats, setStats] = useState<{ sourceCount: number; openAnomalies: number; recentReadings: any[] } | null>(null);
  const [anomalies, setAnomalies] = useState<WaterAnomaly[]>([]);
  const [sources, setSources] = useState<WaterSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getWaterDashboard(),
      getWaterAnomalies(false),
      getWaterSources(),
    ]).then(([dashboard, anom, src]) => {
      if (dashboard.status === 'fulfilled') setStats(dashboard.value);
      if (anom.status === 'fulfilled') setAnomalies(anom.value);
      if (src.status === 'fulfilled') setSources(src.value);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-text">WasteChainMapper</span>
          <span className="text-2xs text-text-dim uppercase tracking-widest">Water monitoring</span>
        </div>
        <nav className="flex items-center gap-4 text-xs text-text-secondary">
          <a href="/map" className="hover:text-text">Map</a>
          <a href="/flows" className="hover:text-text">Waste flows</a>
          <a href="/stakeholder" className="hover:text-text">Stakeholder</a>
          <a href="/analytics" className="hover:text-text">Analytics</a>
          <a href="/admin" className="hover:text-text">Admin</a>
        </nav>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Active water sources" value={stats?.sourceCount ?? '—'} color="#60a5fa" />
          <StatCard label="Open anomalies" value={stats?.openAnomalies ?? '—'} color="#a855f7" />
          <StatCard label="Readings logged" value={stats?.recentReadings?.length ?? '—'} color="#22c55e" />
        </div>

        {/* Anomalies */}
        <div className="mb-6">
          <p className="section-header mb-3">Water anomalies</p>
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-2 text-text-dim">
                <tr>
                  {['Type', 'Severity', 'Description', 'Detected', 'Status'].map((h) => (
                    <th key={h} className="data-cell text-left font-medium uppercase tracking-wider text-2xs py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="data-cell text-center text-text-dim py-6">Loading…</td></tr>
                ) : anomalies.length === 0 ? (
                  <tr><td colSpan={5} className="data-cell text-center text-text-dim py-6">No anomalies on record.</td></tr>
                ) : anomalies.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-2 transition-colors">
                    <td className="data-cell">
                      <span className="font-medium" style={{ color: WATER_ANOMALY_COLORS[a.anomalyType] }}>
                        {WATER_ANOMALY_LABELS[a.anomalyType]}
                      </span>
                    </td>
                    <td className="data-cell text-text-secondary">{a.severity ?? '—'}</td>
                    <td className="data-cell text-text-secondary max-w-xs truncate">{a.description ?? '—'}</td>
                    <td className="data-cell text-text-dim font-mono">
                      {new Date(a.detectedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="data-cell">
                      <span className={a.resolvedAt ? 'text-text-dim' : 'text-tier-high'}>
                        {a.resolvedAt ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Water sources */}
        <div>
          <p className="section-header mb-3">Water sources & monitoring points</p>
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-2 text-text-dim">
                <tr>
                  {['Name', 'Type', 'Operator', 'LGA', 'Ward', 'Status'].map((h) => (
                    <th key={h} className="data-cell text-left font-medium uppercase tracking-wider text-2xs py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="data-cell text-center text-text-dim py-6">Loading…</td></tr>
                ) : sources.length === 0 ? (
                  <tr><td colSpan={6} className="data-cell text-center text-text-dim py-6">No water sources registered.</td></tr>
                ) : sources.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                    <td className="data-cell text-text font-medium">{s.name}</td>
                    <td className="data-cell text-text-secondary">{WATER_SOURCE_LABELS[s.sourceType]}</td>
                    <td className="data-cell text-text-secondary">{s.operator ?? '—'}</td>
                    <td className="data-cell text-text-secondary">{s.lga ?? '—'}</td>
                    <td className="data-cell text-text-secondary">{s.ward ?? '—'}</td>
                    <td className="data-cell">
                      <span className={s.isActive ? 'text-[#22c55e]' : 'text-text-dim'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
