import type { Branch, ShopState } from '@darzikhata/domain';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useCurrentStaff, useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { readSetting, writeSetting } from '../../lib/safeStorage';
import { SelectField } from '../../ui/SelectField';
import { allowedBranches, branchIdsFor, resolveChoice, scopeState, type BranchChoice } from './branchScope';

const SETTING = 'dk.branch';

interface BranchScopeValue {
  allowed: Branch[];
  choice: BranchChoice;
  setChoice(choice: BranchChoice): void;
  branchIds: string[];
}

const BranchScopeContext = createContext<BranchScopeValue | null>(null);

const NO_BRANCHES: Branch[] = [];

/** Which branches this device is looking at. Remembered per device. */
export function BranchScopeProvider({ children }: { children: ReactNode }) {
  const { config } = useSnapshot();
  const current = useCurrentStaff();
  const [saved, setSaved] = useState(() => readSetting(SETTING));

  const staff = current?.staff;
  const role = current?.role;
  const allowed = useMemo(
    () => (config && staff && role ? allowedBranches(config, staff, role) : (config?.branches ?? NO_BRANCHES)),
    [config, staff, role],
  );
  const choice = staff ? resolveChoice(saved, allowed) : 'all';
  const setChoice = useCallback((next: BranchChoice) => {
    writeSetting(SETTING, next);
    setSaved(next);
  }, []);
  const branchIds = useMemo(() => branchIdsFor(choice, allowed), [choice, allowed]);
  const value = useMemo(() => ({ allowed, choice, setChoice, branchIds }), [allowed, choice, setChoice, branchIds]);

  return <BranchScopeContext.Provider value={value}>{children}</BranchScopeContext.Provider>;
}

export function useBranchScope(): BranchScopeValue {
  const value = useContext(BranchScopeContext);
  if (!value) throw new Error('useBranchScope must be used inside BranchScopeProvider');
  return value;
}

/** The shop's state with only the chosen branches' orders. */
export function useScopedState(): ShopState {
  const { state } = useSnapshot();
  const { branchIds } = useBranchScope();
  return useMemo(() => scopeState(state, branchIds), [state, branchIds]);
}

/** Pick the branch to look at; plain text when only one branch is allowed. */
export function BranchSwitcher() {
  const { t, label } = useI18n();
  const current = useCurrentStaff();
  const { allowed, choice, setChoice } = useBranchScope();
  if (!current) return null;
  if (allowed.length === 1) return <p className="truncate font-semibold">{label(allowed[0]!.name)}</p>;
  return (
    <SelectField
      label={t('branch.label')}
      value={choice}
      onChange={setChoice}
      options={[{ value: 'all', label: t('branch.all') }, ...allowed.map((b) => ({ value: b.id, label: label(b.name) }))]}
    />
  );
}
