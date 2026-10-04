import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THEME_SURFACE, applyTheme, readTheme, useTheme } from './theme';

const LIGHT_MEDIA = '(prefers-color-scheme: light)';
const DARK_MEDIA = '(prefers-color-scheme: dark)';

function addMetas(): HTMLMetaElement[] {
  const specs: Array<[string, string]> = [
    [LIGHT_MEDIA, '#f4f6fb'],
    [DARK_MEDIA, '#0f131a'],
  ];
  return specs.map(([media, content]) => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.media = media;
    meta.content = content;
    document.head.appendChild(meta);
    return meta;
  });
}

let metas: HTMLMetaElement[] = [];
beforeEach(() => {
  metas = addMetas();
});

afterEach(() => {
  metas.forEach((m) => m.remove());
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme-color metas', () => {
  const colours = () => metas.map((m) => m.content);

  it('sets both to the dark surface when dark is picked', () => {
    applyTheme('dark');
    expect(colours()).toEqual([THEME_SURFACE.dark, THEME_SURFACE.dark]);
    expect(THEME_SURFACE.dark).toBe('#0f131a');
  });

  it('sets both to the light surface when light is picked', () => {
    applyTheme('light');
    expect(colours()).toEqual(['#f4f6fb', '#f4f6fb']);
  });

  it('restores the media-specific values for Device', () => {
    applyTheme('dark');
    applyTheme('auto');
    expect(colours()).toEqual(['#f4f6fb', '#0f131a']);
  });
});

describe('theme', () => {
  it('opens in light mode until a choice is saved', () => {
    expect(readTheme()).toBe('light');
    applyTheme(readTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('saves a choice on this device and applies it', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(readTheme()).toBe('dark');
    act(() => result.current.setTheme('auto'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(readTheme()).toBe('auto');
    act(() => result.current.setTheme('light'));
    expect(readTheme()).toBe('light');
  });

  it('ignores a saved value it does not know', () => {
    localStorage.setItem('dk.theme', 'purple');
    expect(readTheme()).toBe('light');
  });
});
