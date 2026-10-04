import { isValidPin, toEnglishDigits, type ShopConfig, type Staff } from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';

export interface StaffForm {
  name: string;
  roleId: string;
  pin: string;
  allBranches: boolean;
  branchIds: string[];
  active: boolean;
}

export interface StaffContext {
  config: ShopConfig;
  /** Null for a new person. */
  staffId: string | null;
  /** The signed-in person. */
  selfId: string;
  newId(): string;
}

export type StaffResult = { ok: true; staff: Staff } | { ok: false; errors: Record<string, MessageKey> };

/** The form for one person, or for a new one: an active tailor in all branches with no PIN yet. */
export function staffForm(staff: Staff | null, config: ShopConfig): StaffForm {
  if (!staff) {
    const role = config.roles.find((r) => r.id === 'tailor') ?? config.roles[config.roles.length - 1];
    return { name: '', roleId: role?.id ?? '', pin: '', allBranches: true, branchIds: [], active: true };
  }
  return {
    name: staff.name,
    roleId: staff.roleId,
    pin: staff.pin,
    allBranches: staff.branchIds === 'all',
    branchIds: staff.branchIds === 'all' ? [] : [...staff.branchIds],
    active: staff.active,
  };
}

export function readStaff(form: StaffForm, ctx: StaffContext): StaffResult {
  const errors: Record<string, MessageKey> = {};
  const name = form.name.trim();
  if (!name) errors.name = 'settings.staff.error.name';
  if (!isValidPin(form.pin)) errors.pin = 'settings.staff.error.pin';
  const chosen = ctx.config.branches.map((b) => b.id).filter((id) => form.branchIds.includes(id));
  if (!form.allBranches && chosen.length === 0) errors.branches = 'settings.staff.error.branches';
  if (ctx.staffId !== null && ctx.staffId === ctx.selfId) {
    const before = ctx.config.staff.find((s) => s.id === ctx.staffId);
    if (before && (form.roleId !== before.roleId || !form.active)) errors.self = 'settings.staff.error.self';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    staff: {
      id: ctx.staffId ?? ctx.newId(),
      name,
      roleId: form.roleId,
      branchIds: form.allBranches ? 'all' : chosen,
      pin: toEnglishDigits(form.pin),
      active: form.active,
    },
  };
}
