'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import useSWR from 'swr';
import { getWasteSites } from '@/lib/api';
import {
  LEVEL_TREND_LABELS, RIVERS_STATE_LGAS, SETTING_LABELS, WASTE_CATEGORY_INFO, WASTE_CATEGORY_ORDER, BASIS_INFO,
} from '@/lib/constants';
import { compositionTotal, previewMass, volumeFromDimensions, type PileShape } from '@/lib/estimate';
import { formatNumber } from '@/lib/format';
import type { SiteSetting, SubmissionInput, WasteCategory, WasteLevelTrend, EstimateBasis, CompositionStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import dynamic from 'next/dynamic';
import type { PickedLocation } from './LocationPicker';
import { Skeleton } from '@/components/ui/Skeleton';
import { PhotoPicker, type PickedPhoto } from './PhotoPicker';

// The map is the heaviest part of the page, so it loads after the form is on screen.
const LocationPicker = dynamic(() => import('./LocationPicker').then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

export type FormVariant = 'public' | 'field';

export interface FormPhoto { dataUrl: string; capturedAt: string }

interface Props {
  variant: FormVariant;
  /** Runs when the form is valid. Throw an Error with a plain message to show it above the button. */
  onSubmit: (input: SubmissionInput, photos: FormPhoto[]) => Promise<void>;
  submitLabel: string;
  /** Field app: start from a known site, so the record updates it. */
  initialSite?: { id: string; name: string; latitude: number; longitude: number } | null;
  /** Shown above the button, for example "Saved on this phone". */
  footerNote?: ReactNode;
}

// Size guide. These are rough, standard sizes so that two people looking at the same pile give
// similar numbers. They fill in the length, width and height, which the person can still change.
const SIZE_GUIDE = [
  { key: 'small', label: 'A few bags or one bin', l: 1, w: 1, h: 0.5 },
  { key: 'medium', label: 'About the size of a car', l: 4, w: 2, h: 1 },
  { key: 'large', label: 'About the size of a bus', l: 10, w: 3, h: 1.5 },
  { key: 'xlarge', label: 'Bigger than a bus', l: 20, w: 8, h: 2 },
] as const;

const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
const isNum = (v: string) => v.trim() === '' || Number.isFinite(Number(v));

function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-base text-fg">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-accent" />
      <span>{children}</span>
    </label>
  );
}

