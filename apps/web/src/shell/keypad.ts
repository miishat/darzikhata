import { useCallback, useSyncExternalStore } from 'react';
import { readSetting, writeSetting } from '../lib/safeStorage';

const KEY = 'dk.keypad';
const listeners = new Set<() => void>();

/** The measurement keypad is on unless this device has turned it off. */
export function readKeypadOn(): boolean {
  return readSetting(KEY) !== 'off';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useKeypadOn(): { keypadOn: boolean; setKeypadOn(on: boolean): void } {
  const keypadOn = useSyncExternalStore(subscribe, readKeypadOn, () => true);
  const setKeypadOn = useCallback((on: boolean) => {
    writeSetting(KEY, on ? 'on' : 'off');
    for (const listener of listeners) listener();
  }, []);
  return { keypadOn, setKeypadOn };
}
