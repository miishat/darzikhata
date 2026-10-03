import type { Label, Language } from './label';
import type { ShopContact } from './links';
import { isValidSeries } from './numbering';
import { can, isValidPin, type Role, type Staff } from './permissions';
import { validateTemplate, type GarmentTemplate } from './templates';

export interface Branch {
  id: string;
  name: Label;
  kind: 'shop' | 'workshop';
  address: string;
}

/** A browser or phone that writes data. Each has its own order-number series. */
export interface Device {
  id: string;
  name: string;
  series: string;
  branchId: string;
}

export interface ShopProfile {
  name: Label;
  phone: string;
  address: string;
}

export interface ShopSettings {
  /** When true, female customers' measurements need 'measurements.view.female'. */
  restrictFemaleMeasurements: boolean;
  /** Status links expire this many days after an order is fully delivered or cancelled. */
  linkExpiryDays: number;
  defaultLanguage: Language;
}

/** Shop setup. Edited online only, so it lives outside the event log. */
export interface ShopConfig {
  id: string;
  profile: ShopProfile;
  branches: Branch[];
  devices: Device[];
  roles: Role[];
  staff: Staff[];
  templates: GarmentTemplate[];
  settings: ShopSettings;
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/** Returns a list of problems with a shop setup; empty means valid. */
export function validateShopConfig(config: ShopConfig): string[] {
  const errors: string[] = [];
  const branchIds = config.branches.map((b) => b.id);
  const roleIds = config.roles.map((r) => r.id);

  if (!config.profile.name.bn.trim() && !config.profile.name.en.trim()) errors.push('no-shop-name');
  if (config.branches.length === 0) errors.push('no-branches');
  for (const id of duplicates(branchIds)) errors.push(`duplicate-branch:${id}`);

  if (config.devices.length === 0) errors.push('no-devices');
  for (const device of config.devices) {
    if (!isValidSeries(device.series)) errors.push(`invalid-series:${device.id}`);
    if (!branchIds.includes(device.branchId)) errors.push(`device-branch:${device.id}`);
  }
  for (const series of duplicates(config.devices.map((d) => d.series))) errors.push(`duplicate-series:${series}`);

  for (const id of duplicates(roleIds)) errors.push(`duplicate-role:${id}`);
  for (const id of duplicates(config.staff.map((s) => s.id))) errors.push(`duplicate-staff:${id}`);
  for (const staff of config.staff) {
    if (!roleIds.includes(staff.roleId)) errors.push(`unknown-role:${staff.id}`);
    if (staff.branchIds !== 'all' && staff.branchIds.some((b) => !branchIds.includes(b))) {
      errors.push(`unknown-branch:${staff.id}`);
    }
    if (!isValidPin(staff.pin)) errors.push(`invalid-pin:${staff.id}`);
  }
  const hasManager = config.staff.some((s) => {
    const role = roleOf(config, s.id);
    return s.active && role !== null && can(role, 'staff.manage');
  });
  if (!hasManager) errors.push('no-owner');

  for (const id of duplicates(config.templates.map((t) => t.id))) errors.push(`duplicate-template:${id}`);
  for (const template of config.templates) {
    for (const problem of validateTemplate(template)) errors.push(`template:${template.id}:${problem}`);
  }

  const { linkExpiryDays } = config.settings;
  if (!Number.isInteger(linkExpiryDays) || linkExpiryDays < 1) errors.push('invalid-link-expiry');
  return errors;
}

export function staffById(config: ShopConfig, staffId: string): Staff | null {
  return config.staff.find((s) => s.id === staffId) ?? null;
}

export function roleOf(config: ShopConfig, staffId: string): Role | null {
  const staff = staffById(config, staffId);
  return staff ? (config.roles.find((r) => r.id === staff.roleId) ?? null) : null;
}

export function templateById(config: ShopConfig, templateId: string): GarmentTemplate | null {
  return config.templates.find((t) => t.id === templateId) ?? null;
}

/** The shop details shown on receipts and public status pages, in one language. */
export function shopContact(config: ShopConfig, language: Language): ShopContact {
  const { name, phone, address } = config.profile;
  return { name: name[language] || name.bn || name.en, phone, address };
}
