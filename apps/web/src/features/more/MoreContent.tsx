import type { Language } from '@darzikhata/domain';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { BranchSwitcher, useBranchScope } from '../branches/BranchScopeProvider';
import { useCurrentStaff, useSnapshot, useStore } from '../../data/StoreContext';
import type { MessageKey } from '../../i18n/bn';
import { useI18n } from '../../i18n/I18nProvider';
import { usePresenterSetting } from '../presenter/PresenterSetting';
import { visibleNav } from '../../shell/nav';
import { useShell, type ShellPreference } from '../../shell/ShellPreference';
import { useTheme, type ThemePreference } from '../../shell/theme';
import { Button, buttonClasses } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { Dialog } from '../../ui/Dialog';

function Section({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-4">{children}</section>;
}

/** Language, theme, layout, sections not on the mobile tab bar, and demo controls. Shared by the More page and the account menu. */
export function MoreContent({ onNavigate }: { onNavigate?(): void }) {
  const { t, language, setLanguage } = useI18n();
  const { preference, setPreference, kind } = useShell();
  const { allowed } = useBranchScope();
  const { session } = useSnapshot();
  const current = useCurrentStaff();
  const store = useStore();
  const presenter = usePresenterSetting();
  const { theme, setTheme } = useTheme();
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
    <div className="flex flex-col gap-4">
      {extraSections.length > 0 && (
        <Section>
          <ul className="flex flex-col gap-2">
            {extraSections.map((item) => (
              <li key={item.key}>
                <Link to={item.path} onClick={onNavigate} data-tour={`nav-${item.key}`} className={`${buttonClasses('secondary', 'lg')} w-full justify-start`}>
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {kind === 'mobile' && allowed.length > 1 && (
        <Section>
          <BranchSwitcher />
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
        <ChoiceGroup<ThemePreference>
          legend={t('more.theme')}
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'auto', label: t('more.theme.auto') },
            { value: 'light', label: t('more.theme.light') },
            { value: 'dark', label: t('more.theme.dark') },
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
        <div className="flex flex-col gap-1">
          <Checkbox label={t('presenter.toggle')} checked={presenter.enabled} onChange={presenter.setEnabled} />
          <p className="text-sm text-muted">{t('presenter.toggleHint')}</p>
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
