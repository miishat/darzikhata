import { describe, expect, it } from 'vitest';
import { roleOf, shopContact, staffById, templateById, validateShopConfig, type ShopConfig } from './config';
import { DEFAULT_ROLES } from './permissions';
import { STARTER_TEMPLATES } from './templates';

function config(overrides: Partial<ShopConfig> = {}): ShopConfig {
  return {
    id: 'rahman',
    profile: { name: { bn: 'রহমান টেইলার্স', en: 'Rahman Tailors' }, phone: '01755123456', address: 'মিরপুর ১০' },
    branches: [{ id: 'main', name: { bn: 'প্রধান দোকান', en: 'Main shop' }, kind: 'shop', address: '' }],
    devices: [{ id: 'device-a', name: 'Counter phone', series: 'A', branchId: 'main' }],
    roles: DEFAULT_ROLES,
    staff: [{ id: 'owner', name: 'Abdur Rahman', roleId: 'owner', branchIds: 'all', pin: '1111', active: true }],
    templates: STARTER_TEMPLATES,
    settings: { restrictFemaleMeasurements: false, linkExpiryDays: 30, defaultLanguage: 'bn' },
    ...overrides,
  };
}

describe('validateShopConfig', () => {
  it('accepts a minimal single-shop setup', () => {
    expect(validateShopConfig(config())).toEqual([]);
  });

  it('reports structural problems', () => {
    const broken = config({
      profile: { name: { bn: '', en: '' }, phone: '', address: '' },
      branches: [],
      devices: [
        { id: 'd1', name: 'x', series: 'a', branchId: 'nowhere' },
        { id: 'd2', name: 'y', series: 'a', branchId: 'nowhere' },
      ],
      staff: [
        { id: 's1', name: 'x', roleId: 'ghost', branchIds: ['nowhere'], pin: '12', active: true },
        { id: 's1', name: 'y', roleId: 'tailor', branchIds: 'all', pin: '1234', active: true },
      ],
      templates: [STARTER_TEMPLATES[0]!, STARTER_TEMPLATES[0]!],
      settings: { restrictFemaleMeasurements: false, linkExpiryDays: 0, defaultLanguage: 'bn' },
    });
    expect(validateShopConfig(broken)).toEqual([
      'no-shop-name',
      'no-branches',
      'invalid-series:d1',
      'device-branch:d1',
      'invalid-series:d2',
      'device-branch:d2',
      'duplicate-series:a',
      'duplicate-staff:s1',
      'unknown-role:s1',
      'unknown-branch:s1',
      'invalid-pin:s1',
      'no-owner',
      'duplicate-template:shirt',
      'invalid-link-expiry',
    ]);
  });

  it('prefixes template problems with the template id', () => {
    const bad = { ...STARTER_TEMPLATES[0]!, stages: [] };
    expect(validateShopConfig(config({ templates: [bad] }))).toEqual(['template:shirt:no-stages']);
  });

  it('requires an active person who can manage staff', () => {
    const inactiveOwner = config({
      staff: [{ id: 'owner', name: 'x', roleId: 'owner', branchIds: 'all', pin: '1111', active: false }],
    });
    expect(validateShopConfig(inactiveOwner)).toEqual(['no-owner']);
  });
});

describe('lookups', () => {
  it('finds staff, their role and templates', () => {
    const c = config();
    expect(staffById(c, 'owner')?.name).toBe('Abdur Rahman');
    expect(staffById(c, 'nobody')).toBeNull();
    expect(roleOf(c, 'owner')?.id).toBe('owner');
    expect(roleOf(c, 'nobody')).toBeNull();
    expect(templateById(c, 'panjabi')?.name.en).toBe('Panjabi');
    expect(templateById(c, 'nope')).toBeNull();
  });

  it('gives shop contact details in the chosen language', () => {
    expect(shopContact(config(), 'en')).toEqual({ name: 'Rahman Tailors', phone: '01755123456', address: 'মিরপুর ১০' });
    expect(shopContact(config(), 'bn').name).toBe('রহমান টেইলার্স');
  });
});