function Section({ title, hint, children, target }: { title: string; hint?: string; children: ReactNode; target?: string }) {
  return (
    <fieldset className="space-y-3 rounded-lg bg-panel p-4 sm:p-5" data-target={target} tabIndex={target ? -1 : undefined}>
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="text-lg font-semibold text-fg" aria-hidden="true">{title}</h2>
        {hint && <p className="text-sm text-fg-muted">{hint}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function ObservationForm({ variant, onSubmit, submitLabel, initialSite, footerNote }: Props) {
  const field = variant === 'field';

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [location, setLocation] = useState<PickedLocation | null>(
    initialSite ? { latitude: initialSite.latitude, longitude: initialSite.longitude, origin: 'map_pin' } : null,
  );
  const [communityName, setCommunityName] = useState('');
  const [lga, setLga] = useState('');
  const [setting, setSetting] = useState<SiteSetting | ''>('');
  const [category, setCategory] = useState<WasteCategory | ''>('');
  const [isMixed, setIsMixed] = useState(false);
  const [siteId, setSiteId] = useState<string>(initialSite?.id ?? '');

  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [shape, setShape] = useState<PileShape>('HEAP');
  const [sizeKey, setSizeKey] = useState('');
  const [volumeBasis, setVolumeBasis] = useState<EstimateBasis>('FIELD_ESTIMATE');

  const [composition, setComposition] = useState<Record<string, string>>({});
  const [moisture, setMoisture] = useState('');
  const [moistureBasis, setMoistureBasis] = useState<EstimateBasis>('FIELD_ESTIMATE');

  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState('');
  const [blockedDrain, setBlockedDrain] = useState(false);
  const [entersWaterway, setEntersWaterway] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [hazardous, setHazardous] = useState(false);

  const [siteExists, setSiteExists] = useState<'' | 'yes' | 'no'>('');
  const [siteActive, setSiteActive] = useState<'' | 'yes' | 'no'>('');
  const [trend, setTrend] = useState<WasteLevelTrend>('UNKNOWN');
  const [collectionStatus, setCollectionStatus] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactDetail, setContactDetail] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  // Existing sites close to the chosen point: a hint for the public, and the way to update one for the field app.
  const near = useSWR(
    location ? ['near-sites', location.latitude.toFixed(4), location.longitude.toFixed(4)] : null,
    () => getWasteSites({ nearLat: location!.latitude, nearLng: location!.longitude, radiusM: 150, limit: 8 }),
    { revalidateOnFocus: false },
  );
  const nearby = near.data?.data ?? [];

  // ── Live figures ──
  const dims = { l: num(length), w: num(width), h: num(height) };
  const volume = dims.l && dims.w && dims.h && [dims.l, dims.w, dims.h].every(Number.isFinite)
    ? volumeFromDimensions(dims.l, dims.w, dims.h, shape)
    : null;
  const compNumbers = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(composition)) if (v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) > 0) out[k] = Number(v);
    return out;
  }, [composition]);
  const compTotal = compositionTotal(compNumbers);
  const compStatus: CompositionStatus = Object.keys(compNumbers).length === 0 ? 'UNKNOWN' : Math.abs(compTotal - 100) <= 0.5 ? 'FULL' : 'PARTIAL';
  const mass = field ? previewMass(volume, (category || 'MIXED_UNKNOWN') as WasteCategory, compNumbers, isMixed) : null;

  // An error goes away as soon as the thing it asked for is done.
  useEffect(() => {
    setErrors((prev) => {
      const next = { ...prev };
      if ((location || communityName.trim()) && next.location) delete next.location;
      if (setting && next.setting) delete next.setting;
      if ((photos.length > 0 || description.trim()) && next.description) delete next.description;
      if (consent && next.consent) delete next.consent;
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [location, communityName, setting, photos.length, description, consent]);

  useEffect(() => {
    if (!formError) return;
    formErrorRef.current?.focus();
  }, [formError]);

  function pickSize(key: string) {
    setSizeKey(key);
    const s = SIZE_GUIDE.find((x) => x.key === key);
    if (!s) return;
    setLength(String(s.l));
    setWidth(String(s.w));
    setHeight(String(s.h));
    setShape('HEAP');
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!location && !communityName.trim()) e.location = 'Choose where the waste is: use your position, tap the map, or name the place.';
    if (!setting) e.setting = 'Choose where the waste is: on land, in a drain, in a waterway, on the coast, or at a disposal facility.';
    if (photos.length === 0 && !description.trim()) e.description = 'Add a photo or write a few words about what you saw.';
    for (const [k, v] of [['length', length], ['width', width], ['height', height]] as const) {
      if (!isNum(v) || (v.trim() !== '' && Number(v) <= 0)) e[k] = 'Enter a number above zero, in metres.';
    }
    if (!isNum(moisture) || (moisture.trim() !== '' && (Number(moisture) < 0 || Number(moisture) > 100))) e.moisture = 'Enter a percentage from 0 to 100.';
    if (compStatus !== 'UNKNOWN' && compTotal > 100.5) e.composition = `The percentages add up to ${compTotal}. They must not be more than 100.`;
    if (!field && contactDetail.trim() && !consent) e.consent = 'Tick the box to allow us to use your report, or remove your contact details.';
    if (!field && !consent) e.consent = 'Tick the box to say we may use your report and photos.';
    return e;
  }

  function focusFirst(found: Record<string, string>) {
    const order = ['location', 'setting', 'description', 'length', 'width', 'height', 'moisture', 'composition', 'consent'];
    const key = order.find((k) => found[k]);
    if (!key) return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-target="${key}"]`) ?? document.getElementById(`field-${key}`);
      el?.scrollIntoView({ block: 'center' });
      el?.focus();
    });
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) { focusFirst(found); return; }

    const input: SubmissionInput = {
      setting: setting as SiteSetting,
      ...(description.trim() && { description: description.trim() }),
      ...(location && {
        latitude: Number(location.latitude.toFixed(6)),
        longitude: Number(location.longitude.toFixed(6)),
        locationOrigin: location.origin,
        ...(location.accuracyM && { gpsAccuracyM: location.accuracyM }),
      }),
      ...(communityName.trim() && { communityName: communityName.trim() }),
      ...(lga && { lga }),
      ...(category && { primaryCategory: category }),
      ...(conditions.trim() && { conditionsNote: conditions.trim() }),
      ...(sizeKey && { extentNote: SIZE_GUIDE.find((s) => s.key === sizeKey)?.label }),
      ...(dims.l && dims.w && dims.h && { lengthM: dims.l, widthM: dims.w, heightM: dims.h, shape, ...(field && { volumeBasis }) }),
      blockedDrain,
      entersWaterway,
      overflowingPoint: overflowing,
      isHazardous: hazardous || category === 'HAZARDOUS_MEDICAL',
      consentToUse: field ? true : consent,
      website: trap,
    };
    if (field) {
      if (siteId) input.siteId = siteId;
      if (Object.keys(compNumbers).length > 0) { input.composition = compNumbers; input.compositionStatus = compStatus; }
      if (isMixed) input.isMixed = true;
      if (moisture.trim()) { input.moisturePct = Number(moisture); input.moistureBasis = moistureBasis; }
      if (siteExists) input.siteExists = siteExists === 'yes';
      if (siteActive) input.siteActive = siteActive === 'yes';
      if (trend !== 'UNKNOWN') input.levelTrend = trend;
      if (collectionStatus.trim()) input.collectionStatus = collectionStatus.trim();
    } else {
      if (contactName.trim()) input.contactName = contactName.trim();
      if (contactDetail.trim()) input.contactDetail = contactDetail.trim();
    }

    setBusy(true);
    try {
      await onSubmit(input, photos.map((p) => ({ dataUrl: p.dataUrl, capturedAt: p.capturedAt })));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Your report was not sent. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => errors[k];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        <p ref={formErrorRef} tabIndex={-1} role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{formError}</p>
      )}

      {field && (
        <Section title="Which site is this?" hint="Update a site that is already on the map, or record a new one.">
          <div className="space-y-1">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg">
              <input type="radio" name="site" checked={siteId === ''} onChange={() => setSiteId('')} className="h-5 w-5 accent-accent" />
              A new place
            </label>
            {initialSite && (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg">
                <input type="radio" name="site" checked={siteId === initialSite.id} onChange={() => setSiteId(initialSite.id)} className="h-5 w-5 accent-accent" />
                {initialSite.name}
              </label>
            )}
            {nearby.filter((s) => s.id !== initialSite?.id).map((s) => (
              <label key={s.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg">
                <input type="radio" name="site" checked={siteId === s.id} onChange={() => setSiteId(s.id)} className="h-5 w-5 accent-accent" />
                <span>{s.communityName ?? 'Unnamed site'}<span className="text-fg-muted">, {Math.round(s.distanceM ?? 0)} m away</span></span>
              </label>
            ))}
          </div>
        </Section>
      )}

      <Section title="Photos" hint={field ? 'Photograph the waste from the same spot each time, so changes can be compared.' : 'A clear photo helps a lot. Do not photograph people or number plates.'}>
        <PhotoPicker photos={photos} onChange={setPhotos} max={field ? 6 : 4} />
      </Section>

      <Section title="Where is it?" target="location">
        <LocationPicker value={location} onChange={setLocation} />
        {err('location') && <p className="field-error" role="alert">{err('location')}</p>}
        {!field && !location && (
          <p className="text-sm text-fg-muted">Not at the place now? Name it below and a reviewer will find it.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Community or landmark"
            optional={!!location}
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder="Choba, near the market"
            maxLength={200}
            autoComplete="off"
          />
          <SelectField label="Local government area" optional value={lga} onChange={(e) => setLga(e.target.value)}>
            <option value="">Not sure</option>
            {RIVERS_STATE_LGAS.map((l) => <option key={l} value={l}>{l}</option>)}
          </SelectField>
        </div>
        {nearby.length > 0 && !field && (
          <p role="status" className="rounded bg-accent-soft px-3 py-3 text-sm text-fg">
            {nearby.length === 1 ? 'A site is' : `${nearby.length} sites are`} already on the map within 150 m
            {nearby[0].communityName ? `, including ${nearby[0].communityName}` : ''}. Send your report anyway. A reviewer will add it to the right site.
          </p>
        )}
      </Section>

      <Section title="What and where in the surroundings" target="setting">
        <div role="radiogroup" aria-label="Where the waste is" aria-describedby={err('setting') ? 'setting-error' : undefined} className="grid gap-1 sm:grid-cols-2">
          {(Object.keys(SETTING_LABELS) as SiteSetting[]).map((s) => (
            <label key={s} className="flex min-h-11 cursor-pointer items-center gap-3 rounded text-base text-fg hover:bg-panel-2">
              <input type="radio" name="setting" checked={setting === s} onChange={() => setSetting(s)} className="h-5 w-5 accent-accent" />
              {SETTING_LABELS[s]}
            </label>
          ))}
        </div>
        {err('setting') && <p id="setting-error" className="field-error">{err('setting')}</p>}

        <SelectField
          label="Kind of waste"
          optional
          value={category}
          onChange={(e) => setCategory(e.target.value as WasteCategory | '')}
          hint={category ? WASTE_CATEGORY_INFO[category].examples : 'Choose the main kind. If you are not sure, leave it and a reviewer will decide.'}
        >
          <option value="">Not sure</option>
          {WASTE_CATEGORY_ORDER.map((c) => <option key={c} value={c}>{WASTE_CATEGORY_INFO[c].label}</option>)}
        </SelectField>

        {category === 'HAZARDOUS_MEDICAL' && (
          <p role="note" className="rounded bg-warning-soft px-3 py-3 text-sm text-warning">
            Keep away from it and do not touch it. Take the photo from a distance. Reports of this kind are handled by a reviewer first and are not shown publicly with their photos.
          </p>
        )}

        <div>
          <Check id="chk-drain" checked={blockedDrain} onChange={setBlockedDrain}>The waste is blocking a drain</Check>
          <Check id="chk-water" checked={entersWaterway} onChange={setEntersWaterway}>The waste is going into water</Check>
          <Check id="chk-overflow" checked={overflowing} onChange={setOverflowing}>A collection point is overflowing</Check>
          {field && <Check id="chk-haz" checked={hazardous} onChange={setHazardous}>There is hazardous or medical waste</Check>}
          {field && <Check id="chk-mixed" checked={isMixed} onChange={setIsMixed}>The waste is mixed together</Check>}
        </div>
      </Section>

      <Section title="How much?" hint={field ? 'Measure if you can. Otherwise use the size guide and say how you got the figure.' : 'A rough idea is fine. Choose the nearest size.'}>
        <fieldset>
          <legend className="label">Size guide</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {SIZE_GUIDE.map((s) => (
              <label key={s.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded text-base text-fg hover:bg-panel-2">
                <input type="radio" name="size" checked={sizeKey === s.key} onChange={() => pickSize(s.key)} className="h-5 w-5 accent-accent" />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        {(field || sizeKey) && (
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Length (m)" optional inputMode="decimal" value={length} onChange={(e) => { setLength(e.target.value); setSizeKey(''); }} error={err('length')} />
            <TextField label="Width (m)" optional inputMode="decimal" value={width} onChange={(e) => { setWidth(e.target.value); setSizeKey(''); }} error={err('width')} />
            <TextField label="Height (m)" optional inputMode="decimal" value={height} onChange={(e) => { setHeight(e.target.value); setSizeKey(''); }} error={err('height')} />
          </div>
        )}

        {field && (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Shape of the pile" value={shape} onChange={(e) => setShape(e.target.value as PileShape)}>
              <option value="HEAP">A heap (counts as half a box)</option>
              <option value="BOX">A box shape, such as a skip or a drain section</option>
            </SelectField>
            <SelectField label="How did you get the size?" value={volumeBasis} onChange={(e) => setVolumeBasis(e.target.value as EstimateBasis)}>
              <option value="FIELD_ESTIMATE">I estimated it by eye</option>
              <option value="MEASURED">I measured it with a tape or wheel</option>
            </SelectField>
          </div>
        )}

        {volume != null && (
          <p role="status" className="rounded bg-panel-2 px-3 py-3 text-sm text-fg">
            About <span className="tabular font-semibold">{formatNumber(volume, 2)} m³</span>
            {mass && <> and about <span className="tabular font-semibold">{formatNumber(mass.massKg)} kg</span>, using {mass.densityKgM3} kg per m³</>}.
            {' '}This is {volumeBasis === 'MEASURED' && field ? 'worked out from your measurements' : 'a rough estimate'}, and it is stored that way. A photo cannot give an exact volume.
          </p>
        )}
      </Section>

      {field && (
        <Section title="What is in it?" hint="Estimate the share of each kind. If you give a full breakdown it must add up to 100.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-target="composition" tabIndex={-1}>
            {WASTE_CATEGORY_ORDER.map((c) => (
              <TextField
                key={c}
                label={`${WASTE_CATEGORY_INFO[c].label.split(' or ')[0]} (%)`}
                optional
                inputMode="decimal"
                value={composition[c] ?? ''}
                onChange={(e) => setComposition((prev) => ({ ...prev, [c]: e.target.value }))}
              />
            ))}
          </div>
          <p aria-live="polite" className={`text-sm ${err('composition') ? 'text-danger' : 'text-fg-muted'}`}>
            {compStatus === 'UNKNOWN' && 'No breakdown given. It will be saved as unknown.'}
            {compStatus === 'PARTIAL' && `Adds up to ${compTotal}. It will be saved as a partial breakdown.`}
            {compStatus === 'FULL' && 'Adds up to 100. It will be saved as a full breakdown.'}
            {err('composition') && ` ${err('composition')}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Moisture (%)" optional inputMode="decimal" value={moisture} onChange={(e) => setMoisture(e.target.value)} error={err('moisture')} hint="Only if you measured it, or can tell it is clearly wet or dry." />
            {moisture.trim() && (
              <SelectField label="How did you get the moisture?" value={moistureBasis} onChange={(e) => setMoistureBasis(e.target.value as EstimateBasis)} hint={`${BASIS_INFO[moistureBasis].description}.`}>
                <option value="FIELD_ESTIMATE">I judged it by eye. Experimental.</option>
                <option value="MEASURED">I measured it with a meter</option>
              </SelectField>
            )}
          </div>
        </Section>
      )}

      {field && (
        <Section title="The site today">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Does the site exist?" optional value={siteExists} onChange={(e) => setSiteExists(e.target.value as '' | 'yes' | 'no')}>
              <option value="">Not checked</option>
              <option value="yes">Yes, I am here and it is real</option>
              <option value="no">No, there is nothing here</option>
            </SelectField>
            <SelectField label="Is dumping still happening?" optional value={siteActive} onChange={(e) => setSiteActive(e.target.value as '' | 'yes' | 'no')}>
              <option value="">Not known</option>
              <option value="yes">Yes, it is still used</option>
              <option value="no">No, it has stopped</option>
            </SelectField>
            <SelectField label="Is the pile changing?" optional value={trend} onChange={(e) => setTrend(e.target.value as WasteLevelTrend)}>
              {(Object.keys(LEVEL_TREND_LABELS) as WasteLevelTrend[]).map((t) => <option key={t} value={t}>{LEVEL_TREND_LABELS[t]}</option>)}
            </SelectField>
            <TextField label="Collection status" optional value={collectionStatus} onChange={(e) => setCollectionStatus(e.target.value)} placeholder="Collected weekly, last on Monday" maxLength={300} />
          </div>
        </Section>
      )}

      <Section title="Tell us more" target="description">
        <TextAreaField
          label="What did you see?"
          optional={photos.length > 0}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={err('description')}
          maxLength={2000}
          hint="For example: how long it has been there, the smell, burning, standing water, whether children play nearby."
        />
        <TextAreaField label="Anything around it we should know?" optional value={conditions} onChange={(e) => setConditions(e.target.value)} maxLength={500} className="min-h-16" />
      </Section>

      {!field && (
        <Section title="About you" hint="All optional. Your name and contact details are used only if a reviewer needs to ask a question. They are never shown publicly.">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Your name" optional value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" maxLength={120} />
            <TextField label="Phone or email" optional value={contactDetail} onChange={(e) => setContactDetail(e.target.value)} autoComplete="email" maxLength={200} />
          </div>
          <div data-target="consent" tabIndex={-1}>
            <Check id="field-consent" checked={consent} onChange={setConsent}>
              WasteChainMapper may use my report and photos to map waste and share the results. I understand a reviewer checks them before anything is public.
            </Check>
            {err('consent') && <p className="field-error">{err('consent')}</p>}
          </div>
        </Section>
      )}

      {/* A field real people never see or fill. Automated form fillers do. */}
      <div aria-hidden="true" className="absolute -left-96 h-0 w-0 overflow-hidden">
        <label>Leave this empty<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
      </div>

      <div className="space-y-3">
        {footerNote && <p className="text-sm text-fg-muted">{footerNote}</p>}
        <Button type="submit" variant="primary" loading={busy} className="w-full sm:w-auto">
          {busy ? 'Sending' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
