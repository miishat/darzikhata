import type { Branch } from '@darzikhata/domain';
import { Building2, MonitorSmartphone, Pencil, Plus, Store } from 'lucide-react';
import { useState } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { TextField } from '../../ui/TextField';
import { Shell } from '../orders/itemDialogs';
import { DesktopBranches } from './DesktopBranches';
import { SECTION_BODY, SectionHeader, SettingCard } from './SettingsCards';
import { useBranchSave, useMoveDevice } from './useBranchSave';
import { Select } from '../../ui/Select';

/**
 * Branches (never deleted), each with the devices that belong to it. A device moves with its own select.
 * On a desktop the branches are a list beside the chosen branch's editor.
 */
export function BranchSettings() {
  const { kind } = useShell();
  return kind === 'desktop' ? <DesktopBranches /> : <BranchCards />;
}

function BranchCards() {
  const { t, language, number } = useI18n();
  const move = useMoveDevice();
  const { config } = useSnapshot();
  const [editing, setEditing] = useState<{ branch: Branch | null } | null>(null);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  if (!config) return null;

  async function moveDevice(deviceId: string, branchId: string) {
    setSaved(false);
    setProblem(null);
    const failed = await move(deviceId, branchId);
    if (failed) setProblem(failed);
    else setSaved(true);
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
                        <Select
                          label={t('settings.device.branch', { name: device.name })}
                          value={device.branchId}
                          options={config.branches.map((b) => ({ value: b.id, label: b.name[language] }))}
                          onChange={(branchId) => void moveDevice(device.id, branchId)}
                        />
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
    if (result.ok) onSaved();
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
