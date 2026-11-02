import type { StyleSpecification } from 'maplibre-gl';
import type { ThemeName } from './palette';

export type Basemap = 'streets' | 'satellite';

// The street style follows the theme. NEXT_PUBLIC_MAP_STYLE can name the dark one. The light one is
// found by dropping "_dark" from its name, which is how the provider names its pairs.
const DARK_STREETS = process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';
const LIGHT_STREETS = DARK_STREETS.replace('_dark', '');

// Labels on the map need fonts. The satellite background has none of its own, so it names a free set.
const SATELLITE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    imagery: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'imagery', type: 'raster', source: 'imagery' }],
};

export function mapStyleFor(theme: ThemeName, basemap: Basemap): string | StyleSpecification {
  if (basemap === 'satellite') return SATELLITE;
  return theme === 'dark' ? DARK_STREETS : LIGHT_STREETS;
}

/** Kept for places that only need the default background. */
export const MAP_STYLE = LIGHT_STREETS;
