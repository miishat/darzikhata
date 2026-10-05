import { useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';

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
