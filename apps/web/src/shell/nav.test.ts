import { DEFAULT_ROLES, type Capability } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { homePath, visibleNav } from './nav';

const role = (id: string) => DEFAULT_ROLES.find((r) => r.id === id)!;
const keys = (id: string) => visibleNav(role(id)).map((i) => i.key);

describe('navigation by role', () => {
  it('shows the owner everything', () => {
    expect(keys('owner')).toEqual(['dashboard', 'orders', 'customers', 'work', 'payments', 'settings']);
  });

  it('shows a tailor only their work', () => {
    expect(keys('tailor')).toEqual(['work']);
    expect(homePath(role('tailor'))).toBe('/app/work');
  });

  it('shows counter staff payments but not settings', () => {
    expect(keys('counter')).toEqual(['dashboard', 'orders', 'customers', 'work', 'payments']);
  });

  it('lands accounts staff on the dashboard', () => {
    expect(keys('accounts')).toEqual(['dashboard', 'orders', 'customers', 'payments']);
    expect(homePath(role('accounts'))).toBe('/app/dashboard');
  });

  it('shows Settings to anyone who can manage staff or edit settings', () => {
    const only = (capability: Capability) => ({ id: 'x', name: { bn: '', en: '' }, capabilities: [capability] });
    expect(visibleNav(only('staff.manage')).map((i) => i.key)).toEqual(['settings']);
    expect(visibleNav(only('settings.edit')).map((i) => i.key)).toEqual(['settings']);
  });

  it('falls back to More when nothing is visible', () => {
    expect(homePath({ id: 'none', name: { bn: '', en: '' }, capabilities: [] })).toBe('/app/more');
  });
});
