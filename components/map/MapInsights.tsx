'use client';

import { SETTING_LABELS, TIER_INFO, WASTE_CATEGORY_INFO } from '@/lib/constants';
import { useTheme } from '@/lib/theme';
import type { DumpSite, SiteSetting, WasteCategory } from '@/lib/types';

/** Colours for the slices. Fixed order, so a category keeps its colour as filters change. Each is also named in the list. */
const SLICES = ['#2C7FB8', '#E0721A', '#6DAA55', '#D98E04', '#7A6A4F', '#0F8F7A', '#8A948C', '#B3261E'];

function Donut({ parts, total }: { parts: { label: string; value: number; color: string }[]; total: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="mx-auto h-32 w-32 shrink-0 -rotate-90" role="img" aria-label={`Share of sites by kind of waste. ${total} sites.`}>
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="14" className="stroke-panel-3" />
      {parts.map((p) => {
        const len = (p.value / total) * c;
        const el = <circle key={p.label} cx="50" cy="50" r={r} fill="none" strokeWidth="14" stroke={p.color} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
        offset += len;
        return el;
      })}
    </svg>
  );
}

function tally<K extends string>(sites: DumpSite[], pick: (s: DumpSite) => K | undefined): [K, number][] {
  const m = new Map<K, number>();
  for (const s of sites) { const k = pick(s); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

/** Charts of the sites the map is showing now, so they follow the filters and the history slider. */
export function MapInsights({ sites }: { sites: DumpSite[] }) {
  const { colors } = useTheme();
  if (sites.length === 0) return <p className="px-4 py-6 text-sm text-fg-muted">No sites are showing, so there is nothing to chart. Clear a filter or move the history slider forward.</p>;

  const byCategory = tally<WasteCategory>(sites, (s) => s.category);
  const bySetting = tally<SiteSetting>(sites, (s) => s.setting);
  const byTier = (['HIGH', 'MEDIUM', 'LOW'] as const).map((t) => ({ tier: t, n: sites.filter((s) => s.confidenceTier === t).length }));
  const maxSetting = Math.max(1, ...bySetting.map(([, n]) => n));
  const parts = byCategory.map(([k, n], i) => ({ label: WASTE_CATEGORY_INFO[k].label, value: n, color: SLICES[i % SLICES.length] }));
  const tierColor = { HIGH: colors.tierHigh, MEDIUM: colors.tierMedium, LOW: colors.tierLow };

  return (
    <div className="space-y-5 p-4">
      <section aria-labelledby="mi-certainty">
        <h3 id="mi-certainty" className="text-sm font-semibold text-fg">How sure we are</h3>
        <ul className="mt-2 space-y-1">
          {byTier.map(({ tier, n }) => (
            <li key={tier} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: tierColor[tier] }} />
              <span className="flex-1 text-fg">{TIER_INFO[tier].label}</span>
              <span className="tabular text-fg-muted">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mi-kind">
        <h3 id="mi-kind" className="text-sm font-semibold text-fg">Kind of waste</h3>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Donut parts={parts} total={sites.length} />
          <ul className="w-full space-y-1">
            {parts.map((p) => (
              <li key={p.label} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="flex-1 text-fg">{p.label}</span>
                <span className="tabular text-fg-muted">{p.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="mi-where">
        <h3 id="mi-where" className="text-sm font-semibold text-fg">Where the waste is</h3>
        <ul className="mt-2 space-y-2">
          {bySetting.map(([k, n]) => (
            <li key={k} className="text-sm">
              <div className="flex justify-between gap-2"><span className="text-fg">{SETTING_LABELS[k]}</span><span className="tabular text-fg-muted">{n}</span></div>
              <span aria-hidden="true" className="mt-1 block h-2 rounded-full bg-panel-3"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round((n / maxSetting) * 100)}%` }} /></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
