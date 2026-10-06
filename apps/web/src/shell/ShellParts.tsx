import { Monitor, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, type ThemePreference } from './theme';

/** `onDark` is for navy backgrounds, where the light hover wash would sit under white text. */
export function LanguageToggle({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  const { t, language, setLanguage } = useI18n();
  const next = language === 'bn' ? 'en' : 'bn';
  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      lang={next}
      aria-label={compact ? t(next === 'en' ? 'more.language.english' : 'more.language.bangla') : undefined}
      className={`min-h-10 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-focus ${
        onDark ? 'border-white/30 hover:bg-white/15' : 'border-line hover:bg-surface'
      }`}
    >
      {compact ? (next === 'en' ? 'EN' : 'বাংলা') : next === 'en' ? 'English' : 'বাংলা'}
    </button>
  );
}

/** The desktop top bar's language control: both languages side by side, the current one raised. It keeps to the right even when there is no search. */
export function LanguageSwitch() {
  const { t, language, setLanguage } = useI18n();
  const half = (on: boolean) =>
    `min-h-8 rounded-md px-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-focus ${
      on ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink'
    }`;
  return (
    <div role="group" aria-label={t('more.language')} className="ms-auto flex shrink-0 items-center gap-0.5 rounded-lg bg-surface p-1 ring-1 ring-inset ring-line">
      <button type="button" lang="bn" aria-pressed={language === 'bn'} onClick={() => setLanguage('bn')} className={half(language === 'bn')}>
        {t('more.language.bangla')}
      </button>
      <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} className={half(language === 'en')}>
        {t('more.language.english')}
      </button>
    </div>
  );
}

const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'auto'];
const THEME_ICON = { auto: Monitor, light: Sun, dark: Moon };

/** One button that steps the colour theme through light, dark and match device; its icon shows the current one. */
export function ThemeButton() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const Icon = THEME_ICON[theme];
  const label = `${t('more.theme')}: ${t(`more.theme.${theme}`)}`;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]!)}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Icon aria-hidden="true" size={18} />
    </button>
  );
}

export function useShopHeader() {
  const { config, deviceId } = useSnapshot();
  const { label } = useI18n();
  const branch = config?.branches.find((b) => b.id === config.devices.find((d) => d.id === deviceId)?.branchId);
  return { shopName: config ? label(config.profile.name) : '', branchName: branch ? label(branch.name) : '' };
}

export function SwitchUserButton({ compact = false }: { compact?: boolean }) {
  const { t, label } = useI18n();
  const current = useCurrentStaff();
  const navigate = useNavigate();
  if (!current) return null;
  const who = t('shell.signedInAs', { name: current.staff.name, role: label(current.role.name) });
  return (
    <button
      type="button"
      data-tour="switch-user"
      title={who}
      onClick={() => navigate('/sign-in')}
      className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
    >
      <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong">
        {current.staff.name.slice(0, 1)}
      </span>
      {compact ? <span className="sr-only">{t('shell.switchUser')}</span> : <span>{who} · {t('shell.switchUser')}</span>}
    </button>
  );
}
