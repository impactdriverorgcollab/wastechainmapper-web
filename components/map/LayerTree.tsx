'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import {
  FACILITY_TYPE_COLORS, FACILITY_TYPE_LABELS, FLOOD_RISK_COLORS, FLOOD_RISK_LABELS, FLOW_STATUS_COLORS, FLOW_STATUS_LABELS,
  TIER_INFO, WATER_ANOMALY_COLORS, WATER_ANOMALY_LABELS,
} from '@/lib/constants';
import { useTheme } from '@/lib/theme';
import type { Theme } from '@/lib/palette';
import { SEVERITY_FROM, SEVERITY_LABELS, type LayerId } from './mapLayers';

type Shape = 'pin' | 'dot' | 'line' | 'dash' | 'area';
interface LegendItem { color: string; label: string; note?: string; shape?: Shape }

interface LayerDef {
  id: LayerId;
  label: string;
  color: (c: Theme) => string;
  shape: Shape;
  note?: string;
  legend?: (c: Theme) => LegendItem[];
}

interface Group { title: string; layers: LayerDef[] }

const GROUPS: Group[] = [
  {
    title: 'Waste reports',
    layers: [
      {
        id: 'dump-sites', label: 'Reported sites', color: (c) => c.tierHigh, shape: 'pin',
        note: 'A pin per site. Bigger pins with a tick are more certain. A mapped site does not prove the waste is still there.',
        legend: (c) => (['HIGH', 'MEDIUM', 'LOW'] as const).map((t) => ({
          color: { HIGH: c.tierHigh, MEDIUM: c.tierMedium, LOW: c.tierLow }[t], label: TIER_INFO[t].label, note: TIER_INFO[t].description, shape: 'pin' as const,
        })),
      },
      {
        id: 'hotspots', label: 'Hotspots', color: (c) => c.severity[2], shape: 'dot',
        note: 'Sites that sit close together. The zone grows with the number of sites.',
        legend: (c) => c.severity.map((color, i) => ({
          color, label: SEVERITY_LABELS[i], note: i === 3 ? `Score ${SEVERITY_FROM[3]} or more` : i === 0 ? `Score under ${SEVERITY_FROM[1]}` : `Score ${SEVERITY_FROM[i]} to ${SEVERITY_FROM[i + 1] - 0.1}`, shape: 'dot' as const,
        })),
      },
      {
        id: 'area-mentions', label: 'News by area', color: (c) => c.severity[1], shape: 'area',
        note: 'Stories that name a local government area but no exact place, so they get no pin. It counts stories, not sites, and nobody has checked them. Tap an area to read them.',
      },
      {
        id: 'heatmap', label: 'Density', color: (c) => c.severity[1], shape: 'area',
        legend: (c) => [{ color: c.severity[0], label: 'Few sites nearby', shape: 'area' }, { color: c.severity[3], label: 'Many sites nearby', shape: 'area' }],
      },
    ],
  },
  {
    title: 'Where the waste is',
    layers: [
      { id: 'setting-land', label: 'On land', color: (c) => c.fgMuted, shape: 'pin', note: 'Each switch shows or hides the sites of one kind. A site sits in one kind only, from what the reporter chose.' },
      { id: 'setting-drain', label: 'In drains', color: (c) => c.drain, shape: 'pin' },
      { id: 'setting-waterway', label: 'In rivers, creeks and canals', color: (c) => c.waterway, shape: 'pin' },
      { id: 'setting-coastal', label: 'On the coast or shore', color: (c) => c.waterSource, shape: 'pin' },
      { id: 'setting-disposal', label: 'At a disposal facility', color: () => FACILITY_TYPE_COLORS.LANDFILL, shape: 'pin' },
      { id: 'sewage', label: 'Sewage-related', color: (c) => c.severity[2], shape: 'pin', note: 'Sites recorded as human waste or sewage, wherever they are.' },
    ],
  },
  {
    title: 'Waste handling',
    layers: [
      { id: 'collection-points', label: 'Collection points', color: (c) => c.collectionPoint, shape: 'dot' },
      {
        id: 'facilities', label: 'Facilities', color: () => FACILITY_TYPE_COLORS.RECYCLING, shape: 'dot',
        legend: () => (Object.keys(FACILITY_TYPE_COLORS) as (keyof typeof FACILITY_TYPE_COLORS)[]).map((t) => ({
          color: FACILITY_TYPE_COLORS[t], label: FACILITY_TYPE_LABELS[t], shape: 'dot' as const,
        })),
      },
      {
        id: 'waste-routes', label: 'Waste routes', color: () => FLOW_STATUS_COLORS.IN_TRANSIT, shape: 'dash',
        legend: () => (['COLLECTED', 'IN_TRANSIT', 'DELIVERED', 'PROCESSED'] as const).map((s) => ({ color: FLOW_STATUS_COLORS[s], label: FLOW_STATUS_LABELS[s], shape: 'dash' as const })),
      },
      { id: 'nearest-lines', label: 'Nearest collection point', color: () => '#68758A', shape: 'dash', note: 'Estimated. A straight line drawn by the map, not a recorded route.' },
    ],
  },
  {
    title: 'Around the sites (OpenStreetMap)',
    layers: [
      { id: 'waterways', label: 'Rivers, creeks and canals', color: (c) => c.waterway, shape: 'line' },
      { id: 'drains', label: 'Drains and culverts', color: (c) => c.drain, shape: 'dash', note: 'Only drains that volunteers have mapped. A gap does not mean there is no drain.' },
      { id: 'schools', label: 'Schools', color: (c) => c.school, shape: 'dot' },
      { id: 'health', label: 'Health facilities', color: (c) => c.health, shape: 'dot' },
    ],
  },
  {
    title: 'Water and flooding',
    layers: [
      { id: 'water-sources', label: 'Water sources', color: (c) => c.waterSource, shape: 'dot' },
      {
        id: 'water-anomalies', label: 'Open water problems', color: () => WATER_ANOMALY_COLORS.CONTAMINATION, shape: 'dot',
        legend: () => (Object.keys(WATER_ANOMALY_COLORS) as (keyof typeof WATER_ANOMALY_COLORS)[]).map((t) => ({ color: WATER_ANOMALY_COLORS[t], label: WATER_ANOMALY_LABELS[t], shape: 'dot' as const })),
      },
      {
        id: 'flood-zones', label: 'Flood zones', color: () => FLOOD_RISK_COLORS.MEDIUM, shape: 'area',
        note: 'Includes where satellites saw floodwater in October 2022 (UNOSAT). That shows where it flooded then, not a forecast.',
        legend: () => (['HIGH', 'MEDIUM', 'LOW'] as const).map((r) => ({ color: FLOOD_RISK_COLORS[r], label: FLOOD_RISK_LABELS[r], shape: 'area' as const })),
      },
    ],
  },
  {
    title: 'Boundaries',
    layers: [
      { id: 'lga', label: 'Local government areas', color: (c) => c.lineStrong, shape: 'dash', note: 'The 23 areas of Rivers State, from OpenStreetMap.' },
      {
        id: 'data-gaps', label: 'Where data is thin', color: (c) => c.severity[1], shape: 'area',
        note: 'Areas shaded by how much checked data they have. An area with no sites is an area with no data, not an area with no waste.',
        legend: (c) => [
          { color: c.lineStrong, label: 'No checked data', shape: 'area' as const },
          { color: c.severity[1], label: 'Thin data', shape: 'area' as const },
        ],
      },
    ],
  },
];

