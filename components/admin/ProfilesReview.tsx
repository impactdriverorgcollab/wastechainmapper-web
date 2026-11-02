'use client';

import Link from 'next/link';
import { useState } from 'react';
import { listProfiles, reviewProfile } from '@/lib/api';
import { useAuthedSWR } from '@/lib/auth';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { formatDate, plural } from '@/lib/format';
import type { ProfileReviewRow, ProfileStatus } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';

const VIEWS: { status: ProfileStatus; label: string; empty: string }[] = [
  { status: 'PENDING', label: 'Waiting', empty: 'No profiles are waiting for review.' },
  { status: 'APPROVED', label: 'Live', empty: 'No profiles are live yet.' },
  { status: 'DECLINED', label: 'Declined', empty: 'No profiles have been declined.' },
];

function ProfileCard({ row, token, onChanged }: { row: ProfileReviewRow; token: string; onChanged: (text: string) => Promise<unknown> }) {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();
  const [busy, setBusy] = useState<'APPROVE' | 'DECLINE' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = row.status === 'APPROVED';

  async function decide(decision: 'APPROVE' | 'DECLINE') {
    if (decision === 'DECLINE' && !note.trim()) { setNoteError('Say why, so the person knows what to change.'); return; }
    setBusy(decision);
    setError(null);
    try {
      await reviewProfile(row.userId, decision, note.trim() || undefined, token);
      await onChanged(decision === 'APPROVE' ? `${row.publicName} is now public.` : `${row.publicName} is not public.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save. Try again.');
      setBusy(null);
    }
  }

  return (
    <li className="rounded-lg bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold text-fg">{row.publicName}</h2>
          <p className="text-sm text-fg-muted">{USER_ROLE_LABELS[row.user.role]}. Asked on {formatDate(row.requestedAt)}.</p>
        </div>
        {!row.user.isActive && <Badge tone="warning">Account switched off</Badge>}
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2"><dt className="text-fg-muted">Account name</dt><dd className="min-w-0 break-words text-fg">{row.user.displayName ?? 'Not given'}</dd></div>
        <div className="flex gap-2"><dt className="text-fg-muted">Contact</dt><dd className="min-w-0 break-all text-fg">{row.user.email ?? row.user.phone} <Badge tone={row.user.emailVerifiedAt ? 'success' : 'warning'}>{row.user.emailVerifiedAt ? 'Confirmed' : 'Not confirmed'}</Badge></dd></div>
        <div className="flex gap-2"><dt className="text-fg-muted">Reports</dt><dd className="tabular text-fg">{row.submitted} sent, {row.fieldVerified + row.deskChecked} approved</dd></div>
        <div className="flex gap-2"><dt className="text-fg-muted">Score</dt><dd className="tabular text-fg">{plural(row.points, 'point')}</dd></div>
      </dl>

      {row.reviewNote && <p className="mt-3 text-sm text-fg-muted">Reason given: {row.reviewNote}</p>}
      {error && <p role="alert" className="mt-3 rounded bg-danger-soft px-3 py-3 text-sm text-danger">{error}</p>}

      {declining ? (
        <div className="mt-3 max-w-prose space-y-3">
          <TextAreaField
            label={live ? 'Why is this profile coming down?' : 'Why are you declining this?'}
            hint="The person sees this."
            maxLength={500}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={noteError}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" loading={busy === 'DECLINE'} onClick={() => decide('DECLINE')}>{live ? 'Take the profile down' : 'Decline the profile'}</Button>
            <Button onClick={() => { setDeclining(false); setNoteError(undefined); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {!live && <Button variant="primary" loading={busy === 'APPROVE'} onClick={() => decide('APPROVE')}>Approve {row.publicName}</Button>}
          {live && <Link href={`/contributors/${row.code}`} className="btn-secondary">See the public page</Link>}
          {row.status !== 'DECLINED' && <Button onClick={() => setDeclining(true)}>{live ? 'Take down' : 'Decline'}</Button>}
        </div>
      )}
    </li>
  );
}

export function ProfilesReview() {
  const [status, setStatus] = useState<ProfileStatus>('PENDING');
  const [message, setMessage] = useState<string | null>(null);
  const { data, error, isLoading, mutate, token } = useAuthedSWR<ProfileReviewRow[]>(`profiles-${status}`, (t) => listProfiles(status, t));
  const view = VIEWS.find((v) => v.status === status)!;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-panel p-4 text-sm text-fg-muted">
        <p className="font-semibold text-fg">Before you approve</p>
        <ul className="mt-1 max-w-prose list-disc space-y-1 pl-5">
          <li>The public name is fit to show, and does not pretend to be someone else or include a phone number.</li>
          <li>Phone numbers are not confirmed. If the account has only a phone number and you are in doubt, contact the person first.</li>
          <li>If the person may be under 18, check a parent or guardian has agreed.</li>
        </ul>
      </div>

      <div role="group" aria-label="Show profiles" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Button key={v.status} variant={status === v.status ? 'primary' : 'secondary'} aria-pressed={status === v.status} onClick={() => { setStatus(v.status); setMessage(null); }}>{v.label}</Button>
        ))}
      </div>

      <div aria-live="polite" role="status">{message && <p className="rounded bg-success-soft px-3 py-3 text-sm text-success">{message}</p>}</div>

      {error && error.status !== 401 ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : isLoading || !data ? <TableSkeleton rows={3} columns={3} />
        : data.length === 0 ? <EmptyState title={view.empty} />
        : (
          <ul className="space-y-3">
            {data.map((row) => (
              <ProfileCard key={row.userId} row={row} token={token!} onChanged={async (text) => { setMessage(text); await mutate(); }} />
            ))}
          </ul>
        )}
    </div>
  );
}
