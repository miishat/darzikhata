import { ALTERATION_STAGES, DEFAULT_ROLES, emptyState, type ApplyOutcome, type ShopConfig } from '@darzikhata/domain';
import { makeItem, makeOrder } from '@darzikhata/domain/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_WORK_QUERY,
  assignBody,
  assignees,
  batchStageTargets,
  filterWork,
  groupWork,
  planAssign,
  planStageMove,
  readWorkQuery,
  runBatch,
  stageMoveBody,
  stageOptions,
  workItems,
  workPhase,
  phaseCounts,
  writeWorkQuery,
} from './workList';

const orders = [
  makeOrder({
    id: 'o1',
    number: 'A-0001',
    items: [
      makeItem({ id: 'a', stageKey: 'cutting', assignedTo: 'tailor-1', deliveryDate: '2026-10-08' }),
      makeItem({ id: 'b', stageKey: 'stitching', assignedTo: 'tailor-2', deliveryDate: '2026-10-05' }),
      makeItem({ id: 'c', stageKey: 'ready', assignedTo: 'tailor-1', deliveryDate: '2026-10-04' }),
    ],
  }),
  makeOrder({
    id: 'o2',
    number: 'A-0002',
    branchId: 'workshop',
    items: [
      makeItem({ id: 'd', stageKey: 'booked', deliveryDate: '2026-10-04' }),
      makeItem({
        id: 'e',
        templateId: 'alteration',
        garmentName: { bn: 'অল্টারেশন', en: 'Alteration' },
        stages: ALTERATION_STAGES,
        stageKey: 'working',
        assignedTo: 'tailor-1',
        deliveryDate: '2026-10-04',
      }),
      makeItem({ id: 'f', stageKey: 'cutting', assignedTo: 'tailor-1', cancelled: { reason: 'x', at: '', by: '' } }),
    ],
  }),
];

const config: ShopConfig = {
  id: 'test',
  profile: { name: { bn: 'দোকান', en: 'Shop' }, phone: '', address: '' },
  branches: [
    { id: 'main', name: { bn: 'দোকান', en: 'Shop' }, kind: 'shop', address: '' },
    { id: 'workshop', name: { bn: 'কারখানা', en: 'Workshop' }, kind: 'workshop', address: '' },
  ],
  devices: [{ id: 'device-a', name: 'Phone', series: 'A', branchId: 'main' }],
  roles: DEFAULT_ROLES,
  staff: [
    { id: 'owner', name: 'Owner', roleId: 'owner', branchIds: 'all', pin: '1111', active: true },
    { id: 'tailor-2', name: 'Selim', roleId: 'tailor', branchIds: ['main'], pin: '2222', active: true },
    { id: 'tailor-1', name: 'Rafiq', roleId: 'tailor', branchIds: 'all', pin: '3333', active: true },
    { id: 'old', name: 'Old', roleId: 'tailor', branchIds: 'all', pin: '4444', active: false },
    { id: 'counter', name: 'Counter', roleId: 'counter', branchIds: 'all', pin: '5555', active: true },
  ],
  templates: [],
  settings: { restrictFemaleMeasurements: false, linkExpiryDays: 30, defaultLanguage: 'bn' },
};

const all = () => workItems(orders, { staffId: 'owner', seesAll: true });
const ref = (id: string) => {
  for (const order of orders) {
    const item = order.items.find((i) => i.id === id);
    if (item) return { order, item };
  }
  throw new Error(id);
};
const ids = (refs: Array<{ item: { id: string } }>) => refs.map((r) => r.item.id);

describe('workItems', () => {
  it('lists garments still being made, earliest promised first, and only your own without work.view.all', () => {
    expect(ids(all())).toEqual(['d', 'e', 'b', 'a']);
    expect(ids(workItems(orders, { staffId: 'tailor-1', seesAll: false }))).toEqual(['e', 'a']);
  });
});

describe('groupWork', () => {
  it('groups by worker in staff-list order, with unassigned garments last', () => {
    const groups = groupWork(all(), 'worker', config);
    expect(groups.map((g) => g.key)).toEqual(['tailor-2', 'tailor-1', 'none']);
    expect(groups.map((g) => g.staff?.name ?? null)).toEqual(['Selim', 'Rafiq', null]);
    expect(ids(groups[1]!.refs)).toEqual(['e', 'a']);
  });

  it('groups by stage in stage-list order, whatever garment the stage belongs to', () => {
    const groups = groupWork(all(), 'stage', config);
    expect(groups.map((g) => g.key)).toEqual(['booked', 'cutting', 'working', 'stitching']);
    expect(groups[2]!.stage!.label.en).toBe('Working');
    expect(stageOptions(all(), config).map((s) => s.key)).toEqual(['booked', 'cutting', 'working', 'stitching']);
  });
});

describe('filters', () => {
  it('filters by worker, unassigned and stage', () => {
    expect(ids(filterWork(all(), { ...DEFAULT_WORK_QUERY, worker: 'none' }))).toEqual(['d']);
    expect(ids(filterWork(all(), { ...DEFAULT_WORK_QUERY, worker: 'tailor-1', stage: 'working' }))).toEqual(['e']);
  });

  it('reads and writes the filters in the URL, leaving defaults out', () => {
    expect(readWorkQuery(new URLSearchParams('by=stage&worker=none&stage=cutting'))).toEqual({ by: 'stage', worker: 'none', stage: 'cutting' });
    expect(readWorkQuery(new URLSearchParams('by=colour'))).toEqual(DEFAULT_WORK_QUERY);
    expect(writeWorkQuery(DEFAULT_WORK_QUERY).toString()).toBe('');
    expect(writeWorkQuery({ by: 'stage', worker: 'all', stage: 'trial' }).toString()).toBe('by=stage&stage=trial');
  });
});

