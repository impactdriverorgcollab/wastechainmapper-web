'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { getWasteSites } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { ConfidenceTier } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';

type Ring = [number, number][];
interface Boundaries { features: { properties: { name: string }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Ring[] | Ring[][] } }[] }

// The plate covers the state with a small margin, in the same order a survey sheet gives its corners.
const WEST = 6.36, EAST = 7.64, SOUTH = 4.27, NORTH = 5.77;
const WIDTH = 600;
const KX = Math.cos((((NORTH + SOUTH) / 2) * Math.PI) / 180);
const SCALE = WIDTH / ((EAST - WEST) * KX);
const HEIGHT = Math.round((NORTH - SOUTH) * SCALE);
const project = (lng: number, lat: number) => [((lng - WEST) * KX * SCALE).toFixed(1), ((NORTH - lat) * SCALE).toFixed(1)];

/** 4.75 as 4°45′, the way a map sheet labels its edges. */
function dms(value: number, pos: string, neg: string) {
  const v = Math.abs(value);
  const deg = Math.floor(v);
  const min = Math.round((v - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}′${value >= 0 ? pos : neg}`;
}

const TIER_ORDER: ConfidenceTier[] = ['LOW', 'MEDIUM', 'HIGH'];
const TIER_FILL: Record<ConfidenceTier, string> = { LOW: 'fill-tier-low', MEDIUM: 'fill-tier-medium', HIGH: 'fill-tier-high' };
const KEY: { tier: ConfidenceTier; label: string }[] = [
  { tier: 'HIGH', label: 'Field-verified' },
  { tier: 'MEDIUM', label: 'Corroborated' },
  { tier: 'LOW', label: 'Reported, not yet checked' },
];

async function loadBoundaries(): Promise<Boundaries> {
  const res = await fetch('/data/lga-boundaries.geojson');
  if (!res.ok) throw new Error('The boundaries did not load.');
  return res.json();
}

/**
 * Rivers State drawn from our own boundary file, with every site on the map plotted where it is.
 * It is the real data at a glance, not an illustration, and it links to the full map.
 */
export function AtlasPlate() {
  const boundaries = useSWR('lga-boundaries', loadBoundaries, { revalidateOnFocus: false });
  const sites = useSWR('atlas-sites', () => getWasteSites({ limit: 1000 }), { revalidateOnFocus: false });

  const outlines = useMemo(() => (boundaries.data?.features ?? []).map((f) => {
    const polygons = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as Ring[][];
    const d = polygons.map((rings) => rings.map((ring) => `M${ring.map(([x, y]) => project(x, y).join(' ')).join('L')}Z`).join('')).join('');
    return { name: f.properties.name, d };
  }), [boundaries.data]);

  const points = useMemo(() => {
    const list = (sites.data?.data ?? []).filter((s) => s.latitude != null && s.longitude != null);
    return [...list].sort((a, b) => TIER_ORDER.indexOf(a.confidenceTier) - TIER_ORDER.indexOf(b.confidenceTier));
  }, [sites.data]);

  const counts = useMemo(() => Object.fromEntries(KEY.map((k) => [k.tier, points.filter((p) => p.confidenceTier === k.tier).length])), [points]);

  // Ticks every quarter degree along the frame.
  const ticks = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let lng = Math.ceil(WEST * 4) / 4; lng <= EAST; lng += 0.25) {
      const x = Number(project(lng, NORTH)[0]);
      out.push({ x1: x, y1: 0, x2: x, y2: 8 }, { x1: x, y1: HEIGHT - 8, x2: x, y2: HEIGHT });
    }
    for (let lat = Math.ceil(SOUTH * 4) / 4; lat <= NORTH; lat += 0.25) {
      const y = Number(project(WEST, lat)[1]);
      out.push({ x1: 0, y1: y, x2: 8, y2: y }, { x1: WIDTH - 8, y1: y, x2: WIDTH, y2: y });
    }
    return out;
  }, []);

  const label = sites.data
    ? `Map of the 23 local government areas of Rivers State with ${formatNumber(points.length)} waste sites: ${KEY.map((k) => `${counts[k.tier]} ${k.label.toLowerCase()}`).join(', ')}.`
    : 'Map of the 23 local government areas of Rivers State.';

  return (
    <figure className="w-full">
      <div className="relative">
        <p aria-hidden="true" className="mb-1 flex justify-between font-mono text-xs text-fg-subtle">
          <span>{dms(NORTH, 'N', 'S')} {dms(WEST, 'E', 'W')}</span>
          <span>Rivers State</span>
        </p>
        <Link href="/map" className="block rounded focus-visible:outline-offset-4" aria-label={`${label} Open the full map.`}>
          {boundaries.error ? (
            <div className="flex aspect-[4/5] items-center justify-center border border-line-strong bg-panel px-6 text-center text-sm text-fg-muted">
              The outline of the state did not load. The full map still works.
            </div>
          ) : !boundaries.data ? (
            <Skeleton className="aspect-[4/5] w-full" />
          ) : (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full border border-line-strong bg-panel" role="img" aria-hidden="true" focusable="false">
              <g className="fill-panel-3 stroke-line-strong" strokeWidth="0.8" strokeLinejoin="round">
                {outlines.map((o) => <path key={o.name} d={o.d}><title>{o.name}</title></path>)}
              </g>
              <g className="stroke-fg-subtle" strokeWidth="1">
                {ticks.map((t, i) => <line key={i} {...t} />)}
              </g>
              <g className="stroke-fg" strokeWidth="0.9">
                {points.map((p) => {
                  const [x, y] = project(p.longitude!, p.latitude!);
                  return <circle key={p.id} cx={x} cy={y} r={p.confidenceTier === 'LOW' ? 3.2 : 4.2} className={TIER_FILL[p.confidenceTier]} />;
                })}
              </g>
            </svg>
          )}
        </Link>
        <p aria-hidden="true" className="mt-1 flex justify-between font-mono text-xs text-fg-subtle">
          <span>23 local government areas</span>
          <span>{dms(SOUTH, 'N', 'S')} {dms(EAST, 'E', 'W')}</span>
        </p>
      </div>
      <figcaption className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <ul className="flex flex-col gap-1 text-sm text-fg-muted">
          {KEY.map((k) => (
            <li key={k.tier} className="flex items-center gap-2">
              <svg width="10" height="10" aria-hidden="true" focusable="false"><circle cx="5" cy="5" r="4" className={TIER_FILL[k.tier]} /></svg>
              <span>{k.label}</span>
              <span className="tabular font-mono text-fg">{sites.data ? formatNumber(counts[k.tier]) : '...'}</span>
            </li>
          ))}
        </ul>
        <Link href="/map" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover">
          Open the full map <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </figcaption>
      {sites.error && <p className="mt-2 text-sm text-fg-muted">The sites did not load, so only the outline is shown.</p>}
    </figure>
  );
}
