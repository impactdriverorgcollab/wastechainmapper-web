'use client';

import { useId, useMemo, useState } from 'react';
import useSWR from 'swr';
import { MapPin, Search, X } from 'lucide-react';
import { getGazetteer } from '@/lib/api';
import { SETTING_LABELS, TIER_INFO, WASTE_CATEGORY_INFO } from '@/lib/constants';
import { formatNumber, plural } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { DumpSite } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { SEVERITY_FROM, SEVERITY_LABELS } from './mapLayers';

// ── Search for a place ────────────────────────────────────────────────────────

export interface FoundPlace { lng: number; lat: number; label: string }

const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** Type a community, a ward or a pair of coordinates. Matches come from the place list the platform already holds. */
export function MapSearch({ sites, onPick }: { sites: DumpSite[]; onPick: (p: FoundPlace) => void }) {
  const id = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const places = useSWR('gazetteer', getGazetteer, { revalidateOnFocus: false });

  const results = useMemo<FoundPlace[]>(() => {
    const q = text.trim().toLowerCase();
    if (q.length < 2) return [];
    const typed = COORDS.exec(text);
    if (typed) {
      const lat = Number(typed[1]);
      const lng = Number(typed[2]);
      if (lat >= 3.5 && lat <= 6.5 && lng >= 5 && lng <= 8.5) return [{ lat, lng, label: `Coordinates ${lat}, ${lng}` }];
    }
    const out: FoundPlace[] = [];
    for (const p of places.data ?? []) {
      if (p.centroidLat == null || p.centroidLng == null) continue;
      if (p.communityName.toLowerCase().includes(q) || p.aliases.some((a) => a.toLowerCase().includes(q))) {
        out.push({ lat: p.centroidLat, lng: p.centroidLng, label: `${p.communityName}, ${p.lga}` });
        if (out.length >= 8) break;
      }
    }
    for (const s of sites) {
      if (out.length >= 10) break;
      if (s.latitude != null && s.longitude != null && s.communityName?.toLowerCase().includes(q) && !out.some((o) => o.label.startsWith(s.communityName!))) {
        out.push({ lat: s.latitude, lng: s.longitude, label: `${s.communityName}, ${s.lga ?? 'area not known'} (site)` });
      }
    }
    return out;
  }, [text, places.data, sites]);

  function pick(p: FoundPlace) {
    setText(p.label);
    setOpen(false);
    onPick(p);
  }

  return (
    <div className="relative w-full" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <label htmlFor={id} className="sr-only">Search for a place</label>
      <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-fg-muted" />
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        value={text}
        placeholder="Place or coordinates"
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && results[0]) { e.preventDefault(); pick(results[0]); }
        }}
        className="input !pl-10 shadow-raised"
      />
      {open && text.trim().length >= 2 && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg bg-panel py-1 shadow-overlay">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-fg-muted">{places.isLoading ? 'Loading places' : 'No match. Try the community name, or latitude and longitude such as 4.8156, 7.0498.'}</li>
          ) : results.map((r) => (
            <li key={r.label} role="option" aria-selected="false">
              <button type="button" onClick={() => pick(r)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-fg hover:bg-panel-3">
                <MapPin size={14} aria-hidden="true" className="shrink-0 text-accent" />
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Hotspot severity key ─────────────────────────────────────────────────────

/** The floating key from the reference design: colour is the severity, the size of the zone is the number of sites. */
export function SeverityLegend() {
  const { colors } = useTheme();
  return (
    <div className="w-56 rounded-lg bg-panel p-3 shadow-raised" role="group" aria-label="Hotspot severity">
      <p className="text-sm font-semibold text-fg">Hotspot severity</p>
      <ul className="mt-2 space-y-1">
        {[3, 2, 1, 0].map((i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-fg">
            <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.severity[i] }} />
            <span className="flex-1">{SEVERITY_LABELS[i]}</span>
            <span className="tabular text-xs text-fg-muted">{i === 3 ? `${SEVERITY_FROM[3]} or more` : i === 0 ? `under ${SEVERITY_FROM[1]}` : `${SEVERITY_FROM[i]} to ${SEVERITY_FROM[i + 1]}`}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-fg-muted">A bigger zone means more sites. The score is a way to rank groups, not a prediction.</p>
    </div>
  );
}

// ── Density controls ─────────────────────────────────────────────────────────

export function HeatControls({ radius, strength, onRadius, onStrength }: { radius: number; strength: number; onRadius: (n: number) => void; onStrength: (n: number) => void }) {
  const a = useId();
  const b = useId();
  return (
    <div className="w-64 rounded-lg bg-panel p-3 shadow-raised" role="group" aria-label="Hotspot analysis">
      <p className="text-sm font-semibold text-fg">Hotspot analysis</p>
      <div className="mt-2">
        <label htmlFor={a} className="flex justify-between text-sm text-fg-muted"><span>Radius</span><span className="tabular text-fg">{radius}</span></label>
        <input id={a} type="range" min={10} max={80} step={2} value={radius} onChange={(e) => onRadius(Number(e.target.value))} className="block h-11 w-full accent-accent" />
      </div>
      <div>
        <label htmlFor={b} className="flex justify-between text-sm text-fg-muted"><span>Strength</span><span className="tabular text-fg">{strength.toFixed(1)}</span></label>
        <input id={b} type="range" min={0.5} max={4} step={0.1} value={strength} onChange={(e) => onStrength(Number(e.target.value))} className="block h-11 w-full accent-accent" />
      </div>
    </div>
  );
}

// ── Draw an area ─────────────────────────────────────────────────────────────

interface DrawProps {
  corners: [number, number][];
  closed: boolean;
  inside: DumpSite[];
  areaKm2: number;
  onUndo: () => void;
  onFinish: () => void;
  onClear: () => void;
}

/** Draw a shape on the map and see what is inside it. Counts come from the sites currently shown. */
export function DrawCard({ corners, closed, inside, areaKm2, onUndo, onFinish, onClear }: DrawProps) {
  const { colors } = useTheme();
  const tiers = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const kinds = new Map<string, number>();
  const settings = new Map<string, number>();
  for (const s of inside) {
    tiers[s.confidenceTier]++;
    if (s.category) kinds.set(WASTE_CATEGORY_INFO[s.category].label, (kinds.get(WASTE_CATEGORY_INFO[s.category].label) ?? 0) + 1);
    if (s.setting) settings.set(SETTING_LABELS[s.setting], (settings.get(SETTING_LABELS[s.setting]) ?? 0) + 1);
  }
  const top = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ${n}`).join(', ');

  return (
    <div role="dialog" aria-label="Draw an area" className="rounded-lg bg-panel shadow-overlay sm:w-80">
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div>
          <h2 className="text-base font-semibold text-fg">Draw an area</h2>
          <p className="text-sm text-fg-muted">
            {!closed && corners.length < 3 && 'Tap the map to place the corners of the area. You need at least three.'}
            {!closed && corners.length >= 3 && `${plural(corners.length, 'corner')} placed. Keep tapping, or finish the shape.`}
            {closed && 'Everything inside the shape, from the sites on the map now.'}
          </p>
        </div>
        <button type="button" onClick={onClear} aria-label="Close and clear the area" className="btn-ghost -mr-2 -mt-2 shrink-0"><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="space-y-3 px-4 pb-4 text-sm">
        {!closed ? (
          <div className="flex gap-2">
            <Button onClick={onUndo} disabled={corners.length === 0}>Undo last corner</Button>
            <Button variant="primary" onClick={onFinish} disabled={corners.length < 3}>Finish shape</Button>
          </div>
        ) : (
          <>
            <p className="font-semibold text-fg">{plural(inside.length, 'site')} in {formatNumber(areaKm2, areaKm2 < 10 ? 2 : 1)} km²</p>
            {inside.length > 0 && (
              <ul className="space-y-1 text-fg-muted">
                <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.tierHigh }} />{tiers.HIGH} {TIER_INFO.HIGH.label.toLowerCase()}</li>
                <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.tierMedium }} />{tiers.MEDIUM} {TIER_INFO.MEDIUM.label.toLowerCase()}</li>
                <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.tierLow }} />{tiers.LOW} {TIER_INFO.LOW.label.toLowerCase()}</li>
              </ul>
            )}
            {kinds.size > 0 && <p className="text-fg-muted">Most common kinds: {top(kinds)}.</p>}
            {settings.size > 0 && <p className="text-fg-muted">Mostly: {top(settings).toLowerCase()}.</p>}
            {inside.length > 0 && <p className="text-fg-subtle text-xs">{inside.length / Math.max(areaKm2, 0.01) < 100 ? `About ${formatNumber(inside.length / Math.max(areaKm2, 0.01), 1)} sites per km².` : ''} Counts reported sites, so an area with few is not proof of clean ground.</p>}
            <Button onClick={onClear}>Draw a new area</Button>
          </>
        )}
      </div>
    </div>
  );
}
