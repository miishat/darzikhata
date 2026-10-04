import { describe, expect, it } from 'vitest';
import { shopConfig } from '../../seed/shops';
import { readStaff, staffForm, type StaffForm } from './staffInput';

const uniform = shopConfig('uniform');
const person = (id: string) => uniform.staff.find((s) => s.id === id)!;
const ctx = (staffId: string | null) => ({ config: uniform, staffId, selfId: 'uniform-owner', newId: () => 'staff-new' });
const form = (overrides: Partial<StaffForm> = {}): StaffForm => ({ ...staffForm(null, uniform), ...overrides });

describe('staffForm', () => {
  it('starts a new person as an active tailor in every branch', () => {
    expect(staffForm(null, uniform)).toEqual({ name: '', roleId: 'tailor', pin: '', allBranches: true, branchIds: [], active: true });
  });

  it('gives back the same person when nothing is changed', () => {
    for (const staff of uniform.staff) expect(readStaff(staffForm(staff, uniform), ctx(staff.id))).toEqual({ ok: true, staff });
  });
});

describe('readStaff', () => {
  it('builds a new person, reading Bangla digits and keeping branches in shop order', () => {
    expect(readStaff(form({ name: ' রিনা ', pin: '৫৫৫৫', allBranches: false, branchIds: ['workshop', 'shop'] }), ctx(null))).toEqual({
      ok: true,
      staff: { id: 'staff-new', name: 'রিনা', roleId: 'tailor', branchIds: ['shop', 'workshop'], pin: '5555', active: true },
    });
  });

  it('points out a missing name, a bad PIN and no branch', () => {
    expect(readStaff(form({ name: ' ', pin: '12a4', allBranches: false }), ctx(null))).toEqual({
      ok: false,
      errors: { name: 'settings.staff.error.name', pin: 'settings.staff.error.pin', branches: 'settings.staff.error.branches' },
    });
  });

  it('stops you changing your own role or deactivating yourself, but not someone else', () => {
    const owner = person('uniform-owner');
    const selfError = { ok: false, errors: { self: 'settings.staff.error.self' } };
    expect(readStaff({ ...staffForm(owner, uniform), roleId: 'manager' }, ctx(owner.id))).toEqual(selfError);
    expect(readStaff({ ...staffForm(owner, uniform), active: false }, ctx(owner.id))).toEqual(selfError);
    const tailor = person('uniform-tailor-2');
    expect(readStaff({ ...staffForm(tailor, uniform), active: false }, ctx(tailor.id))).toMatchObject({ ok: true, staff: { active: false } });
  });
});
