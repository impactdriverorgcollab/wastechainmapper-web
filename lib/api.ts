import type {
  DumpSite, Report, AuthUser, CollectionPoint,
  Facility, WasteFlow, WaterSource, WaterAnomaly,
  FloodZone, HeatmapPoint, PlatformSummary,
  FlowStatRow, BenchmarkRow, ImportKind, ImportResult, RecyclableRow, WaterDashboard, GazetteerEntry,
  ApiKeyRow, ApiKeyTier, ApiKeyTierInfo, IssuedApiKey, VerificationStatus,
  Paged, WasteSite, SiteDetail, SiteContext, Journey, Hotspot, CoverageRow, ProximitySummary, AreaCheck, SummaryV1,
  DataQualityItem, DataSourceRow, UserRow, UserRole, AuditRow, SubmitResult, SubmissionInput, ObservationDetail, EvidenceItem,
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

export function authHeaders(token: string) {
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

// ── Versioned data API: sites, observations, hotspots, spatial questions ─────

type Params = Record<string, string | number | boolean | undefined>;

export function getWasteSites(params?: Params) {
  return apiFetch<Paged<WasteSite>>(`/waste-sites${query(params)}`);
}

/** Every page of a filtered site list, so the map is never silently cut off. */
export async function getAllWasteSites(params: Params = {}, maxPages = 6): Promise<WasteSite[]> {
  const all: WasteSite[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await getWasteSites({ ...params, page, limit: 1000 });
    all.push(...res.data);
    if (res.data.length < 1000 || all.length >= res.meta.total) break;
  }
  return all;
}

export function getWasteSite(id: string, token?: string | null) {
  return apiFetch<SiteDetail>(`/waste-sites/${id}`, token ? { headers: authHeaders(token) } : undefined);
}

export function getSiteContext(id: string) {
  return apiFetch<SiteContext>(`/waste-sites/${id}/context`);
}

export function getObservations(params?: Params) {
  return apiFetch<Paged<ObservationDetail & { siteId: string | null; lga: string | null; communityName: string | null }>>(`/waste-observations${query(params)}`);
}

export function getHotspots(params?: Params) {
  return apiFetch<{ data: Hotspot[]; meta: { method: string; radiusM: number; days: number } }>(`/hotspots${query(params)}`);
}

export function getCoverage() {
  return apiFetch<{ data: CoverageRow[]; meta: { statuses: Record<string, string>; unplacedAwaitingReview: number } }>('/analytics/coverage');
}

export function getSummaryV1() {
  return apiFetch<SummaryV1>('/analytics');
}

export function getProximitySummary(lga?: string) {
  return apiFetch<ProximitySummary>(`/spatial/proximity-summary${query({ lga })}`);
}

export function getAreaCheck(lat: number, lng: number, radiusM: number) {
  return apiFetch<AreaCheck>(`/spatial/around${query({ lat, lng, radiusM })}`);
}

export function getReferenceLayer(kind: string) {
  return apiFetch<GeoJSON.FeatureCollection>(`/spatial/layers${query({ kind, limit: 5000 })}`);
}

export function getJourneys(siteId: string) {
  return apiFetch<Journey[]>(`/journeys${query({ siteId })}`);
}

export function getDataQuality(token: string) {
  return apiFetch<{ totalSites: number; items: DataQualityItem[] }>('/analytics/data-quality', { headers: authHeaders(token) });
}

// ── Submissions and photos ────────────────────────────────────────────────────

export function submitReport(input: SubmissionInput) {
  return apiFetch<SubmitResult>('/reports', { method: 'POST', body: JSON.stringify(input) });
}

export function submitFieldReport(input: SubmissionInput, token: string) {
  return apiFetch<SubmitResult>('/reports/field', { method: 'POST', body: JSON.stringify(input), headers: authHeaders(token) });
}

export function uploadPhoto(reportId: string, uploadToken: string, dataUrl: string, capturedAt?: string) {
  return apiFetch<{ id: string }>(`/reports/${reportId}/evidence`, {
    method: 'POST',
    body: JSON.stringify({ dataUrl, capturedAt }),
    headers: { 'X-Upload-Token': uploadToken },
  });
}

// ── Review tools ──────────────────────────────────────────────────────────────

export function reviewPhoto(id: string, patch: { publicApproved?: boolean; containsPeople?: boolean; caption?: string }, token: string) {
  return apiFetch<EvidenceItem>(`/evidence/${id}`, { method: 'PATCH', body: JSON.stringify(patch), headers: authHeaders(token) });
}

export function resolveDuplicate(reportId: string, action: 'DISMISS' | 'MERGE', token: string) {
  return apiFetch<unknown>(`/reports/${reportId}/duplicate`, { method: 'POST', body: JSON.stringify({ action }), headers: authHeaders(token) });
}

/** Fetches a photo that is not public yet, using the reviewer's login, and returns a temporary address for it. */
export async function fetchPrivatePhoto(id: string, token: string): Promise<string> {
  const res = await fetch(`${BASE}/evidence/${id}/image`, { headers: authHeaders(token) });
  if (!res.ok) throw new ApiError('The photo could not be loaded.', res.status);
  return URL.createObjectURL(await res.blob());
}

// ── Administration ────────────────────────────────────────────────────────────

export function listUsers(token: string) {
  return apiFetch<UserRow[]>('/users', { headers: authHeaders(token) });
}

export function createUser(
  dto: { email: string; password: string; displayName?: string; role: UserRole; organisation?: string; assignedLgas?: string[] },
  token: string,
) {
  return apiFetch<UserRow>('/users', { method: 'POST', body: JSON.stringify(dto), headers: authHeaders(token) });
}

export function updateUser(
  id: string,
  dto: Partial<{ displayName: string; role: UserRole; isActive: boolean; organisation: string; assignedLgas: string[]; password: string }>,
  token: string,
) {
  return apiFetch<UserRow>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(dto), headers: authHeaders(token) });
}

