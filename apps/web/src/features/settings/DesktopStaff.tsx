import type { Capability, Staff } from '@darzikhata/domain';
import { Pencil, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import type { MessageKey } from '../../i18n/bn';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Drawer, type DrawerHandle } from '../../ui/Drawer';
import { Switch } from '../../ui/Switch';
import { TextField } from '../../ui/TextField';
import { SECTION_BODY, SectionHeader } from './SettingsCards';
import { staffForm, type StaffForm } from './staffInput';
import { useStaffSave } from './useStaffSave';
import { Select } from '../../ui/Select';

/** The parts of the app a role reaches, named from the start of its capabilities. */
const AREAS: Array<{ prefix: string; label: MessageKey }> = [
  { prefix: 'orders.', label: 'settings.area.orders' },
  { prefix: 'customers.', label: 'settings.area.customers' },
  { prefix: 'measurements.', label: 'settings.area.measurements' },
  { prefix: 'money.', label: 'settings.area.money' },
  { prefix: 'payments.', label: 'settings.area.payments' },
  { prefix: 'work.', label: 'settings.area.work' },
  { prefix: 'settings.', label: 'settings.area.settings' },
  { prefix: 'staff.', label: 'settings.area.staff' },
];

export const roleAreas = (capabilities: Capability[]): MessageKey[] =>
  AREAS.filter((a) => capabilities.some((c) => c.startsWith(a.prefix))).map((a) => a.label);

type Note = { saved: boolean; problem: string | null };

/**
 * The desktop staff table. Role and active change in place and save at once; the pencil opens the rest
 * (name, PIN, branches) in a side panel. PINs never show here.
 */
