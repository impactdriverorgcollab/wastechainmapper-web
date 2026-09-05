'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
// @ts-ignore
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  getSites, getCollectionPoints, getFacilities,
  getWaterSources, getWaterAnomalies, getHeatmapData,
  getFloodZones, getFlowTimeline,
} from '@/lib/api';
import type {
  DumpSite, CollectionPoint, Facility, WaterSource, WaterAnomaly, HeatmapPoint,
  FloodZone, WasteFlow,
} from '@/lib/types';
import {
  TIER_COLORS, RIVERS_STATE_CENTER, RIVERS_STATE_ZOOM,
  FACILITY_TYPE_COLORS, WATER_ANOMALY_COLORS,
} from '@/lib/constants';
import { SitePopup } from './SitePopup';
import { LayerControl, DEFAULT_LAYERS, type LayerId, type LayerState } from './LayerControl';

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ??
  'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

function nearestCP(site: DumpSite, cps: CollectionPoint[]): CollectionPoint | null {
  if (!site.latitude || !site.longitude) return null;
  let best: CollectionPoint | null = null;
  let bestDist = Infinity;
  for (const cp of cps) {
    if (!cp.latitude || !cp.longitude) continue;
    const d = Math.hypot(cp.latitude - site.latitude!, cp.longitude - site.longitude!);
    if (d < bestDist) { bestDist = d; best = cp; }
  }
  return best;
}