export function listDataSources(token: string) {
  return apiFetch<DataSourceRow[]>('/data-sources', { headers: authHeaders(token) });
}

export function saveDataSource(
  dto: { name: string; kind: string; url?: string; termsNote?: string; accessMethod?: string; isActive?: boolean; notes?: string },
  token: string,
  id?: string,
) {
  return apiFetch<DataSourceRow>(id ? `/data-sources/${id}` : '/data-sources', {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(dto),
    headers: authHeaders(token),
  });
}

export function listAuditLog(token: string, params?: Params) {
  return apiFetch<Paged<AuditRow>>(`/audit-logs${query(params)}`, { headers: authHeaders(token) });
}

export function listCollectionPointsAdmin() {
  return apiFetch<(CollectionPoint & { isOfficial: boolean; verificationStatus: VerificationStatus; schedule: string | null })[]>('/collection-points');
}

export function saveCollectionPoint(
  dto: Record<string, unknown>,
  token: string,
  id?: string,
) {
  return apiFetch<CollectionPoint>(id ? `/collection-points/${id}` : '/collection-points', {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(dto),
    headers: authHeaders(token),
  });
}

/** Downloads an export through the website's own server and hands it to the browser as a file. */
export async function downloadExport(path: string, filename: string, token?: string | null) {
  const res = await fetch(`${BASE}${path}`, token ? { headers: authHeaders(token) } : undefined);
  if (!res.ok) throw new ApiError('The export did not download. Try again in a moment.', res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── LGA engagement (brief section 4B) ─────────────────────────────────────────

export interface LgaEngagementRow {
  lga: string;
  status: 'NOT_CONTACTED' | 'REQUESTED' | 'IN_TALKS' | 'AGREED' | 'SHARING';
  contactName: string | null;
  contactDetail: string | null;
  lastContactedAt: string | null;
  nextStep: string | null;
  dataShared: string[];
  notes: string | null;
  sites: number;
}

export function listLgaEngagement(token: string) {
  return apiFetch<LgaEngagementRow[]>('/lga-engagement', { headers: authHeaders(token) });
}

export function saveLgaEngagement(lga: string, dto: Partial<Omit<LgaEngagementRow, 'lga' | 'sites'>>, token: string) {
  return apiFetch<unknown>(`/lga-engagement/${encodeURIComponent(lga)}`, { method: 'PUT', body: JSON.stringify(dto), headers: authHeaders(token) });
}
