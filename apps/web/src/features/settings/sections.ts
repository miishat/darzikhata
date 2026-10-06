import type { Capability } from '@darzikhata/domain';
import { Building2, Shirt, Store, Users, type LucideIcon } from 'lucide-react';
import type { MessageKey } from '../../i18n/bn';

export interface SettingsSection {
  path: 'shop' | 'templates' | 'staff' | 'branches';
  label: MessageKey;
  icon: LucideIcon;
  requires: Capability[];
}

/** The settings menu, in order. Each section is closed to roles without its own capability. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { path: 'shop', label: 'settings.shop', icon: Store, requires: ['settings.edit'] },
  { path: 'templates', label: 'settings.templates', icon: Shirt, requires: ['settings.edit'] },
  { path: 'staff', label: 'settings.staff', icon: Users, requires: ['staff.manage'] },
  { path: 'branches', label: 'settings.branches', icon: Building2, requires: ['settings.edit'] },
];