export default function WasteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layersAddedRef = useRef(false);

  const [selectedSite, setSelectedSite] = useState<DumpSite | null>(null);
  const [hoveredCP, setHoveredCP] = useState<CollectionPoint | null>(null);
  const [layers, setLayers] = useState<LayerState[]>(DEFAULT_LAYERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sites, setSites] = useState<DumpSite[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [waterAnomalies, setWaterAnomalies] = useState<WaterAnomaly[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [floodZones, setFloodZones] = useState<FloodZone[]>([]);
  const [flowTimeline, setFlowTimeline] = useState<WasteFlow[]>([]);
  const [timelineIdx, setTimelineIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load all map data
  useEffect(() => {
    Promise.allSettled([
      getSites({ limit: '500' }),
      getCollectionPoints(),
      getFacilities({ isActive: 'true' }),
      getWaterSources(),
      getWaterAnomalies(true),
      getHeatmapData(),
      getFloodZones(),
      getFlowTimeline({ days: 30 }),
    ]).then(([s, cp, fac, ws, wa, hm, fz, ft]) => {
      if (s.status === 'fulfilled') setSites(s.value);
      else setError('Failed to load dump sites');
      if (cp.status === 'fulfilled') setCollectionPoints(cp.value);
      if (fac.status === 'fulfilled') setFacilities(fac.value);
      if (ws.status === 'fulfilled') setWaterSources(ws.value);
      if (wa.status === 'fulfilled') setWaterAnomalies(wa.value);
      if (hm.status === 'fulfilled') setHeatmapPoints(hm.value);
      if (fz.status === 'fulfilled') setFloodZones(fz.value);
      if (ft.status === 'fulfilled') { setFlowTimeline(ft.value); setTimelineIdx(ft.value.length); }
    }).finally(() => setLoading(false));
  }, []);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: RIVERS_STATE_CENTER,
      zoom: RIVERS_STATE_ZOOM,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; layersAddedRef.current = false; };
  }, []);

  // Timeline playback controller
  useEffect(() => {
    if (!isPlaying || flowTimeline.length === 0) return;
    if (timelineIdx >= flowTimeline.length) { setIsPlaying(false); return; }
    const t = setTimeout(() => setTimelineIdx((i) => i + 1), 600);
    return () => clearTimeout(t);
  }, [isPlaying, timelineIdx, flowTimeline.length]);

  // Add all layers once data is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sites.length === 0 || layersAddedRef.current) return;

    const addAll = () => {
      if (!map.isStyleLoaded()) { map.once('styledata', addAll); return; }
      layersAddedRef.current = true;

      // Flood zones (bottom — fill layer)
      if (floodZones.length > 0) addFloodZonesLayer(map, floodZones);

      // Flow lines (site → nearest collection point, static)
      if (collectionPoints.length > 0) addFlowLines(map, sites, collectionPoints);

      // Waste flow routes (animated via timeline — origin → destination facility)
      addWasteFlowRoutesLayer(map, []);

      // Collection points
      if (collectionPoints.length > 0) addCollectionPointLayer(map, collectionPoints, setHoveredCP);

      // Heatmap
      if (heatmapPoints.length > 0) addHeatmapLayer(map, heatmapPoints);

      // Facilities
      if (facilities.length > 0) addFacilitiesLayer(map, facilities);

      // Water sources
      if (waterSources.length > 0) addWaterSourcesLayer(map, waterSources);

      // Water anomalies
      if (waterAnomalies.length > 0) addWaterAnomaliesLayer(map, waterAnomalies);

      // Dump sites (top — rendered last so clickable above other layers)
      addDumpSiteLayer(map, sites, setSelectedSite);

      // Apply initial visibility from layer state
      applyLayerVisibility(map, DEFAULT_LAYERS);
    };

    if (map.loaded()) addAll();
    else map.on('load', addAll);
  }, [sites, collectionPoints, facilities, waterSources, waterAnomalies, heatmapPoints, floodZones]);

  // Sync waste flow routes with timeline scrubber position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('waste-flow-routes')) return;
    const visible = flowTimeline.slice(0, timelineIdx);
    (map.getSource('waste-flow-routes') as maplibregl.GeoJSONSource).setData(buildFlowRoutesGeoJSON(visible));
  }, [timelineIdx, flowTimeline]);

  // Toggle layer visibility
  const toggleLayer = useCallback((id: LayerId) => {
    setLayers((prev) => {
      const next = prev.map((l) => l.id === id ? { ...l, enabled: !l.enabled } : l);
      const map = mapRef.current;
      if (map && map.isStyleLoaded()) applyLayerVisibility(map, next);
      return next;
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-surface-1 border border-border px-3 py-1 text-xs text-text-secondary">
          Loading map data…
        </div>
      )}
      {error && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-surface-1 border border-tier-high px-3 py-1 text-xs text-tier-high">
          {error}
        </div>
      )}

      {selectedSite && (
        <SitePopup site={selectedSite} onClose={() => setSelectedSite(null)} />
      )}

      {hoveredCP && (
        <div className="absolute top-3 right-14 bg-surface-1 border border-border px-3 py-2 text-xs max-w-xs pointer-events-none">
          <p className="text-text font-medium">{hoveredCP.name}</p>
          <p className="text-text-secondary mt-0.5">{hoveredCP.operator}</p>
          <p className="text-text-dim mt-0.5">{hoveredCP.ward} · {hoveredCP.lga}</p>
          {hoveredCP.coverageRadiusM && (
            <p className="text-text-dim mt-0.5">Coverage: {(hoveredCP.coverageRadiusM / 1000).toFixed(1)} km</p>
          )}
        </div>
      )}

      {/* Layer toggle control — top-left, width-constrained on mobile */}
      <div className="absolute top-3 left-3 z-10 w-[170px] sm:w-[190px]">
        <LayerControl layers={layers} onToggle={toggleLayer} />
      </div>

      {/* Heatmap legend — shown only when heatmap layer is active */}
      {layers.find((l) => l.id === 'heatmap')?.enabled && (
        <div className="absolute bottom-14 right-3 z-10 bg-surface-1 border border-border px-3 py-2 text-xs w-[160px] sm:w-[180px]">
          <p className="section-header mb-2">Waste density</p>
          {/* Gradient bar matching the heatmap colour ramp */}
          <div
            className="h-2.5 w-full rounded-sm mb-1.5"
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(139,148,103,0.6) 20%, rgba(201,145,59,0.7) 40%, rgba(185,64,64,0.85) 70%, rgba(185,64,64,1) 100%)',
            }}
          />
          <div className="flex justify-between text-2xs text-text-dim">
            <span>Sparse</span>
            <span>Dense</span>
          </div>
          <p className="text-2xs text-text-dim mt-1.5 leading-tight">
            Weighted by site confidence tier
          </p>
        </div>
      )}

      {/* Timeline playback bar — full-width on mobile, centered on desktop */}
      {flowTimeline.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[380px] z-10 bg-surface-1 border border-border px-3 py-2 flex items-center gap-2 text-xs">
          <button
            onClick={() => { setTimelineIdx(0); setIsPlaying(true); }}
            className="btn text-2xs px-2 py-1 shrink-0"
          >
            ↺
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="btn text-2xs px-2 py-1 shrink-0"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
            <input
              type="range"
              min={0}
              max={flowTimeline.length}
              value={timelineIdx}
              onChange={(e) => { setIsPlaying(false); setTimelineIdx(Number(e.target.value)); }}
              className="w-full accent-[#B94040]"
            />
            <div className="flex justify-between text-2xs text-text-dim tabular-nums">
              <span>
                {timelineIdx > 0 && flowTimeline[timelineIdx - 1]
                  ? new Date(flowTimeline[timelineIdx - 1].createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                  : 'Start'}
              </span>
              <span style={{ color: '#f59e0b' }}>{timelineIdx}/{flowTimeline.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Layer visibility ──────────────────────────────────────────────────────────

const LAYER_MAP: Record<LayerId, string[]> = {
  'dump-sites':        ['sites-cluster', 'sites-cluster-count', 'sites-hit', 'sites-circle'],
  'heatmap':           ['heatmap-layer'],
  'flow-lines':        ['flow-lines', 'waste-flow-routes-line', 'waste-flow-routes-arrow'],
  'collection-points': ['cp-radius', 'cp-circle', 'cp-label'],
  'facilities':        ['facilities-circle', 'facilities-label'],
  'water-sources':     ['water-sources-circle', 'water-sources-label'],
  'water-anomalies':   ['water-anomalies-circle', 'water-anomalies-pulse'],
  'flood-zones':       ['flood-zones-fill', 'flood-zones-outline'],
};

function applyLayerVisibility(map: maplibregl.Map, layers: LayerState[]) {
  for (const layer of layers) {
    const visibility = layer.enabled ? 'visible' : 'none';
    for (const mapLayerId of LAYER_MAP[layer.id] ?? []) {
      if (map.getLayer(mapLayerId)) {
        map.setLayoutProperty(mapLayerId, 'visibility', visibility);
      }
    }
  }
}

// ── Dump sites layer ──────────────────────────────────────────────────────────

function buildSiteGeoJSON(sites: DumpSite[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sites
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.longitude!, s.latitude!] },
        properties: {
          id: s.id,
          confidenceTier: s.confidenceTier,
          color: TIER_COLORS[s.confidenceTier].hex,
          wasteType: s.wasteType,
          communityName: s.communityName,
          lga: s.lga,
          status: s.status,
          firstSeenAt: s.firstSeenAt,
        },
      })),
  };
}

