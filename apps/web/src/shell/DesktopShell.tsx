import { can, type Role } from '@darzikhata/domain';
import { Link, NavLink, Outlet } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { buttonClasses } from '../ui/Button';
import { visibleNav } from './nav';
import { ConnectionBadge, LanguageToggle, SwitchUserButton, useShopHeader } from './ShellParts';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
    isActive ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-surface'
  }`;

/** Sidebar and top bar for laptops and large screens. */
export function DesktopShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const { shopName, branchName } = useShopHeader();

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="text-lg font-semibold text-brand">{t('app.name')}</span>
          <span className="rounded bg-accent/15 px-1.5 text-xs font-semibold text-accent">{t('app.demo')}</span>
        </div>
        <nav aria-label={t('nav.main')} className="flex flex-1 flex-col gap-1 px-3 py-2">
          {visibleNav(role).map((item) => (
            <NavLink key={item.key} to={item.path} className={linkClass}>
              {t(item.label)}
            </NavLink>
          ))}
          <NavLink to="/app/more" className={linkClass}>
            {t('nav.more')}
          </NavLink>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-line bg-panel px-6">
          <div className="min-w-0">
            <p className="truncate font-semibold">{shopName}</p>
            {branchName && <p className="truncate text-xs text-muted">{branchName}</p>}
          </div>
          <div className="flex-1" />
          <ConnectionBadge />
          <LanguageToggle />
          {can(role, 'orders.create') && (
            <Link to="/app/orders/new" className={buttonClasses('primary')}>
              + {t('nav.newOrder')}
            </Link>
          )}
          <SwitchUserButton />
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
