import { createContext, Suspense, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { lazyPage } from '../../app/lazy';
import { useSnapshot } from '../../data/StoreContext';
import { readSetting, writeSetting } from '../../lib/safeStorage';

const KEY = 'dk.presenter';

interface PresenterSettingValue {
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

const PresenterSettingContext = createContext<PresenterSettingValue | null>(null);

/** Whether presenter mode is on for this device. */
export function PresenterProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => readSetting(KEY) === 'on');
  const value = useMemo<PresenterSettingValue>(
    () => ({
      enabled,
      setEnabled: (next) => {
        writeSetting(KEY, next ? 'on' : 'off');
        setEnabledState(next);
      },
    }),
    [enabled],
  );
  return <PresenterSettingContext.Provider value={value}>{children}</PresenterSettingContext.Provider>;
}

export function usePresenterSetting(): PresenterSettingValue {
  const value = useContext(PresenterSettingContext);
  if (!value) throw new Error('usePresenterSetting must be used inside PresenterProvider');
  return value;
}

const PresenterPanel = lazyPage(() => import('./PresenterPanel'), 'PresenterPanel');

/** The presenter panel, downloaded only while the mode is on, and never on the customer's status page. */
export function PresenterRoot() {
  const { enabled } = usePresenterSetting();
  const { status } = useSnapshot();
  const { pathname } = useLocation();
  if (!enabled || status !== 'ready' || pathname.startsWith('/s/')) return null;
  return (
    <Suspense fallback={null}>
      <PresenterPanel />
    </Suspense>
  );
}
