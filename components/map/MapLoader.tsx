'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// MapLibre needs the browser, so it loads on the client only, and only on this page.
const WasteMap = dynamic(() => import('./WasteMap'), {
  ssr: false,
  loading: () => (
    <div role="status" aria-label="Loading the map" className="h-full w-full p-3">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

export function MapLoader() {
  return <WasteMap />;
}
