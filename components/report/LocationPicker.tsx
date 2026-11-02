'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, MapPin } from 'lucide-react';
import { mapStyleFor } from '@/lib/mapStyle';
import { useTheme } from '@/lib/theme';
import { RIVERS_STATE_CENTER, RIVERS_STATE_ZOOM } from '@/lib/constants';
import { formatCoords } from '@/lib/format';

import { Button } from '@/components/ui/Button';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  accuracyM?: number;
  origin: 'gps' | 'map_pin';
}

interface Props {
  value: PickedLocation | null;
  onChange: (value: PickedLocation | null) => void;
  error?: string;
  /** Sites near the chosen point can be offered by the parent; the picker only reports the point. */
}

/** Choose a place by using the phone's position or by tapping the map. Both keep working without the other. */
export function LocationPicker({ value, onChange, error }: Props) {
  const { theme, colors } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyleFor(theme, 'streets'),
        center: RIVERS_STATE_CENTER,
        zoom: RIVERS_STATE_ZOOM,
        attributionControl: false,
      });
    } catch {
      setMapFailed(true);
      return;
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('click', (e) => onChangeRef.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng, origin: 'map_pin' }));
    map.on('error', () => { if (!map.loaded()) setMapFailed(true); });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  // Keep the pin and the view in step with the chosen point.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) { markerRef.current?.remove(); markerRef.current = null; return; }
    const lngLat: [number, number] = [value.longitude, value.latitude];
    if (!markerRef.current) markerRef.current = new maplibregl.Marker({ color: colors.accent }).setLngLat(lngLat).addTo(map);
    else markerRef.current.setLngLat(lngLat);
    map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), 15), duration: 400 });
  }, [value]);

  function useMyPosition() {
    setGeoMessage(null);
    if (!('geolocation' in navigator)) {
      setGeoMessage('This browser cannot find your position. Tap the place on the map instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracyM: Math.round(pos.coords.accuracy), origin: 'gps' });
      },
      (err) => {
        setLocating(false);
        setGeoMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location is switched off for this site. Tap the place on the map instead, or allow location in your browser settings.'
            : 'Your position could not be found. Move to open ground and try again, or tap the place on the map.',
        );
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={useMyPosition} loading={locating}>
          <Crosshair size={16} aria-hidden="true" />
          {locating ? 'Finding you' : 'Use my position'}
        </Button>
        <p className="text-sm text-fg-muted">or tap the place on the map</p>
      </div>

      <div aria-live="polite" className="mt-2 min-h-5 text-sm">
        {value ? (
          <p className="flex flex-wrap items-center gap-x-2 text-fg">
            <MapPin size={14} aria-hidden="true" className="text-accent" />
            <span className="font-mono text-xs">{formatCoords(value.latitude, value.longitude, 5)}</span>
            <span className="text-fg-muted">
              {value.origin === 'gps' ? `from your phone${value.accuracyM ? `, within about ${value.accuracyM} m` : ''}` : 'chosen on the map'}
            </span>
            <button type="button" className="font-semibold text-accent hover:text-accent-hover" onClick={() => onChange(null)}>
              Clear
            </button>
          </p>
        ) : (
          <p className="text-fg-muted">No place chosen yet.</p>
        )}
        {geoMessage && <p className="text-warning">{geoMessage}</p>}
      </div>

      {value?.accuracyM && value.accuracyM > 100 && (
        <p className="mt-1 text-sm text-warning">
          Your phone is only sure to within {value.accuracyM} m. Tap the exact spot on the map to correct it.
        </p>
      )}

      {mapFailed ? (
        <p role="alert" className="mt-3 rounded bg-warning-soft px-3 py-3 text-sm text-warning">
          The map could not load. Use &quot;Use my position&quot;, or name the place in the box below.
        </p>
      ) : (
        <div
          ref={containerRef}
          role="application"
          aria-label="Map. Tap to choose where the waste is."
          className="mt-3 h-64 w-full overflow-hidden rounded-lg bg-panel sm:h-80"
        />
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
