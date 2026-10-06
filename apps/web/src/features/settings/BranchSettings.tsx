import type { Branch } from '@darzikhata/domain';
import { Building2, MonitorSmartphone, Pencil, Plus, Store } from 'lucide-react';
import { useState } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { TextField } from '../../ui/TextField';
import { Shell } from '../orders/itemDialogs';
import { configProblemText } from './configProblems';
import { SECTION_BODY, SectionHeader, SettingCard } from './SettingsCards';
import { slugKey } from './keys';

/** Branches (never deleted), each with the devices that belong to it. A device moves with its own select. */
export function BranchSettings() {
  const { t, language, number } = useI18n();
  const store = useStore();
  const { config } = useSnapshot();
  const [editing, setEditing] = useState<{ branch: Branch | null } | null>(null);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  if (!config) return null;

  async function moveDevice(deviceId: string, branchId: string) {
    setSaved(false);
    setProblem(null);
    const outcome = await store.updateConfig((current) => ({
      ...current,
      devices: current.devices.map((d) => (d.id === deviceId ? { ...d, branchId } : d)),
    }));
    if (!outcome.ok) {
      setProblem(configProblemText(outcome.problems, language));
      return;
    }
    setSaved(true);
  }
  const edit = (branch: Branch | null) => {
    setSaved(false);
    setEditing({ branch });
  };

  return (
    <>
      <SectionHeader
        path="branches"
        action={
          <Button onClick={() => edit(null)}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.branches.new')}
          </Button>
        }
      />
      <div className={`${SECTION_BODY} flex flex-col gap-3 p-4 sm:p-5`}>
        {saved && (
          <p role="status" className="text-brand-strong">
            {t('settings.saved')}
          </p>
        )}
        {problem && (
          <p role="alert" className="text-danger">
            {problem}
          </p>
        )}
        <ul aria-label={t('settings.branches.list')} className="grid gap-3 lg:grid-cols-2">
          {config.branches.map((branch) => {
            const devices = config.devices.filter((d) => d.branchId === branch.id);
            return (
              <li key={branch.id}>
                <SettingCard
                  icon={branch.kind === 'shop' ? Store : Building2}
                  className="h-full"
                  title={branch.name[language]}
                  sub={[t(`branchKind.${branch.kind}`), branch.address, t('settings.device.count', { n: number(devices.length) })].filter(Boolean).join(' · ')}
                  action={
                    <Button variant="secondary" aria-label={t('settings.editItem', { name: branch.name[language] })} onClick={() => edit(branch)}>
                      <Pencil aria-hidden="true" size={16} />
                    </Button>
                  }
                >
                  <ul aria-label={t('settings.devices.list')} className="flex flex-col gap-2">
                    {devices.length === 0 && <li className="text-sm text-muted">{t('settings.devices.none')}</li>}
                    {devices.map((device) => (
                      <li key={device.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface/60 px-3 py-2">
                        <MonitorSmartphone aria-hidden="true" size={18} className="text-muted" />
                        <span className="min-w-0 flex-1 font-semibold">{device.name}</span>
                        <span className="rounded-md bg-panel px-1.5 py-0.5 text-xs">
                          {t('settings.device.series')} {device.series}
                        </span>
                        <select
                          aria-label={t('settings.device.branch', { name: device.name })}
                          value={device.branchId}
                          onChange={(e) => void moveDevice(device.id, e.target.value)}
                          className="min-h-9 rounded-lg border border-line bg-panel px-2 text-sm focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          {config.branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name[language]}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </SettingCard>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">{t('settings.branches.note')}</p>
        <p className="text-sm text-muted">{t('settings.devices.note')}</p>
      </div>
      {editing && (
        <BranchDialog
          branch={editing.branch}
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

function BranchDialog({ branch, onClose, onSaved }: { branch: Branch | null; onClose(): void; onSaved(): void }) {
  const { t, language } = useI18n();
  const store = useStore();
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
    const bn = nameBn.trim();
    const en = nameEn.trim();
    if (!bn && !en) {
      setError(t('settings.branch.error.name'));
      return;
    }
    setError(undefined);
    const name = { bn: bn || en, en: en || bn };
    setWorking(true);
    const outcome = await store.updateConfig((current) => {
      const next: Branch = {
        id: branch?.id ?? slugKey(name.en, current.branches.map((b) => b.id), `branch-${current.branches.length + 1}`),
        name,
        kind,
        address: address.trim(),
      };
      return {
        ...current,
        branches: current.branches.some((b) => b.id === next.id)
          ? current.branches.map((b) => (b.id === next.id ? next : b))
          : [...current.branches, next],
      };
    });
    setWorking(false);
    if (!outcome.ok) {
      setProblem(configProblemText(outcome.problems, language));
      return;
    }
    onSaved();
  }

  return (
    <Shell
      title={branch ? branch.name[language] : t('settings.branches.new')}
      onClose={onClose}
      onSave={() => void save()}
      working={working}
      problem={problem}
    >
      <TextField
        label={t('settings.nameBn')}
        value={nameBn}
        onChange={(e) => setNameBn(e.target.value)}
        error={error}
        autoComplete="off"
      />
      <TextField
        label={t('settings.nameEn')}
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        autoComplete="off"
      />
      <ChoiceGroup
        legend={t('settings.branch.kind')}
        value={kind}
        options={[
          { value: 'shop', label: t('branchKind.shop') },
          { value: 'workshop', label: t('branchKind.workshop') },
        ]}
        onChange={setKind}
      />
      <TextField label={t('settings.shop.address')} value={address} onChange={(e) => setAddress(e.target.value)} />
    </Shell>
  );
}
