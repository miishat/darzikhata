import { emptyState } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import type { SyncInfo } from '../../data/store';
import { shopConfig } from '../../seed/shops';
import { advance, currentStep, markCurrent, startProgress } from './progress';
import type { PresenterContext, Scenario } from './scenarios';

const sync: SyncInfo = { online: true, syncing: false, pending: 0, review: [], lastSyncAt: null };
const config = shopConfig('rahman');
const ctx = (path: string, online = true): PresenterContext => ({
  path,
  state: emptyState(),
  config,
  staffId: 'rahman-owner',
  sync: { ...sync, online },
  start: { state: emptyState(), config, reviewIds: [] },
});

const scenario: Scenario = {
  id: 'offline-sync',
  title: 'presenter.offlineSync.title',
  shop: 'rahman',
  steps: [
    { id: 'offline', text: 'presenter.offlineSync.offline', done: (c) => !c.sync.online },
    { id: 'orders', text: 'presenter.offlineSync.order', done: (c) => c.path === '/app/orders' },
    { id: 'look', text: 'presenter.offlineSync.payment' },
    { id: 'online', text: 'presenter.offlineSync.online', done: (c) => c.sync.online },
  ],
};

describe('Presenter progress', () => {
  it('starts at the first step', () => {
    expect(currentStep(scenario, startProgress('offline-sync'))?.id).toBe('offline');
  });

  it('ticks off steps in order while their checks hold, and stops at a step done by hand', () => {
    const progress = advance(scenario, startProgress('offline-sync'), ctx('/app/orders', false));
    expect(progress.marks).toEqual({ offline: 'done', orders: 'done' });
    expect(currentStep(scenario, progress)?.id).toBe('look');
  });

  it('never ticks a later step before the ones ahead of it', () => {
    const progress = advance(scenario, startProgress('offline-sync'), ctx('/app/orders', true));
    expect(progress.marks).toEqual({});
  });

  it('keeps a step done after its condition stops holding', () => {
    let progress = advance(scenario, startProgress('offline-sync'), ctx('/app/dashboard', false));
    progress = advance(scenario, progress, ctx('/app/dashboard', true));
    expect(progress.marks).toEqual({ offline: 'done' });
    expect(currentStep(scenario, progress)?.id).toBe('orders');
  });

  it('lets the presenter mark the current step done or skip it, and finishes after the last', () => {
    let progress = markCurrent(scenario, startProgress('offline-sync'), 'skipped');
    progress = markCurrent(scenario, progress, 'done');
    progress = markCurrent(scenario, progress, 'done');
    progress = advance(scenario, progress, ctx('/app/dashboard', true));
    expect(progress.marks).toEqual({ offline: 'skipped', orders: 'done', look: 'done', online: 'done' });
    expect(currentStep(scenario, progress)).toBeNull();
    expect(markCurrent(scenario, progress, 'done')).toBe(progress);
  });
});
