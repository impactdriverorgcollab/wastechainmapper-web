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
    <div className="h-dvh flex flex-col bg-surface">
      {/* Header bar */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border bg-surface-1 shrink-0 gap-2 min-h-0">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold tracking-tight text-text whitespace-nowrap">DELTAFLOW ATLAS</span>
          <span className="text-2xs text-text-dim uppercase tracking-widest hidden sm:block whitespace-nowrap">
            Rivers State · Niger Delta
          </span>
        </div>
        <nav className="flex items-center gap-3 text-xs text-text-secondary overflow-x-auto scrollbar-none shrink-0 max-w-[60vw] sm:max-w-none">
          <a href="/map"         className="hover:text-text whitespace-nowrap">Map</a>
          <a href="/flows"       className="hover:text-text whitespace-nowrap hidden xs:block sm:block">Flows</a>
          <a href="/water"       className="hover:text-text whitespace-nowrap hidden sm:block">Water</a>
          <a href="/stakeholder" className="hover:text-text whitespace-nowrap hidden md:block">Stakeholder</a>
          <a href="/analytics"   className="hover:text-text whitespace-nowrap hidden md:block">Analytics</a>
          <a href="/admin"       className="hover:text-text whitespace-nowrap">Admin</a>
        </nav>
      </header>

      {/* Map + Legend overlay */}
      <div className="relative flex-1 overflow-hidden min-h-0">
        <Suspense>
          <WasteMap />
        </Suspense>
        {/* Legend — hidden on small screens to preserve map space */}
        <div className="absolute bottom-6 right-3 z-10 hidden md:block">
          <ConfidenceLegend />
        </div>
      </div>
    </div>
  );
}
