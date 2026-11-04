import maplibregl from 'maplibre-gl';
import type {
  AreaMention, CollectionPoint, DumpSite, Facility, FloodZone, HeatmapPoint, Hotspot, WasteFlow, WaterAnomaly, WaterSource,
} from '@/lib/types';
import {
  FACILITY_TYPE_COLORS, FACILITY_TYPE_LABELS, FLOOD_RISK_COLORS, FLOOD_RISK_LABELS, FLOW_STATUS_COLORS,
  WATER_ANOMALY_COLORS, WATER_ANOMALY_LABELS, WATER_SOURCE_LABELS,
} from '@/lib/constants';
import { dataColors, type Theme } from '@/lib/palette';
import { registerPins } from './pins';

export type LayerId =
  | 'dump-sites'
  | 'hotspots'
  | 'area-mentions'
  | 'heatmap'
  | 'collection-points'
  | 'facilities'
  | 'waste-routes'
  | 'nearest-lines'
  | 'water-sources'
  | 'water-anomalies'
  | 'flood-zones'
  | 'lga'
  | 'waterways'
  | 'drains'
  | 'schools'
  | 'health'
  | 'data-gaps'
  // Where the waste is. These switch groups of sites on and off rather than drawing anything themselves.
  | 'setting-land'
  | 'setting-drain'
  | 'setting-waterway'
  | 'setting-coastal'
  | 'setting-disposal'
  | 'sewage';

export const SETTING_LAYERS = {
  LAND: 'setting-land', DRAIN: 'setting-drain', WATERWAY: 'setting-waterway', COASTAL: 'setting-coastal', DISPOSAL_FACILITY: 'setting-disposal',
} as const;

/** Which map layers each switch in the panel controls. */
export const LAYER_MAP: Record<LayerId, string[]> = {
  'dump-sites': ['sites-cluster', 'sites-cluster-count', 'sites-pin'],
  hotspots: ['hotspots-fill', 'hotspots-ring'],
  'area-mentions': ['area-fill', 'area-line', 'area-label'],
  heatmap: ['heatmap-layer'],
  'collection-points': ['cp-radius', 'cp-circle', 'cp-label'],
  facilities: ['facilities-circle', 'facilities-label'],
  'waste-routes': ['waste-routes-line', 'waste-routes-end'],
  'nearest-lines': ['nearest-lines'],
  'water-sources': ['water-sources-circle', 'water-sources-label'],
  'water-anomalies': ['water-anomalies-halo', 'water-anomalies-circle'],
  'flood-zones': ['flood-zones-fill', 'flood-zones-line'],
  lga: ['lga-fill', 'lga-line', 'lga-label'],
  waterways: ['ref-waterways-line'],
  drains: ['ref-drains-line'],
  schools: ['ref-schools-circle'],
  health: ['ref-health-circle'],
  'data-gaps': ['gaps-fill', 'gaps-line'],
  'setting-land': [], 'setting-drain': [], 'setting-waterway': [], 'setting-coastal': [], 'setting-disposal': [], sewage: [],
};

export const DEFAULT_ENABLED: Record<LayerId, boolean> = {
  'dump-sites': true,
  hotspots: true,
  'area-mentions': true,
  heatmap: false,
  'collection-points': true,
  facilities: true,
  'waste-routes': true,
  'nearest-lines': false,
  'water-sources': false,
  'water-anomalies': false,
  'flood-zones': false,
  lga: false,
  waterways: false,
  drains: false,
  schools: false,
  health: false,
  'data-gaps': false,
  'setting-land': true, 'setting-drain': true, 'setting-waterway': true, 'setting-coastal': true, 'setting-disposal': true, sewage: true,
};

/** A short description of the thing a user clicked, for the details card. */
export interface PlaceInfo {
  title: string;
  subtitle?: string;
  rows: [label: string, value: string][];
  /** Links shown under the rows, such as the stories behind an area count. */
  links?: { label: string; href: string }[];
  /** One plain sentence under the rows, to stop the figures being misread. */
  note?: string;
}

// ── Hotspot severity ──────────────────────────────────────────────────────────

export const SEVERITY_LABELS = ['Low', 'Moderate', 'Elevated', 'High'] as const;
/** The lowest score of each band. The score adds site count, days with records, recurrence, hazard, water contact and volume. */
export const SEVERITY_FROM = [0, 3, 5, 8] as const;

