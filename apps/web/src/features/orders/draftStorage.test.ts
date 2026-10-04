import { replay, type ShopState } from '@darzikhata/domain';
import { eventFactory, newCustomer } from '@darzikhata/domain/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shopConfig } from '../../seed/shops';
import { emptyDraft, newDraftItem, type OrderDraft } from './draft';
import { clearDraft, draftKey, readDraft, restoreDraft, writeDraft } from './draftStorage';

const config = shopConfig('rahman');
const state: ShopState = replay([eventFactory()({ type: 'customer.created', customer: newCustomer() })]).state;
const shirt = config.templates.find((t) => t.id === 'shirt')!;

function sample(): OrderDraft {
  const item = newDraftItem(shirt, 'k1', { customerId: null, state, canSee: true, deliveryDate: '2026-10-12' });
  return {
    ...emptyDraft(),
    customer: { kind: 'existing', customerId: 'c1' },
    items: [
      {
        ...item,
        wearer: 'ছেলে',
        assignedTo: 'rahman-owner',
        measurements: { kind: 'new', values: { chest: 38 }, source: 'body', notes: 'ঢিলা' },
      },
    ],
    advance: { amount: 50000, method: 'bkash', reference: 'TX9' },
    notes: 'জরুরি',
  };
}
const KEY = draftKey('rahman', 'main', 'rahman-owner');
const ctx = { config, state, keepMeasurements: true, workers: ['rahman-owner'] };

beforeEach(() => window.localStorage.clear());

describe('draft storage', () => {
  it('scopes the key by shop, branch and signed-in user', () => {
    expect(KEY).toBe('dk.draft.rahman.main.rahman-owner');
    expect(draftKey('rahman', 'main', 'other')).not.toBe(KEY);
    expect(draftKey('rahman', 'second', 'rahman-owner')).not.toBe(KEY);
    expect(draftKey('nakshi', 'main', 'rahman-owner')).not.toBe(KEY);
  });

  it('writes, reads back and clears', () => {
    writeDraft(KEY, sample(), { keepMeasurements: true });
    expect(readDraft(KEY)).toEqual(sample());
    clearDraft(KEY);
    expect(readDraft(KEY)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('never hands one user the draft of another', () => {
    writeDraft(KEY, sample(), { keepMeasurements: true });
    expect(readDraft(draftKey('rahman', 'main', 'someone-else'))).toBeNull();
  });

  it('ignores corrupt or foreign stored data', () => {
    for (const bad of ['{not json', 'null', '[]', '{"v":2,"draft":{}}', '{"v":1,"draft":{"items":"x"}}', '{"v":1,"draft":{"customer":null,"items":[{"key":1}],"discount":{},"advance":{},"notes":""}}']) {
      window.localStorage.setItem(KEY, bad);
      expect(readDraft(KEY)).toBeNull();
    }
  });

  it('survives storage that throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => writeDraft(KEY, sample(), { keepMeasurements: true })).not.toThrow();
    spy.mockRestore();
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readDraft(KEY)).toBeNull();
    expect(() => clearDraft(KEY)).not.toThrow();
    get.mockRestore();
  });

  it('does not persist measurement values or notes when they must not be kept', () => {
    writeDraft(KEY, sample(), { keepMeasurements: false });
    const stored = window.localStorage.getItem(KEY)!;
    expect(stored).not.toContain('"chest"');
    expect(stored).not.toContain('ঢিলা');
    expect(readDraft(KEY)!.items[0]!.measurements).toEqual({ kind: 'new', values: {}, source: 'body', notes: '' });
  });
});

describe('restoreDraft', () => {
  it('keeps what was typed, including the advance as a plain form value', () => {
    const restored = restoreDraft(sample(), ctx);
    expect(restored.advance).toEqual({ amount: 50000, method: 'bkash', reference: 'TX9' });
    expect(restored.items[0]).toMatchObject({ wearer: 'ছেলে', assignedTo: 'rahman-owner' });
    expect(restored.items[0]!.measurements).toMatchObject({ kind: 'new', values: { chest: 38 } });
  });

  it('drops garments whose template is gone, and a customer that no longer exists', () => {
    const draft = sample();
    draft.items.push({ ...draft.items[0]!, key: 'k2', templateId: 'gone' });
    draft.customer = { kind: 'existing', customerId: 'missing' };
    const restored = restoreDraft(draft, ctx);
    expect(restored.items.map((i) => i.key)).toEqual(['k1']);
    expect(restored.customer).toBeNull();
  });

  it('asks again whether saved measurements are still right', () => {
    const draft = sample();
    draft.items[0]!.measurements = { kind: 'saved', versionId: 'v1', confirmed: true };
    expect(restoreDraft(draft, ctx).items[0]!.measurements).toEqual({ kind: 'saved', versionId: 'v1', confirmed: false });
  });

  it('forgets a worker who can no longer be chosen', () => {
    expect(restoreDraft(sample(), { ...ctx, workers: [] }).items[0]!.assignedTo).toBeNull();
  });

  it('drops measurement values for someone who may not keep them', () => {
    const restored = restoreDraft(sample(), { ...ctx, keepMeasurements: false });
    expect(restored.items[0]!.measurements).toEqual({ kind: 'new', values: {}, source: 'body', notes: '' });
  });

  it('drops the unreadable-text flags, which describe a field that is rebuilt', () => {
    const draft = sample();
    draft.discount = { amount: null, reason: '', unreadable: true };
    expect(restoreDraft(draft, ctx).discount).toEqual({ amount: null, reason: '' });
  });
});
