import { toBanglaDigits, toEnglishDigits } from '@darzikhata/domain';
import { useState, type FormEvent } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { TextField } from '../../ui/TextField';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { configProblemText } from './configProblems';

interface ShopInput {
  nameBn: string;
  nameEn: string;
  phone: string;
  address: string;
  days: string;
  restrict: boolean;
}

/** Whole days from 1 to 365, in either script; null when the text is anything else. */
function parseLinkDays(text: string): number | null {
  const ascii = toEnglishDigits(text.trim());
  if (!/^\d{1,4}$/.test(ascii)) return null;
  const days = Number(ascii);
  return days >= 1 && days <= 365 ? days : null;
}

/** The shop's name, contact details and two rules. Saved through store.updateConfig. */
export function ShopSettings() {
  const { t, language } = useI18n();
  const store = useStore();
  const { config } = useSnapshot();

  const [initial, setInitial] = useState<ShopInput>(() => ({
    nameBn: config?.profile.name.bn ?? '',
    nameEn: config?.profile.name.en ?? '',
    phone: config?.profile.phone ?? '',
    address: config?.profile.address ?? '',
    days: toBanglaDigits(String(config?.settings.linkExpiryDays ?? 30)),
    restrict: config?.settings.restrictFemaleMeasurements ?? false,
  }));
  const [input, setInput] = useState<ShopInput>(initial);
  const [nameMissing, setNameMissing] = useState(false);
  const [daysInvalid, setDaysInvalid] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(input) !== JSON.stringify(initial);
  const { dialog } = useUnsavedGuard(dirty);

  const set = <K extends keyof ShopInput>(key: K, value: ShopInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const days = parseLinkDays(input.days);
    const nameBn = input.nameBn.trim();
    const nameEn = input.nameEn.trim();
    const noName = !nameBn && !nameEn;
    setNameMissing(noName);
    setDaysInvalid(days === null);
    setProblem(null);
    setSaved(false);
    if (noName || days === null) return;

    setSaving(true);
    const outcome = await store.updateConfig((current) => ({
      ...current,
      profile: {
        name: { bn: nameBn || nameEn, en: nameEn || nameBn },
        phone: input.phone.trim(),
        address: input.address.trim(),
      },
      settings: { ...current.settings, linkExpiryDays: days, restrictFemaleMeasurements: input.restrict },
    }));
    setSaving(false);
    if (!outcome.ok) {
      setProblem(configProblemText(outcome.problems, language));
      return;
    }
    setInitial(input);
    setSaved(true);
  }

  return (
    <form onSubmit={save} noValidate className="flex max-w-xl flex-col gap-4">
      <h2 className="text-lg font-semibold">{t('settings.shop.title')}</h2>
      <TextField
        label={t('settings.shop.nameBn')}
        value={input.nameBn}
        onChange={(e) => set('nameBn', e.target.value)}
        error={nameMissing ? t('settings.shop.error.name') : undefined}
        autoComplete="off"
      />
      <TextField
        label={t('settings.shop.nameEn')}
        value={input.nameEn}
        onChange={(e) => set('nameEn', e.target.value)}
        autoComplete="off"
      />
      <TextField
        label={t('settings.shop.phone')}
        value={input.phone}
        onChange={(e) => set('phone', e.target.value)}
        type="tel"
        inputMode="tel"
        autoComplete="off"
      />
      <TextField
        label={t('settings.shop.address')}
        value={input.address}
        onChange={(e) => set('address', e.target.value)}
        autoComplete="off"
      />
      <TextField
        label={t('settings.shop.linkDays')}
        value={input.days}
        onChange={(e) => set('days', e.target.value)}
        error={daysInvalid ? t('settings.shop.error.days') : undefined}
        hint={t('settings.shop.linkDaysHint')}
        inputMode="numeric"
        autoComplete="off"
      />
      <Checkbox label={t('settings.shop.restrict')} checked={input.restrict} onChange={(v) => set('restrict', v)} />

      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      {saved && (
        <p role="status" className="text-brand-strong">
          {t('settings.saved')}
        </p>
      )}
      <div>
        <Button type="submit" size="lg" disabled={saving}>
          {t('common.save')}
        </Button>
      </div>
      {dialog}
    </form>
  );
}
