'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { themes, type Theme, type ThemeName } from './palette';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'wcm-theme';
const EVENT = 'wcm-theme-change';

/**
 * Runs in the page head before anything is drawn, so a visitor who chose dark never sees a light flash.
 * It must stay in step with resolve() below.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function resolve(pref: ThemePreference): ThemeName {
  if (pref === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return pref;
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  mq.addEventListener('change', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
    mq.removeEventListener('change', onChange);
  };
}

interface Ctx {
  preference: ThemePreference;
  theme: ThemeName;
  colors: Theme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<Ctx>({ preference: 'system', theme: 'light', colors: themes.light, setPreference: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // One string that changes whenever the choice or the system setting does.
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${readPreference()}|${resolve(readPreference())}`,
    () => 'system|light',
  );
  const [preference, theme] = snapshot.split('|') as [ThemePreference, ThemeName];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setPreference = useCallback((p: ThemePreference) => {
    try { localStorage.setItem(KEY, p); } catch { /* storage can be blocked. The theme then lasts for this visit only. */ }
    document.documentElement.classList.toggle('dark', resolve(p) === 'dark');
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const value = useMemo(() => ({ preference, theme, colors: themes[theme], setPreference }), [preference, theme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
