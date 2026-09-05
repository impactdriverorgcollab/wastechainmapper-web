'use client';

import { useEffect, useState } from 'react';
import { getSites } from '@/lib/api';
import type { DumpSite, ConfidenceTier, WasteType, FlowStatus } from '@/lib/types';
import { TIER_COLORS, WASTE_TYPE_LABELS } from '@/lib/constants';

// LGAs in Rivers State
const RIVERS_STATE_LGAS = [
  'Port Harcourt', 'Obio-Akpor', 'Eleme', 'Ikwerre', 'Emohua',
  'Ahoada East', 'Ahoada West', 'Ogba/Egbema/Ndoni', 'Khana', 'Gokana',
  'Tai', 'Etche', 'Omuma', 'Ogu/Bolo', 'Okrika',
  'Degema', 'Asari-Toru', 'Abua/Odual', 'Andoni', 'Opobo/Nkoro',
  'Bonny', 'Akuku-Toru', 'Buguma',
];

export default function StakeholderPage() {
  const [sites, setSites] = useState<DumpSite[]>([]);
  const [filtered, setFiltered] = useState<DumpSite[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [lga, setLga] = useState('');
  const [tier, setTier] = useState<ConfidenceTier | ''>('');
  const [wasteType, setWasteType] = useState<WasteType | ''>('');

  useEffect(() => {
    getSites({ limit: '1000' })
      .then((data) => { setSites(data); setFiltered(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...sites];
    if (lga) result = result.filter((s) => s.lga === lga);
    if (tier) result = result.filter((s) => s.confidenceTier === tier);
    if (wasteType) result = result.filter((s) => s.wasteType === wasteType);
    setFiltered(result);
  }, [lga, tier, wasteType, sites]);

  const stats = {
    total: filtered.length,
    high: filtered.filter((s) => s.confidenceTier === 'HIGH').length,
    medium: filtered.filter((s) => s.confidenceTier === 'MEDIUM').length,
    low: filtered.filter((s) => s.confidenceTier === 'LOW').length,
  };

  function exportCsv() {
    const rows = [
      ['ID', 'LGA', 'Ward', 'Community', 'Confidence', 'Waste Type', 'Status', 'First Seen', 'Lat', 'Lng'],
      ...filtered.map((s) => [
        s.id, s.lga ?? '', s.ward ?? '', s.communityName ?? '',
        s.confidenceTier, s.wasteType, s.status,
        s.firstSeenAt, s.latitude ?? '', s.longitude ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wastewatch-sites-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-text">DELTAFLOW ATLAS</span>
          <span className="text-2xs text-text-dim uppercase tracking-widest">Stakeholder view</span>
        </div>
        <nav className="flex items-center gap-4 text-xs text-text-secondary">
          <a href="/map" className="hover:text-text">Map</a>
          <a href="/flows" className="hover:text-text">Flows</a>
          <a href="/water" className="hover:text-text">Water</a>
          <a href="/analytics" className="hover:text-text">Analytics</a>
          <a href="/admin" className="hover:text-text">Admin</a>
        </nav>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total sites', value: stats.total, color: '#e2e8f0' },
            { label: 'Field-verified', value: stats.high, color: TIER_COLORS.HIGH.hex },
            { label: 'Corroborated', value: stats.medium, color: TIER_COLORS.MEDIUM.hex },
            { label: 'Unconfirmed', value: stats.low, color: TIER_COLORS.LOW.hex },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-1 border border-border px-3 py-3">
              <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
              <p className="text-xs text-text-dim mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters + Export */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={lga}
            onChange={(e) => setLga(e.target.value)}
            className="bg-surface-1 border border-border px-2 py-1.5 text-xs text-text focus:outline-none"
          >
            <option value="">All LGAs</option>
            {RIVERS_STATE_LGAS.map((l) => <option key={l}>{l}</option>)}
          </select>

          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as any)}
            className="bg-surface-1 border border-border px-2 py-1.5 text-xs text-text focus:outline-none"
          >
            <option value="">All confidence tiers</option>
            <option value="HIGH">Field-verified</option>
            <option value="MEDIUM">Corroborated</option>
            <option value="LOW">Unconfirmed</option>
          </select>

          <select
            value={wasteType}
            onChange={(e) => setWasteType(e.target.value as any)}
            className="bg-surface-1 border border-border px-2 py-1.5 text-xs text-text focus:outline-none"
          >
            <option value="">All waste types</option>
            {Object.entries(WASTE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <button onClick={exportCsv} className="btn ml-auto">
            Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-2 text-text-dim">
              <tr>
                {['LGA', 'Ward', 'Community', 'Confidence', 'Waste type', 'Status', 'First seen'].map((h) => (
                  <th key={h} className="data-cell text-left font-medium uppercase tracking-wider text-2xs py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="data-cell text-center text-text-dim py-6">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="data-cell text-center text-text-dim py-6">No sites match the selected filters.</td>
                </tr>
              ) : (
                filtered.map((site) => (
                  <tr key={site.id} className="hover:bg-surface-2 transition-colors">
                    <td className="data-cell text-text-secondary">{site.lga ?? '—'}</td>
                    <td className="data-cell text-text-secondary">{site.ward ?? '—'}</td>
                    <td className="data-cell text-text">{site.communityName ?? '—'}</td>
                    <td className="data-cell">
                      <span
                        className="font-medium"
                        style={{ color: TIER_COLORS[site.confidenceTier].hex }}
                      >
                        {TIER_COLORS[site.confidenceTier].label}
                      </span>
                    </td>
                    <td className="data-cell text-text-secondary">{WASTE_TYPE_LABELS[site.wasteType]}</td>
                    <td className="data-cell text-text-secondary">{site.status.toLowerCase()}</td>
                    <td className="data-cell text-text-dim font-mono">
                      {new Date(site.firstSeenAt).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <p className="text-2xs text-text-dim mt-2">
            Showing {filtered.length} site{filtered.length !== 1 ? 's' : ''}.
            Data reflects scraped and field-verified reports as of {new Date().toLocaleDateString('en-NG')}.
          </p>
        )}
      </main>
    </div>
  );
}
