import maplibregl from 'maplibre-gl';
import type {
  CollectionPoint, DumpSite, Facility, FloodZone, HeatmapPoint, WasteFlow, WaterAnomaly, WaterSource,
} from '@/lib/types';
import {
  FACILITY_TYPE_COLORS, FACILITY_TYPE_LABELS, FLOOD_RISK_COLORS, FLOOD_RISK_LABELS, FLOW_STATUS_COLORS,
  WATER_ANOMALY_COLORS, WATER_ANOMALY_LABELS, WATER_SOURCE_LABELS,
} from '@/lib/constants';
import { dataColors, palette, tierColors } from '@/lib/palette';

export type LayerId =
  | 'dump-sites'
  | 'collection-points'
  | 'facilities'
  | 'waste-routes'
  | 'nearest-lines'
  | 'water-sources'
  | 'water-anomalies'
  | 'flood-zones'
  | 'heatmap';

/** Which map layers each switch in the panel controls. */
export const LAYER_MAP: Record<LayerId, string[]> = {
  'dump-sites': ['sites-cluster', 'sites-cluster-count', 'sites-circle'],
  'collection-points': ['cp-radius', 'cp-circle', 'cp-label'],
  facilities: ['facilities-circle', 'facilities-label'],
  'waste-routes': ['waste-routes-line', 'waste-routes-end'],
  'nearest-lines': ['nearest-lines'],
  'water-sources': ['water-sources-circle', 'water-sources-label'],
  'water-anomalies': ['water-anomalies-halo', 'water-anomalies-circle'],
  'flood-zones': ['flood-zones-fill', 'flood-zones-line'],
  heatmap: ['heatmap-layer'],
};

export const DEFAULT_ENABLED: Record<LayerId, boolean> = {
  'dump-sites': true,
  'collection-points': true,
  facilities: true,
  'waste-routes': true,
  'nearest-lines': false,
  'water-sources': false,
  'water-anomalies': false,
  'flood-zones': false,
  heatmap: false,
};

/** A short description of the thing a user clicked, for the details card. */
export interface PlaceInfo {
  title: string;
  subtitle?: string;
  rows: [label: string, value: string][];
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
      .map((s) => point(s.longitude!, s.latitude!, { id: s.id, confidenceTier: s.confidenceTier })),
  };
}

