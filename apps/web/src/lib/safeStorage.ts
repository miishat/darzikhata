/**
 * localStorage for per-viewer conveniences (language, layout override). It can be
 * missing or throw in private windows, so every access is guarded and failures are ignored.
 */
export function readSetting(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the setting simply is not remembered.
  }
}
