'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { DumpSite } from '@/lib/types';
import { SITE_STATUS_LABELS, TIER_INFO, WASTE_TYPE_LABELS } from '@/lib/constants';
import { formatCoords, formatDate } from '@/lib/format';
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
          selection.place.rows.map(([label, value]) => <Row key={label} label={label} value={value} />)
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
        label="Confidence"
        value={
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${tier.dotClass}`} />
            {tier.label}
          </span>
        }
      />
      <p className="text-fg-muted">{tier.description}.</p>
      <Row label="Status" value={SITE_STATUS_LABELS[site.status]} />
      <Row label="Waste type" value={WASTE_TYPE_LABELS[site.wasteType]} />
      <Row label="First seen" value={formatDate(site.firstSeenAt)} />
      {site.lastConfirmedAt && <Row label="Last confirmed" value={formatDate(site.lastConfirmedAt)} />}
      <Row
        label="Coordinates"
        value={<span className="font-mono text-xs">{formatCoords(site.latitude, site.longitude, 5)}</span>}
      />
      {site.sourceReportIds.length > 0 && (
        <Row label="Source reports" value={site.sourceReportIds.length} />
      )}
      {site.description && <p className="line-clamp-4 break-words border-t border-line pt-2 text-fg-muted">{site.description}</p>}
      <p className="border-t border-line pt-2">
        <Link href="/stakeholder" className="inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-hover">
          Open the site register
        </Link>
      </p>
    </>
  );
}
