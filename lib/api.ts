import type {
  DumpSite, Report, AuthUser, CollectionPoint,
  Facility, WasteFlow, WaterSource, WaterAnomaly,
  FloodZone, HeatmapPoint, PlatformSummary,
  FlowStatRow, BenchmarkRow, ImportKind, ImportResult, RecyclableRow, WaterDashboard, GazetteerEntry,
  ApiKeyRow, ApiKeyTier, ApiKeyTierInfo, IssuedApiKey, VerificationStatus,
} from './types';

// Requests go to the website's own server (app/backend), which adds the website's API key and
// forwards them to the API. The key therefore never reaches the browser.
const BASE = '/backend';

/** An error from the API, carrying the HTTP status so callers can react to 401 and 403. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers: initHeaders, ...restInit } = init ?? {};
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...initHeaders },
      ...restInit,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      res.status === 401 ? 'Your session has ended. Sign in again.'
      : res.status === 403 ? 'Your account does not have access to this.'
      // 503 comes from our own server (for example the website is missing its API key), so its message is worth showing.
      : res.status === 503 && body?.message ? (body.message as string)
      : res.status >= 500 ? 'The server had a problem. Try again in a moment.'
      : (body?.message as string | undefined) ?? `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return res.json();
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function query(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return entries.length ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : '';
}

/** Read every page of a list endpoint, up to maxPages, so charts and tables are not silently cut off. */
async function fetchAllPages<T>(
  path: string,
  params: Record<string, string> = {},
  pageSize = 500,
  maxPages = 10,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const rows = await apiFetch<T[]>(`${path}${query({ ...params, page, limit: pageSize })}`);
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

// ── Sites ─────────────────────────────────────────────────────────────────────

export function getSites(params?: Record<string, string>) {
  return apiFetch<DumpSite[]>(`/sites${query(params)}`);
}

export function getAllSites(params?: Record<string, string>) {
  return fetchAllPages<DumpSite>('/sites', params);
}

export function getSite(id: string) {
  return apiFetch<DumpSite>(`/sites/${id}`);
}

export function getCollectionPoints() {
  return apiFetch<CollectionPoint[]>('/collection-points');
}

export function getSitesInRadius(lat: number, lng: number, radiusM: number) {
  return apiFetch<(DumpSite & { distance_m: number })[]>(
    `/sites/spatial/radius${query({ lat, lng, radiusM })}`,
  );
}

// ── Reports (reviewers only) ──────────────────────────────────────────────────

export function getVerificationQueue(token: string, limit = 50) {
  return apiFetch<Report[]>(`/reports/queue${query({ limit })}`, { headers: authHeaders(token) });
}

export function verifyReport(
  reportId: string,
  toStatus: VerificationStatus,
  notes: string | undefined,
  token: string,
) {
  return apiFetch<Report>(`/verification/reports/${reportId}`, {
    method: 'POST',
    body: JSON.stringify({ toStatus, notes: notes?.trim() || undefined }),
    headers: authHeaders(token),
  });
}

export function placeReport(reportId: string, gazetteerId: string, token: string) {
  return apiFetch<Report>(`/reports/${reportId}/place`, {
    method: 'POST',
    body: JSON.stringify({ gazetteerId }),
    headers: authHeaders(token),
  });
}

export function runImport(kind: ImportKind, rows: Record<string, string>[], dryRun: boolean, token: string) {
  return apiFetch<ImportResult>(`/imports/${kind}${dryRun ? '?dryRun=true' : ''}`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
    headers: authHeaders(token),
  });
}

// ── Gazetteer ─────────────────────────────────────────────────────────────────

export function getGazetteer() {
  return apiFetch<GazetteerEntry[]>('/gazetteer');
}

// ── Facilities ────────────────────────────────────────────────────────────────

export function getFacilities(params?: Record<string, string>) {
  return apiFetch<Facility[]>(`/facilities${query(params)}`);
}

// ── Waste flows ───────────────────────────────────────────────────────────────

export function getWasteFlows(params?: Record<string, string>) {
  return apiFetch<WasteFlow[]>(`/waste-flows${query(params)}`);
}

export function getFlowStats(lga?: string) {
  return apiFetch<FlowStatRow[]>(`/waste-flows/stats${query({ lga })}`);
}

// ── Water monitoring ──────────────────────────────────────────────────────────

export function getWaterSources(params?: Record<string, string>) {
  return apiFetch<WaterSource[]>(`/water/sources${query(params)}`);
}

export function getWaterAnomalies(unresolvedOnly = true) {
  return apiFetch<WaterAnomaly[]>(`/water/anomalies${query({ unresolvedOnly })}`);
}

export function getWaterDashboard() {
  return apiFetch<WaterDashboard>('/water/dashboard');
}

// ── Flood zones ───────────────────────────────────────────────────────────────

export function getFloodZones(params?: Record<string, string>) {
  return apiFetch<FloodZone[]>(`/flood-zones${query(params)}`);
}

export function getFloodZoneGeoJson(id: string) {
  return apiFetch<GeoJSON.Feature>(`/flood-zones/${id}/geojson`);
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function getHeatmapData(lga?: string) {
  return apiFetch<HeatmapPoint[]>(`/analytics/heatmap${query({ lga })}`);
}

export function getFlowTimeline(params?: { lga?: string; days?: number }) {
  return apiFetch<WasteFlow[]>(`/analytics/flow-timeline${query(params)}`);
}

export function getPlatformSummary() {
  return apiFetch<PlatformSummary>('/analytics/summary');
}

export function getBenchmark() {
  return apiFetch<BenchmarkRow[]>('/analytics/benchmark');
}

export function getRecyclables(lga?: string) {
  return apiFetch<RecyclableRow[]>(`/analytics/recyclables${query({ lga })}`);
}

// ── API key management (admin only) ──────────────────────────────────────────

export function getApiKeyTiers() {
  return apiFetch<ApiKeyTierInfo[]>('/api-keys/tiers');
}

export function listApiKeys(token: string) {
  return apiFetch<ApiKeyRow[]>('/api-keys', { headers: authHeaders(token) });
}

export function issueApiKey(dto: { name: string; tier: ApiKeyTier; ownerId?: string }, token: string) {
  return apiFetch<IssuedApiKey>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(dto),
    headers: authHeaders(token),
  });
}

export function revokeApiKey(id: string, token: string) {
  return apiFetch<ApiKeyRow>(`/api-keys/${id}/revoke`, { method: 'PATCH', headers: authHeaders(token) });
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
