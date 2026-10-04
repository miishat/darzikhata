import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, readTheme, useTheme } from './theme';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme', () => {
  it('follows the device until a choice is saved', () => {
    expect(readTheme()).toBe('auto');
    applyTheme(readTheme());
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
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
  });

  it('ignores a saved value it does not know', () => {
    localStorage.setItem('dk.theme', 'purple');
    expect(readTheme()).toBe('auto');
  });
});
