import { emptyState } from '@darzikhata/domain';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from '../../data/db';
import { StoreProvider } from '../../data/StoreContext';
import { ShopStore } from '../../data/store';
import { useCan, useMeasurementAccess } from './hooks';
import { problemText } from './problemText';

const dbs: DarziDb[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function signedIn(staffId: string, pin: string) {
  const db = new DarziDb(`common-${dbs.length}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  await store.startDemo('nakshi');
  await store.signOut();
  await store.signIn(staffId, pin);
  const wrapper = ({ children }: { children: ReactNode }) => <StoreProvider store={store}>{children}</StoreProvider>;
  return wrapper;
}

describe('useCan and useMeasurementAccess', () => {
  it('follows the role and the women’s measurement restriction', async () => {
    const counter = await signedIn('nakshi-counter', '2222');
    const can = renderHook(() => useCan(), { wrapper: counter }).result.current;
    expect(can('payments.record')).toBe(true);
    expect(can('payments.refund')).toBe(false);
    const access = renderHook(() => useMeasurementAccess(), { wrapper: counter }).result.current;
    expect(access({ gender: 'female' })).toBe(false);
    expect(access({ gender: 'male' })).toBe(true);

    const cutting = await signedIn('nakshi-cutting', '3333');
    expect(renderHook(() => useMeasurementAccess(), { wrapper: cutting }).result.current({ gender: 'female' })).toBe(true);
  });
});

describe('problemText', () => {
  it('explains conflicts and rejections, and says nothing for saves that worked', () => {
    const state = emptyState();
    expect(problemText({ kind: 'applied', state }, 'bn')).toBeNull();
    expect(problemText({ kind: 'duplicate', state }, 'bn')).toBeNull();
    expect(problemText({ kind: 'conflict', state, currentVersion: 2 }, 'en')).toBe(
      'Someone else changed this in the meantime. Check the latest details and try again.',
    );
    expect(problemText({ kind: 'rejected', state, reason: 'refund-exceeds-paid' }, 'bn')).toBe('সেভ করা যায়নি (refund-exceeds-paid)');
  });
});
