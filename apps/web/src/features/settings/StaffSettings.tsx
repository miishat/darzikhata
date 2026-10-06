import type { Staff } from '@darzikhata/domain';
import { useState } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { Shell } from '../orders/itemDialogs';
import { configProblemText } from './configProblems';
import { readStaff, staffForm, type StaffForm } from './staffInput';

/** People who work in the shop: add, edit, and deactivate (never delete, their names are on past work). */
export function StaffSettings() {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  const [editing, setEditing] = useState<{ staff: Staff | null } | null>(null);
  const [saved, setSaved] = useState(false);
  if (!config) return null;
  const head = 'whitespace-nowrap px-3 py-2 text-start text-sm font-semibold text-muted';
  const roleName = (id: string) => config.roles.find((r) => r.id === id)?.name[language] ?? id;
  const branchText = (staff: Staff) =>
    staff.branchIds === 'all'
      ? t('branch.all')
      : staff.branchIds.map((id) => config.branches.find((b) => b.id === id)?.name[language] ?? id).join(', ');

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('settings.staff')}</h2>
        <Button
          onClick={() => {
            setSaved(false);
            setEditing({ staff: null });
          }}
        >
          {t('settings.staff.new')}
        </Button>
      </div>
      {saved && (
        <p role="status" className="text-brand-strong">
          {t('settings.saved')}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-line bg-panel">
        <table aria-label={t('settings.staff')} className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={head}>{t('settings.col.name')}</th>
              <th scope="col" className={head}>{t('settings.staff.role')}</th>
              <th scope="col" className={head}>{t('branch.label')}</th>
              <th scope="col" className={head}>{t('settings.col.status')}</th>
              <td className={head} />
            </tr>
          </thead>
          <tbody>
            {config.staff.map((staff) => (
              <tr key={staff.id} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 font-semibold">{staff.name}</td>
                <td className="px-3 py-2">{roleName(staff.roleId)}</td>
                <td className="px-3 py-2">{branchText(staff)}</td>
                <td className="px-3 py-2">{staff.active ? t('settings.staff.active') : t('settings.staff.inactive')}</td>
                <td className="px-3 py-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSaved(false);
                      setEditing({ staff });
                    }}
                  >
                    {t('settings.editItem', { name: staff.name })}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <StaffDialog
          staff={editing.staff}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setSaved(true);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

export function StaffDialog({ staff, onClose, onSaved }: { staff: Staff | null; onClose(): void; onSaved(): void }) {
  const { t, language } = useI18n();
  const store = useStore();
  const { config, session } = useSnapshot();
  const [form, setForm] = useState<StaffForm>(() => staffForm(staff, config!));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  if (!config) return null;
  const patch = (change: Partial<StaffForm>) => setForm((f) => ({ ...f, ...change }));

  async function save() {
    if (working) return;
    setProblem(null);
    const result = readStaff(form, {
      config: store.getSnapshot().config ?? config!,
      staffId: staff?.id ?? null,
      selfId: session?.staffId ?? '',
      newId: () => store.createId(),
    });
    if (!result.ok) {
      const { self, ...fields } = result.errors;
      setErrors(Object.fromEntries(Object.entries(fields).map(([k, key]) => [k, t(key)])));
      if (self) setProblem(t(self));
      return;
    }
    setErrors({});
    setWorking(true);
    const next = result.staff;
    const outcome = await store.updateConfig((current) => ({
      ...current,
      staff: current.staff.some((s) => s.id === next.id)
        ? current.staff.map((s) => (s.id === next.id ? next : s))
        : [...current.staff, next],
    }));
    setWorking(false);
    if (!outcome.ok) {
      setProblem(configProblemText(outcome.problems, language));
      return;
    }
    onSaved();
  }

  return (
    <Shell
      title={staff ? staff.name : t('settings.staff.new')}
      onClose={onClose}
      onSave={() => void save()}
      working={working}
      problem={problem}
    >
      <TextField
        label={t('settings.col.name')}
        value={form.name}
        onChange={(e) => patch({ name: e.target.value })}
        error={errors.name}
        autoComplete="off"
      />
      <SelectField
        label={t('settings.staff.role')}
        value={form.roleId}
        options={config.roles.map((r) => ({ value: r.id, label: r.name[language] }))}
        onChange={(roleId) => patch({ roleId })}
      />
      <TextField
        label={t('pin.label')}
        value={form.pin}
        onChange={(e) => patch({ pin: e.target.value })}
        error={errors.pin}
        type="password"
        inputMode="numeric"
        autoComplete="off"
      />
      <Checkbox
        label={t('branch.all')}
        checked={form.allBranches}
        onChange={(allBranches) => patch({ allBranches })}
        error={form.allBranches ? undefined : errors.branches}
      />
      {!form.allBranches &&
        config.branches.length > 1 &&
        config.branches.map((b) => (
          <Checkbox
            key={b.id}
            label={b.name[language]}
            checked={form.branchIds.includes(b.id)}
            onChange={(on) =>
              patch({ branchIds: on ? [...form.branchIds, b.id] : form.branchIds.filter((id) => id !== b.id) })
            }
          />
        ))}
      <Checkbox label={t('settings.staff.active')} checked={form.active} onChange={(active) => patch({ active })} />
    </Shell>
  );
}
