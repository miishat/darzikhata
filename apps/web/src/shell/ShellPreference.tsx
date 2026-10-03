import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readSetting, writeSetting } from '../lib/safeStorage';

export type ShellKind = 'mobile' | 'desktop';
export type ShellPreference = 'auto' | ShellKind;

const PREFERENCE_KEY = 'dk.layout';
const DESKTOP_QUERY = '(min-width: 1024px)';

interface ShellContextValue {
  kind: ShellKind;
  preference: ShellPreference;
  setPreference(preference: ShellPreference): void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

function readPreference(): ShellPreference {
  const saved = readSetting(PREFERENCE_KEY);
  return saved === 'mobile' || saved === 'desktop' ? saved : 'auto';
}

function matchesDesktop(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP_QUERY).matches;
}

/** Chooses the desktop layout at 1024px and wider, unless this device has a saved override. */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ShellPreference>(readPreference);
  const [wide, setWide] = useState(matchesDesktop);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setWide(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const value = useMemo<ShellContextValue>(
    () => ({
      kind: preference === 'auto' ? (wide ? 'desktop' : 'mobile') : preference,
      preference,
      setPreference: (next) => {
        writeSetting(PREFERENCE_KEY, next);
        setPreferenceState(next);
      },
    }),
    [preference, wide],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const context = useContext(ShellContext);
  if (!context) throw new Error('useShell must be used inside ShellProvider');
  return context;
}
