'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { Check, Copy } from 'lucide-react';
import { getApiKeyTiers, issueApiKey, listApiKeys, revokeApiKey } from '@/lib/api';
import { useAuthedSWR } from '@/lib/auth';
import { NOT_RECORDED, formatDate, formatNumber } from '@/lib/format';
import type { ApiKeyRow, ApiKeyTier, IssuedApiKey } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField, TextField } from '@/components/ui/Field';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';

const TIER_LABEL: Record<ApiKeyTier, string> = {
  FREE: 'Free', PROFESSIONAL: 'Professional', ENTERPRISE: 'Enterprise', INTERNAL: 'Internal (the website)',
};

export function ApiKeys() {
  const keys = useAuthedSWR<ApiKeyRow[]>('api-keys', (t) => listApiKeys(t));
  const tiers = useSWR('api-key-tiers', getApiKeyTiers, { revalidateOnFocus: false });

  const [name, setName] = useState('');
  const [tier, setTier] = useState<ApiKeyTier>('FREE');
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiKeyRow | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const issuedRef = useRef<HTMLDivElement>(null);

  // Move focus to the new key so it is announced and cannot be missed. It is shown once.
  useEffect(() => { if (issued) issuedRef.current?.focus(); }, [issued]);

  async function handleIssue(e: FormEvent) {
    e.preventDefault();
    if (!keys.token) return;
    if (!name.trim()) { setNameError('Enter the organisation or project this key is for.'); return; }
    setNameError('');
    setFormError('');
    setIssuing(true);
    try {
      setIssued(await issueApiKey({ name: name.trim(), tier }, keys.token));
      setCopied(false);
      setName('');
      await keys.mutate();
    } catch (err) {
      // The typed name stays in the field.
      setFormError(err instanceof Error ? err.message : 'The key was not created. Try again.');
    } finally {
      setIssuing(false);
    }
  }

  async function copyKey() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.key);
      setCopied(true);
    } catch {
      setFormError('Copy was blocked by the browser. Select the key and copy it by hand.');
    }
  }

  async function confirmRevoke() {
    if (!revoking || !keys.token) return;
    setRevokeBusy(true);
    setRevokeError('');
    try {
      await revokeApiKey(revoking.id, keys.token);
      await keys.mutate();
      setRevoking(null);
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'The key was not revoked. Try again.');
    } finally {
      setRevokeBusy(false);
    }
  }

  // The API refuses this page to anyone who is not an administrator.
  if (keys.sessionReady && keys.user && keys.user.role !== 'ADMIN') {
    return (
      <EmptyState title="Only administrators can manage API keys">
        Ask an administrator if a partner needs a key.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="tiers-heading">
        <h2 id="tiers-heading" className="mb-3 text-lg font-semibold">Key tiers</h2>
        {tiers.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        ) : tiers.error ? (
          <ErrorState message={tiers.error.message} onRetry={() => tiers.mutate()} retrying={tiers.isValidating} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {(tiers.data ?? []).map((t) => (
              <li key={t.tier} className="rounded-lg bg-panel p-4">
                <p className="text-sm font-semibold text-fg">{TIER_LABEL[t.tier]}</p>
                <p className="tabular mt-1 text-xl font-semibold text-fg">
                  {formatNumber(t.dailyLimit)} <span className="text-sm font-normal text-fg-muted">calls a day</span>
                </p>
                <p className="mt-1 text-sm text-fg-muted">{t.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="issue-heading" className="rounded-lg bg-panel p-4 sm:p-6">
        <h2 id="issue-heading" className="text-lg font-semibold">Create a key</h2>
        <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">
          The key is shown once. Every data endpoint needs a key, and each key stops working for the day when it reaches its limit. The Internal tier is for the website itself and has no limit.
        </p>
        <form onSubmit={handleIssue} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
          <TextField
            label="Organisation or project"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            autoComplete="off"
            required
          />
          <SelectField label="Tier" value={tier} onChange={(e) => setTier(e.target.value as ApiKeyTier)}>
            {(Object.keys(TIER_LABEL) as ApiKeyTier[]).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
          </SelectField>
          <div className="sm:col-span-2 lg:col-span-1 lg:pt-7">
            <Button type="submit" variant="primary" loading={issuing} className="w-full">Create key</Button>
          </div>
        </form>
        {formError && <p role="alert" className="mt-3 text-sm text-danger">{formError}</p>}
      </section>

      {issued && (
        <div ref={issuedRef} tabIndex={-1} role="status" className="rounded-lg bg-success-soft p-4 sm:p-6">
          <h2 className="text-base font-semibold text-success">Key created. Copy it now.</h2>
          <p className="mt-1 text-sm text-fg-muted">{issued.warning}</p>
          <code className="mt-3 block select-all break-all rounded bg-canvas p-3 font-mono text-sm text-fg">{issued.key}</code>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="primary" onClick={copyKey}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy key'}
            </Button>
            <Button variant="ghost" onClick={() => setIssued(null)}>I have saved it</Button>
          </div>
        </div>
      )}

      <section aria-labelledby="keys-heading">
        <h2 id="keys-heading" className="mb-3 text-lg font-semibold">Issued keys</h2>
        {keys.error && keys.error.status !== 401 ? (
          <ErrorState message={keys.error.message} onRetry={() => keys.mutate()} retrying={keys.isValidating} />
        ) : keys.isLoading || !keys.data ? (
          <TableSkeleton columns={6} />
        ) : keys.data.length === 0 ? (
          <EmptyState title="No keys issued yet">Create the first key above when a partner asks for access.</EmptyState>
        ) : (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Issued API keys">
            <table className="data-table">
              <caption className="sr-only">Issued API keys</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Tier</th>
                  <th scope="col" className="num">Calls today</th>
                  <th scope="col" className="num">All time</th>
                  <th scope="col">Last used</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {keys.data.map((k) => (
                  <tr key={k.id}>
                    <td className="primary">{k.name}</td>
                    <td>{TIER_LABEL[k.tier]}</td>
                    <td className="num">{formatNumber(k.callsToday)} of {formatNumber(k.dailyLimit)}</td>
                    <td className="num">{formatNumber(k.callsTotal)}</td>
                    <td>{k.lastUsedAt ? formatDate(k.lastUsedAt, false) : NOT_RECORDED}</td>
                    <td>{k.isActive ? <Badge tone="success">Active</Badge> : <Badge>Revoked</Badge>}</td>
                    <td>
                      {k.isActive && (
                        <Button variant="ghost" onClick={() => { setRevokeError(''); setRevoking(k); }}>
                          Revoke<span className="sr-only"> {k.name}</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 max-w-prose text-sm text-fg-muted">
          Keys are stored as a one-way hash, so the full key cannot be shown again. Clients send it in the{' '}
          <code className="font-mono text-xs">X-API-Key</code> header.
        </p>
      </section>

      <ConfirmDialog
        open={!!revoking}
        title={revoking ? `Revoke the key for ${revoking.name}?` : ''}
        confirmLabel="Revoke key"
        tone="danger"
        loading={revokeBusy}
        onCancel={() => setRevoking(null)}
        onConfirm={confirmRevoke}
      >
        <p className="text-sm">It stops working immediately and cannot be switched back on. You can create a new key.</p>
        {revokeError && <p role="alert" className="text-sm text-danger">{revokeError}</p>}
      </ConfirmDialog>
    </div>
  );
}
