'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  getAllSites, getCollectionPoints, getFacilities, getFloodZoneGeoJson, getFloodZones,
  getFlowTimeline, getHeatmapData, getWaterAnomalies, getWaterSources,
} from '@/lib/api';
import { RIVERS_STATE_CENTER, RIVERS_STATE_ZOOM } from '@/lib/constants';
import type { DumpSite } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { DetailsCard, type Selection } from './DetailsCard';
import { LayerPanel } from './LayerPanel';
import { TimelineBar } from './TimelineBar';
import {
  CLICKABLE_LAYERS, DEFAULT_ENABLED, addAllLayers, applyVisibility, collectionPointsToGeoJSON, facilitiesToGeoJSON,
  floodZonesToGeoJSON, flowRoutesToGeoJSON, heatmapToGeoJSON, nearestLinesToGeoJSON, placeFromFeature, setSourceData,
  sitesToGeoJSON, waterAnomaliesToGeoJSON, waterSourcesToGeoJSON, type LayerId,
} from './mapLayers';

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

const SWR = { revalidateOnFocus: false };
const PLAYBACK_STEP_MS = 600;

/** Optional deep link from the tables: /map?lat=..&lng=..&site=<id> */
function readDeepLink() {
  const p = new URLSearchParams(window.location.search);
  const lat = Number(p.get('lat'));
  const lng = Number(p.get('lng'));
  return {
    center: Number.isFinite(lat) && Number.isFinite(lng) && p.get('lat') && p.get('lng') ? ([lng, lat] as [number, number]) : null,
    siteId: p.get('site'),
  };
}

