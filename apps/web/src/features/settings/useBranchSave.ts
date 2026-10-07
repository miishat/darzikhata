import type { Branch } from '@darzikhata/domain';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { configProblemText } from './configProblems';
import { slugKey } from './keys';

export interface BranchFormValues {
  nameBn: string;
  nameEn: string;
  kind: Branch['kind'];
  address: string;
}

export interface BranchSaveResult {
  ok: boolean;
  /** For the name field. */
  error?: string;
  /** For the whole form. */
  problem?: string;
  /** The saved branch's id. */
  id?: string;
}

/** Checks and saves one branch, new (null) or existing. A missing name in one language is filled from the other. */
export function useBranchSave() {
  const { t, language } = useI18n();
  const store = useStore();
  return async (branch: Branch | null, values: BranchFormValues): Promise<BranchSaveResult> => {
    const bn = values.nameBn.trim();
    const en = values.nameEn.trim();
    if (!bn && !en) return { ok: false, error: t('settings.branch.error.name') };
    const name = { bn: bn || en, en: en || bn };
    let id = branch?.id ?? '';
    const outcome = await store.updateConfig((current) => {
      id = branch?.id ?? slugKey(name.en, current.branches.map((b) => b.id), `branch-${current.branches.length + 1}`);
      const next: Branch = { id, name, kind: values.kind, address: values.address.trim() };
      return {
        ...current,
        branches: current.branches.some((b) => b.id === id) ? current.branches.map((b) => (b.id === id ? next : b)) : [...current.branches, next],
      };
    });
    if (!outcome.ok) return { ok: false, problem: configProblemText(outcome.problems, language) };
    return { ok: true, id };
  };
}

/** Moves a device to another branch at once. Returns a problem message, or null when saved. */
export function useMoveDevice() {
  const { language } = useI18n();
  const store = useStore();
  return async (deviceId: string, branchId: string): Promise<string | null> => {
    const outcome = await store.updateConfig((current) => ({
      ...current,
      devices: current.devices.map((d) => (d.id === deviceId ? { ...d, branchId } : d)),
    }));
    return outcome.ok ? null : configProblemText(outcome.problems, language);
  };
}
