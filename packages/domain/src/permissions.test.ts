import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  DEFAULT_ROLES,
  can,
  canAccessBranch,
  canViewMeasurementsOf,
  isValidPin,
  verifyPin,
  type Staff,
} from './permissions';

const roleById = (id: string) => DEFAULT_ROLES.find((r) => r.id === id)!;

const staff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 's1',
  name: 'Karim',
  roleId: 'tailor',
  branchIds: ['main'],
  pin: '1234',
  active: true,
  ...overrides,
});

describe('default roles', () => {
  it('give the owner every capability', () => {
    expect(roleById('owner').capabilities).toEqual([...CAPABILITIES]);
  });

  it('keep money away from tailors', () => {
    const tailor = roleById('tailor');
    expect(can(tailor, 'money.view')).toBe(false);
    expect(can(tailor, 'payments.record')).toBe(false);
    expect(can(tailor, 'work.updateStage')).toBe(true);
  });

  it('let counter staff record payments but not correct or refund them', () => {
    const counter = roleById('counter');
    expect(can(counter, 'payments.record')).toBe(true);
    expect(can(counter, 'payments.correct')).toBe(false);
    expect(can(counter, 'payments.refund')).toBe(false);
  });

  it('stop managers from managing staff', () => {
    expect(can(roleById('manager'), 'staff.manage')).toBe(false);
    expect(can(roleById('manager'), 'settings.edit')).toBe(true);
  });
});

describe('canViewMeasurementsOf', () => {
  const counter = roleById('counter');
  const owner = roleById('owner');
  const accounts = roleById('accounts');

  it('requires measurements.view', () => {
    expect(canViewMeasurementsOf(accounts, { gender: 'male' }, false)).toBe(false);
  });

  it('allows everyone with measurements.view when no restriction is set', () => {
    expect(canViewMeasurementsOf(counter, { gender: 'female' }, false)).toBe(true);
  });

  it('hides female customers from roles without the female capability when restricted', () => {
    expect(canViewMeasurementsOf(counter, { gender: 'female' }, true)).toBe(false);
    expect(canViewMeasurementsOf(counter, { gender: 'male' }, true)).toBe(true);
    expect(canViewMeasurementsOf(owner, { gender: 'female' }, true)).toBe(true);
  });
});

describe('branches and PINs', () => {
  it('checks branch scope', () => {
    expect(canAccessBranch(staff(), 'main')).toBe(true);
    expect(canAccessBranch(staff(), 'workshop')).toBe(false);
    expect(canAccessBranch(staff({ branchIds: 'all' }), 'workshop')).toBe(true);
  });

  it('validates four-digit PINs in either script', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('১২৩৪')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('verifies PINs typed in either script, only for active staff', () => {
    expect(verifyPin(staff(), '১২৩৪')).toBe(true);
    expect(verifyPin(staff(), '1235')).toBe(false);
    expect(verifyPin(staff({ active: false }), '1234')).toBe(false);
  });
});
