import { DEFAULT_ROLES, emptyState, type Branch } from '@darzikhata/domain';
import { makeOrder } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { shopConfig } from '../../seed/shops';
import { allowedBranches, branchIdsFor, resolveChoice, scopeState } from './branchScope';

const uniform = shopConfig('uniform');
const role = (id: string) => DEFAULT_ROLES.find((r) => r.id === id)!;
const staff = (id: string) => uniform.staff.find((s) => s.id === id)!;
const ids = (branches: Branch[]) => branches.map((b) => b.id);

describe('allowedBranches', () => {
  it('gives every branch to roles that see all branches, and their own branches to everyone else', () => {
    expect(ids(allowedBranches(uniform, staff('uniform-owner'), role('owner')))).toEqual(['shop', 'workshop']);
    expect(ids(allowedBranches(uniform, staff('uniform-counter'), role('counter')))).toEqual(['shop']);
    expect(ids(allowedBranches(uniform, staff('uniform-supervisor'), role('supervisor')))).toEqual(['workshop']);
    expect(ids(allowedBranches(uniform, staff('uniform-tailor-1'), role('tailor')))).toEqual(['shop', 'workshop']);
    expect(ids(allowedBranches(uniform, { ...staff('uniform-counter'), branchIds: ['shop'] }, role('manager')))).toEqual([
      'shop',
      'workshop',
    ]);
  });
});

describe('resolveChoice and branchIdsFor', () => {
  const both = uniform.branches;
  const shopOnly = both.slice(0, 1);

  it('keeps a saved choice that is still allowed, and otherwise shows everything allowed', () => {
    expect(resolveChoice('workshop', both)).toBe('workshop');
    expect(resolveChoice('all', both)).toBe('all');
    expect(resolveChoice('gone', both)).toBe('all');
    expect(resolveChoice(null, both)).toBe('all');
    expect(resolveChoice('workshop', shopOnly)).toBe('shop');
    expect(resolveChoice('all', shopOnly)).toBe('shop');
  });

  it('turns a choice into branch ids', () => {
    expect(branchIdsFor('all', both)).toEqual(['shop', 'workshop']);
    expect(branchIdsFor('workshop', both)).toEqual(['workshop']);
    expect(branchIdsFor('workshop', shopOnly)).toEqual([]);
  });
});

describe('scopeState', () => {
  it('keeps only the chosen branches’ orders and every customer', () => {
    const state = {
      ...emptyState(),
      customers: { c1: { id: 'c1' } as never },
      orders: { o1: makeOrder({ id: 'o1', branchId: 'shop' }), o2: makeOrder({ id: 'o2', branchId: 'workshop' }) },
    };
    const scoped = scopeState(state, ['workshop']);
    expect(Object.keys(scoped.orders)).toEqual(['o2']);
    expect(scoped.customers).toBe(state.customers);
    expect(scopeState(state, ['shop', 'workshop'])).toBe(state);
  });
});
