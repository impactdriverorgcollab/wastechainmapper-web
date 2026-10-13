'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCheck, ExternalLink, MapPin, MapPinOff, ShieldCheck, X } from 'lucide-react';
import type { GazetteerEntry, Report } from '@/lib/types';
import { GEOCODE_STATUS_LABELS, SOURCE_TYPE_LABELS, WASTE_TYPE_LABELS } from '@/lib/constants';
import { NOT_RECORDED, formatCoords, formatDate, isWebUrl } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PlacePicker } from './PlacePicker';

export type ReviewAction = 'CORROBORATED' | 'FIELD_VERIFIED' | 'REJECTED';

interface Props {
  report: Report;
  busy?: boolean;
  /** Communities a reviewer can choose from for a story with no place. */
  places: GazetteerEntry[];
  onAction: (report: Report, action: ReviewAction) => void;
  onPlace: (report: Report, placeId: string) => Promise<void>;
}

function confidenceWord(score: number) {
  return score >= 0.7 ? 'High' : score >= 0.4 ? 'Medium' : 'Low';
}

function sentence(value: string | null) {
  if (!value || value === 'unknown') return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const PREVIEW_LENGTH = 320;

export function ReportCard({ report, busy = false, places, onAction, onPlace }: Props) {
  const [expanded, setExpanded] = useState(false);
  const score = report.confidenceScore ?? 0;
  const hasCoords = report.geocodedLatitude != null && report.geocodedLongitude != null;
  const isLong = report.rawText.length > PREVIEW_LENGTH;
  const text = expanded || !isLong ? report.rawText : `${report.rawText.slice(0, PREVIEW_LENGTH).trimEnd()}...`;
  const details = [
    report.extractedWasteType && report.extractedWasteType !== 'UNKNOWN' ? WASTE_TYPE_LABELS[report.extractedWasteType] : null,
    sentence(report.extractedSeverity) && `${sentence(report.extractedSeverity)} severity`,
    sentence(report.extractedUrgency) && `${sentence(report.extractedUrgency)} urgency`,
  ].filter(Boolean) as string[];

  return (
    <article className="flex flex-col rounded-lg bg-panel" aria-busy={busy || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <p className="text-sm text-fg-muted">
          {SOURCE_TYPE_LABELS[report.sourceType]} · {formatDate(report.scrapedAt)}
        </p>
        <div className="flex items-center gap-2" title="How sure the system is that this is a real incident at this place">
          <span className="text-sm text-fg-muted">Confidence</span>
          <span
            role="meter"
            aria-label="Confidence"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={score}
            aria-valuetext={`${confidenceWord(score)}, ${score.toFixed(2)}`}
            className="h-2 w-16 rounded-full bg-panel-3"
          >
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(score * 100)}%` }} />
          </span>
          <span className="tabular text-sm font-semibold text-fg">{score.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 px-4 py-3">
        <div className="flex items-start gap-2">
          {hasCoords ? (
            <MapPin size={16} className="mt-1 shrink-0 text-fg-muted" aria-hidden="true" />
          ) : (
            <MapPinOff size={16} className="mt-1 shrink-0 text-warning" aria-hidden="true" />
          )}
          <div>
            <p className="text-base font-semibold text-fg">{report.extractedLocationText ?? 'No place named'}</p>
            <p className="text-sm text-fg-muted">
              {GEOCODE_STATUS_LABELS[report.geocodeStatus]}
              {hasCoords && (
                <>
                  {' · '}
                  <span className="font-mono text-xs">{formatCoords(report.geocodedLatitude, report.geocodedLongitude)}</span>
                  {' · '}
                  <Link
                    href={`/map?lat=${report.geocodedLatitude}&lng=${report.geocodedLongitude}`}
                    className="text-accent underline underline-offset-2 hover:text-accent-hover"
                  >
                    Check on map
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        {!hasCoords && (
          <PlacePicker places={places} busy={busy} onPlace={(placeId) => onPlace(report, placeId)} />
        )}

        {details.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="What the report describes">
            {details.map((d) => <li key={d}><Badge>{d}</Badge></li>)}
          </ul>
        )}

        <div>
          <p className="whitespace-pre-line text-sm text-fg-muted">{text}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-accent-hover"
            >
              {expanded ? 'Show less' : 'Read the full text'}
            </button>
          )}
        </div>

        {isWebUrl(report.sourceUrl) ? (
          <a
            href={report.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Open the source article
            <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <p className="text-sm text-fg-subtle">{report.sourceType === 'WHATSAPP_CITIZEN' ? 'Sent by a citizen on WhatsApp' : NOT_RECORDED}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <Button variant="primary" className="col-span-2" onClick={() => onAction(report, 'CORROBORATED')} disabled={busy || !hasCoords}>
          <CheckCheck size={16} aria-hidden="true" />
          Corroborate
        </Button>
        {!hasCoords && (
          <p className="col-span-2 text-sm text-fg-muted">Place the story first, so the site can go on the map. You can reject it without a place.</p>
        )}
        <Button onClick={() => onAction(report, 'FIELD_VERIFIED')} disabled={busy || !hasCoords}>
          <ShieldCheck size={16} aria-hidden="true" />
          Field-verified
        </Button>
        <Button variant="danger" onClick={() => onAction(report, 'REJECTED')} disabled={busy}>
          <X size={16} aria-hidden="true" />
          Reject
        </Button>
      </div>
    </article>
  );
}
