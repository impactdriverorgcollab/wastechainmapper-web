'use client';

import { useEffect, useState } from 'react';
import { getPlatformSummary, getBenchmark, getRecyclables } from '@/lib/api';
import type { PlatformSummary } from '@/lib/types';
import { WASTE_TYPE_LABELS } from '@/lib/constants';

const RIVERS_STATE_LGAS = [
  'Port Harcourt', 'Obio-Akpor', 'Eleme', 'Ikwerre', 'Emohua',
  'Ahoada East', 'Ahoada West', 'Ogba/Egbema/Ndoni', 'Khana', 'Gokana',
  'Tai', 'Etche', 'Ogu/Bolo', 'Okrika', 'Degema', 'Asari-Toru',
  'Abua/Odual', 'Andoni', 'Opobo/Nkoro', 'Bonny', 'Akuku-Toru',
];

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xs text-text-dim w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-2xs tabular-nums text-text-secondary w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [benchmark, setBenchmark] = useState<any[]>([]);
  const [recyclables, setRecyclables] = useState<any[]>([]);
  const [lgaFilter, setLgaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getPlatformSummary(),
      getBenchmark(),
      getRecyclables(lgaFilter || undefined),
    ]).then(([s, b, r]) => {
      if (s.status === 'fulfilled') setSummary(s.value);
      if (b.status === 'fulfilled') setBenchmark(b.value);
      if (r.status === 'fulfilled') setRecyclables(r.value);
    }).finally(() => setLoading(false));
  }, [lgaFilter]);

  const topProcessingRate = benchmark.length > 0 ? benchmark[0].rate : 1;
  const totalRecyclables = recyclables.reduce((sum, r) => sum + (r._sum?.estimatedTonnage ?? 0), 0);

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-text">DELTAFLOW ATLAS</span>
          <span className="text-2xs text-text-dim uppercase tracking-widest">Analytics</span>
        </div>
        <nav className="flex items-center gap-4 text-xs text-text-secondary">
          <a href="/map" className="hover:text-text">Map</a>
          <a href="/flows" className="hover:text-text">Waste Flows</a>
          <a href="/water" className="hover:text-text">Water</a>
          <a href="/stakeholder" className="hover:text-text">Stakeholder</a>
          <a href="/admin" className="hover:text-text">Admin</a>
        </nav>
      </header>

      <main className="p-4 max-w-6xl mx-auto space-y-6">

        {/* Platform KPI strip */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          <StatCard label="Dump sites"        value={summary?.totalSites ?? '—'}       color="#e2e8f0" />
          <StatCard label="Total flows"        value={summary?.totalFlows ?? '—'}       color="#f59e0b" />
          <StatCard label="Processing rate"    value={summary ? `${Math.round(summary.processingRate * 100)}%` : '—'} color="#22c55e" />
          <StatCard label="Tonnage tracked"    value={summary ? `${summary.totalTonnageTracked.toFixed(0)} t` : '—'} color="#a78bfa" />
          <StatCard label="Open water alerts"  value={summary?.openWaterAnomalies ?? '—'} color="#ef4444" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Active facilities"  value={summary?.activeFacilities ?? '—'}   color="#60a5fa" />
          <StatCard label="Water sources"      value={summary?.activeWaterSources ?? '—'} color="#34d399" />
          <StatCard label="Active vehicles"    value={summary?.activeVehicles ?? '—'}     color="#fb923c" />
        </div>

        {/* LGA filter */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-text-dim">Filter by LGA:</label>
          <select
            value={lgaFilter}
            onChange={(e) => setLgaFilter(e.target.value)}
            className="bg-surface-1 border border-border px-2 py-1.5 text-xs text-text focus:outline-none"
          >
            <option value="">All LGAs</option>
            {RIVERS_STATE_LGAS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LGA Benchmark */}
          <section>
            <p className="section-header mb-3">Waste processing rate by LGA</p>
            <p className="text-2xs text-text-dim mb-3">
              Percentage of recorded waste flows reaching PROCESSED status.
              Supports contractor performance scoring and tipping-fee negotiations.
            </p>
            {loading ? (
              <p className="text-xs text-text-dim">Loading…</p>
            ) : benchmark.length === 0 ? (
              <p className="text-xs text-text-dim">No flow data recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {benchmark.slice(0, 12).map((row) => (
                  <BarRow
                    key={row.lga}
                    label={row.lga}
                    value={row.rate}
                    max={topProcessingRate}
                    color={row.rate > 0.7 ? '#22c55e' : row.rate > 0.4 ? '#f59e0b' : '#ef4444'}
                  />
                ))}
              </div>
            )}

            {benchmark.length > 0 && (
              <div className="mt-4 border border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-surface-2 text-text-dim">
                    <tr>
                      {['LGA', 'Total', 'Processed', 'Tonnage (t)', 'Rate'].map((h) => (
                        <th key={h} className="data-cell text-left text-2xs font-medium py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {benchmark.map((row) => (
                      <tr key={row.lga} className="hover:bg-surface-2">
                        <td className="data-cell text-text">{row.lga}</td>
                        <td className="data-cell text-text-secondary">{row.total}</td>
                        <td className="data-cell text-text-secondary">{row.processed}</td>
                        <td className="data-cell text-text-secondary">{row.tonnage.toFixed(1)}</td>
                        <td className="data-cell font-medium" style={{ color: row.rate > 0.7 ? '#22c55e' : row.rate > 0.4 ? '#f59e0b' : '#ef4444' }}>
                          {Math.round(row.rate * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recyclables tonnage */}
          <section>
            <p className="section-header mb-3">Recyclables market intelligence</p>
            <p className="text-2xs text-text-dim mb-3">
              Delivered and processed tonnage by material type. Powers secondary-materials market pricing
              and off-take agreement intelligence for recyclables traders.
            </p>

            {loading ? (
              <p className="text-xs text-text-dim">Loading…</p>
            ) : recyclables.length === 0 ? (
              <p className="text-xs text-text-dim">No recyclables data yet.</p>
            ) : (
              <>
                <div className="space-y-2.5 mb-4">
                  {recyclables.map((r) => {
                    const tonnes = r._sum?.estimatedTonnage ?? 0;
                    return (
                      <BarRow
                        key={r.wasteType}
                        label={WASTE_TYPE_LABELS[r.wasteType as keyof typeof WASTE_TYPE_LABELS] ?? r.wasteType}
                        value={tonnes}
                        max={Math.max(...recyclables.map((x) => x._sum?.estimatedTonnage ?? 0))}
                        color="#a78bfa"
                      />
                    );
                  })}
                </div>

                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-2 text-text-dim">
                      <tr>
                        {['Material', 'Flows', 'Tonnes'].map((h) => (
                          <th key={h} className="data-cell text-left text-2xs font-medium py-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recyclables.map((r) => (
                        <tr key={r.wasteType} className="hover:bg-surface-2">
                          <td className="data-cell text-text">{WASTE_TYPE_LABELS[r.wasteType as keyof typeof WASTE_TYPE_LABELS] ?? r.wasteType}</td>
                          <td className="data-cell text-text-secondary">{r._count?.id ?? 0}</td>
                          <td className="data-cell text-text-secondary">{(r._sum?.estimatedTonnage ?? 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-surface-2">
                        <td className="data-cell text-text font-medium" colSpan={2}>Total tracked</td>
                        <td className="data-cell text-text font-medium">{totalRecyclables.toFixed(2)} t</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Revenue model note */}
        <div className="border border-border p-4 bg-surface-1">
          <p className="section-header mb-2">Revenue intelligence</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-text-secondary">
            <div>
              <p className="text-text font-medium mb-1">Tipping-fee negotiation</p>
              <p>LGA processing rates benchmark contractors. Low-rate LGAs present renegotiation or retendering opportunities for RSMEPB.</p>
            </div>
            <div>
              <p className="text-text font-medium mb-1">Recyclables off-take</p>
              <p>Tonnage by material type enables direct off-take agreements with plastic pellet producers, composting operators, and e-waste recyclers.</p>
            </div>
            <div>
              <p className="text-text font-medium mb-1">Environmental certification</p>
              <p>Site-level remediation tracking and processing rates feed into ISO 14001 / NESREA compliance certification services for industrial clients.</p>
            </div>
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
