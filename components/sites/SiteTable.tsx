import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { DumpSite } from '@/lib/types';
import { SITE_STATUS_LABELS, WASTE_TYPE_LABELS } from '@/lib/constants';
import { NOT_RECORDED, formatCoords, formatDate } from '@/lib/format';
import { TierLabel } from '@/components/ui/Badge';

/** The register of dump sites. The admin view adds coordinates. */
export function SiteTable({ sites, showCoordinates = false }: { sites: DumpSite[]; showCoordinates?: boolean }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Dump sites">
      <table className="data-table">
        <caption className="sr-only">Dump sites</caption>
        <thead>
          <tr>
            <th scope="col">Community</th>
            <th scope="col">Ward</th>
            <th scope="col">LGA</th>
            <th scope="col">Confidence</th>
            <th scope="col">Waste type</th>
            <th scope="col">Status</th>
            {showCoordinates && <th scope="col">Coordinates</th>}
            <th scope="col">First seen</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.id}>
              <td className="primary">{site.communityName ?? NOT_RECORDED}</td>
              <td>{site.ward ?? NOT_RECORDED}</td>
              <td>{site.lga ?? NOT_RECORDED}</td>
              <td><TierLabel tier={site.confidenceTier} /></td>
              <td>{WASTE_TYPE_LABELS[site.wasteType] ?? site.wasteType}</td>
              <td>{SITE_STATUS_LABELS[site.status] ?? site.status}</td>
              {showCoordinates && (
                <td className="font-mono text-xs">
                  {site.latitude != null && site.longitude != null ? (
                    <Link
                      href={`/map?lat=${site.latitude}&lng=${site.longitude}&site=${site.id}`}
                      className="inline-flex min-h-11 items-center gap-1 text-accent hover:text-accent-hover"
                    >
                      <MapPin size={14} aria-hidden="true" />
                      {formatCoords(site.latitude, site.longitude)}
                    </Link>
                  ) : NOT_RECORDED}
                </td>
              )}
              <td>{formatDate(site.firstSeenAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
