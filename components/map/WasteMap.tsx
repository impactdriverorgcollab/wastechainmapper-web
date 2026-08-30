'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getSites } from '@/lib/api';
import type { DumpSite } from '@/lib/types';
import { TIER_COLORS, RIVERS_STATE_CENTER, RIVERS_STATE_ZOOM, WASTE_TYPE_LABELS, SOURCE_TYPE_LABELS } from '@/lib/constants';
import { SitePopup } from './SitePopup';

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ??
  'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

export default function WasteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selectedSite, setSelectedSite] = useState<DumpSite | null>(null);
  const [sites, setSites] = useState<DumpSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sites
  useEffect(() => {
    getSites({ limit: '500' })
      .then(setSites)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Init map
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
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update site markers when map and sites are ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sites.length === 0) return;

    const waitForStyle = () => {
      if (!map.isStyleLoaded()) {
        map.once('styledata', waitForStyle);
        return;
      }
      addSiteLayer(map, sites, setSelectedSite);
    };

    if (map.loaded()) {
      waitForStyle();
    } else {
      map.on('load', waitForStyle);
    }
  }, [sites]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-surface-1 border border-border px-3 py-1 text-xs text-text-secondary">
          Loading sites…
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
    </div>
  );
}

// ── Map layer helpers ─────────────────────────────────────────────────────────

function buildGeoJSON(sites: DumpSite[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sites
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [s.longitude!, s.latitude!],
        },
        properties: {
          id: s.id,
          confidenceTier: s.confidenceTier,
          color: TIER_COLORS[s.confidenceTier].hex,
          wasteType: s.wasteType,
          communityName: s.communityName,
          ward: s.ward,
          lga: s.lga,
          status: s.status,
          firstSeenAt: s.firstSeenAt,
        },
      })),
  };
}

function addSiteLayer(
  map: maplibregl.Map,
  sites: DumpSite[],
  onSelect: (site: DumpSite) => void,
) {
  const SOURCE_ID = 'dump-sites';
  const LAYER_CIRCLE = 'sites-circle';
  const LAYER_CLUSTER_CIRCLE = 'sites-cluster-circle';
  const LAYER_CLUSTER_COUNT = 'sites-cluster-count';

  const geojson = buildGeoJSON(sites);

  if (map.getSource(SOURCE_ID)) {
    (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson);
    return;
  }

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 40,
  });

  // Clustered circles — neutral color, sized by count
  map.addLayer({
    id: LAYER_CLUSTER_CIRCLE,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#2a3347',
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
      'circle-stroke-width': 1,
      'circle-stroke-color': '#4a5568',
    },
  });

  map.addLayer({
    id: LAYER_CLUSTER_COUNT,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 11,
      'text-font': ['Open Sans Regular'],
    },
    paint: { 'text-color': '#a0aec0' },
  });

  // Individual site markers — colored by confidence tier
  map.addLayer({
    id: LAYER_CIRCLE,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 6,
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 1,
      'circle-stroke-color': '#0f1117',
      'circle-opacity': 0.92,
    },
  });

  // Click individual site
  map.on('click', LAYER_CIRCLE, (e) => {
    const props = e.features?.[0]?.properties;
    if (!props?.id) return;
    const site = sites.find((s) => s.id === props.id);
    if (site) onSelect(site);
  });

  // Click cluster → zoom in
  map.on('click', LAYER_CLUSTER_CIRCLE, (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTER_CIRCLE] });
    const clusterId = features[0]?.properties?.cluster_id;
    if (!clusterId) return;
    (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).getClusterExpansionZoom(
      clusterId,
      (err, zoom) => {
        if (err || zoom == null) return;
        map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
      },
    );
  });

  map.on('mouseenter', LAYER_CIRCLE, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', LAYER_CIRCLE, () => { map.getCanvas().style.cursor = ''; });
  map.on('mouseenter', LAYER_CLUSTER_CIRCLE, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', LAYER_CLUSTER_CIRCLE, () => { map.getCanvas().style.cursor = ''; });
}
