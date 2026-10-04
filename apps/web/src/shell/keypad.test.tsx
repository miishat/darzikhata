import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readKeypadOn, useKeypadOn } from './keypad';

afterEach(() => localStorage.clear());

describe('keypad setting', () => {
  it('is on until it is turned off on this device', () => {
    expect(readKeypadOn()).toBe(true);
    const { result } = renderHook(() => useKeypadOn());
    act(() => result.current.setKeypadOn(false));
    expect(result.current.keypadOn).toBe(false);
    expect(readKeypadOn()).toBe(false);
    act(() => result.current.setKeypadOn(true));
    expect(readKeypadOn()).toBe(true);
  });

  it('keeps every user of the setting in step', () => {
    const a = renderHook(() => useKeypadOn());
    const b = renderHook(() => useKeypadOn());
    act(() => a.result.current.setKeypadOn(false));
    expect(b.result.current.keypadOn).toBe(false);
  });
});
