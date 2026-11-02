'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BarChart3, Clock, Crosshair, Flame, Layers, PanelLeftClose, PanelLeftOpen, PenTool, SlidersHorizontal, Satellite, Map as MapIcon } from 'lucide-react';
import {
  getAllWasteSites, getAreaCheck, getCollectionPoints, getFacilities, getFloodZoneGeoJson, getFloodZones,
  getFlowTimeline, getHotspots, getReferenceLayer, getWaterAnomalies, getWaterSources,
} from '@/lib/api';
import { RIVERS_STATE_CENTER, RIVERS_STATE_ZOOM } from '@/lib/constants';
import { mapStyleFor, type Basemap } from '@/lib/mapStyle';
import { useTheme } from '@/lib/theme';
import type { AreaCheck, DumpSite, WasteSite } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { AreaCard } from './AreaCard';
import { DetailsCard, type Selection } from './DetailsCard';
import { FilterForm, NO_FILTERS, countFilters, filtersToParams, type MapFilters } from './FilterPanel';
import { HistoryBar } from './HistoryBar';
import { LayerTree } from './LayerTree';
import { MapInsights } from './MapInsights';
import { DrawCard, HeatControls, MapSearch, SeverityLegend, type FoundPlace } from './MapTools';
import { TimelineBar } from './TimelineBar';
import {
  CLICKABLE_LAYERS, DEFAULT_ENABLED, addAllLayers, applyHeatStyle, applyVisibility, circleToGeoJSON, collectionPointsToGeoJSON,
  drawToGeoJSON, facilitiesToGeoJSON, floodZonesToGeoJSON, flowRoutesToGeoJSON, heatFromSites, hotspotsToGeoJSON, nearestLinesToGeoJSON,
  placeFromFeature, pointInPolygon, polygonAreaKm2, setSourceData, sitesToGeoJSON, waterAnomaliesToGeoJSON, waterSourcesToGeoJSON,
  type LayerId,
} from './mapLayers';

const SWR = { revalidateOnFocus: false };
const PLAYBACK_STEP_MS = 600;
const HISTORY_STEPS = 60;
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/** Optional deep link from the tables: /map?lat=..&lng=..&site=<id> */
function readDeepLink() {
  const p = new URLSearchParams(window.location.search);
  const lat = Number(p.get('lat'));
  const lng = Number(p.get('lng'));
  return {
    center: Number.isFinite(lat) && Number.isFinite(lng) && p.get('lat') && p.get('lng') ? ([lng, lat] as [number, number]) : null,
    siteId: p.get('site'),
  };
}

// The versioned API describes a site with more detail. The map's own code works with the older shape.
function toMapSite(s: WasteSite): DumpSite {
  return {
    id: s.id, latitude: s.latitude, longitude: s.longitude, status: s.status, wasteType: s.wasteType,
    confidenceTier: s.confidenceTier, communityName: s.communityName, ward: s.ward, lga: s.lga, description: s.description,
    firstSeenAt: s.firstSeenAt, lastConfirmedAt: s.lastConfirmedAt, sourceReportIds: [],
    category: s.category, setting: s.setting, siteClass: s.siteClass, risk: s.risk, isHazardous: s.isHazardous,
    lastObservedAt: s.lastObservedAt, observationCount: s.observationCount, photoCount: s.photoCount,
    latestVolumeM3: s.latestObservation?.volumeM3 ?? null,
    latestVolumeBasis: s.latestObservation?.provenance?.volume?.basis ?? null,
  };
}

interface AreaState { centre: { lat: number; lng: number }; radiusM: number; result?: AreaCheck; error?: string; loading: boolean }
type Tool = 'none' | 'radius' | 'draw';
type Tab = 'layers' | 'filters' | 'insights';

