import { NavLink, Outlet } from 'react-router';
import { RequireCapability } from '../../app/guards';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { useCan } from '../common/hooks';
import { useSectionSummary } from './SettingsCards';
import { SETTINGS_SECTIONS } from './sections';

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';

/**
 * The settings frame: the sections this role may use, then the chosen section in one card.
 * On a desktop the sections are tiles above a full-height card that scrolls inside.
 */
export function SettingsPage() {
  const { t } = useI18n();
  const can = useCan();
  const summary = useSectionSummary();
  const { kind } = useShell();
  const sections = SETTINGS_SECTIONS.filter((s) => s.requires.some(can));

  if (kind === 'mobile')
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
          <section className={CARD}>
            <Outlet />
          </section>
        </div>
      </RequireCapability>
    );

  return (
    <RequireCapability anyOf={['settings.edit', 'staff.manage']}>
      {/* The window less the shell header (3.5rem) and the page padding (2 × 1.5rem). */}
      <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-4">
        <h1 className="sr-only">{t('nav.settings')}</h1>
        <nav aria-label={t('settings.sections')}>
          <ul className="grid grid-cols-4 gap-3">
            {sections.map((s) => (
              <li key={s.path}>
                <NavLink
                  to={s.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                      isActive ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line bg-panel hover:bg-surface'
                    }`
                  }
                >
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface text-muted group-aria-[current=page]:bg-brand group-aria-[current=page]:text-on-brand"
                  >
                    <s.icon size={20} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{t(s.label)}</span>
                    <span className="truncate text-xs text-muted">{summary(s.path)}</span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <section className={`${CARD} flex-1`}>
          <Outlet />
        </section>
      </div>
    </RequireCapability>
  );
}
