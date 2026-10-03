import { toEnglishDigits } from './digits';
import type { Label } from './label';

export const CAPABILITIES = [
  'orders.view',
  'orders.create',
  'orders.edit',
  'orders.cancel',
  'customers.view',
  'customers.edit',
  'measurements.view',
  'measurements.view.female',
  'measurements.edit',
  'money.view',
  'payments.record',
  'payments.correct',
  'payments.refund',
  'work.view.assigned',
  'work.view.all',
  'work.assign',
  'work.updateStage',
  'links.manage',
  'settings.edit',
  'staff.manage',
  'branches.view.all',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export interface Role {
  id: string;
  name: Label;
  capabilities: Capability[];
}

export interface Staff {
  id: string;
  name: string;
  roleId: string;
  /** 'all' or the branch ids this person works in. */
  branchIds: 'all' | string[];
  /** Demo only: stored as typed. The pilot stores a hash instead. */
  pin: string;
  active: boolean;
}

const role = (id: string, bn: string, en: string, capabilities: Capability[]): Role => ({
  id,
  name: { bn, en },
  capabilities,
});

export const DEFAULT_ROLES: Role[] = [
  role('owner', 'মালিক', 'Owner', [...CAPABILITIES]),
  role(
    'manager',
    'ম্যানেজার',
    'Manager',
    CAPABILITIES.filter((c) => c !== 'staff.manage'),
  ),
  role('counter', 'কাউন্টার', 'Counter staff', [
    'orders.view',
    'orders.create',
    'orders.edit',
    'customers.view',
    'customers.edit',
    'measurements.view',
    'measurements.edit',
    'money.view',
    'payments.record',
    'work.view.all',
    'links.manage',
  ]),
  role('cutting', 'মাপ ও কাটিং', 'Measurement & cutting', [
    'orders.view',
    'customers.view',
    'measurements.view',
    'measurements.edit',
    'work.view.all',
    'work.updateStage',
  ]),
  role('supervisor', 'প্রোডাকশন সুপারভাইজার', 'Production supervisor', [
    'orders.view',
    'customers.view',
    'measurements.view',
    'work.view.all',
    'work.assign',
    'work.updateStage',
  ]),
  role('tailor', 'দর্জি', 'Tailor', ['measurements.view', 'work.view.assigned', 'work.updateStage']),
  role('accounts', 'হিসাবরক্ষক', 'Accounts', [
    'orders.view',
    'customers.view',
    'money.view',
    'payments.record',
    'payments.correct',
    'payments.refund',
  ]),
];

export function can(role: Role, capability: Capability): boolean {
  return role.capabilities.includes(capability);
}

/**
 * Whether this role may see a customer's measurements. When the shop restricts
 * women's measurements, female customers additionally need 'measurements.view.female'.
 */
export function canViewMeasurementsOf(
  role: Role,
  customer: { gender: 'male' | 'female' | 'other' | null },
  restrictFemaleMeasurements: boolean,
): boolean {
  if (!can(role, 'measurements.view')) return false;
  if (restrictFemaleMeasurements && customer.gender === 'female') {
    return can(role, 'measurements.view.female');
  }
  return true;
}

export function canAccessBranch(staff: Staff, branchId: string): boolean {
  return staff.branchIds === 'all' || staff.branchIds.includes(branchId);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(toEnglishDigits(pin));
}

export function verifyPin(staff: Staff, input: string): boolean {
  return staff.active && toEnglishDigits(input) === toEnglishDigits(staff.pin);
}