function Swatch({ color, shape = 'dot' }: { color: string; shape?: Shape }) {
  if (shape === 'pin') return <MapPin size={16} aria-hidden="true" style={{ color }} className="shrink-0 fill-current" />;
  if (shape === 'line') return <span aria-hidden="true" className="h-1 w-4 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
  if (shape === 'dash') return <span aria-hidden="true" className="h-0 w-4 shrink-0 border-t-2 border-dashed" style={{ borderColor: color }} />;
  if (shape === 'area') return <span aria-hidden="true" className="h-3 w-4 shrink-0 rounded-sm" style={{ backgroundColor: color, opacity: 0.8 }} />;
  return <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

interface Props {
  enabled: Record<LayerId, boolean>;
  counts: Partial<Record<LayerId, number>>;
  onToggle: (id: LayerId) => void;
  onSetMany: (ids: LayerId[], on: boolean) => void;
}

function GroupBox({ group, enabled, counts, onToggle, onSetMany, colors }: Props & { group: Group; colors: Theme }) {
  const [open, setOpen] = useState(true);
  const boxRef = useRef<HTMLInputElement>(null);
  const ids = group.layers.map((l) => l.id);
  const on = ids.filter((id) => enabled[id]).length;

  // A group box that is part on shows a dash, as in a file tree.
  useEffect(() => { if (boxRef.current) boxRef.current.indeterminate = on > 0 && on < ids.length; }, [on, ids.length]);

  return (
    <section className="border-t border-line first:border-t-0">
      <div className="flex min-h-11 items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${group.title}`}
          className="btn-ghost !min-w-9 !px-2"
        >
          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        </button>
        <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-sm font-semibold text-fg">
          <input ref={boxRef} type="checkbox" className="h-5 w-5 accent-accent" checked={on === ids.length} onChange={() => onSetMany(ids, on !== ids.length)} />
          {group.title}
        </label>
      </div>
      {open && (
        <ul className="pb-2 pl-7">
          {group.layers.map((layer) => {
            const isOn = enabled[layer.id];
            const color = layer.color(colors);
            const count = counts[layer.id];
            return (
              <li key={layer.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded text-sm text-fg hover:bg-panel-3">
                  <input type="checkbox" className="h-5 w-5 accent-accent" checked={isOn} onChange={() => onToggle(layer.id)} />
                  <Swatch color={color} shape={layer.shape} />
                  <span className="flex-1">{layer.label}</span>
                  {isOn && count !== undefined && <span className="tabular text-fg-muted">{count}</span>}
                </label>
                {isOn && (layer.note || layer.legend) && (
                  <div className="mb-1 ml-8 rounded bg-panel-2 px-3 py-2 text-sm">
                    {layer.note && <p className="text-fg-muted">{layer.note}</p>}
                    {layer.legend && (
                      <ul className={`space-y-1 ${layer.note ? 'mt-2' : ''}`} aria-label={`Key for ${layer.label}`}>
                        {layer.legend(colors).map((item) => (
                          <li key={item.label} className="flex items-start gap-2">
                            <span className="mt-0.5"><Swatch color={item.color} shape={item.shape} /></span>
                            <span className="text-fg">{item.label}{item.note && <span className="block text-xs text-fg-muted">{item.note}</span>}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The layers, grouped like a file tree, each with its key. The key shows only while the layer is on. */
export function LayerTree(props: Props) {
  const { colors } = useTheme();
  return (
    <div>
      {GROUPS.map((g) => <GroupBox key={g.title} group={g} colors={colors} {...props} />)}
    </div>
  );
}