function addDumpSiteLayer(map: maplibregl.Map, sites: DumpSite[], onSelect: (s: DumpSite | null) => void) {
  const SRC = 'dump-sites';
  if (map.getSource(SRC)) {
    (map.getSource(SRC) as maplibregl.GeoJSONSource).setData(buildSiteGeoJSON(sites));
    return;
  }
  map.addSource(SRC, { type: 'geojson', data: buildSiteGeoJSON(sites), cluster: true, clusterMaxZoom: 13, clusterRadius: 40 });

  map.addLayer({ id: 'sites-cluster', type: 'circle', source: SRC, filter: ['has', 'point_count'],
    paint: { 'circle-color': '#2a3347', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30], 'circle-stroke-width': 1, 'circle-stroke-color': '#4a5568' } });
  map.addLayer({ id: 'sites-cluster-count', type: 'symbol', source: SRC, filter: ['has', 'point_count'],
    layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 11, 'text-font': ['Open Sans Regular'] }, paint: { 'text-color': '#a0aec0' } });
  map.addLayer({ id: 'sites-hit', type: 'circle', source: SRC, filter: ['!', ['has', 'point_count']],
    paint: { 'circle-radius': 16, 'circle-color': 'transparent', 'circle-opacity': 0 } });
  map.addLayer({ id: 'sites-circle', type: 'circle', source: SRC, filter: ['!', ['has', 'point_count']],
    paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#0f1117', 'circle-opacity': 0.92 } });

  map.on('mouseenter', 'sites-hit', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const site = sites.find((s) => s.id === e.features?.[0]?.properties?.id);
    if (site) onSelect(site);
  });
  map.on('mouseleave', 'sites-hit', () => { map.getCanvas().style.cursor = ''; onSelect(null); });
  map.on('click', 'sites-cluster', (e) => {
    const feat = map.queryRenderedFeatures(e.point, { layers: ['sites-cluster'] });
    const cid = feat[0]?.properties?.cluster_id;
    if (!cid) return;
    (map.getSource(SRC) as maplibregl.GeoJSONSource).getClusterExpansionZoom(cid).then((zoom) => {
      if (zoom == null) return;
      map.easeTo({ center: (feat[0].geometry as any).coordinates, zoom });
    });
  });
  map.on('mouseenter', 'sites-cluster', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'sites-cluster', () => { map.getCanvas().style.cursor = ''; });
}