export function severityOf(score: number): 0 | 1 | 2 | 3 {
  return score >= SEVERITY_FROM[3] ? 3 : score >= SEVERITY_FROM[2] ? 2 : score >= SEVERITY_FROM[1] ? 1 : 0;
}

// ── GeoJSON builders ──────────────────────────────────────────────────────────

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function point(lng: number, lat: number, properties: Record<string, unknown>): GeoJSON.Feature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties };
}

export function sitesToGeoJSON(sites: DumpSite[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sites
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => point(s.longitude!, s.latitude!, { id: s.id, confidenceTier: s.confidenceTier, risk: s.risk ?? 'normal' })),
  };
}

export function hotspotsToGeoJSON(items: Hotspot[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items.map((h) => point(h.centre.longitude, h.centre.latitude, {
      rank: h.rank, siteCount: h.siteCount, observationCount: h.observationCount, observationDays: h.observationDays,
      score: h.score, severity: severityOf(h.score), recurring: h.recurring, hazardous: h.hazardous, waterContact: h.waterContact,
      title: h.communities[0] ?? 'Unnamed area', lga: h.lga, lastObservedAt: h.lastObservedAt, verified: h.verifiedSiteCount,
    })),
  };
}

/** The area outlines that have stories, each carrying its count and latest headlines. */
export function areaMentionsToGeoJSON(areas: GeoJSON.FeatureCollection | undefined, rows: AreaMention[]): GeoJSON.FeatureCollection {
  const out: GeoJSON.Feature[] = [];
  for (const f of areas?.features ?? []) {
    const row = rows.find((r) => r.lga === f.properties?.name);
    if (!row) continue;
    out.push({
      ...f,
      properties: {
        lga: row.lga, stories: row.stories, latestAt: row.latestAt,
        label: `${row.stories} ${row.stories === 1 ? 'story' : 'stories'}`,
        // Map properties must be plain values, so the list travels as text.
        recent: JSON.stringify(row.recent),
      },
    });
  }
  return { type: 'FeatureCollection', features: out };
}

export function collectionPointsToGeoJSON(items: CollectionPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => point(c.longitude!, c.latitude!, {
        id: c.id, name: c.name, operator: c.operator, ward: c.ward, lga: c.lga, coverageRadiusM: c.coverageRadiusM,
        isOfficial: c.isOfficial ?? false, verification: c.verificationStatus ?? 'UNVERIFIED', schedule: c.schedule ?? null,
      })),
  };
}

export function facilitiesToGeoJSON(items: Facility[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((f) => f.latitude != null && f.longitude != null)
      .map((f) => point(f.longitude!, f.latitude!, {
        id: f.id, name: f.name, facilityType: f.facilityType, color: FACILITY_TYPE_COLORS[f.facilityType],
        operator: f.operator, lga: f.lga, capacityTpd: f.capacityTpd,
      })),
  };
}

export function waterSourcesToGeoJSON(items: WaterSource[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => point(s.longitude!, s.latitude!, {
        id: s.id, name: s.name, sourceType: s.sourceType, operator: s.operator, lga: s.lga,
        condition: s.condition ?? null, technology: s.technology ?? null, surveyedAt: s.surveyedAt ?? null,
        populationServed: s.populationServed ?? null, dataSource: s.dataSource ?? null,
      })),
  };
}

export function waterAnomaliesToGeoJSON(items: WaterAnomaly[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((a) => a.latitude != null && a.longitude != null)
      .map((a) => point(a.longitude!, a.latitude!, {
        id: a.id, anomalyType: a.anomalyType, color: WATER_ANOMALY_COLORS[a.anomalyType],
        severity: a.severity, description: a.description, detectedAt: a.detectedAt,
      })),
  };
}

export function heatmapToGeoJSON(items: HeatmapPoint[]): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: items.map((p) => point(p.lng, p.lat, { weight: p.weight })) };
}

/** Density from the sites currently shown, so it follows the filters and the history slider. */
export function heatFromSites(sites: DumpSite[]): GeoJSON.FeatureCollection {
  return heatmapToGeoJSON(
    sites
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        lat: s.latitude!, lng: s.longitude!, wasteType: s.wasteType,
        weight: s.confidenceTier === 'HIGH' ? 1 : s.confidenceTier === 'MEDIUM' ? 0.6 : 0.3,
      })),
  );
}

