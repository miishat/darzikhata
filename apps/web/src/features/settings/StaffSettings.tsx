import type { Staff } from '@darzikhata/domain';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { Shell } from '../orders/itemDialogs';
import { configProblemText } from './configProblems';
import { SECTION_BODY, SectionHeader, StatusPill } from './SettingsCards';
import { readStaff, staffForm, type StaffForm } from './staffInput';

/** People who work in the shop: add, edit, and deactivate (never delete, their names are on past work). */
export function StaffSettings() {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  const [editing, setEditing] = useState<{ staff: Staff | null } | null>(null);
  const [saved, setSaved] = useState(false);
  if (!config) return null;
  const roleName = (id: string) => config.roles.find((r) => r.id === id)?.name[language] ?? id;
  const branchText = (staff: Staff) =>
    staff.branchIds === 'all'
      ? t('branch.all')
      : staff.branchIds.map((id) => config.branches.find((b) => b.id === id)?.name[language] ?? id).join(', ');
  const edit = (staff: Staff | null) => {
    setSaved(false);
    setEditing({ staff });
  };

  return (
    <>
      <SectionHeader
        path="staff"
        action={
          <Button onClick={() => edit(null)}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.staff.new')}
          </Button>
        }
      />
      <div className={`${SECTION_BODY} flex flex-col gap-3 p-4 sm:p-5`}>
        {saved && (
          <p role="status" className="text-brand-strong">
            {t('settings.saved')}
          </p>
        )}
        <ul aria-label={t('settings.staff')} className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {config.staff.map((staff) => (
            <li key={staff.id} className={`flex items-center gap-3 rounded-xl border border-line p-4 ${staff.active ? 'bg-panel' : 'bg-surface/60'}`}>
              <Avatar id={staff.id} name={staff.name} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{staff.name}</h3>
                <p className="truncate text-sm text-muted">
                  {roleName(staff.roleId)} · {branchText(staff)}
                </p>
                <div className="mt-1">
                  <StatusPill on={staff.active} label={staff.active ? t('settings.staff.active') : t('settings.staff.inactive')} />
                </div>
              </div>
              <Button variant="secondary" aria-label={t('settings.editItem', { name: staff.name })} onClick={() => edit(staff)}>
                <Pencil aria-hidden="true" size={16} />
              </Button>
            </li>
          ))}
        </ul>
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
    </>
  );
}

function StaffDialog({ staff, onClose, onSaved }: { staff: Staff | null; onClose(): void; onSaved(): void }) {
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
