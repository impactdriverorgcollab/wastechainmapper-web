'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { DumpSite } from '@/lib/types';
import { BASIS_INFO, RISK_LABELS, SETTING_LABELS, SITE_STATUS_LABELS, TIER_INFO, WASTE_CATEGORY_INFO, WASTE_TYPE_LABELS } from '@/lib/constants';
import { formatCoords, formatDate, formatNumber } from '@/lib/format';
import type { PlaceInfo } from './mapLayers';

export type Selection =
  | { kind: 'site'; site: DumpSite }
  | { kind: 'place'; place: PlaceInfo };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-fg-muted">{label}</span>
      <span className="line-clamp-3 break-words text-right text-fg">{value}</span>
    </div>
  );
}

/** Details of the thing the user selected. A bottom sheet on phones, a card on wider screens. */
export function DetailsCard({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Move focus into the card when it opens, and close on Escape.
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selection, onClose]);

  const title = selection.kind === 'site' ? selection.site.communityName ?? 'Unnamed location' : selection.place.title;
  const subtitle =
    selection.kind === 'site'
      ? [selection.site.ward, selection.site.lga].filter(Boolean).join(', ')
      : selection.place.subtitle;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={`Details: ${title}`}
      // No scrolling here: long text is clamped below. A scroll container floating over the WebGL
      // map painted a black block in headless Chrome. The outline is off because this box only
      // receives focus from code, so a screen reader announces it. It is not a control.
      className="rounded-lg bg-panel-2 shadow-overlay outline-none sm:w-80"
    >
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div>
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {subtitle && <p className="text-sm text-fg-muted">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close details" className="btn-ghost -mr-2 -mt-2 shrink-0">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2 px-4 pb-4 text-sm">
        {selection.kind === 'site' ? (
          <SiteRows site={selection.site} />
        ) : (
          <>
            {selection.place.rows.map(([label, value]) => <Row key={label} label={label} value={value} />)}
            {selection.place.links && selection.place.links.length > 0 && (
              <ul className="space-y-1 border-t border-line pt-2">
                {selection.place.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="line-clamp-2 break-words text-accent underline underline-offset-2 hover:text-accent-hover">
                      {l.label}<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SiteRows({ site }: { site: DumpSite }) {
  const tier = TIER_INFO[site.confidenceTier];
  return (
    <>
      <Row
        label="How sure"
        value={
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${tier.dotClass}`} />
            {tier.label}
          </span>
        }
      />
      <p className="text-fg-muted">{tier.description}.</p>
      <Row label="Status" value={SITE_STATUS_LABELS[site.status]} />
      <Row label="Kind of waste" value={site.category ? WASTE_CATEGORY_INFO[site.category].label : WASTE_TYPE_LABELS[site.wasteType]} />
      {site.setting && <Row label="Where" value={SETTING_LABELS[site.setting]} />}
      {site.risk && site.risk !== 'normal' && <Row label="Attention" value={`${RISK_LABELS[site.risk]}`} />}
      {site.latestVolumeM3 != null && (
        <Row
          label="Volume"
          value={`about ${formatNumber(site.latestVolumeM3, 1)} m³ (${site.latestVolumeBasis ? BASIS_INFO[site.latestVolumeBasis].label.toLowerCase() : 'estimate'})`}
        />
      )}
      <Row label="First reported" value={formatDate(site.firstSeenAt)} />
      <Row label="Last recorded" value={formatDate(site.lastObservedAt ?? site.lastConfirmedAt ?? site.firstSeenAt)} />
      {site.observationCount != null && <Row label="Records" value={`${site.observationCount} observations, ${site.photoCount ?? 0} photos`} />}
      <Row
        label="Coordinates"
        value={<span className="font-mono text-xs">{formatCoords(site.latitude, site.longitude, 5)}</span>}
      />
      {site.description && <p className="line-clamp-3 break-words border-t border-line pt-2 text-fg-muted">{site.description}</p>}
      <p className="border-t border-line pt-2">
        <Link href={`/sites/${site.id}`} className="inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-hover">
          Open the full site record
        </Link>
      </p>
    </>
  );
}
