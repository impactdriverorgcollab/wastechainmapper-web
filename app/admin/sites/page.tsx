'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSites } from '@/lib/api';
import type { DumpSite } from '@/lib/types';
import { WASTE_TYPE_LABELS, TIER_COLORS } from '@/lib/constants';

const STATUS_LABELS: Record<string, string> = {
  UNVERIFIED: 'Unverified',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  REMEDIATED: 'Remediated',
};

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<DumpSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSites({ limit: '500' })
      .then(setSites)
      .catch((e) => {
        if (e.message?.includes('401')) router.push('/admin/login');
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4 text-xs text-text-dim">Loading sites…</p>;
  if (error) return <p className="p-4 text-xs text-tier-high">{error}</p>;

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="section-header">Dump sites</p>
          <p className="text-xs text-text-secondary">
            {sites.length} site{sites.length !== 1 ? 's' : ''} in database
          </p>
        </div>
        <a href="/map" className="btn text-xs">View on map</a>
      </div>

      {sites.length === 0 ? (
        <div className="border border-border bg-surface-1 px-4 py-8 text-center text-xs text-text-dim">
          No dump sites recorded yet. Verify reports in the queue to create sites.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-text-dim uppercase tracking-widest text-2xs">
                <th className="py-2 pr-4 font-normal">Location</th>
                <th className="py-2 pr-4 font-normal">LGA</th>
                <th className="py-2 pr-4 font-normal">Waste type</th>
                <th className="py-2 pr-4 font-normal">Tier</th>
                <th className="py-2 pr-4 font-normal">Status</th>
                <th className="py-2 pr-4 font-normal">Coordinates</th>
                <th className="py-2 font-normal">First seen</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b border-border hover:bg-surface-1 transition-colors">
                  <td className="py-2 pr-4 text-text">
                    {site.communityName ?? site.ward ?? '—'}
                    {site.ward && site.communityName && (
                      <span className="ml-1 text-text-dim">· {site.ward}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-text-secondary">{site.lga ?? '—'}</td>
                  <td className="py-2 pr-4 text-text-secondary">
                    {WASTE_TYPE_LABELS[site.wasteType] ?? site.wasteType}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className="font-mono font-medium"
                      style={{ color: TIER_COLORS[site.confidenceTier]?.hex }}
                    >
                      {site.confidenceTier}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-text-secondary">
                    {STATUS_LABELS[site.status] ?? site.status}
                  </td>
                  <td className="py-2 pr-4 font-mono text-text-dim">
                    {site.latitude != null && site.longitude != null
                      ? `${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}`
                      : '—'}
                  </td>
                  <td className="py-2 text-text-dim">
                    {new Date(site.firstSeenAt).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
