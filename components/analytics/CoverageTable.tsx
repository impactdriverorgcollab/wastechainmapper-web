import { formatDate } from '@/lib/format';
import type { CoverageRow } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

const STATUS: Record<CoverageRow['status'], { label: string; tone: 'danger' | 'warning' | 'success'; detail: string }> = {
  no_data: { label: 'No data', tone: 'danger', detail: 'No sites, collection points or facilities on record' },
  thin: { label: 'Thin', tone: 'warning', detail: 'Some records, but nothing checked by a reviewer in the last six months' },
  covered: { label: 'Covered', tone: 'success', detail: 'At least one site checked by a reviewer in the last six months' },
};

/** Where the platform knows something and where it knows very little. Absence of sites is not absence of waste. */
export function CoverageTable({ rows, unplaced }: { rows: CoverageRow[]; unplaced?: number }) {
  const gaps = rows.filter((r) => r.status !== 'covered').length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">
        {gaps === 0 ? 'Every local government area has recent checked records.' : `${gaps} of ${rows.length} areas have little or no checked data.`}{' '}
        An area with no sites is an area with no data, not an area with no waste.
        {unplaced ? ` ${unplaced} reports waiting for review could not be placed in any area yet.` : ''}
      </p>
      <div className="table-wrap" tabIndex={0}>
        <table className="data-table">
          <caption className="sr-only">Data coverage for each of the 23 local government areas</caption>
          <thead>
            <tr>
              <th scope="col">Area</th>
              <th scope="col">Data</th>
              <th scope="col" className="num">Sites</th>
              <th scope="col" className="num">Checked</th>
              <th scope="col" className="num">Field-verified</th>
              <th scope="col" className="num">Collection points</th>
              <th scope="col" className="num">Waiting for review</th>
              <th scope="col">Last record</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.lga}>
                <td className="primary">{r.lga}</td>
                <td><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge><span className="sr-only">. {STATUS[r.status].detail}</span></td>
                <td className="num">{r.sites}</td>
                <td className="num">{r.checkedSites}</td>
                <td className="num">{r.fieldVerifiedSites}</td>
                <td className="num">{r.collectionPoints}{r.officialCollectionPoints ? ` (${r.officialCollectionPoints} official)` : ''}</td>
                <td className="num">{r.awaitingReview}</td>
                <td>{r.lastRecordAt ? formatDate(r.lastRecordAt) : 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
