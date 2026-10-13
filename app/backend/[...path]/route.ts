import { NextRequest, NextResponse } from 'next/server';

// The browser talks to this route, never to the API directly. The route adds the website's own
// API key (kept on the server, never sent to visitors) and passes the request on. That is how
// visitors can use the site with no key while partners who call the API directly must have one.
//
// Staff requests carry their own login token in the Authorization header, which is passed on.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_URL = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const WEB_API_KEY = process.env.WEB_API_KEY ?? '';

// A light per-visitor limit so the site cannot be used as a free, unmetered copy of the API.
// It is kept in memory, so it is per server instance. Use a shared store if you scale out.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 240;
const hits = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    hits.forEach((times, key) => {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    });
  }
  return recent.length > MAX_REQUESTS;
}

function json(status: number, message: string, headers: Record<string, string> = {}) {
  return NextResponse.json({ statusCode: status, message }, { status, headers });
}

// Public data changes slowly (the scraper runs twice a day), and one map load asks for about sixteen
// things at once. Keeping each answer for a minute, and letting identical requests that arrive together
// share one trip to the API, makes the site much faster and takes load off the database.
const CACHE_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 45_000;

interface Reply { status: number; body: string; contentType: string; retryAfter: string | null }
const cache = new Map<string, { expires: number; reply: Reply }>();
const inFlight = new Map<string, Promise<Reply>>();

async function callUpstream(url: string, init: RequestInit): Promise<Reply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    return {
      status: res.status,
      body: await res.text(),
      contentType: res.headers.get('content-type') ?? 'application/json',
      retryAfter: res.headers.get('retry-after'),
    };
  } finally {
    clearTimeout(timer);
  }
}

function toResponse(reply: Reply) {
  return new NextResponse(reply.body, {
    status: reply.status,
    headers: {
      'Content-Type': reply.contentType,
      'Cache-Control': 'no-store',
      ...(reply.retryAfter && { 'Retry-After': reply.retryAfter }),
    },
  });
}

async function forward(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  // The API's own documentation is not part of the website.
  if (path.startsWith('api/')) return json(404, 'Not found');

  const ip = clientIp(req);
  if (tooMany(ip)) return json(429, 'Too many requests. Wait a minute and try again.', { 'Retry-After': '60' });

  const authorization = req.headers.get('authorization');
  const isSignIn = path === 'auth/login';

  // Public data needs the website key. Staff requests and sign-in do not.
  if (!WEB_API_KEY && !authorization && !isSignIn) {
    return json(503, 'The website is not connected to the API yet: WEB_API_KEY is not set on the server.');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    // The API throttles sign-in per client address, so it must see the visitor and not this server.
    'X-Forwarded-For': ip,
  };
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;
  if (authorization) headers.Authorization = authorization;
  if (WEB_API_KEY) headers['X-API-Key'] = WEB_API_KEY;

  const url = `${API_URL}/${path}${req.nextUrl.search}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  try {
    // Only public reads are shared. Anything with a login, and every write, goes straight through.
    if (req.method === 'GET' && !authorization) {
      const hit = cache.get(url);
      if (hit && hit.expires > Date.now()) return toResponse(hit.reply);

      let pending = inFlight.get(url);
      if (!pending) {
        pending = callUpstream(url, { method: 'GET', headers }).finally(() => inFlight.delete(url));
        inFlight.set(url, pending);
      }
      const reply = await pending;
      if (reply.status === 200) {
        cache.set(url, { expires: Date.now() + CACHE_MS, reply });
        if (cache.size > 500) cache.forEach((v, k) => { if (v.expires <= Date.now()) cache.delete(k); });
      }
      return toResponse(reply);
    }

    return toResponse(await callUpstream(url, { method: req.method, headers, body: hasBody ? await req.text() : undefined }));
  } catch {
    return json(502, 'The API did not answer in time. Try again in a moment.');
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
