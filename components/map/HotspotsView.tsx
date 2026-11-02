'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, MapPin } from 'lucide-react';
import { getAllWasteSites, getHotspots } from '@/lib/api';
import { RIVERS_STATE_CENTER, RIVERS_STATE_ZOOM } from '@/lib/constants';
import { formatDate, plural } from '@/lib/format';
import { mapStyleFor } from '@/lib/mapStyle';
import { useTheme } from '@/lib/theme';
import type { Hotspot } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import {
  CLICKABLE_LAYERS, DEFAULT_ENABLED, SEVERITY_LABELS, addAllLayers, applyVisibility, hotspotsToGeoJSON, placeFromFeature, setSourceData,
  severityOf, sitesToGeoJSON, type LayerId, type PlaceInfo,
} from './mapLayers';
import { SeverityLegend } from './MapTools';

const SWR = { revalidateOnFocus: false };
// Only the pins and the zones. Everything else lives on the full map.
const ONLY: Record<LayerId, boolean> = Object.fromEntries(
  (Object.keys(DEFAULT_ENABLED) as LayerId[]).map((k) => [k, k === 'dump-sites' || k === 'hotspots']),
) as Record<LayerId, boolean>;

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x = Math.sin(toRad(bLat - aLat) / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(toRad(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

function HotspotCard({ h }: { h: Hotspot }) {
  const { colors } = useTheme();
  const sev = severityOf(h.score);
  return (
    <li className="flex flex-col rounded-lg bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-fg">
          <MapPin size={16} aria-hidden="true" className="shrink-0" style={{ color: colors.severity[sev] }} />
          {h.communities[0] ?? 'Unnamed area'}
        </p>
        <Badge>{plural(h.siteCount, 'site')}</Badge>
      </div>
      <p className="mt-1 text-sm text-fg-muted">{h.lga ?? 'Area not known'} · {SEVERITY_LABELS[sev]} severity · rank {h.rank}</p>
      <p className="mt-2 text-sm text-fg-muted">{h.verifiedSiteCount} checked, {h.observationDays} days with records, last {formatDate(h.lastObservedAt)}</p>
      <p className="mt-2 flex flex-wrap gap-2">
        {h.recurring && <Badge tone="warning">Keeps coming back</Badge>}
        {h.hazardous && <Badge tone="danger">Hazardous waste</Badge>}
        {h.waterContact && <Badge tone="warning">Near or in water</Badge>}
      </p>
      <Link href={`/map?lat=${h.centre.latitude}&lng=${h.centre.longitude}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-hover">
        See it on the map<span className="sr-only">: {h.communities[0] ?? `hotspot ${h.rank}`}</span>
      </Link>
    </li>
  );
}

export function HotspotsView() {
  const { theme, colors } = useTheme();
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [picked, setPicked] = useState<PlaceInfo | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const hotspots = useSWR('hotspots-page', () => getHotspots({ minSites: 2 }), SWR);
  const sites = useSWR('hotspots-page-sites', () => getAllWasteSites({}), SWR);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    appliedTheme.current = theme;
    const map = new maplibregl.Map({
      container: containerRef.current, style: mapStyleFor(theme, 'streets'), center: RIVERS_STATE_CENTER, zoom: RIVERS_STATE_ZOOM - 0.5, attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('style.load', () => { addAllLayers(map, colorsRef.current); applyVisibility(map, ONLY); setEpoch((e) => e + 1); });
    map.on('click', (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: CLICKABLE_LAYERS.filter((id) => map.getLayer(id)) }).find((f) => f.layer.id === 'hotspots-fill');
      setPicked(hit ? placeFromFeature('hotspots-fill', hit.properties ?? {}) : null);
    });
    map.on('mouseenter', 'hotspots-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'hotspots-fill', () => { map.getCanvas().style.cursor = ''; });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; setEpoch(0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appliedTheme = useRef('');
  useEffect(() => {
    if (!mapRef.current || appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    // diff: false forces a full reload, so "style.load" fires and our layers are added back.
    mapRef.current.setStyle(mapStyleFor(theme, 'streets'), { diff: false });
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || epoch === 0 || !map.getSource('hotspots')) return;
    setSourceData(map, 'hotspots', hotspotsToGeoJSON(hotspots.data?.data ?? []));
    setSourceData(map, 'dump-sites', sitesToGeoJSON((sites.data ?? []).map((s) => ({
      id: s.id, latitude: s.latitude, longitude: s.longitude, confidenceTier: s.confidenceTier, risk: s.risk,
    })) as never));
  }, [epoch, hotspots.data, sites.data]);

  function locate() {
    setGeoMessage(null);
    if (!('geolocation' in navigator)) { setGeoMessage('This browser cannot find your position.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setMe(here);
        mapRef.current?.flyTo({ center: [here.lng, here.lat], zoom: 12, duration: 900 });
      },
      () => { setLocating(false); setGeoMessage('Your position could not be found. Location may be switched off for this site.'); },
      { enableHighAccuracy: false, timeout: 15_000 },
    );
  }

  const list = hotspots.data?.data ?? [];
  const zone = useMemo(() => {
    if (!me) return null;
    const near = (sites.data ?? []).filter((s) => distanceKm(me.lat, me.lng, s.latitude, s.longitude) <= 2);
    const closest = list.map((h) => ({ h, d: distanceKm(me.lat, me.lng, h.centre.latitude, h.centre.longitude) })).sort((a, b) => a.d - b.d)[0];
    return { near: near.length, closest };
  }, [me, sites.data, list]);

  return (
    <div className="space-y-6">
      <div className="relative h-96 overflow-hidden rounded-lg bg-panel shadow-raised sm:h-[32rem]">
        <div ref={containerRef} role="region" aria-label="Map of hotspots. Larger, darker zones have more sites." className="h-full w-full" />
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
          <Button onClick={locate} loading={locating} className="pointer-events-auto shadow-raised"><Crosshair size={16} aria-hidden="true" />Find my zone</Button>
          {geoMessage && <p role="status" className="pointer-events-auto max-w-xs rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning shadow-raised">{geoMessage}</p>}
        </div>
        <div className="pointer-events-none absolute bottom-8 right-3 z-10 hidden sm:block"><div className="pointer-events-auto"><SeverityLegend /></div></div>
        {picked && (
          <div className="absolute bottom-8 left-3 z-10 w-72 max-w-[calc(100%-1.5rem)] rounded-lg bg-panel p-4 shadow-overlay" role="dialog" aria-label={`Details: ${picked.title}`}>
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="text-base font-semibold text-fg">{picked.title}</h2><p className="text-sm text-fg-muted">{picked.subtitle}</p></div>
              <button type="button" className="btn-ghost -mr-2 -mt-2" onClick={() => setPicked(null)} aria-label="Close details">×</button>
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              {picked.rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-fg-muted">{k}</dt><dd className="text-right text-fg">{v}</dd></div>)}
            </dl>
          </div>
        )}
      </div>

      <section aria-labelledby="hs-list">
        <h2 id="hs-list" className="text-lg font-semibold text-fg">Zones, ranked</h2>
        <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">
          A zone is a group of sites close together. Colour shows the severity band and the size shows the number of sites. The score is a way to rank groups for attention and does not predict anything.
        </p>
        {hotspots.error ? <ErrorState message={hotspots.error.message} onRetry={() => hotspots.mutate()} /> : !hotspots.data ? (
          <div role="status" aria-label="Loading hotspots" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zone && (
              <li className="rounded-lg bg-accent-soft p-4">
                <p className="flex items-center gap-2 text-base font-semibold text-fg"><Crosshair size={16} aria-hidden="true" className="text-accent" />Your location zone</p>
                <p className="mt-1 text-sm text-fg-muted">{plural(zone.near, 'site')} within 2 km of you.</p>
                {zone.closest && (
                  <p className="mt-2 text-sm text-fg-muted">
                    Nearest hotspot: {zone.closest.h.communities[0] ?? 'unnamed area'}, {zone.closest.d.toFixed(1)} km away, {SEVERITY_LABELS[severityOf(zone.closest.h.score)].toLowerCase()} severity.
                  </p>
                )}
              </li>
            )}
            {list.slice(0, 11).map((h) => <HotspotCard key={h.rank} h={h} />)}
          </ul>
        )}
        {hotspots.data && list.length === 0 && (
          <EmptyState title="No hotspots yet" action={<Link href="/map" className="btn-secondary">Open the full map</Link>}>
            A hotspot needs at least two sites close together. As reports are checked and added, groups will appear here.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