export default function WasteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>(DEFAULT_ENABLED);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [timelineIdx, setTimelineIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Each dataset loads on its own, so one failing never blanks the rest of the map.
  const sites = useSWR('map-sites', () => getAllSites(), SWR);
  const collectionPoints = useSWR('collection-points', getCollectionPoints, SWR);
  const facilities = useSWR('facilities-active', () => getFacilities({ isActive: 'true' }), SWR);
  const waterSources = useSWR('water-sources', () => getWaterSources(), SWR);
  const waterAnomalies = useSWR('water-anomalies-open', () => getWaterAnomalies(true), SWR);
  const heatmap = useSWR('heatmap', () => getHeatmapData(), SWR);
  const floodZones = useSWR('flood-zones', () => getFloodZones(), SWR);
  const flows = useSWR('flow-timeline-30', () => getFlowTimeline({ days: 30 }), SWR);

  const zones = floodZones.data;
  const floodGeo = useSWR(
    zones && zones.length > 0 ? ['flood-geojson', zones.map((z) => z.id).join(',')] : null,
    async () => {
      const results = await Promise.allSettled(zones!.map((z) => getFloodZoneGeoJson(z.id)));
      return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
    },
    SWR,
  );

  // Latest values for the click handlers, which are registered once.
  const sitesById = useRef(new Map<string, DumpSite>());
  const pendingSiteId = useRef<string | null>(null);

  // ── Create the map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const link = readDeepLink();
    pendingSiteId.current = link.siteId;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: link.center ?? RIVERS_STATE_CENTER,
      zoom: link.center ? 14 : RIVERS_STATE_ZOOM,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      addAllLayers(map);

      map.on('click', (e) => {
        const hit = map.queryRenderedFeatures(e.point, { layers: CLICKABLE_LAYERS.filter((id) => map.getLayer(id)) })[0];
        if (!hit) {
          // A click on a cluster zooms in. A click on empty map closes the card.
          const cluster = map.queryRenderedFeatures(e.point, { layers: ['sites-cluster'] })[0];
          if (cluster) {
            const src = map.getSource('dump-sites') as maplibregl.GeoJSONSource;
            src.getClusterExpansionZoom(cluster.properties?.cluster_id).then((zoom) => {
              map.easeTo({ center: (cluster.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
            });
          } else {
            setSelection(null);
          }
          return;
        }
        if (hit.layer.id === 'sites-circle') {
          const site = sitesById.current.get(String(hit.properties?.id));
          if (site) setSelection({ kind: 'site', site });
          return;
        }
        const place = placeFromFeature(hit.layer.id, hit.properties ?? {});
        if (place) setSelection({ kind: 'place', place });
      });

      // Pointer cursor over anything that can be clicked.
      for (const id of [...CLICKABLE_LAYERS, 'sites-cluster']) {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
      }

      applyVisibility(map, DEFAULT_ENABLED);
      setReady(true);
    });

    // Before the style has loaded, an error almost always means the map key or style address is wrong.
    map.on('error', (e) => {
      if (!map.isStyleLoaded() && !mapRef.current?.loaded()) {
        console.error('Map error', e.error);
        setMapError('The map background could not load. Check your connection. If it keeps failing, the map key may be missing or expired.');
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; setReady(false); };
  }, []);

  // ── Push each dataset into its source whenever it arrives or changes ───────
  const withMap = useCallback((fn: (map: maplibregl.Map) => void) => {
    const map = mapRef.current;
    if (map && ready) fn(map);
  }, [ready]);

  useEffect(() => {
    withMap((map) => setSourceData(map, 'dump-sites', sitesToGeoJSON(sites.data ?? [])));
    sitesById.current = new Map((sites.data ?? []).map((s) => [s.id, s]));
    // Open the site named in a deep link once the sites are in.
    if (pendingSiteId.current && sites.data) {
      const site = sitesById.current.get(pendingSiteId.current);
      if (site) setSelection({ kind: 'site', site });
      pendingSiteId.current = null;
    }
  }, [withMap, sites.data]);

  useEffect(() => { withMap((m) => setSourceData(m, 'collection-points', collectionPointsToGeoJSON(collectionPoints.data ?? []))); }, [withMap, collectionPoints.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'facilities', facilitiesToGeoJSON(facilities.data ?? []))); }, [withMap, facilities.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'water-sources', waterSourcesToGeoJSON(waterSources.data ?? []))); }, [withMap, waterSources.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'water-anomalies', waterAnomaliesToGeoJSON(waterAnomalies.data ?? []))); }, [withMap, waterAnomalies.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'heatmap-data', heatmapToGeoJSON(heatmap.data ?? []))); }, [withMap, heatmap.data]);
  useEffect(() => {
    withMap((m) => setSourceData(m, 'flood-zones', floodZonesToGeoJSON(zones ?? [], floodGeo.data ?? [])));
  }, [withMap, zones, floodGeo.data]);
  useEffect(() => {
    withMap((m) => setSourceData(m, 'nearest-lines', enabled['nearest-lines']
      ? nearestLinesToGeoJSON(sites.data ?? [], collectionPoints.data ?? [])
      : { type: 'FeatureCollection', features: [] }));
  }, [withMap, enabled, sites.data, collectionPoints.data]);

  // Show every recorded flow when the data first arrives. This also fixes the routes that
  // never appeared until the slider was touched.
  const flowList = flows.data;
  useEffect(() => { if (flowList) setTimelineIdx(flowList.length); }, [flowList]);
  useEffect(() => {
    withMap((m) => setSourceData(m, 'waste-routes', flowRoutesToGeoJSON((flowList ?? []).slice(0, timelineIdx))));
  }, [withMap, flowList, timelineIdx]);

  // Playback
  useEffect(() => {
    if (!playing || !flowList) return;
    if (timelineIdx >= flowList.length) { setPlaying(false); return; }
    const t = setTimeout(() => setTimelineIdx((i) => i + 1), PLAYBACK_STEP_MS);
    return () => clearTimeout(t);
  }, [playing, timelineIdx, flowList]);

  // Layer switches
  useEffect(() => { withMap((m) => applyVisibility(m, enabled)); }, [withMap, enabled]);
  const toggleLayer = useCallback((id: LayerId) => setEnabled((prev) => ({ ...prev, [id]: !prev[id] })), []);

  // ── Status shown over the map ──────────────────────────────────────────────
  const failed = useMemo(() => {
    const checks: [string, boolean][] = [
      ['collection points', !!collectionPoints.error], ['facilities', !!facilities.error],
      ['water sources', !!waterSources.error], ['water problems', !!waterAnomalies.error],
      ['density', !!heatmap.error], ['flood zones', !!floodZones.error], ['waste routes', !!flows.error],
    ];
    return checks.filter(([, bad]) => bad).map(([name]) => name);
  }, [collectionPoints.error, facilities.error, waterSources.error, waterAnomalies.error, heatmap.error, floodZones.error, flows.error]);

  const loading = !mapError && (!ready || sites.isLoading);

  const counts: Partial<Record<LayerId, number>> = {
    'dump-sites': sites.data?.length,
    'collection-points': collectionPoints.data?.length,
    facilities: facilities.data?.length,
    'water-sources': waterSources.data?.length,
    'water-anomalies': waterAnomalies.data?.length,
  };

  function retryAll() {
    for (const q of [sites, collectionPoints, facilities, waterSources, waterAnomalies, heatmap, floodZones, flows]) {
      if (q.error) void q.mutate();
    }
  }

  const hasTimeline = (flowList?.length ?? 0) > 0;
  const bannerText = sites.error
    ? `The dump sites did not load. ${sites.error.message}`
    : failed.length > 0 ? `Some layers did not load: ${failed.join(', ')}.` : null;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} role="region" aria-label="Map of dump sites and waste infrastructure" className="h-full w-full" />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col items-start gap-3">
        <div className="pointer-events-auto max-w-full">
          <LayerPanel enabled={enabled} counts={counts} onToggle={toggleLayer} />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-16 z-0 flex justify-center">
        {loading && (
          <p role="status" className="rounded-lg bg-panel px-4 py-2 text-sm text-fg-muted shadow-raised">Loading the map</p>
        )}
      </div>

      {(mapError || bannerText) && (
        <div role="alert" className="absolute inset-x-3 top-16 z-10 flex flex-col gap-3 rounded-lg bg-danger-soft p-4 shadow-raised md:left-auto md:right-16 md:top-3 md:w-80">
          <p className="text-sm text-fg">{mapError ?? bannerText}</p>
          <div>
            <Button onClick={() => (mapError ? window.location.reload() : retryAll())}>
              {mapError ? 'Reload the page' : 'Try again'}
            </Button>
          </div>
        </div>
      )}

      {/* Both sit above the map attribution, which must stay readable. */}
      <div className={`pointer-events-none absolute inset-x-3 z-20 flex flex-col items-start gap-3 sm:items-end ${hasTimeline ? 'bottom-28' : 'bottom-10'}`}>
        {selection && (
          <div className="pointer-events-auto w-full sm:w-auto">
            <DetailsCard selection={selection} onClose={() => setSelection(null)} />
          </div>
        )}
      </div>

      {hasTimeline && flowList && (
        <div className="absolute inset-x-3 bottom-10 z-10 mx-auto max-w-xl">
          <TimelineBar
            flows={flowList}
            index={timelineIdx}
            playing={playing}
            onIndexChange={setTimelineIdx}
            onPlayingChange={setPlaying}
          />
        </div>
      )}
    </div>
  );
}
