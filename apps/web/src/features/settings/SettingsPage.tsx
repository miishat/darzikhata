import { NavLink, Outlet } from 'react-router';
import { RequireCapability } from '../../app/guards';
import { useI18n } from '../../i18n/I18nProvider';
import { useCan } from '../common/hooks';
import { SETTINGS_SECTIONS } from './sections';
import { useShell } from '../../shell/ShellPreference';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { SETTINGS_VARIANTS, VariantB, VariantC, VariantD, VariantE, VariantF } from './SettingsDesktopPrototype';

/** The settings frame: a menu of the sections this role may use, then the chosen section. */
export function SettingsPage() {
  const { t } = useI18n();
  const can = useCan();
  const sections = SETTINGS_SECTIONS.filter((s) => s.requires.some(can));
  const { kind } = useShell();
  const variant = useVariant(Object.keys(SETTINGS_VARIANTS));
  if (kind !== 'mobile' && variant !== 'A')
    return (
      <RequireCapability anyOf={['settings.edit', 'staff.manage']}>
        {variant === 'B' && <VariantB />}
        {variant === 'C' && <VariantC />}
        {variant === 'D' && <VariantD />}
        {variant === 'E' && <VariantE />}
        {variant === 'F' && <VariantF />}
        <PrototypeSwitcher variants={SETTINGS_VARIANTS} />
      </RequireCapability>
    );
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
                `flex min-h-10 items-center rounded-lg border px-4 text-base ${isActive ? 'border-brand bg-brand text-on-brand' : 'border-line bg-panel'}`
              }
            >
              {t(s.label)}
            </NavLink>
          ))}
        </nav>
        <Outlet />
        {kind !== 'mobile' && <PrototypeSwitcher variants={SETTINGS_VARIANTS} />}
      </div>
    </RequireCapability>
  );
}
