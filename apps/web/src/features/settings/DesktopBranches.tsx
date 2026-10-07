import type { Branch } from '@darzikhata/domain';
import { Building2, MonitorSmartphone, Plus, Store } from 'lucide-react';
import { useState } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { useBranchSave, useMoveDevice } from './useBranchSave';
import { Select } from '../../ui/Select';

type Note = { saved: boolean; problem: string | null };

const kindIcon = (kind: Branch['kind']) => (kind === 'shop' ? Store : Building2);

/**
 * The desktop branch screen: every branch in a list on the left; the chosen one's details, its devices
 * and the people who work there on the right. New Branch opens an empty form in the same place.
 */
export function DesktopBranches() {
  const { t, language, number } = useI18n();
  const { config } = useSnapshot();
  const move = useMoveDevice();
  const [selected, setSelected] = useState<string | null>(() => config?.branches[0]?.id ?? null);
  const [note, setNote] = useState<Note>({ saved: false, problem: null });
  if (!config) return null;
  const branch = config.branches.find((b) => b.id === selected) ?? null;
  const devices = branch ? config.devices.filter((d) => d.branchId === branch.id) : [];
  const people = branch ? config.staff.filter((s) => s.active && (s.branchIds === 'all' || s.branchIds.includes(branch.id))) : [];
  const choose = (id: string | null) => {
    setNote({ saved: false, problem: null });
    setSelected(id);
  };

  async function moveDevice(deviceId: string, branchId: string) {
    setNote({ saved: false, problem: null });
    const problem = await move(deviceId, branchId);
    setNote({ saved: !problem, problem });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <div className="border-b border-line p-3">
          <Button variant={branch ? 'secondary' : 'primary'} className="w-full" onClick={() => choose(null)}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.branches.new')}
          </Button>
        </div>
        <ul aria-label={t('settings.branches.list')} className="relative min-h-0 flex-1 overflow-auto p-2">
          {config.branches.map((b) => {
            const Icon = kindIcon(b.kind);
            const on = b.id === branch?.id;
            const count = config.devices.filter((d) => d.branchId === b.id).length;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  aria-current={on ? 'true' : undefined}
                  onClick={() => choose(b.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-focus ${
                    on ? 'bg-brand-soft ring-1 ring-brand' : 'hover:bg-surface'
                  }`}
                >
                  <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-lg ${on ? 'bg-brand text-on-brand' : 'bg-surface text-muted'}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{b.name[language]}</span>
                    <span className="block truncate text-xs text-muted">
                      {t(`branchKind.${b.kind}`)} · {t('settings.device.count', { n: number(count) })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="relative min-h-0 overflow-auto p-5">
        <div className="flex max-w-3xl flex-col gap-6">
          <h2 className="font-display text-xl font-bold">{branch ? branch.name[language] : t('settings.branches.new')}</h2>
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
          <BranchForm
            key={branch?.id ?? 'new'}
            branch={branch}
            onSaved={(id) => {
              setSelected(id);
              setNote({ saved: true, problem: null });
            }}
          />
          {branch && (
            <>
              <section aria-labelledby="branch-devices" className="flex flex-col gap-2">
                <h3 id="branch-devices" className="font-display text-lg font-bold">
                  {t('settings.devices.list')}
                </h3>
                {devices.length === 0 && <p className="text-sm text-muted">{t('settings.devices.none')}</p>}
                <ul className="flex flex-col gap-2">
                  {devices.map((device) => (
                    <li key={device.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                      <MonitorSmartphone aria-hidden="true" size={18} className="text-muted" />
                      <span className="min-w-0 flex-1 font-semibold">{device.name}</span>
                      <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs">
                        {t('settings.device.series')} {device.series}
                      </span>
                      <Select
                        label={t('settings.device.branch', { name: device.name })}
                        value={device.branchId}
                        options={config.branches.map((b) => ({ value: b.id, label: b.name[language] }))}
                        onChange={(branchId) => void moveDevice(device.id, branchId)}
                      />
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted">{t('settings.devices.note')}</p>
              </section>
              <section aria-labelledby="branch-people" className="flex flex-col gap-2">
                <h3 id="branch-people" className="font-display text-lg font-bold">
                  {t('settings.branch.people')}
                </h3>
                {people.length === 0 && <p className="text-sm text-muted">{t('settings.branch.nobody')}</p>}
                <ul className="flex flex-wrap gap-2">
                  {people.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3">
                      <Avatar id={s.id} name={s.name} size="sm" />
                      <span className="text-sm">{s.name}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted">{t('settings.branch.peopleNote')}</p>
              </section>
            </>
          )}
          <p className="text-sm text-muted">{t('settings.branches.note')}</p>
        </div>
      </div>
    </div>
  );
}

function BranchForm({ branch, onSaved }: { branch: Branch | null; onSaved(id: string): void }) {
  const { t } = useI18n();
  const saveBranch = useBranchSave();
  const [nameBn, setNameBn] = useState(branch?.name.bn ?? '');
  const [nameEn, setNameEn] = useState(branch?.name.en ?? '');
  const [kind, setKind] = useState<Branch['kind']>(branch?.kind ?? 'shop');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [error, setError] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function save() {
    if (working) return;
    setProblem(null);
    setWorking(true);
    const result = await saveBranch(branch, { nameBn, nameEn, kind, address });
    setWorking(false);
    setError(result.error);
    setProblem(result.problem ?? null);
    if (result.ok && result.id) onSaved(result.id);
  }

  return (
    <div className="flex flex-col gap-4">
      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <TextField label={t('settings.nameBn')} value={nameBn} onChange={(e) => setNameBn(e.target.value)} error={error} autoComplete="off" />
        <TextField label={t('settings.nameEn')} value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoComplete="off" />
      </div>
      <fieldset>
        <legend className="mb-2 font-medium">{t('settings.branch.kind')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['shop', 'workshop'] as const).map((k) => {
            const Icon = kindIcon(k);
            return (
              <label
                key={k}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                  kind === k ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line hover:bg-surface'
                }`}
              >
                <input type="radio" name="branch-kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                <Icon aria-hidden="true" size={20} />
                <span className="font-semibold">{t(`branchKind.${k}`)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <TextField label={t('settings.shop.address')} value={address} onChange={(e) => setAddress(e.target.value)} />
      <div>
        <Button onClick={() => void save()} disabled={working}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
