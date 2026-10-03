import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot, useStore } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/** Shows whether the browser is online. Sync states are added with the sync work. */
export function ConnectionBadge() {
  const { t } = useI18n();
  const online = useOnline();
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${online ? 'bg-brand' : 'bg-accent'}`} />
      {t(online ? 'shell.online' : 'shell.offline')}
    </span>
  );
}

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  const next = language === 'bn' ? 'en' : 'bn';
  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      lang={next}
      className="min-h-10 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
    >
      {next === 'en' ? 'English' : 'বাংলা'}
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
  const store = useStore();
  const navigate = useNavigate();
  if (!current) return null;
  const who = t('shell.signedInAs', { name: current.staff.name, role: label(current.role.name) });
  return (
    <button
      type="button"
      title={who}
      onClick={async () => {
        await store.signOut();
        navigate('/sign-in');
      }}
      className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong">
        {current.staff.name.slice(0, 1)}
      </span>
      {compact ? <span className="sr-only">{t('shell.switchUser')}</span> : <span>{who} · {t('shell.switchUser')}</span>}
    </button>
  );
}
