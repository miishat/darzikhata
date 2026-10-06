import type { Branch } from '@darzikhata/domain';
import { useState } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { Shell } from '../orders/itemDialogs';
import { configProblemText } from './configProblems';
import { slugKey } from './keys';

/** Branches (never deleted) and which branch each device belongs to. */
export function BranchSettings() {
  const { t, language } = useI18n();
  const store = useStore();
  const { config } = useSnapshot();
  const [editing, setEditing] = useState<{ branch: Branch | null } | null>(null);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  if (!config) return null;
  const head = 'whitespace-nowrap px-3 py-2 text-start text-sm font-semibold text-muted';

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

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('settings.branches.list')}</h2>
          <Button
            onClick={() => {
              setSaved(false);
              setEditing({ branch: null });
            }}
          >
            {t('settings.branches.new')}
          </Button>
        </div>
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
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table aria-label={t('settings.branches.list')} className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={head}>{t('settings.col.name')}</th>
                <th scope="col" className={head}>{t('settings.branch.kind')}</th>
                <th scope="col" className={head}>{t('settings.shop.address')}</th>
                <td className={head} />
              </tr>
            </thead>
            <tbody>
              {config.branches.map((branch) => (
                <tr key={branch.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2 font-semibold">{branch.name[language]}</td>
                  <td className="px-3 py-2">{t(`branchKind.${branch.kind}`)}</td>
                  <td className="px-3 py-2">{branch.address}</td>
                  <td className="px-3 py-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSaved(false);
                        setEditing({ branch });
                      }}
                    >
                      {t('settings.editItem', { name: branch.name[language] })}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">{t('settings.branches.note')}</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t('settings.devices.list')}</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table aria-label={t('settings.devices.list')} className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={head}>{t('settings.col.name')}</th>
                <th scope="col" className={head}>{t('settings.device.series')}</th>
                <th scope="col" className={head}>{t('branch.label')}</th>
              </tr>
            </thead>
            <tbody>
              {config.devices.map((device) => (
                <tr key={device.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2 font-semibold">{device.name}</td>
                  <td className="px-3 py-2">{device.series}</td>
                  <td className="px-3 py-2">
                    <SelectField
                      label={t('settings.device.branch', { name: device.name })}
                      value={device.branchId}
                      options={config.branches.map((b) => ({ value: b.id, label: b.name[language] }))}
                      onChange={(branchId) => void moveDevice(device.id, branchId)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">{t('settings.devices.note')}</p>
      </section>

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
    </div>
  );
}

export function BranchDialog({ branch, onClose, onSaved }: { branch: Branch | null; onClose(): void; onSaved(): void }) {
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
