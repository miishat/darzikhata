import { NavLink, Outlet } from 'react-router';
import { RequireCapability } from '../../app/guards';
import { useI18n } from '../../i18n/I18nProvider';
import { useCan } from '../common/hooks';
import { SETTINGS_SECTIONS } from './sections';

/** The settings frame: a menu of the sections this role may use, then the chosen section. */
export function SettingsPage() {
  const { t } = useI18n();
  const can = useCan();
  const sections = SETTINGS_SECTIONS.filter((s) => s.requires.some(can));
  return (
    <RequireCapability anyOf={['settings.edit', 'staff.manage']}>
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">{t('nav.settings')}</h1>
        <nav aria-label={t('settings.sections')} className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <NavLink
              key={s.path}
              to={s.path}
              className={({ isActive }) =>
                `flex min-h-10 items-center rounded-lg border px-4 text-base ${isActive ? 'border-brand bg-brand text-white' : 'border-line bg-panel'}`
              }
            >
              {t(s.label)}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </RequireCapability>
  );
}
