'use client';

import { useState } from 'react';
import { listAuditLog } from '@/lib/api';
import { useAuthedSWR } from '@/lib/auth';
import { USER_ROLE_LABELS } from '@/lib/constants';
import type { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';

const when = (iso: string) => new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function AuditLog() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [applied, setApplied] = useState('');
  const { data, error, isLoading, isValidating, mutate } = useAuthedSWR(
    `audit-${page}-${applied}`,
    (t) => listAuditLog(t, { page, limit: 50, action: applied || undefined }),
    { keepPreviousData: true },
  );

  if (error && error.status !== 401) return <ErrorState message={error.message} onRetry={() => mutate()} retrying={isValidating} />;
  if (isLoading || !data) return <TableSkeleton />;

  const pages = Math.max(1, Math.ceil(data.meta.total / data.meta.limit));

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(filter.trim()); }}>
        <div className="w-full sm:w-72">
          <TextField label="Search the action" optional value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="verification, export, users" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <p className="text-sm text-fg-muted">
        Every change made through the API, and every export, with who did it and when. Request contents are never logged, so passwords and contact details are not kept here.
      </p>

      {data.data.length === 0 ? (
        <EmptyState title="Nothing logged yet">Changes appear here as people use the platform.</EmptyState>
      ) : (
        <div className="table-wrap" tabIndex={0}>
          <table className="data-table">
            <caption className="sr-only">Audit log</caption>
            <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">What</th><th scope="col">Outcome</th></tr></thead>
            <tbody>
              {data.data.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{when(r.at)}</td>
                  <td>
                    {r.actor ? (r.actor.displayName ?? r.actor.email) : r.actorRole ? 'Signed-in user' : 'Visitor or API key'}
                    {r.actorRole && <span className="block text-xs text-fg-muted">{USER_ROLE_LABELS[r.actorRole as UserRole] ?? r.actorRole}</span>}
                  </td>
                  <td><span className="font-mono text-xs">{r.action}</span>{r.entityId && <span className="block font-mono text-xs text-fg-muted">{r.entityId}</span>}</td>
                  <td>{r.statusCode ? (r.statusCode < 400 ? 'Done' : `Refused (${r.statusCode})`) : 'Done'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav aria-label="Pages" className="flex items-center justify-between gap-3">
        <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Newer</Button>
        <p className="tabular text-sm text-fg-muted">Page {page} of {pages}</p>
        <Button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>Older</Button>
      </nav>
    </div>
  );
}
