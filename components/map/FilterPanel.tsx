'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  RIVERS_STATE_LGAS, SETTING_LABELS, SOURCE_TYPE_LABELS, VERIFICATION_STATUS_LABELS, WASTE_CATEGORY_INFO,
  WASTE_CATEGORY_ORDER, RISK_LABELS,
} from '@/lib/constants';
import type { ReportSourceType, SiteSetting, VerificationStatus, WasteCategory } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';

export interface MapFilters {
  lga: string;
  q: string;
  category: WasteCategory | '';
  verification: VerificationStatus | '';
  source: ReportSourceType | '';
  setting: SiteSetting | '';
  risk: 'high' | 'elevated' | '';
  from: string;
  to: string;
  minVolume: string;
  maxVolume: string;
  hazardous: boolean;
}

export const NO_FILTERS: MapFilters = {
  lga: '', q: '', category: '', verification: '', source: '', setting: '', risk: '', from: '', to: '', minVolume: '', maxVolume: '', hazardous: false,
};

export function filtersToParams(f: MapFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.lga) p.lga = f.lga;
  if (f.q.trim()) p.q = f.q.trim();
  if (f.category) p.category = f.category;
  if (f.verification) p.verification = f.verification;
  if (f.source) p.source = f.source;
  if (f.setting) p.setting = f.setting;
  if (f.risk) p.risk = f.risk;
  if (f.from) p.from = f.from;
  if (f.to) p.to = `${f.to}T23:59:59`;
  if (f.minVolume.trim() && Number.isFinite(Number(f.minVolume))) p.minVolume = f.minVolume.trim();
  if (f.maxVolume.trim() && Number.isFinite(Number(f.maxVolume))) p.maxVolume = f.maxVolume.trim();
  if (f.hazardous) p.hazardous = 'true';
  return p;
}

export const countFilters = (f: MapFilters) => Object.keys(filtersToParams(f)).length;

const SOURCE_CHOICES: ReportSourceType[] = ['NEWS_SCRAPE', 'WEB_FORM', 'EMAIL', 'SOCIAL_SUBMISSION', 'AMBASSADOR', 'PARTNER_RECORD'];

interface Props {
  applied: MapFilters;
  onApply: (f: MapFilters) => void;
}

/** The filters as a form that sits inside the map's side panel. Nothing changes until "Apply filters". */
export function FilterForm({ applied, onApply }: Props) {
  const [draft, setDraft] = useState<MapFilters>(applied);
  const active = countFilters(applied);

  useEffect(() => { setDraft(applied); }, [applied]);
  const set = <K extends keyof MapFilters>(k: K, v: MapFilters[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    onApply(draft);
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4">
      <TextField label="Search" optional value={draft.q} onChange={(e) => set('q', e.target.value)} placeholder="Community, ward or words" maxLength={100} />
      <SelectField label="Local government area" optional value={draft.lga} onChange={(e) => set('lga', e.target.value)}>
        <option value="">All 23</option>
        {RIVERS_STATE_LGAS.map((l) => <option key={l} value={l}>{l}</option>)}
      </SelectField>
      <SelectField label="Kind of waste" optional value={draft.category} onChange={(e) => set('category', e.target.value as WasteCategory | '')}>
        <option value="">Any</option>
        {WASTE_CATEGORY_ORDER.map((c) => <option key={c} value={c}>{WASTE_CATEGORY_INFO[c].label}</option>)}
      </SelectField>
      <SelectField label="How sure are we" optional value={draft.verification} onChange={(e) => set('verification', e.target.value as VerificationStatus | '')}>
        <option value="">Any</option>
        <option value="UNVERIFIED">Reported, not yet checked</option>
        <option value="CORROBORATED">{VERIFICATION_STATUS_LABELS.CORROBORATED}</option>
        <option value="FIELD_VERIFIED">{VERIFICATION_STATUS_LABELS.FIELD_VERIFIED}</option>
      </SelectField>
      <SelectField label="Where the waste is" optional value={draft.setting} onChange={(e) => set('setting', e.target.value as SiteSetting | '')}>
        <option value="">Anywhere</option>
        {(Object.keys(SETTING_LABELS) as SiteSetting[]).map((s) => <option key={s} value={s}>{SETTING_LABELS[s]}</option>)}
      </SelectField>
      <SelectField label="Source" optional value={draft.source} onChange={(e) => set('source', e.target.value as ReportSourceType | '')}>
        <option value="">Any</option>
        {SOURCE_CHOICES.map((s) => <option key={s} value={s}>{SOURCE_TYPE_LABELS[s]}</option>)}
      </SelectField>
      <SelectField label="Attention flag" optional value={draft.risk} onChange={(e) => set('risk', e.target.value as 'high' | 'elevated' | '')} hint="A way to sort sites for attention. It is not a finding about harm.">
        <option value="">Any</option>
        <option value="high">{RISK_LABELS.high} only</option>
        <option value="elevated">Elevated and high</option>
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Seen from" optional type="date" value={draft.from} onChange={(e) => set('from', e.target.value)} />
        <TextField label="Seen until" optional type="date" value={draft.to} onChange={(e) => set('to', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Least volume (m³)" optional inputMode="decimal" value={draft.minVolume} onChange={(e) => set('minVolume', e.target.value)} />
        <TextField label="Most volume (m³)" optional inputMode="decimal" value={draft.maxVolume} onChange={(e) => set('maxVolume', e.target.value)} />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-fg">
        <input type="checkbox" checked={draft.hazardous} onChange={(e) => set('hazardous', e.target.checked)} className="h-5 w-5 accent-accent" />
        Hazardous or medical waste only
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="flex-1">Apply filters</Button>
        <Button onClick={() => { setDraft(NO_FILTERS); onApply(NO_FILTERS); }} disabled={active === 0 && countFilters(draft) === 0}>Clear</Button>
      </div>
    </form>
  );
}
