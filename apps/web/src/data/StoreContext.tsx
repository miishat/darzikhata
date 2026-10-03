import { roleOf, staffById, type Role, type Staff } from '@darzikhata/domain';
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { ShopStore, StoreSnapshot } from './store';

const StoreContext = createContext<ShopStore | null>(null);

export function StoreProvider({ store, children }: { store: ShopStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): ShopStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

export function useSnapshot(): StoreSnapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** The signed-in staff member and their role, or null when nobody is signed in. */
export function useCurrentStaff(): { staff: Staff; role: Role } | null {
  const { config, session } = useSnapshot();
  if (!config || !session?.staffId) return null;
  const staff = staffById(config, session.staffId);
  const role = roleOf(config, session.staffId);
  return staff && role ? { staff, role } : null;
}
