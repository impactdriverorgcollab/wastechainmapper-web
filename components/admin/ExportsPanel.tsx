'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadExport } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { RIVERS_STATE_LGAS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';

const SETS = [
  { id: 'waste-sites', title: 'Waste sites', body: 'One row per site: place, verification, kind, setting, risk flag, latest volume and weight with how each was estimated.', filters: true },
  { id: 'waste-observations', title: 'Observations', body: 'One row per recorded observation, with the basis, method and confidence of every estimate.', filters: true },
  { id: 'collection-points', title: 'Collection points', body: 'Collection points with operator, schedule and whether they are official and checked.', filters: false },
] as const;

export function ExportsPanel() {
  const session = useSession();
  const [lga, setLga] = useState('');
  const [verification, setVerification] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function get(set: (typeof SETS)[number], format: 'csv' | 'geojson') {
    setBusy(`${set.id}-${format}`);
    setError(null);
    const params = new URLSearchParams({ format });
    if (set.filters && lga) params.set('lga', lga);
    if (set.filters && verification) params.set('verification', verification);
    try {
      await downloadExport(`/export/${set.id}?${params}`, `${set.id}-${new Date().toISOString().slice(0, 10)}.${format === 'csv' ? 'csv' : 'geojson'}`, session.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The export did not download.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="max-w-prose text-base text-fg-muted">
        Downloads include everything your account may see, including records still awaiting review. Reporter names and contact details are never included.
        Each export is written to the audit log. CSV opens in a spreadsheet. GeoJSON opens in QGIS, ArcGIS and most mapping tools.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 sm:max-w-xl">
        <SelectField label="Local government area" optional value={lga} onChange={(e) => setLga(e.target.value)}>
          <option value="">All 23</option>
          {RIVERS_STATE_LGAS.map((l) => <option key={l} value={l}>{l}</option>)}
        </SelectField>
        <SelectField label="Verification" optional value={verification} onChange={(e) => setVerification(e.target.value)}>
          <option value="">Any</option>
          <option value="UNVERIFIED">Reported only</option>
          <option value="CORROBORATED">Corroborated</option>
          <option value="FIELD_VERIFIED">Field-verified</option>
        </SelectField>
      </div>

      {error && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {SETS.map((s) => (
          <section key={s.id} aria-labelledby={`ex-${s.id}`} className="flex flex-col rounded-lg bg-panel p-4">
            <h2 id={`ex-${s.id}`} className="text-lg font-semibold text-fg">{s.title}</h2>
            <p className="mt-1 flex-1 text-sm text-fg-muted">{s.body}{!s.filters && ' The filters above do not apply.'}</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => get(s, 'csv')} loading={busy === `${s.id}-csv`} disabled={busy !== null}><Download size={16} aria-hidden="true" />CSV</Button>
              <Button onClick={() => get(s, 'geojson')} loading={busy === `${s.id}-geojson`} disabled={busy !== null}><Download size={16} aria-hidden="true" />GeoJSON</Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
