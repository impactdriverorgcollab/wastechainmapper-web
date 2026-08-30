'use client';

import { X, ExternalLink } from 'lucide-react';
import type { DumpSite } from '@/lib/types';
import { TIER_COLORS, WASTE_TYPE_LABELS } from '@/lib/constants';

interface Props {
  site: DumpSite;
  onClose: () => void;
}

export function SitePopup({ site, onClose }: Props) {
  const tier = TIER_COLORS[site.confidenceTier];

  return (
    <div
      className="absolute bottom-16 left-4 z-20 w-72 bg-surface-2 border border-border text-text shadow-xl"
      style={{ borderLeft: `3px solid ${tier.hex}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2 border-b border-border">
        <div>
          <p className="text-xs font-semibold text-text leading-tight">
            {site.communityName ?? 'Unknown location'}
          </p>
          {(site.ward || site.lga) && (
            <p className="text-2xs text-text-dim mt-0.5">
              {[site.ward, site.lga].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-text-dim hover:text-text ml-2 mt-0.5">
          <X size={14} />
        </button>
      </div>

      {/* Data rows */}
      <div className="px-3 py-2 space-y-1.5 text-xs">
        <Row label="Status" value={site.status} />
        <Row label="Waste type" value={WASTE_TYPE_LABELS[site.wasteType]} />
        <Row
          label="Confidence"
          value={
            <span style={{ color: tier.hex }} className="font-medium">
              {tier.label}
            </span>
          }
        />
        <Row label="First seen" value={formatDate(site.firstSeenAt)} />
        {site.lastConfirmedAt && (
          <Row label="Last confirmed" value={formatDate(site.lastConfirmedAt)} />
        )}
        {site.latitude && site.longitude && (
          <Row
            label="Coordinates"
            value={
              <span className="font-mono text-2xs text-text-secondary">
                {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}
              </span>
            }
          />
        )}
      </div>

      {/* Description */}
      {site.description && (
        <div className="px-3 pb-2 text-xs text-text-secondary border-t border-border pt-2">
          {site.description}
        </div>
      )}

      {/* Source count */}
      {site.sourceReportIds.length > 0 && (
        <div className="px-3 pb-3 text-2xs text-text-dim">
          {site.sourceReportIds.length} source report{site.sourceReportIds.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-text-dim shrink-0">{label}</span>
      <span className="text-text text-right">{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
