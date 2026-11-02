'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { CloudOff, RefreshCw, Trash2, Wifi } from 'lucide-react';
import { getWasteSites } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { syncAll, type SyncOutcome } from '@/lib/fieldSync';
import { deleteRecord, listRecords, newClientRef, saveRecord, type QueuedRecord } from '@/lib/offline';
import { WASTE_CATEGORY_INFO, SETTING_LABELS } from '@/lib/constants';
import { formatDate, plural } from '@/lib/format';
import type { SubmissionInput } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/States';
import { ObservationForm, type FormPhoto } from '@/components/report/ObservationForm';

type Tab = 'new' | 'saved' | 'sites';

interface Target { id: string; name: string; latitude: number; longitude: number }

export function FieldApp() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>('new');
  const [online, setOnline] = useState(true);
  const [records, setRecords] = useState<QueuedRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRecords(await listRecords());
      setStorageError(null);
    } catch {
      setStorageError('This browser cannot keep records on the phone. Use a normal window, not a private one, or records may be lost.');
    }
  }, []);

  const sync = useCallback(async (quiet = false) => {
    if (!session.token) return;
    setSyncing(true);
    let outcome: SyncOutcome;
    try {
      outcome = await syncAll(session.token);
    } finally {
      setSyncing(false);
    }
    await refresh();
    if (outcome.sessionEnded) setMessage({ kind: 'error', text: 'Your sign-in has ended. Your records are safe on this phone. Sign in again to send them.' });
    else if (outcome.rejected.length > 0) setMessage({ kind: 'error', text: `${plural(outcome.rejected.length, 'record')} could not be accepted. Open "Saved on this phone" to see why.` });
    else if (outcome.offline) { if (!quiet) setMessage({ kind: 'warn', text: `No connection yet. ${plural(outcome.waiting, 'record')} will be sent when you are back online.` }); }
    else if (outcome.sent > 0) setMessage({ kind: 'ok', text: `${plural(outcome.sent, 'record')} sent for review.` });
  }, [session.token, refresh]);

  // Connection state, and send whatever is waiting as soon as signal returns.
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => { setOnline(true); void sync(true); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [sync]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (session.token && navigator.onLine) void sync(true); }, [session.token, sync]);

  // The offline shell: lets the app open without signal.
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* the app works online without it */ });
  }, []);

  async function save(input: SubmissionInput, photos: FormPhoto[]) {
    const clientRef = newClientRef();
    const rec: QueuedRecord = { clientRef, savedAt: new Date().toISOString(), input: { ...input, observedAt: input.observedAt ?? new Date().toISOString() }, photos, photosSent: 0 };
    try {
      await saveRecord(rec);
    } catch {
      throw new Error('This record could not be saved on the phone. The phone may be out of space. Free some space and try again.');
    }
    await refresh();
    setTarget(null);
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0 });
    setMessage({ kind: 'ok', text: 'Saved on this phone.' });
    if (navigator.onLine) await sync();
    else setMessage({ kind: 'warn', text: 'Saved on this phone. You are offline, so it will be sent when you have signal.' });
  }

  async function discard(clientRef: string) {
    await deleteRecord(clientRef);
    await refresh();
  }

  const waiting = records.length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg sm:text-2xl">Field records</h1>
          <p className="text-sm text-fg-muted">
            {session.user?.displayName ?? session.user?.email}
            {session.user?.ambassadorCode ? ` · ${session.user.ambassadorCode}` : ''}
            {session.user?.assignedLgas && session.user.assignedLgas.length > 0 ? ` · ${session.user.assignedLgas.join(', ')}` : ''}
          </p>
        </div>
        <p className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm ${online ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`} role="status">
          {online ? <Wifi size={16} aria-hidden="true" /> : <CloudOff size={16} aria-hidden="true" />}
          {online ? 'Online' : 'Offline. Records are kept on this phone.'}
        </p>
      </div>

      {storageError && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{storageError}</p>}

      <div aria-live="polite" role="status">
        {message && (
          <p className={`rounded px-3 py-3 text-sm ${message.kind === 'ok' ? 'bg-success-soft text-success' : message.kind === 'warn' ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-danger'}`}>
            {message.text}
          </p>
        )}
      </div>

      <div role="tablist" aria-label="Field app sections" className="grid grid-cols-3 gap-1 rounded-lg bg-panel p-1">
        {([['new', 'New record'], ['saved', `Saved on this phone${waiting ? ` (${waiting})` : ''}`], ['sites', 'Sites to visit']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`min-h-11 rounded px-2 text-sm font-semibold transition-colors duration-150 ${tab === id ? 'bg-panel-3 text-fg' : 'text-fg-muted hover:text-fg'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div role="tabpanel" id="panel-new" aria-labelledby="tab-new">
          {target && (
            <p className="mb-3 rounded bg-accent-soft px-3 py-3 text-sm text-fg">
              Recording a visit to <span className="font-semibold">{target.name}</span>.{' '}
              <button type="button" className="font-semibold text-accent hover:text-accent-hover" onClick={() => { setTarget(null); setFormKey((k) => k + 1); }}>Record something else</button>
            </p>
          )}
          <ObservationForm
            key={formKey}
            variant="field"
            submitLabel="Save record"
            onSubmit={save}
            initialSite={target}
            footerNote="The record is saved on this phone first, then sent when there is signal. Every record carries your ambassador ID and the time, and a reviewer approves it before it counts."
          />
        </div>
      )}

      {tab === 'saved' && (
        <div role="tabpanel" id="panel-saved" aria-labelledby="tab-saved" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">{waiting === 0 ? 'Nothing is waiting.' : `${plural(waiting, 'record')} waiting to be sent.`}</p>
            <Button onClick={() => void sync()} loading={syncing} disabled={waiting === 0 || !online}>
              <RefreshCw size={16} aria-hidden="true" />
              Send now
            </Button>
          </div>
          {waiting === 0 ? (
            <EmptyState title="No saved records">Records you save appear here until they have been sent, so you can see nothing was lost.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {records.map((r) => (
                <li key={r.clientRef} className="rounded-lg bg-panel p-4">
                  <p className="text-base font-semibold text-fg">
                    {r.input.primaryCategory ? WASTE_CATEGORY_INFO[r.input.primaryCategory].label : 'Waste record'} · {SETTING_LABELS[r.input.setting].toLowerCase()}
                  </p>
                  <p className="text-sm text-fg-muted">
                    Saved {formatDate(r.savedAt)} · {plural(r.photos.length, 'photo')}
                    {r.reportId ? ` · report sent, ${r.photosSent} of ${r.photos.length} photos sent` : ' · not sent yet'}
                  </p>
                  {r.lastError && <p className="mt-1 text-sm text-danger">{r.lastError}</p>}
                  <div className="mt-2">
                    <Button variant="danger" onClick={() => void discard(r.clientRef)}>
                      <Trash2 size={16} aria-hidden="true" />
                      Delete from this phone
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'sites' && (
        <div role="tabpanel" id="panel-sites" aria-labelledby="tab-sites">
          <SitesToVisit
            lgas={session.user?.assignedLgas ?? []}
            onPick={(t) => { setTarget(t); setFormKey((k) => k + 1); setTab('new'); window.scrollTo({ top: 0 }); }}
          />
        </div>
      )}
    </div>
  );
}

function SitesToVisit({ lgas, onPick }: { lgas: string[]; onPick: (t: Target) => void }) {
  const [lga, setLga] = useState(lgas[0] ?? '');
  const { data, error, isLoading, mutate } = useSWR(lga ? ['field-sites', lga] : null, () => getWasteSites({ lga, limit: 200 }), { revalidateOnFocus: false });

  if (lgas.length === 0) {
    return <EmptyState title="No LGA assigned yet">An administrator assigns the local government areas you cover. Until then you can still record new places from the first tab.</EmptyState>;
  }
  return (
    <div className="space-y-3">
      {lgas.length > 1 && (
        <SelectField label="Local government area" value={lga} onChange={(e) => setLga(e.target.value)}>
          {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
        </SelectField>
      )}
      {isLoading && <p role="status" className="text-sm text-fg-muted">Loading sites</p>}
      {error && (
        <div role="alert" className="rounded bg-danger-soft p-3 text-sm text-danger">
          The sites could not be loaded. You may be offline. <button type="button" className="font-semibold underline" onClick={() => void mutate()}>Try again</button>
        </div>
      )}
      {data && data.data.length === 0 && <EmptyState title={`No sites in ${lga} yet`}>Record a new place from the first tab.</EmptyState>}
      {data && data.data.length > 0 && (
        <ul className="space-y-2">
          {data.data.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-panel p-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-fg">{s.communityName ?? 'Unnamed location'}</p>
                <p className="text-sm text-fg-muted">
                  {s.verification === 'FIELD_VERIFIED' ? 'Field-verified' : s.verification === 'CORROBORATED' ? 'Corroborated' : 'Reported, not checked'}
                  {' · '}last record {formatDate(s.lastObservedAt ?? s.firstSeenAt)}
                </p>
              </div>
              <Button onClick={() => onPick({ id: s.id, name: s.communityName ?? 'Unnamed location', latitude: s.latitude, longitude: s.longitude })}>
                Record a visit
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
