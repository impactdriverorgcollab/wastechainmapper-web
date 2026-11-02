'use client';

import { useEffect, useState } from 'react';
import { Copy, EyeOff, Eye, Users } from 'lucide-react';
import { fetchPrivatePhoto, resolveDuplicate, reviewPhoto } from '@/lib/api';
import { LEVEL_TREND_LABELS, SETTING_LABELS, WASTE_CATEGORY_INFO } from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/format';
import type { EvidenceItem, Report } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EstimateRow } from '@/components/ui/Provenance';
import { Skeleton } from '@/components/ui/Skeleton';
import { StoryPins } from './StoryPins';

function PhotoTile({ item, index, token, onChanged }: { item: EvidenceItem; index: number; token: string; onChanged: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    fetchPrivatePhoto(item.id, token)
      .then((u) => { if (cancelled) URL.revokeObjectURL(u); else { url = u; setSrc(u); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [item.id, token]);

  async function change(patch: { publicApproved?: boolean; containsPeople?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      await reviewPhoto(item.id, patch, token);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The change was not saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="overflow-hidden rounded-lg bg-panel-2">
      {failed ? (
        <p className="flex aspect-square items-center justify-center px-2 text-center text-sm text-fg-muted">The photo could not be loaded.</p>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Photo ${index + 1} sent with this report`} className="aspect-square w-full object-cover" />
      ) : (
        <Skeleton className="aspect-square w-full" />
      )}
      <div className="space-y-2 p-2">
        <p className="text-xs text-fg-muted">
          {item.publicApproved ? 'Shown publicly' : item.containsPeople ? 'Held back: shows people' : 'Private until you approve it'}
        </p>
        <div className="flex flex-wrap gap-2">
          {item.publicApproved ? (
            <Button onClick={() => change({ publicApproved: false })} loading={busy}><EyeOff size={14} aria-hidden="true" />Hold back</Button>
          ) : (
            <Button variant="primary" onClick={() => change({ publicApproved: true })} loading={busy} disabled={item.containsPeople}>
              <Eye size={14} aria-hidden="true" />Show publicly
            </Button>
          )}
          <Button onClick={() => change({ containsPeople: !item.containsPeople })} loading={busy} aria-pressed={!!item.containsPeople}>
            <Users size={14} aria-hidden="true" />{item.containsPeople ? 'No people' : 'Shows people'}
          </Button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>
    </li>
  );
}

interface Props {
  report: Report;
  token: string;
  onChanged: () => void;
}

/** What a reviewer needs beyond the text: the structured record, the photos, possible duplicates, the reporter. */
export function ReviewDetail({ report, token, onChanged }: Props) {
  const o = report.observation;
  const [dupBusy, setDupBusy] = useState<'DISMISS' | 'MERGE' | null>(null);
  const [dupError, setDupError] = useState<string | null>(null);
  const hasDuplicate = !!report.possibleDuplicateOf && !report.duplicateResolved;

  async function settle(action: 'DISMISS' | 'MERGE') {
    setDupBusy(action);
    setDupError(null);
    try {
      await resolveDuplicate(report.id, action, token);
      onChanged();
    } catch (e) {
      setDupError(e instanceof Error ? e.message : 'That did not save. Try again.');
    } finally {
      setDupBusy(null);
    }
  }

  const pins = report.pins ?? [];
  if (!o && !(report.evidence && report.evidence.length) && !hasDuplicate && pins.length === 0) return null;

  const comp = o?.composition ? Object.entries(o.composition) : [];
  const flags = [
    o?.blockedDrain && 'Blocked drain',
    o?.entersWaterway && 'Waste entering water',
    o?.overflowingPoint && 'Overflowing collection point',
    o?.isHazardous && 'Hazardous or medical',
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3 border-t border-line pt-3">
      {hasDuplicate && (
        <div role="note" className="rounded bg-warning-soft p-3">
          <p className="flex items-start gap-2 text-sm text-fg">
            <Copy size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span>
              <span className="font-semibold">Possible duplicate.</span> {report.duplicateReason ?? 'Close to another report.'}
              {report.linkedSiteId && ' It is already linked to a site, and approving it will add to that site.'}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => settle('DISMISS')} loading={dupBusy === 'DISMISS'} disabled={dupBusy !== null}>Keep it, it is different</Button>
            <Button variant="danger" onClick={() => settle('MERGE')} loading={dupBusy === 'MERGE'} disabled={dupBusy !== null}>Reject as a copy</Button>
          </div>
          {dupError && <p className="field-error">{dupError}</p>}
        </div>
      )}

      {pins.length > 0 && <StoryPins reportId={report.id} pins={pins} token={token} onChanged={onChanged} />}

      {o && (
        <div>
          <p className="text-sm font-semibold text-fg">
            {WASTE_CATEGORY_INFO[o.primaryCategory].label} · {SETTING_LABELS[o.setting].toLowerCase()} · seen {formatDate(o.observedAt)}
          </p>
          {flags.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-2" aria-label="Conditions reported">
              {flags.map((f) => <li key={f}><Badge tone="warning">{f}</Badge></li>)}
            </ul>
          )}
          <dl className="mt-2 divide-y divide-line">
            <EstimateRow label="Kind of waste" value={WASTE_CATEGORY_INFO[o.primaryCategory].label} provenance={o.provenance.category} />
            <EstimateRow label="Volume" value={o.volumeM3 != null ? `${formatNumber(o.volumeM3, 2)} m³` : null} provenance={o.provenance.volume} />
            <EstimateRow label="Weight" value={o.massKg != null ? `${formatNumber(o.massKg)} kg` : null} provenance={o.provenance.mass} />
            {o.moisturePct != null && <EstimateRow label="Moisture" value={`${formatNumber(o.moisturePct)}%`} provenance={o.provenance.moisture} />}
            {comp.length > 0 && (
              <EstimateRow
                label={o.compositionStatus === 'PARTIAL' ? 'Mix (partial)' : 'Mix'}
                value={comp.map(([k, v]) => `${WASTE_CATEGORY_INFO[k as keyof typeof WASTE_CATEGORY_INFO]?.label.split(' or ')[0] ?? k} ${v}%`).join(', ')}
                provenance={o.provenance.composition}
              />
            )}
          </dl>
          {(o.siteExists != null || o.siteActive != null || o.levelTrend !== 'UNKNOWN') && (
            <p className="mt-2 text-sm text-fg-muted">
              {o.siteExists === false && 'The ambassador says nothing is here. '}
              {o.siteExists === true && 'The ambassador confirms the site exists. '}
              {o.siteActive === false && 'Dumping has stopped. '}
              {o.siteActive === true && 'Dumping is still happening. '}
              {o.levelTrend !== 'UNKNOWN' && `The pile is ${LEVEL_TREND_LABELS[o.levelTrend].toLowerCase()}. `}
              {o.collectionStatus && `Collection: ${o.collectionStatus}.`}
            </p>
          )}
          {(report.extentNote || report.conditionsNote) && (
            <p className="mt-1 break-words text-sm text-fg-muted">{[report.extentNote, report.conditionsNote].filter(Boolean).join('. ')}</p>
          )}
        </div>
      )}

      {report.evidence && report.evidence.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-fg">Photos</p>
          <ul className="grid grid-cols-2 gap-3">
            {report.evidence.map((e, i) => <PhotoTile key={e.id} item={e} index={i} token={token} onChanged={onChanged} />)}
          </ul>
          <p className="mt-2 text-xs text-fg-subtle">Photos stay private until you approve them. Hold back any that show faces or number plates.</p>
        </div>
      )}

      {(report.contactName || report.contactDetail || report.consentToUse !== undefined) && report.sourceType !== 'NEWS_SCRAPE' && (
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">Reporter</span> (staff only):{' '}
          {report.contactName || report.contactDetail ? [report.contactName, report.contactDetail].filter(Boolean).join(', ') : 'no contact details given'}.{' '}
          {report.consentToUse ? 'Agreed to the use of the report and photos.' : 'Has not recorded consent. Check before publishing photos.'}
        </p>
      )}
    </div>
  );
}