export default function WasteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { theme, colors } = useTheme();
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  // Bumped each time the map has a fresh set of layers (first load, and after a new background), so data is pushed again.
  const [epoch, setEpoch] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<Basemap>('streets');
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>(DEFAULT_ENABLED);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [timelineIdx, setTimelineIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('layers');
  const [heatOpen, setHeatOpen] = useState(false);
  const [heatRadius, setHeatRadius] = useState(30);
  const [heatStrength, setHeatStrength] = useState(1.2);

  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS);
  const [historyOn, setHistoryOn] = useState(false);
  const [historyDate, setHistoryDate] = useState(() => Date.now());
  const [historyPlaying, setHistoryPlaying] = useState(false);

  const [tool, setTool] = useState<Tool>('none');
  const toolRef = useRef<Tool>('none');
  toolRef.current = tool;
  const [area, setArea] = useState<AreaState | null>(null);
  const [corners, setCorners] = useState<[number, number][]>([]);
  const [drawClosed, setDrawClosed] = useState(false);
  const closedRef = useRef(false);
  closedRef.current = drawClosed;

  // Each dataset loads on its own, so one failing never blanks the rest of the map.
  const params = useMemo(() => filtersToParams(filters), [filters]);
  const sites = useSWR(['map-waste-sites', JSON.stringify(params)], () => getAllWasteSites(params), { ...SWR, keepPreviousData: true });
  const hotspots = useSWR(['map-hotspots', filters.lga], () => getHotspots({ minSites: 2, lga: filters.lga || undefined }), SWR);
  const collectionPoints = useSWR('collection-points', getCollectionPoints, SWR);
  const facilities = useSWR('facilities-active', () => getFacilities({ isActive: 'true' }), SWR);
  const waterSources = useSWR('water-sources', () => getWaterSources(), SWR);
  const waterAnomalies = useSWR('water-anomalies-open', () => getWaterAnomalies(true), SWR);
  const floodZones = useSWR('flood-zones', () => getFloodZones(), SWR);
  const flows = useSWR('flow-timeline-30', () => getFlowTimeline({ days: 30 }), SWR);
  const refWaterways = useSWR(enabled.waterways ? 'ref-WATERWAY' : null, () => getReferenceLayer('WATERWAY'), SWR);
  const refDrains = useSWR(enabled.drains ? 'ref-DRAIN' : null, () => getReferenceLayer('DRAIN'), SWR);
  const refSchools = useSWR(enabled.schools ? 'ref-SCHOOL' : null, () => getReferenceLayer('SCHOOL'), SWR);
  const refHealth = useSWR(enabled.health ? 'ref-HEALTH_FACILITY' : null, () => getReferenceLayer('HEALTH_FACILITY'), SWR);
  const lga = useSWR(enabled.lga ? 'lga-boundaries' : null, () => fetch('/data/lga-boundaries.geojson').then((r) => { if (!r.ok) throw new Error('The area outlines did not load.'); return r.json() as Promise<GeoJSON.FeatureCollection>; }), SWR);

  const zones = floodZones.data;
  const floodGeo = useSWR(
    zones && zones.length > 0 ? ['flood-geojson', zones.map((z) => z.id).join(',')] : null,
    async () => {
      const results = await Promise.allSettled(zones!.map((z) => getFloodZoneGeoJson(z.id)));
      return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
    },
    SWR,
  );

  // Every site the filters allow, then the ones that existed on the history date.
  const allSites = useMemo(() => (sites.data ?? []).map(toMapSite), [sites.data]);
  const earliest = useMemo(
    () => (allSites.length ? Math.min(...allSites.map((s) => new Date(s.firstSeenAt).getTime())) : Date.now() - 365 * 86_400_000),
    [allSites],
  );
  const visibleSites = useMemo(
    () => (historyOn ? allSites.filter((s) => new Date(s.firstSeenAt).getTime() <= historyDate) : allSites),
    [allSites, historyOn, historyDate],
  );

  // The first time sites arrive, move the map to them. A shared link that names a place keeps its own view.
  const fitted = useRef(false);
  const sitesById = useRef(new Map<string, DumpSite>());
  const pendingSiteId = useRef<string | null>(null);
  const areaRequest = useRef(0);

  // ── Create the map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const link = readDeepLink();
    pendingSiteId.current = link.siteId;
    setPanelOpen(window.innerWidth >= 1024);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleFor(theme, 'streets'),
      center: link.center ?? RIVERS_STATE_CENTER,
      zoom: link.center ? 14 : RIVERS_STATE_ZOOM,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    // Fires for the first background and again after every change of background or theme.
    map.on('style.load', () => {
      addAllLayers(map, colorsRef.current);
      setEpoch((e) => e + 1);
    });

    map.on('click', (e) => {
      if (toolRef.current === 'radius') {
        setArea((prev) => ({ centre: { lat: e.lngLat.lat, lng: e.lngLat.lng }, radiusM: prev?.radiusM ?? 500, loading: true }));
        return;
      }
      if (toolRef.current === 'draw') {
        if (!closedRef.current) setCorners((c) => [...c, [e.lngLat.lng, e.lngLat.lat]]);
        return;
      }
      const hit = map.queryRenderedFeatures(e.point, { layers: CLICKABLE_LAYERS.filter((id) => map.getLayer(id)) })[0];
      if (!hit) {
        // A click on a cluster zooms in. A click on empty map closes the card.
        const cluster = map.getLayer('sites-cluster') ? map.queryRenderedFeatures(e.point, { layers: ['sites-cluster'] })[0] : undefined;
        if (cluster) {
          const src = map.getSource('dump-sites') as maplibregl.GeoJSONSource;
          src.getClusterExpansionZoom(cluster.properties?.cluster_id).then((zoom) => {
            map.easeTo({ center: (cluster.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
          });
        } else {
          setSelection(null);
        }
        return;
      }
      if (hit.layer.id === 'sites-pin') {
        const site = sitesById.current.get(String(hit.properties?.id));
        if (site) setSelection({ kind: 'site', site });
        return;
      }
      const place = placeFromFeature(hit.layer.id, hit.properties ?? {});
      if (place) setSelection({ kind: 'place', place });
    });

    // Pointer cursor over anything that can be clicked.
    for (const id of [...CLICKABLE_LAYERS, 'sites-cluster']) {
      map.on('mouseenter', id, () => { if (toolRef.current === 'none') map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', id, () => { if (toolRef.current === 'none') map.getCanvas().style.cursor = ''; });
    }

    // Before the style has loaded, an error almost always means the map key or style address is wrong.
    map.on('error', (e) => {
      if (!map.isStyleLoaded() && !mapRef.current?.loaded()) {
        console.error('Map error', e.error);
        setMapError('The map background could not load. Check your connection. If it keeps failing, the map key may be missing or expired.');
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; setEpoch(0); };
    // The map is made once. Later theme and background changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new theme or background replaces the style, which removes our layers. They are added back on "style.load".
  const firstStyle = useRef(true);
  useEffect(() => {
    if (firstStyle.current) { firstStyle.current = false; return; }
    const map = mapRef.current;
    if (!map) return;
    setMapError(null);
    map.setStyle(mapStyleFor(theme, basemap));
  }, [theme, basemap]);

  // ── Push each dataset into its source whenever it arrives or changes ───────
  const withMap = useCallback((fn: (map: maplibregl.Map) => void) => {
    const map = mapRef.current;
    if (map && epoch > 0 && map.getSource('dump-sites')) fn(map);
  }, [epoch]);

  useEffect(() => {
    withMap((map) => {
      setSourceData(map, 'dump-sites', sitesToGeoJSON(visibleSites));
      setSourceData(map, 'heatmap-data', heatFromSites(visibleSites));
    });
    sitesById.current = new Map(allSites.map((s) => [s.id, s]));
    // Open the site named in a deep link once the sites are in.
    if (pendingSiteId.current && sites.data) {
      const site = sitesById.current.get(pendingSiteId.current);
      if (site) setSelection({ kind: 'site', site });
      pendingSiteId.current = null;
    }
  }, [withMap, visibleSites, allSites, sites.data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || epoch === 0 || fitted.current || !sites.data || sites.data.length === 0) return;
    fitted.current = true;
    if (new URLSearchParams(window.location.search).get('lat')) return;
    const pts = sites.data.filter((s) => s.latitude != null && s.longitude != null);
    if (pts.length === 0) return;
    const padding = { top: 140, bottom: 80, right: 60, left: window.innerWidth >= 1024 ? 420 : 40 };
    if (pts.length === 1) {
      map.easeTo({ center: [pts[0].longitude, pts[0].latitude], zoom: 12, padding, duration: 800 });
    } else {
      const b = new maplibregl.LngLatBounds([pts[0].longitude, pts[0].latitude], [pts[0].longitude, pts[0].latitude]);
      pts.forEach((s) => b.extend([s.longitude, s.latitude]));
      map.fitBounds(b, { padding, maxZoom: 13, duration: 800 });
    }
  }, [epoch, sites.data]);

  useEffect(() => { withMap((m) => setSourceData(m, 'hotspots', hotspotsToGeoJSON(hotspots.data?.data ?? []))); }, [withMap, hotspots.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'collection-points', collectionPointsToGeoJSON(collectionPoints.data ?? []))); }, [withMap, collectionPoints.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'facilities', facilitiesToGeoJSON(facilities.data ?? []))); }, [withMap, facilities.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'water-sources', waterSourcesToGeoJSON(waterSources.data ?? []))); }, [withMap, waterSources.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'water-anomalies', waterAnomaliesToGeoJSON(waterAnomalies.data ?? []))); }, [withMap, waterAnomalies.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'ref-waterways', refWaterways.data ?? EMPTY_FC)); }, [withMap, refWaterways.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'ref-drains', refDrains.data ?? EMPTY_FC)); }, [withMap, refDrains.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'ref-schools', refSchools.data ?? EMPTY_FC)); }, [withMap, refSchools.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'ref-health', refHealth.data ?? EMPTY_FC)); }, [withMap, refHealth.data]);
  useEffect(() => { withMap((m) => setSourceData(m, 'lga', lga.data ?? EMPTY_FC)); }, [withMap, lga.data]);
  useEffect(() => {
    withMap((m) => setSourceData(m, 'flood-zones', floodZonesToGeoJSON(zones ?? [], floodGeo.data ?? [])));
  }, [withMap, zones, floodGeo.data]);
  useEffect(() => {
    withMap((m) => setSourceData(m, 'nearest-lines', enabled['nearest-lines']
      ? nearestLinesToGeoJSON(visibleSites, collectionPoints.data ?? [])
      : EMPTY_FC));
  }, [withMap, enabled, visibleSites, collectionPoints.data]);

  // Show every recorded flow when the data first arrives.
  const flowList = flows.data;
  useEffect(() => { if (flowList) setTimelineIdx(flowList.length); }, [flowList]);
  useEffect(() => {
    withMap((m) => setSourceData(m, 'waste-routes', flowRoutesToGeoJSON((flowList ?? []).slice(0, timelineIdx))));
  }, [withMap, flowList, timelineIdx]);

  // Playback of waste flows
  useEffect(() => {
    if (!playing || !flowList) return;
    if (timelineIdx >= flowList.length) { setPlaying(false); return; }
    const t = setTimeout(() => setTimelineIdx((i) => i + 1), PLAYBACK_STEP_MS);
    return () => clearTimeout(t);
  }, [playing, timelineIdx, flowList]);

  // Playback of the history of sites
  useEffect(() => {
    if (!historyPlaying) return;
    const now = Date.now();
    if (historyDate >= now) { setHistoryPlaying(false); return; }
    const step = Math.max(86_400_000, (now - earliest) / HISTORY_STEPS);
    const t = setTimeout(() => setHistoryDate((d) => Math.min(now, d + step)), PLAYBACK_STEP_MS);
    return () => clearTimeout(t);
  }, [historyPlaying, historyDate, earliest]);

  // Layer switches and the density settings
  useEffect(() => { withMap((m) => applyVisibility(m, enabled)); }, [withMap, enabled]);
  useEffect(() => { withMap((m) => applyHeatStyle(m, heatRadius, heatStrength)); }, [withMap, heatRadius, heatStrength]);
  const toggleLayer = useCallback((id: LayerId) => setEnabled((prev) => ({ ...prev, [id]: !prev[id] })), []);
  const setMany = useCallback((ids: LayerId[], on: boolean) => setEnabled((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, on])) })), []);

  // ── Tools: check a radius, draw an area ────────────────────────────────────
  useEffect(() => {
    withMap((m) => {
      setSourceData(m, 'area-check', area && tool === 'radius' ? circleToGeoJSON(area.centre.lng, area.centre.lat, area.radiusM) : EMPTY_FC);
      setSourceData(m, 'draw', tool === 'draw' ? drawToGeoJSON(corners, drawClosed) : EMPTY_FC);
      m.getCanvas().style.cursor = tool === 'none' ? '' : 'crosshair';
    });
  }, [withMap, area, tool, corners, drawClosed]);

  const areaKey = area ? `${area.centre.lat.toFixed(5)},${area.centre.lng.toFixed(5)},${area.radiusM}` : null;
  useEffect(() => {
    if (!area || !areaKey) return;
    const mine = ++areaRequest.current;
    getAreaCheck(area.centre.lat, area.centre.lng, area.radiusM)
      .then((result) => { if (mine === areaRequest.current) setArea((a) => (a ? { ...a, result, error: undefined, loading: false } : a)); })
      .catch((e: Error) => { if (mine === areaRequest.current) setArea((a) => (a ? { ...a, error: e.message, loading: false } : a)); });
    // The key covers the centre and radius. Result updates must not run this again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaKey]);

  function chooseTool(next: Tool) {
    setSelection(null);
    setArea(null);
    setCorners([]);
    setDrawClosed(false);
    setTool((cur) => (cur === next ? 'none' : next));
    if (window.innerWidth < 1024) setPanelOpen(false);
  }

  const inside = useMemo(
    () => (drawClosed && corners.length >= 3
      ? visibleSites.filter((s) => s.longitude != null && s.latitude != null && pointInPolygon(s.longitude, s.latitude, corners))
      : []),
    [drawClosed, corners, visibleSites],
  );

  // ── Search ─────────────────────────────────────────────────────────────────
  function goTo(p: FoundPlace) {
    const map = mapRef.current;
    if (!map) return;
    setSourceData(map, 'search-pin', { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: {} }] });
    map.flyTo({ center: [p.lng, p.lat], zoom: 14, duration: 900 });
    setSelection(null);
  }

  // ── Status shown over the map ──────────────────────────────────────────────
  const failed = useMemo(() => {
    const checks: [string, boolean][] = [
      ['hotspots', !!hotspots.error], ['collection points', !!collectionPoints.error], ['facilities', !!facilities.error],
      ['water sources', !!waterSources.error], ['water problems', !!waterAnomalies.error],
      ['flood zones', !!floodZones.error], ['waste routes', !!flows.error], ['area outlines', !!lga.error],
      ['rivers', !!refWaterways.error], ['drains', !!refDrains.error], ['schools', !!refSchools.error], ['health facilities', !!refHealth.error],
    ];
    return checks.filter(([, bad]) => bad).map(([name]) => name);
  }, [hotspots.error, collectionPoints.error, facilities.error, waterSources.error, waterAnomalies.error, floodZones.error, flows.error,
    lga.error, refWaterways.error, refDrains.error, refSchools.error, refHealth.error]);

  const loading = !mapError && (epoch === 0 || (sites.isLoading && !sites.data));

  const counts: Partial<Record<LayerId, number>> = {
    'dump-sites': visibleSites.length,
    hotspots: hotspots.data?.data.length,
    'collection-points': collectionPoints.data?.length,
    facilities: facilities.data?.length,
    'water-sources': waterSources.data?.length,
    'water-anomalies': waterAnomalies.data?.length,
    waterways: refWaterways.data?.features.length,
    drains: refDrains.data?.features.length,
    schools: refSchools.data?.features.length,
    health: refHealth.data?.features.length,
    lga: lga.data?.features.length,
  };

  function retryAll() {
    for (const q of [sites, hotspots, collectionPoints, facilities, waterSources, waterAnomalies, floodZones, flows, lga, refWaterways, refDrains, refSchools, refHealth]) {
      if (q.error) void q.mutate();
    }
  }

  const hasTimeline = (flowList?.length ?? 0) > 0;
  const bannerText = sites.error
    ? `The sites did not load. ${sites.error.message}`
    : failed.length > 0 ? `Some layers did not load: ${failed.join(', ')}.` : null;
  const filtered = countFilters(filters) > 0;
  const toolBtn = (on: boolean) => (on ? '!bg-accent !text-accent-fg !border-accent' : '');

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} role="region" aria-label="Map of waste sites and waste infrastructure" className="h-full w-full" />

      {/* Search, tools and the side panel */}
      <div className="pointer-events-none absolute inset-y-3 left-3 right-3 z-10 flex flex-col gap-2 sm:right-auto sm:w-96">
        <div className="pointer-events-auto flex items-start gap-2">
          <Button onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen} aria-controls="map-panel" aria-label={panelOpen ? 'Hide the layers panel' : 'Show the layers panel'} className="shrink-0 shadow-raised">
            {panelOpen ? <PanelLeftClose size={18} aria-hidden="true" /> : <PanelLeftOpen size={18} aria-hidden="true" />}
          </Button>
          <MapSearch sites={allSites} onPick={goTo} />
        </div>

        <div className="pointer-events-auto flex gap-2" role="toolbar" aria-label="Map tools">
          <Button onClick={() => chooseTool('draw')} aria-pressed={tool === 'draw'} aria-label="Draw an area" title="Draw an area and count the sites inside" className={`shadow-raised ${toolBtn(tool === 'draw')}`}><PenTool size={18} aria-hidden="true" /></Button>
          <Button onClick={() => chooseTool('radius')} aria-pressed={tool === 'radius'} aria-label="Check a radius" title="Check what is within a distance of a point" className={`shadow-raised ${toolBtn(tool === 'radius')}`}><Crosshair size={18} aria-hidden="true" /></Button>
          <Button onClick={() => { setHistoryOn((o) => !o); setHistoryPlaying(false); setHistoryDate(Date.now()); }} aria-pressed={historyOn} aria-label="History" title="Replay how the map has grown" className={`shadow-raised ${toolBtn(historyOn)}`}><Clock size={18} aria-hidden="true" /></Button>
          <Button onClick={() => { setHeatOpen((o) => !o); if (!enabled.heatmap) setEnabled((p) => ({ ...p, heatmap: true })); }} aria-pressed={heatOpen} aria-label="Density" title="Density map and its settings" className={`shadow-raised ${toolBtn(heatOpen)}`}><Flame size={18} aria-hidden="true" /></Button>
          <Button onClick={() => setBasemap((b) => (b === 'streets' ? 'satellite' : 'streets'))} aria-pressed={basemap === 'satellite'} aria-label={basemap === 'satellite' ? 'Street map' : 'Satellite'} title={basemap === 'satellite' ? 'Back to the street map' : 'Satellite imagery'} className={`shadow-raised ${toolBtn(basemap === 'satellite')}`}>
            {basemap === 'satellite' ? <MapIcon size={18} aria-hidden="true" /> : <Satellite size={18} aria-hidden="true" />}
          </Button>
        </div>

        {heatOpen && <div className="pointer-events-auto"><HeatControls radius={heatRadius} strength={heatStrength} onRadius={setHeatRadius} onStrength={setHeatStrength} /></div>}

        {panelOpen && (
          <section id="map-panel" aria-label="Layers, filters and charts" className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-panel shadow-raised">
            <div role="tablist" aria-label="Panel sections" className="grid shrink-0 grid-cols-3 gap-1 border-b border-line p-1">
              {([['layers', 'Layers', Layers], ['filters', filtered ? `Filters (${countFilters(filters)})` : 'Filters', SlidersHorizontal], ['insights', 'Charts', BarChart3]] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`maptab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`mappanel-${id}`}
                  onClick={() => setTab(id)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded text-sm font-semibold transition-colors duration-150 ${tab === id ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-panel-3 hover:text-fg'}`}
                >
                  <Icon size={16} aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`mappanel-${tab}`} aria-labelledby={`maptab-${tab}`} className="min-h-0 flex-1 overflow-y-auto">
              {tab === 'layers' && <LayerTree enabled={enabled} counts={counts} onToggle={toggleLayer} onSetMany={setMany} />}
              {tab === 'filters' && <FilterForm applied={filters} onApply={(f) => { setFilters(f); setSelection(null); }} />}
              {tab === 'insights' && <MapInsights sites={visibleSites} />}
            </div>
          </section>
        )}
      </div>

      {enabled.hotspots && (hotspots.data?.data.length ?? 0) > 0 && (
        <div className="pointer-events-none absolute right-3 top-32 z-10 hidden md:block">
          <div className="pointer-events-auto"><SeverityLegend /></div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-center sm:left-96 sm:pl-8">
        {loading && <p role="status" className="rounded-lg bg-panel px-4 py-2 text-sm text-fg-muted shadow-raised">Loading the map</p>}
        {!loading && !filtered && sites.data && allSites.length <= 3 && (
          <div role="status" className="pointer-events-auto mt-12 max-w-md rounded-lg bg-panel p-4 shadow-raised sm:mt-0">
            <p className="text-sm font-semibold text-fg">{allSites.length === 0 ? 'No sites are on the map yet' : `Only ${allSites.length === 1 ? 'one site is' : `${allSites.length} sites are`} on the map so far`}</p>
            <p className="mt-1 text-sm text-fg-muted">
              A site appears here when a news story names a community, or when someone reports one. Reports and stories that a reviewer has not checked show as reported, with a question mark. Add what you see so the map can grow.
            </p>
            <Link href="/report" className="btn-primary mt-3">Report waste</Link>
          </div>
        )}
        {!loading && filtered && sites.data && visibleSites.length === 0 && (
          <p role="status" className="rounded-lg bg-panel px-4 py-2 text-sm text-fg-muted shadow-raised">No sites match these filters. Clear a filter to see more.</p>
        )}
      </div>

      {(mapError || bannerText) && (
        <div role="alert" className="absolute inset-x-3 bottom-24 z-20 flex flex-col gap-3 rounded-lg bg-danger-soft p-4 shadow-raised md:inset-x-auto md:bottom-12 md:right-3 md:w-80">
          <p className="text-sm text-fg">{mapError ?? bannerText}</p>
          <div><Button onClick={() => (mapError ? window.location.reload() : retryAll())}>{mapError ? 'Reload the page' : 'Try again'}</Button></div>
        </div>
      )}

      {/* The cards and bars sit above the map attribution, which must stay readable. */}
      <div className="pointer-events-none absolute inset-x-3 bottom-10 z-20 flex flex-col items-stretch gap-3 sm:items-end lg:left-96 lg:pl-8">
        {(selection || tool !== 'none') && (
          <div className="pointer-events-auto w-full sm:w-auto">
            {tool === 'radius' && <AreaCard state={area} picking onRadius={(m) => setArea((a) => (a ? { ...a, radiusM: m, loading: true } : a))} onClose={() => chooseTool('radius')} />}
            {tool === 'draw' && (
              <DrawCard
                corners={corners} closed={drawClosed} inside={inside} areaKm2={polygonAreaKm2(corners)}
                onUndo={() => setCorners((c) => c.slice(0, -1))} onFinish={() => setDrawClosed(true)} onClear={() => chooseTool('draw')}
              />
            )}
            {tool === 'none' && selection && <DetailsCard selection={selection} onClose={() => setSelection(null)} />}
          </div>
        )}
        {historyOn && (
          <div className="pointer-events-auto mx-auto w-full max-w-xl">
            <HistoryBar
              min={earliest} max={Date.now()} value={Math.min(historyDate, Date.now())} shown={visibleSites.length} total={allSites.length}
              playing={historyPlaying} onChange={setHistoryDate}
              onPlayingChange={(p) => { if (p && historyDate >= Date.now() - 86_400_000) setHistoryDate(earliest); setHistoryPlaying(p); }}
              onClose={() => { setHistoryOn(false); setHistoryPlaying(false); }}
            />
          </div>
        )}
        {hasTimeline && flowList && (
          <div className="pointer-events-auto mx-auto w-full max-w-xl">
            <TimelineBar flows={flowList} index={timelineIdx} playing={playing} onIndexChange={setTimelineIdx} onPlayingChange={setPlaying} />
          </div>
        )}
      </div>
    </div>
  );
}
