'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ExternalLink, MapPin } from 'lucide-react';
import { getJourneys, getSiteContext, getWasteSite } from '@/lib/api';
import { useSession } from '@/lib/auth';
import {
  JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER, LEVEL_TREND_LABELS, PROXIMITY_NOTICE, REFERENCE_KIND_LABELS, RISK_LABELS,
  SETTING_LABELS, SITE_CLASS_LABELS, SITE_STATUS_LABELS, SOURCE_TYPE_LABELS, TIER_INFO, VERIFICATION_STATUS_LABELS,
  WASTE_CATEGORY_INFO, FLOOD_RISK_LABELS, FLOW_STATUS_LABELS, WASTE_TYPE_LABELS,
} from '@/lib/constants';
import { formatCoords, formatDate, formatNumber, formatTonnes, isWebUrl, plural } from '@/lib/format';
import type { ObservationDetail, SiteDetail } from '@/lib/types';
import { Badge, TierLabel } from '@/components/ui/Badge';
import { EstimateRow } from '@/components/ui/Provenance';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { PinReview } from './PinReview';
import { VideoClip } from '@/components/ui/VideoClip';

function Card({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="border-t border-line pt-5">
      <h2 id={id} className="text-lg font-semibold text-fg">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Flags({ o }: { o: ObservationDetail }) {
  const flags = [
    o.blockedDrain && 'Blocked drain',
    o.entersWaterway && 'Waste entering water',
    o.overflowingPoint && 'Overflowing collection point',
    o.isHazardous && 'Hazardous or medical waste',
  ].filter(Boolean) as string[];
  if (flags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Conditions reported">
      {flags.map((f) => <li key={f}><Badge tone="warning">{f}</Badge></li>)}
    </ul>
  );
}

export function SiteRecord({ id }: { id: string }) {
  const session = useSession();
  const { data: site, error, isLoading, mutate } = useSWR<SiteDetail>(
    session.ready ? ['site', id, session.token ?? ''] : null,
    () => getWasteSite(id, session.token),
    { revalidateOnFocus: false },
  );
  const context = useSWR(site ? ['site-context', id] : null, () => getSiteContext(id), { revalidateOnFocus: false });
  const journeys = useSWR(site && site.journeyIds.length > 0 ? ['journeys', id] : null, () => getJourneys(id), { revalidateOnFocus: false });

  if (error) {
    return error.status === 404
      ? <ErrorState message="This site is not on the map. It may have been hidden after review, or the address is wrong." />
      : <ErrorState message={error.message} onRetry={() => mutate()} />;
  }
  if (isLoading || !site) {
    return (
      <div role="status" aria-label="Loading the site" className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const reviewer = session.user?.role === 'ADMIN' || session.user?.role === 'FIELD_VERIFIER';
  const tier = TIER_INFO[site.confidenceTier];
  const latest = site.history.observations[0];
  const prov = latest?.provenance ?? {};
  const compEntries = latest?.composition ? Object.entries(latest.composition).sort((a, b) => b[1] - a[1]) : [];
  const title = site.communityName ?? 'Unnamed location';
  const where = [site.ward && site.ward !== 'Unknown' ? site.ward : null, site.lga].filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-fg-muted"><Link href="/stakeholder" className="text-accent hover:text-accent-hover">All sites</Link></p>
        <h1 className="mt-1 text-xl font-semibold text-fg sm:text-2xl">{title}</h1>
        {where && <p className="text-base text-fg-muted">{where}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-base"><TierLabel tier={site.confidenceTier} /></span>
          <Badge>{SITE_STATUS_LABELS[site.status]}</Badge>
          <Badge>{SITE_CLASS_LABELS[site.siteClass]}</Badge>
          <Badge>{SETTING_LABELS[site.setting]}</Badge>
          {site.risk !== 'normal' && <Badge tone={site.risk === 'high' ? 'danger' : 'warning'}>{RISK_LABELS[site.risk]} attention</Badge>}
          {site.isHazardous && <Badge tone="danger">Hazardous waste</Badge>}
        </div>
      </div>

      <div role="note" className="rounded-lg bg-panel-2 p-4 text-sm text-fg-muted">
        <p>
          <span className="font-semibold text-fg">{tier.label}.</span> {tier.description}.{' '}
          A site on the map does not prove waste is still there. The last time anyone recorded waste here was{' '}
          <span className="font-semibold text-fg">{formatDate(site.lastObservedAt ?? site.firstSeenAt)}</span>.
        </p>
        <p className="mt-2">
          <Link href={`/map?lat=${site.latitude}&lng=${site.longitude}&site=${site.id}`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent hover:text-accent-hover">
            <MapPin size={14} aria-hidden="true" /> See it on the map
          </Link>
          <span className="mx-2 text-fg-subtle" aria-hidden="true">·</span>
          <Link href="/report" className="inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-hover">Report an update</Link>
        </p>
      </div>

      {reviewer && site.confidenceTier === 'LOW' && site.status === 'UNVERIFIED' && (
        <PinReview site={site} token={session.token!} onChanged={() => mutate()} />
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Card title="Photos and video" id="photos">
            {site.evidence.length === 0 ? (
              <p className="text-sm text-fg-muted">No photos have been approved for public viewing yet. Photos are checked by a reviewer first, to protect the people in them.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {site.evidence.map((e) => e.kind === 'video' ? (
                  <li key={e.id} className="col-span-2 overflow-hidden rounded-lg bg-panel-2 sm:col-span-3">
                    <VideoClip id={e.id} token={session.token} label={`Video of the waste at ${title}, taken ${formatDate(e.capturedAt ?? e.uploadedAt)}`} />
                    <p className="px-2 py-1 text-xs text-fg-muted">{formatDate(e.capturedAt ?? e.uploadedAt)}</p>
                  </li>
                ) : (
                  <li key={e.id} className="overflow-hidden rounded-lg bg-panel-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/backend/evidence/${e.id}/image`}
                      alt={e.caption ?? `Photo of the waste at ${title}, taken ${formatDate(e.capturedAt ?? e.uploadedAt)}`}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                    <p className="px-2 py-1 text-xs text-fg-muted">{formatDate(e.capturedAt ?? e.uploadedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Latest estimates" id="estimates">
            {!latest ? (
              <p className="text-sm text-fg-muted">
                Nobody has recorded sizes or a waste mix here yet. This site was found from a report, and a field visit would add them.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-fg-muted">
                  From the record of {formatDate(latest.observedAt)}. Every figure says who made it and how sure they were.
                  Estimates are never shown as measurements.
                </p>
                <dl className="divide-y divide-line">
                  <EstimateRow label="Main kind of waste" value={WASTE_CATEGORY_INFO[latest.primaryCategory].label} provenance={prov.category} />
                  <EstimateRow label="Volume" value={latest.volumeM3 != null ? `${formatNumber(latest.volumeM3, 2)} m³` : null} provenance={prov.volume} />
                  <EstimateRow label="Weight" value={latest.massKg != null ? `${formatNumber(latest.massKg)} kg` : null} provenance={prov.mass} />
                  <EstimateRow label="Moisture" value={latest.moisturePct != null ? `${formatNumber(latest.moisturePct)}%` : null} provenance={prov.moisture} />
                  <EstimateRow
                    label={latest.compositionStatus === 'PARTIAL' ? 'Mix (partial)' : 'Mix'}
                    value={compEntries.length ? compEntries.map(([k, v]) => `${WASTE_CATEGORY_INFO[k as keyof typeof WASTE_CATEGORY_INFO]?.label.split(' or ')[0] ?? k} ${v}%`).join(', ') : null}
                    provenance={prov.composition}
                  />
                </dl>
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-fg-muted">
                    {latest.levelTrend !== 'UNKNOWN' && <>The pile is <span className="text-fg">{LEVEL_TREND_LABELS[latest.levelTrend].toLowerCase()}</span>. </>}
                    {latest.collectionStatus && <>Collection: <span className="text-fg">{latest.collectionStatus}</span>.</>}
                  </p>
                  <Flags o={latest} />
                </div>
              </>
            )}
          </Card>

          <Card title="History" id="history">
            {site.history.observations.length === 0 && site.history.verifications.length === 0 ? (
              <p className="text-sm text-fg-muted">First seen {formatDate(site.firstSeenAt)}. No further records yet.</p>
            ) : (
              <ol className="space-y-4">
                {site.history.observations.map((o) => (
                  <li key={o.id} className="border-l-2 border-line pl-4">
                    <p className="text-sm font-semibold text-fg">{formatDate(o.observedAt)}</p>
                    <p className="text-sm text-fg-muted">
                      {WASTE_CATEGORY_INFO[o.primaryCategory].label}, {SETTING_LABELS[o.setting].toLowerCase()}
                      {o.volumeM3 != null && <>, about {formatNumber(o.volumeM3, 2)} m³</>}
                      {o.levelTrend !== 'UNKNOWN' && <>, {LEVEL_TREND_LABELS[o.levelTrend].toLowerCase()}</>}.
                      {' '}{VERIFICATION_STATUS_LABELS[(o.verification ?? o.verificationStatus ?? 'UNVERIFIED') as keyof typeof VERIFICATION_STATUS_LABELS]}
                      {o.sourceType && <> · {SOURCE_TYPE_LABELS[o.sourceType]}</>}
                    </p>
                    {o.notes && <p className="mt-1 break-words text-sm text-fg-muted">{o.notes}</p>}
                  </li>
                ))}
                {site.history.verifications.map((v) => (
                  <li key={v.id} className="border-l-2 border-line pl-4">
                    <p className="text-sm font-semibold text-fg">{formatDate(v.createdAt)}</p>
                    <p className="text-sm text-fg-muted">
                      Review: {VERIFICATION_STATUS_LABELS[v.fromStatus]} to {VERIFICATION_STATUS_LABELS[v.toStatus]}
                      {v.verifier.displayName ? ` by ${v.verifier.displayName}` : ''}.
                      {v.notes ? ` ${v.notes}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {site.history.collection.length > 0 && (
            <Card title="Collection history" id="collection">
              <div className="table-wrap" tabIndex={0}>
                <table className="data-table">
                  <caption className="sr-only">Waste flows that started at this site</caption>
                  <thead><tr><th scope="col">Recorded</th><th scope="col">Waste</th><th scope="col">Status</th><th scope="col" className="num">Tonnage</th></tr></thead>
                  <tbody>
                    {site.history.collection.map((f) => (
                      <tr key={f.id}>
                        <td>{formatDate(f.createdAt)}</td>
                        <td>{WASTE_TYPE_LABELS[f.wasteType]}</td>
                        <td>{FLOW_STATUS_LABELS[f.status]}</td>
                        <td className="num">{formatTonnes(f.estimatedTonnage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {journeys.data && journeys.data.length > 0 && (
            <Card title="Waste journey" id="journey">
              <p className="mb-3 text-sm text-fg-muted">
                A stage is only shown where there is evidence for it. Where there is none, you see the last place the waste was recorded. This is not live tracking.
              </p>
              {journeys.data.map((j) => (
                <div key={j.id} className="mb-4 last:mb-0">
                  <p className="text-base font-semibold text-fg">{j.label}</p>
                  <ol className="mt-2 flex flex-wrap gap-2" aria-label="Stages of the journey">
                    {JOURNEY_STAGE_ORDER.map((stage) => {
                      const ev = j.events.find((e) => e.stage === stage);
                      return (
                        <li key={stage} className={`rounded px-3 py-2 text-sm ${ev ? 'bg-accent-soft text-fg' : 'bg-panel-2 text-fg-subtle'}`}>
                          <span className="font-semibold">{JOURNEY_STAGE_LABELS[stage]}</span>
                          <span className="block text-xs">{ev ? formatDate(ev.occurredAt) : 'No record'}</span>
                        </li>
                      );
                    })}
                  </ol>
                  {j.lastKnown && (
                    <p className="mt-2 text-sm text-fg-muted">
                      Last known: {JOURNEY_STAGE_LABELS[j.lastKnown.stage].toLowerCase()} on {formatDate(j.lastKnown.at)}{j.lastKnown.place ? `, ${j.lastKnown.place}` : ''}.
                    </p>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-8">
          <Card title="Where it is" id="place">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-fg-muted">Coordinates</dt><dd className="font-mono text-xs text-fg">{formatCoords(site.latitude, site.longitude, 5)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-fg-muted">First seen</dt><dd className="text-fg">{formatDate(site.firstSeenAt)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-fg-muted">Last confirmed</dt><dd className="text-fg">{site.lastConfirmedAt ? formatDate(site.lastConfirmedAt) : 'Not yet'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-fg-muted">Records</dt><dd className="text-fg">{plural(site.history.observations.length, 'observation')}</dd></div>
            </dl>
            {site.description && <p className="mt-3 break-words border-t border-line pt-3 text-sm text-fg-muted">{site.description}</p>}
          </Card>

          <Card title="What is nearby" id="nearby">
            {context.isLoading && <Skeleton className="h-24 w-full" />}
            {context.error && <p className="text-sm text-fg-muted">Nearby features could not be loaded.</p>}
            {context.data && (
              <>
                {context.data.nearestFeatures.length === 0 && context.data.floodZones.length === 0 && context.data.collectionPoints.length === 0 ? (
                  <p className="text-sm text-fg-muted">No waterways, drains, schools, health facilities, flood zones or collection points are on record within a few kilometres. That may mean the map data is incomplete here.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {context.data.nearestFeatures.map((f) => (
                      <li key={f.kind} className="flex justify-between gap-4">
                        <span className="text-fg-muted">{REFERENCE_KIND_LABELS[f.kind]}{f.name ? `, ${f.name}` : ''}</span>
                        <span className="tabular shrink-0 text-fg">{formatNumber(f.distanceM)} m</span>
                      </li>
                    ))}
                    {context.data.floodZones.map((z, i) => (
                      <li key={i} className="flex justify-between gap-4">
                        <span className="text-fg-muted">{FLOOD_RISK_LABELS[z.riskLevel]} flood zone{z.name ? `, ${z.name}` : ''}</span>
                        <span className="tabular shrink-0 text-fg">{z.inside ? 'Inside' : `${formatNumber(z.distanceM)} m`}</span>
                      </li>
                    ))}
                    {context.data.collectionPoints.map((c) => (
                      <li key={c.id} className="flex justify-between gap-4">
                        <span className="text-fg-muted">Collection point, {c.name}{c.official ? ' (official)' : ''}{c.schedule ? `. ${c.schedule}` : ''}</span>
                        <span className="tabular shrink-0 text-fg">{formatNumber(c.distanceM)} m</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 border-t border-line pt-3 text-xs text-fg-subtle">{PROXIMITY_NOTICE}</p>
              </>
            )}
          </Card>

          <Card title="Where this came from" id="sources">
            {site.sources.length === 0 ? (
              <p className="text-sm text-fg-muted">No source records are linked to this site.</p>
            ) : (
              <ul className="space-y-3">
                {site.sources.map((s) => (
                  <li key={s.id} className="text-sm">
                    <p className="font-semibold text-fg">{SOURCE_TYPE_LABELS[s.sourceType]}</p>
                    <p className="text-fg-muted">{formatDate(s.publishedAt ?? s.recordedAt)} · {VERIFICATION_STATUS_LABELS[s.verification]}</p>
                    {s.excerpt && <p className="mt-1 line-clamp-3 break-words text-fg-muted">{s.excerpt}</p>}
                    {isWebUrl(s.sourceUrl) && (
                      <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent hover:text-accent-hover">
                        Open the original <ExternalLink size={14} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
