import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { configProblemText } from './configProblems';
import { readStaff, type StaffForm } from './staffInput';

export interface StaffSaveResult {
  ok: boolean;
  /** Field messages keyed by field: name, pin, branches. */
  errors: Record<string, string>;
  /** A message for the whole form, such as trying to change your own role. */
  problem: string | null;
  /** The saved person's id. */
  id?: string;
}

/** Checks and saves one person, new (staffId null) or existing. */
export function useStaffSave() {
  const { t, language } = useI18n();
  const store = useStore();
  const { session } = useSnapshot();
  return async (form: StaffForm, staffId: string | null): Promise<StaffSaveResult> => {
    const config = store.getSnapshot().config;
    if (!config) return { ok: false, errors: {}, problem: null };
    const result = readStaff(form, { config, staffId, selfId: session?.staffId ?? '', newId: () => store.createId() });
    if (!result.ok) {
      const { self, ...fields } = result.errors;
      return { ok: false, errors: Object.fromEntries(Object.entries(fields).map(([k, key]) => [k, t(key)])), problem: self ? t(self) : null };
    }
    const next = result.staff;
    const outcome = await store.updateConfig((current) => ({
      ...current,
      staff: current.staff.some((s) => s.id === next.id) ? current.staff.map((s) => (s.id === next.id ? next : s)) : [...current.staff, next],
    }));
    if (!outcome.ok) return { ok: false, errors: {}, problem: configProblemText(outcome.problems, language) };
    return { ok: true, errors: {}, problem: null, id: next.id };
  };
}
