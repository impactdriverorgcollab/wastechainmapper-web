'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { listCollectionPointsAdmin, saveCollectionPoint } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { RIVERS_STATE_LGAS, VERIFICATION_STATUS_LABELS } from '@/lib/constants';
import type { VerificationStatus } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';

interface Draft {
  name: string; latitude: string; longitude: string; operator: string; lga: string; ward: string;
  schedule: string; isOfficial: boolean; verificationStatus: VerificationStatus;
}
const EMPTY: Draft = { name: '', latitude: '', longitude: '', operator: '', lga: '', ward: '', schedule: '', isOfficial: false, verificationStatus: 'UNVERIFIED' };

export function CollectionPointsAdmin() {
  const list = useSWR('collection-points-admin', listCollectionPointsAdmin, { revalidateOnFocus: false });
  const { token } = useSession();
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setEditing((p) => (p ? { ...p, draft: { ...p.draft, [k]: v } } : p));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !token) return;
    const d = editing.draft;
    const found: Record<string, string> = {};
    if (!d.name.trim()) found.name = 'Give the collection point a name.';
    const lat = Number(d.latitude);
    const lng = Number(d.longitude);
    if (d.latitude.trim() === '' || !Number.isFinite(lat) || lat < 4 || lat > 6.2) found.latitude = 'Enter a latitude between 4 and 6.2, for example 4.8156.';
    if (d.longitude.trim() === '' || !Number.isFinite(lng) || lng < 5.4 || lng > 8) found.longitude = 'Enter a longitude between 5.4 and 8, for example 7.0498.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    setFormError(null);
    try {
      await saveCollectionPoint({
        name: d.name.trim(), latitude: lat, longitude: lng, operator: d.operator.trim() || undefined, lga: d.lga || undefined,
        ward: d.ward.trim() || undefined, schedule: d.schedule.trim() || undefined, isOfficial: d.isOfficial, verificationStatus: d.verificationStatus,
      }, token, editing.id);
      setEditing(null);
      await list.mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (list.error) return <ErrorState message={list.error.message} onRetry={() => list.mutate()} />;
  if (!list.data) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {editing ? (
        <form onSubmit={submit} noValidate className="space-y-3 rounded-lg bg-panel p-4">
          {formError && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{formError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Name" value={editing.draft.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
            <TextField label="Operator" optional value={editing.draft.operator} onChange={(e) => set('operator', e.target.value)} />
            <TextField label="Latitude" inputMode="decimal" value={editing.draft.latitude} onChange={(e) => set('latitude', e.target.value)} error={errors.latitude} />
            <TextField label="Longitude" inputMode="decimal" value={editing.draft.longitude} onChange={(e) => set('longitude', e.target.value)} error={errors.longitude} />
            <SelectField label="Local government area" optional value={editing.draft.lga} onChange={(e) => set('lga', e.target.value)}>
              <option value="">Not set</option>
              {RIVERS_STATE_LGAS.map((l) => <option key={l} value={l}>{l}</option>)}
            </SelectField>
            <TextField label="Ward" optional value={editing.draft.ward} onChange={(e) => set('ward', e.target.value)} />
            <TextField label="Collection schedule" optional value={editing.draft.schedule} onChange={(e) => set('schedule', e.target.value)} placeholder="Mondays and Thursdays, mornings" />
            <SelectField label="Checked" value={editing.draft.verificationStatus} onChange={(e) => set('verificationStatus', e.target.value as VerificationStatus)}>
              {(['UNVERIFIED', 'CORROBORATED', 'FIELD_VERIFIED'] as const).map((v) => <option key={v} value={v}>{VERIFICATION_STATUS_LABELS[v]}</option>)}
            </SelectField>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg">
            <input type="checkbox" className="h-5 w-5 accent-accent" checked={editing.draft.isOfficial} onChange={(e) => set('isOfficial', e.target.checked)} />
            Designated as an official collection point by the authority
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={busy}>{editing.id ? 'Save changes' : 'Add collection point'}</Button>
            <Button onClick={() => { setEditing(null); setFormError(null); setErrors({}); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button variant="primary" onClick={() => setEditing({ draft: EMPTY })}><Plus size={16} aria-hidden="true" />Add a collection point</Button>
      )}

      <p className="max-w-prose text-sm text-fg-muted">
        An official point is one an authority designated. Checked means a reviewer or ambassador has confirmed it exists. Both labels show on the map and in the API, so users can tell designated points from points that were only reported.
      </p>

      {list.data.length === 0 ? (
        <EmptyState title="No collection points yet">Add the ones local government areas send you, and mark which are official.</EmptyState>
      ) : (
        <div className="table-wrap" tabIndex={0}>
          <table className="data-table">
            <caption className="sr-only">Collection points</caption>
            <thead><tr><th scope="col">Name</th><th scope="col">Area</th><th scope="col">Operator</th><th scope="col">Schedule</th><th scope="col">Official</th><th scope="col">Checked</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {list.data.map((c) => (
                <tr key={c.id}>
                  <td className="primary">{c.name}</td>
                  <td>{[c.ward, c.lga].filter(Boolean).join(', ') || 'Not set'}</td>
                  <td>{c.operator ?? 'Not recorded'}</td>
                  <td>{c.schedule ?? 'Not recorded'}</td>
                  <td>{c.isOfficial ? <Badge tone="success">Official</Badge> : <Badge>Not confirmed</Badge>}</td>
                  <td>{VERIFICATION_STATUS_LABELS[c.verificationStatus]}</td>
                  <td>
                    <Button onClick={() => setEditing({ id: c.id, draft: {
                      name: c.name, latitude: String(c.latitude ?? ''), longitude: String(c.longitude ?? ''), operator: c.operator ?? '', lga: c.lga ?? '',
                      ward: c.ward ?? '', schedule: c.schedule ?? '', isOfficial: c.isOfficial, verificationStatus: c.verificationStatus,
                    } })}>Edit<span className="sr-only"> {c.name}</span></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
