import { useCallback, useState } from 'react';
import { readSetting, writeSetting } from '../lib/safeStorage';

export type ThemePreference = 'auto' | 'light' | 'dark';

const KEY = 'dk.theme';

export function readTheme(): ThemePreference {
  const saved = readSetting(KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'auto';
}

/** `auto` removes the override so the device's own light or dark setting applies. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function useTheme(): { theme: ThemePreference; setTheme(next: ThemePreference): void } {
  const [theme, setThemeState] = useState<ThemePreference>(readTheme);
  const setTheme = useCallback((next: ThemePreference) => {
    writeSetting(KEY, next);
    applyTheme(next);
    setThemeState(next);
  }, []);
  return { theme, setTheme };
}