describe('batch stage moves', () => {
  it('offers forward stages any selected garment can reach, never handing over', () => {
    expect(batchStageTargets([ref('a'), ref('b'), ref('e')]).map((s) => s.key)).toEqual(['stitching', 'trial', 'ready']);
    expect(batchStageTargets([ref('c')])).toEqual([]);
  });

  it('plans each garment, skipping ones that cannot make the move', () => {
    const plan = planStageMove([ref('a'), ref('b'), ref('e'), ref('d')], 'stitching');
    expect(plan.map((r) => (r.ok ? `${r.from.key}>${r.to.key}` : r.reason))).toEqual([
      'cutting>stitching',
      'same-stage',
      'not-in-list',
      'skips-required',
    ]);
    const ready = planStageMove([ref('a'), ref('b')], 'ready');
    expect(ready.map((r) => (r.ok ? r.skipped : r.reason))).toEqual(['skips-required', ['trial']]);
    expect(planStageMove([ref('b')], 'cutting')[0]).toMatchObject({ ok: false, reason: 'backward' });
    expect(planStageMove([ref('c'), ref('b')], 'delivered').map((r) => !r.ok && r.reason)).toEqual(['hand-over', 'hand-over']);
  });

  it('turns a planned move into a stage change', () => {
    const row = planStageMove([ref('a')], 'stitching')[0]!;
    if (!row.ok) throw new Error('expected a move');
    expect(stageMoveBody(row)).toEqual({ type: 'item.stageChanged', orderId: 'o1', itemId: 'a', to: 'stitching', reason: '' });
  });
});

describe('batch assignment', () => {
  it('skips garments the person already has, and records the version the preview was based on', () => {
    expect(planAssign([ref('a'), ref('b'), ref('d')], 'tailor-1').map((r) => r.ok)).toEqual([false, true, true]);
    expect(planAssign([ref('d')], null)[0]).toMatchObject({ ok: false, reason: 'already-assigned' });
    expect(assignBody(ref('b'), 'tailor-1')).toEqual({
      type: 'item.assigned',
      orderId: 'o1',
      itemId: 'b',
      baseVersion: 1,
      assigneeId: 'tailor-1',
    });
  });

  it('offers active makers who work in every selected garment’s branch', () => {
    expect(assignees(config, ['main', 'workshop']).map((s) => s.id)).toEqual(['owner', 'tailor-1']);
    expect(assignees(config, ['main']).map((s) => s.id)).toEqual(['owner', 'tailor-2', 'tailor-1']);
  });
});

describe('runBatch', () => {
  it('saves one garment at a time and reports each result', async () => {
    const state = emptyState();
    const dispatch = vi
      .fn<(body: unknown) => Promise<ApplyOutcome>>()
      .mockResolvedValueOnce({ kind: 'applied', state })
      .mockResolvedValueOnce({ kind: 'conflict', state, currentVersion: 2 });
    const steps = [
      { ref: ref('b'), body: assignBody(ref('b'), 'tailor-1') },
      { ref: ref('d'), body: assignBody(ref('d'), 'tailor-1') },
    ];
    const results = await runBatch(dispatch, steps, 'bn');
    expect(dispatch.mock.calls.map(([body]) => (body as { itemId: string }).itemId)).toEqual(['b', 'd']);
    expect(results.map((r) => [r.ref.item.id, r.problem])).toEqual([
      ['b', null],
      ['d', 'এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।'],
    ]);
  });

  it('contains a failed save to its garment and still tries the rest', async () => {
    const state = emptyState();
    const dispatch = vi
      .fn<(body: unknown) => Promise<ApplyOutcome>>()
      .mockResolvedValueOnce({ kind: 'applied', state })
      .mockRejectedValueOnce(new Error('IndexedDB failed'))
      .mockResolvedValueOnce({ kind: 'applied', state });
    const steps = ['a', 'b', 'd'].map((id) => ({ ref: ref(id), body: assignBody(ref(id), 'tailor-1') }));
    const results = await runBatch(dispatch, steps, 'en');
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(results.map((r) => [r.ref.item.id, r.problem])).toEqual([
      ['a', null],
      ['b', 'Could not save. Please try again.'],
      ['d', null],
    ]);
  });
});

describe('workPhase', () => {
  const at = (stageKey: string, stages = orders[0]!.items[0]!.stages) => makeItem({ stageKey, stages });

  it('splits a garment’s own unfinished stages into start, making and finishing', () => {
    // Standard stages: booked, cutting, stitching, trial (optional), then ready and delivered.
    expect(workPhase(at('booked'))).toBe('start');
    expect(workPhase(at('cutting'))).toBe('making');
    expect(workPhase(at('stitching'))).toBe('making');
    expect(workPhase(at('trial'))).toBe('finish');
  });

  it('puts the last required stage in finishing when nothing optional follows it', () => {
    expect(workPhase(makeItem({ stages: ALTERATION_STAGES, stageKey: 'booked' }))).toBe('start');
    expect(workPhase(makeItem({ stages: ALTERATION_STAGES, stageKey: 'working' }))).toBe('finish');
  });

  it('counts garments in each phase', () => {
    const refs = workItems(orders, { staffId: 'x', seesAll: true });
    expect(phaseCounts(refs)).toEqual({ start: 1, making: 2, finish: 1 });
  });
});
