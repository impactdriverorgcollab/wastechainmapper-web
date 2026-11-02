'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { getLeaderboard } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { CONTRIBUTOR_KIND_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';

const PERIODS = [['all', 'All time'], ['recent', 'Last 90 days']] as const;

export function Leaderboard() {
  const [period, setPeriod] = useState<'all' | 'recent'>('all');
  const { data, error, isLoading, mutate } = useSWR(['leaderboard', period], () => getLeaderboard(period), { revalidateOnFocus: false });
  const { token } = useSession();

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODS.map(([value, label]) => (
          <Button key={value} variant={period === value ? 'primary' : 'secondary'} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</Button>
        ))}
      </div>

      {error ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : isLoading || !data ? <TableSkeleton rows={6} columns={4} />
        : data.data.length === 0 ? (
          <EmptyState
            title={period === 'all' ? 'Nobody is listed yet' : 'Nobody has approved reports from the last 90 days'}
            action={token ? <Link href="/account" className="btn-primary">Go to my record</Link> : <Link href="/account/join" className="btn-primary">Create an account</Link>}
          >
            People appear here once they have an approved public profile and at least one report a reviewer has approved.
          </EmptyState>
        ) : (
          <div className="table-wrap" tabIndex={0}>
            <table className="data-table data-table-keep">
              <caption className="sr-only">People ranked by points from approved reports</caption>
              <thead>
                <tr>
                  <th scope="col" className="num">Rank</th>
                  <th scope="col">Name</th>
                  <th scope="col" className="num hidden sm:table-cell">Field-verified</th>
                  <th scope="col" className="num hidden sm:table-cell">Desk-checked</th>
                  <th scope="col" className="hidden md:table-cell">Last active</th>
                  <th scope="col" className="num">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.code}>
                    <td className="num align-middle">{row.rank}</td>
                    <td className="primary">
                      <Link href={`/contributors/${row.code}`} className="inline-flex min-h-11 flex-col justify-center break-words text-accent underline underline-offset-2 hover:text-accent-hover">{row.name}</Link>
                      <span className="block text-xs font-normal text-fg-muted">{CONTRIBUTOR_KIND_LABELS[row.kind]}</span>
                    </td>
                    <td className="num hidden align-middle sm:table-cell">{row.fieldVerified}</td>
                    <td className="num hidden align-middle sm:table-cell">{row.deskChecked}</td>
                    <td className="hidden whitespace-nowrap align-middle md:table-cell">{formatDate(row.lastActive)}</td>
                    <td className="num align-middle font-semibold text-fg">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <section aria-labelledby="how-points" className="rounded-lg bg-panel p-4 sm:p-5">
        <h2 id="how-points" className="text-lg font-semibold text-fg">How points work</h2>
        <ul className="mt-2 max-w-prose list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>Each report a reviewer has desk-checked earns 1 point.</li>
          <li>Each field-verified report earns 3 points, because someone visited or has first-hand evidence.</li>
          <li>Reports that are waiting or rejected earn nothing. If an approval is reversed, its points go too.</li>
          <li>Being listed is a choice. Each person asks for a profile, and a reviewer approves it.</li>
        </ul>
      </section>
    </div>
  );
}