/** A circle on the ground, for the "check an area" tool. */
export function circleToGeoJSON(lng: number, lat: number, radiusM: number): GeoJSON.FeatureCollection {
  const steps = 64;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lng + (radiusM * Math.sin(a)) / (111_320 * Math.cos((lat * Math.PI) / 180)), lat + (radiusM * Math.cos(a)) / 111_320]);
  }
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} }, point(lng, lat, { centre: true })],
  };
}

/** The shape being drawn: its corners, its outline, and the filled area once it is closed. */
export function drawToGeoJSON(points: [number, number][], closed: boolean): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = points.map(([lng, lat], i) => point(lng, lat, { corner: i + 1 }));
  if (points.length >= 2) {
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: closed ? [...points, points[0]] : points }, properties: {} });
  }
  if (closed && points.length >= 3) {
    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] }, properties: {} });
  }
  return { type: 'FeatureCollection', features };
}

export function pointInPolygon(lng: number, lat: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Area of a small polygon in square kilometres. Good to a few percent at this size. */
export function polygonAreaKm2(poly: [number, number][]): number {
  if (poly.length < 3) return 0;
  const lat0 = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110.57;
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += poly[j][0] * kx * (poly[i][1] * ky) - poly[i][0] * kx * (poly[j][1] * ky);
  }
  return Math.abs(sum) / 2;
}

/** Route lines from where waste was collected to the facility it went to. */
export function flowRoutesToGeoJSON(flows: WasteFlow[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: flows
      .filter((f) => f.originLat != null && f.originLng != null
        && f.destinationFacility?.latitude != null && f.destinationFacility?.longitude != null)
      .map((f) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [[f.originLng!, f.originLat!], [f.destinationFacility!.longitude!, f.destinationFacility!.latitude!]],
        },
        properties: { status: f.status, color: FLOW_STATUS_COLORS[f.status] ?? dataColors.neutralLine },
      })),
  };
}

/**
 * A straight line from each site to its nearest collection point. This is an estimate drawn by
 * the app, not recorded data, which is why the layer is off by default and labelled as estimated.
 */
export function nearestLinesToGeoJSON(sites: DumpSite[], points: CollectionPoint[]): GeoJSON.FeatureCollection {
  const usable = points.filter((c) => c.latitude != null && c.longitude != null);
  const features: GeoJSON.Feature[] = [];
  for (const s of sites) {
    if (s.latitude == null || s.longitude == null) continue;
    let best: CollectionPoint | null = null;
    let bestDistance = Infinity;
    for (const c of usable) {
      const dx = (c.longitude! - s.longitude) * Math.cos((s.latitude * Math.PI) / 180);
      const dy = c.latitude! - s.latitude;
      const d = dx * dx + dy * dy;
      if (d < bestDistance) { bestDistance = d; best = c; }
    }
    if (best) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[s.longitude, s.latitude], [best.longitude!, best.latitude!]] },
        properties: {},
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

/** Flood zone boundaries. Zones that have no boundary stored are left out, never drawn in the wrong place. */
export function floodZonesToGeoJSON(zones: FloodZone[], features: (GeoJSON.Feature | null)[]): GeoJSON.FeatureCollection {
  const out: GeoJSON.Feature[] = [];
  zones.forEach((zone, i) => {
    const feature = features[i];
    if (!feature?.geometry) return;
    out.push({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        id: zone.id, name: zone.name ?? 'Flood zone', riskLevel: zone.riskLevel,
        color: FLOOD_RISK_COLORS[zone.riskLevel], lga: zone.lga, ward: zone.ward, description: zone.description,
      },
    });
  });
  return { type: 'FeatureCollection', features: out };
}

// ── Source helpers ────────────────────────────────────────────────────────────

export function setSourceData(map: maplibregl.Map, id: string, data: GeoJSON.FeatureCollection) {
  const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  source?.setData(data);
}

export function applyVisibility(map: maplibregl.Map, enabled: Record<LayerId, boolean>) {
  for (const id of Object.keys(LAYER_MAP) as LayerId[]) {
    const visibility = enabled[id] ? 'visible' : 'none';
    for (const layerId of LAYER_MAP[id]) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }
}

