'use client';

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { listDataSources, saveDataSource } from '@/lib/api';
import { useAuthedSWR } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import type { DataSourceRow } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';

const KINDS: [string, string][] = [
  ['GOVERNMENT', 'Government record or notice'], ['NEWS', 'News and community reports'], ['RESEARCH', 'Published research'],
  ['OPEN_DATA', 'Open data portal'], ['SOCIAL', 'Social media'], ['PARTNER', 'Partner organisation'], ['SENSOR', 'Sensor or device'],
  ['WEB_FORM', 'Web form'], ['EMAIL', 'Email inbox'],
];
const kindLabel = (k: string) => KINDS.find(([v]) => v === k)?.[1] ?? k;

interface Draft { name: string; kind: string; url: string; termsNote: string; accessMethod: string; notes: string }
const EMPTY: Draft = { name: '', kind: 'GOVERNMENT', url: '', termsNote: '', accessMethod: '', notes: '' };

export function SourcesAdmin() {
  const { data, error, isLoading, mutate, token } = useAuthedSWR<DataSourceRow[]>('sources', (t) => listDataSources(t));
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || !editing) return;
    const d = editing.draft;
    if (!d.name.trim()) { setNameError('Give the source a name.'); return; }
    setNameError(null);
    setBusy(true);
    setFormError(null);
    try {
      await saveDataSource({
        name: d.name.trim(), kind: d.kind, url: d.url.trim() || undefined, termsNote: d.termsNote.trim() || undefined,
        accessMethod: d.accessMethod.trim() || undefined, notes: d.notes.trim() || undefined,
      }, token, editing.id);
      setEditing(null);
      await mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function flip(s: DataSourceRow) {
    if (!token) return;
    try {
      await saveDataSource({ name: s.name, kind: s.kind, isActive: !s.isActive }, token, s.id);
      await mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'That did not save.');
    }
  }

  if (error && error.status !== 401) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (isLoading || !data) return <TableSkeleton />;

  const set = (k: keyof Draft, v: string) => setEditing((p) => (p ? { ...p, draft: { ...p.draft, [k]: v } } : p));

  return (
    <div className="space-y-4">
      {editing ? (
        <form onSubmit={submit} noValidate className="space-y-3 rounded-lg bg-panel p-4">
          {formError && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{formError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Name" value={editing.draft.name} onChange={(e) => set('name', e.target.value)} error={nameError ?? undefined} />
            <SelectField label="Kind" value={editing.draft.kind} onChange={(e) => set('kind', e.target.value)}>
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </SelectField>
            <TextField label="Address" optional type="url" inputMode="url" value={editing.draft.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
            <TextField label="How records arrive" optional value={editing.draft.accessMethod} onChange={(e) => set('accessMethod', e.target.value)} placeholder="scraper, import, form, webhook or manual" />
          </div>
          <TextAreaField label="What the source allows" optional value={editing.draft.termsNote} onChange={(e) => set('termsNote', e.target.value)} hint="Terms of use, credit required, limits on copying, privacy rules." />
          <TextAreaField label="Notes" optional value={editing.draft.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-16" />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={busy}>{editing.id ? 'Save changes' : 'Add source'}</Button>
            <Button onClick={() => { setEditing(null); setFormError(null); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button variant="primary" onClick={() => setEditing({ draft: EMPTY })}><Plus size={16} aria-hidden="true" />Add a source</Button>
      )}

      <p className="text-sm text-fg-muted">
        Scraped and submitted records must respect each source&apos;s terms. Switching a source off tells reviewers and connectors to stop using it. It does not delete what was already collected.
      </p>

      <div className="table-wrap" tabIndex={0}>
        <table className="data-table">
          <caption className="sr-only">Data sources</caption>
          <thead><tr><th scope="col">Source</th><th scope="col">Kind</th><th scope="col">What it allows</th><th scope="col" className="num">Reports</th><th scope="col">Last report</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id}>
                <td className="primary">{s.name}{s.accessMethod && <span className="block text-xs font-normal text-fg-muted">{s.accessMethod}</span>}</td>
                <td>{kindLabel(s.kind)}</td>
                <td className="min-w-64 max-w-md">{s.termsNote ?? 'Not recorded'}</td>
                <td className="num">{s.reportCount}</td>
                <td>{s.lastReportAt ? formatDate(s.lastReportAt) : 'None'}</td>
                <td>{s.isActive ? <Badge tone="success">In use</Badge> : <Badge>Switched off</Badge>}</td>
                <td>
                  <div className="flex gap-2">
                    <Button onClick={() => setEditing({ id: s.id, draft: { name: s.name, kind: s.kind, url: s.url ?? '', termsNote: s.termsNote ?? '', accessMethod: s.accessMethod ?? '', notes: s.notes ?? '' } })}>Edit<span className="sr-only"> {s.name}</span></Button>
                    <Button onClick={() => void flip(s)}>{s.isActive ? 'Switch off' : 'Switch on'}<span className="sr-only"> {s.name}</span></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
