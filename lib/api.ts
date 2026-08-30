import type { DumpSite, Report, AuthUser } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
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