/** How wide and how strong the density layer is drawn. */
export function applyHeatStyle(map: maplibregl.Map, radius: number, strength: number) {
  if (!map.getLayer('heatmap-layer')) return;
  map.setPaintProperty('heatmap-layer', 'heatmap-radius', ['interpolate', ['linear'], ['zoom'], 0, radius * 0.5, 15, radius]);
  map.setPaintProperty('heatmap-layer', 'heatmap-intensity', ['interpolate', ['linear'], ['zoom'], 0, strength * 0.5, 15, strength * 2]);
}

function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const LABEL = (c: Theme, minzoom: number, offset = 1.4) => ({
  minzoom,
  layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, offset], 'text-anchor': 'top' },
  paint: { 'text-color': c.fg, 'text-halo-color': c.mapHalo, 'text-halo-width': 1.5 },
});

/**
 * Adds every source and layer once, empty, in drawing order (bottom first), and the pin pictures.
 * Data is filled in later with setSourceData, so a dataset that arrives late or fails never blocks the
 * others. Called again after the background changes, because a new background removes them.
 */
export function addAllLayers(map: maplibregl.Map, c: Theme) {
  registerPins(map, c);
  const source = (id: string, extra: Record<string, unknown> = {}) => {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY, ...extra } as maplibregl.GeoJSONSourceSpecification);
  };
  const layer = (spec: maplibregl.LayerSpecification) => { if (!map.getLayer(spec.id)) map.addLayer(spec); };

  for (const id of ['data-gaps', 'lga', 'area-mentions', 'flood-zones', 'ref-waterways', 'ref-drains', 'ref-schools', 'ref-health', 'area-check', 'nearest-lines',
    'waste-routes', 'heatmap-data', 'hotspots', 'collection-points', 'facilities', 'water-sources', 'water-anomalies', 'draw', 'search-pin']) {
    source(id);
  }
  source('dump-sites', { cluster: true, clusterMaxZoom: 13, clusterRadius: 40 });

  // How much checked data each area has. Grey is nothing recorded, yellow is thin, and well-covered areas are left clear.
  layer({ id: 'gaps-fill', type: 'fill', source: 'data-gaps',
    paint: {
      'fill-color': ['match', ['get', 'status'], 'no_data', c.lineStrong, 'thin', c.severity[1], c.panel],
      'fill-opacity': ['match', ['get', 'status'], 'no_data', 0.32, 'thin', 0.28, 0],
    } });
  layer({ id: 'gaps-line', type: 'line', source: 'data-gaps', paint: { 'line-color': c.lineStrong, 'line-width': 1, 'line-opacity': 0.8 } });

  // Local government area outlines
  layer({ id: 'lga-fill', type: 'fill', source: 'lga', paint: { 'fill-color': c.accent, 'fill-opacity': 0.05 } });
  layer({ id: 'lga-line', type: 'line', source: 'lga', paint: { 'line-color': c.lineStrong, 'line-width': 1.2, 'line-dasharray': [4, 3], 'line-opacity': 0.9 } });
  layer({ id: 'lga-label', type: 'symbol', source: 'lga', minzoom: 8, maxzoom: 12,
    layout: { 'text-field': ['get', 'name'], 'text-size': 13, 'text-letter-spacing': 0.08 },
    paint: { 'text-color': c.fgMuted, 'text-halo-color': c.mapHalo, 'text-halo-width': 1.5 } });

  // News stories counted by area: a tint over the whole area, because no exact place is known
  layer({ id: 'area-fill', type: 'fill', source: 'area-mentions',
    paint: { 'fill-color': c.severity[1], 'fill-opacity': ['interpolate', ['linear'], ['get', 'stories'], 1, 0.14, 10, 0.4] } });
  layer({ id: 'area-line', type: 'line', source: 'area-mentions', paint: { 'line-color': c.severity[2], 'line-width': 1.5, 'line-opacity': 0.8 } });
  layer({ id: 'area-label', type: 'symbol', source: 'area-mentions', maxzoom: 13,
    layout: { 'text-field': ['get', 'label'], 'text-size': 13 },
    paint: { 'text-color': c.fg, 'text-halo-color': c.mapHalo, 'text-halo-width': 2 } });

  // Flood zones
  layer({ id: 'flood-zones-fill', type: 'fill', source: 'flood-zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 } });
  layer({ id: 'flood-zones-line', type: 'line', source: 'flood-zones', paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.85 } });

  // Waterways, drains, schools and health facilities, under everything else
  layer({ id: 'ref-waterways-line', type: 'line', source: 'ref-waterways', layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': c.waterway, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 3], 'line-opacity': 0.85 } });
  layer({ id: 'ref-drains-line', type: 'line', source: 'ref-drains', layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': c.drain, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 2.5], 'line-dasharray': [2, 2], 'line-opacity': 0.95 } });
  layer({ id: 'ref-schools-circle', type: 'circle', source: 'ref-schools',
    paint: { 'circle-radius': 5, 'circle-color': c.school, 'circle-stroke-width': 1.5, 'circle-stroke-color': c.mapHalo } });
  layer({ id: 'ref-health-circle', type: 'circle', source: 'ref-health',
    paint: { 'circle-radius': 5, 'circle-color': c.health, 'circle-stroke-width': 1.5, 'circle-stroke-color': c.mapHalo } });

  // Area picked with the "check an area" tool
  layer({ id: 'area-check-fill', type: 'fill', source: 'area-check', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': c.area, 'fill-opacity': 0.14 } });
  layer({ id: 'area-check-line', type: 'line', source: 'area-check', filter: ['==', '$type', 'Polygon'], paint: { 'line-color': c.area, 'line-width': 2, 'line-dasharray': [3, 2] } });
  layer({ id: 'area-check-centre', type: 'circle', source: 'area-check', filter: ['==', '$type', 'Point'],
    paint: { 'circle-radius': 5, 'circle-color': c.mapHalo, 'circle-stroke-width': 2.5, 'circle-stroke-color': c.area } });

  // Estimated link from each site to its nearest collection point
  layer({ id: 'nearest-lines', type: 'line', source: 'nearest-lines', layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': dataColors.neutralLine, 'line-width': 1, 'line-opacity': 0.8, 'line-dasharray': [3, 4] } });

  // Waste routes, driven by the timeline
  layer({ id: 'waste-routes-line', type: 'line', source: 'waste-routes', layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.9, 'line-dasharray': [2, 3] } });
  layer({ id: 'waste-routes-end', type: 'circle', source: 'waste-routes', filter: ['!=', ['get', 'status'], 'PENDING'],
    paint: { 'circle-radius': 4, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': c.mapHalo } });

  // Density
  const [s0, s1, s2, s3] = c.severity;
  layer({ id: 'heatmap-layer', type: 'heatmap', source: 'heatmap-data', maxzoom: 16,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 15, 2.4],
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
        0, rgba(s0, 0), 0.25, rgba(s0, 0.55), 0.5, rgba(s1, 0.7), 0.75, rgba(s2, 0.85), 1, rgba(s3, 0.95)],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 12, 15, 30],
      'heatmap-opacity': 0.9,
    } });

  // Hotspots: a zone whose size follows the number of sites and whose colour follows the severity
  const zoneRadius = ['interpolate', ['linear'], ['zoom'],
    8, ['+', 10, ['*', 4, ['sqrt', ['get', 'siteCount']]]],
    15, ['+', 22, ['*', 10, ['sqrt', ['get', 'siteCount']]]]] as maplibregl.ExpressionSpecification;
  const zoneColor = ['step', ['get', 'severity'], s0, 1, s1, 2, s2, 3, s3] as maplibregl.ExpressionSpecification;
  layer({ id: 'hotspots-fill', type: 'circle', source: 'hotspots',
    paint: { 'circle-radius': zoneRadius, 'circle-color': zoneColor, 'circle-opacity': 0.32 } });
  layer({ id: 'hotspots-ring', type: 'circle', source: 'hotspots',
    paint: { 'circle-radius': zoneRadius, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-width': 2, 'circle-stroke-color': zoneColor } });

  // Collection points
  layer({ id: 'cp-radius', type: 'circle', source: 'collection-points',
    paint: {
      'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 10, 8, 13, 30, 15, 80],
      'circle-color': c.collectionPoint, 'circle-opacity': 0.1,
      'circle-stroke-width': 1, 'circle-stroke-color': c.collectionPoint, 'circle-stroke-opacity': 0.45,
    } });
  layer({ id: 'cp-circle', type: 'circle', source: 'collection-points',
    paint: { 'circle-radius': 7, 'circle-color': c.collectionPoint, 'circle-stroke-width': 2, 'circle-stroke-color': c.mapHalo } });
  layer({ id: 'cp-label', type: 'symbol', source: 'collection-points', ...(LABEL(c, 12) as object) } as maplibregl.LayerSpecification);

  // Facilities
  layer({ id: 'facilities-circle', type: 'circle', source: 'facilities',
    paint: { 'circle-radius': 9, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': c.mapHalo } });
  layer({ id: 'facilities-label', type: 'symbol', source: 'facilities', ...(LABEL(c, 11, 1.5) as object) } as maplibregl.LayerSpecification);

  // Water
  layer({ id: 'water-sources-circle', type: 'circle', source: 'water-sources',
    paint: { 'circle-radius': 6, 'circle-color': c.waterSource, 'circle-stroke-width': 1.5, 'circle-stroke-color': c.mapHalo } });
  layer({ id: 'water-sources-label', type: 'symbol', source: 'water-sources', ...(LABEL(c, 12) as object) } as maplibregl.LayerSpecification);
  layer({ id: 'water-anomalies-halo', type: 'circle', source: 'water-anomalies', paint: { 'circle-radius': 14, 'circle-color': ['get', 'color'], 'circle-opacity': 0.25 } });
  layer({ id: 'water-anomalies-circle', type: 'circle', source: 'water-anomalies',
    paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': c.mapHalo } });

  // The shape being drawn, and a place found by search
  layer({ id: 'draw-fill', type: 'fill', source: 'draw', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': c.accent, 'fill-opacity': 0.16 } });
  layer({ id: 'draw-line', type: 'line', source: 'draw', filter: ['==', '$type', 'LineString'], paint: { 'line-color': c.accent, 'line-width': 2.5 } });
  layer({ id: 'draw-corner', type: 'circle', source: 'draw', filter: ['==', '$type', 'Point'],
    paint: { 'circle-radius': 5, 'circle-color': c.mapHalo, 'circle-stroke-width': 2.5, 'circle-stroke-color': c.accent } });
  layer({ id: 'search-pin', type: 'circle', source: 'search-pin',
    paint: { 'circle-radius': 9, 'circle-color': c.accent, 'circle-stroke-width': 3, 'circle-stroke-color': c.mapHalo } });

  // Sites, last so they sit on top and are always clickable. A pin per site. Size, colour and the mark
  // inside all rise with certainty. Close pins merge into a numbered circle.
  layer({ id: 'sites-cluster', type: 'circle', source: 'dump-sites', filter: ['has', 'point_count'],
    paint: {
      'circle-color': c.panel,
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
      'circle-stroke-width': 3, 'circle-stroke-color': c.accent,
    } });
  layer({ id: 'sites-cluster-count', type: 'symbol', source: 'dump-sites', filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 }, paint: { 'text-color': c.fg } });
  layer({ id: 'sites-pin', type: 'symbol', source: 'dump-sites', filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['concat', 'pin-', ['get', 'confidenceTier']],
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-size': ['match', ['get', 'confidenceTier'], 'HIGH', 1, 'MEDIUM', 0.88, 0.78],
    } });
}

// ── Turning a clicked feature into card text ─────────────────────────────────

type Props = Record<string, unknown>;
const str = (v: unknown): string | null => (v == null || v === '' ? null : String(v));
const rows = (...pairs: [string, string | null][]): [string, string][] =>
  pairs.filter((p): p is [string, string] => p[1] != null);

export function placeFromFeature(layerId: string, p: Props): PlaceInfo | null {
  switch (layerId) {
    case 'gaps-fill': {
      const status = str(p.status);
      return {
        title: str(p.name) ?? 'Area',
        subtitle: status === 'no_data' ? 'No checked data yet' : status === 'thin' ? 'Thin data' : 'Covered',
        rows: rows(
          ['Sites', p.sites != null ? String(p.sites) : null],
          ['Checked by a reviewer', p.checkedSites != null ? String(p.checkedSites) : null],
          ['Collection points', p.collectionPoints != null ? String(p.collectionPoints) : null],
          ['Waiting for review', p.awaitingReview != null ? String(p.awaitingReview) : null],
        ),
        note: 'An area with no sites is an area with no data, not an area with no waste.',
      };
    }
    case 'area-fill': {
      const stories = Number(p.stories);
      let recent: { title: string; url: string }[] = [];
      try { recent = JSON.parse(String(p.recent)); } catch { /* the rows still show */ }
      return {
        title: str(p.lga) ?? 'Area',
        subtitle: 'News stories that name this area, with no exact place',
        rows: rows(
          ['Stories', String(stories)],
          ['Latest', p.latestAt ? new Date(String(p.latestAt)).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : null],
          ['Checked', 'Not checked by a reviewer'],
        ),
        links: recent.filter((r) => /^https?:\/\//.test(r.url)).map((r) => ({ label: r.title, href: r.url })),
      };
    }
    case 'hotspots-fill':
      return {
        title: str(p.title) ?? 'Hotspot',
        subtitle: `${SEVERITY_LABELS[Number(p.severity) as 0 | 1 | 2 | 3] ?? 'Hotspot'} severity hotspot, rank ${p.rank}`,
        rows: rows(
          ['Area', str(p.lga)],
          ['Sites', `${p.siteCount} (${p.verified} checked)`],
          ['Days with records', str(p.observationDays)],
          ['Keeps coming back', p.recurring === true || p.recurring === 'true' ? 'Yes' : 'Not yet'],
          ['Hazardous waste', p.hazardous === true || p.hazardous === 'true' ? 'Yes' : null],
          ['Near or in water', p.waterContact === true || p.waterContact === 'true' ? 'Yes' : null],
          ['Last record', p.lastObservedAt ? new Date(String(p.lastObservedAt)).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : null],
          ['Score', str(p.score)],
        ),
      };
    case 'cp-circle':
      return {
        title: str(p.name) ?? 'Collection point',
        subtitle: p.isOfficial === true || p.isOfficial === 'true' ? 'Official collection point' : 'Collection point, not confirmed as official',
        rows: rows(
          ['Checked', p.verification === 'FIELD_VERIFIED' ? 'Field-verified' : p.verification === 'CORROBORATED' ? 'Corroborated' : 'Not yet checked'],
          ['Schedule', str(p.schedule)],
          ['Operator', str(p.operator)],
          ['Ward', str(p.ward)],
          ['Area', str(p.lga)],
          ['Coverage', p.coverageRadiusM ? `${(Number(p.coverageRadiusM) / 1000).toFixed(1)} km` : null],
        ),
      };
    case 'facilities-circle':
      return {
        title: str(p.name) ?? 'Facility',
        subtitle: FACILITY_TYPE_LABELS[p.facilityType as keyof typeof FACILITY_TYPE_LABELS] ?? 'Facility',
        rows: rows(
          ['Operator', str(p.operator)],
          ['Area', str(p.lga)],
          ['Capacity', p.capacityTpd ? `${Number(p.capacityTpd).toLocaleString('en-NG')} tonnes a day` : null],
        ),
      };
    case 'water-sources-circle':
      return {
        title: str(p.name) ?? 'Water source',
        subtitle: WATER_SOURCE_LABELS[p.sourceType as keyof typeof WATER_SOURCE_LABELS] ?? 'Water source',
        rows: rows(
          ['Condition', str(p.condition)],
          ['Technology', str(p.technology)],
          ['Surveyed', p.surveyedAt ? new Date(String(p.surveyedAt)).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : null],
          ['People nearby', p.populationServed ? Number(p.populationServed).toLocaleString('en-NG') : null],
          ['Operator', str(p.operator)],
          ['Area', str(p.lga)],
          ['Source', str(p.dataSource)],
        ),
      };
    case 'water-anomalies-circle':
      return {
        title: WATER_ANOMALY_LABELS[p.anomalyType as keyof typeof WATER_ANOMALY_LABELS] ?? 'Water anomaly',
        subtitle: 'Open water anomaly',
        rows: rows(
          ['Severity', str(p.severity) ? String(p.severity).toLowerCase() : null],
          ['Detected', p.detectedAt ? new Date(String(p.detectedAt)).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : null],
          ['Details', str(p.description)],
        ),
      };
    case 'flood-zones-fill':
      return {
        title: str(p.name) ?? 'Flood zone',
        subtitle: FLOOD_RISK_LABELS[p.riskLevel as keyof typeof FLOOD_RISK_LABELS] ?? 'Flood zone',
        rows: rows(['Ward', str(p.ward)], ['Area', str(p.lga)], ['Details', str(p.description)]),
      };
    default:
      return null;
  }
}

/** Layers a click can select, topmost first. */
export const CLICKABLE_LAYERS = [
  'sites-pin', 'water-anomalies-circle', 'facilities-circle', 'cp-circle', 'water-sources-circle', 'hotspots-fill', 'flood-zones-fill', 'area-fill', 'gaps-fill',
];
