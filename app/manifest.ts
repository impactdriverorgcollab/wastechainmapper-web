import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WasteChainMapper field records',
    short_name: 'Field records',
    description: 'Record waste sites in the field, with or without signal.',
    start_url: '/field',
    scope: '/',
    display: 'standalone',
    background_color: '#0E1218',
    theme_color: '#0E1218',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
