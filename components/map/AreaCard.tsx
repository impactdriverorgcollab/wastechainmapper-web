'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import {
  FLOOD_RISK_LABELS, PROXIMITY_NOTICE, REFERENCE_KIND_LABELS, TIER_INFO, WASTE_CATEGORY_INFO,
} from '@/lib/constants';
import { formatNumber, plural } from '@/lib/format';
import type { AreaCheck } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';

const RADII = [250, 500, 1000, 2000];

interface Props {
  state: { centre: { lat: number; lng: number }; radiusM: number; result?: AreaCheck; error?: string; loading: boolean } | null;
  picking: boolean;
  onRadius: (m: number) => void;
  onClose: () => void;
}

/** Answers "what is near here?" for any point the user taps: sites, waterways, drains, schools, clinics, flood zones. */
export function AreaCard({ state, picking, onRadius, onClose }: Props) {
  const tiers = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  state?.result?.sites.forEach((s) => { tiers[s.confidenceTier]++; });

  return (
    <div role="dialog" aria-label="Check an area" className="rounded-lg bg-panel-2 shadow-overlay sm:w-80">
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div>
          <h2 className="text-base font-semibold text-fg">Check an area</h2>
          <p className="text-sm text-fg-muted">{picking && !state ? 'Tap the map to choose the centre.' : 'What is within reach of the point you tapped.'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close area check" className="btn-ghost -mr-2 -mt-2 shrink-0">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {state && (
        <div className="space-y-3 px-4 pb-4 text-sm">
          <div>
            <label htmlFor="area-radius" className="label">Distance from the point</label>
            <select id="area-radius" className="input" value={state.radiusM} onChange={(e) => onRadius(Number(e.target.value))}>
              {RADII.map((r) => <option key={r} value={r}>{r >= 1000 ? `${r / 1000} km` : `${r} m`}</option>)}
            </select>
          </div>

          {state.loading && <div role="status" aria-label="Checking the area"><Skeleton className="h-24 w-full" /></div>}
          {state.error && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-danger">{state.error}</p>}

          {state.result && (
            <>
              <section aria-label="Waste sites in the area">
                <p className="font-semibold text-fg">{plural(state.result.sites.length, 'waste site')} within {formatNumber(state.radiusM)} m</p>
                {state.result.sites.length > 0 && (
                  <>
                    <p className="text-fg-muted">
                      {tiers.HIGH} {TIER_INFO.HIGH.label.toLowerCase()}, {tiers.MEDIUM} {TIER_INFO.MEDIUM.label.toLowerCase()}, {tiers.LOW} {TIER_INFO.LOW.label.toLowerCase()}.
                    </p>
                    <ul className="mt-1 max-h-24 space-y-1 overflow-hidden">
                      {state.result.sites.slice(0, 4).map((s) => (
                        <li key={s.id}>
                          <Link href={`/sites/${s.id}`} className="text-accent hover:text-accent-hover">
                            {s.communityName ?? 'Unnamed location'}
                          </Link>
                          <span className="text-fg-muted">, {WASTE_CATEGORY_INFO[s.category].label.toLowerCase()}, {formatNumber(s.distanceM ?? 0)} m</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section aria-label="Nearest features">
                <p className="font-semibold text-fg">Nearest to the point</p>
                {state.result.nearest.length === 0 ? (
                  <p className="text-fg-muted">No waterways, drains, schools or health facilities are loaded within 10 km.</p>
                ) : (
                  <ul className="space-y-1">
                    {state.result.nearest.map((n) => (
                      <li key={n.kind} className="flex justify-between gap-3">
                        <span className="text-fg-muted">{REFERENCE_KIND_LABELS[n.kind as keyof typeof REFERENCE_KIND_LABELS] ?? n.kind}{n.name ? `, ${n.name}` : ''}</span>
                        <span className="tabular shrink-0 text-fg">{formatNumber(n.distanceM)} m</span>
                      </li>
                    ))}
                  </ul>
                )}
                {state.result.floodZones.map((z, i) => (
                  <p key={i} className="mt-1 text-fg-muted">
                    {z.inside ? 'Inside' : `${formatNumber(z.distanceM)} m from`} a {FLOOD_RISK_LABELS[z.riskLevel].toLowerCase()} flood zone{z.name ? ` (${z.name})` : ''}.
                  </p>
                ))}
                {state.result.collectionPoints[0] && (
                  <p className="mt-1 text-fg-muted">
                    Nearest collection point: {state.result.collectionPoints[0].name}, {formatNumber(state.result.collectionPoints[0].distanceM)} m
                    {state.result.collectionPoints[0].official ? ' (official)' : ''}.
                  </p>
                )}
              </section>

              <p className="border-t border-line pt-2 text-xs text-fg-subtle">{PROXIMITY_NOTICE}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
