'use client';

import { useState, type FormEvent } from 'react';
import { listLgaEngagement, saveLgaEngagement, type LgaEngagementRow } from '@/lib/api';
import { useAuthedSWR } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';

const STATUS: Record<LgaEngagementRow['status'], { label: string; tone: 'neutral' | 'warning' | 'accent' | 'success' }> = {
  NOT_CONTACTED: { label: 'Not contacted yet', tone: 'neutral' },
  REQUESTED: { label: 'Request sent', tone: 'warning' },
  IN_TALKS: { label: 'In discussion', tone: 'warning' },
  AGREED: { label: 'Agreement in place', tone: 'accent' },
  SHARING: { label: 'Sharing data regularly', tone: 'success' },
};

const DATA_KINDS: [string, string][] = [
  ['collection_points', 'Authorised collection points and operators'],
  ['sites', 'Transfer stations, recycling, treatment and disposal sites'],
  ['routes', 'Collection routes, coverage and schedules'],
  ['drainage', 'Drainage channels and waterways affected by waste'],
  ['tonnage', 'Tonnage, collection records and reports'],
];

interface Draft { status: LgaEngagementRow['status']; contactName: string; contactDetail: string; lastContactedAt: string; nextStep: string; dataShared: string[]; notes: string }

function toDraft(r: LgaEngagementRow): Draft {
  return {
    status: r.status, contactName: r.contactName ?? '', contactDetail: r.contactDetail ?? '', lastContactedAt: r.lastContactedAt?.slice(0, 10) ?? '',
    nextStep: r.nextStep ?? '', dataShared: r.dataShared, notes: r.notes ?? '',
  };
}

export function LgaEngagement() {
  const { data, error, isLoading, mutate, token, user } = useAuthedSWR<LgaEngagementRow[]>('lga-engagement', (t) => listLgaEngagement(t));
  const [editing, setEditing] = useState<{ lga: string; draft: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const canEdit = user?.role === 'ADMIN';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !token) return;
    setBusy(true);
    setFormError(null);
    const d = editing.draft;
    try {
      await saveLgaEngagement(editing.lga, {
        status: d.status, contactName: d.contactName.trim(), contactDetail: d.contactDetail.trim(),
        lastContactedAt: d.lastContactedAt ? `${d.lastContactedAt}T00:00:00.000Z` : undefined, nextStep: d.nextStep.trim(), dataShared: d.dataShared, notes: d.notes.trim(),
      }, token);
      setEditing(null);
      await mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (error && error.status !== 401) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (isLoading || !data) return <TableSkeleton rows={8} columns={5} />;

  const counts = data.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setEditing((p) => (p ? { ...p, draft: { ...p.draft, [k]: v } } : p));

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2" aria-label="Summary">
        {(Object.keys(STATUS) as LgaEngagementRow['status'][]).map((s) => (
          <li key={s}><Badge tone={STATUS[s].tone}>{STATUS[s].label}: {counts[s] ?? 0}</Badge></li>
        ))}
      </ul>

      {editing && (
        <form onSubmit={submit} noValidate className="space-y-3 rounded-lg bg-panel p-4">
          <h2 className="text-lg font-semibold text-fg">{editing.lga}</h2>
          {formError && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{formError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Where things stand" value={editing.draft.status} onChange={(e) => set('status', e.target.value as Draft['status'])}>
              {(Object.keys(STATUS) as LgaEngagementRow['status'][]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </SelectField>
            <TextField label="Last contacted" optional type="date" value={editing.draft.lastContactedAt} onChange={(e) => set('lastContactedAt', e.target.value)} />
            <TextField label="Contact person" optional value={editing.draft.contactName} onChange={(e) => set('contactName', e.target.value)} />
            <TextField label="Phone or email" optional value={editing.draft.contactDetail} onChange={(e) => set('contactDetail', e.target.value)} hint="Kept for staff only. Never shown on the public site or in the API." />
          </div>
          <TextField label="Next step" optional value={editing.draft.nextStep} onChange={(e) => set('nextStep', e.target.value)} placeholder="Send the data-sharing agreement for signature" />
          <fieldset>
            <legend className="label">Records this area has shared</legend>
            {DATA_KINDS.map(([k, label]) => (
              <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-fg">
                <input type="checkbox" className="h-5 w-5 accent-accent" checked={editing.draft.dataShared.includes(k)} onChange={(e) => set('dataShared', e.target.checked ? [...editing.draft.dataShared, k] : editing.draft.dataShared.filter((x) => x !== k))} />
                {label}
              </label>
            ))}
          </fieldset>
          <TextAreaField label="Notes" optional value={editing.draft.notes} onChange={(e) => set('notes', e.target.value)} maxLength={2000} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={busy}>Save changes</Button>
            <Button onClick={() => { setEditing(null); setFormError(null); }}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="table-wrap" tabIndex={0}>
        <table className="data-table">
          <caption className="sr-only">Contact with each local government area</caption>
          <thead><tr><th scope="col">Area</th><th scope="col">Where things stand</th><th scope="col">Contact</th><th scope="col">Last contacted</th><th scope="col">Shared</th><th scope="col" className="num">Sites</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.lga}>
                <td className="primary">{r.lga}</td>
                <td><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>{r.nextStep && <span className="mt-1 block text-xs text-fg-muted">Next: {r.nextStep}</span>}</td>
                <td>{r.contactName ?? 'None yet'}</td>
                <td>{r.lastContactedAt ? formatDate(r.lastContactedAt) : 'Never'}</td>
                <td className="tabular">{r.dataShared.length} of 5</td>
                <td className="num">{r.sites}</td>
                <td>{canEdit && <Button onClick={() => { setEditing({ lga: r.lga, draft: toDraft(r) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Update<span className="sr-only"> {r.lga}</span></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