// ── Heatmap layer ─────────────────────────────────────────────────────────────

function addHeatmapLayer(map: maplibregl.Map, points: HeatmapPoint[]) {
  const SRC = 'heatmap-data';
  if (map.getSource(SRC)) return;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { weight: p.weight },
    })),
  };

  map.addSource(SRC, { type: 'geojson', data: geojson });
  map.addLayer({
    id: 'heatmap-layer',
    type: 'heatmap',
    source: SRC,
    maxzoom: 15,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,   'rgba(0,0,0,0)',
        0.2, 'rgba(139,148,103,0.6)',
        0.4, 'rgba(201,145,59,0.7)',
        0.7, 'rgba(185,64,64,0.85)',
        1,   'rgba(185,64,64,1)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 15, 40],
      'heatmap-opacity': 0.8,
    },
    layout: { visibility: 'none' }, // off by default; toggled via LayerControl
  });
}

// ── Collection points layer ───────────────────────────────────────────────────

function addCollectionPointLayer(map: maplibregl.Map, cps: CollectionPoint[], onHover: (cp: CollectionPoint | null) => void) {
  const SRC = 'collection-points';
  if (map.getSource(SRC)) return;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: cps.filter((c) => c.latitude != null && c.longitude != null).map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.longitude!, c.latitude!] },
      properties: { id: c.id, name: c.name, operator: c.operator, ward: c.ward, lga: c.lga, coverageRadiusM: c.coverageRadiusM },
    })),
  };

  map.addSource(SRC, { type: 'geojson', data: geojson });
  map.addLayer({ id: 'cp-radius', type: 'circle', source: SRC,
    paint: { 'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 10, 8, 13, 30, 15, 80], 'circle-color': '#22c55e', 'circle-opacity': 0.1, 'circle-stroke-width': 1, 'circle-stroke-color': '#22c55e', 'circle-stroke-opacity': 0.4 } });
  map.addLayer({ id: 'cp-circle', type: 'circle', source: SRC,
    paint: { 'circle-radius': 8, 'circle-color': '#22c55e', 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff' } });
  map.addLayer({ id: 'cp-label', type: 'symbol', source: SRC, minzoom: 12,
    layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-font': ['Open Sans Regular'] },
    paint: { 'text-color': '#22c55e', 'text-halo-color': '#0a0f1a', 'text-halo-width': 1 } });

  map.on('mouseenter', 'cp-circle', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const cp = cps.find((c) => c.id === e.features?.[0]?.properties?.id);
    if (cp) onHover(cp);
  });
  map.on('mouseleave', 'cp-circle', () => { map.getCanvas().style.cursor = ''; onHover(null); });
}

// ── Flow lines ────────────────────────────────────────────────────────────────

function addFlowLines(map: maplibregl.Map, sites: DumpSite[], cps: CollectionPoint[]) {
  const SRC = 'flow-lines';
  if (map.getSource(SRC)) return;

  const features: GeoJSON.Feature[] = sites
    .filter((s) => s.latitude != null && s.longitude != null)
    .flatMap((s) => {
      const cp = nearestCP(s, cps);
      if (!cp?.latitude || !cp?.longitude) return [];
      return [{ type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: [[s.longitude!, s.latitude!], [cp.longitude!, cp.latitude!]] },
        properties: { tier: s.confidenceTier } }];
    });

  map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features } });
  map.addLayer({ id: 'flow-lines', type: 'line', source: SRC,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#4a5568', 'line-width': 1, 'line-opacity': 0.7, 'line-dasharray': [3, 4] } });
}

// ── Facilities layer ──────────────────────────────────────────────────────────

function addFacilitiesLayer(map: maplibregl.Map, facilities: Facility[]) {
  const SRC = 'facilities';
  if (map.getSource(SRC)) return;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: facilities.filter((f) => f.latitude != null && f.longitude != null).map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.longitude!, f.latitude!] },
      properties: {
        id: f.id, name: f.name, facilityType: f.facilityType,
        color: FACILITY_TYPE_COLORS[f.facilityType],
        operator: f.operator, lga: f.lga,
      },
    })),
  };

  map.addSource(SRC, { type: 'geojson', data: geojson });
  map.addLayer({ id: 'facilities-circle', type: 'circle', source: SRC,
    paint: {
      'circle-radius': 10,
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0f1117',
      'circle-opacity': 0.9,
    } });
  map.addLayer({ id: 'facilities-label', type: 'symbol', source: SRC, minzoom: 11,
    layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-font': ['Open Sans Regular'] },
    paint: { 'text-color': '#e2e8f0', 'text-halo-color': '#0a0f1a', 'text-halo-width': 1 } });
}

