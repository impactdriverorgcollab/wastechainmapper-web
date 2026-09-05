'use client';

import { useState, useEffect } from 'react';

export type LayerId =
  | 'dump-sites'
  | 'collection-points'
  | 'flow-lines'
  | 'heatmap'
  | 'facilities'
  | 'water-sources'
  | 'water-anomalies'
  | 'flood-zones';

export interface LayerState {
  id: LayerId;
  label: string;
  color: string;
  enabled: boolean;
}

export const DEFAULT_LAYERS: LayerState[] = [
  { id: 'dump-sites',        label: 'Dump sites',        color: '#B94040', enabled: true  },
  { id: 'heatmap',           label: 'Waste heatmap',     color: '#f97316', enabled: false },
  { id: 'flow-lines',        label: 'Collection flow',   color: '#4a5568', enabled: true  },
  { id: 'collection-points', label: 'Collection points', color: '#22c55e', enabled: true  },
  { id: 'facilities',        label: 'Facilities',        color: '#3b82f6', enabled: true  },
  { id: 'water-sources',     label: 'Water sources',     color: '#60a5fa', enabled: false },
  { id: 'water-anomalies',   label: 'Water anomalies',   color: '#a855f7', enabled: false },
  { id: 'flood-zones',       label: 'Flood-risk zones',  color: '#f59e0b', enabled: false },
];

interface Props {
  layers: LayerState[];
  onToggle: (id: LayerId) => void;
}

export function LayerControl({ layers, onToggle }: Props) {
  // Start collapsed on mobile, expanded on desktop
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.innerWidth >= 768);
  }, []);

  const activeCount = layers.filter((l) => l.enabled).length;

  return (
    <div className="bg-surface-1 border border-border text-xs">
      {/* Toggle header — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-surface-2 transition-colors"
      >
        <span className="text-text-secondary font-medium uppercase tracking-widest text-2xs">
          Layers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-text-dim text-2xs tabular-nums">{activeCount}/{layers.length}</span>
          <span className="text-text-dim text-xs">{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {/* Layer list — collapsible */}
      {open && (
        <div className="px-3 pb-2 space-y-1.5 border-t border-border pt-2">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => onToggle(layer.id)}
              className="flex items-center gap-2 w-full text-left hover:text-text transition-colors"
            >
              <span
                className="shrink-0 rounded-sm border"
                style={{
                  width: 11,
                  height: 11,
                  background: layer.enabled ? layer.color : 'transparent',
                  borderColor: layer.color,
                  opacity: layer.enabled ? 1 : 0.45,
                }}
              />
              <span className={layer.enabled ? 'text-text-secondary' : 'text-text-dim'}>
                {layer.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
