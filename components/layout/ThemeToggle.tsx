'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

/** Switches between light and dark. The first visit follows the device. After that the choice is kept. */
export function ThemeToggle() {
  const { theme, setPreference } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={() => setPreference(next)}
      aria-label={`Switch to the ${next} theme`}
      title={`Switch to the ${next} theme`}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
