import type {
  DumpSite, Report, AuthUser, CollectionPoint,
  Facility, WasteFlow, WaterSource, WaterAnomaly,
  FloodZone, HeatmapPoint, PlatformSummary,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers: initHeaders, ...restInit } = init ?? {};
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...initHeaders },
    ...restInit,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${res.status}`);
  }
  return res.json();
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Sites ─────────────────────────────────────────────────────────────────────

export function getSites(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<DumpSite[]>(`/sites${qs}`);
}

export function getSite(id: string) {
  return apiFetch<DumpSite>(`/sites/${id}`);
}

export function getCollectionPoints() {
  return apiFetch<CollectionPoint[]>('/collection-points');
}

export function getSitesInRadius(lat: number, lng: number, radiusM: number) {
  return apiFetch<(DumpSite & { distance_m: number })[]>(
    `/sites/spatial/radius?lat=${lat}&lng=${lng}&radiusM=${radiusM}`,
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────

export function getReports(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<Report[]>(`/reports${qs}`);
}

export function getVerificationQueue(token: string, limit = 50) {
  return apiFetch<Report[]>(`/reports/queue?limit=${limit}`, {
    headers: authHeaders(token),
  });
}

export function verifyReport(
  reportId: string,
  toStatus: string,
  notes: string | undefined,
  token: string,
) {
  return apiFetch(`/verification/reports/${reportId}`, {
    method: 'POST',
    body: JSON.stringify({ toStatus, notes }),
    headers: authHeaders(token),
  });
}

// ── Facilities ────────────────────────────────────────────────────────────────

export function getFacilities(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<Facility[]>(`/facilities${qs}`);
}

// ── Waste flows ───────────────────────────────────────────────────────────────

export function getWasteFlows(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<WasteFlow[]>(`/waste-flows${qs}`);
}

export function getFlowStats(lga?: string) {
  const qs = lga ? `?lga=${encodeURIComponent(lga)}` : '';
  return apiFetch<any[]>(`/waste-flows/stats${qs}`);
}

// ── Water monitoring ──────────────────────────────────────────────────────────

export function getWaterSources(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<WaterSource[]>(`/water/sources${qs}`);
}

export function getWaterAnomalies(unresolvedOnly = true) {
  return apiFetch<WaterAnomaly[]>(`/water/anomalies?unresolvedOnly=${unresolvedOnly}`);
}

export function getWaterDashboard() {
  return apiFetch<{ sourceCount: number; openAnomalies: number; recentReadings: any[] }>('/water/dashboard');
}

// ── Flood zones ───────────────────────────────────────────────────────────────

export function getFloodZones(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<FloodZone[]>(`/flood-zones${qs}`);
}

export function getFloodZoneGeoJson(id: string) {
  return apiFetch<GeoJSON.Feature>(`/flood-zones/${id}/geojson`);
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function getHeatmapData(lga?: string) {
  const qs = lga ? `?lga=${encodeURIComponent(lga)}` : '';
  return apiFetch<HeatmapPoint[]>(`/analytics/heatmap${qs}`);
}

export function getFlowTimeline(params?: { lga?: string; days?: number }) {
  const qs = params ? '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
  ).toString() : '';
  return apiFetch<WasteFlow[]>(`/analytics/flow-timeline${qs}`);
}

export function getPlatformSummary() {
  return apiFetch<PlatformSummary>('/analytics/summary');
}

export function getBenchmark() {
  return apiFetch<any[]>('/analytics/benchmark');
}

export function getRecyclables(lga?: string) {
  const qs = lga ? `?lga=${encodeURIComponent(lga)}` : '';
  return apiFetch<any[]>(`/analytics/recyclables${qs}`);
}

// ── API key management (admin only) ──────────────────────────────────────────

export function getApiKeyTiers() {
  return apiFetch<{ tier: string; dailyLimit: number; description: string }[]>('/api-keys/tiers');
}

export function listApiKeys(token: string) {
  return apiFetch<any[]>('/api-keys', { headers: authHeaders(token) });
}

export function issueApiKey(dto: { name: string; tier: string; ownerId?: string }, token: string) {
  return apiFetch<{ key: string; tier: string; dailyLimit: number; warning: string }>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(dto),
    headers: authHeaders(token),
  });
}

export function revokeApiKey(id: string, token: string) {
  return apiFetch(`/api-keys/${id}/revoke`, { method: 'PATCH', headers: authHeaders(token) });
}

export function getApiKeyStats(id: string, token: string) {
  return apiFetch<any>(`/api-keys/${id}/stats`, { headers: authHeaders(token) });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function login(email: string, password: string) {
  return apiFetch<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getMe(token: string) {
  return apiFetch<AuthUser>('/auth/me', { headers: authHeaders(token) });
}