export function collectionPointsToGeoJSON(items: CollectionPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => point(c.longitude!, c.latitude!, {
        id: c.id, name: c.name, operator: c.operator, ward: c.ward, lga: c.lga, coverageRadiusM: c.coverageRadiusM,
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
  return {
    type: 'FeatureCollection',
    features: items.map((p) => point(p.lng, p.lat, { weight: p.weight })),
  };
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
          coordinates: [
            [f.originLng!, f.originLat!],
            [f.destinationFacility!.longitude!, f.destinationFacility!.latitude!],
          ],
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
      // Scale longitude by the cosine of the latitude so east-west and north-south distances compare fairly.
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

function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Adds every source and layer once, empty, in drawing order (bottom first). Data is filled in
 * later with setSourceData, so a dataset that arrives late or fails never blocks the others.
 */
export function addAllLayers(map: maplibregl.Map) {
  const source = (id: string, extra: Record<string, unknown> = {}) =>
    map.addSource(id, { type: 'geojson', data: EMPTY, ...extra } as maplibregl.GeoJSONSourceSpecification);

  source('flood-zones');
  source('nearest-lines');
  source('waste-routes');
  source('heatmap-data');
  source('collection-points');
  source('facilities');
  source('water-sources');
  source('water-anomalies');
  source('dump-sites', { cluster: true, clusterMaxZoom: 13, clusterRadius: 40 });

  // Flood zones
  map.addLayer({ id: 'flood-zones-fill', type: 'fill', source: 'flood-zones',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.18 } });
  map.addLayer({ id: 'flood-zones-line', type: 'line', source: 'flood-zones',
    paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.8 } });

  // Estimated link from each site to its nearest collection point
  map.addLayer({ id: 'nearest-lines', type: 'line', source: 'nearest-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': dataColors.neutralLine, 'line-width': 1, 'line-opacity': 0.8, 'line-dasharray': [3, 4] } });

  // Waste routes, driven by the timeline
  map.addLayer({ id: 'waste-routes-line', type: 'line', source: 'waste-routes',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.85, 'line-dasharray': [2, 3] } });
  map.addLayer({ id: 'waste-routes-end', type: 'circle', source: 'waste-routes',
    filter: ['!=', ['get', 'status'], 'PENDING'],
    paint: { 'circle-radius': 4, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': palette.canvas } });

  // Density
  map.addLayer({ id: 'heatmap-layer', type: 'heatmap', source: 'heatmap-data', maxzoom: 15,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, rgba(dataColors.heat[0], 0),
        0.25, rgba(dataColors.heat[0], 0.6),
        0.5, rgba(dataColors.heat[1], 0.75),
        0.75, rgba(dataColors.heat[2], 0.85),
        1, rgba(dataColors.heat[3], 1),
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 15, 40],
      'heatmap-opacity': 0.85,
    } });

  // Collection points
  map.addLayer({ id: 'cp-radius', type: 'circle', source: 'collection-points',
    paint: {
      'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 10, 8, 13, 30, 15, 80],
      'circle-color': dataColors.collectionPoint, 'circle-opacity': 0.1,
      'circle-stroke-width': 1, 'circle-stroke-color': dataColors.collectionPoint, 'circle-stroke-opacity': 0.4,
    } });
  map.addLayer({ id: 'cp-circle', type: 'circle', source: 'collection-points',
    paint: { 'circle-radius': 7, 'circle-color': dataColors.collectionPoint, 'circle-stroke-width': 2, 'circle-stroke-color': palette.fg } });
  map.addLayer({ id: 'cp-label', type: 'symbol', source: 'collection-points', minzoom: 12,
    layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.4], 'text-anchor': 'top' },
    paint: { 'text-color': palette.fg, 'text-halo-color': palette.canvas, 'text-halo-width': 1.5 } });

  // Facilities
  map.addLayer({ id: 'facilities-circle', type: 'circle', source: 'facilities',
    paint: { 'circle-radius': 9, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': palette.canvas } });
  map.addLayer({ id: 'facilities-label', type: 'symbol', source: 'facilities', minzoom: 11,
    layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.5], 'text-anchor': 'top' },
    paint: { 'text-color': palette.fg, 'text-halo-color': palette.canvas, 'text-halo-width': 1.5 } });

  // Water
  map.addLayer({ id: 'water-sources-circle', type: 'circle', source: 'water-sources',
    paint: { 'circle-radius': 6, 'circle-color': dataColors.waterSource, 'circle-stroke-width': 1.5, 'circle-stroke-color': palette.canvas } });
  map.addLayer({ id: 'water-sources-label', type: 'symbol', source: 'water-sources', minzoom: 12,
    layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.4], 'text-anchor': 'top' },
    paint: { 'text-color': palette.fg, 'text-halo-color': palette.canvas, 'text-halo-width': 1.5 } });
  map.addLayer({ id: 'water-anomalies-halo', type: 'circle', source: 'water-anomalies',
    paint: { 'circle-radius': 14, 'circle-color': ['get', 'color'], 'circle-opacity': 0.25 } });
  map.addLayer({ id: 'water-anomalies-circle', type: 'circle', source: 'water-anomalies',
    paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': palette.fg } });

  // Dump sites, last so they sit on top and are always clickable.
  // Size grows with certainty as well as colour, so the tier is not carried by colour alone.
  map.addLayer({ id: 'sites-cluster', type: 'circle', source: 'dump-sites', filter: ['has', 'point_count'],
    paint: {
      'circle-color': palette.panel3,
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
      'circle-stroke-width': 1.5, 'circle-stroke-color': palette.lineStrong,
    } });
  map.addLayer({ id: 'sites-cluster-count', type: 'symbol', source: 'dump-sites', filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 },
    paint: { 'text-color': palette.fg } });
  map.addLayer({ id: 'sites-circle', type: 'circle', source: 'dump-sites', filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['match', ['get', 'confidenceTier'],
        'HIGH', tierColors.high, 'MEDIUM', tierColors.medium, tierColors.low],
      'circle-radius': ['match', ['get', 'confidenceTier'], 'HIGH', 10, 'MEDIUM', 8, 6.5],
      'circle-stroke-width': 2, 'circle-stroke-color': palette.canvas,
    } });
}

// ── Turning a clicked feature into card text ─────────────────────────────────

type Props = Record<string, unknown>;
const str = (v: unknown): string | null => (v == null || v === '' ? null : String(v));
const rows = (...pairs: [string, string | null][]): [string, string][] =>
  pairs.filter((p): p is [string, string] => p[1] != null);

export function placeFromFeature(layerId: string, p: Props): PlaceInfo | null {
  switch (layerId) {
    case 'cp-circle':
      return {
        title: str(p.name) ?? 'Collection point',
        subtitle: 'Collection point',
        rows: rows(
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
  'sites-circle', 'water-anomalies-circle', 'facilities-circle', 'cp-circle', 'water-sources-circle', 'flood-zones-fill',
];
