'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import { useRouter } from 'next/navigation';
import { ApiError } from './api';
import type { AuthUser } from './types';

// The token lives in sessionStorage: it ends with the tab. A production setup should move it
// to an httpOnly cookie set by the API, which needs an API change.
const TOKEN_KEY = 'ww_token';
const USER_KEY = 'ww_user';

export function readSession(): { token: string; user: AuthUser | null } | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const raw = sessionStorage.getItem(USER_KEY);
    return { token, user: raw ? (JSON.parse(raw) as AuthUser) : null };
  } catch {
    return null;
  }
}

// Tells every part of the page that the session changed. Without this, the admin layout (which stays
// mounted when you move from the sign-in page to the queue) kept the "signed out" answer it read
// before you signed in, and sent you straight back to the sign-in page.
const SESSION_EVENT = 'ww-session';

function announceSessionChange() {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function saveSession(token: string, user: AuthUser) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage can be blocked; the sign-in page reports it */
  }
  announceSessionChange();
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    /* nothing to clear */
  }
  announceSessionChange();
}

function subscribe(onChange: () => void) {
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// One string that changes whenever the stored session does. A token never contains a newline, and
// the user is JSON, which escapes them, so the newline is a safe separator.
function readRaw(): string {
  try {
    return `${sessionStorage.getItem(TOKEN_KEY) ?? ''}\n${sessionStorage.getItem(USER_KEY) ?? ''}`;
  } catch {
    return '\n';
  }
}

const NOT_IN_BROWSER = 'server';

/**
 * The signed-in admin session, always current. `ready` is false while the page is still being
 * prepared on the server, so a page shows a skeleton instead of flashing a redirect.
 */
export function useSession() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => NOT_IN_BROWSER);

  return useMemo(() => {
    if (raw === NOT_IN_BROWSER) return { ready: false, token: null as string | null, user: null as AuthUser | null };
    const [token, user] = raw.split('\n');
    let parsed: AuthUser | null = null;
    try {
      parsed = user ? (JSON.parse(user) as AuthUser) : null;
    } catch {
      parsed = null;
    }
    return { ready: true, token: token || null, user: parsed };
  }, [raw]);
}

export function useSignOut() {
  const router = useRouter();
  return useCallback(() => {
    clearSession();
    router.replace('/admin/login');
  }, [router]);
}

/**
 * SWR for an endpoint that needs the admin token. Returns nothing until the token is known,
 * and sends the user back to sign in when the API answers 401.
 */
export function useAuthedSWR<T>(
  key: string | null,
  fetcher: (token: string) => Promise<T>,
  config?: SWRConfiguration<T, ApiError>,
) {
  const router = useRouter();
  const session = useSession();

  const result = useSWR<T, ApiError>(
    session.token && key ? [key, session.token] : null,
    ([, token]: [string, string]) => fetcher(token),
    { revalidateOnFocus: false, shouldRetryOnError: false, ...config },
  );

  useEffect(() => {
    if (result.error?.status === 401) {
      clearSession();
      router.replace('/admin/login');
    }
  }, [result.error, router]);

  return { ...result, token: session.token, user: session.user, sessionReady: session.ready };
}