export function DesktopStaff() {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  const saveStaff = useStaffSave();
  const [editing, setEditing] = useState<{ staff: Staff | null } | null>(null);
  const [note, setNote] = useState<Note>({ saved: false, problem: null });
  if (!config) return null;
  const branchText = (staff: Staff) =>
    staff.branchIds === 'all'
      ? t('branch.all')
      : staff.branchIds.map((id) => config.branches.find((b) => b.id === id)?.name[language] ?? id).join(', ');

  async function quick(staff: Staff, change: Partial<StaffForm>) {
    setNote({ saved: false, problem: null });
    const result = await saveStaff({ ...staffForm(staff, config!), ...change }, staff.id);
    setNote(result.ok ? { saved: true, problem: null } : { saved: false, problem: result.problem ?? Object.values(result.errors)[0] ?? null });
  }
  const edit = (staff: Staff | null) => {
    setNote({ saved: false, problem: null });
    setEditing({ staff });
  };

  return (
    <>
      <SectionHeader path="staff" />
      <div className={`${SECTION_BODY} flex flex-col gap-3 p-5`}>
        {note.saved && (
          <p role="status" className="text-brand-strong">
            {t('settings.saved')}
          </p>
        )}
        {note.problem && (
          <p role="alert" className="text-danger">
            {note.problem}
          </p>
        )}
        <table aria-label={t('settings.staff')} className="w-full border-collapse text-left">
          <thead className="text-sm text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">{t('settings.col.name')}</th>
              <th className="px-3 py-2 font-medium">{t('settings.staff.role')}</th>
              <th className="px-3 py-2 font-medium">{t('settings.col.branches')}</th>
              <th className="px-3 py-2 font-medium">{t('settings.col.status')}</th>
              <th className="px-3 py-2">
                <span className="sr-only">{t('settings.col.edit')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {config.staff.map((staff) => (
              <tr key={staff.id} className={`border-b border-line ${staff.active ? '' : 'text-muted'}`}>
                <th scope="row" className="px-3 py-2 text-left font-semibold">
                  <span className="flex items-center gap-3">
                    <Avatar id={staff.id} name={staff.name} size="sm" />
                    {staff.name}
                  </span>
                </th>
                <td className="px-3 py-2">
                  <Select
                    label={t('settings.staff.roleOf', { name: staff.name })}
                    value={staff.roleId}
                    options={config.roles.map((r) => ({ value: r.id, label: r.name[language] }))}
                    onChange={(roleId) => void quick(staff, { roleId })}
                    className="w-48"
                  />
                </td>
                <td className="px-3 py-2 text-sm">{branchText(staff)}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2 text-sm">
                    <Switch label={t('settings.staff.activeOf', { name: staff.name })} on={staff.active} onChange={(active) => void quick(staff, { active })} />
                    <span aria-hidden="true">{staff.active ? t('settings.staff.active') : t('settings.staff.inactive')}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="secondary" aria-label={t('settings.editItem', { name: staff.name })} onClick={() => edit(staff)}>
                    <Pencil aria-hidden="true" size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface/60 px-4 py-3 sm:px-5">
        <Button onClick={() => edit(null)} className="ms-auto">
          <Plus aria-hidden="true" size={18} />
          {t('settings.staff.new')}
        </Button>
      </div>
      {editing && (
        <StaffDrawer
          staff={editing.staff}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNote({ saved: true, problem: null });
          }}
        />
      )}
    </>
  );
}

/** One person in full: name, PIN, role (as cards that say what each role reaches), branches and on/off. */
function StaffDrawer({ staff, onClose, onSaved }: { staff: Staff | null; onClose(): void; onSaved(): void }) {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  const saveStaff = useStaffSave();
  const [form, setForm] = useState<StaffForm>(() => staffForm(staff, config!));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const drawer = useRef<DrawerHandle>(null);
  if (!config) return null;
  const patch = (change: Partial<StaffForm>) => setForm((f) => ({ ...f, ...change }));
  const slideOut = (then: () => void) => (drawer.current ? drawer.current.close(then) : then());
  const close = () => slideOut(onClose);

  async function save() {
    if (working) return;
    setWorking(true);
    const result = await saveStaff(form, staff?.id ?? null);
    setWorking(false);
    setErrors(result.errors);
    setProblem(result.problem);
    if (result.ok) slideOut(onSaved);
  }

  const choices = [{ id: 'all', name: t('branch.all') }, ...config.branches.map((b) => ({ id: b.id, name: b.name[language] }))];

  return (
    <Drawer
      ref={drawer}
      title={staff ? staff.name : t('settings.staff.new')}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button size="lg" className="flex-[2]" onClick={() => void save()} disabled={working}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {problem && (
          <p role="alert" className="text-danger">
            {problem}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <TextField label={t('settings.col.name')} value={form.name} onChange={(e) => patch({ name: e.target.value })} error={errors.name} autoComplete="off" />
          <TextField
            label={t('pin.label')}
            value={form.pin}
            onChange={(e) => patch({ pin: e.target.value })}
            error={errors.pin}
            type="password"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <fieldset>
          <legend className="mb-2 font-medium">{t('settings.staff.role')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {config.roles.map((r) => {
              const on = form.roleId === r.id;
              return (
                <label
                  key={r.id}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                    on ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line hover:bg-surface'
                  }`}
                >
                  <input type="radio" name="staff-role" className="sr-only" checked={on} onChange={() => patch({ roleId: r.id })} />
                  <span className="font-semibold">{r.name[language]}</span>
                  <span className="text-xs text-muted">{roleAreas(r.capabilities).map((key) => t(key)).join(' · ')}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {config.branches.length > 1 && (
          <fieldset>
            <legend className="mb-2 font-medium">{t('settings.staff.worksIn')}</legend>
            <div className="flex flex-wrap gap-2">
              {choices.map((b) => {
                const on = b.id === 'all' ? form.allBranches : !form.allBranches && form.branchIds.includes(b.id);
                const toggle = () =>
                  b.id === 'all'
                    ? patch({ allBranches: !form.allBranches })
                    : patch({ allBranches: false, branchIds: on ? form.branchIds.filter((x) => x !== b.id) : [...form.branchIds, b.id] });
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={on}
                    onClick={toggle}
                    className={`min-h-10 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                      on ? 'border-brand bg-brand text-on-brand' : 'border-line hover:bg-surface'
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
            {errors.branches && <p className="mt-1 text-sm text-danger">{errors.branches}</p>}
          </fieldset>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Switch label={t('settings.staff.active')} on={form.active} onChange={(active) => patch({ active })} />
          <span aria-hidden="true">{form.active ? t('settings.staff.active') : t('settings.staff.inactive')}</span>
          <span className="text-sm text-muted">{t('settings.staff.activeHint')}</span>
        </div>
      </div>
    </Drawer>
  );
}
