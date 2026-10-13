'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Download } from 'lucide-react';
import { getAllSites } from '@/lib/api';
import { RIVERS_STATE_LGAS, TIER_INFO, WASTE_TYPE_LABELS } from '@/lib/constants';
import { downloadCsv } from '@/lib/csv';
import { plural } from '@/lib/format';
import type { ConfidenceTier, WasteType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { StatGridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { TierLabel } from '@/components/ui/Badge';
import { SiteTable } from './SiteTable';

export function SiteRegister() {
  const { data: sites, error, isLoading, isValidating, mutate } = useSWR('sites-all', () => getAllSites(), {
    revalidateOnFocus: false,
  });

  const [lga, setLga] = useState('');
  const [tier, setTier] = useState<ConfidenceTier | ''>('');
  const [wasteType, setWasteType] = useState<WasteType | ''>('');

  const filtered = useMemo(
    () =>
      (sites ?? []).filter(
        (s) => (!lga || s.lga === lga) && (!tier || s.confidenceTier === tier) && (!wasteType || s.wasteType === wasteType),
      ),
    [sites, lga, tier, wasteType],
  );

  const count = (t: ConfidenceTier) => filtered.filter((s) => s.confidenceTier === t).length;
  const hasFilters = !!(lga || tier || wasteType);

  function exportCsv() {
    downloadCsv(`wastechainmapper-sites-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['ID', 'LGA', 'Ward', 'Community', 'Confidence', 'Waste type', 'Status', 'First seen', 'Latitude', 'Longitude'],
      ...filtered.map((s) => [
        s.id, s.lga, s.ward, s.communityName, TIER_INFO[s.confidenceTier].label,
        WASTE_TYPE_LABELS[s.wasteType], s.status, s.firstSeenAt, s.latitude, s.longitude,
      ]),
    ]);
  }

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} retrying={isValidating} />;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <StatGridSkeleton />
      ) : (
        <StatGrid>
          <StatCard label="Sites shown" value={filtered.length} />
          <StatCard label={<TierLabel tier="HIGH" />} value={count('HIGH')} />
          <StatCard label={<TierLabel tier="MEDIUM" />} value={count('MEDIUM')} />
          <StatCard label={<TierLabel tier="LOW" />} value={count('LOW')} />
        </StatGrid>
      )}

      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Filter sites"
      >
        <SelectField label="Local government area" value={lga} onChange={(e) => setLga(e.target.value)}>
          <option value="">All areas</option>
          {RIVERS_STATE_LGAS.map((l) => <option key={l} value={l}>{l}</option>)}
        </SelectField>
        <SelectField label="Confidence" value={tier} onChange={(e) => setTier(e.target.value as ConfidenceTier | '')}>
          <option value="">All levels</option>
          {(['HIGH', 'MEDIUM', 'LOW'] as const).map((t) => (
            <option key={t} value={t}>{TIER_INFO[t].label}</option>
          ))}
        </SelectField>
        <SelectField label="Waste type" value={wasteType} onChange={(e) => setWasteType(e.target.value as WasteType | '')}>
          <option value="">All types</option>
          {Object.entries(WASTE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </SelectField>
        <Button onClick={exportCsv} disabled={filtered.length === 0}>
          <Download size={16} aria-hidden="true" />
          Download CSV
        </Button>
      </form>

      {isLoading ? (
        <TableSkeleton columns={7} />
      ) : filtered.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No sites match these filters"
            action={<Button onClick={() => { setLga(''); setTier(''); setWasteType(''); }}>Clear filters</Button>}
          >
            Try a different area, confidence level or waste type.
          </EmptyState>
        ) : (
          <EmptyState title="No dump sites yet">
            Sites appear here when the scraper finds a news story about dumping in a named community, or when a reviewer adds one.
          </EmptyState>
        )
      ) : (
        <>
          <SiteTable sites={filtered} />
          <p className="text-sm text-fg-muted">
            {plural(filtered.length, 'site')}. Pins mark the middle of the named community, not the exact spot.
          </p>
        </>
      )}
    </div>
  );
}