// ── Water sources layer ───────────────────────────────────────────────────────

function addWaterSourcesLayer(map: maplibregl.Map, sources: WaterSource[]) {
  const SRC = 'water-sources';
  if (map.getSource(SRC)) return;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: sources.filter((s) => s.latitude != null && s.longitude != null).map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.longitude!, s.latitude!] },
      properties: { id: s.id, name: s.name, sourceType: s.sourceType, lga: s.lga },
    })),
  };

  map.addSource(SRC, { type: 'geojson', data: geojson });
  map.addLayer({ id: 'water-sources-circle', type: 'circle', source: SRC,
    paint: { 'circle-radius': 7, 'circle-color': '#60a5fa', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#0f1117' },
    layout: { visibility: 'none' } });
  map.addLayer({ id: 'water-sources-label', type: 'symbol', source: SRC, minzoom: 12,
    layout: { 'text-field': ['get', 'name'], 'text-size': 9, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-font': ['Open Sans Regular'], visibility: 'none' },
    paint: { 'text-color': '#60a5fa', 'text-halo-color': '#0a0f1a', 'text-halo-width': 1 } });
}

// ── Water anomalies layer ─────────────────────────────────────────────────────

function addWaterAnomaliesLayer(map: maplibregl.Map, anomalies: WaterAnomaly[]) {
  const SRC = 'water-anomalies';
  if (map.getSource(SRC)) return;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: anomalies.filter((a) => a.latitude != null && a.longitude != null).map((a) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.longitude!, a.latitude!] },
      properties: {
        id: a.id, anomalyType: a.anomalyType, severity: a.severity,
        color: WATER_ANOMALY_COLORS[a.anomalyType],
        description: a.description, detectedAt: a.detectedAt,
      },
    })),
  };

  map.addSource(SRC, { type: 'geojson', data: geojson });
  // Outer pulse ring
  map.addLayer({ id: 'water-anomalies-pulse', type: 'circle', source: SRC,
    paint: { 'circle-radius': 14, 'circle-color': ['get', 'color'], 'circle-opacity': 0.25, 'circle-stroke-width': 0 },
    layout: { visibility: 'none' } });
  map.addLayer({ id: 'water-anomalies-circle', type: 'circle', source: SRC,
    paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.95 },
    layout: { visibility: 'none' } });
}

