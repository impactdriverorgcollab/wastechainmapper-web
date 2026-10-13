'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers, Table2 } from 'lucide-react';
import {
  FACILITY_TYPE_COLORS, FACILITY_TYPE_LABELS, FLOOD_RISK_COLORS, FLOOD_RISK_LABELS, FLOW_STATUS_COLORS,
  FLOW_STATUS_LABELS, TIER_INFO, WATER_ANOMALY_COLORS, WATER_ANOMALY_LABELS,
} from '@/lib/constants';
import { dataColors } from '@/lib/palette';
import type { LayerId } from './mapLayers';

interface Swatch { color: string; label: string }

interface LayerDef {
  id: LayerId;
  label: string;
  swatch: string;
  /** Extra explanation shown under the switch while the layer is on. */
  key?: { title?: string; items: (Swatch & { description?: string })[] };
  note?: string;
}

interface Group { title: string; layers: LayerDef[] }

const GROUPS: Group[] = [
  {
    title: 'Dump sites',
    layers: [
      {
        id: 'dump-sites',
        label: 'Dump sites',
        swatch: TIER_INFO.HIGH.hex,
        key: {
          title: 'How sure we are',
          items: (['HIGH', 'MEDIUM', 'LOW'] as const).map((t) => ({
            color: TIER_INFO[t].hex, label: TIER_INFO[t].label, description: TIER_INFO[t].description,
          })),
        },
        note: 'Larger dots are more certain. Pins mark the middle of the named community.',
      },
      { id: 'heatmap', label: 'Density of sites', swatch: dataColors.heat[2], key: {
        items: [
          { color: dataColors.heat[0], label: 'Few sites nearby' },
          { color: dataColors.heat[3], label: 'Many sites nearby' },
        ],
      } },
    ],
  },
  {
    title: 'Waste handling',
    layers: [
      { id: 'collection-points', label: 'Collection points', swatch: dataColors.collectionPoint },
      {
        id: 'facilities',
        label: 'Facilities',
        swatch: FACILITY_TYPE_COLORS.RECYCLING,
        key: { items: (Object.keys(FACILITY_TYPE_COLORS) as (keyof typeof FACILITY_TYPE_COLORS)[]).map((t) => ({
          color: FACILITY_TYPE_COLORS[t], label: FACILITY_TYPE_LABELS[t],
        })) },
      },
      {
        id: 'waste-routes',
        label: 'Waste routes',
        swatch: FLOW_STATUS_COLORS.IN_TRANSIT,
        key: { items: (['COLLECTED', 'IN_TRANSIT', 'DELIVERED', 'PROCESSED'] as const).map((s) => ({
          color: FLOW_STATUS_COLORS[s], label: FLOW_STATUS_LABELS[s],
        })) },
      },
      { id: 'nearest-lines', label: 'Nearest collection point (estimated)', swatch: dataColors.neutralLine,
        note: 'A straight line drawn by the map, not a recorded route.' },
    ],
  },
  {
    title: 'Water and flooding',
    layers: [
      { id: 'water-sources', label: 'Water sources', swatch: dataColors.waterSource },
      {
        id: 'water-anomalies',
        label: 'Open water problems',
        swatch: WATER_ANOMALY_COLORS.CONTAMINATION,
        key: { items: (Object.keys(WATER_ANOMALY_COLORS) as (keyof typeof WATER_ANOMALY_COLORS)[]).map((t) => ({
          color: WATER_ANOMALY_COLORS[t], label: WATER_ANOMALY_LABELS[t],
        })) },
      },
      {
        id: 'flood-zones',
        label: 'Flood-risk zones',
        swatch: FLOOD_RISK_COLORS.MEDIUM,
        key: { items: (['HIGH', 'MEDIUM', 'LOW'] as const).map((r) => ({ color: FLOOD_RISK_COLORS[r], label: FLOOD_RISK_LABELS[r] })) },
      },
    ],
  },
];

interface Props {
  enabled: Record<LayerId, boolean>;
  counts: Partial<Record<LayerId, number>>;
  onToggle: (id: LayerId) => void;
}

export function LayerPanel({ enabled, counts, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activeCount = Object.values(enabled).filter(Boolean).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="w-72 max-w-full rounded-lg bg-panel shadow-raised">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="layer-panel"
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-sm font-semibold text-fg hover:bg-panel-2"
      >
        <span className="flex items-center gap-2">
          <Layers size={16} aria-hidden="true" />
          Layers
        </span>
        <span className="flex items-center gap-2 text-fg-muted">
          <span className="tabular font-normal">{activeCount} of {Object.keys(enabled).length} on</span>
          <ChevronDown size={16} aria-hidden="true" className={open ? 'rotate-180' : ''} />
        </span>
      </button>

      {open && (
        <div id="layer-panel" className="max-h-64 overflow-y-auto border-t border-line px-3 pb-3 sm:max-h-96">
          {GROUPS.map((group) => (
            <fieldset key={group.title} className="mt-3">
              <legend className="mb-1 text-xs font-semibold text-fg-muted">{group.title}</legend>
              {group.layers.map((layer) => {
                const on = enabled[layer.id];
                const count = counts[layer.id];
                return (
                  <div key={layer.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded text-sm text-fg hover:bg-panel-2">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => onToggle(layer.id)}
                        className="h-5 w-5 shrink-0 accent-accent"
                      />
                      <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: layer.swatch }} />
                      <span className="flex-1">{layer.label}</span>
                      {count != null && <span className="tabular text-fg-muted">{count.toLocaleString('en-NG')}</span>}
                    </label>
                    {on && (layer.key || layer.note) && (
                      <div className="mb-2 ml-8 text-sm text-fg-muted">
                        {layer.key && (
                          <ul className="space-y-1">
                            {layer.key.items.map((item) => (
                              <li key={item.label} className="flex items-start gap-2">
                                <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                                <span>
                                  <span className="text-fg">{item.label}</span>
                                  {item.description && <span>. {item.description}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {layer.note && <p className="mt-1">{layer.note}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </fieldset>
          ))}

          <Link href="/stakeholder" className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover">
            <Table2 size={16} aria-hidden="true" />
            See the same sites as a table
          </Link>
        </div>
      )}
    </div>
  );
}
