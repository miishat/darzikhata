import type { Language } from '@darzikhata/domain';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot, useStore } from '../../data/StoreContext';
import type { MessageKey } from '../../i18n/bn';
import { useI18n } from '../../i18n/I18nProvider';
import { visibleNav } from '../../shell/nav';
import { useShell, type ShellPreference } from '../../shell/ShellPreference';
import { Button, buttonClasses } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { Dialog } from '../../ui/Dialog';

function Choice<T extends string>({ legend, value, options, onChange }: {
  legend: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange(value: T): void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
              value === option.value ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel'
            }`}
          >
            <input type="radio" className="sr-only" checked={value === option.value} onChange={() => onChange(option.value)} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-4">{children}</section>;
}

/** Language, layout, sections not on the mobile tab bar, and demo controls. */
export function MorePage() {
  const { t, language, setLanguage } = useI18n();
  const { preference, setPreference } = useShell();
  const { session } = useSnapshot();
  const current = useCurrentStaff();
  const store = useStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<'reset' | 'change' | null>(null);

  const extraSections = current ? visibleNav(current.role).filter((item) => !item.mobileTab) : [];
  const layouts: Array<{ value: ShellPreference; label: MessageKey }> = [
    { value: 'auto', label: 'more.layout.auto' },
    { value: 'mobile', label: 'more.layout.mobile' },
    { value: 'desktop', label: 'more.layout.desktop' },
  ];

  const confirm = async () => {
    if (confirming === 'reset' && session) {
      await store.startDemo(session.shopKey);
      navigate('/app');
    } else {
      await store.clear();
      navigate('/welcome');
    }
    setConfirming(null);
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.more')}</h1>
      {extraSections.length > 0 && (
        <Section>
          <ul className="flex flex-col gap-2">
            {extraSections.map((item) => (
              <li key={item.key}>
                <Link to={item.path} className={`${buttonClasses('secondary', 'lg')} w-full justify-start`}>
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section>
        <ChoiceGroup<Language>
          legend={t('more.language')}
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'bn', label: 'বাংলা' },
            { value: 'en', label: 'English' },
          ]}
        />
        <ChoiceGroup<ShellPreference>
          legend={t('more.layout')}
          value={preference}
          onChange={setPreference}
          options={layouts.map((l) => ({ value: l.value, label: t(l.label) }))}
        />
      </Section>
      <Section>
        <h2 className="font-semibold">{t('more.demo')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setConfirming('reset')}>
            {t('more.reset')}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming('change')}>
            {t('more.changeShop')}
          </Button>
        </div>
      </Section>
      <Dialog
        open={confirming !== null}
        title={t(confirming === 'reset' ? 'more.reset' : 'more.changeShop')}
        onClose={() => setConfirming(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirm}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        {t(confirming === 'reset' ? 'more.resetConfirm' : 'more.changeShopConfirm')}
      </Dialog>
    </div>
  );
}
