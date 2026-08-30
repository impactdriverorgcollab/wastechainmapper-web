import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { ConfidenceLegend } from '@/components/map/ConfidenceLegend';

// MapLibre GL is browser-only — must be loaded without SSR
const WasteMap = dynamic(() => import('@/components/map/WasteMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-surface text-text-dim text-sm">
      Loading map…
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Header bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-text">WASTEWATCH</span>
          <span className="text-2xs text-text-dim uppercase tracking-widest">Rivers State</span>
        </div>
        <nav className="flex items-center gap-4 text-xs text-text-secondary">
          <a href="/map" className="hover:text-text">Map</a>
          <a href="/stakeholder" className="hover:text-text">Stakeholder View</a>
          <a href="/admin" className="hover:text-text">Admin</a>
        </nav>
      </header>

      {/* Map + Legend overlay */}
      <div className="relative flex-1 overflow-hidden">
        <Suspense>
          <WasteMap />
        </Suspense>
        <div className="absolute bottom-6 left-4 z-10">
          <ConfidenceLegend />
        </div>
      </div>
    </div>
  );
}
