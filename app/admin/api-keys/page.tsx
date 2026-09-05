'use client';

import { useEffect, useState, useRef } from 'react';
import { listApiKeys, issueApiKey, revokeApiKey, getApiKeyTiers } from '@/lib/api';

const TIER_COLORS: Record<string, string> = {
  FREE: '#6b7280',
  PROFESSIONAL: '#f59e0b',
  ENTERPRISE: '#a78bfa',
};

export default function ApiKeysAdminPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const [tier, setTier] = useState<'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'>('FREE');

  function token() {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('ww_token') ?? '';
  }

  async function refresh() {
    setLoading(true);
    const [k, t] = await Promise.allSettled([listApiKeys(token()), getApiKeyTiers()]);
    if (k.status === 'fulfilled') setKeys(k.value);
    else setError(k.reason?.message ?? 'Failed to load keys — check you are logged in as admin.');
    if (t.status === 'fulfilled') setTiers(t.value);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    const name = nameRef.current?.value?.trim();
    if (!name) return;
    setIssuing(true);
    setError(null);
    try {
      const result = await issueApiKey({ name, tier }, token());
      setNewKey(result.key);
      if (nameRef.current) nameRef.current.value = '';
      refresh();
    } catch (err: any) {
      setError(err.message ?? 'Failed to issue key');
    } finally { setIssuing(false); }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return;
    await revokeApiKey(id, token());
    refresh();
  }

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="section-header mb-6">API key management</h1>

      {/* Tier summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {tiers.map((t) => (
          <div key={t.tier} className="bg-surface-1 border border-border px-3 py-3">
            <p className="text-xs font-semibold" style={{ color: TIER_COLORS[t.tier] }}>{t.tier}</p>
            <p className="text-xl font-semibold text-text mt-1">{t.dailyLimit.toLocaleString()}<span className="text-xs text-text-dim"> calls/day</span></p>
            <p className="text-2xs text-text-dim mt-1">{t.description}</p>
          </div>
        ))}
      </div>

      {/* Issue new key */}
      <div className="border border-border p-4 mb-6 bg-surface-1">
        <p className="text-xs font-medium text-text mb-3">Issue new API key</p>
        <form onSubmit={handleIssue} className="flex flex-wrap items-center gap-2">
          <input
            ref={nameRef}
            type="text"
            placeholder="Organisation or project name"
            required
            className="bg-surface border border-border px-3 py-1.5 text-xs text-text placeholder:text-text-dim focus:outline-none flex-1 min-w-[200px]"
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as any)}
            className="bg-surface border border-border px-2 py-1.5 text-xs text-text focus:outline-none"
          >
            <option value="FREE">Free</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
          <button type="submit" disabled={issuing} className="btn text-2xs px-3 py-1.5">
            {issuing ? 'Issuing…' : 'Issue key'}
          </button>
        </form>
        {error && <p className="text-2xs text-tier-high mt-2">{error}</p>}
      </div>

      {/* New key display — shown once */}
      {newKey && (
        <div className="border border-[#22c55e] bg-surface-1 p-4 mb-6">
          <p className="text-xs text-[#22c55e] font-medium mb-2">New API key issued — copy it now. It will not be shown again.</p>
          <code className="text-xs font-mono text-text break-all select-all">{newKey}</code>
          <button onClick={() => { navigator.clipboard.writeText(newKey); }} className="btn text-2xs px-2 py-1 ml-3">Copy</button>
          <button onClick={() => setNewKey(null)} className="btn text-2xs px-2 py-1 ml-2">Dismiss</button>
        </div>
      )}

      {/* Keys table */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface-2 text-text-dim">
            <tr>
              {['Name', 'Tier', 'Today', 'Total', 'Limit', 'Last used', 'Status', ''].map((h) => (
                <th key={h} className="data-cell text-left text-2xs font-medium py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="data-cell text-center text-text-dim py-6">Loading…</td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={8} className="data-cell text-center text-text-dim py-6">No API keys issued yet.</td></tr>
            ) : keys.map((k) => (
              <tr key={k.id} className="hover:bg-surface-2 transition-colors">
                <td className="data-cell text-text font-medium">{k.name}</td>
                <td className="data-cell font-medium" style={{ color: TIER_COLORS[k.tier] ?? '#6b7280' }}>{k.tier}</td>
                <td className="data-cell text-text-secondary tabular-nums">{k.callsToday}</td>
                <td className="data-cell text-text-secondary tabular-nums">{k.callsTotal.toLocaleString()}</td>
                <td className="data-cell text-text-dim tabular-nums">{k.dailyLimit.toLocaleString()}</td>
                <td className="data-cell text-text-dim font-mono text-2xs">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}
                </td>
                <td className="data-cell">
                  <span className={k.isActive ? 'text-[#22c55e]' : 'text-text-dim'}>
                    {k.isActive ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="data-cell">
                  {k.isActive && (
                    <button onClick={() => handleRevoke(k.id)} className="text-tier-high text-2xs hover:underline">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-2xs text-text-dim mt-3">
        Keys are SHA-256 hashed before storage. The raw key is shown only at issuance.
        Clients send it via <code className="font-mono">X-API-Key</code> header on public analytics endpoints.
      </p>
    </main>
  );
}
