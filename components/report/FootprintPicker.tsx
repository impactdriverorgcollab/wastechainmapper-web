'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Undo2, X } from 'lucide-react';
import { mapStyleFor } from '@/lib/mapStyle';
import { useTheme } from '@/lib/theme';
import { formatNumber } from '@/lib/format';
import { polygonAreaKm2 } from '@/components/map/mapLayers';
import { Button } from '@/components/ui/Button';

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function shape(corners: [number, number][]): GeoJSON.FeatureCollection {
  if (corners.length === 0) return EMPTY;
  const ring = corners.length >= 3 ? [...corners, corners[0]] : corners;
  return {
    type: 'FeatureCollection',
    features: [
      ...(corners.length >= 3 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [ring] } }] : []),
      { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring } },
      ...corners.map((c) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: c } })),
    ],
  };
}

/**
 * Draw the outline of a pile on satellite imagery, one tap per corner. The area, with an average
 * height, gives a volume. It suits large or spread-out piles that are hard to pace out.
 */
export function FootprintPicker({ centre, onChange }: { centre: { latitude: number; longitude: number }; onChange: (m2: number | null) => void }) {
  const { colors } = useTheme();
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [corners, setCorners] = useState<[number, number][]>([]);
  const [ready, setReady] = useState(false);
  const areaM2 = corners.length >= 3 ? polygonAreaKm2(corners) * 1_000_000 : null;

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: boxRef.current, style: mapStyleFor('light', 'satellite'), center: [centre.longitude, centre.latitude], zoom: 19, maxZoom: 20,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('style.load', () => {
      map.addSource('footprint', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'fp-fill', type: 'fill', source: 'footprint', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': colors.accent, 'fill-opacity': 0.25 } });
      map.addLayer({ id: 'fp-line', type: 'line', source: 'footprint', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#FFFFFF', 'line-width': 2.5 } });
      map.addLayer({ id: 'fp-corner', type: 'circle', source: 'footprint', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 5, 'circle-color': colors.accent, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 } });
      setReady(true);
    });
    map.on('click', (e) => setCorners((c) => (c.length >= 30 ? c : [...c, [e.lngLat.lng, e.lngLat.lat]])));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource('footprint') as maplibregl.GeoJSONSource | undefined)?.setData(shape(corners));
    onChange(areaM2 && areaM2 >= 0.1 ? Math.round(areaM2 * 10) / 10 : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corners, ready]);

  return (
    <div className="space-y-2">
      <div ref={boxRef} role="region" aria-label="Satellite map. Tap each corner of the pile in turn." className="h-72 w-full overflow-hidden rounded border border-line-strong" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-fg-muted">
          {corners.length < 3 ? `Tap each corner of the pile. ${corners.length} of at least 3 corners.` : <>Area about <span className="tabular font-semibold text-fg">{formatNumber(areaM2!, 1)} m²</span>, from {corners.length} corners.</>}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => setCorners((c) => c.slice(0, -1))} disabled={corners.length === 0}><Undo2 size={16} aria-hidden="true" />Undo</Button>
          <Button onClick={() => setCorners([])} disabled={corners.length === 0}><X size={16} aria-hidden="true" />Clear</Button>
        </div>
      </div>
      <p className="text-xs text-fg-subtle">Satellite pictures can be months or years old. Draw what you see on the ground today.</p>
    </div>
  );
}
