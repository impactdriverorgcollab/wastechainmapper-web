'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { getMyRecord, requestProfile, resendConfirmation, withdrawProfile } from '@/lib/api';
import { useAuthedSWR, useSession, useSignOut } from '@/lib/auth';
import { RECORD_STATUS_INFO } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import type { MyRecord } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField } from '@/components/ui/Field';
import { StatGridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { CopyLink } from './CopyLink';

function ProfileForm({ token, initialName, label, onDone }: { token: string; initialName: string; label: string; onDone: () => Promise<unknown> }) {
  const [name, setName] = useState(initialName);
  const [agreed, setAgreed] = useState(false);
  const [problems, setProblems] = useState<{ name?: string; agreed?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = {
      name: name.trim().length >= 2 ? undefined : 'Enter the name you want people to see.',
      agreed: agreed ? undefined : 'Tick the box to agree before you continue.',
    };
    setProblems(found);
    if (found.name || found.agreed) return;
    setBusy(true);
    try {
      await requestProfile(name.trim(), token);
      await onDone();
    } catch (err) {
      setProblems({ form: err instanceof Error ? err.message : 'That did not save. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 max-w-md space-y-3">
      {problems.form && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{problems.form}</p>}
      <TextField label="Public name" hint="It does not have to be your full name." maxLength={60} value={name} onChange={(e) => setName(e.target.value)} error={problems.name} />
      <div>
        <label className="flex cursor-pointer gap-3 text-sm text-fg">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-accent" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-invalid={problems.agreed ? true : undefined} />
          <span>I agree to show my public name, my approved records and their local government areas on a public page and on the leaderboard. I am 18 or over, or a parent or guardian has agreed.</span>
        </label>
        {problems.agreed && <p className="field-error">{problems.agreed}</p>}
      </div>
      <Button type="submit" variant="primary" loading={busy}>{label}</Button>
    </form>
  );
}

function ConfirmEmailNotice({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'failed'>('idle');

  async function resend() {
    setState('busy');
    try {
      await resendConfirmation(token);
      setState('sent');
    } catch {
      setState('failed');
    }
  }

  return (
    <div role="status" className="rounded-lg bg-warning-soft p-4">
      <p className="text-sm text-fg">
        <span className="font-semibold">Confirm your email address.</span> We sent a link to <span className="break-all">{email}</span>. Check your spam folder too. You need to confirm it before you can have a public profile.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button onClick={resend} loading={state === 'busy'} disabled={state === 'sent'}>{state === 'sent' ? 'Link sent' : 'Send the link again'}</Button>
        {state === 'failed' && <p className="field-error">That did not send. Try again in a moment.</p>}
      </div>
    </div>
  );
}

function ProfileSection({ data, token, refresh }: { data: MyRecord; token: string; refresh: () => Promise<unknown> }) {
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = data.profile;

  async function takeDown() {
    setBusy(true);
    setError(null);
    try {
      await withdrawProfile(token);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const done = async () => { await refresh(); setRenaming(false); };
  const showTakeDown = p?.status === 'APPROVED' || p?.status === 'PENDING';

  return (
    <section aria-labelledby="profile-heading" className="rounded-lg bg-panel p-4 sm:p-5">
      <h2 id="profile-heading" className="text-lg font-semibold text-fg">Public profile</h2>
      {error && <p role="alert" className="mt-3 rounded bg-danger-soft px-3 py-3 text-sm text-danger">{error}</p>}

      {(!p || p.status === 'WITHDRAWN') && data.needsEmailConfirmation && (
        <p className="mt-1 max-w-prose text-sm text-fg-muted">Once your email address is confirmed, you can ask for a public profile here.</p>
      )}

      {(!p || p.status === 'WITHDRAWN') && !data.needsEmailConfirmation && (
        <>
          <p className="mt-1 max-w-prose text-sm text-fg-muted">
            A public profile lets you show your work to anyone with a link, and puts you on the leaderboard. It is your choice. A reviewer checks it before it appears, and you can take it down at any time.
          </p>
          <ProfileForm token={token} initialName={p?.publicName ?? ''} label="Ask for a public profile" onDone={refresh} />
        </>
      )}

      {p?.status === 'PENDING' && (
        <p className="mt-2 max-w-prose text-sm text-fg-muted">
          <Badge tone="warning">Waiting for a reviewer</Badge>{' '}
          Your profile as <span className="font-semibold text-fg">{p.publicName}</span> will appear once a reviewer has approved it.
        </p>
      )}

      {p?.status === 'DECLINED' && (
        <>
          <p className="mt-2 max-w-prose text-sm text-fg-muted"><Badge tone="danger">Not approved</Badge> The reviewer said: {p.reviewNote}</p>
          <p className="mt-2 max-w-prose text-sm text-fg-muted">Your private record is not affected. You can change the name and ask again.</p>
          <ProfileForm token={token} initialName={p.publicName} label="Ask again" onDone={refresh} />
        </>
      )}

      {p?.status === 'APPROVED' && (
        <>
          <p className="mt-2 text-sm text-fg-muted">
            <Badge tone="success">Live</Badge> You appear as <span className="font-semibold text-fg">{p.publicName}</span>
            {data.rank ? <>, ranked <span className="tabular font-semibold text-fg">{data.rank}</span> on the leaderboard</> : ''}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/contributors/${p.code}`} className="btn-secondary">See my public page</Link>
            <CopyLink path={`/contributors/${p.code}`} />
            {!renaming && <Button variant="ghost" onClick={() => setRenaming(true)}>Change my public name</Button>}
          </div>
          {renaming && (
            <>
              <p className="mt-3 max-w-prose text-sm text-fg-muted">A new name goes back to a reviewer, and your profile is hidden until they approve it.</p>
              <ProfileForm token={token} initialName={p.publicName} label="Send the new name" onDone={done} />
            </>
          )}
        </>
      )}

      {showTakeDown && (
        <div className="mt-3">
          <Button variant="ghost" onClick={() => setConfirming(true)}>Take my profile down</Button>
        </div>
      )}

      <ConfirmDialog open={confirming} title="Take your profile down?" confirmLabel="Take it down" tone="danger" loading={busy} onCancel={() => setConfirming(false)} onConfirm={takeDown}>
        <p className="text-sm">Your page stops working straight away and you leave the leaderboard. Your private record stays here, and you can ask to come back later.</p>
      </ConfirmDialog>
    </section>
  );
}

/** The signed-in person's own record. Nothing here is public unless a profile is live. */
export function AccountHome() {
  const router = useRouter();
  const session = useSession();
  const signOut = useSignOut('/');
  const { data, error, isLoading, mutate, token } = useAuthedSWR<MyRecord>('my-record', (t) => getMyRecord(t), undefined, '/account/sign-in?next=/account');

  useEffect(() => {
    if (session.ready && !session.token) router.replace('/account/sign-in?next=/account');
  }, [session.ready, session.token, router]);

  const header = (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">My record</h1>
        {session.user && <p className="mt-1 text-sm text-fg-muted">{session.user.displayName ?? session.user.email ?? session.user.phone}. Only you and reviewers can see this page.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/report" className="btn-primary">Report waste</Link>
        <button type="button" onClick={signOut} className="btn-ghost"><LogOut size={16} aria-hidden="true" />Sign out</button>
      </div>
    </div>
  );

  if (error && error.status !== 401) return <>{header}<ErrorState message={error.message} onRetry={() => mutate()} /></>;
  if (!session.ready || !session.token || isLoading || !data) {
    return (
      <div role="status" aria-label="Loading your record">
        <StatGridSkeleton />
        <div className="mt-6"><TableSkeleton rows={4} columns={4} /></div>
      </div>
    );
  }

  return (
    <>
      {header}
      <div className="space-y-6">
        {data.needsEmailConfirmation && data.email && <ConfirmEmailNotice email={data.email} token={token!} />}

        <StatGrid>
          <StatCard label="Points" value={data.points} />
          <StatCard label="Field-verified" value={data.fieldVerified} note={`${data.pointValues.fieldVerified} points each`} />
          <StatCard label="Desk-checked" value={data.deskChecked} note={`${data.pointValues.deskChecked} point each`} />
          <StatCard label="Reports sent" value={data.submitted} />
        </StatGrid>

        {data.canHaveProfile
          ? <ProfileSection data={data} token={token!} refresh={() => mutate()} />
          : <p className="rounded-lg bg-panel p-4 text-sm text-fg-muted">Public profiles are for ambassadors and public reporters. Staff check the records, so they are not ranked on them.</p>}

        <section aria-labelledby="records-heading">
          <h2 id="records-heading" className="mb-3 text-lg font-semibold text-fg">My reports</h2>
          {data.records.length === 0 ? (
            <EmptyState title="No reports yet" action={<Link href="/report" className="btn-primary">Report waste</Link>}>
              Reports you send while signed in appear here. Reports sent before you signed in cannot be added.
            </EmptyState>
          ) : (
            <div className="table-wrap" tabIndex={0}>
              <table className="data-table data-table-keep">
                <caption className="sr-only">Reports you have sent, newest first</caption>
                <thead><tr><th scope="col" className="hidden sm:table-cell">Date</th><th scope="col">Place</th><th scope="col">Check</th><th scope="col" className="num">Points</th></tr></thead>
                <tbody>
                  {data.records.map((r) => {
                    const info = RECORD_STATUS_INFO[r.status];
                    return (
                      <tr key={r.id}>
                        <td className="hidden whitespace-nowrap sm:table-cell">{formatDate(r.date)}</td>
                        <td className="primary">
                          {r.place ?? r.lga ?? 'Place not set yet'}
                          <span className="block text-xs font-normal text-fg-muted sm:hidden">{formatDate(r.date)}</span>
                        </td>
                        <td><Badge tone={info.tone}>{info.label}</Badge></td>
                        <td className="num">{r.counted ? (r.status === 'FIELD_VERIFIED' ? data.pointValues.fieldVerified : data.pointValues.deskChecked) : 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
