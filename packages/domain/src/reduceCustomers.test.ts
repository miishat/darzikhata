import { describe, expect, it } from 'vitest';
import { applyEvent, replay } from './apply';
import { snapshotOf } from './measurements';
import { emptyState } from './model';
import { eventFactory, newCustomer } from './testing/fixtures';

const version = (id: string, chest: number) => ({
  id,
  takenAt: '2026-10-03T04:00:00.000Z',
  takenBy: 'staff-owner',
  source: 'body' as const,
  notes: '',
  values: { chest: { value: chest, unit: 'inch' as const } },
});

describe('customer events', () => {
  it('creates a customer at version 1 with the event time', () => {
    const ev = eventFactory();
    const created = ev({ type: 'customer.created', customer: newCustomer() });
    const { state } = replay([created]);
    expect(state.customers.c1).toMatchObject({ name: 'রহিম উদ্দিন', version: 1, createdAt: created.at });
  });

  it('rejects duplicate ids and empty names', () => {
    const ev = eventFactory();
    const { outcomes } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'customer.created', customer: newCustomer({ id: 'c2', name: '  ' }) }),
    ]);
    expect(outcomes.map((o) => o.reason ?? o.outcome)).toEqual(['applied', 'customer-exists', 'name-required']);
  });

  it('allows two customers with the same phone number, never merging them', () => {
    const ev = eventFactory();
    const { state } = replay([
      ev({ type: 'household.created', household: { id: 'h1', label: 'Uddin family' } }),
      ev({ type: 'customer.created', customer: newCustomer({ householdId: 'h1' }) }),
      ev({ type: 'customer.created', customer: newCustomer({ id: 'c2', name: 'সাকিব', householdId: 'h1' }) }),
    ]);
    expect(Object.keys(state.customers)).toEqual(['c1', 'c2']);
    expect(state.customers.c2!.householdId).toBe('h1');
  });

  it('applies an edit based on the current version and bumps the version', () => {
    const ev = eventFactory();
    const { state } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01812000000' } }),
    ]);
    expect(state.customers.c1).toMatchObject({ phone: '01812000000', version: 2 });
  });

  it('reports a stale edit as a conflict without changing state', () => {
    const ev = eventFactory();
    const { state } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { name: 'Rahim' } }),
    ]);
    const result = applyEvent(state, ev({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '0' } }));
    expect(result.kind).toBe('conflict');
    expect(result.kind === 'conflict' && result.currentVersion).toBe(2);
    expect(result.state).toBe(state);
  });

  it('rejects unknown households', () => {
    const ev = eventFactory();
    const result = applyEvent(emptyState(), ev({ type: 'customer.created', customer: newCustomer({ householdId: 'nope' }) }));
    expect(result.kind === 'rejected' && result.reason).toBe('unknown-household');
  });
});

describe('measurement events', () => {
  it('appends versions to the profile for that customer and garment', () => {
    const ev = eventFactory();
    const { state } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v2', 40) }),
    ]);
    expect(state.profiles['c1:shirt']!.versions.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  it('does not change a snapshot already taken when a newer version is recorded', () => {
    const ev = eventFactory();
    const first = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
    ]).state;
    const snapshot = snapshotOf(first.profiles['c1:shirt']!.versions[0]!);
    replay([ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v2', 42) })], first);
    expect(snapshot.values.chest!.value).toBe(38);
  });

  it('rejects unknown customers, invalid values and repeated version ids', () => {
    const ev = eventFactory();
    const { outcomes } = replay([
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 0) }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
    ]);
    expect(outcomes.map((o) => o.reason ?? o.outcome)).toEqual([
      'unknown-customer',
      'applied',
      'invalid-measurement',
      'applied',
      'version-exists',
    ]);
  });
});
