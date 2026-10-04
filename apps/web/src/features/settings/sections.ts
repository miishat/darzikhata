import type { Capability } from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';

export interface SettingsSection {
  path: string;
  label: MessageKey;
  requires: Capability[];
}

/** The settings menu, in order. Each section is closed to roles without its own capability. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { path: 'shop', label: 'settings.shop', requires: ['settings.edit'] },
  { path: 'templates', label: 'settings.templates', requires: ['settings.edit'] },
  { path: 'staff', label: 'settings.staff', requires: ['staff.manage'] },
  { path: 'branches', label: 'settings.branches', requires: ['settings.edit'] },
];
