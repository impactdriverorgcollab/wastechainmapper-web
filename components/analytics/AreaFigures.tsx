'use client';

import useSWR from 'swr';
import { getAreaIndicators, getReferences } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { formatDate, formatNumber } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';

const LINK = 'text-accent underline underline-offset-2 hover:text-accent-hover';
const name = (indicator: string) => indicator.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Totals per area from other sectors, with their sources. Population is used in the coverage table. */
export function AreaFigures() {
  const { token } = useSession();
  const { data, error, mutate } = useSWR(['area-indicators', token ?? ''], () => getAreaIndicators(token), { revalidateOnFocus: false });
  const others = (data?.data ?? []).filter((r) => r.indicator !== 'population');

  return (
    <section aria-labelledby="area-figures">
      <h2 id="area-figures" className="text-lg font-semibold text-fg">Figures from other sectors</h2>
      <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">
        Health, water-quality and other totals for whole local government areas, each with its source. Set beside waste records, they can show patterns. A pattern is not proof that one thing causes another.
      </p>
      {error ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : !data ? <Skeleton className="h-24 w-full" />
        : others.length === 0 ? (
          <p className="text-sm text-fg-muted">No figures from other sectors have been added yet. Administrators add them under Admin, Import data, Area figures.</p>
        ) : (
          <div className="table-wrap" tabIndex={0}>
            <table className="data-table">
              <caption className="sr-only">Figures for each local government area from other sectors</caption>
              <thead><tr><th scope="col">Area</th><th scope="col">Figure</th><th scope="col">Period</th><th scope="col" className="num">Value</th><th scope="col">Source</th></tr></thead>
              <tbody>
                {others.map((r) => (
                  <tr key={`${r.lga}-${r.indicator}-${r.period}`}>
                    <td className="primary">{r.lga}</td>
                    <td>{name(r.indicator)} {r.restricted && <Badge tone="warning">Partners only</Badge>}</td>
                    <td>{r.period || 'Not given'}</td>
                    <td className="num">{formatNumber(r.value, 2)}{r.unit ? ` ${r.unit}` : ''}</td>
                    <td>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}

/** Published research, and official notices and tenders, found automatically. A reading list, not data. */
export function ReadingList() {
  const { data, error, mutate } = useSWR('references', () => getReferences(), { revalidateOnFocus: false });
  const research = (data ?? []).filter((r) => r.kind === 'research');
  const notices = (data ?? []).filter((r) => r.kind === 'notice');

  const list = (items: typeof research, empty: string) => items.length === 0 ? <p className="text-sm text-fg-muted">{empty}</p> : (
    <ul className="divide-y divide-line border-y border-line">
      {items.slice(0, 12).map((r) => (
        <li key={r.id} className="py-3">
          <a href={r.url} target="_blank" rel="noopener noreferrer" className={`text-base ${LINK}`}>{r.title}<span className="sr-only"> (opens in a new tab)</span></a>
          <p className="mt-1 text-sm text-fg-muted">
            {[r.authors, r.venue, r.publishedOn && formatDate(r.publishedOn)].filter(Boolean).join(' · ')}
            {r.places.length > 0 && <> · Mentions {r.places.join(', ')}</>}
          </p>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-labelledby="reading">
      <h2 id="reading" className="text-lg font-semibold text-fg">Reading</h2>
      <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">
        Studies about waste in Rivers State, from the OpenAlex index of published research, and government notices, tenders and plans found in the news. These are sources to read. They put nothing on the map.
      </p>
      {error ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : !data ? <Skeleton className="h-40 w-full" />
        : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div><h3 className="mb-2 text-base font-semibold text-fg">Research</h3>{list(research, 'No studies have been found yet.')}</div>
            <div><h3 className="mb-2 text-base font-semibold text-fg">Notices, tenders and plans</h3>{list(notices, 'No notices have been found yet.')}</div>
          </div>
        )}
    </section>
  );
}
