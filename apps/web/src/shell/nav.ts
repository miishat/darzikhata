import { can, type Capability, type Role } from '@darzikhata/domain';
import { ClipboardList, Home, Scissors, Settings, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { MessageKey } from '../i18n/bn';

export type NavKey = 'dashboard' | 'orders' | 'customers' | 'work' | 'payments' | 'settings';

export interface NavItem {
  key: NavKey;
  path: string;
  label: MessageKey;
  shortLabel: MessageKey;
  icon: LucideIcon;
  /** The item shows when the role has any one of these. */
  requires: Capability[];
  /** Whether it gets a tab on mobile; the rest live under More. */
  mobileTab: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/app/dashboard', label: 'nav.dashboard', shortLabel: 'nav.dashboard', icon: Home, requires: ['orders.view'], mobileTab: true },
  { key: 'orders', path: '/app/orders', label: 'nav.orders', shortLabel: 'nav.orders', icon: ClipboardList, requires: ['orders.view'], mobileTab: true },
  { key: 'customers', path: '/app/customers', label: 'nav.customers', shortLabel: 'nav.customersShort', icon: Users, requires: ['customers.view'], mobileTab: true },
  { key: 'work', path: '/app/work', label: 'nav.work', shortLabel: 'nav.workShort', icon: Scissors, requires: ['work.view.all', 'work.view.assigned'], mobileTab: true },
  { key: 'payments', path: '/app/payments', label: 'nav.payments', shortLabel: 'nav.payments', icon: Wallet, requires: ['money.view'], mobileTab: false },
  { key: 'settings', path: '/app/settings', label: 'nav.settings', shortLabel: 'nav.settings', icon: Settings, requires: ['settings.edit', 'staff.manage'], mobileTab: false },
];

export function canUse(role: Role, requires: Capability[]): boolean {
  return requires.some((capability) => can(role, capability));
}

export function visibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canUse(role, item.requires));
}

/** Where a person lands after signing in: their first visible section, or More if none. */
export function homePath(role: Role): string {
  return visibleNav(role)[0]?.path ?? '/app/more';
}

export function navItem(key: NavKey): NavItem {
  return NAV_ITEMS.find((item) => item.key === key)!;
}
