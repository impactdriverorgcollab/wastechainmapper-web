'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// MapLibre needs the browser, so it loads on the client only, and only on this page.
const HotspotsView = dynamic(() => import('./HotspotsView').then((m) => m.HotspotsView), {
  ssr: false,
  loading: () => <div role="status" aria-label="Loading hotspots"><Skeleton className="h-96 w-full" /></div>,
});

export function HotspotsLoader() {
  return <HotspotsView />;
}