// ── Waste flow routes (animated timeline) ────────────────────────────────────

const FLOW_STATUS_COLORS: Record<string, string> = {
  PENDING: '#6b7280', COLLECTED: '#22c55e',
  IN_TRANSIT: '#f59e0b', DELIVERED: '#3b82f6', PROCESSED: '#8b5cf6',
};

function buildFlowRoutesGeoJSON(flows: WasteFlow[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: flows
      .filter((f) => f.originLat != null && f.originLng != null && f.destinationFacility?.latitude != null)
      .map((f) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [f.originLng!, f.originLat!],
            [f.destinationFacility!.longitude!, f.destinationFacility!.latitude!],
          ],
        },
        properties: { status: f.status, color: FLOW_STATUS_COLORS[f.status] ?? '#6b7280', wasteType: f.wasteType },
      })),
  };
}

function addWasteFlowRoutesLayer(map: maplibregl.Map, flows: WasteFlow[]) {
  const SRC = 'waste-flow-routes';
  if (map.getSource(SRC)) return;

  map.addSource(SRC, { type: 'geojson', data: buildFlowRoutesGeoJSON(flows) });
  map.addLayer({
    id: 'waste-flow-routes-line',
    type: 'line',
    source: SRC,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2,
      'line-opacity': 0.85,
      'line-dasharray': [2, 3],
    },
  });
  // Arrow heads at destination
  map.addLayer({
    id: 'waste-flow-routes-arrow',
    type: 'circle',
    source: SRC,
    filter: ['!=', 'status', 'PENDING'],
    paint: {
      'circle-radius': 5,
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#0f1117',
      'circle-opacity': 0.9,
    },
  });
}

// ── Flood zones layer ─────────────────────────────────────────────────────────
// Flood zones have polygon boundaries stored in PostGIS. The API returns the
// zone metadata; the actual polygon geometry is fetched separately via GeoJSON
// export (not yet wired — placeholder circles represent centroids for now).

function addFloodZonesLayer(map: maplibregl.Map, zones: FloodZone[]) {
  const SRC = 'flood-zones';
  if (map.getSource(SRC)) return;

  const RISK_COLORS: Record<string, string> = {
    LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444',
  };

  // Placeholder: zones without boundary GeoJSON rendered as radius circles at LGA centroids.
  // Replace with actual polygon GeoJSON when boundary export endpoint is implemented.
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: zones.map((z) => ({
      type: 'Feature',
      geometry: {
        // Use Port Harcourt centre as fallback; real boundaries loaded via /flood-zones/{id}/geojson
        type: 'Point',
        coordinates: [7.0134, 4.8396],
      },
      properties: {
        id: z.id,
        name: z.name ?? 'Flood zone',
        riskLevel: z.riskLevel,
        color: RISK_COLORS[z.riskLevel] ?? '#f59e0b',
        lga: z.lga,
      },
    })),
  };

  map.addSource(SRC, { type: 'geojson', data: geojson });
  map.addLayer({ id: 'flood-zones-fill', type: 'circle', source: SRC,
    paint: {
      'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 9, 30, 12, 80],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.15,
    },
    layout: { visibility: 'none' } });
  map.addLayer({ id: 'flood-zones-outline', type: 'circle', source: SRC,
    paint: {
      'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 9, 30, 12, 80],
      'circle-color': 'transparent',
      'circle-stroke-width': 1.5,
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-opacity': 0.6,
    },
    layout: { visibility: 'none' } });
}
