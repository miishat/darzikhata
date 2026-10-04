import { useCallback, useState } from 'react';
import { readSetting, writeSetting } from '../lib/safeStorage';

export type ThemePreference = 'auto' | 'light' | 'dark';

const KEY = 'dk.theme';

/** Mirrors the `--surface` token in index.css for each scheme; the browser bar cannot read CSS variables. */
export const THEME_SURFACE = { light: '#f4f6fb', dark: '#0f131a' } as const;

const THEME_COLOR = 'meta[name="theme-color"]';
const originalColours = new WeakMap<Element, string>();

/** Hand-picked Light or Dark paints both metas that colour; Device puts back each meta's own value. */
function applyBrowserBar(theme: ThemePreference): void {
  document.querySelectorAll<HTMLMetaElement>(THEME_COLOR).forEach((meta) => {
    if (!originalColours.has(meta)) originalColours.set(meta, meta.content);
    meta.content = theme === 'auto' ? (originalColours.get(meta) ?? meta.content) : THEME_SURFACE[theme];
  });
}

/** Light until the person chooses otherwise; `auto` is an explicit choice to follow the device. */
export function readTheme(): ThemePreference {
  const saved = readSetting(KEY);
  return saved === 'auto' || saved === 'dark' ? saved : 'light';
}

/** `auto` removes the override so the device's own light or dark setting applies. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  applyBrowserBar(theme);
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
