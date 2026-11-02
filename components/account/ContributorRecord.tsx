'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ApiError, getContributor } from '@/lib/api';
import { CONTRIBUTOR_KIND_LABELS, RECORD_STATUS_INFO } from '@/lib/constants';
import { formatDate, plural } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, StatGridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { CopyLink } from './CopyLink';

/** One person's public proof of activity. Someone with the link can check it for themselves. */
export function ContributorRecord({ code }: { code: string }) {
  const { data, error, isLoading, mutate } = useSWR<Awaited<ReturnType<typeof getContributor>>, ApiError>(['contributor', code], () => getContributor(code), { revalidateOnFocus: false, shouldRetryOnError: false });

  if (error?.status === 404) {
    return (
      <EmptyState title="This profile is not public" action={<Link href="/leaderboard" className="btn-primary">See the leaderboard</Link>}>
        The address may be wrong, or the person may have taken their profile down.
      </EmptyState>
    );
  }
  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (isLoading || !data) {
    return (
      <div role="status" aria-label="Loading this record" className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <StatGridSkeleton />
        <TableSkeleton rows={4} columns={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold tracking-tight text-fg sm:text-2xl">{data.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {CONTRIBUTOR_KIND_LABELS[data.kind]}{data.ambassadorCode ? ` ${data.ambassadorCode}` : ''}. Joined {formatDate(data.memberSince)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><CopyLink path={`/contributors/${data.code}`} /></div>
      </div>

      <p className="max-w-prose text-base text-fg-muted">
        Every record on this page was checked by a WasteChainMapper reviewer. The page is live: if an approval is reversed, or {data.name} takes the profile down, it changes here.
      </p>

      <StatGrid>
        <StatCard label="Points" value={data.points} />
        <StatCard label="Leaderboard rank" value={data.rank ?? 'Not ranked'} />
        <StatCard label="Field-verified" value={data.fieldVerified} />
        <StatCard label="Desk-checked" value={data.deskChecked} />
      </StatGrid>

      {data.areas.length > 0 && (
        <section aria-labelledby="areas-heading">
          <h2 id="areas-heading" className="mb-2 text-lg font-semibold text-fg">Areas</h2>
          <ul className="flex flex-wrap gap-2">
            {data.areas.map((a) => (
              <li key={a.lga} className="rounded bg-panel px-3 py-2 text-sm text-fg">{a.lga} <span className="tabular text-fg-muted">{plural(a.records, 'record')}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="records-heading">
        <h2 id="records-heading" className="mb-3 text-lg font-semibold text-fg">Checked records</h2>
        {data.records.length === 0 ? (
          <EmptyState title="No approved records yet">Records appear here once a reviewer has approved them.</EmptyState>
        ) : (
          <div className="table-wrap" tabIndex={0}>
            <table className="data-table">
              <caption className="sr-only">Reviewer-approved records, newest first</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Area</th><th scope="col">Check</th><th scope="col">Reference</th></tr></thead>
              <tbody>
                {data.records.map((r) => (
                  <tr key={r.reference}>
                    <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="primary">{r.lga ?? 'Rivers State'}</td>
                    <td><Badge tone={RECORD_STATUS_INFO[r.status].tone}>{RECORD_STATUS_INFO[r.status].label}</Badge></td>
                    <td className="font-mono text-xs">{r.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-sm text-fg-muted">Exact places and contact details are not shown, to protect this person&apos;s privacy.</p>
      </section>

      <p className="text-sm text-fg-muted">
        Profile {data.code}. <Link href="/leaderboard" className="text-accent underline underline-offset-2 hover:text-accent-hover">See the leaderboard and how points work</Link>.
      </p>
    </div>
  );
}
