'use client';

import { ExternalLink, MapPin, CheckCheck, X } from 'lucide-react';
import type { Report } from '@/lib/types';
import { WASTE_TYPE_LABELS, SOURCE_TYPE_LABELS, TIER_COLORS } from '@/lib/constants';

interface Props {
  report: Report;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading?: boolean;
}

export function ReportCard({ report, onApprove, onReject, loading }: Props) {
  const hasCoords = report.geocodedLatitude != null && report.geocodedLongitude != null;
  const confidence = report.confidenceScore ?? 0;
  const confidenceColor =
    confidence >= 0.7 ? TIER_COLORS.HIGH.hex :
    confidence >= 0.4 ? TIER_COLORS.MEDIUM.hex :
    TIER_COLORS.LOW.hex;

  return (
    <div className="border border-border bg-surface-1 text-xs">
      {/* Top bar: source + confidence */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-2">
        <div className="flex items-center gap-2 text-text-dim">
          <span>{SOURCE_TYPE_LABELS[report.sourceType]}</span>
          <span>·</span>
          <span>{new Date(report.scrapedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <span
          className="font-mono font-medium"
          style={{ color: confidenceColor }}
          title="Confidence score (0.0–1.0)"
        >
          {confidence.toFixed(2)}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-2">
        {/* Extracted location */}
        <div className="flex items-start gap-1.5">
          <MapPin size={12} className="mt-0.5 shrink-0 text-text-dim" />
          <div>
            <span className="text-text">{report.extractedLocationText ?? '—'}</span>
            {hasCoords && (
              <span className="ml-1.5 font-mono text-2xs text-text-dim">
                {report.geocodedLatitude!.toFixed(4)}, {report.geocodedLongitude!.toFixed(4)}
              </span>
            )}
            <span className="ml-1.5 text-2xs text-text-dim">
              [{report.geocodeStatus.replace('_', ' ').toLowerCase()}]
            </span>
          </div>
        </div>

        {/* Waste type + severity */}
        <div className="flex gap-3 text-text-secondary">
          {report.extractedWasteType && (
            <span>{WASTE_TYPE_LABELS[report.extractedWasteType]}</span>
          )}
          {report.extractedSeverity && (
            <span className="text-text-dim">severity: {report.extractedSeverity}</span>
          )}
        </div>

        {/* Raw text excerpt */}
        <p className="text-text-secondary line-clamp-3 leading-relaxed">
          {report.rawText.slice(0, 280)}
          {report.rawText.length > 280 ? '…' : ''}
        </p>

        {/* Source link */}
        {report.sourceUrl && (
          <a
            href={report.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-text-dim hover:text-text"
          >
            <ExternalLink size={11} />
            <span>Source</span>
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t border-border">
        <button
          onClick={() => onApprove(report.id)}
          disabled={loading}
          className="btn flex-1 justify-center border-tier-medium text-tier-medium
                     hover:bg-tier-medium hover:text-white disabled:opacity-40"
        >
          <CheckCheck size={12} />
          Approve
        </button>
        <button
          onClick={() => onReject(report.id)}
          disabled={loading}
          className="btn flex-1 justify-center border-border text-text-dim
                     hover:bg-surface-3 disabled:opacity-40"
        >
          <X size={12} />
          Reject
        </button>
      </div>
    </div>
  );
}
