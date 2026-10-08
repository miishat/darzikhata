import { toBanglaDigits, toEnglishDigits } from '@darzikhata/domain';
import { Link2, Phone, ReceiptText, ShieldCheck, Store } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { TextField } from '../../ui/TextField';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { configProblemText } from './configProblems';
import { SECTION_BODY, SectionHeader, SettingCard } from './SettingsCards';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { ShopPrototype } from './ShopPrototype';

const VARIANTS = { A: 'Current cards', B: 'Settings rows', C: 'Form + live receipt', D: 'Two cards, quick picks', E: 'Summary, change in place' };

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
  const variant = useVariant(Object.keys(VARIANTS));
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

  function discard() {
    setInput(initial);
    setNameMissing(false);
    setDaysInvalid(false);
    setProblem(null);
  }

  // The receipt preview shows the name in the screen's language, falling back to the other.
  const shownName = (language === 'bn' ? input.nameBn : input.nameEn).trim() || input.nameBn.trim() || input.nameEn.trim();

  return (
    <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
      <SectionHeader path="shop" />
      <div className={`${SECTION_BODY} p-4 sm:p-5`}>
        {variant !== 'A' ? (
          <ShopPrototype
            variant={variant}
            input={input}
            set={set}
            nameError={nameMissing ? t('settings.shop.error.name') : undefined}
            daysError={daysInvalid ? t('settings.shop.error.days') : undefined}
            shownName={shownName}
          />
        ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <SettingCard icon={Store} title={t('settings.shop.nameCard')} sub={t('settings.shop.nameCardHint')}>
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
          </SettingCard>
          <SettingCard icon={Phone} title={t('settings.shop.contact')} sub={t('settings.shop.contactHint')}>
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
          </SettingCard>
          <SettingCard icon={Link2} title={t('settings.shop.links')} sub={t('settings.shop.linkDaysHint')}>
            <TextField
              label={t('settings.shop.linkDays')}
              value={input.days}
              onChange={(e) => set('days', e.target.value)}
              error={daysInvalid ? t('settings.shop.error.days') : undefined}
              inputMode="numeric"
              autoComplete="off"
            />
          </SettingCard>
          <SettingCard icon={ShieldCheck} title={t('settings.shop.privacy')} sub={t('settings.shop.privacyHint')}>
            <div className="rounded-lg bg-surface/60 p-3">
              <Checkbox label={t('settings.shop.restrict')} checked={input.restrict} onChange={(v) => set('restrict', v)} />
            </div>
          </SettingCard>
          <SettingCard icon={ReceiptText} title={t('settings.shop.preview')} sub={t('settings.shop.previewHint')} className="lg:col-span-2">
            <div className="rounded-lg bg-surface/60 p-4 text-center">
              <p className="font-display text-xl font-bold">{shownName}</p>
              <p className="text-sm text-muted">{[input.address.trim(), input.phone.trim()].filter(Boolean).join(' · ')}</p>
            </div>
          </SettingCard>
        </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface/60 px-4 py-3 sm:px-5">
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
        {dirty && !problem && <p className="text-sm text-warn-ink">{t('settings.unsaved')}</p>}
        <div className="ms-auto flex gap-2">
          <Button variant="secondary" disabled={!dirty || saving} onClick={discard}>
            {t('settings.discard')}
          </Button>
          <Button type="submit" disabled={saving}>
            {t('common.save')}
          </Button>
        </div>
      </div>
      {dialog}
      <PrototypeSwitcher variants={VARIANTS} />
    </form>
  );
}
